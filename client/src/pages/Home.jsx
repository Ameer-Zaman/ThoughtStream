import { useEffect, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import axios from "axios";

import "./Home.css";

import thoughtStreamLogo from "../assets/images/logo.png";

function Home() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [thoughts, setThoughts] = useState([]);
  const [thoughtsLoading, setThoughtsLoading] = useState(true);

  const [likedThoughts, setLikedThoughts] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  const [likeLoading, setLikeLoading] = useState({});

  const [openComments, setOpenComments] = useState({});
  const [comments, setComments] = useState({});
  const [commentCounts, setCommentCounts] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [commentsLoading, setCommentsLoading] = useState({});
  const [commentSubmitting, setCommentSubmitting] = useState({});
  const [commentErrors, setCommentErrors] = useState({});
  const [commentsLoaded, setCommentsLoaded] = useState({});

  const [replyingTo, setReplyingTo] = useState({});
  const [openReplies, setOpenReplies] = useState({});

  const [followingUsers, setFollowingUsers] = useState({});
  const [followLoading, setFollowLoading] = useState({});
  const [openMenuId, setOpenMenuId] = useState(null);

  const [editingThoughtId, setEditingThoughtId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    const getUser = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/users/me", {
          withCredentials: true,
        });

        setUser(response.data.user);
      } catch (error) {
        console.error("Failed to load user:", error);
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, []);

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

  const getThoughts = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/thoughts", {
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
      setError("Failed to load thoughts.");
    } finally {
      setThoughtsLoading(false);
    }
  };

  useEffect(() => {
    getThoughts();
  }, []);

  const handleCreateThought = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    try {
      const response = await axios.post(
        "http://localhost:5000/api/thoughts",
        { content },
        { withCredentials: true },
      );

      setMessage(response.data.message || "Thought published!");
      setContent("");
      await getThoughts();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to publish thought.");
    }
  };

  const handleDeleteThought = async (thoughtId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this thought?",
    );

    if (!confirmDelete) return;

    setMessage("");
    setError("");

    try {
      const response = await axios.delete(
        `http://localhost:5000/api/thoughts/${thoughtId}`,
        { withCredentials: true },
      );

      setThoughts((previousThoughts) =>
        previousThoughts.filter(
          (thought) => String(thought._id) !== String(thoughtId),
        ),
      );

      setMessage(response.data.message || "Thought deleted.");
    } catch (error) {
      setError(error.response?.data?.message || "Failed to delete thought.");
    }
  };

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

  const handleStartEdit = (thought) => {
    setEditingThoughtId(thought._id);
    setEditDraft(thought.content);
    setEditError("");
    setOpenMenuId(null);
  };

  const handleCancelEdit = () => {
    setEditingThoughtId(null);
    setEditDraft("");
    setEditError("");
  };

  const handleUpdateThought = async (thoughtId) => {
    if (!editDraft.trim()) {
      setEditError("Thought cannot be empty.");
      return;
    }

    setEditSubmitting(true);
    setEditError("");

    try {
      const response = await axios.put(
        `http://localhost:5000/api/thoughts/${thoughtId}`,
        { content: editDraft },
        { withCredentials: true },
      );

      const updatedThought = response.data.thought;

      setThoughts((previous) =>
        previous.map((thought) =>
          String(thought._id) === String(thoughtId)
            ? { ...thought, content: updatedThought.content, isEdited: true }
            : thought,
        ),
      );

      setEditingThoughtId(null);
      setEditDraft("");
    } catch (error) {
      setEditError(
        error.response?.data?.message || "Failed to update thought.",
      );
    } finally {
      setEditSubmitting(false);
    }
  };

  const getUserId = (value) => {
    if (!value) return null;

    if (typeof value === "object") {
      return value._id || value.id || null;
    }

    return value;
  };

  const currentUserId = getUserId(user);

  const getFollowing = async () => {
    try {
      if (!currentUserId) return;

      const response = await axios.get(
        `http://localhost:5000/api/follows/${currentUserId}/following`,
        { withCredentials: true },
      );

      const followingIds = {};
      const following = response.data.following || [];

      following.forEach((item) => {
        const id = item.following?._id || item.following;

        if (id) {
          followingIds[String(id)] = true;
        }
      });

      setFollowingUsers(followingIds);
    } catch (error) {
      console.error("Failed to load following users:", error);
    }
  };

  const handleFollowToggle = async (userId) => {
    const key = String(userId);

    if (followLoading[key]) return;

    const isFollowing = Boolean(followingUsers[key]);

    setFollowLoading((previous) => ({
      ...previous,
      [key]: true,
    }));

    try {
      if (isFollowing) {
        await axios.delete(`http://localhost:5000/api/follows/${userId}`, {
          withCredentials: true,
        });

        setFollowingUsers((previous) => {
          const updated = { ...previous };
          delete updated[key];
          return updated;
        });
      } else {
        await axios.post(
          `http://localhost:5000/api/follows/${userId}`,
          {},
          { withCredentials: true },
        );

        setFollowingUsers((previous) => ({
          ...previous,
          [key]: true,
        }));
      }
    } catch (error) {
      console.error("Failed to update follow:", error);
    } finally {
      setFollowLoading((previous) => ({
        ...previous,
        [key]: false,
      }));
    }
  };

  useEffect(() => {
    if (currentUserId) {
      getFollowing();
    }
  }, [currentUserId]);

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

  const getComments = async (thoughtId) => {
    setCommentsLoading((previous) => ({
      ...previous,
      [thoughtId]: true,
    }));

    setCommentErrors((previous) => ({
      ...previous,
      [thoughtId]: "",
    }));

    try {
      const response = await axios.get(
        `http://localhost:5000/api/comments/thoughts/${thoughtId}`,
        { withCredentials: true },
      );

      const loadedComments = response.data.comments || [];

      setComments((previous) => ({
        ...previous,
        [thoughtId]: loadedComments,
      }));

      setCommentCounts((previous) => ({
        ...previous,
        [thoughtId]: loadedComments.length,
      }));

      setCommentsLoaded((previous) => ({
        ...previous,
        [thoughtId]: true,
      }));
    } catch (error) {
      console.error("Failed to load comments:", error);
      setCommentErrors((previous) => ({
        ...previous,
        [thoughtId]:
          error.response?.data?.message || "Failed to load comments.",
      }));
    } finally {
      setCommentsLoading((previous) => ({
        ...previous,
        [thoughtId]: false,
      }));
    }
  };

  const toggleComments = (thoughtId) => {
    const isCurrentlyOpen = Boolean(openComments[thoughtId]);

    setOpenComments((previous) => ({
      ...previous,
      [thoughtId]: !previous[thoughtId],
    }));

    if (!isCurrentlyOpen && !commentsLoaded[thoughtId]) {
      getComments(thoughtId);
    }
  };

  const handleCommentInput = (thoughtId, value) => {
    setCommentInputs((previous) => ({
      ...previous,
      [thoughtId]: value,
    }));
  };

  const handleReplyInput = (commentId, value) => {
    setCommentInputs((previous) => ({
      ...previous,
      [commentId]: value,
    }));
  };

  const handleCreateReply = async (e, thoughtId, commentId) => {
    e.preventDefault();

    const replyContent = commentInputs[commentId] || "";

    if (!replyContent.trim()) return;

    setCommentSubmitting((previous) => ({
      ...previous,
      [commentId]: true,
    }));

    try {
      await axios.post(
        `http://localhost:5000/api/comments/thoughts/${thoughtId}`,
        {
          content: replyContent,
          parentComment: commentId,
        },
        { withCredentials: true },
      );

      await getComments(thoughtId);

      setOpenReplies((previous) => ({
        ...previous,
        [commentId]: true,
      }));

      setCommentInputs((previous) => ({
        ...previous,
        [commentId]: "",
      }));

      setReplyingTo((previous) => ({
        ...previous,
        [commentId]: false,
      }));
    } catch (error) {
      console.error("Failed to add reply:", error);
    } finally {
      setCommentSubmitting((previous) => ({
        ...previous,
        [commentId]: false,
      }));
    }
  };

  const handleCreateComment = async (e, thoughtId) => {
    e.preventDefault();

    const commentContent = commentInputs[thoughtId] || "";

    if (!commentContent.trim()) {
      setCommentErrors((previous) => ({
        ...previous,
        [thoughtId]: "Comment cannot be empty.",
      }));

      return;
    }

    setCommentSubmitting((previous) => ({
      ...previous,
      [thoughtId]: true,
    }));

    setCommentErrors((previous) => ({
      ...previous,
      [thoughtId]: "",
    }));

    try {
      const response = await axios.post(
        `http://localhost:5000/api/comments/thoughts/${thoughtId}`,
        { content: commentContent },
        { withCredentials: true },
      );

      setComments((previous) => ({
        ...previous,
        [thoughtId]: [response.data.comment, ...(previous[thoughtId] || [])],
      }));

      setCommentCounts((previous) => ({
        ...previous,
        [thoughtId]: (previous[thoughtId] || 0) + 1,
      }));

      setCommentsLoaded((previous) => ({
        ...previous,
        [thoughtId]: true,
      }));

      setCommentInputs((previous) => ({
        ...previous,
        [thoughtId]: "",
      }));
    } catch (error) {
      setCommentErrors((previous) => ({
        ...previous,
        [thoughtId]: error.response?.data?.message || "Failed to add comment.",
      }));
    } finally {
      setCommentSubmitting((previous) => ({
        ...previous,
        [thoughtId]: false,
      }));
    }
  };

  const formatDate = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="home-loading">
        <div className="loading-spinner" />
        <p>Loading ThoughtStream...</p>
      </div>
    );
  }

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
          <Link to="/" className="nav-item active" aria-current="page">
            <span className="nav-icon">⌂</span>
            <span>Home</span>
          </Link>

          <Link to="/explore" className="nav-item">
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

        <div className="feed-tabs">
          <button type="button" className="feed-tab active">
            For You
          </button>

          <button type="button" className="feed-tab">
            Following
          </button>
        </div>

        <section className="composer-card">
          <div className="composer-top">
            <div className="user-avatar composer-avatar">
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt="" />
              ) : (
                (user?.fullName || user?.username || "U")
                  .charAt(0)
                  .toUpperCase()
              )}
            </div>

            <div className="composer-heading">
              <strong>{user?.fullName || user?.username || "You"}</strong>
              <span>What's on your mind?</span>
            </div>
          </div>

          <form onSubmit={handleCreateThought}>
            <label className="sr-only" htmlFor="thought">
              Write a thought
            </label>

            <textarea
              id="thought"
              className="thought-input"
              placeholder="Share something..."
              value={content}
              maxLength={500}
              onChange={(e) => setContent(e.target.value)}
            />

            <div className="composer-footer">
              <span className="character-count">{content.length} / 500</span>

              <button
                className="publish-button"
                type="submit"
                disabled={!content.trim()}
              >
                Post
              </button>
            </div>
          </form>
        </section>

        {message && (
          <p className="status-message" role="status">
            {message}
          </p>
        )}

        {error && (
          <p className="status-error" role="alert">
            {error}
          </p>
        )}

        <section className="feed-section">
          {thoughtsLoading ? (
            <div className="feed-state">
              <div className="loading-spinner" />
              <p>Loading thoughts...</p>
            </div>
          ) : thoughts.length === 0 ? (
            <div className="feed-state empty-feed">
              <div className="empty-icon">✎</div>
              <h3>It's quiet here.</h3>
              <p>Be the first to share a thought with the community.</p>
            </div>
          ) : (
            <div className="thought-list">
              {thoughts.map((thought) => {
                const authorId = getUserId(thought.authorId);

                const isOwner =
                  currentUserId &&
                  authorId &&
                  String(currentUserId) === String(authorId);

                const authorName =
                  thought.authorId?.fullName ||
                  thought.authorId?.username ||
                  "Unknown user";

                const authorUsername = thought.authorId?.username;

                const isLiked = Boolean(likedThoughts[thought._id]);
                const likeCount = likeCounts[thought._id] || 0;
                const isLikeLoading = Boolean(likeLoading[thought._id]);
                const areCommentsOpen = Boolean(openComments[thought._id]);
                const thoughtComments = comments[thought._id] || [];
                const commentCount = commentCounts[thought._id] || 0;
                const isEditing = editingThoughtId === thought._id;

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

                      <div className="thought-header-actions">
                        {!isOwner && authorId && (
                          <button
                            type="button"
                            className={`follow-button ${
                              followingUsers[String(authorId)]
                                ? "following"
                                : ""
                            }`}
                            onClick={() => handleFollowToggle(authorId)}
                            disabled={Boolean(followLoading[String(authorId)])}
                          >
                            {followLoading[String(authorId)]
                              ? "..."
                              : followingUsers[String(authorId)]
                                ? "Following"
                                : "Follow"}
                          </button>
                        )}

                        <div className="thought-menu-wrapper">
                          <button
                            type="button"
                            className="thought-menu-button"
                            onClick={() =>
                              setOpenMenuId((previous) =>
                                previous === thought._id ? null : thought._id,
                              )
                            }
                            aria-label="Post options"
                            aria-expanded={openMenuId === thought._id}
                          >
                            ⋯
                          </button>

                          {openMenuId === thought._id && (
                            <div className="thought-menu">
                              {isOwner ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(thought)}
                                  >
                                    Edit
                                  </button>

                                  <button
                                    type="button"
                                    className="danger"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      handleDeleteThought(thought._id);
                                    }}
                                  >
                                    Delete
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      console.log(
                                        "Report thought:",
                                        thought._id,
                                      );
                                    }}
                                  >
                                    Report
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      console.log("Message user:", authorId);
                                    }}
                                  >
                                    Message
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="thought-edit">
                        <textarea
                          className="thought-edit-input"
                          value={editDraft}
                          maxLength={500}
                          onChange={(e) => setEditDraft(e.target.value)}
                        />

                        {editError && (
                          <p className="thought-edit-error">{editError}</p>
                        )}

                        <div className="thought-edit-actions">
                          <span className="character-count">
                            {editDraft.length} / 500
                          </span>

                          <div className="thought-edit-buttons">
                            <button
                              type="button"
                              className="thought-edit-cancel"
                              onClick={handleCancelEdit}
                              disabled={editSubmitting}
                            >
                              Cancel
                            </button>

                            <button
                              type="button"
                              className="thought-edit-save"
                              onClick={() => handleUpdateThought(thought._id)}
                              disabled={editSubmitting || !editDraft.trim()}
                            >
                              {editSubmitting ? "Saving..." : "Save"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="thought-content">{thought.content}</p>
                    )}

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
                          className={`action-icon-button comment-action ${
                            areCommentsOpen ? "comment-open" : ""
                          }`}
                          type="button"
                          onClick={() => toggleComments(thought._id)}
                          aria-expanded={areCommentsOpen}
                          aria-label={
                            areCommentsOpen ? "Hide comments" : "Show comments"
                          }
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

                    {areCommentsOpen && (
                      <div className="comment-section">
                        <div className="comment-section-header">
                          <div className="comment-section-title">
                            <svg
                              className="comment-section-icon"
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

                            <strong>COMMENTS</strong>

                            <span className="comment-section-count">
                              {commentCount}
                            </span>
                          </div>

                          <span className="comment-section-subtitle">
                            Join the conversation
                          </span>
                        </div>

                        <form
                          className="comment-form"
                          onSubmit={(e) => handleCreateComment(e, thought._id)}
                        >
                          <div className="comment-composer-avatar">
                            {user?.profilePicture ? (
                              <img src={user.profilePicture} alt="" />
                            ) : (
                              (user?.fullName || user?.username || "U")
                                .charAt(0)
                                .toUpperCase()
                            )}
                          </div>

                          <div className="comment-composer-main">
                            <label
                              className="sr-only"
                              htmlFor={`comment-${thought._id}`}
                            >
                              Write a comment
                            </label>

                            <textarea
                              id={`comment-${thought._id}`}
                              className="comment-input"
                              placeholder="Write a comment..."
                              value={commentInputs[thought._id] || ""}
                              maxLength={500}
                              onChange={(e) =>
                                handleCommentInput(thought._id, e.target.value)
                              }
                            />

                            <div className="comment-composer-footer">
                              <span className="character-count">
                                {(commentInputs[thought._id] || "").length} /
                                500
                              </span>

                              <button
                                className="comment-submit-button"
                                type="submit"
                                disabled={
                                  !commentInputs[thought._id]?.trim() ||
                                  commentSubmitting[thought._id]
                                }
                              >
                                {commentSubmitting[thought._id]
                                  ? "Posting..."
                                  : "Add comment"}
                              </button>
                            </div>
                          </div>
                        </form>

                        {commentErrors[thought._id] && (
                          <p className="status-error" role="alert">
                            {commentErrors[thought._id]}
                          </p>
                        )}

                        {commentsLoading[thought._id] ? (
                          <div className="comment-loading">
                            <div className="loading-spinner" />
                            <p>Loading comments...</p>
                          </div>
                        ) : thoughtComments.length === 0 ? (
                          <div className="comment-empty">
                            <div className="comment-empty-icon">
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                  d="M20 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-4.7a8.38 8.38 0 0 1 3.8-7.6 8.5 8.5 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 7 7v.5Z"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </div>

                            <strong>No comments yet</strong>
                            <span>Be the first to join the conversation.</span>
                          </div>
                        ) : (
                          <div className="comment-list">
                            {thoughtComments
                              .filter((comment) => !comment.parentComment)
                              .map((comment) => {
                                const commentAuthor =
                                  comment.authorId?.fullName ||
                                  comment.authorId?.username ||
                                  "Unknown user";

                                return (
                                  <div
                                    className="comment-item"
                                    key={comment._id}
                                  >
                                    <div className="comment-item-header">
                                      <div className="comment-avatar user-avatar">
                                        {comment.authorId?.profilePicture ? (
                                          <img
                                            src={
                                              comment.authorId.profilePicture
                                            }
                                            alt=""
                                          />
                                        ) : (
                                          commentAuthor.charAt(0).toUpperCase()
                                        )}
                                      </div>

                                      <div className="comment-author-info">
                                        <strong>{commentAuthor}</strong>

                                        <span>
                                          @
                                          {comment.authorId?.username || "user"}
                                          <span className="meta-dot">·</span>
                                          {formatDate(comment.createdAt)}
                                        </span>
                                      </div>
                                    </div>

                                    <p className="comment-content">
                                      {comment.content}
                                    </p>

                                    <div className="comment-actions">
                                      <button
                                        type="button"
                                        className="comment-reply-button"
                                        onClick={() =>
                                          setReplyingTo((previous) => ({
                                            ...previous,
                                            [comment._id]:
                                              !previous[comment._id],
                                          }))
                                        }
                                      >
                                        Reply
                                      </button>

                                      {thoughtComments.filter(
                                        (reply) =>
                                          String(reply.parentComment) ===
                                          String(comment._id),
                                      ).length > 0 && (
                                        <button
                                          type="button"
                                          className="comment-replies-toggle"
                                          onClick={() =>
                                            setOpenReplies((previous) => ({
                                              ...previous,
                                              [comment._id]:
                                                !previous[comment._id],
                                            }))
                                          }
                                        >
                                          {openReplies[comment._id]
                                            ? "Hide replies"
                                            : `View ${
                                                thoughtComments.filter(
                                                  (reply) =>
                                                    String(
                                                      reply.parentComment,
                                                    ) === String(comment._id),
                                                ).length
                                              } ${
                                                thoughtComments.filter(
                                                  (reply) =>
                                                    String(
                                                      reply.parentComment,
                                                    ) === String(comment._id),
                                                ).length === 1
                                                  ? "reply"
                                                  : "replies"
                                              }`}
                                        </button>
                                      )}
                                    </div>

                                    {replyingTo[comment._id] && (
                                      <form
                                        className="comment-reply-form"
                                        onSubmit={(e) =>
                                          handleCreateReply(
                                            e,
                                            thought._id,
                                            comment._id,
                                          )
                                        }
                                      >
                                        <textarea
                                          value={
                                            commentInputs[comment._id] || ""
                                          }
                                          onChange={(e) =>
                                            handleReplyInput(
                                              comment._id,
                                              e.target.value,
                                            )
                                          }
                                          placeholder="Write a reply..."
                                          rows="2"
                                        />

                                        <button
                                          type="submit"
                                          disabled={
                                            commentSubmitting[comment._id] ||
                                            !commentInputs[comment._id]?.trim()
                                          }
                                        >
                                          {commentSubmitting[comment._id]
                                            ? "Replying..."
                                            : "Reply"}
                                        </button>
                                      </form>
                                    )}

                                    {openReplies[comment._id] &&
                                      thoughtComments.filter(
                                        (reply) =>
                                          String(reply.parentComment) ===
                                          String(comment._id),
                                      ).length > 0 && (
                                        <div className="comment-replies">
                                          {thoughtComments
                                            .filter(
                                              (reply) =>
                                                String(reply.parentComment) ===
                                                String(comment._id),
                                            )
                                            .map((reply) => {
                                              const replyAuthor =
                                                reply.authorId?.fullName ||
                                                reply.authorId?.username ||
                                                "Unknown user";

                                              return (
                                                <div
                                                  className="comment-reply"
                                                  key={reply._id}
                                                >
                                                  <div className="comment-item-header">
                                                    <div className="comment-avatar user-avatar">
                                                      {reply.authorId
                                                        ?.profilePicture ? (
                                                        <img
                                                          src={
                                                            reply.authorId
                                                              .profilePicture
                                                          }
                                                          alt=""
                                                        />
                                                      ) : (
                                                        replyAuthor
                                                          .charAt(0)
                                                          .toUpperCase()
                                                      )}
                                                    </div>

                                                    <div className="comment-author-info">
                                                      <strong>
                                                        {replyAuthor}
                                                      </strong>

                                                      <span>
                                                        @
                                                        {reply.authorId
                                                          ?.username || "user"}
                                                        <span className="meta-dot">
                                                          ·
                                                        </span>
                                                        {formatDate(
                                                          reply.createdAt,
                                                        )}
                                                      </span>
                                                    </div>
                                                  </div>

                                                  <p className="comment-content">
                                                    {reply.content}
                                                  </p>
                                                </div>
                                              );
                                            })}
                                        </div>
                                      )}
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    )}
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

export default Home;
