import { useState } from 'react';

const EXAMPLES = [
  'The water cycle: evaporation, condensation, precipitation, collection',
  'JavaScript closures and the module pattern',
  'World War I: causes, major battles, and outcomes',
];

export default function PromptInput({ onSubmit, disabled }) {
  const [value, setValue] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
  }

  return (
    <form className="prompt-form" onSubmit={handleSubmit}>
      <label htmlFor="prompt-input" className="prompt-label">
        Paste your notes, or just name a topic
      </label>
      <textarea
        id="prompt-input"
        className="prompt-textarea"
        placeholder={`e.g. "${EXAMPLES[0]}"`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={5}
        disabled={disabled}
      />
      <div className="prompt-row">
        <div className="prompt-examples">
          {EXAMPLES.map((ex) => (
            <button
              type="button"
              key={ex}
              className="chip"
              disabled={disabled}
              onClick={() => setValue(ex)}
            >
              {ex.length > 28 ? ex.slice(0, 28) + '…' : ex}
            </button>
          ))}
        </div>
        <button type="submit" className="btn btn-primary" disabled={disabled || !value.trim()}>
          {disabled ? 'Generating…' : 'Generate study set'}
        </button>
      </div>
    </form>
  );
}
