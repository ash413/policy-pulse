const express = require('express')
const { authMiddleware } = require('../middleware/authMiddleware')
const { User } = require('../database/db')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

require('dotenv').config()
const SECRET_KEY = process.env.SECRET_KEY

const router = express.Router()


// new user signup
router.post('/auth/signup', async(req, res) => {
    try {
        const { name, email, username, password } = req.body
        if (!name ||!email|| !username || !password){
            return res.status(400).json({
                message: "All fields are required."
            })
        }
        const existingUser = await User.findOne({ email }, { username } );
        if ( existingUser ) {
            return res.status(400).json({ message: "User already exists." });
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        const user = new User({name, email, username, password: hashedPassword})
        await user.save()
        return res.status(201).json({
            message: "User registered successfully!"
        })
    } catch (error) {
        return res.status(400).json({
            message: "Error signing up!",
            error: error.message
        })
    }
})

// user login
router.post('/auth/login', async(req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user){ 
            return res.status(404).json({
                message: "No user with these credentials"
            })
        }
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch){ 
            return res.status(404).json({
                message: "Invalid credentials!"
            })
        }
        const token = jwt.sign(
            {id:user._id, username: user.username}, 
            SECRET_KEY, 
            {expiresIn: '3h'}
        )
        return res.json({
            message: "Login successful!",
            token: token
        })
    } catch (error) {
        return res.status(400).json({
            message: "Error loging in!",
            error: error.message
        })
    }
})


module.exports = router