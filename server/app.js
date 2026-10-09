require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);

const origins = (process.env.FRONTEND_URL || "http://localhost:5173").split(",").map((s) => s.trim());
// maxAge lets the browser cache the CORS preflight so it isn't repeated before every request
app.use(cors({ origin: origins, credentials: true, maxAge: 86400 }));

// Logs slow requests (over 400ms) so you can see which endpoint is slow.
// Set LOG_REQUESTS=1 in .env to log every request.
app.use((req, res, next) => {
  const start = Date.now();

  // If a request is still unanswered after 12s the database is hanging. Say so clearly (here and to the browser).
  const hungTimer = setTimeout(() => {
    if (res.headersSent) return;
    console.warn(`HUNG: ${req.method} ${req.originalUrl} has waited 12s for the database`);
    res.status(503).json({ message: "The database is not responding. Please try again." });
  }, 12000);
  res.on("close", () => clearTimeout(hungTimer));

  res.on("finish", () => {
    const ms = Date.now() - start;
    if (ms > 400 || process.env.LOG_REQUESTS === "1") {
      console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} in ${ms}ms`);
    }
  });
  next();
});
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/api/health", (req, res) => res.json({ ok: true }));

// Open http://localhost:5000/api/health/db in your browser to measure how fast Atlas answers.
app.get("/api/health/db", async (req, res) => {
  const mongoose = require("mongoose");
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  const out = { state: states[mongoose.connection.readyState], host: mongoose.connection.host, pingsMs: [] };
  try {
    for (let i = 0; i < 3; i += 1) {
      const t = Date.now();
      await mongoose.connection.db.admin().ping();
      out.pingsMs.push(Date.now() - t);
    }
    const t = Date.now();
    out.users = await require("./models/User").countDocuments();
    out.countMs = Date.now() - t;
    res.json(out);
  } catch (err) {
    out.error = err.message;
    res.status(500).json(out);
  }
});

app.use("/api/users", require("./routes/users"));
app.use("/api/follows", require("./routes/follows"));
app.use("/api/thoughts", require("./routes/thoughts"));
app.use("/api/likes", require("./routes/likes"));
app.use("/api/comments", require("./routes/comments"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/search", require("./routes/search"));

app.use((req, res) => res.status(404).json({ message: "Not found" }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 11000) return res.status(409).json({ message: "Already exists" });
  if (err.name === "CastError") return res.status(400).json({ message: "Invalid id" });
  if (err.name === "ValidationError") return res.status(400).json({ message: err.message });
  res.status(500).json({ message: "Server error" });
});

module.exports = app;
