const mongoose = require('mongoose')
require("dotenv").config()

const connectToDatabase = async() => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Database connected!")
    } catch (error) {
        console.log("Error connecting to database", error)
        process.exit(1)
    }
}

const userSchema = new mongoose.Schema({
    name: String,
    username: {type: String, required: true, unique: true},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    points: {type: Number, default: 0}
}, {timestamps: true})

const User = mongoose.model('User', userSchema)


const questSchema = new mongoose.Schema({
    title: {type: String, required: true},
    description: String,
    points: {type: Number, required: true},
    type: {type: String, enum: ['daily', 'weekly', 'monthly'], required: true},
    isActive: {type: Boolean, default: true}
}, {timestamps: true})

const Quest = mongoose.model('Quest', questSchema)


const rewardSchema = new mongoose.Schema({
    title: {type: String, required: true},
    description: String,
    pointsRequired: { type: Number, required: true }, // Points required to redeem the reward
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

const Reward = mongoose.model('Reward', rewardSchema)


module.exports = {
    connectToDatabase,
    User,
    Quest,
    Reward
}