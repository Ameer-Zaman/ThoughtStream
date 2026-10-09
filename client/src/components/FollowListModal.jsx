import { Link } from "react-router-dom";
import api from "../api";
import Avatar from "./Avatar";
import Icon from "./Icon";
import ErrorState from "./ErrorState";
import { UserRowSkeletons } from "./Skeleton";
import { useAuth } from "../context/AuthContext";
import { useQuery } from "../lib/query";
import { errMsg } from "../api";
import { useState } from "react";

// kind: "followers" | "following"
export default function FollowListModal({ userId, kind, onClose, onChanged }) {
  const { user: me } = useAuth();
  const [actionError, setActionError] = useState("");

  const { data, loading, error, reload, mutate } = useQuery(`follows:${userId}:${kind}`, () =>
    api.get(`/follows/${userId}/${kind}`).then((res) => res.data.users)
  );
  const users = data || [];

  const toggle = async (u) => {
    setActionError("");
    mutate((prev) => prev.map((x) => (x._id === u._id ? { ...x, iFollow: !x.iFollow } : x)));
    try {
      if (u.iFollow) await api.delete(`/follows/${u._id}`);
      else await api.post(`/follows/${u._id}`);
      onChanged?.();
    } catch (err) {
      mutate((prev) => prev.map((x) => (x._id === u._id ? { ...x, iFollow: u.iFollow } : x)));
      setActionError(errMsg(err));
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{kind === "followers" ? "Followers" : "Following"}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <div className="modal-body">
          {actionError && <div className="form-error">{actionError}</div>}
          {loading && <UserRowSkeletons />}
          {!loading && error && !data && <ErrorState compact message={error} onRetry={reload} />}
          {!loading && data && users.length === 0 && <div className="muted">Nobody here yet.</div>}
          {users.map((u) => (
            <div className="user-row" key={u._id}>
              <Link to={`/profile/${u.username}`} onClick={onClose}>
                <Avatar user={u} size={40} />
              </Link>
              <div className="grow">
                <Link to={`/profile/${u.username}`} onClick={onClose} className="name">
                  {u.fullName}
                </Link>
                <div className="thought-meta">@{u.username}</div>
              </div>
              {u._id !== me._id && (
                <button
                  className={"btn btn-sm" + (u.iFollow ? " btn-following" : " btn-primary")}
                  onClick={() => toggle(u)}
                >
                  {u.iFollow ? "Following" : "Follow"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
