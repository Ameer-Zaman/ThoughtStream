import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import api, { errMsg } from "../api";
import { useAuth } from "../context/AuthContext";

export default function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const userId = location.state?.userId;
  if (!userId) return <Navigate to="/login" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api.post("/users/verify-otp", { userId, otp });
      setUser(res.data.user);
      navigate("/");
    } catch (err) {
      setError(errMsg(err, "Verification failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand brand-center">ThoughtStream</div>
        <h1>Check your email</h1>
        <p className="muted">
          We sent a 6-digit code{location.state?.email ? ` to ${location.state.email}` : ""}.
        </p>

        {error && <div className="form-error">{error}</div>}

        <label>Verification code</label>
        <input
          className="otp-input"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          maxLength={6}
          required
          autoFocus
        />

        <button className="btn btn-primary btn-block" disabled={busy || otp.length !== 6}>
          {busy ? "Verifying…" : "Verify"}
        </button>

        <p className="auth-footer">
          <Link to="/login">Back to login</Link>
        </p>
      </form>
    </div>
  );
}
