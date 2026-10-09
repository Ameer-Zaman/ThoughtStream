import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { errMsg } from "../api";
import Avatar from "./Avatar";
import Icon from "./Icon";
import CommentSection from "./CommentSection";
import { formatDate, renderContent } from "./format";
import { useAuth } from "../context/AuthContext";

// The thought's data lives in the list that owns it (see useThoughts).
// This card just displays it and reports changes through onChange / onRemove / onFollowChange.
export default function ThoughtCard({ thought: t, onChange, onRemove, onFollowChange }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(t.content);
  const [showComments, setShowComments] = useState(false);
  const [error, setError] = useState("");
  const likeBusy = useRef(false);

  const mine = t.author._id === user._id;

  // Close the three-dot menu when clicking anywhere else
  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = () => setMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

  const toggleLike = async () => {
    if (likeBusy.current) return;
    likeBusy.current = true;
    const was = t.liked;
    const originalCount = t.likeCount;
    onChange(t._id, { liked: !was, likeCount: originalCount + (was ? -1 : 1) }); // instant
    try {
      const res = was ? await api.delete(`/likes/${t._id}`) : await api.post(`/likes/${t._id}`);
      onChange(t._id, { liked: res.data.liked, likeCount: res.data.likeCount });
    } catch {
      onChange(t._id, { liked: was, likeCount: originalCount }); // undo
    } finally {
      likeBusy.current = false;
    }
  };

  const toggleFollow = async () => {
    const was = t.iFollowAuthor;
    onFollowChange?.(t.author._id, !was);
    try {
      if (was) await api.delete(`/follows/${t.author._id}`);
      else await api.post(`/follows/${t.author._id}`);
    } catch (err) {
      onFollowChange?.(t.author._id, was);
      setError(errMsg(err));
    }
  };

  const saveEdit = async () => {
    const content = draft.trim();
    if (!content) return;
    try {
      await api.put(`/thoughts/${t._id}`, { content });
      onChange(t._id, { content, isEdited: true });
      setEditing(false);
    } catch (err) {
      setError(errMsg(err, "Could not save"));
    }
  };

  const remove = async () => {
    if (!window.confirm("Delete this thought? This can't be undone.")) return;
    try {
      await api.delete(`/thoughts/${t._id}`);
      onRemove(t._id);
    } catch (err) {
      setError(errMsg(err, "Could not delete"));
    }
  };

  return (
    <article className="thought">
      <div className="thought-top">
        <Link to={`/profile/${t.author.username}`}>
          <Avatar user={t.author} size={44} />
        </Link>

        <div className="thought-main">
          <div className="thought-head">
            <div className="thought-who">
              <Link to={`/profile/${t.author.username}`} className="thought-name">
                {t.author.fullName}
              </Link>
              <span className="thought-meta">@{t.author.username}</span>
              <span className="thought-meta">· {formatDate(t.createdAt)}</span>
              {t.isEdited && <span className="edited">(edited)</span>}
            </div>

            {!mine && (
              <button
                className={"btn btn-sm" + (t.iFollowAuthor ? " btn-following" : " btn-primary")}
                onClick={toggleFollow}
              >
                {t.iFollowAuthor ? "Following" : "Follow"}
              </button>
            )}

            <div className="menu-wrap">
              <button
                className="icon-btn"
                aria-label="More options"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((v) => !v);
                }}
              >
                <Icon name="dots" />
              </button>
              {menuOpen && (
                <div className="menu">
                  {mine ? (
                    <>
                      <button
                        onClick={() => {
                          setDraft(t.content);
                          setEditing(true);
                        }}
                      >
                        Edit
                      </button>
                      <button className="danger" onClick={remove}>
                        Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => window.alert("Thanks, we'll take a look at this thought.")}>Report</button>
                      <button onClick={() => navigate("/messages", { state: { userId: t.author._id } })}>Message</button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {editing ? (
            <div className="edit-box">
              <textarea value={draft} maxLength={500} onChange={(e) => setDraft(e.target.value)} autoFocus />
              <div className="edit-actions">
                <button className="btn btn-sm" onClick={() => setEditing(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={!draft.trim()}>
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="thought-content">{renderContent(t.content)}</div>
          )}

          {error && <div className="form-error">{error}</div>}

          <div className="thought-actions">
            <button className={"icon-btn like" + (t.liked ? " liked" : "")} onClick={toggleLike} aria-label="Like">
              <Icon name="heart" size={18} filled={t.liked} />
              <span>{t.likeCount}</span>
            </button>
            <button
              className={"icon-btn comment-btn" + (showComments ? " active" : "")}
              onClick={() => setShowComments((v) => !v)}
              aria-label="Comments"
            >
              <Icon name="comment" size={18} />
              <span>{t.commentCount}</span>
            </button>
            <button className="icon-btn" aria-label="Share" title="Share">
              <Icon name="share" size={18} />
            </button>
            <span className="spacer" />
            <button className="icon-btn" aria-label="Bookmark" title="Bookmark">
              <Icon name="bookmark" size={18} />
            </button>
          </div>

          {showComments && (
            <CommentSection
              thoughtId={t._id}
              onCountChange={(d) => onChange(t._id, { commentCount: Math.max(0, t.commentCount + d) })}
            />
          )}
        </div>
      </div>
    </article>
  );
}
