import { io } from "socket.io-client";

// ---------------------------------------------------------
// One socket instance for the entire app.
// autoConnect: false means we manually connect after login.
// ---------------------------------------------------------
const socket = io("http://localhost:5000", {
  withCredentials: true,
  autoConnect: false,
});

export default socket;