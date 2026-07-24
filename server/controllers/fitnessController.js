const Fitness = require('../models/Fitness');
const { Groq } = require('groq-sdk');

// Helper to initialize Groq (checks if key exists)
const getGroqClient = () => {
  if (process.env.GROQ_API_KEY) {
    return new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return null;
};

// @desc    Get fitness profile and plan
// @route   GET /api/fitness
// @access  Private
const getFitnessData = async (req, res) => {
  try {
    let fitnessData = await Fitness.findOne({ user: req.user._id });
    if (!fitnessData) {
      fitnessData = await Fitness.create({ user: req.user._id, profile: {}, logs: [] });
    }
    res.status(200).json({ success: true, data: fitnessData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update fitness profile
// @route   POST /api/fitness/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { weight, height, goal, fitnessLevel, environment, equipment } = req.body;
    
    let fitnessData = await Fitness.findOne({ user: req.user._id });
    if (!fitnessData) {
      fitnessData = new Fitness({ user: req.user._id });
    }
    
    fitnessData.profile = { weight, height, goal, fitnessLevel, environment, equipment };
    await fitnessData.save();
    
    res.status(200).json({ success: true, data: fitnessData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate AI fitness plan
// @route   POST /api/fitness/generate
// @access  Private
const generatePlan = async (req, res) => {
  try {
    const fitnessData = await Fitness.findOne({ user: req.user._id });
    if (!fitnessData || !fitnessData.profile.goal) {
      return res.status(400).json({ success: false, message: 'Please complete your profile first' });
    }

    const ai = getGroqClient();
    
    let aiResponseJSON;
    
    if (ai) {
      try {
        // Use Real AI
        const prompt = `You are an elite, science-based personal trainer and biomechanics expert.
        Create a highly optimal, customized 7-day workout plan and daily nutrition targets for a user with this profile:
        - Weight: ${fitnessData.profile.weight} kg
        - Height: ${fitnessData.profile.height} cm
        - Goal: ${fitnessData.profile.goal}
        - Fitness Level: ${fitnessData.profile.fitnessLevel}
        - Environment: ${fitnessData.profile.environment}
        - Equipment Available: ${fitnessData.profile.equipment}
        
        CRITICAL RULES FOR WORKOUT GENERATION:
        1. Biomechanical Accuracy: If you assign a specific split (e.g., "Chest and Triceps"), EVERY exercise that day MUST strictly target those muscles. Do NOT put shoulder exercises (like lateral raises) on a pure Chest/Tricep day unless it is explicitly a "Push" day.
        2. Comprehensive Targeting: Ensure you target all functional parts of a muscle group. For example, for chest, include exercises for upper (incline), middle (flat), and lower chest (decline/dips/high-to-low flies). For back, include both vertical and horizontal pulls.
        3. Equipment Strictness: You MUST strictly adhere to the user's environment and equipment. If they have 'None', provide ONLY bodyweight exercises.
        4. Optimal Volume: Ensure the sets and reps align with their specific goal (hypertrophy vs strength vs endurance).
        
        Respond strictly in JSON format matching this exact structure:
        {
          "nutrition": {
            "dailyCalories": number,
            "proteinGrams": number,
            "carbsGrams": number,
            "fatGrams": number
          },
          "workoutPlan": [
            {
              "day": "Monday",
              "focus": "String",
              "exercises": ["Exercise 1 (Sets x Reps)", "Exercise 2"]
            }
          ]
        }`;

        const response = await ai.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: 'llama-3.3-70b-versatile',
          response_format: { type: 'json_object' }
        });

        let responseText = response.choices[0].message.content;
        // Strip markdown code blocks if present
        responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        aiResponseJSON = JSON.parse(responseText);
      } catch (geminiError) {
        console.error('Gemini API Error, falling back to mock:', geminiError.message);
        aiResponseJSON = null; // trigger fallback below
      }
    }
    
    if (!aiResponseJSON) {
      // Mock AI Response
      aiResponseJSON = {
        nutrition: {
          dailyCalories: fitnessData.profile.goal === 'Lose Weight' ? 1800 : 2500,
          proteinGrams: 150,
          carbsGrams: 200,
          fatGrams: 70
        },
        workoutPlan: [
          { day: "Monday", focus: "Full Body Strength", exercises: ["Squats 3x10", "Pushups 3x15", "Plank 3x60s"] },
          { day: "Tuesday", focus: "Cardio", exercises: ["30 min light jog", "Stretching"] },
          { day: "Wednesday", focus: "Rest", exercises: ["Active Recovery / Yoga"] },
          { day: "Thursday", focus: "Upper Body", exercises: ["Pull-ups 3x8", "Dumbbell Press 3x12"] },
          { day: "Friday", focus: "Lower Body", exercises: ["Lunges 3x12", "Deadlifts 3x10"] },
          { day: "Saturday", focus: "HIIT", exercises: ["20 min interval sprints"] },
          { day: "Sunday", focus: "Rest", exercises: ["Rest and recover"] }
        ]
      };
    }

    fitnessData.plan = {
      workoutPlan: aiResponseJSON.workoutPlan,
      nutritionPlan: aiResponseJSON.nutrition,
      generatedAt: new Date()
    };
    
    // Clear chat history when generating a brand new plan
    fitnessData.chatHistory = [{
      role: 'assistant',
      content: "Hi! I'm your AI Coach. I just generated your new plan. Let me know if you need any adjustments or have any questions!"
    }];
    
    await fitnessData.save();

    res.status(200).json({ success: true, data: fitnessData });
  } catch (error) {
    console.error('AI Generation Error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate plan. Please try again.' });
  }
};

// @desc    Log daily progress
// @route   POST /api/fitness/log
// @access  Private
const logProgress = async (req, res) => {
  try {
    const { completedWorkout, caloriesConsumed, notes } = req.body;
    
    let fitnessData = await Fitness.findOne({ user: req.user._id });
    if (!fitnessData) {
      return res.status(404).json({ success: false, message: 'Fitness data not found' });
    }

    // Check if log exists for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingLogIndex = fitnessData.logs.findIndex(log => {
      const logDate = new Date(log.date);
      logDate.setHours(0,0,0,0);
      return logDate.getTime() === today.getTime();
    });

    if (existingLogIndex >= 0) {
      // Update today's log
      if (completedWorkout !== undefined) fitnessData.logs[existingLogIndex].completedWorkout = completedWorkout;
      if (caloriesConsumed !== undefined) fitnessData.logs[existingLogIndex].caloriesConsumed = caloriesConsumed;
      if (req.body.proteinConsumed !== undefined) fitnessData.logs[existingLogIndex].proteinConsumed = req.body.proteinConsumed;
      if (req.body.carbsConsumed !== undefined) fitnessData.logs[existingLogIndex].carbsConsumed = req.body.carbsConsumed;
      if (req.body.fatConsumed !== undefined) fitnessData.logs[existingLogIndex].fatConsumed = req.body.fatConsumed;
      if (notes) fitnessData.logs[existingLogIndex].notes = notes;
    } else {
      // Create new log
      fitnessData.logs.push({
        date: new Date(),
        completedWorkout,
        caloriesConsumed,
        proteinConsumed: req.body.proteinConsumed,
        carbsConsumed: req.body.carbsConsumed,
        fatConsumed: req.body.fatConsumed,
        notes
      });
    }

    await fitnessData.save();
    res.status(200).json({ success: true, data: fitnessData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Edit AI fitness plan
// @route   POST /api/fitness/edit
// @access  Private
const editPlan = async (req, res) => {
  try {
    const { prompt: userPrompt } = req.body;
    const fitnessData = await Fitness.findOne({ user: req.user._id });
    
    if (!fitnessData || !fitnessData.plan.workoutPlan) {
      return res.status(400).json({ success: false, message: 'No active plan to edit.' });
    }

    const ai = getGroqClient();
    if (!ai) {
      return res.status(400).json({ success: false, message: 'Real AI API Key required for dynamic editing.' });
    }

    const currentPlan = JSON.stringify(fitnessData.plan);
    const profile = JSON.stringify(fitnessData.profile);
    
    // Add user message to history
    fitnessData.chatHistory.push({ role: 'user', content: userPrompt });

    // Format chat history for Groq
    const groqMessages = [
      {
        role: 'system',
        content: `You are an elite, highly interactive AI Personal Trainer. Your client's profile is: ${profile}.
        Their current active plan is: ${currentPlan}.
        
        You are having a conversation with them. 
        - If they ask for advice or clarification, provide a helpful, natural language response.
        - If they request a change to their workout or nutrition plan, adjust the plan using sports science and biomechanics.
        
        You MUST respond STRICTLY with a JSON object in this exact format:
        {
          "message": "Your conversational response here. Keep it friendly and concise.",
          "planUpdated": boolean,
          "newPlan": {
            "nutrition": { "dailyCalories": number, "proteinGrams": number, "carbsGrams": number, "fatGrams": number },
            "workoutPlan": [ { "day": "Monday", "focus": "...", "exercises": ["..."] } ]
          }
        }
        
        If you did NOT update the plan, set "planUpdated" to false, and "newPlan" to null.
        If you DID update the plan, set "planUpdated" to true, and provide the ENTIRE 7-day plan in "newPlan", including the nutrition.`
      }
    ];

    // Add previous conversation
    fitnessData.chatHistory.slice(0, -1).forEach(msg => {
      groqMessages.push({ role: msg.role, content: msg.content });
    });
    
    // Add current user prompt
    groqMessages.push({ role: 'user', content: userPrompt });

    let responseJSON = null;

    try {
      const response = await ai.chat.completions.create({
        messages: groqMessages,
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' }
      });

      let responseText = response.choices[0].message.content;
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      responseJSON = JSON.parse(responseText);
    } catch (aiError) {
      console.error('Groq API Error during edit, falling back to mock:', aiError.message);
      responseJSON = {
        message: "I am currently running in offline mock mode, but I have simulated an update to your plan! (Days reversed).",
        planUpdated: true,
        newPlan: {
          nutrition: fitnessData.plan.nutritionPlan || { dailyCalories: 2000, proteinGrams: 150, carbsGrams: 200, fatGrams: 60 },
          workoutPlan: [...fitnessData.plan.workoutPlan].reverse()
        }
      };
    }

    // Add AI response to history
    fitnessData.chatHistory.push({ role: 'assistant', content: responseJSON.message });

    // Update plan if AI changed it
    if (responseJSON.planUpdated && responseJSON.newPlan && responseJSON.newPlan.workoutPlan) {
      fitnessData.plan = {
        workoutPlan: responseJSON.newPlan.workoutPlan,
        nutritionPlan: responseJSON.newPlan.nutrition,
        generatedAt: new Date()
      };
    }
    
    await fitnessData.save();
    res.status(200).json({ success: true, data: fitnessData });
  } catch (error) {
    console.error('AI Edit Error:', error);
    res.status(500).json({ success: false, message: 'Failed to chat with coach. Please ensure your Groq key is working.' });
  }
};

module.exports = {
  getFitnessData,
  updateProfile,
  generatePlan,
  logProgress,
  editPlan
};
