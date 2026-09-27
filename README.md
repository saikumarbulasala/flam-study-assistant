# Study Assistant

A small React app for the Flam frontend internship assignment. You paste notes
or name a topic; an LLM returns structured flashcard data (never raw chat
text); the app renders it as a flippable flashcard deck **and** a multiple-choice
quiz that lets you retest just the questions you got wrong.

Not a chatbot: the model returns one JSON object, which is validated and
rendered as real interactive components.

## Why flashcards + quiz from one call

Both project idea and prompt each expected one "shape" of data. This app asks
the model for cards that carry `question`, `answer`, and 4 `choices` — which is
enough to drive a flip-card deck **and** a graded multiple-choice quiz from a
single generation, without re-prompting.

## Data shape

```json
{
  "topic": "The Water Cycle",
  "cards": [
    {
      "question": "What is the process of water turning into vapor called?",
      "answer": "Evaporation",
      "choices": ["Evaporation", "Condensation", "Precipitation", "Collection"]
    }
  ]
}
```

`choices` must include `answer` verbatim, plus 3 plausible distractors. This
exact shape is enforced independently on the backend (`server/generate.js`)
and again on the frontend (`client/src/lib/validateResult.js`) before anything
is rendered — never trust either the model or the network in only one place.

## Architecture

```
flam-study-assistant/
├── client/                     # Vite + React (hooks, no TypeScript)
│   └── src/
│       ├── App.jsx             # state machine: idle → loading → success|error
│       ├── components/
│       │   ├── PromptInput.jsx     # free-form text input + example chips
│       │   ├── ResultView.jsx      # routes validated data to Flashcards/Quiz tabs
│       │   ├── FlashcardDeck.jsx   # flip-through card view
│       │   ├── QuizView.jsx        # graded multiple-choice, retest-wrong flow
│       │   ├── LoadingState.jsx
│       │   ├── ErrorState.jsx      # shown for every failure mode, with Retry
│       │   └── EmptyState.jsx
│       └── lib/
│           ├── api.js              # the ONLY place the frontend calls the backend
│           └── validateResult.js   # shape validation gate before rendering
└── server/
    └── generate.js              # holds the API key; calls the LLM; validates
                                  # + normalizes its output before responding
```

The frontend never calls an LLM provider directly and never sees an API key —
`client/src/lib/api.js` only ever talks to `server/generate.js`, which holds
the real credentials.

## Failure handling

| Failure mode | Where it's caught | What the user sees |
|---|---|---|
| Malformed JSON from the model | Backend, `JSON.parse` in a try/catch | Error card, "wasn't valid JSON", Retry |
| Valid JSON, wrong shape | Backend **and** frontend validators | Error card, "not in the shape we expected", Retry |
| Empty response | Backend | Error card, "returned an empty response", Retry |
| Slow / hanging request | 25s backend timeout + 30s frontend `AbortController` timeout | Loading spinner, then a timeout error with Retry — never hangs forever |
| Upstream provider error (bad key, rate limit, etc.) | Backend forwards provider status as 502 | Error card with provider status |
| Network down / backend not running | Frontend `fetch` catch | "Could not reach the server" |
| Stale response overwriting a newer one | `requestId` ref guard in `App.jsx`, mirroring the pattern from the assignment doc | Silently ignored — the newer request always wins |

Every failure routes to the same `ErrorState` component with a **Retry**
button that re-sends the last input — no dead ends, no blank screens.

## Setup

Requires Node 18+.

### 1. Backend

```bash
cd server
npm install
cp .env.example .env
# edit .env: set LLM_API_URL / LLM_API_KEY / LLM_MODEL for your provider
npm start
```

`server/.env.example` documents OpenAI-compatible endpoints for OpenRouter,
Groq, OpenAI, and local Ollama (all just need `LLM_API_URL` / `LLM_MODEL`
swapped). Gemini uses a different request shape, so it's handled as a
separate code path — set `LLM_PROVIDER=gemini` plus `GEMINI_API_KEY` to use it.

### 2. Frontend

```bash
cd client
npm install
cp .env.example .env   # points at http://localhost:8787 by default
npm run dev
```

Open the printed local URL (usually `http://localhost:5173`).

### 3. Try it

Type a topic (e.g. "the water cycle") or paste notes, hit **Generate study
set**, then switch between the **Flashcards** and **Quiz** tabs. In the quiz,
answer everything and you'll be offered a **Retest the N you missed** option
that only re-asks the wrong ones.

## AI-usage note

I used Claude to help scaffold this project: generating the initial file
structure, the Express proxy with the strict JSON prompt and shape validator,
the React components (flashcard flip animation, quiz + retest-wrong flow), and
this README. I reviewed and adjusted the validation logic, the stale-response
guard, and the failure-mode handling myself, and verified the backend against
a local mock LLM endpoint covering the valid / malformed-JSON / wrong-shape /
empty-response cases before treating it as done.

## Known limitations

- No streaming — the full response is awaited before rendering (listed as a
  stretch goal; not implemented here to keep the core solid).
- No session persistence — refreshing the page loses the current study set.
- Quiz choice shuffling uses a small deterministic PRNG rather than a crypto
  RNG — fine for this use case, not meant to be unpredictable.
- Not deployed by default — see below if you want a live URL.

## Deploying (optional)

- **Backend**: any Node host (Render, Railway, Fly.io, a VPS). Set the same
  env vars as `.env`.
- **Frontend**: any static host (Vercel, Netlify, GitHub Pages). Set
  `VITE_API_BASE_URL` to your deployed backend's URL at build time.

## Time spent

~8 hours: data-shape design and prompt (1h), backend proxy + validation +
failure modes (2.5h), React app + flashcard/quiz UI + mobile styling (3h),
end-to-end testing against a mock LLM endpoint + README (1.5h).
