import { useState } from "react";
import { Link } from "react-router-dom";
import api, { errMsg } from "../api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const res = await api.post("/users/forgot-password", { email });
      setMessage(res.data.message);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand brand-center">ThoughtStream</div>
        <h1>Forgot password</h1>
        <p className="muted">Enter your email and we'll send you a reset link.</p>

        {error && <div className="form-error">{error}</div>}
        {message && <div className="form-success">{message}</div>}

        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Sending…" : "Send reset link"}
        </button>

        <p className="auth-footer">
          <Link to="/login">Back to login</Link>
        </p>
      </form>
    </div>
  );
}
