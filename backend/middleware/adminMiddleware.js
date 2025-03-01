const { User } = require('../database/db');

const adminMiddleware = async (req, res, next) => {
    const userId = req.userId;

    try {
        const user = await User.findById(userId);
        if (!user || !user.isAdmin) {
            return res.status(403).json({
                message: "Access denied. Admin privileges required.",
            });
        }
        next();
    } catch (error) {
        res.status(500).json({
            message: "Error verifying admin status",
            error: error.message,
        });
    }
};

module.exports = { adminMiddleware };