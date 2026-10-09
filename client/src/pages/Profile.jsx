import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { errMsg } from "../api";
import Avatar from "../components/Avatar";
import ThoughtFeed from "../components/ThoughtFeed";
import ErrorState from "../components/ErrorState";
import { Skel } from "../components/Skeleton";
import FollowListModal from "../components/FollowListModal";
import EditProfileModal from "../components/EditProfileModal";
import { useAuth } from "../context/AuthContext";
import { useQuery } from "../lib/query";
import { useThoughts } from "../lib/useThoughts";

function ProfileSkeleton() {
  return (
    <>
      <div className="cover" />
      <div className="profile-top">
        <div className="profile-row">
          <div className="profile-avatar">
            <Skel circle w={96} h={96} />
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          <Skel w="40%" h={20} />
          <Skel w="24%" h={13} />
          <Skel w="70%" h={13} />
        </div>
      </div>
    </>
  );
}

export default function Profile() {
  const { username } = useParams();
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const [modal, setModal] = useState(null); // "followers" | "following" | "edit" | null
  const [actionError, setActionError] = useState("");

  // The profile and the user's thoughts load at the same time (not one after the other)
  const prof = useQuery(`profile:${username}`, () => api.get(`/users/${username}`).then((res) => res.data));
  const feed = useThoughts("/thoughts", { username });

  const profile = prof.data?.user;
  const stats = prof.data?.stats || { thoughtsCount: 0, followersCount: 0, followingCount: 0 };
  const rel = prof.data?.relationship || { iFollowThem: false, theyFollowMe: false, mutual: false };
  const isMe = profile && profile._id === me._id;

  const toggleFollow = async () => {
    setActionError("");
    const was = rel.iFollowThem;
    // instant update, then confirm with the server
    prof.mutate((p) => ({
      ...p,
      relationship: { ...p.relationship, iFollowThem: !was, mutual: !was && p.relationship.theyFollowMe },
      stats: { ...p.stats, followersCount: p.stats.followersCount + (was ? -1 : 1) },
    }));
    try {
      const res = was ? await api.delete(`/follows/${profile._id}`) : await api.post(`/follows/${profile._id}`);
      prof.mutate((p) => ({ ...p, relationship: res.data }));
    } catch (err) {
      prof.reload();
      setActionError(errMsg(err));
    }
  };

  if (prof.loading) return <div className="page"><ProfileSkeleton /></div>;
  if (!profile) {
    return (
      <div className="page">
        <ErrorState message={prof.error || "User not found"} onRetry={prof.reload} />
      </div>
    );
  }

  return (
    <div className="page">
      <div
        className="cover"
        style={profile.coverImage ? { backgroundImage: `url(${profile.coverImage})` } : undefined}
      />
      <div className="profile-top">
        <div className="profile-row">
          <div className="profile-avatar">
            <Avatar user={profile} size={96} />
          </div>
          <div className="profile-actions">
            {isMe ? (
              <button className="btn" onClick={() => setModal("edit")}>
                Edit Profile
              </button>
            ) : (
              <>
                {rel.mutual && (
                  <button className="btn" onClick={() => navigate("/messages", { state: { userId: profile._id } })}>
                    Message
                  </button>
                )}
                <button className={"btn" + (rel.iFollowThem ? " btn-following" : " btn-primary")} onClick={toggleFollow}>
                  {rel.iFollowThem ? "Following" : "Follow"}
                </button>
              </>
            )}
          </div>
        </div>

        <h1 className="profile-name">{profile.fullName}</h1>
        <div className="muted">@{profile.username}</div>
        {profile.bio && <p className="profile-bio">{profile.bio}</p>}
        {actionError && <div className="form-error">{actionError}</div>}

        <div className="stats">
          <span className="stat">
            <b>{stats.thoughtsCount}</b> Thoughts
          </span>
          <button className="stat" onClick={() => setModal("followers")}>
            <b>{stats.followersCount}</b> Followers
          </button>
          <button className="stat" onClick={() => setModal("following")}>
            <b>{stats.followingCount}</b> Following
          </button>
        </div>
      </div>

      <div className="section-title">Thoughts</div>
      <ThoughtFeed
        feed={feed}
        emptyTitle="No thoughts yet"
        emptyText={isMe ? "Share your first thought on the Home page." : ""}
        onRemoved={() =>
          prof.mutate((p) => ({ ...p, stats: { ...p.stats, thoughtsCount: Math.max(0, p.stats.thoughtsCount - 1) } }))
        }
      />

      {(modal === "followers" || modal === "following") && (
        <FollowListModal userId={profile._id} kind={modal} onClose={() => setModal(null)} onChanged={prof.reload} />
      )}
      {modal === "edit" && (
        <EditProfileModal
          onClose={() => setModal(null)}
          onSaved={(u) => prof.mutate((p) => ({ ...p, user: { ...p.user, ...u } }))}
        />
      )}
    </div>
  );
}
