const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String },
    googleId: { type: String, unique: true, sparse: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isActive: { type: Boolean, default: true },
    profilePicture: { type: String, default: "" },
    coverImage: { type: String, default: "" },
    bio: { type: String, maxlength: 160, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
