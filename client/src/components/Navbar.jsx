<<<<<<< HEAD
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
=======
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";

import thoughtStreamLogo from "../assets/images/logo.png";

import "../pages/Home";

function Navbar() {
  const [user, setUser] = useState(null);

  const location = useLocation();

  useEffect(() => {
    const getUser = async () => {
      try {
        const response = await axios.get(
          "http://localhost:5000/api/users/me",
          {
            withCredentials: true,
          }
        );
>>>>>>> a257e29c522d71de89eef4b0b227090e19f37dee

        setUser(response.data.user);
      } catch (error) {
        console.error("Failed to load user:", error);
      }
    };

    getUser();
  }, []);

  return (
<<<<<<< HEAD
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
=======
    <aside className="home-sidebar">

      {/* LOGO */}
      <Link to="/" className="brand">
        <img
          src={thoughtStreamLogo}
          alt="ThoughtStream"
          className="brand-logo"
        />

        <span className="brand-name">
          ThoughtStream
        </span>
      </Link>

      <nav className="sidebar-nav" aria-label="Main navigation">

        <Link
          to="/"
          className={`nav-item ${
            location.pathname === "/" ? "active" : ""
          }`}
        >
          <span className="nav-icon">⌂</span>
          <span>Home</span>
        </Link>

        <button className="nav-item" type="button" disabled>
          <span className="nav-icon">⌕</span>
          <span>Explore</span>
          <span className="nav-soon">Soon</span>
        </button>

        <button className="nav-item" type="button" disabled>
          <span className="nav-icon">✉</span>
          <span>Messages</span>
          <span className="nav-soon">Soon</span>
        </button>

        <button className="nav-item" type="button" disabled>
          <span className="nav-icon">♧</span>
          <span>Notifications</span>
          <span className="nav-soon">Soon</span>
        </button>

        <button className="nav-item" type="button" disabled>
          <span className="nav-icon">▱</span>
          <span>Bookmarks</span>
          <span className="nav-soon">Soon</span>
        </button>

        {user?.username ? (
          <Link
            to={`/profile/${encodeURIComponent(user.username)}`}
            className={`nav-item ${
              location.pathname.startsWith("/profile/")
                ? "active"
                : ""
            }`}
          >
            <span className="nav-icon">♙</span>
            <span>Profile</span>
          </Link>
        ) : (
          <button className="nav-item" type="button" disabled>
            <span className="nav-icon">♙</span>
            <span>Profile</span>
          </button>
        )}

      </nav>

      <div className="sidebar-bottom">

        {user?.username && (
          <Link
            to={`/profile/${encodeURIComponent(user.username)}`}
            className="sidebar-user"
          >

            <div className="user-avatar">
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt=""
                />
              ) : (
                (
                  user?.fullName ||
                  user?.username ||
                  "U"
                )
                  .charAt(0)
                  .toUpperCase()
              )}
            </div>

            <div className="sidebar-user-info">
              <strong>
                {user?.fullName ||
                  user?.username ||
                  "User"}
              </strong>

              <span>
                @{user.username}
              </span>
            </div>

          </Link>
        )}

      </div>

    </aside>
>>>>>>> a257e29c522d71de89eef4b0b227090e19f37dee
  );
}

export default Navbar;