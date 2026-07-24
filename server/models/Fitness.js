const mongoose = require('mongoose');

const fitnessSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true
  },
  profile: {
    weight: { type: Number },
    height: { type: Number },
    goal: { type: String, enum: ['Lose Weight', 'Build Muscle', 'Get Fit', 'Maintain'] },
    fitnessLevel: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'] },
    environment: { type: String, enum: ['Home', 'Gym', 'Outdoors'] },
    equipment: { type: String, enum: ['None', 'Basic (Dumbbells/Bands)', 'Full Gym'] }
  },
  plan: {
    workoutPlan: { type: mongoose.Schema.Types.Mixed }, // JSON AI generated
    nutritionPlan: { type: mongoose.Schema.Types.Mixed }, // JSON AI generated
    generatedAt: { type: Date }
  },
  chatHistory: [{
    role: { type: String, enum: ['user', 'assistant'] },
    content: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  logs: [{
    date: { type: Date, default: Date.now },
    completedWorkout: { type: Boolean, default: false },
    caloriesConsumed: { type: Number },
    proteinConsumed: { type: Number },
    carbsConsumed: { type: Number },
    fatConsumed: { type: Number },
    notes: { type: String }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Fitness', fitnessSchema);
