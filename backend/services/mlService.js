const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

const mlService = {
  async trainModel() {
    try {
      const userActivities = await UserActivity.find({}).lean();
      const users = await User.find({}).select('-password').lean();
      
      const userData = users.map(user => ({
        userId: user._id.toString(),
        age: user.age,
        gender: user.gender,
        pointsBalance: user.points
      }));
      
      const response = await axios.post(`${ML_SERVICE_URL}/train`, {
        userActivities,
        userFeatures: userData
      });
      
      return response.data;
    } catch (error) {
      console.error('Error training model:', error);
      throw error;
    }
  },
  
  async getRecommendations(userId) {
    try {
      const user = await User.findById(userId).lean();
      const allQuests = await Quest.find({ isActive: true }).lean();
      
      const userFeatures = {
        age: user.age || 0,
        gender: user.gender || "unknown",
        pointsBalance: user.points || 0
      };
      
      const completedQuestIds = user.completedQuests.map(id => id.toString());
      
      const response = await axios.post(`${ML_SERVICE_URL}/recommend`, {
        userId,
        userFeatures,
        allQuests,
        completedQuests: completedQuestIds
      });
      
      return response.data.recommendations;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      const fallbackQuests = await Quest.find({ 
        isActive: true,
        _id: { $nin: user.completedQuests } 
      }).limit(5).lean();
      
      return fallbackQuests;
    }
  }
};

module.exports = mlService;