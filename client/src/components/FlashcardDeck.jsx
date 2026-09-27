import { useState } from 'react';

export default function FlashcardDeck({ cards }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = cards[index];

  function go(delta) {
    setFlipped(false);
    setIndex((i) => (i + delta + cards.length) % cards.length);
  }

  return (
    <div className="deck">
      <button
        type="button"
        className={`flashcard ${flipped ? 'is-flipped' : ''}`}
        onClick={() => setFlipped((f) => !f)}
        aria-label="Flip card"
      >
        <div className="flashcard-inner">
          <div className="flashcard-face flashcard-front">
            <span className="flashcard-kicker">Question</span>
            <p>{card.question}</p>
          </div>
          <div className="flashcard-face flashcard-back">
            <span className="flashcard-kicker">Answer</span>
            <p>{card.answer}</p>
          </div>
        </div>
      </button>

      <p className="deck-hint">Tap the card to flip it</p>

      <div className="deck-controls">
        <button type="button" className="btn btn-ghost" onClick={() => go(-1)} disabled={cards.length < 2}>
          ← Prev
        </button>
        <span className="deck-counter">
          {index + 1} / {cards.length}
        </span>
        <button type="button" className="btn btn-ghost" onClick={() => go(1)} disabled={cards.length < 2}>
          Next →
        </button>
      </div>
    </div>
  );
}
