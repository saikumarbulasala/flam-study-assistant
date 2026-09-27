const FRIENDLY_MESSAGES = {
  malformed_json: "The AI's response wasn't valid JSON.",
  invalid_shape: 'The AI response was valid JSON, but not in the shape we expected.',
  empty_response: 'The AI returned an empty response.',
  timeout: 'The request took too long and was cancelled.',
  upstream_failed: 'The AI provider returned an error.',
  network_error: 'Could not reach the backend server.',
  request_failed: 'The request failed.',
  server_error: 'Something went wrong on the server.',
};

export default function ErrorState({ error, message, onRetry }) {
  const friendly = FRIENDLY_MESSAGES[error] || message || 'Something went wrong.';

  return (
    <div className="state-card state-card-error" role="alert">
      <p className="state-title">⚠️ Couldn't generate a study set</p>
      <p className="state-subtext">{friendly}</p>
      {message && message !== friendly && <p className="state-detail">{message}</p>}
      <button type="button" className="btn btn-primary" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
