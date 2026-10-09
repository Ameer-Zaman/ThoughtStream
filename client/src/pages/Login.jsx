import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import api, { errMsg } from "../api";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const googleEnabled = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api.post("/users/login", { email, password });
      navigate("/verify-otp", { state: { userId: res.data.userId, email } });
    } catch (err) {
      setError(errMsg(err, "Login failed"));
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async (response) => {
    setError("");
    try {
      const res = await api.post("/users/google-login", { credential: response.credential });
      setUser(res.data.user);
      navigate("/");
    } catch (err) {
      setError(errMsg(err, "Google login failed"));
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand brand-center">ThoughtStream</div>
        <h1>Welcome back</h1>
        <p className="muted">Log in to continue</p>

        {error && <div className="form-error">{error}</div>}

        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />

        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

        <Link to="/forgot-password" className="link-small">
          Forgot password?
        </Link>

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Please wait…" : "Log in"}
        </button>

        {googleEnabled && (
          <>
            <div className="divider">or</div>
            <div className="google-wrap">
              <GoogleLogin onSuccess={onGoogle} onError={() => setError("Google login failed")} />
            </div>
          </>
        )}

        <p className="auth-footer">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
