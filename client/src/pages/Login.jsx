import { useState } from "react";
import axios from "axios";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        "http://localhost:5000/api/users/login",
        {
          email,
          password,
        },
      );

      localStorage.setItem("token", response.data.token);

      localStorage.setItem("user", JSON.stringify(response.data.user));

      navigate("/verify-otp", {
        state: {
          userId: response.data.userId,
        },
      });
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Login failed. Please check your email and password.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-heading">
          <h1>Welcome back</h1>
          <p>Sign in to continue to ThoughtStream.</p>
        </div>

        <div className="login-card">
          <div className="google-login">
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                try {
                  const response = await axios.post(
                    "http://localhost:5000/api/users/google-login",
                    {
                      credential: credentialResponse.credential,
                    },
                    {
                      withCredentials: true,
                    },
                  );

                  navigate("/");
                  console.log(response.data);
                } catch (error) {
                  console.log(
                    error.response?.data?.message || "Google login failed",
                  );
                }
              }}
              onError={() => {
                console.log("Google Login Failed");
              }}
              width="530"
              text="continue_with"
              shape="rectangular"
              theme="outline"
            />
          </div>

          <div className="divider">
            <span>OR WITH EMAIL</span>
          </div>

          <form onSubmit={handleLogin}>
            {error !== "" && <div className="status-error">{error}</div>}

            <div className="form-group">
              <label>Email address</label>

              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group password-group">
              <div className="password-row">
                <label>Password</label>

                <a href="/forgot-password">Forgot password?</a>
              </div>

              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Logging in..." : "Log In"}
            </button>
          </form>

          
        </div>

        <p className="auth-switch">
          Don't have an account?
          <a href="/signup"> Sign Up</a>
        </p>
      </div>
    </div>
  );
}

export default Login;
