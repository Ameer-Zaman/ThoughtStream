const AUTHOR_FIELDS = "fullName username profilePicture";

function toUser(u, { withEmail = false } = {}) {
  const out = {
    _id: u._id,
    fullName: u.fullName,
    username: u.username,
    role: u.role,
    profilePicture: u.profilePicture || "",
    coverImage: u.coverImage || "",
    bio: u.bio || "",
    createdAt: u.createdAt,
  };
  if (withEmail) out.email = u.email;
  return out;
}

function extractHashtags(text) {
  const matches = text.match(/#(\w+)/g) || [];
  return [...new Set(matches.map((h) => h.slice(1).toLowerCase()))];
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = { AUTHOR_FIELDS, toUser, extractHashtags, escapeRegex };
