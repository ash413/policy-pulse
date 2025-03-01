const jwt = require('jsonwebtoken');
require('dotenv').config()
const SECRET_KEY = process.env.SECRET_KEY

const authMiddleware = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // extract token from bearer
    if (!token) {
        return res.status(401).json({
            message: "No token found!"
        });
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(403).json({
                error: "Invalid token",
                err
            });
        }
        req.userId = decoded.id;
        next();
    })
}

module.exports = {
    authMiddleware
}