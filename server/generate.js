import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 8787;
const PROVIDER = process.env.LLM_PROVIDER?.trim().toLowerCase() === 'gemini' ? 'gemini' : 'openai';

// ---- Prompt -----------------------------------------------------------
// The exact shape we want back. Kept in one place so the prompt and the
// validator can never quietly drift apart.
const SYSTEM_PROMPT = `You are a study-material generator. Given a topic or a
block of notes, return ONLY valid JSON (no prose, no markdown fences) matching
exactly this shape:

{
  "topic": string,          // short title for the material
  "cards": [
    {
      "question": string,
      "answer": string,       // the correct answer, verbatim
      "choices": string[]      // 4 short options, in any order, one of which
                                // is EXACTLY equal to "answer"
    }
  ]
}

Rules:
- Return between 5 and 10 cards.
- "choices" must contain "answer" plus 3 plausible wrong options.
- Every string must be plain text, no markdown.
- Output nothing but the JSON object. No commentary, no code fences.`;

// ---- Helpers ------------------------------------------------------------

function stripCodeFences(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

function extractModelText(providerJson) {
  if (PROVIDER === 'gemini') {
    return providerJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  }
  return providerJson?.choices?.[0]?.message?.content ?? '';
}

async function callOpenAiCompatible(userInput, signal) {
  const res = await fetch(process.env.LLM_API_URL, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL,
      temperature: 0.7,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Topic / notes:\n${userInput}` },
      ],
    }),
  });
  return res;
}

async function callGemini(userInput, signal) {
  const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [
        { role: 'user', parts: [{ text: `Topic / notes:\n${userInput}` }] },
      ],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    }),
  });
  return res;
}

async function getUpstreamErrorMessage(response) {
  const detail = await response.text().catch(() => '');
  if (!detail) return '';

  try {
    const payload = JSON.parse(detail);
    return payload?.error?.message || payload?.message || '';
  } catch {
    return detail.trim().slice(0, 300);
  }
}

// Same shape check the client re-applies before ever rendering. Duplicated
// deliberately: a backend should never trust an upstream API's output either.
function isValidShape(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.cards)) return false;
  if (data.cards.length === 0) return false;
  return data.cards.every(
    (c) =>
      c &&
      typeof c.question === 'string' &&
      c.question.trim().length > 0 &&
      typeof c.answer === 'string' &&
      c.answer.trim().length > 0 &&
      Array.isArray(c.choices) &&
      c.choices.length >= 2 &&
      c.choices.every((ch) => typeof ch === 'string') &&
      c.choices.includes(c.answer)
  );
}

// ---- Route --------------------------------------------------------------

app.post('/api/generate', async (req, res) => {
  const userInput = (req.body?.input || '').toString().trim();
  if (!userInput) {
    return res.status(400).json({ error: 'empty_input', message: 'Please provide a topic or some notes.' });
  }
  if (PROVIDER === 'gemini' && !process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      error: 'provider_not_configured',
      message: 'Gemini is selected, but GEMINI_API_KEY is not set in server/.env.',
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);

  try {
    const upstream = PROVIDER === 'gemini'
      ? await callGemini(userInput, controller.signal)
      : await callOpenAiCompatible(userInput, controller.signal);
    clearTimeout(timeout);

    if (!upstream.ok) {
      const detail = await getUpstreamErrorMessage(upstream);
      const providerName = PROVIDER === 'gemini' ? 'Gemini' : 'AI provider';
      return res.status(502).json({
        error: 'upstream_failed',
        message: `${providerName} API error (${upstream.status})${detail ? `: ${detail}` : '.'}`,
      });
    }

    const providerJson = await upstream.json();
    const rawText = extractModelText(providerJson);

    if (!rawText || !rawText.trim()) {
      return res.status(422).json({ error: 'empty_response', message: 'The model returned an empty response.' });
    }

    let parsed;
    try {
      parsed = JSON.parse(stripCodeFences(rawText));
    } catch {
      return res.status(422).json({
        error: 'malformed_json',
        message: 'The model did not return valid JSON.',
        raw: rawText.slice(0, 500),
      });
    }

    if (!isValidShape(parsed)) {
      return res.status(422).json({
        error: 'invalid_shape',
        message: 'The model returned JSON, but not in the expected shape.',
        raw: JSON.stringify(parsed).slice(0, 500),
      });
    }

    return res.json(parsed);
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'timeout', message: 'The AI provider took too long to respond.' });
    }
    return res.status(500).json({ error: 'server_error', message: 'Unexpected server error.' });
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true, provider: PROVIDER }));

app.listen(PORT, () => {
  console.log(`Study Assistant backend listening on http://localhost:${PORT} (provider: ${PROVIDER})`);
});
