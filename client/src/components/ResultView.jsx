import { useState } from 'react';
import FlashcardDeck from './FlashcardDeck.jsx';
import QuizView from './QuizView.jsx';

export default function ResultView({ studySet }) {
  const [mode, setMode] = useState('flashcards');

  return (
    <div className="result">
      {studySet.topic && <h2 className="result-topic">{studySet.topic}</h2>}

      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'flashcards'}
          className={`tab ${mode === 'flashcards' ? 'is-active' : ''}`}
          onClick={() => setMode('flashcards')}
        >
          Flashcards
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'quiz'}
          className={`tab ${mode === 'quiz' ? 'is-active' : ''}`}
          onClick={() => setMode('quiz')}
        >
          Quiz
        </button>
      </div>

      {/* key forces a clean remount (fresh internal state) when switching modes or getting a new set */}
      {mode === 'flashcards' ? (
        <FlashcardDeck key={`cards-${studySet.cards.length}`} cards={studySet.cards} />
      ) : (
        <QuizView key={`quiz-${studySet.cards.length}`} cards={studySet.cards} />
      )}
    </div>
  );
}
