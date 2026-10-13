import { useNavigate } from "react-router-dom";
import api from "../api";
import Avatar from "../components/Avatar";
import ErrorState from "../components/ErrorState";
import { UserRowSkeletons } from "../components/Skeleton";
import { formatDate } from "../components/format";
import {
  useNotifications,
  markReadLocal,
  markAllReadLocal,
  resetUnread,
} from "../lib/notifications";

function textFor(n) {
  switch (n.type) {
    case "like":
      return "liked your thought";
    case "comment":
      return "commented on your thought";
    case "reply":
      return "replied to your comment";
    case "follow":
      return "started following you";
    default:
      return "sent you a notification";
  }
}

export default function Notifications() {
  const navigate = useNavigate();
  const { data, loading, error, reload, mutate } = useNotifications();
  const list = data || [];
  const unread = list.filter((n) => !n.read).length;

  const openOne = async (n) => {
    // Optimistic UI: mark read locally + decrement badge
    if (!n.read) {
      mutate((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      markReadLocal(n._id);
      try {
        await api.patch(`/notifications/${n._id}/read`);
      } catch {
        /* ignore — will fix on next refresh */
      }
    }
    if (n.type === "follow") {
      navigate(`/profile/${n.actor.username}`);
    } else if (n.thought) {
      navigate(`/`);
    }
  };

  const markAll = async () => {
    mutate((prev) => prev.map((x) => ({ ...x, read: true })));
    markAllReadLocal();
    try {
      await api.patch("/notifications/read-all");
    } catch {
      /* ignore */
    }
  };

  if (loading) return <div className="page"><UserRowSkeletons count={5} /></div>;
  if (error && !data) return <div className="page"><ErrorState message={error} onRetry={reload} /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Notifications</h1>
            <p>What's happened while you were away.</p>
          </div>
          {unread > 0 && (
            <button className="btn btn-sm" onClick={markAll}>
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="empty">
          <div className="empty-title">No notifications yet</div>
          <div>When someone likes, comments, or follows you, it'll show up here.</div>
        </div>
      ) : (
        list.map((n) => (
          <button
            key={n._id}
            className={"notif-row" + (n.read ? "" : " unread")}
            onClick={() => openOne(n)}
          >
            <Avatar user={n.actor} size={40} />
            <div className="notif-main">
              <div className="notif-text">
                <strong>{n.actor.fullName}</strong>{" "}
                <span className="muted">@{n.actor.username}</span> {textFor(n)}
              </div>
              {n.thought?.content && (
                <div className="notif-quote">{n.thought.content.slice(0, 120)}</div>
              )}
              {n.comment?.content && (
                <div className="notif-quote">{n.comment.content.slice(0, 120)}</div>
              )}
              <div className="thought-meta">{formatDate(n.createdAt)}</div>
            </div>
            {!n.read && <span className="notif-dot" />}
          </button>
        ))
      )}
    </div>
  );
}