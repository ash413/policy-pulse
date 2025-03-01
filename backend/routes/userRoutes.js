const express = require('express');
const { User } = require('../database/db');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();


// get the user profile and progress
router.get('/user/profile', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findById(userId)
            .populate('completedQuests')
            .populate('redeemedRewards');

        res.status(200).json({ user });

    } catch (error) {
        res.status(500).json({ message: "error fetching user profile", error });
    }
});


// update user profile
router.put('/user/profile', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const { name, email } = req.body;

        const user = await User.findByIdAndUpdate(
            userId,
            { name, email },
            { new: true }
        );

        res.status(200).json({ message: "profile updated successfully!", user });

    } catch (error) {
        res.status(500).json({ message: "error updating profile", error });
    }
});


//leaderboard
router.get('/leaderboard', async (req, res) => {
    try {
        const users = await User.find({})
            .sort({ points: -1 })
            .limit(10);

        res.status(200).json({ leaderboard: users });

    } catch (error) {
        res.status(500).json({ message: "error fetching leaderboard", error });
    }
});


module.exports = router;