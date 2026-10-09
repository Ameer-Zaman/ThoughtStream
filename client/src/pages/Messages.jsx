import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api, { errMsg } from "../api";
import socket from "../socket";
import Avatar from "../components/Avatar";
import Icon from "../components/Icon";
import ErrorState from "../components/ErrorState";
import { ChatSkeleton, ConvSkeletons, UserRowSkeletons } from "../components/Skeleton";
import { formatTime } from "../components/format";
import { useAuth } from "../context/AuthContext";
import { prefetch, setQueryData, useQuery } from "../lib/query";
import { useSocketConnected } from "../lib/useSocketStatus";
import { CONVS_KEY, fetchConvs, fetchMsgs, msgsKey, sortConvs } from "../lib/messagesQueries";

function ChatWindow({ conv, myId, onBack }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const listRef = useRef(null);
  const taRef = useRef(null);
  const other = conv.otherUser;
  const key = msgsKey(conv._id);
  const connected = useSocketConnected();

  // Cached per conversation: re-opening a chat shows it instantly, then refreshes in the background
  const { data, loading, error: loadError, reload } = useQuery(key, fetchMsgs(conv._id));
  const messages = data || [];

  // Auto-scroll to the newest message
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length, conv._id, loading]);

  const resize = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 100) + "px";
  };

  const send = async () => {
    const content = text.trim();
    if (!content) return;
    setError("");

    // Show the message immediately (faded) and confirm it when the server answers
    const tempId = `tmp-${Date.now()}`;
    setQueryData(key, (prev) => [
      ...(prev || []),
      { _id: tempId, conversationId: conv._id, senderId: myId, content, createdAt: new Date().toISOString(), pending: true },
    ]);
    setText("");
    requestAnimationFrame(resize);

    try {
      let message;
      if (socket.connected) {
        // Live connection is up: send through Socket.IO and wait for the server's confirmation
        message = await new Promise((resolve, reject) => {
          socket.timeout(8000).emit("sendMessage", { conversationId: conv._id, content }, (err, ack) => {
            if (err) return reject(new Error("The server took too long to respond."));
            if (!ack?.ok) return reject(new Error(ack?.error || "Could not send"));
            return resolve(ack.message);
          });
        });
      } else {
        // Live connection is down: send over normal HTTP instead, so messaging still works
        const res = await api.post(`/messages/conversations/${conv._id}/messages`, { content });
        message = res.data.message;
      }
      setQueryData(key, (prev) => {
        const rest = (prev || []).filter((m) => m._id !== tempId);
        return rest.some((m) => m._id === message._id) ? rest : [...rest, message];
      });
    } catch (err) {
      setQueryData(key, (prev) => (prev ? prev.filter((m) => m._id !== tempId) : prev));
      setError(errMsg(err, err.message || "Could not send"));
      setText(content);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="chat-pane">
      <div className="chat-head">
        <button className="icon-btn back-btn" onClick={onBack} aria-label="Back">
          <Icon name="back" />
        </button>
        <Avatar user={other} size={38} />
        <div>
          <div className="name">{other.fullName}</div>
          <div className="thought-meta">@{other.username}</div>
        </div>
        {!connected && (
          <div className="conn-pill" title="Live updates are reconnecting. Messages still send.">
            <span className="conn-dot" /> Reconnecting…
          </div>
        )}
      </div>

      <div className="chat-list" ref={listRef}>
        {loading && <ChatSkeleton />}
        {!loading && loadError && !data && <ErrorState compact message={loadError} onRetry={reload} />}
        {!loading && data && messages.length === 0 && (
          <div className="muted" style={{ textAlign: "center", margin: "auto" }}>
            No messages yet. Say hello 👋
          </div>
        )}
        {messages.map((m) => {
          const mine = String(m.senderId) === String(myId);
          return (
            <div key={m._id} className={"msg-row" + (mine ? " mine" : "") + (m.pending ? " pending" : "")}>
              {!mine && <Avatar user={other} size={28} />}
              <div className="msg-col">
                <div className={"bubble " + (mine ? "mine" : "theirs")}>{m.content}</div>
                <span className="msg-time">{m.pending ? "Sending…" : formatTime(m.createdAt)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {error && <div className="form-error" style={{ margin: "0 16px 8px" }}>{error}</div>}

      <div className="chat-composer">
        <textarea
          ref={taRef}
          rows={1}
          placeholder="Write a message…"
          value={text}
          maxLength={2000}
          onChange={(e) => {
            setText(e.target.value);
            resize();
          }}
          onKeyDown={onKeyDown}
        />
        <button className="btn btn-primary send-btn" onClick={send} disabled={!text.trim()} aria-label="Send">
          <Icon name="send" size={18} />
        </button>
      </div>
    </div>
  );
}

export default function Messages() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeId, setActiveId] = useState(null);
  const [picker, setPicker] = useState(false);
  const [error, setError] = useState("");
  const [fresh, setFresh] = useState(null);

  const convsQ = useQuery(CONVS_KEY, fetchConvs);
  const convs = convsQ.data || [];

  const mutualsQ = useQuery("mutuals", () => api.get("/messages/mutual-followers").then((res) => res.data.users), {
    enabled: picker,
  });

  const reloadConvs = useRef(convsQ.reload);
  reloadConvs.current = convsQ.reload;
  const startedRef = useRef(false);

  const startWith = useCallback(async (userId) => {
    setError("");
    try {
      const res = await api.post("/messages/conversations", { userId });
      const conv = res.data.conversation;
      setQueryData(CONVS_KEY, (prev) => {
        const list = prev || [];
        return list.some((c) => c._id === conv._id) ? list : sortConvs([conv, ...list]);
      });
      setFresh(conv); // keeps the chat open even if an older list response arrives a moment later
      setActiveId(conv._id);
      setTimeout(() => reloadConvs.current(), 800);
    } catch (err) {
      setError(errMsg(err, "Could not start conversation"));
    }
  }, []);

  // "Message" buttons elsewhere navigate here with state: { userId }
  useEffect(() => {
    if (location.state?.userId && !startedRef.current) {
      startedRef.current = true;
      startWith(location.state.userId);
      navigate("/messages", { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time: update the cached messages and conversation list when "newMessage" arrives
  useEffect(() => {
    const onNew = ({ conversationId, message }) => {
      setQueryData(msgsKey(conversationId), (prev) =>
        prev && !prev.some((m) => m._id === message._id) ? [...prev, message] : prev
      );
      let known = true;
      setQueryData(CONVS_KEY, (prev) => {
        if (!prev) return prev;
        if (!prev.some((c) => c._id === conversationId)) {
          known = false; // a brand-new conversation started by someone else
          return prev;
        }
        return sortConvs(
          prev.map((c) => (c._id === conversationId ? { ...c, lastMessage: message, lastMessageAt: message.createdAt } : c))
        );
      });
      if (!known) reloadConvs.current();
    };
    socket.on("newMessage", onNew);
    return () => socket.off("newMessage", onNew);
  }, []);

  const mutuals = (mutualsQ.data || []).filter((u) => !convs.some((c) => c.otherUser._id === u._id));
  const activeConv = convs.find((c) => c._id === activeId) || (fresh && fresh._id === activeId ? fresh : undefined);

  return (
    <div className={"messages-layout" + (activeConv ? " chat-open" : "")}>
      <div className="conv-pane">
        <div className="conv-head">
          <h2>Messages</h2>
          <button
            className={"icon-btn" + (picker ? " active" : "")}
            onClick={() => setPicker((v) => !v)}
            aria-label="New message"
            title="New message"
          >
            <Icon name={picker ? "close" : "plus"} />
          </button>
        </div>

        {picker && (
          <div className="picker">
            <div className="picker-title">Start a conversation</div>
            {mutualsQ.loading && <div style={{ padding: "0 16px" }}><UserRowSkeletons count={2} /></div>}
            {!mutualsQ.loading && mutualsQ.data && mutuals.length === 0 && (
              <div className="muted" style={{ padding: "4px 16px 14px" }}>
                No one new to message. You can message people who follow you back.
              </div>
            )}
            {!mutualsQ.loading && mutualsQ.error && !mutualsQ.data && (
              <ErrorState compact message={mutualsQ.error} onRetry={mutualsQ.reload} />
            )}
            {mutuals.map((u) => (
              <button
                key={u._id}
                className="conv-item"
                onClick={() => {
                  setPicker(false);
                  startWith(u._id);
                }}
              >
                <Avatar user={u} size={40} />
                <div>
                  <div className="name">{u.fullName}</div>
                  <div className="thought-meta">@{u.username}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {error && <div className="form-error" style={{ margin: 12 }}>{error}</div>}

        <div className="conv-list">
          {convsQ.loading && <ConvSkeletons />}
          {!convsQ.loading && convsQ.error && !convsQ.data && (
            <ErrorState compact message={convsQ.error} onRetry={convsQ.reload} />
          )}
          {!convsQ.loading && convsQ.data && convs.length === 0 && (
            <div className="empty">
              <div className="empty-title">No conversations yet</div>
              <div>Use + to message someone who follows you back.</div>
            </div>
          )}
          {convs.map((c) => (
            <button
              key={c._id}
              className={"conv-item" + (c._id === activeId ? " active" : "")}
              onClick={() => setActiveId(c._id)}
              onMouseEnter={() => prefetch(msgsKey(c._id), fetchMsgs(c._id))}
            >
              <Avatar user={c.otherUser} size={44} />
              <div style={{ minWidth: 0 }}>
                <div className="name">{c.otherUser.fullName}</div>
                {c.lastMessage ? (
                  <div className="preview">
                    {String(c.lastMessage.senderId) === String(user._id) ? "You: " : ""}
                    {c.lastMessage.content}
                  </div>
                ) : (
                  <div className="preview">@{c.otherUser.username}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {activeConv ? (
        <ChatWindow key={activeConv._id} conv={activeConv} myId={user._id} onBack={() => setActiveId(null)} />
      ) : (
        <div className="chat-pane">
          <div className="chat-empty">
            <Icon name="mail" size={34} strokeWidth={1.4} />
            <div className="empty-title">Your messages</div>
            <div>Select a conversation or start a new one.</div>
          </div>
        </div>
      )}
    </div>
  );
}
