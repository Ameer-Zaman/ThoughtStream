const Notification = require("../models/Notification");

// Create a notification unless the actor is the recipient.
// Returns the created notification (or null if skipped).
async function notify({ recipient, actor, type, thought = null, comment = null }) {
  if (String(recipient) === String(actor)) return null; // don't notify yourself

  try {
    const n = await Notification.findOneAndUpdate(
      { recipient, actor, type, thought },
      { $setOnInsert: { recipient, actor, type, thought, comment, read: false } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return n;
  } catch (err) {
    // Ignore duplicate-key races
    if (err.code === 11000) return null;
    console.error("notify error:", err.message);
    return null;
  }
}

// Delete a notification (used when like/follow is undone).
async function unnotify({ recipient, actor, type, thought = null }) {
  try {
    await Notification.deleteOne({ recipient, actor, type, thought });
  } catch (err) {
    console.error("unnotify error:", err.message);
  }
}

// Emit a real-time event if the recipient has an active socket.
// The io instance is attached to the Express app (see server.js).
function emitTo(app, recipientId, event, payload) {
  try {
    const io = app.get("io");
    if (io) io.to(String(recipientId)).emit(event, payload);
  } catch (err) {
    console.error("emit error:", err.message);
  }
}

module.exports = { notify, unnotify, emitTo };