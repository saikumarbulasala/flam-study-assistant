const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
const CLIENT_TIMEOUT_MS = 60_000;

/**
 * Calls our own backend proxy — never the LLM directly. The API key never
 * enters the browser.
 *
 * @param {string} input
 * @returns {Promise<{ ok: true, data: any } | { ok: false, error: string, message: string }>}
 */
export async function generateStudySet(input) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
      signal: controller.signal,
    });

    let body = null;
    try {
      body = await res.json();
    } catch {
      // Non-JSON body from the server itself (e.g. a proxy error page).
      body = null;
    }

    if (!res.ok) {
      return {
        ok: false,
        error: body?.error || 'request_failed',
        message: body?.message || `Request failed (${res.status}).`,
      };
    }

    if (!body) {
      return { ok: false, error: 'empty_response', message: 'The server returned an empty response.' };
    }

    return { ok: true, data: body };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { ok: false, error: 'timeout', message: 'The request took too long and was cancelled.' };
    }
    return { ok: false, error: 'network_error', message: 'Could not reach the server. Is it running?' };
  } finally {
    clearTimeout(timeoutId);
  }
}
