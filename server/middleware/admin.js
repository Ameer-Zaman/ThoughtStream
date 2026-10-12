// Use after requireAuth. Lets only users with role "admin" through.
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ message: "Admins only" });
  next();
}

module.exports = { requireAdmin };
