export default function LoadingState() {
  return (
    <div className="state-card" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <p>Generating your study set…</p>
      <p className="state-subtext">This usually takes a few seconds.</p>
    </div>
  );
}
