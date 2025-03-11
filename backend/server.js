const express = require('express')
require('dotenv').config() 
const cors = require('cors')
const app = express()
const cron = require('node-cron')
const axios = require('axios')

const { connectToDatabase } = require('./database/db')
const mlService = require('./services/mlService')

const authRoutes = require('./routes/authRoutes');
const questRoutes = require('./routes/questRoutes');
const rewardRoutes = require('./routes/rewardRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes')

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

app.use(cors({
    origin: "http://localhost:3000",
    methods: ['POST', 'GET', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(express.json())

// ML Service Health Check
const checkMLServiceHealth = async () => {
    try {
      await axios.get(`${ML_SERVICE_URL}/docs`);
      console.log('ML service is running');
      return true;
    } catch (error) {
      console.error('ML service is not available:', error.message);
      return false;
    }
};

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

// Schedule model training (once per day at 2 AM)
cron.schedule('0 2 * * *', async () => {
    console.log('Running scheduled ML model training...');
    try {
      const isMLServiceHealthy = await checkMLServiceHealth();
      if (isMLServiceHealthy) {
        await mlService.trainModel();
        console.log('ML model training completed successfully');
      } else {
        console.error('ML model training skipped - service not available');
      }
    } catch (error) {
      console.error('ML model training failed:', error.message);
    }
  });

connectToDatabase().then(() => {
    const PORT = process.env.PORT || 2000
    app.listen(PORT, '0.0.0.0', async () => {
        console.log(`Server is running on port ${PORT}`)

        // Check ML service when server starts
        const isMLServiceHealthy = await checkMLServiceHealth();
        if (!isMLServiceHealthy) {
            console.warn('⚠️ ML recommendation service is not available. Personalized recommendations will be unavailable.');
        } else {
            console.log('✅ ML recommendation service is connected.');
        }
})
})