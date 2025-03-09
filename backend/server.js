const express = require('express')
require('dotenv').config() 
const cors = require('cors')
const app = express()

const { connectToDatabase } = require('./database/db')

const authRoutes = require('./routes/authRoutes');
const questRoutes = require('./routes/questRoutes');
const rewardRoutes = require('./routes/rewardRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes')


app.use(cors({
    origin: "http://localhost:3000",
    methods: ['POST', 'GET', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(express.json())


// ROUTES

//backend landing
app.get('/', async(req, res) => {
    res.json({
        message: "Welcome to PolicyPulse!"
    })
})

// main routes
app.use('/', authRoutes);
app.use('/', questRoutes);
app.use('/', rewardRoutes);
app.use('/', userRoutes);
app.use('/', adminRoutes)

connectToDatabase().then(() => {
    const PORT = process.env.PORT || 8000
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server is running on port ${PORT}`)
})
})