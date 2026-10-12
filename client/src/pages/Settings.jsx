import { useState } from "react";
import { Link } from "react-router-dom";
import api, { errMsg } from "../api";
import Icon from "../components/Icon";
import { useAuth } from "../context/AuthContext";

export default function Settings() {
  const { user } = useAuth();

  return (
    <div className="page">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage your account and see how ThoughtStream works.</p>
      </div>

      {/* Change Password */}
      <section className="settings-section">
        <h2 className="settings-title">Change Password</h2>
        <ChangePasswordForm />
      </section>

      {/* About */}
      <section className="settings-section">
        <h2 className="settings-title">About</h2>
        <p className="settings-text">
          ThoughtStream is a minimal place to share short thoughts, follow
          people you find interesting, and have quiet conversations.
        </p>
        <p className="settings-text">
          Version 1.0 · Built with the MERN stack.
        </p>
      </section>

      {/* Privacy */}
      <section className="settings-section">
        <h2 className="settings-title">Privacy</h2>
        <p className="settings-text">
          Your thoughts are public. Your messages are private and only visible
          to you and the person you're chatting with.
        </p>
        <p className="settings-text">
          We never sell your data. Sessions are stored securely in httpOnly
          cookies and expire after 7 days.
        </p>
      </section>

      {/* If admin */}
      {user?.role === "admin" && (
        <section className="settings-section">
          <h2 className="settings-title">Admin</h2>
          <Link to="/admin" className="btn">
            <Icon name="shield" />
            <span>Open admin panel</span>
          </Link>
        </section>
      )}
    </div>
  );
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setOk("");
    setError("");

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setError("New passwords don't match.");
      return;
    }

    setBusy(true);
    try {
      await api.put("/users/change-password", { currentPassword, newPassword });
      setOk("Password updated. You can keep using this session.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (err) {
      setError(errMsg(err, "Could not update password"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="settings-form" onSubmit={submit}>
      <label htmlFor="currentPassword">Current password</label>
      <input
        id="currentPassword"
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        placeholder="Enter current password"
        autoComplete="current-password"
        required
      />

      <label htmlFor="newPassword">New password</label>
      <input
        id="newPassword"
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="At least 6 characters"
        autoComplete="new-password"
        minLength={6}
        required
      />

      <label htmlFor="confirm">Confirm new password</label>
      <input
        id="confirm"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Repeat new password"
        autoComplete="new-password"
        minLength={6}
        required
      />

      {error && <div className="form-error">{error}</div>}
      {ok && <div className="form-success">{ok}</div>}

      <button
        className="btn btn-primary"
        type="submit"
        disabled={busy || !currentPassword || !newPassword || !confirm}
      >
        {busy ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}