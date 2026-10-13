import { NavLink, useNavigate } from "react-router-dom";
import Icon from "./Icon";
import { useAuth } from "../context/AuthContext";
import { prefetch } from "../lib/query";
import { thoughtsFetcher, thoughtsKey } from "../lib/useThoughts";
import { CONVS_KEY, fetchConvs } from "../lib/messagesQueries";
import { useNotificationStream, useUnreadCount } from "../lib/notifications";
import api from "../api";

// Hovering a nav item starts loading that page's data a moment before you click it
const warm = {
  "/": () => prefetch(thoughtsKey("/thoughts"), thoughtsFetcher("/thoughts")),
  "/explore": () => prefetch(thoughtsKey("/thoughts/trending"), thoughtsFetcher("/thoughts/trending")),
  "/messages": () => prefetch(CONVS_KEY, fetchConvs),
  "/saved": () => prefetch(thoughtsKey("/bookmarks"), thoughtsFetcher("/bookmarks")),
  "/notifications": () => {
    prefetch("notifications:list", () => api.get("/notifications").then((r) => r.data.notifications || []));
    prefetch("notifications:unread", () => api.get("/notifications/unread-count").then((r) => r.data.count || 0));
  },
};

const items = [
  { to: "/", label: "Home", icon: "home", end: true },
  { to: "/explore", label: "Explore", icon: "search" },
  { to: "/notifications", label: "Notifications", icon: "bell" },
  { to: "/messages", label: "Messages", icon: "mail" },
  { to: "/saved", label: "Saved", icon: "bookmark" },
  { to: "/settings", label: "Settings", icon: "settings" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useNotificationStream();
  const { data: unread = 0 } = useUnreadCount();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">T</span>
        <span className="brand-text">ThoughtStream</span>
      </div>
      <nav className="nav">
        {(user?.role === "admin" ? [...items, { to: "/admin", label: "Admin", icon: "shield" }] : items).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
            title={item.label}
            onMouseEnter={warm[item.to]}
            onFocus={warm[item.to]}
          >
            <Icon name={item.icon} />
            <span className="nav-label">{item.label}</span>
            {item.to === "/notifications" && unread > 0 && (
              <span className="nav-badge">{unread > 99 ? "99+" : unread}</span>
            )}
          </NavLink>
        ))}
      </nav>
      <button className="nav-item logout" onClick={handleLogout} title="Logout">
        <Icon name="logout" />
        <span className="nav-label">Logout</span>
      </button>
    </aside>
  );
}