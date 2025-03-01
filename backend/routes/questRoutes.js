const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { adminMiddleware } = require('../middleware/adminMiddleware');
const { Quest, User } = require('../database/db');

const router = express.Router();

//get all quests
router.get('/quests', async(req, res) => {
    try {
        const quests = await Quest.find({isActive: true})
        res.status(200).json({ quests });
    } catch (error) {
        res.status(500).json({ message: "Error fetching quests", error });
    }
})


//post a quest - ADMIN ONLY 
router.post('/quests', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { title, description, points, type } = req.body;
        const quest = new Quest({ title, description, points, type });
        await quest.save();
        res.status(201).json({
            message: "Quest posted succesfully!",
            quest
        });
    } catch (error) {
        res.status(500).json({ message: "Error posting new quest", error });
    }
})


// mark quest complete for user
router.post('/quests/completed', authMiddleware, async(req, res) => {
    try {
        const { questId } = req.body;
        const userId = req.userId;
        
        const quest = await Quest.findById(questId);
        if (!quest){
            return res.status(404).json({ message: "Quest not found" });
        }

        const user = await User.findById(userId);
        user.points += quest.points;
        user.completedQuests.push(questId);
        await user.save();

        res.status(200).json({
            message: "Quest completed successfully!",
            user
        })

    } catch (error) {
        res.status(500).json({ message: "Error marking quest complete", error });
    }
})


// show completed quests by user
router.get('/quests/user', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findById(userId).populate('completedQuests');
        res.status(200).json({ completedQuests: user.completedQuests });
    } catch (error) {
        res.status(500).json({ message: "Error fetching user quests", error });
    }
});



module.exports = router;