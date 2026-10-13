import { io } from "socket.io-client";
import { API_URL } from "./api";

// In production, API_URL is "" → connect to the current origin (Vercel)
// and let Vercel's proxy forward /socket.io/* to Render.
const socket = io(API_URL || window.location.origin, {
  withCredentials: true,
  autoConnect: false,
  // Polling first: Vercel's free-tier proxy doesn't upgrade WebSockets,
  // so polling establishes the connection and Socket.IO tries to upgrade later.
  transports: ["polling", "websocket"],
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