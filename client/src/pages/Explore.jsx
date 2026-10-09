import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Avatar from "../components/Avatar";
import Icon from "../components/Icon";
import ThoughtFeed from "../components/ThoughtFeed";
import { useThoughts } from "../lib/useThoughts";

const TOPICS = ["Technology", "Life", "Music", "Ideas", "Learning", "Business", "Creativity", "Relationships"];
const TABS = [
  { key: "foryou", label: "For You", url: "/thoughts/following" },
  { key: "trending", label: "Trending", url: "/thoughts/trending" },
  { key: "latest", label: "Latest", url: "/thoughts" },
];

export default function Explore() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [tab, setTab] = useState("trending");
  const [topic, setTopic] = useState(null);

  // Debounce the search box (300ms)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);

  let url;
  let params;
  if (debounced) {
    url = "/search";
    params = { q: debounced };
  } else if (topic) {
    url = `/thoughts/topic/${topic.toLowerCase()}`;
  } else {
    url = TABS.find((t) => t.key === tab).url;
  }

  const feed = useThoughts(url, params);
  const searching = !!debounced;

  let title;
  if (searching) title = `Results for "${debounced}"`;
  else if (topic) title = `#${topic.toLowerCase()}`;
  else title = TABS.find((t) => t.key === tab).label;

  return (
    <div className="page">
      <div className="sticky-head">
        <div className="page-title">Explore</div>
        <div className="search-bar">
          <span className="search-icon">
            <Icon name="search" size={18} />
          </span>
          <input
            type="search"
            placeholder="Search thoughts and people"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={"tab" + (tab === t.key && !topic && !searching ? " active" : "")}
              onClick={() => {
                setTab(t.key);
                setTopic(null);
                setQuery("");
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="chips">
        {TOPICS.map((name) => (
          <button
            key={name}
            className={"chip" + (topic === name ? " active" : "")}
            onClick={() => {
              setTopic(topic === name ? null : name); // click again to deselect
              setQuery("");
            }}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="section-title">{title}</div>

      {searching && !feed.loading && feed.users.length > 0 && (
        <div className="people-block">
          {feed.users.map((u) => (
            <div className="user-row" key={u._id}>
              <Link to={`/profile/${u.username}`}>
                <Avatar user={u} size={42} />
              </Link>
              <div className="grow">
                <Link to={`/profile/${u.username}`} className="name">
                  {u.fullName}
                </Link>
                <div className="thought-meta">@{u.username}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ThoughtFeed
        feed={feed}
        emptyTitle={searching ? "Nothing found" : tab === "foryou" && !topic ? "Your For You feed is empty" : "No thoughts here yet"}
        emptyText={
          searching
            ? "Try a different word or name."
            : tab === "foryou" && !topic
            ? "Follow people to see their thoughts here."
            : ""
        }
      />
    </div>
  );
}
