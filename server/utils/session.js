const crypto = require("crypto");
const Session = require("../models/Session");

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const isProd = () => process.env.NODE_ENV === "production";

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// Production (frontend and backend on different domains): secure + sameSite none.
// Development (localhost): not secure + sameSite lax.
const baseCookieOptions = () => ({
  httpOnly: true,
  secure: isProd(),
  sameSite: isProd() ? "none" : "lax",
  path: "/",
});

async function createSession(res, userId) {
  const token = crypto.randomBytes(32).toString("hex");
  await Session.create({
    userId,
    sessionTokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + SEVEN_DAYS),
  });
  res.cookie("session", token, { ...baseCookieOptions(), maxAge: SEVEN_DAYS });
}

function clearSessionCookie(res) {
  res.clearCookie("session", baseCookieOptions());
}

module.exports = { hashToken, createSession, clearSessionCookie };
