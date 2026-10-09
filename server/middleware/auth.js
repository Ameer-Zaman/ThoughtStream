const { getAuth } = require("../utils/authCache");

// Reads the "session" cookie, hashes it, finds the Session and its User (see utils/authCache.js).
async function requireAuth(req, res, next) {
  try {
    const token = req.cookies && req.cookies.session;
    if (!token) return res.status(401).json({ message: "Not authenticated" });

    const user = await getAuth(token);
    if (!user) return res.status(401).json({ message: "Not authenticated" });

    req.user = user; // plain object (not a Mongoose document)
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth };
