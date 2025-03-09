const express = require('express')
const { authMiddleware } = require('../middleware/authMiddleware')
const { adminMiddleware } = require('../middleware/adminMiddleware');
const { Reward, User } = require('../database/db')

const router = express.Router()


//get all active rewards
router.get('/rewards', authMiddleware, async(req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findById(userId);

        const rewards = await Reward.find({ 
            isActive: true,
            _id: { $nin: user.redeemedRewards } 
        });

        res.status(200).json({ rewards });

    } catch (error) {
        res.status(500).json({ message: "error fetching rewards", error });
    }
})


//post new reward - ADMIN ONLY 
router.post('/rewards', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { title, description, pointsRequired } = req.body;
        const reward = new Reward({ title, description, pointsRequired });
        await reward.save();

        res.status(201).json({
            message: "reward created successfully!", 
            reward
        });

    } catch (error) {
        res.status(500).json({ message: "error creating reward", error });
    }
})


// redeem reward for user 
router.post('/rewards/redeem', authMiddleware, async(req, res) => {
    try {
        const { rewardId } = req.body;
        const userId = req.userId;

        const reward = await Reward.findById(rewardId);
        if (!reward) {
            return res.status(404).json({ message: "reward not found" });
        }

        const user = await User.findById(userId);
        if (user.points < reward.pointsRequired) {
            return res.status(400).json({ message: "not enough points to redeem this reward" });
        }

        user.points -= reward.pointsRequired;
        user.redeemedRewards.push(rewardId);
        await user.save();

        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(200).json({ 
            message: "reward redeemed successfully!", 
            user: userResponse 
        });

    } catch (error) {
        res.status(500).json({ 
            message: "error redeeming reward", 
            error: error.message
        });
    }
})


module.exports = router;