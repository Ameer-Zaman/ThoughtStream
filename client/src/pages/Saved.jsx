import { useThoughts } from "../lib/useThoughts";
import ThoughtFeed from "../components/ThoughtFeed";

export default function Saved() {
  const feed = useThoughts("/bookmarks");

  return (
    <div className="page">
      <div className="page-header">
        <h1>Saved</h1>
        <p>Thoughts you've bookmarked. Only you can see this page.</p>
      </div>

      <ThoughtFeed
        feed={feed}
        emptyTitle="No saved thoughts yet"
        emptyText="Tap the bookmark icon on any thought to save it here."
      />
    </div>
  );
}