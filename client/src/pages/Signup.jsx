import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import api, { errMsg } from "../api";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [form, setForm] = useState({ fullName: "", username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const googleEnabled = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/users/signup", form);
      navigate("/login");
    } catch (err) {
      setError(errMsg(err, "Signup failed"));
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
      setError(errMsg(err, "Google signup failed"));
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand brand-center">ThoughtStream</div>
        <h1>Create your account</h1>
        <p className="muted">Share what's on your mind</p>

        {error && <div className="form-error">{error}</div>}

        <label>Full name</label>
        <input name="fullName" value={form.fullName} onChange={change} required autoFocus />

        <label>Username</label>
        <input name="username" value={form.username} onChange={change} required placeholder="letters, numbers, _" />

        <label>Email</label>
        <input type="email" name="email" value={form.email} onChange={change} required />

        <label>Password</label>
        <input type="password" name="password" value={form.password} onChange={change} required minLength={6} />

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Please wait…" : "Sign up"}
        </button>

        {googleEnabled && (
          <>
            <div className="divider">or</div>
            <div className="google-wrap">
              <GoogleLogin text="signup_with" onSuccess={onGoogle} onError={() => setError("Google signup failed")} />
            </div>
          </>
        )}

        <p className="auth-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
