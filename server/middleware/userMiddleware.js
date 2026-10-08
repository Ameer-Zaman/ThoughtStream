const getUserFromSession = require("../utils/getUserFromSession");

const authMiddleware = async (req, res, next) => {
  try {
    const sessionToken = req.cookies.session;

    if (!sessionToken) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const user = await getUserFromSession(sessionToken);

    if (!user) {
      return res.status(401).json({
        message: "Invalid or expired session",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

module.exports = authMiddleware;