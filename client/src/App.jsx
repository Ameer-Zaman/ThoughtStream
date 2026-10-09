import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import VerifyOtp from "./pages/VerifyOtp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import Profile from "./pages/Profile";
import Messages from "./pages/Messages";
import Placeholder from "./pages/Placeholder";

function Protected() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-screen">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout />;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-screen">Loading…</div>;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
      <Route path="/verify-otp" element={<PublicOnly><VerifyOtp /></PublicOnly>} />
      <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
      <Route path="/reset-password/:token" element={<PublicOnly><ResetPassword /></PublicOnly>} />

      <Route element={<Protected />}>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/profile/:username" element={<Profile />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/notifications" element={<Placeholder title="Notifications" />} />
        <Route path="/saved" element={<Placeholder title="Saved" />} />
        <Route path="/settings" element={<Placeholder title="Settings" />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
