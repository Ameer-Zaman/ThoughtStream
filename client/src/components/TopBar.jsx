import { Link } from "react-router-dom";
import Avatar from "./Avatar";
import { useAuth } from "../context/AuthContext";

export default function TopBar() {
  const { user } = useAuth();
  return (
    <div className="topbar">
      <Link to={`/profile/${user.username}`} title="Your profile">
        <Avatar user={user} size={34} />
      </Link>
    </div>
  );
}
