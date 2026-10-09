const cookie = require("cookie");

const getUserFromSession = require("../utils/getUserFromSession");

const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Follow = require("../models/Follow");

// ---------------------------------------------------------
// Socket.IO auth middleware
// ---------------------------------------------------------
const socketAuth = async (socket, next) => {
  try {
    const rawCookie = socket.handshake.headers.cookie;

    if (!rawCookie) {
      return next(new Error("Authentication required"));
    }

    const parsed = cookie.parse(rawCookie);
    const sessionToken = parsed.session;

    if (!sessionToken) {
      return next(new Error("Authentication required"));
    }

    const user = await getUserFromSession(sessionToken);

    if (!user) {
      return next(new Error("Invalid or expired session"));
    }

    socket.user = user;

    next();
  } catch (error) {
    console.error("socketAuth error:", error);
    next(new Error("Internal Server Error"));
  }
};

// ---------------------------------------------------------
// Helper: check mutual follow
// ---------------------------------------------------------
const areMutualFollowers = async (userIdA, userIdB) => {
  const [aFollowsB, bFollowsA] = await Promise.all([
    Follow.findOne({ follower: userIdA, following: userIdB }),
    Follow.findOne({ follower: userIdB, following: userIdA }),
  ]);

  return Boolean(aFollowsB && bFollowsA);
};

// ---------------------------------------------------------
// Register all socket event handlers
// ---------------------------------------------------------
const registerSocketHandlers = (io) => {
  io.use(socketAuth);

  io.on("connection", (socket) => {
    socket.join(String(socket.user._id));

    // ---------------------------------------------------
    // sendMessage
    // Payload: { conversationId, content }
    // ---------------------------------------------------
    socket.on("sendMessage", async (payload, ack) => {
      try {
        const { conversationId, content } = payload || {};

        if (!conversationId || !content || !content.trim()) {
          return ack?.({ ok: false, error: "Invalid message payload" });
        }

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
          return ack?.({ ok: false, error: "Conversation not found" });
        }

        const myId = String(socket.user._id);

        const isParticipant = conversation.participants.some(
          (id) => String(id) === myId
        );

        if (!isParticipant) {
          return ack?.({ ok: false, error: "Not a participant" });
        }

        const otherUserId = conversation.participants
          .map((id) => String(id))
          .find((id) => id !== myId);

        const mutual = await areMutualFollowers(myId, otherUserId);

        if (!mutual) {
          return ack?.({
            ok: false,
            error: "You can only message users who mutually follow you",
          });
        }

        const message = await Message.create({
          conversationId,
          senderId: socket.user._id,
          content: content.trim(),
        });

        conversation.lastMessage = message._id;
        conversation.lastMessageAt = message.createdAt;
        await conversation.save();

        const populated = await message.populate({
          path: "senderId",
          select: "fullName username profilePicture",
        });

        // Emit to both participants' personal rooms
        io.to(myId).to(otherUserId).emit("newMessage", {
          conversationId,
          message: populated,
        });

        return ack?.({ ok: true, message: populated });
      } catch (error) {
        console.error("sendMessage error:", error);
        return ack?.({ ok: false, error: "Internal Server Error" });
      }
    });

    socket.on("disconnect", () => {
      // Silent — no log needed unless debugging
    });
  });
};

module.exports = registerSocketHandlers;