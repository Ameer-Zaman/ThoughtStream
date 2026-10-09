import ThoughtCard from "./ThoughtCard";
import { ThoughtSkeletons } from "./Skeleton";
import ErrorState from "./ErrorState";

// Renders a list from useThoughts(): skeleton while loading, retry on error, empty text, then the cards.
export default function ThoughtFeed({ feed, emptyTitle = "Nothing here yet", emptyText = "", onRemoved }) {
  const { thoughts, loading, error, reload, patch, remove, setFollow } = feed;

  if (loading) return <ThoughtSkeletons count={4} />;
  if (error && thoughts.length === 0) return <ErrorState message={error} onRetry={reload} />;
  if (thoughts.length === 0) {
    return (
      <div className="empty">
        <div className="empty-title">{emptyTitle}</div>
        {emptyText && <div>{emptyText}</div>}
      </div>
    );
  }

  return thoughts.map((t) => (
    <ThoughtCard
      key={t._id}
      thought={t}
      onChange={patch}
      onFollowChange={setFollow}
      onRemove={(id) => {
        remove(id);
        onRemoved?.(id);
      }}
    />
  ));
}
