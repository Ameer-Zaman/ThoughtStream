const { Server } = require("socket.io");
const cookie = require("cookie");
const { getAuth } = require("./utils/authCache");
const sendMessage = require("./utils/sendMessage");

function initSocket(httpServer) {
  const origins = (process.env.FRONTEND_URL || "http://localhost:5173").split(",").map((s) => s.trim());
  const io = new Server(httpServer, {
    cors: { origin: origins, credentials: true },
  });

  // Auth: same session cookie as the REST API
  io.use(async (socket, next) => {
    try {
      const cookies = cookie.parse(socket.handshake.headers.cookie || "");
      const token = cookies.session;
      if (!token) return next(new Error("Unauthorized"));

      const user = await getAuth(token);
      if (!user) return next(new Error("Unauthorized"));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const myId = String(socket.user._id);
    socket.join(myId); // personal room

    socket.on("sendMessage", async (payload, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      try {
        const result = await sendMessage(io, myId, payload && payload.conversationId, payload && payload.content);
        reply(result.ok ? { ok: true, message: result.message } : { ok: false, error: result.error });
      } catch (err) {
        console.error("sendMessage error:", err);
        reply({ ok: false, error: "Could not send message" });
      }
    });
  });

  return io;
}

module.exports = initSocket;