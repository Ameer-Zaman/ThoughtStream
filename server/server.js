const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const initSocket = require("./socket");

const PORT = process.env.PORT || 5000;

// Without these, one unexpected error (for example a dropped database connection) kills the whole server,
// and `node --watch` then waits for a file change before starting it again. Log it and keep running instead.
process.on("unhandledRejection", (err) => console.error("Unhandled rejection:", err?.message || err));
process.on("uncaughtException", (err) => console.error("Uncaught exception:", err?.message || err));

(async () => {
  try {
    await connectDB();

    // Make the people listed in ADMIN_EMAILS admins (this is how you create the first admin)
    const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (adminEmails.length) {
      const r = await require("./models/User").updateMany({ email: { $in: adminEmails } }, { role: "admin" });
      console.log(`ADMIN_EMAILS: ${r.modifiedCount} account(s) promoted to admin`);
    }

    const server = http.createServer(app);
    app.set("io", initSocket(server)); // routes use it to push live updates
    server.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
})();
