import { useEffect, useState } from "react";
import api, { errMsg } from "../api";
import Avatar from "../components/Avatar";
import ErrorState from "../components/ErrorState";
import { UserRowSkeletons } from "../components/Skeleton";
import { formatDate } from "../components/format";
import { useAuth } from "../context/AuthContext";
import { setQueryData, useQuery } from "../lib/query";

const TABS = ["Overview", "Users", "Thoughts"];

// Waits a moment after typing stops, so we don't search on every keystroke
function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function Overview() {
  const { data, loading, error, reload } = useQuery("admin:stats", () => api.get("/admin/stats").then((r) => r.data));
  if (loading) return <UserRowSkeletons count={4} />;
  if (error && !data) return <ErrorState compact message={error} onRetry={reload} />;
  const cards = [
    ["Users", data.users, `${data.newUsers} new this week`],
    ["Thoughts", data.thoughts, `${data.newThoughts} new this week`],
    ["Polls", data.polls, "thoughts with a poll"],
    ["Comments", data.comments, ""],
    ["Likes", data.likes, ""],
    ["Messages", data.messages, ""],
    ["Hidden thoughts", data.hiddenThoughts, "removed from feeds"],
    ["Disabled users", data.disabledUsers, "can't log in"],
  ];
  return (
    <div className="stat-grid">
      {cards.map(([label, value, sub]) => (
        <div className="stat-card" key={label}>
          <div className="stat-label">{label}</div>
          <div className="stat-value">{value}</div>
          {sub && <div className="stat-sub">{sub}</div>}
        </div>
      ))}
    </div>
  );
}

function Users() {
  const { user: me } = useAuth();
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const key = "admin:users:" + dq;
  const { data, loading, error, reload } = useQuery(key, () =>
    api.get("/admin/users", { params: { q: dq } }).then((r) => r.data.users)
  );
  const [msg, setMsg] = useState("");

  const change = async (u, body) => {
    setMsg("");
    try {
      const res = await api.patch(`/admin/users/${u._id}`, body);
      setQueryData(key, (prev) => (prev ? prev.map((x) => (x._id === u._id ? res.data.user : x)) : prev));
    } catch (err) {
      setMsg(errMsg(err, "Could not update"));
    }
  };

  return (
    <>
      <div className="admin-search">
        <input placeholder="Search name, username or email…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {msg && <div className="form-error" style={{ margin: "0 22px" }}>{msg}</div>}
      {loading && !data && <div style={{ padding: "0 22px" }}><UserRowSkeletons count={5} /></div>}
      {error && !data && <ErrorState compact message={error} onRetry={reload} />}
      {data && data.length === 0 && <div className="empty">No users found.</div>}
      {(data || []).map((u) => (
        <div className="admin-row" key={u._id}>
          <Avatar user={u} size={40} />
          <div className="admin-info">
            <div className="name">
              {u.fullName}
              {u.role === "admin" && <span className="badge">admin</span>}
              {!u.isActive && <span className="badge badge-off">disabled</span>}
            </div>
            <div className="thought-meta">@{u.username} · {u.email} · joined {formatDate(u.createdAt)}</div>
          </div>
          {u._id !== me._id && (
            <div className="admin-actions">
              <button className="btn btn-sm" onClick={() => change(u, { role: u.role === "admin" ? "user" : "admin" })}>
                {u.role === "admin" ? "Remove admin" : "Make admin"}
              </button>
              <button
                className={"btn btn-sm" + (u.isActive ? " btn-danger" : "")}
                onClick={() => {
                  if (u.isActive && !window.confirm(`Disable @${u.username}? They will be logged out.`)) return;
                  change(u, { isActive: !u.isActive });
                }}
              >
                {u.isActive ? "Disable" : "Enable"}
              </button>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

function Thoughts() {
  const [q, setQ] = useState("");
  const [hiddenOnly, setHiddenOnly] = useState(false);
  const dq = useDebounced(q);
  const key = `admin:thoughts:${dq}:${hiddenOnly}`;
  const { data, loading, error, reload } = useQuery(key, () =>
    api.get("/admin/thoughts", { params: { q: dq, status: hiddenOnly ? "hidden" : "" } }).then((r) => r.data.thoughts)
  );
  const [msg, setMsg] = useState("");

  const setStatus = async (t, moderationStatus) => {
    setMsg("");
    try {
      await api.patch(`/admin/thoughts/${t._id}`, { moderationStatus });
      setQueryData(key, (prev) => (prev ? prev.map((x) => (x._id === t._id ? { ...x, moderationStatus } : x)) : prev));
    } catch (err) {
      setMsg(errMsg(err, "Could not update"));
    }
  };

  const remove = async (t) => {
    if (!window.confirm("Delete this thought for good?")) return;
    setMsg("");
    try {
      await api.delete(`/admin/thoughts/${t._id}`);
      setQueryData(key, (prev) => (prev ? prev.filter((x) => x._id !== t._id) : prev));
    } catch (err) {
      setMsg(errMsg(err, "Could not delete"));
    }
  };

  return (
    <>
      <div className="admin-search">
        <input placeholder="Search thoughts…" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="admin-check">
          <input type="checkbox" checked={hiddenOnly} onChange={(e) => setHiddenOnly(e.target.checked)} /> Hidden only
        </label>
      </div>
      {msg && <div className="form-error" style={{ margin: "0 22px" }}>{msg}</div>}
      {loading && !data && <div style={{ padding: "0 22px" }}><UserRowSkeletons count={5} /></div>}
      {error && !data && <ErrorState compact message={error} onRetry={reload} />}
      {data && data.length === 0 && <div className="empty">No thoughts found.</div>}
      {(data || []).map((t) => (
        <div className={"admin-row" + (t.moderationStatus === "hidden" ? " is-hidden" : "")} key={t._id}>
          <div className="admin-info">
            <div className="admin-content">{t.content}</div>
            <div className="thought-meta">
              @{t.author.username} · {formatDate(t.createdAt)}
              {t.isPoll && <span className="badge">poll</span>}
              {t.moderationStatus === "hidden" && <span className="badge badge-off">hidden</span>}
            </div>
          </div>
          <div className="admin-actions">
            <button className="btn btn-sm" onClick={() => setStatus(t, t.moderationStatus === "hidden" ? "visible" : "hidden")}>
              {t.moderationStatus === "hidden" ? "Show" : "Hide"}
            </button>
            <button className="btn btn-sm btn-danger" onClick={() => remove(t)}>Delete</button>
          </div>
        </div>
      ))}
    </>
  );
}

export default function Admin() {
  const [tab, setTab] = useState("Overview");
  return (
    <div className="page">
      <div className="page-header">
        <h1>Admin</h1>
        <p>Manage users and keep the community healthy.</p>
      </div>
      <div className="tabs admin-tabs">
        {TABS.map((t) => (
          <button key={t} className={"tab" + (tab === t ? " active" : "")} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {tab === "Overview" && <Overview />}
      {tab === "Users" && <Users />}
      {tab === "Thoughts" && <Thoughts />}
    </div>
  );
}
