import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import socket from "../socket";

import thoughtStreamLogo from "../assets/images/logo.png";

import "./Messages.css";

function Messages() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState(null);

  // Message state for the active conversation
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [mutualFollowers, setMutualFollowers] = useState([]);
  const [mutualFollowersLoading, setMutualFollowersLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Load current user
  useEffect(() => {
    const getUser = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/users/me", {
          withCredentials: true,
        });

        setUser(response.data.user);
      } catch (error) {
        console.error("Failed to load user:", error);
      }
    };

    getUser();
  }, []);

  // Load conversations
  useEffect(() => {
    const getConversations = async () => {
      try {
        const response = await axios.get(
          "http://localhost:5000/api/messages/conversations",
          { withCredentials: true },
        );

        setConversations(response.data.conversations || []);
      } catch (error) {
        console.error("Failed to load conversations:", error);
      } finally {
        setConversationsLoading(false);
      }
    };

    getConversations();
  }, []);

  // Load messages whenever active conversation changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    const getMessages = async () => {
      setMessagesLoading(true);

      try {
        const response = await axios.get(
          `http://localhost:5000/api/messages/conversations/${activeConversationId}`,
          { withCredentials: true },
        );

        setMessages(response.data.messages || []);
      } catch (error) {
        console.error("Failed to load messages:", error);
        setMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    };

    getMessages();
  }, [activeConversationId]);

  // Real-time: listen for incoming messages
  useEffect(() => {
    const handleNewMessage = (payload) => {
      const { conversationId, message } = payload;

      // Only append if it belongs to the active conversation
      if (conversationId === activeConversationId) {
        setMessages((previous) => {
          // Prevent duplicates (sender already appended via ack)
          const exists = previous.some((m) => m._id === message._id);
          if (exists) return previous;
          return [...previous, message];
        });
      }

      // Bump the conversation to the top of the list
      setConversations((previous) => {
        const updated = previous.map((c) =>
          c._id === conversationId
            ? { ...c, lastMessage: message, lastMessageAt: message.createdAt }
            : c,
        );

        return updated.sort((a, b) => {
          const aTime = a.lastMessageAt
            ? new Date(a.lastMessageAt)
            : new Date(0);
          const bTime = b.lastMessageAt
            ? new Date(b.lastMessageAt)
            : new Date(0);
          return bTime - aTime;
        });
      });
    };

    socket.on("newMessage", handleNewMessage);

    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [activeConversationId]);

  // Auto-scroll to newest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeConversationId]);

  // Auto-resize textarea as user types
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + "px";
  }, [messageInput]);

  const handleSendMessage = (e) => {
    e.preventDefault();

    const content = messageInput.trim();

    if (!content || !activeConversationId) return;

    socket.emit(
      "sendMessage",
      { conversationId: activeConversationId, content },
      (response) => {
        if (!response?.ok) {
          console.error("Failed to send message:", response?.error);
          return;
        }

        // Append the confirmed message from the server
        setMessages((previous) => {
          const exists = previous.some((m) => m._id === response.message._id);
          if (exists) return previous;
          return [...previous, response.message];
        });

        setMessageInput("");
      },
    );
  };

  const loadMutualFollowers = async () => {
    setMutualFollowersLoading(true);

    try {
      const response = await axios.get(
        "http://localhost:5000/api/messages/mutual-followers",
        { withCredentials: true },
      );

      setMutualFollowers(response.data.users || []);
    } catch (error) {
      console.error("Failed to load mutual followers:", error);
      setMutualFollowers([]);
    } finally {
      setMutualFollowersLoading(false);
    }
  };

  const handlePickUser = async (userId) => {
    try {
      const response = await axios.post(
        "http://localhost:5000/api/messages/conversations",
        { userId },
        { withCredentials: true },
      );

      const conversation = response.data.conversation;

      // Add to list if new, then activate it
      setConversations((previous) => {
        const exists = previous.some((c) => c._id === conversation._id);
        if (exists) return previous;
        return [conversation, ...previous];
      });

      setActiveConversationId(conversation._id);
      setShowPicker(false);
    } catch (error) {
      console.error("Failed to start conversation:", error);
    }
  };

  // Auto-open a conversation from ?user=<id> query param
  useEffect(() => {
    const targetUserId = searchParams.get("user");

    if (!targetUserId) return;

    handlePickUser(targetUserId);

    // Clear the query param so a refresh doesn't re-trigger
    setSearchParams({}, { replace: true });
  }, [searchParams]);

  // Find the other participant
  const getOtherParticipant = (conversation) => {
    if (!user) return null;

    return conversation.participants.find(
      (participant) => String(participant._id) !== String(user._id),
    );
  };

  const activeConversation = conversations.find(
    (c) => c._id === activeConversationId,
  );

  const activeOtherUser = activeConversation
    ? getOtherParticipant(activeConversation)
    : null;

  const formatTime = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="messages-layout">
      <aside className="home-sidebar">
        <Link to="/" className="brand">
          <img
            src={thoughtStreamLogo}
            alt="ThoughtStream"
            className="brand-logo"
          />
          <span>ThoughtStream</span>
        </Link>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <Link to="/" className="nav-item">
            <span className="nav-icon">⌂</span>
            <span>Home</span>
          </Link>

          <button className="nav-item active" type="button">
            <span className="nav-icon">✉</span>
            <span>Messages</span>
          </button>

          {user?.username && (
            <Link
              to={`/profile/${encodeURIComponent(user.username)}`}
              className="nav-item"
            >
              <span className="nav-icon">♙</span>
              <span>Profile</span>
            </Link>
          )}
        </nav>
      </aside>

      <main className="messages-main">
        <section className="conversations-pane">
          <header className="conversations-header">
            <div className="conversations-header-row">
              <h1>Messages</h1>

              <button
                type="button"
                className="new-message-button"
                onClick={() => {
                  if (!showPicker) {
                    loadMutualFollowers();
                  }
                  setShowPicker((previous) => !previous);
                }}
                aria-label="Start new conversation"
              >
                +
              </button>
            </div>

            <p>Your private conversations</p>
          </header>

          {showPicker && (
            <div className="mutual-picker">
              {mutualFollowersLoading ? (
                <div className="mutual-picker-empty">Loading...</div>
              ) : mutualFollowers.length === 0 ? (
                <div className="mutual-picker-empty">
                  You have no mutual followers yet. Follow someone back to
                  message them.
                </div>
              ) : (
                mutualFollowers.map((person) => (
                  <div
                    key={person._id}
                    className="mutual-picker-item"
                    onClick={() => handlePickUser(person._id)}
                  >
                    <div className="user-avatar mutual-picker-avatar">
                      {person.profilePicture ? (
                        <img src={person.profilePicture} alt="" />
                      ) : (
                        (person.fullName || person.username || "U")
                          .charAt(0)
                          .toUpperCase()
                      )}
                    </div>

                    <div className="mutual-picker-info">
                      <strong>{person.fullName || person.username}</strong>
                      <span>@{person.username}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="conversations-list">
            {conversationsLoading ? (
              <div className="conversations-empty">
                <strong>Loading...</strong>
              </div>
            ) : conversations.length === 0 ? (
              <div className="conversations-empty">
                <strong>No conversations yet</strong>
                <span>
                  Mutual followers can message each other. Follow someone back
                  to start a chat.
                </span>
              </div>
            ) : (
              conversations.map((conversation) => {
                const otherUser = getOtherParticipant(conversation);

                if (!otherUser) return null;

                const isActive = activeConversationId === conversation._id;

                return (
                  <div
                    key={conversation._id}
                    className={`conversation-item ${isActive ? "active" : ""}`}
                    onClick={() => setActiveConversationId(conversation._id)}
                  >
                    <div className="user-avatar conversation-item-avatar">
                      {otherUser.profilePicture ? (
                        <img src={otherUser.profilePicture} alt="" />
                      ) : (
                        (otherUser.fullName || otherUser.username || "U")
                          .charAt(0)
                          .toUpperCase()
                      )}
                    </div>

                    <div className="conversation-item-info">
                      <strong>
                        {otherUser.fullName || otherUser.username}
                      </strong>
                      <span>@{otherUser.username}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="chat-pane">
          {!activeConversation ? (
            <div className="chat-empty">
              <strong>Select a conversation</strong>
              <span>Choose someone from the list to view your messages.</span>
            </div>
          ) : (
            <div className="chat-window">
              <header className="chat-header">
                <div className="user-avatar chat-header-avatar">
                  {activeOtherUser?.profilePicture ? (
                    <img src={activeOtherUser.profilePicture} alt="" />
                  ) : (
                    (
                      activeOtherUser?.fullName ||
                      activeOtherUser?.username ||
                      "U"
                    )
                      .charAt(0)
                      .toUpperCase()
                  )}
                </div>

                <div className="chat-header-info">
                  <strong>
                    {activeOtherUser?.fullName ||
                      activeOtherUser?.username ||
                      "Unknown"}
                  </strong>
                  <span>@{activeOtherUser?.username || "user"}</span>
                </div>
              </header>

              <div className="chat-messages">
                {messagesLoading ? (
                  <div className="chat-loading">
                    <strong>Loading messages...</strong>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="chat-no-messages">
                    <strong>No messages yet</strong>
                    <span>Say hi to start the conversation.</span>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isMine =
                      String(message.senderId?._id) === String(user?._id);

                    return (
                      <div
                        key={message._id}
                        className={`message-row ${isMine ? "mine" : "theirs"}`}
                      >
                        {!isMine && (
                          <div className="user-avatar message-avatar">
                            {message.senderId?.profilePicture ? (
                              <img
                                src={message.senderId.profilePicture}
                                alt=""
                              />
                            ) : (
                              (
                                message.senderId?.fullName ||
                                message.senderId?.username ||
                                "U"
                              )
                                .charAt(0)
                                .toUpperCase()
                            )}
                          </div>
                        )}

                        <div className="message-bubble">
                          {message.content}
                          <span
                            style={{
                              display: "block",
                              fontSize: "9px",
                              opacity: 0.55,
                              marginTop: "2px",
                            }}
                          >
                            {formatTime(message.createdAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}

                <div ref={messagesEndRef} />
              </div>

              <form className="chat-composer" onSubmit={handleSendMessage}>
                <textarea
                  ref={textareaRef}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder="Write a message..."
                  rows="1"
                />

                <button type="submit" disabled={!messageInput.trim()}>
                  Send
                </button>
              </form>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Messages;
