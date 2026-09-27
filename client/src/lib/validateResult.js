// The one place that decides whether a parsed AI response is safe to render.
// Anything that fails this check must route to an error state — never a
// blank render, never a crash, never a best-effort guess.

/**
 * @typedef {{ question: string, answer: string, choices: string[] }} Card
 * @typedef {{ topic?: string, cards: Card[] }} StudySet
 */

/**
 * @param {unknown} data
 * @returns {{ ok: true, value: StudySet } | { ok: false, reason: string }}
 */
export function validateResult(data) {
  if (data === null || data === undefined) {
    return { ok: false, reason: 'empty_response' };
  }
  if (typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, reason: 'invalid_shape' };
  }
  if (!Array.isArray(data.cards) || data.cards.length === 0) {
    return { ok: false, reason: 'invalid_shape' };
  }

  for (const card of data.cards) {
    if (!card || typeof card !== 'object') return { ok: false, reason: 'invalid_shape' };
    if (typeof card.question !== 'string' || !card.question.trim()) {
      return { ok: false, reason: 'invalid_shape' };
    }
    if (typeof card.answer !== 'string' || !card.answer.trim()) {
      return { ok: false, reason: 'invalid_shape' };
    }
    if (!Array.isArray(card.choices) || card.choices.length < 2) {
      return { ok: false, reason: 'invalid_shape' };
    }
    if (!card.choices.every((c) => typeof c === 'string' && c.trim())) {
      return { ok: false, reason: 'invalid_shape' };
    }
    if (!card.choices.includes(card.answer)) {
      return { ok: false, reason: 'invalid_shape' };
    }
  }

  return {
    ok: true,
    value: {
      topic: typeof data.topic === 'string' ? data.topic : undefined,
      cards: data.cards.map((c, i) => ({
        id: `card-${i}`,
        question: c.question.trim(),
        answer: c.answer.trim(),
        choices: c.choices.map((c2) => c2.trim()),
      })),
    },
  };
}
