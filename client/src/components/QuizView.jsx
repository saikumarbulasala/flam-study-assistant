import { useMemo, useState } from 'react';

// Deterministic shuffle keyed by card id, so re-renders don't reshuffle choices
// under the user while they're mid-question.
function shuffledChoices(card) {
  const arr = [...card.choices];
  let seed = [...card.id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  for (let i = arr.length - 1; i > 0; i--) {
    seed = (seed * 9301 + 49297) % 233280;
    const j = Math.floor((seed / 233280) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function QuizView({ cards }) {
  const [pool, setPool] = useState(cards); // cards currently being asked
  const [round, setRound] = useState(0); // increments to force a fresh pass
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [wrong, setWrong] = useState([]); // cards answered incorrectly this pass
  const [finished, setFinished] = useState(false);

  const current = pool[qIndex];
  const choices = useMemo(() => (current ? shuffledChoices(current) : []), [current]);

  function selectChoice(choice) {
    if (submitted) return;
    setSelected(choice);
  }

  function submitAnswer() {
    if (!selected) return;
    setSubmitted(true);
    if (selected !== current.answer) {
      setWrong((w) => [...w, current]);
    }
  }

  function next() {
    setSelected(null);
    setSubmitted(false);
    if (qIndex + 1 < pool.length) {
      setQIndex((i) => i + 1);
    } else {
      setFinished(true);
    }
  }

  function retestWrong() {
    setPool(wrong);
    setWrong([]);
    setQIndex(0);
    setSelected(null);
    setSubmitted(false);
    setFinished(false);
    setRound((r) => r + 1);
  }

  function restartAll() {
    setPool(cards);
    setWrong([]);
    setQIndex(0);
    setSelected(null);
    setSubmitted(false);
    setFinished(false);
    setRound((r) => r + 1);
  }

  if (finished) {
    const correctCount = pool.length - wrong.length;
    return (
      <div className="quiz-summary">
        <p className="state-title">
          {wrong.length === 0 ? '🎉 All correct!' : `You got ${correctCount} / ${pool.length} right`}
        </p>
        <div className="deck-controls">
          {wrong.length > 0 && (
            <button type="button" className="btn btn-primary" onClick={retestWrong}>
              Retest the {wrong.length} you missed
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={restartAll}>
            Restart full quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz" key={round}>
      <p className="deck-counter">
        Question {qIndex + 1} / {pool.length}
      </p>
      <p className="quiz-question">{current.question}</p>

      <div className="quiz-choices">
        {choices.map((choice) => {
          const isSelected = selected === choice;
          const isCorrect = choice === current.answer;
          let cls = 'quiz-choice';
          if (isSelected) cls += ' is-selected';
          if (submitted && isCorrect) cls += ' is-correct';
          if (submitted && isSelected && !isCorrect) cls += ' is-incorrect';

          return (
            <button
              type="button"
              key={choice}
              className={cls}
              onClick={() => selectChoice(choice)}
              disabled={submitted}
            >
              {choice}
            </button>
          );
        })}
      </div>

      <div className="deck-controls">
        {!submitted ? (
          <button type="button" className="btn btn-primary" onClick={submitAnswer} disabled={!selected}>
            Submit answer
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={next}>
            {qIndex + 1 < pool.length ? 'Next question →' : 'See results'}
          </button>
        )}
      </div>
    </div>
  );
}
