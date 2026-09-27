import { useRef, useState } from 'react';
import PromptInput from './components/PromptInput.jsx';
import LoadingState from './components/LoadingState.jsx';
import ErrorState from './components/ErrorState.jsx';
import EmptyState from './components/EmptyState.jsx';
import ResultView from './components/ResultView.jsx';
import { generateStudySet } from './lib/api.js';
import { validateResult } from './lib/validateResult.js';

// idle -> loading -> success | error
export default function App() {
  const [status, setStatus] = useState('idle');
  const [studySet, setStudySet] = useState(null);
  const [errorInfo, setErrorInfo] = useState(null);
  const [lastInput, setLastInput] = useState('');

  // Guards against a slow earlier request resolving after a faster, more
  // recent one and silently overwriting the correct result.
  const requestId = useRef(0);

  async function handleGenerate(input) {
    const id = ++requestId.current;
    setLastInput(input);
    setStatus('loading');
    setErrorInfo(null);

    const result = await generateStudySet(input);
    if (id !== requestId.current) return; // a newer request has since started

    if (!result.ok) {
      setErrorInfo({ error: result.error, message: result.message });
      setStatus('error');
      return;
    }

    const validated = validateResult(result.data);
    if (!validated.ok) {
      setErrorInfo({
        error: validated.reason,
        message: 'The AI response did not match the shape this app expects.',
      });
      setStatus('error');
      return;
    }

    setStudySet(validated.value);
    setStatus('success');
  }

  function handleRetry() {
    if (lastInput) handleGenerate(lastInput);
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Study Assistant</h1>
        <p className="app-subtitle">Paste notes or name a topic — get flashcards and a quiz, not a chat window.</p>
      </header>

      <PromptInput onSubmit={handleGenerate} disabled={status === 'loading'} />

      <main className="app-main">
        {status === 'idle' && <EmptyState />}
        {status === 'loading' && <LoadingState />}
        {status === 'error' && (
          <ErrorState error={errorInfo?.error} message={errorInfo?.message} onRetry={handleRetry} />
        )}
        {status === 'success' && studySet && <ResultView studySet={studySet} />}
      </main>
    </div>
  );
}
