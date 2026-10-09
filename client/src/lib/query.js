import { useCallback, useEffect, useReducer, useRef } from "react";
import { errMsg } from "../api";

// A tiny "stale-while-revalidate" data store.
//  - Data is cached by key, so going back to a page shows it INSTANTLY.
//  - The page still re-fetches in the background and updates when fresh data arrives.
//  - The same request is never sent twice at the same time.
const store = new Map();

function getEntry(key) {
  let e = store.get(key);
  if (!e) {
    e = { data: undefined, error: "", ts: 0, promise: null, listeners: new Set() };
    store.set(key, e);
  }
  return e;
}

const notify = (e) => e.listeners.forEach((l) => l());

function run(key, fetcher) {
  const e = getEntry(key);
  if (e.promise) return e.promise;
  e.promise = (async () => {
    try {
      e.data = await fetcher();
      e.error = "";
      e.ts = Date.now();
    } catch (err) {
      e.error = errMsg(err, "Could not load");
    } finally {
      e.promise = null;
      notify(e);
    }
  })();
  return e.promise;
}

export function setQueryData(key, updater) {
  if (!key) return;
  const e = getEntry(key);
  e.data = typeof updater === "function" ? updater(e.data) : updater;
  e.ts = Date.now();
  notify(e);
}

export function prefetch(key, fetcher, maxAgeMs = 10000) {
  const e = getEntry(key);
  if (e.data === undefined || Date.now() - e.ts > maxAgeMs) run(key, fetcher);
}

export function clearQueryCache() {
  store.clear();
}

export function useQuery(key, fetcher, { enabled = true } = {}) {
  const [, rerender] = useReducer((n) => n + 1, 0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!key || !enabled) return undefined;
    const e = getEntry(key);
    e.listeners.add(rerender);
    run(key, () => fetcherRef.current());
    return () => e.listeners.delete(rerender);
  }, [key, enabled]);

  const reload = useCallback(() => {
    if (!key) return;
    const e = getEntry(key);
    if (e.data === undefined) e.error = ""; // show the skeleton again while retrying
    notify(e);
    run(key, () => fetcherRef.current());
  }, [key]);

  const mutate = useCallback((updater) => setQueryData(key, updater), [key]);

  const e = key && enabled ? store.get(key) : undefined;
  const data = e?.data;
  const error = e?.error || "";
  const loading = !!key && enabled && data === undefined && !error;

  return { data, loading, error, reload, mutate };
}
