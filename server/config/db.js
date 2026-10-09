const mongoose = require("mongoose");

module.exports = async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is not set. Copy .env.example to .env and fill it in.");
  }

  mongoose.connection.on("disconnected", () => console.warn("MongoDB disconnected"));
  mongoose.connection.on("reconnected", () => console.log("MongoDB reconnected"));
  mongoose.connection.on("error", (err) => console.error("MongoDB error:", err.message));

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000, // fail fast with a clear error if Atlas can't be reached
    connectTimeoutMS: 10000,
    // If a connection goes silent (Wi-Fi/router/ISP drops idle connections), give up after 15s
    // and let the driver retry on a fresh connection, instead of hanging for 45s+.
    socketTimeoutMS: 15000,
    maxPoolSize: 10,
    minPoolSize: 0,
    maxIdleTimeMS: 30000, // recycle idle connections before a router can silently drop them
  });
  console.log("Connected to MongoDB:", mongoose.connection.host);
};
