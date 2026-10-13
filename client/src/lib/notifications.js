import { useEffect, useSyncExternalStore } from "react";
import socket from "../socket";
import api from "../api";
import { setQueryData, useQuery } from "./query";

export const NOTIFICATIONS_KEY = "notifications:list";
export const UNREAD_KEY = "notifications:unread";

const fetchList = () => api.get("/notifications").then((r) => r.data.notifications || []);
const fetchUnread = () => api.get("/notifications/unread-count").then((r) => r.data.count || 0);

export function useNotifications() {
  return useQuery(NOTIFICATIONS_KEY, fetchList);
}

export function useUnreadCount() {
  return useQuery(UNREAD_KEY, fetchUnread);
}

// Listen for "notification" socket events and update the cache live.
export function useNotificationStream() {
  useEffect(() => {
    const onNotification = (n) => {
      // Prepend to the list if it's loaded
      setQueryData(NOTIFICATIONS_KEY, (prev) => (Array.isArray(prev) ? [n, ...prev] : prev));
      // Bump the unread count
      setQueryData(UNREAD_KEY, (prev) => (typeof prev === "number" ? prev + 1 : 1));
    };

    socket.on("notification", onNotification);
    return () => socket.off("notification", onNotification);
  }, []);
}

// Manually bump / reset the unread badge without a server round-trip.
export function bumpUnread(delta) {
  setQueryData(UNREAD_KEY, (prev) => Math.max(0, (typeof prev === "number" ? prev : 0) + delta));
}

export function resetUnread() {
  setQueryData(UNREAD_KEY, 0);
}

// Mark one notification read locally
export function markReadLocal(id) {
  setQueryData(NOTIFICATIONS_KEY, (prev) =>
    Array.isArray(prev) ? prev.map((n) => (n._id === id ? { ...n, read: true } : n)) : prev
  );
}

// Mark all read locally
export function markAllReadLocal() {
  setQueryData(NOTIFICATIONS_KEY, (prev) =>
    Array.isArray(prev) ? prev.map((n) => ({ ...n, read: true })) : prev
  );
  resetUnread();
}