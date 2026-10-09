export default function ErrorState({ message, onRetry, compact = false }) {
  return (
    <div className={"error-state" + (compact ? " compact" : "")} role="alert">
      <div className="error-title">Couldn't load this</div>
      <div className="error-text">{message || "Something went wrong."}</div>
      {onRetry && (
        <button className="btn btn-sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
