# ThoughtStream

A simple Twitter-like social platform: MERN + Socket.IO, session-based auth (httpOnly cookie), plain CSS.

```
thoughtstream/
  server/   Express + Mongoose + Socket.IO API
  client/   React (Vite) app
```

## 1. Run it locally

You need Node 18+ and a MongoDB Atlas connection string (free tier is fine; allow your IP under Network Access).

**Backend**

```bash
cd server
cp .env.example .env     # then fill in MONGO_URI
npm install
npm run dev              # http://localhost:5000  (check /api/health)
```

**Frontend**

```bash
cd client
cp .env.example .env     # VITE_API_URL=http://localhost:5000
npm install
npm run dev              # http://localhost:5173
```

### Email (OTP + password reset)

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` in `server/.env`
(Gmail App Password or Mailtrap both work). If `SMTP_HOST` is empty, emails are
**printed in the server console** instead, so you can still log in locally by copying the 6-digit code from there.

### Google login (optional)

1. Google Cloud Console -> APIs & Services -> Credentials -> OAuth client ID (Web application).
2. Add `http://localhost:5173` (and your deployed frontend URL) under Authorized JavaScript origins.
3. Put the Client ID in **both** `server/.env` (`GOOGLE_CLIENT_ID`) and `client/.env` (`VITE_GOOGLE_CLIENT_ID`).

The Google button only appears when `VITE_GOOGLE_CLIENT_ID` is set.

## 2. How auth works

- Login: email + password -> server emails a 6-digit OTP -> `/verify-otp` creates the session.
- A random token is generated; only its **SHA-256 hash** is stored in the `sessions` collection (7-day TTL).
- The raw token is sent as an httpOnly cookie named `session`.
- Dev: `secure:false, sameSite:"lax"`. Production (`NODE_ENV=production`): `secure:true, sameSite:"none"`.
- Socket.IO reads the same cookie during the handshake, so sockets are authenticated too.

## 3. Deploy

**MongoDB Atlas:** create a free cluster, a database user, and allow access from anywhere (`0.0.0.0/0`) so Railway can connect.

**Railway - backend** (root directory: `server`)

| Variable | Value |
|---|---|
| `MONGO_URI` | your Atlas connection string |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | the frontend's public URL, e.g. `https://thoughtstream-client.up.railway.app` (no trailing slash; comma-separate multiple) |
| `GOOGLE_CLIENT_ID` | optional |
| `SMTP_*`, `MAIL_FROM` | required in production for OTP emails |

Start command: `npm start`. Railway provides `PORT`.

**Railway - frontend** (root directory: `client`)

| Variable | Value |
|---|---|
| `VITE_API_URL` | the backend's public URL, e.g. `https://thoughtstream-server.up.railway.app` |
| `VITE_GOOGLE_CLIENT_ID` | optional |

Build command: `npm run build`, start command: `npm start` (serves the build with `vite preview`).
`VITE_*` variables are baked in at **build** time, so redeploy the frontend after changing them.

Both services must use HTTPS (cookies are `secure`). Add the frontend URL to your Google OAuth authorized origins.

## 4. Notes

- Profile and cover images are set by URL (no file upload yet).
- Notifications, Saved, and Settings pages are placeholders; Share and Bookmark icons are visual only.
- `/api/users/forgot-password` returns the `resetToken` in the JSON **only when not in production**.
- Extra (not in the original spec): `GET /api/thoughts?author=<userId>` powers the profile thought list.
