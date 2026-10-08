import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { GoogleLogin } from "@react-oauth/google";

function Signup() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPasswrod, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();

    setError("");

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!username.trim()) {
      setError("Please enter a username.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    if (!confirmPasswrod.trim()) {
      setError("Please confirm your password.");
      return;
    }

    if (password !== confirmPasswrod) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        "http://localhost:5000/api/users/signup",
        {
          fullName,
          username,
          email,
          password,
        },
      );

      console.log(response.data);

      // Go to login after successful account creation
      navigate("/login");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Signup failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container signup-container">

        {/* Heading */}
        <div className="auth-heading">
          <h1>Create your account</h1>

          <p>
            Join ThoughtStream and share what's on your mind.
          </p>
        </div>

        {/* Signup Card */}
        <div className="signup-card">

          {/* Google Login */}
          <div className="google-login">
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                try {
                  const response = await axios.post(
                    "http://localhost:5000/api/users/google-login",
                    {
                      credential:
                        credentialResponse.credential,
                    },
                    {
                      withCredentials: true,
                    },
                  );

                  navigate("/");
                  console.log(response.data);
                } catch (error) {
                  setError(
                    error.response?.data?.message ||
                      "Google signup failed",
                  );
                }
              }}
              onError={() => {
                setError("Google signup failed.");
              }}
              width="100%"
              text="continue_with"
              shape="rectangular"
              theme="outline"
            />
          </div>

          {/* Divider */}
          <div className="divider">
            <span>OR WITH EMAIL</span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="signup-error" role="alert">
              {error}
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSignup}>

            {/* Full Name */}
            <div className="form-group">
              <label>Full name</label>

              <input
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) =>
                  setFullName(e.target.value)
                }
              />
            </div>

            {/* Username */}
            <div className="form-group">
              <label>Username</label>

              <input
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value)
                }
              />
            </div>

            {/* Email */}
            <div className="form-group">
              <label>Email</label>

              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label>Password</label>

              <input
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
              />
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label>Confirm Password</label>

              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPasswrod}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
              />
            </div>

            {/* Create Account Button */}
            <button
              type="submit"
              className="signup-button"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create account"}
            </button>

          </form>
        </div>

        {/* Login Link */}
        <p className="auth-switch">
          Already have an account?
          <a href="/login"> Log in</a>
        </p>

      </div>
    </div>
  );
}

export default Signup;