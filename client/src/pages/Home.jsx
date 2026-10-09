import { useState } from "react";
import api from "../api";
import Composer from "../components/Composer";
import ThoughtFeed from "../components/ThoughtFeed";
import { useThoughts } from "../lib/useThoughts";

export default function Home() {
  const [tab, setTab] = useState("foryou");
  const feed = useThoughts(tab === "following" ? "/thoughts/following" : "/thoughts");

  // A new thought belongs in "For You" (everyone's thoughts). In "Following" you don't follow yourself.
  const handlePosted = (thought) => {
    if (tab === "foryou") feed.add(thought);
  };

  return (
    <div className="page">
      <div className="sticky-head">
        <div className="page-title">Home</div>
        <div className="tabs">
          <button className={"tab" + (tab === "foryou" ? " active" : "")} onClick={() => setTab("foryou")}>
            For You
          </button>
          <button className={"tab" + (tab === "following" ? " active" : "")} onClick={() => setTab("following")}>
            Following
          </button>
        </div>
      </div>

      <Composer onPosted={handlePosted} />

      <ThoughtFeed
        feed={feed}
        emptyTitle={tab === "following" ? "Your following feed is empty" : "No thoughts yet"}
        emptyText={tab === "following" ? "Follow people to see their thoughts here." : "Be the first to share something!"}
      />
    </div>
  );
}
