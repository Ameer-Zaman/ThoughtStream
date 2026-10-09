import { NavLink, useNavigate } from "react-router-dom";
import Icon from "./Icon";
import { useAuth } from "../context/AuthContext";
import { prefetch } from "../lib/query";
import { thoughtsFetcher, thoughtsKey } from "../lib/useThoughts";
import { CONVS_KEY, fetchConvs } from "../lib/messagesQueries";

// Hovering a nav item starts loading that page's data a moment before you click it
const warm = {
  "/": () => prefetch(thoughtsKey("/thoughts"), thoughtsFetcher("/thoughts")),
  "/explore": () => prefetch(thoughtsKey("/thoughts/trending"), thoughtsFetcher("/thoughts/trending")),
  "/messages": () => prefetch(CONVS_KEY, fetchConvs),
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
  const { logout } = useAuth();
  const navigate = useNavigate();

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
        {items.map((item) => (
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
