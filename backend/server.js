const express = require('express')
require('dotenv').config() 
const cors = require('cors')
const app = express()

const { connectToDatabase } = require('./db/db')


app.use(cors({
    origin: [
        'http://localhost:3000'
    ],
    methods: ['POST', 'GET', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(express.json())


// ROUTES
app.get('/', async(req, res) => {
    res.json({
        message: "Welcome to PolicyPulse!"
    })
})


connectToDatabase().then(() => {
    const PORT = process.env.PORT || 8000
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server is running on port ${PORT}`)
})
})