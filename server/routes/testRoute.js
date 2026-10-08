const express = require("express");

const authMiddleware = require("../middleware/userMiddleware");

const router = express.Router();

router.get("/test", (req, res) => {
    return res.status(200).json({
        message: "The Route is working"
    });
});

router.get("/protected", authMiddleware, (req, res) => {

    return res.status(200).json({
        message: "You are authenticated",
        user: req.user
    });

});

module.exports = router;