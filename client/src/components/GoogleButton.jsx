import { GoogleLogin } from "@react-oauth/google";

const enabled = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.2 5.6c4.3-4 6.8-9.9 6.8-17z" />
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-7.9-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.2-5.6c-2 1.4-4.6 2.3-8.7 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

// "Continue with Google" button used on the Login and Signup pages.
// With VITE_GOOGLE_CLIENT_ID set, it shows Google's real button.
// Without it, it still shows (so you can see it) and explains what is missing when clicked.
export default function GoogleButton({ mode = "signin", onCredential, onError }) {
  if (!enabled) {
    return (
      <button
        type="button"
        className="google-btn"
        onClick={() =>
          onError("Google sign-in isn't set up yet. Add VITE_GOOGLE_CLIENT_ID to client/.env and GOOGLE_CLIENT_ID to server/.env, then restart both.")
        }
      >
        <GoogleG />
        {mode === "signup" ? "Sign up with Google" : "Continue with Google"}
      </button>
    );
  }
  return (
    <div className="google-wrap">
      <GoogleLogin
        text={mode === "signup" ? "signup_with" : "continue_with"}
        theme="outline"
        size="large"
        shape="pill"
        width="320"
        onSuccess={(r) => onCredential(r.credential)}
        onError={() => onError("Google sign-in was cancelled or failed.")}
      />
    </div>
  );
}
