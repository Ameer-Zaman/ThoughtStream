require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db");

const userRouter = require("./routes/userRoute");
const thoughtRouter = require("./routes/thoughtRoute");
const commmentRoutes = require("./routes/commentRoutes");
const likeRoutes = require("./routes/likeRoutes");
const followRoutes = require("./routes/followRoutes");
const messageRoutes = require("./routes/messageRoutes");
const searchRoutes = require("./routes/searchRoutes");

const registerSocketHandlers = require("./socket/socketHandler");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(cookieParser());

const PORT = 5000;
connectDB();

app.use(express.json());

app.use("/api/users", userRouter);
app.use("/api/thoughts", thoughtRouter);
app.use("/api/comments", commmentRoutes);
app.use("/api/likes", likeRoutes);
app.use("/api/follows", followRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/search", searchRoutes);

// ---------------------------------------------------------
// Socket.IO setup
// ---------------------------------------------------------

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

registerSocketHandlers(io);

// ---------------------------------------------------------
// Start
// ---------------------------------------------------------

server.listen(PORT, () => {
  console.log(`Server working on port ${PORT}`);
});