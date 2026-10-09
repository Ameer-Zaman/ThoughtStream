const crypto = require("crypto");

const Session = require("../models/Session");
const User = require("../models/User");

// ---------------------------------------------------------
// Takes a raw session token string.
// Returns the User document, or null if invalid/expired.
// Throws only on unexpected DB errors.
// ---------------------------------------------------------
const getUserFromSession = async (sessionToken) => {
  if (!sessionToken) {
    return null;
  }

  const sessionTokenHash = crypto
    .createHash("sha256")
    .update(sessionToken)
    .digest("hex");

  const session = await Session.findOne({ sessionTokenHash });

  if (!session) {
    return null;
  }

  if (session.expiresAt < new Date()) {
    await Session.deleteOne({ _id: session._id });
    return null;
  }

  const user = await User.findById(session.userId);

  if (!user) {
    return null;
  }

  if (!user.isActive) {
    return null;
  }

  return user;
};

module.exports = getUserFromSession;