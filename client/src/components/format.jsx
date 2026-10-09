// Turns "hello #world" into text with the hashtag wrapped in a blue span
export function renderContent(text) {
  return text.split(/(#\w+)/g).map((part, i) =>
    /^#\w+$/.test(part) ? (
      <span key={i} className="hashtag">
        {part}
      </span>
    ) : (
      part
    )
  );
}

export function formatDate(value) {
  const d = new Date(value);
  const now = new Date();
  const opts = { month: "short", day: "numeric" };
  if (d.getFullYear() !== now.getFullYear()) opts.year = "numeric";
  return d.toLocaleDateString(undefined, opts);
}

export function formatTime(value) {
  return new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
