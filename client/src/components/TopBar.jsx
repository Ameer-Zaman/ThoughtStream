import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Avatar from "./Avatar";
import Icon from "./Icon";
import { useAuth } from "../context/AuthContext";

export default function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate("/login");
  };

  return (
    <div className="topbar">
      <div className="topbar-menu-wrap" ref={wrapRef}>
        <button
          className="topbar-avatar-btn"
          onClick={() => setOpen((v) => !v)}
          aria-label="Account menu"
          aria-expanded={open}
        >
          <Avatar user={user} size={34} />
        </button>

        {open && (
          <div className="topbar-menu">
            <Link
              to={`/profile/${user.username}`}
              className="topbar-menu-item"
              onClick={() => setOpen(false)}
            >
              <Icon name="user" />
              <span>Profile</span>
            </Link>

            <Link
              to="/settings"
              className="topbar-menu-item"
              onClick={() => setOpen(false)}
            >
              <Icon name="settings" />
              <span>Settings</span>
            </Link>

            <button
              type="button"
              className="topbar-menu-item danger"
              onClick={handleLogout}
            >
              <Icon name="logout" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}