import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import Navbar from "../components/Navbar";

import "./Profile.css";
import "./Home.css";

const API = "http://localhost:5000/api";

function Profile() {
  const { username } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [thoughts, setThoughts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isOwner, setIsOwner] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [myFollowing, setMyFollowing] = useState([]);
  const [myUserId, setMyUserId] = useState(null);

  const [canMessage, setCanMessage] = useState(false);
  const [likeCounts, setLikeCounts] = useState({});
  const [commentCounts, setCommentCounts] = useState({});
  const [openMenuId, setOpenMenuId] = useState(null);

  // Edit thought states
  const [editingThoughtId, setEditingThoughtId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    bio: "",
    profilePicture: "",
    coverImage: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError("");

        const [profileResponse, thoughtsResponse, meResponse] =
          await Promise.all([
            fetch(`${API}/users/${encodeURIComponent(username)}`, {
              credentials: "include",
            }),

            fetch(`${API}/thoughts`, {
              credentials: "include",
            }),

            fetch(`${API}/users/me`, {
              credentials: "include",
            }),
          ]);

        const profileData = await profileResponse.json();
        const thoughtsData = await thoughtsResponse.json();
        const meData = await meResponse.json();

        if (meResponse.ok) {
          setMyUserId(meData.user?._id);

          const followingResponse = await fetch(
            `${API}/users/following/${meData.user._id}`,
            {
              credentials: "include",
            }
          );

          const followingData = await followingResponse.json();

          if (followingResponse.ok) {
            setMyFollowing(followingData.following || []);

            if (meData.user?._id !== profileData.user?._id) {
              const isUserFollowing = (
                followingData.following || []
              ).some(
                (follow) =>
                  follow.following?._id === profileData.user?._id
              );

              setIsFollowing(isUserFollowing);

              const statusResponse = await fetch(
                `${API}/follows/status/${profileData.user._id}`,
                { credentials: "include" }
              );

              if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                setCanMessage(Boolean(statusData.mutual));
              } else {
                setCanMessage(false);
              }
            } else {
              setIsFollowing(false);
              setCanMessage(false);
            }
          } else {
            setMyFollowing([]);
            setIsFollowing(false);
            setCanMessage(false);
          }
        } else {
          setMyUserId(null);
          setMyFollowing([]);
          setIsFollowing(false);
          setCanMessage(false);
        }

        if (!profileResponse.ok) {
          throw new Error(
            profileData.message || "Failed to load profile"
          );
        }

        if (!thoughtsResponse.ok) {
          throw new Error(
            thoughtsData.message || "Failed to load thoughts"
          );
        }

        setUser({
          ...profileData.user,
          followersCount: profileData.followersCount ?? 0,
          followingCount: profileData.followingCount ?? 0,
        });

        const userThoughts = (thoughtsData.thoughts || []).filter(
          (thought) =>
            thought.authorId?.username?.toLowerCase() ===
            profileData.user.username?.toLowerCase()
        );

        setThoughts(userThoughts);

        const likesMap = {};
        const commentsMap = {};

        await Promise.all(
          userThoughts.map(async (thought) => {
            try {
              const [likesRes, commentsRes] = await Promise.all([
                fetch(`${API}/likes/${thought._id}`, {
                  credentials: "include",
                }),
                fetch(`${API}/comments/thoughts/${thought._id}`, {
                  credentials: "include",
                }),
              ]);

              if (likesRes.ok) {
                const likesData = await likesRes.json();
                likesMap[thought._id] = likesData.likeCount || 0;
              }

              if (commentsRes.ok) {
                const commentsData = await commentsRes.json();
                commentsMap[thought._id] = (
                  commentsData.comments || []
                ).length;
              }
            } catch (error) {
              console.error(
                "Failed to load counts for thought:",
                thought._id,
                error
              );
            }
          })
        );

        setLikeCounts(likesMap);
        setCommentCounts(commentsMap);

        const loggedInUsername =
          meResponse.ok && typeof meData.user?.username === "string"
            ? meData.user.username
            : null;

        setIsOwner(
          typeof loggedInUsername === "string" &&
            typeof profileData.user?.username === "string" &&
            loggedInUsername.toLowerCase() ===
              profileData.user.username.toLowerCase()
        );

        setFormData({
          fullName: profileData.user.fullName || "",
          bio: profileData.user.bio || "",
          profilePicture: profileData.user.profilePicture || "",
          coverImage: profileData.user.coverImage || "",
        });
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchProfile();
    }
  }, [username]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleCancel = () => {
    setFormData({
      fullName: user.fullName || "",
      bio: user.bio || "",
      profilePicture: user.profilePicture || "",
      coverImage: user.coverImage || "",
    });

    setSaveError("");
    setIsEditing(false);
  };

  const handleSave = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setSaveError("");

      const response = await fetch(`${API}/users/profile`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update profile");
      }

      setUser((previous) => ({
        ...previous,
        ...data.user,
      }));

      setIsEditing(false);
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFollowToggle = async () => {
    const url = isFollowing
      ? `${API}/users/unfollow/${user._id}`
      : `${API}/users/follow/${user._id}`;

    const method = isFollowing ? "DELETE" : "POST";

    const response = await fetch(url, {
      method,
      credentials: "include",
    });

    if (response.ok) {
      setIsFollowing(!isFollowing);

      setUser((previous) => ({
        ...previous,
        followersCount: isFollowing
          ? Math.max(0, (previous.followersCount ?? 0) - 1)
          : (previous.followersCount ?? 0) + 1,
      }));

      if (isFollowing) {
        setMyFollowing((previous) =>
          previous.filter(
            (follow) => follow.following?._id !== user._id
          )
        );
      } else {
        setMyFollowing((previous) => [
          ...previous,
          {
            following: user,
          },
        ]);
      }
    }
  };

  const handleMessageClick = () => {
    navigate(`/messages?user=${user._id}`);
  };

  const handleDeleteThought = async (thoughtId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this thought?"
    );

    if (!confirmDelete) return;

    try {
      const response = await fetch(`${API}/thoughts/${thoughtId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete thought");
      }

      setThoughts((previous) =>
        previous.filter(
          (thought) => String(thought._id) !== String(thoughtId)
        )
      );
    } catch (error) {
      console.error("Failed to delete thought:", error);
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
      const response = await fetch(`${API}/thoughts/${thoughtId}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: editDraft }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update thought");
      }

      setThoughts((previous) =>
        previous.map((thought) =>
          String(thought._id) === String(thoughtId)
            ? { ...thought, content: data.thought.content, isEdited: true }
            : thought
        )
      );

      setEditingThoughtId(null);
      setEditDraft("");
    } catch (error) {
      setEditError(error.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const fetchFollowList = async (type) => {
    const response = await fetch(`${API}/users/${type}/${user._id}`, {
      credentials: "include",
    });

    const data = await response.json();

    if (response.ok) {
      if (type === "followers") {
        setFollowers(data.followers || []);
      } else {
        setFollowing(data.following || []);
      }
    }
  };

  const handlePopupFollowToggle = async (person) => {
    const isPersonFollowing = myFollowing.some(
      (follow) => follow.following?._id === person._id
    );

    const url = isPersonFollowing
      ? `${API}/users/unfollow/${person._id}`
      : `${API}/users/follow/${person._id}`;

    const method = isPersonFollowing ? "DELETE" : "POST";

    const response = await fetch(url, {
      method,
      credentials: "include",
    });

    if (response.ok) {
      if (isPersonFollowing) {
        setMyFollowing((previous) =>
          previous.filter(
            (follow) => follow.following?._id !== person._id
          )
        );
      } else {
        setMyFollowing((previous) => [
          ...previous,
          {
            following: person,
          },
        ]);
      }
    }
  };

  if (loading) {
    return (
      <div className="home-layout">
        <Navbar />

        <main className="profile-page">
          <div className="profile-message">Loading profile...</div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home-layout">
        <Navbar />

        <main className="profile-page">
          <div className="profile-message">{error}</div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="home-layout">
        <Navbar />

        <main className="profile-page">
          <div className="profile-message">User not found</div>
        </main>
      </div>
    );
  }

  return (
    <div className="home-layout">

      <Navbar />

      <main className="profile-page">

        <section className="profile-card">
          <div className="profile-cover">
            {user.coverImage && (
              <img src={user.coverImage} alt="Profile cover" />
            )}
          </div>

          <div className="profile-details">

            <div className="profile-avatar">
              {user.profilePicture ? (
                <img src={user.profilePicture} alt={user.fullName} />
              ) : (
                <span>
                  {user.fullName?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="profile-info">

              <div className="profile-heading">

                <div>
                  <h1>{user.fullName}</h1>

                  <p className="profile-username">@{user.username}</p>
                </div>

                {isOwner && !isEditing && (
                  <button
                    className="edit-profile-button"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Profile
                  </button>
                )}

                {!isOwner && (
                  <div className="profile-action-buttons">
                    <button
                      className="follow-button"
                      onClick={handleFollowToggle}
                    >
                      {isFollowing ? "Unfollow" : "Follow"}
                    </button>

                    {canMessage && (
                      <button
                        className="message-profile-button"
                        onClick={handleMessageClick}
                      >
                        Message
                      </button>
                    )}
                  </div>
                )}

              </div>

              {user.bio && <p className="profile-bio">{user.bio}</p>}

              <div className="profile-stats">

                <span>
                  <strong>{thoughts.length}</strong> Thoughts
                </span>

                <span
                  onClick={() => {
                    fetchFollowList("followers");
                    setShowFollowers(true);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <strong>{user.followersCount ?? 0}</strong> Followers
                </span>

                <span
                  onClick={() => {
                    fetchFollowList("following");
                    setShowFollowing(true);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <strong>{user.followingCount ?? 0}</strong> Following
                </span>

              </div>

            </div>
          </div>
        </section>

        {(showFollowers || showFollowing) && (
          <div
            className="profile-modal-overlay"
            onClick={() => {
              setShowFollowers(false);
              setShowFollowing(false);
            }}
          >
            <section
              className="edit-profile-card"
              onClick={(event) => event.stopPropagation()}
            >

              <div className="edit-profile-header">

                <h2>{showFollowers ? "Followers" : "Following"}</h2>

                <button
                  type="button"
                  className="close-edit-button"
                  onClick={() => {
                    setShowFollowers(false);
                    setShowFollowing(false);
                  }}
                >
                  ×
                </button>

              </div>

              {(showFollowers ? followers : following).map((item) => {
                const person = showFollowers ? item.follower : item.following;

                const isPersonFollowing = myFollowing.some(
                  (follow) => follow.following?._id === person?._id
                );

                return (
                  <div className="follow-user" key={item._id}>

                    <img
                      src={person.profilePicture || "/default-avatar.png"}
                      alt={person.fullName}
                    />

                    <div>
                      <strong>{person.fullName}</strong>
                      <span>@{person.username}</span>
                    </div>

                    {person._id !== myUserId && (
                      <button
                        className={
                          isPersonFollowing
                            ? "following-button"
                            : "follow-button"
                        }
                        onClick={() => handlePopupFollowToggle(person)}
                      >
                        {isPersonFollowing ? "Following" : "Follow"}
                      </button>
                    )}

                  </div>
                );
              })}

            </section>
          </div>
        )}

        {isEditing && (
          <div className="profile-modal-overlay" onClick={handleCancel}>
            <section
              className="edit-profile-card"
              onClick={(event) => event.stopPropagation()}
            >

              <div className="edit-profile-header">

                <h2>Edit Profile</h2>

                <button
                  type="button"
                  className="close-edit-button"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  ×
                </button>

              </div>

              <form onSubmit={handleSave}>

                <label htmlFor="fullName">Full Name</label>

                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleChange}
                  maxLength={100}
                  required
                />

                <label htmlFor="bio">Bio</label>

                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  maxLength={160}
                  rows={4}
                  placeholder="Write something about yourself..."
                />

                <span className="bio-character-count">
                  {formData.bio.length}/160
                </span>

                <label htmlFor="profilePicture">
                  Profile Picture URL
                </label>

                <input
                  id="profilePicture"
                  name="profilePicture"
                  type="url"
                  value={formData.profilePicture}
                  onChange={handleChange}
                  placeholder="https://example.com/profile.jpg"
                />

                <label htmlFor="coverImage">Cover Image URL</label>

                <input
                  id="coverImage"
                  name="coverImage"
                  type="url"
                  value={formData.coverImage}
                  onChange={handleChange}
                  placeholder="https://example.com/cover.jpg"
                />

                {saveError && (
                  <p className="profile-save-error">{saveError}</p>
                )}

                <div className="edit-profile-actions">

                  <button
                    type="button"
                    className="cancel-edit-button"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="save-profile-button"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>

                </div>

              </form>
            </section>
          </div>
        )}

        <section className="profile-thoughts">

          <h2>Thoughts</h2>

          {thoughts.length === 0 ? (
            <p className="no-thoughts">No thoughts shared yet.</p>
          ) : (
            thoughts.map((thought) => {
              const isEditingThisThought =
                editingThoughtId === thought._id;

              return (
                <article className="profile-thought" key={thought._id}>

                  <div className="profile-thought-header">
                    <div className="user-avatar profile-thought-avatar">
                      {user.profilePicture ? (
                        <img src={user.profilePicture} alt="" />
                      ) : (
                        (user.fullName || user.username || "U")
                          .charAt(0)
                          .toUpperCase()
                      )}
                    </div>

                    <div className="profile-thought-author">
                      <strong>{user.fullName || user.username}</strong>

                      <span>
                        @{user.username}
                        <span className="meta-dot">·</span>
                        {new Date(thought.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="thought-menu-wrapper profile-thought-menu">
                      <button
                        type="button"
                        className="thought-menu-button"
                        onClick={() =>
                          setOpenMenuId((previous) =>
                            previous === thought._id ? null : thought._id
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
                                  console.log("Report thought:", thought._id);
                                }}
                              >
                                Report
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  navigate(`/messages?user=${user._id}`);
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

                  {isEditingThisThought ? (
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
                    <p className="profile-thought-content">
                      {thought.content}
                    </p>
                  )}

                  <div className="profile-thought-stats">
                    <span className="profile-thought-stat">
                      <svg
                        className="profile-thought-stat-icon"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {likeCounts[thought._id] || 0}
                    </span>

                    <span className="profile-thought-stat">
                      <svg
                        className="profile-thought-stat-icon"
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
                      {commentCounts[thought._id] || 0}
                    </span>

                    {thought.isEdited && (
                      <span className="profile-thought-edited">
                        Edited
                      </span>
                    )}
                  </div>

                </article>
              );
            })
          )}

        </section>

      </main>
    </div>
  );
}

export default Profile;