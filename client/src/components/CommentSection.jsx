import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api, { errMsg } from "../api";
import Avatar from "./Avatar";
import ErrorState from "./ErrorState";
import { CommentSkeletons } from "./Skeleton";
import { formatDate } from "./format";
import { useAuth } from "../context/AuthContext";
import { useQuery } from "../lib/query";

function CommentItem({ comment, byParent, onAdd }) {
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const children = byParent[comment._id] || [];

  const submitReply = async () => {
    const content = text.trim();
    if (!content) return;
    setBusy(true);
    try {
      await onAdd(content, comment._id);
      setText("");
      setReplying(false);
      setOpen(true); // auto-open replies after posting
    } catch {
      // the error is shown by the parent
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="comment">
      <Avatar user={comment.authorId} size={32} />
      <div className="comment-body">
        <div>
          <Link to={`/profile/${comment.authorId.username}`} className="thought-name">
            {comment.authorId.fullName}
          </Link>{" "}
          <span className="thought-meta">
            @{comment.authorId.username} · {formatDate(comment.createdAt)}
          </span>
        </div>
        <div className="comment-text">{comment.content}</div>

        <div className="comment-actions">
          <button className="link-btn" onClick={() => setReplying((v) => !v)}>
            Reply
          </button>
          {children.length > 0 && (
            <button className="link-btn" onClick={() => setOpen((v) => !v)}>
              {open ? "Hide replies" : `View ${children.length} ${children.length === 1 ? "reply" : "replies"}`}
            </button>
          )}
        </div>

        {replying && (
          <div className="comment-composer reply-form">
            <input
              autoFocus
              placeholder={`Reply to ${comment.authorId.fullName}…`}
              value={text}
              maxLength={500}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitReply()}
            />
            <button className="btn btn-primary btn-sm" onClick={submitReply} disabled={busy || !text.trim()}>
              Reply
            </button>
          </div>
        )}

        {open && children.length > 0 && (
          <div className="replies">
            {children.map((c) => (
              <CommentItem key={c._id} comment={c} byParent={byParent} onAdd={onAdd} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CommentSection({ thoughtId, onCountChange }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [postError, setPostError] = useState("");

  // Cached per thought: closing and re-opening comments is instant
  const { data, loading, error, reload, mutate } = useQuery(`comments:${thoughtId}`, () =>
    api.get(`/comments/thoughts/${thoughtId}`).then((res) => res.data.comments)
  );
  const comments = data || [];

  // Group comments by parent: "root" for top-level, parent id for replies
  const byParent = useMemo(() => {
    const map = {};
    for (const c of comments) {
      const key = c.parentComment || "root";
      (map[key] = map[key] || []).push(c);
    }
    return map;
  }, [comments]);

  const add = async (content, parentId = null) => {
    setPostError("");
    try {
      const res = await api.post(`/comments/thoughts/${thoughtId}`, { content, parentComment: parentId });
      mutate((prev) => [...(prev || []), res.data.comment]);
      onCountChange(1);
    } catch (err) {
      setPostError(errMsg(err, "Could not post comment"));
      throw err;
    }
  };

  const submitTop = async () => {
    const content = text.trim();
    if (!content) return;
    setBusy(true);
    try {
      await add(content, null);
      setText("");
    } catch {
      // error already shown
    } finally {
      setBusy(false);
    }
  };

  const top = byParent.root || [];

  return (
    <div className="comments">
      <div className="comment-composer">
        <Avatar user={user} size={32} />
        <input
          placeholder="Write a comment…"
          value={text}
          maxLength={500}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitTop()}
        />
        <button className="btn btn-primary btn-sm" onClick={submitTop} disabled={busy || !text.trim()}>
          Post
        </button>
      </div>

      {postError && <div className="form-error">{postError}</div>}
      {loading && <CommentSkeletons />}
      {!loading && error && !data && <ErrorState compact message={error} onRetry={reload} />}
      {!loading && data && top.length === 0 && <div className="muted">No comments yet. Start the conversation.</div>}

      {top.map((c) => (
        <CommentItem key={c._id} comment={c} byParent={byParent} onAdd={add} />
      ))}
    </div>
  );
}
