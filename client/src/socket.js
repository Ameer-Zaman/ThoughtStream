import { io } from "socket.io-client";
import { API_URL } from "./api";

// One shared socket for the whole app.
const socket = io(API_URL, {
  withCredentials: true,
  autoConnect: false,
  // Use a WebSocket straight away (falls back to polling only if WebSockets are blocked).
  transports: ["websocket", "polling"],
});

let wanted = false; // true while someone is logged in
let retryTimer = null;

// If the server rejects the handshake (for example the database was slow while it checked your login),
// socket.io does NOT retry by itself. So we retry every few seconds while logged in.
socket.on("connect_error", () => {
  if (!wanted || socket.active) return;
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => {
    if (wanted && !socket.connected && !socket.active) socket.connect();
  }, 3000);
});

export function connectSocket() {
  wanted = true;
  if (!socket.connected && !socket.active) socket.connect();
}

export function disconnectSocket() {
  wanted = false;
  clearTimeout(retryTimer);
  socket.disconnect();
}

export default socket;