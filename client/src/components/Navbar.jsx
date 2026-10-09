import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

function Navbar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/users/me", {
          withCredentials: true,
        });

        setUser(response.data.user);
      } catch (error) {
        console.error("Failed to load user:", error);
      }
    };

    getUser();
  }, []);

  return (
    <nav className="navbar">
      {user && (
        <Link to={`/profile/${user.username}`}>
          {user.profilePicture ? (
            <img src={user.profilePicture} alt="" />
          ) : (
            <span>{user.username?.charAt(0).toUpperCase()}</span>
          )}
        </Link>
      )}
    </nav>
  );
}

export default Navbar;