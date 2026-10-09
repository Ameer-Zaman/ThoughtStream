const Session = require("../models/Session");
const User = require("../models/User");
const { hashToken } = require("./session");

// Every protected request used to cost two database round trips (Session, then User).
// This looks both up in ONE query and remembers the result for a short time.
const TTL = 30 * 1000;
const MAX_ENTRIES = 1000;
const cache = new Map(); // tokenHash -> { user, expiresAt, cachedAt }

async function getAuth(token) {
  const hash = hashToken(token);
  const now = Date.now();

  const hit = cache.get(hash);
  if (hit && now - hit.cachedAt < TTL && hit.expiresAt > now) return hit.user;
  cache.delete(hash);

  const [row] = await Session.aggregate([
    { $match: { sessionTokenHash: hash, expiresAt: { $gt: new Date() } } },
    { $lookup: { from: User.collection.name, localField: "userId", foreignField: "_id", as: "user" } },
    { $unwind: "$user" },
    {
      $project: {
        expiresAt: 1,
        user: {
          _id: 1, fullName: 1, username: 1, email: 1, role: 1, isActive: 1,
          profilePicture: 1, coverImage: 1, bio: 1, createdAt: 1,
        },
      },
    },
  ]);

  if (!row || !row.user || !row.user.isActive) return null;

  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value);
  cache.set(hash, { user: row.user, expiresAt: new Date(row.expiresAt).getTime(), cachedAt: now });
  return row.user;
}

function invalidateToken(token) {
  cache.delete(hashToken(token));
}

function invalidateUser(userId) {
  const id = String(userId);
  for (const [key, value] of cache) {
    if (String(value.user._id) === id) cache.delete(key);
  }
}

module.exports = { getAuth, invalidateToken, invalidateUser };
