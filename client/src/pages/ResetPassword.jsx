import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { errMsg } from "../api";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) return setError("Passwords don't match");
    setBusy(true);
    try {
      const res = await api.post("/users/reset-password", { token, password });
      setMessage(res.data.message);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(errMsg(err, "Reset failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand brand-center">ThoughtStream</div>
        <h1>Set a new password</h1>

        {error && <div className="form-error">{error}</div>}
        {message && <div className="form-success">{message}</div>}

        <label>New password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoFocus />

        <label>Confirm password</label>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Saving…" : "Reset password"}
        </button>

        <p className="auth-footer">
          <Link to="/login">Back to login</Link>
        </p>
      </form>
    </div>
  );
}
