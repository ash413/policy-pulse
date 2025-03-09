const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware')
const { User } = require('../database/db')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const z = require('zod'); 

const { signupSchema, loginSchema } = require('../utils/userValidation')

require('dotenv').config()
const SECRET_KEY = process.env.SECRET_KEY

const router = express.Router()


// new user signup
router.post('/auth/signup', async(req, res) => {
    try {

        const validatedData = signupSchema.parse(req.body);
        const { email, password } = validatedData;

        const existingUser = await User.findOne({ email });
        if ( existingUser ) {
            return res.status(400).json({ message: "user already exists." });
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        const user = new User({email, password: hashedPassword})
        await user.save()

        //generate new token
        const token = jwt.sign(
            {id: user._id},
            SECRET_KEY,
            {expiresIn: '3h'}
        );

        return res.status(201).json({
            message: "user registered successfully!",
            token: token
        })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: "validation error", errors: error.errors });
        }

        return res.status(400).json({
            message: "error signing up!",
            error: error.message
        })
    }
})

// user login
router.post('/auth/login', async(req, res) => {
    try {

        const validatedData = loginSchema.parse(req.body);
        const { email, password } = validatedData;

        const user = await User.findOne({ email });
        if (!user){ 
            return res.status(404).json({
                message: "no user with these credentials"
            })
        }

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch){ 
            return res.status(404).json({
                message: "invalid credentials!"
            })
        }

        const token = jwt.sign(
            {id:user._id}, 
            SECRET_KEY, 
            {expiresIn: '3h'}
        )

        return res.json({
            message: "login successful!",
            token: token
        })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: "validation error", errors: error.errors });
        }

        return res.status(400).json({
            message: "Error loging in!",
            error: error.message
        })
    }
})


module.exports = router