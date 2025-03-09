const express = require('express');
const { User } = require('../database/db');
const { adminMiddleware } = require('../middleware/adminMiddleware');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/admin/profile', authMiddleware, adminMiddleware, async(req, res) => {
    try {
        const admin = await User.find({ isAdmin: true })
                        .select('-password');
        res.status(200).json({ admin });
    } catch (error) {
        res.status(500).json({ 
            message: "Error fetching users", 
            error: error.message 
        });
    }
})

module.exports = router;