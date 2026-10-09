import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true, // send the httpOnly session cookie
  timeout: 20000, // a request can no longer hang forever: it fails after 20s and the UI shows Retry
});

// Retry GET requests once on network errors, timeouts and 5xx (flaky Wi-Fi / sleepy servers)
api.interceptors.response.use(undefined, async (error) => {
  const config = error.config;
  const status = error.response?.status;
  const retryable = !error.response || status >= 500;
  if (config && config.method === "get" && retryable && !config.__retried) {
    config.__retried = true;
    await new Promise((r) => setTimeout(r, 600));
    return api(config);
  }
  return Promise.reject(error);
});

export default api;

export function errMsg(err, fallback = "Something went wrong") {
  if (err?.code === "ECONNABORTED") return "The server took too long to respond.";
  if (err && !err.response && err.message === "Network Error") return "Can't reach the server. Is it running?";
  return err?.response?.data?.message || fallback;
}
