const mongoose = require("mongoose");

const passwordResetTokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    tokenHash: {
        type: String,
        required: true
    },

    expiresAt: {
        type: Date,
        required: true
    }
}, {
    timestamps: true
});

const PasswordResetToken = mongoose.model(
    "PasswordResetToken",
    passwordResetTokenSchema
);

module.exports = PasswordResetToken;