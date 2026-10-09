const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const initSocket = require("./socket");

const PORT = process.env.PORT || 5000;
process.on("unhandledRejection", (err) => console.error("Unhandled rejection:", err?.message || err));
process.on("uncaughtException", (err) => console.error("Uncaught exception:", err?.message || err));

(async () => {
  try {
    await connectDB();
    const server = http.createServer(app);
    app.set("io", initSocket(server)); // routes use it to push live updates
    server.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
})();
