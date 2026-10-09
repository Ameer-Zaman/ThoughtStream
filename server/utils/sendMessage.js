const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { areMutual } = require("./follow");

// Shared by the Socket.IO "sendMessage" event and the REST fallback (POST /api/messages/conversations/:id/messages)
async function sendMessage(io, meId, conversationId, rawContent) {
  const content = String(rawContent || "").trim();
  if (!conversationId || !content) return { ok: false, status: 400, error: "Message can't be empty" };
  if (content.length > 2000) return { ok: false, status: 400, error: "Message is too long (max 2000)" };

  const conv = await Conversation.findById(conversationId).lean();
  if (!conv || !conv.participants.some((p) => String(p) === String(meId))) {
    return { ok: false, status: 404, error: "Conversation not found" };
  }
  const otherId = String(conv.participants.find((p) => String(p) !== String(meId)));
  if (!(await areMutual(meId, otherId))) {
    return { ok: false, status: 403, error: "You can only message people who follow you back" };
  }

  const message = await Message.create({ conversationId: conv._id, senderId: meId, content });
  await Conversation.updateOne({ _id: conv._id }, { lastMessage: message._id, lastMessageAt: message.createdAt });

  const data = { conversationId: String(conv._id), message: message.toObject() };
  if (io) io.to(String(meId)).to(otherId).emit("newMessage", data);
  return { ok: true, message: data.message };
}

module.exports = sendMessage;
