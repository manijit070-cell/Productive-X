const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = require('./server/models/User');
  const user = await User.findOne({});
  const Fitness = require('./server/models/Fitness');
  
  let fitnessData = await Fitness.findOne({ user: user._id });
  
  // Mock AI response
  let aiResponseJSON = {
    nutrition: { dailyCalories: 2000, proteinGrams: 150, carbsGrams: 200, fatGrams: 70 },
    workoutPlan: [
      { day: "Monday", focus: "Full Body Strength", exercises: ["Squats 3x10"] }
    ]
  };

  try {
    fitnessData.plan = {
      workoutPlan: aiResponseJSON.workoutPlan,
      nutritionPlan: aiResponseJSON.nutrition,
      generatedAt: new Date()
    };
    fitnessData.chatHistory = [{
      role: 'assistant',
      content: "Hi! I'm your AI Coach."
    }];
    await fitnessData.save();
    console.log("Successfully saved!");
  } catch (err) {
    console.log("Validation Error:", err.message);
  }
  process.exit();
});
