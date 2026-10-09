import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../api";
import { connectSocket, disconnectSocket } from "../socket";
import { clearQueryCache, prefetch } from "../lib/query";
import { thoughtsFetcher, thoughtsKey } from "../lib/useThoughts";
import { CONVS_KEY, fetchConvs } from "../lib/messagesQueries";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/users/me")
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user) {
      // Connect the socket once we are logged in
      connectSocket();
      // Start loading the pages you're most likely to open next, so they appear instantly
      prefetch(thoughtsKey("/thoughts"), thoughtsFetcher("/thoughts"));
      prefetch(CONVS_KEY, fetchConvs);
    } else {
      disconnectSocket();
      clearQueryCache(); // never show one user's cached data to the next user
    }
  }, [user]);

  const logout = useCallback(async () => {
    try {
      await api.post("/users/logout");
    } catch {
      // ignore, we clear local state anyway
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout }}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
