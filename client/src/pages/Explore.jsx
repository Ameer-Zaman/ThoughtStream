import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import thoughtStreamLogo from "../assets/images/logo.png";

import "./Home.css";
import "./Explore.css";

const TOPICS = [
  "Technology",
  "Life",
  "Music",
  "Ideas",
  "Learning",
  "Business",
  "Creativity",
  "Relationships",
  "Gaming"
];

function Explore() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  const [thoughts, setThoughts] = useState([]);
  const [thoughtsLoading, setThoughtsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("trending");
  const [activeTopic, setActiveTopic] = useState(null);

  const [likedThoughts, setLikedThoughts] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  const [likeLoading, setLikeLoading] = useState({});

  const [commentCounts, setCommentCounts] = useState({});

  useEffect(() => {
    const getUser = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/users/me", {
          withCredentials: true,
        });

        setUser(response.data.user);
      } catch (error) {
        console.error("Failed to load user:", error);
      }
    };

    getUser();
  }, []);

  const handleLogout = async () => {
    try {
      await axios.post(
        "http://localhost:5000/api/users/logout",
        {},
        { withCredentials: true },
      );

      navigate("/login");
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  const getUserId = (value) => {
    if (!value) return null;

    if (typeof value === "object") {
      return value._id || value.id || null;
    }

    return value;
  };

  const formatDate = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderContentWithHashtags = (text) => {
    if (!text) return null;

    // Split into words, preserving spaces
    const parts = text.split(/(\s+)/);

    return parts.map((part, index) => {
      // A hashtag: starts with #, has at least 1 word character after
      if (/^#[A-Za-z0-9_]+$/.test(part)) {
        return (
          <span key={index} className="hashtag">
            {part}
          </span>
        );
      }

      return <span key={index}>{part}</span>;
    });
  };

  const getLikes = async (thoughtId) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/likes/${thoughtId}`,
        { withCredentials: true },
      );

      setLikedThoughts((previous) => ({
        ...previous,
        [thoughtId]: response.data.liked,
      }));

      setLikeCounts((previous) => ({
        ...previous,
        [thoughtId]: response.data.likeCount,
      }));
    } catch (error) {
      console.error("Failed to load likes:", error);
    }
  };

  const getCommentCount = async (thoughtId) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/comments/thoughts/${thoughtId}`,
        { withCredentials: true },
      );

      const loadedComments = response.data.comments || [];

      setCommentCounts((previous) => ({
        ...previous,
        [thoughtId]: loadedComments.length,
      }));
    } catch (error) {
      console.error("Failed to load comment count:", error);
    }
  };

  const getThoughts = async (tab = activeTab, topic = activeTopic) => {
    try {
      setThoughtsLoading(true);

      // If a topic is active, fetch thoughts for that topic
      let url;

      if (topic) {
        url = `http://localhost:5000/api/thoughts/topic/${encodeURIComponent(
          topic.toLowerCase(),
        )}`;
      } else {
        url = getFeedUrl(tab);
      }

      const response = await axios.get(url, {
        withCredentials: true,
      });

      const loadedThoughts = response.data.thoughts || [];

      setThoughts(loadedThoughts);

      for (const thought of loadedThoughts) {
        await getLikes(thought._id);
        await getCommentCount(thought._id);
      }
    } catch (error) {
      console.error("Failed to load thoughts:", error);
    } finally {
      setThoughtsLoading(false);
    }
  };

  useEffect(() => {
    getThoughts(activeTab, activeTopic);
  }, [activeTab, activeTopic]);

  const getFeedUrl = (tab) => {
    if (tab === "trending") {
      return "http://localhost:5000/api/thoughts/trending";
    }

    if (tab === "following") {
      return "http://localhost:5000/api/thoughts/following";
    }

    // "latest" and fallback
    return "http://localhost:5000/api/thoughts";
  };
  // Debounced search
  useEffect(() => {
    const trimmed = searchQuery.trim();

    if (!trimmed) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);

    const timer = setTimeout(async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/api/search?q=${encodeURIComponent(trimmed)}`,
          { withCredentials: true },
        );

        setSearchResults(response.data.thoughts || []);
      } catch (error) {
        console.error("Search failed:", error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLike = async (thoughtId) => {
    if (likeLoading[thoughtId]) return;

    const isCurrentlyLiked = Boolean(likedThoughts[thoughtId]);

    setLikeLoading((previous) => ({
      ...previous,
      [thoughtId]: true,
    }));

    try {
      let response;

      if (isCurrentlyLiked) {
        response = await axios.delete(
          `http://localhost:5000/api/likes/${thoughtId}`,
          { withCredentials: true },
        );
      } else {
        response = await axios.post(
          `http://localhost:5000/api/likes/${thoughtId}`,
          {},
          { withCredentials: true },
        );
      }

      setLikedThoughts((previous) => ({
        ...previous,
        [thoughtId]: response.data.liked,
      }));

      setLikeCounts((previous) => ({
        ...previous,
        [thoughtId]: response.data.likeCount,
      }));
    } catch (error) {
      console.error("Failed to update like:", error);
    } finally {
      setLikeLoading((previous) => ({
        ...previous,
        [thoughtId]: false,
      }));
    }
  };

  return (
    <div className="home-layout">
      <aside className="home-sidebar">
        <Link to="/" className="brand">
          <img
            src={thoughtStreamLogo}
            alt="ThoughtStream"
            className="brand-logo"
          />
          <span>ThoughtStream</span>
        </Link>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <Link to="/" className="nav-item">
            <span className="nav-icon">⌂</span>
            <span>Home</span>
          </Link>

          <Link to="/explore" className="nav-item active" aria-current="page">
            <span className="nav-icon">⌕</span>
            <span>Explore</span>
          </Link>

          <button className="nav-item" type="button" disabled>
            <span className="nav-icon">♧</span>
            <span>Notifications</span>
          </button>

          <Link to="/messages" className="nav-item">
            <span className="nav-icon">✉</span>
            <span>Messages</span>
          </Link>

          <button className="nav-item" type="button" disabled>
            <span className="nav-icon">▱</span>
            <span>Saved</span>
          </button>

          <button className="nav-item" type="button" disabled>
            <span className="nav-icon">⚙</span>
            <span>Settings</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <button
            type="button"
            className="nav-item logout-nav-item"
            onClick={handleLogout}
          >
            <span className="nav-icon">↪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="home-main">
        <div className="feed-topbar">
          <Link
            to={`/profile/${encodeURIComponent(user?.username || "")}`}
            className="feed-topbar-avatar"
            aria-label="Your profile"
          >
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt="" />
            ) : (
              (user?.fullName || user?.username || "U").charAt(0).toUpperCase()
            )}
          </Link>
        </div>

        <header className="explore-header">
          <h1>Explore</h1>
          <p>Discover thoughts, ideas, and conversations.</p>
        </header>

        <div className="explore-search">
          <span className="explore-search-icon" aria-hidden="true">
            ⌕
          </span>

          <input
            type="text"
            placeholder="Search thoughts, topics, or people"
            aria-label="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <span className="explore-search-shortcut">⌘K</span>
        </div>

                <div className="feed-tabs">
          <button
            type="button"
            className={`feed-tab ${activeTab === "following" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("following");
              setActiveTopic(null);
            }}
          >
            For You
          </button>

          <button
            type="button"
            className={`feed-tab ${activeTab === "trending" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("trending");
              setActiveTopic(null);
            }}
          >
            Trending
          </button>

          <button
            type="button"
            className={`feed-tab ${activeTab === "latest" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("latest");
              setActiveTopic(null);
            }}
          >
            Latest
          </button>
        </div>

        <section className="explore-topics">
          <h2 className="explore-section-title">TOPICS</h2>

          <div className="explore-topics-list">
            {TOPICS.map((topic) => (
              <button
                key={topic}
                type="button"
                className={`explore-topic-chip ${
                  activeTopic === topic ? "active" : ""
                }`}
                onClick={() =>
                  setActiveTopic((previous) =>
                    previous === topic ? null : topic,
                  )
                }
              >
                {topic}
              </button>
            ))}
          </div>
        </section>

        <section className="explore-thoughts">
          <h2 className="explore-section-title">
            {searchResults !== null
              ? "SEARCH RESULTS"
              : activeTopic
                ? `#${activeTopic}`
                : "TRENDING THOUGHTS"}
          </h2>

          {searchResults !== null ? (
            searchLoading ? (
              <div className="explore-empty">
                <div className="loading-spinner" />
                <p>Searching...</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="explore-empty">
                <p>No results for "{searchQuery}"</p>
                <span>Try a different keyword.</span>
              </div>
            ) : (
              <div className="thought-list">
                {searchResults.map((thought) => {
                  const authorName =
                    thought.authorId?.fullName ||
                    thought.authorId?.username ||
                    "Unknown user";

                  const authorUsername = thought.authorId?.username;

                  const isLiked = Boolean(likedThoughts[thought._id]);
                  const likeCount = likeCounts[thought._id] || 0;
                  const isLikeLoading = Boolean(likeLoading[thought._id]);
                  const commentCount = commentCounts[thought._id] || 0;

                  return (
                    <article className="thought-card" key={thought._id}>
                      <div className="thought-card-header">
                        <div className="thought-author">
                          <div className="user-avatar">
                            {thought.authorId?.profilePicture ? (
                              <img
                                src={thought.authorId.profilePicture}
                                alt=""
                              />
                            ) : (
                              authorName.charAt(0).toUpperCase()
                            )}
                          </div>

                          <div className="author-info">
                            {authorUsername ? (
                              <Link
                                to={`/profile/${encodeURIComponent(
                                  authorUsername,
                                )}`}
                                className="author-name-link"
                              >
                                <strong>{authorName}</strong>
                              </Link>
                            ) : (
                              <strong>{authorName}</strong>
                            )}

                            <span>
                              @{authorUsername || "user"}
                              <span className="meta-dot">·</span>
                              {formatDate(thought.createdAt)}
                              {thought.isEdited && (
                                <>
                                  <span className="meta-dot">·</span>
                                  <span className="edited-label">Edited</span>
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="thought-content">
                        {renderContentWithHashtags(thought.content)}
                      </p>

                      <div className="thought-actions">
                        <div className="thought-actions-left">
                          <button
                            className={`action-icon-button like-action ${
                              isLiked ? "liked" : ""
                            }`}
                            type="button"
                            onClick={() => handleLike(thought._id)}
                            disabled={isLikeLoading}
                            aria-label={
                              isLiked ? "Unlike thought" : "Like thought"
                            }
                          >
                            <svg
                              className="action-svg"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <path
                                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"
                                fill={isLiked ? "currentColor" : "none"}
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>

                            <span className="action-count">{likeCount}</span>
                          </button>

                          <button
                            className="action-icon-button comment-action"
                            type="button"
                            aria-label="Comments"
                          >
                            <svg
                              className="action-svg"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <path
                                d="M20 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-4.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 7 7v.5Z"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>

                            <span className="action-count">{commentCount}</span>
                          </button>

                          <button
                            type="button"
                            className="action-icon-button share-action"
                            aria-label="Share thought"
                          >
                            <svg
                              className="action-svg"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <path
                                d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M16 6l-4-4-4 4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M12 2v14"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        </div>

                        <button
                          type="button"
                          className="action-icon-button bookmark-action"
                          aria-label="Save thought"
                        >
                          <svg
                            className="action-svg"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )
          ) : thoughtsLoading ? (
            <div className="explore-empty">
              <div className="loading-spinner" />
              <p>Loading thoughts...</p>
            </div>
          ) : thoughts.length === 0 ? (
            <div className="explore-empty">
              <p>No thoughts yet.</p>
              <span>Be the first to share something.</span>
            </div>
          ) : (
            <div className="thought-list">
              {thoughts.map((thought) => {
                const authorName =
                  thought.authorId?.fullName ||
                  thought.authorId?.username ||
                  "Unknown user";

                const authorUsername = thought.authorId?.username;

                const isLiked = Boolean(likedThoughts[thought._id]);
                const likeCount = likeCounts[thought._id] || 0;
                const isLikeLoading = Boolean(likeLoading[thought._id]);
                const commentCount = commentCounts[thought._id] || 0;

                return (
                  <article className="thought-card" key={thought._id}>
                    <div className="thought-card-header">
                      <div className="thought-author">
                        <div className="user-avatar">
                          {thought.authorId?.profilePicture ? (
                            <img src={thought.authorId.profilePicture} alt="" />
                          ) : (
                            authorName.charAt(0).toUpperCase()
                          )}
                        </div>

                        <div className="author-info">
                          {authorUsername ? (
                            <Link
                              to={`/profile/${encodeURIComponent(
                                authorUsername,
                              )}`}
                              className="author-name-link"
                            >
                              <strong>{authorName}</strong>
                            </Link>
                          ) : (
                            <strong>{authorName}</strong>
                          )}

                          <span>
                            @{authorUsername || "user"}
                            <span className="meta-dot">·</span>
                            {formatDate(thought.createdAt)}
                            {thought.isEdited && (
                              <>
                                <span className="meta-dot">·</span>
                                <span className="edited-label">Edited</span>
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="thought-content">
                      {renderContentWithHashtags(thought.content)}
                    </p>

                    <div className="thought-actions">
                      <div className="thought-actions-left">
                        <button
                          className={`action-icon-button like-action ${
                            isLiked ? "liked" : ""
                          }`}
                          type="button"
                          onClick={() => handleLike(thought._id)}
                          disabled={isLikeLoading}
                          aria-label={
                            isLiked ? "Unlike thought" : "Like thought"
                          }
                        >
                          <svg
                            className="action-svg"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"
                              fill={isLiked ? "currentColor" : "none"}
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>

                          <span className="action-count">{likeCount}</span>
                        </button>

                        <button
                          className="action-icon-button comment-action"
                          type="button"
                          aria-label="Comments"
                        >
                          <svg
                            className="action-svg"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              d="M20 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-4.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 7 7v.5Z"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>

                          <span className="action-count">{commentCount}</span>
                        </button>

                        <button
                          type="button"
                          className="action-icon-button share-action"
                          aria-label="Share thought"
                        >
                          <svg
                            className="action-svg"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M16 6l-4-4-4 4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M12 2v14"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </div>

                      <button
                        type="button"
                        className="action-icon-button bookmark-action"
                        aria-label="Save thought"
                      >
                        <svg
                          className="action-svg"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Explore;
