import { useSyncExternalStore } from "react";
import socket from "../socket";

function subscribe(onChange) {
  socket.on("connect", onChange);
  socket.on("disconnect", onChange);
  return () => {
    socket.off("connect", onChange);
    socket.off("disconnect", onChange);
  };
}

// true while the live (Socket.IO) connection is up
export function useSocketConnected() {
  return useSyncExternalStore(subscribe, () => socket.connected);
}
