import { useCallback } from "react";
import api from "../api";
import { useQuery } from "./query";

export const thoughtsKey = (url, params) => `${url}?${JSON.stringify(params || {})}`;

export const thoughtsFetcher = (url, params) => async () => {
  const res = await api.get(url, { params });
  return { thoughts: res.data.thoughts || [], users: res.data.users || [] };
};

// One hook for every list of thoughts (Home, Explore, Profile, search results)
export function useThoughts(url, params, enabled = true) {
  const key = url ? thoughtsKey(url, params) : null;
  const q = useQuery(key, thoughtsFetcher(url, params), { enabled });
  const { mutate } = q;

  const patch = useCallback(
    (id, changes) =>
      mutate((prev) =>
        prev ? { ...prev, thoughts: prev.thoughts.map((t) => (t._id === id ? { ...t, ...changes } : t)) } : prev
      ),
    [mutate]
  );

  const remove = useCallback(
    (id) => mutate((prev) => (prev ? { ...prev, thoughts: prev.thoughts.filter((t) => t._id !== id) } : prev)),
    [mutate]
  );

  const add = useCallback(
    (thought) => mutate((prev) => (prev ? { ...prev, thoughts: [thought, ...prev.thoughts] } : prev)),
    [mutate]
  );

  // Follow/unfollow an author: update every card by that author
  const setFollow = useCallback(
    (authorId, following) =>
      mutate((prev) =>
        prev
          ? {
              ...prev,
              thoughts: prev.thoughts.map((t) => (t.author._id === authorId ? { ...t, iFollowAuthor: following } : t)),
            }
          : prev
      ),
    [mutate]
  );

  return {
    ...q,
    thoughts: q.data?.thoughts || [],
    users: q.data?.users || [],
    patch,
    remove,
    add,
    setFollow,
  };
}
