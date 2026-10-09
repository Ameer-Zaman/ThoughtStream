import api from "../api";

export const CONVS_KEY = "convs";
export const msgsKey = (id) => `msgs:${id}`;

export const fetchConvs = () => api.get("/messages/conversations").then((res) => res.data.conversations);
export const fetchMsgs = (id) => () => api.get(`/messages/conversations/${id}`).then((res) => res.data.messages);

export const sortConvs = (list) =>
  [...list].sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
