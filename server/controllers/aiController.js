const Groq = require('groq-sdk');
const ai = new Groq({ apiKey: process.env.GROQ_API_KEY });
const Habit = require('../models/Habit');
const Task = require('../models/Task');
const Goal = require('../models/Goal');
const Expense = require('../models/Expense');

exports.processCommand = async (req, res) => {
  try {
    const { command } = req.body;
    const userId = req.user.id;

    if (!command) {
      return res.status(400).json({ success: false, message: 'No command provided' });
    }

    const prompt = `You are "Sage", an elite global AI assistant for a productivity and fitness app called ProductiveX.
The user just said this to you: "${command}"

Your job is to parse their intent and return a STRICT JSON object telling the frontend what to do.
The JSON must have this exact structure:
{
  "action": "NAVIGATE" | "ADD_HABIT" | "ADD_TASK" | "ADD_GOAL" | "ADD_EXPENSE" | "START_POMODORO" | "PAUSE_POMODORO" | "RESET_POMODORO" | "EDIT_FITNESS" | "CHAT" | "ERROR",
  "payload": {
    // For NAVIGATE: { "tab": "dashboard" | "tasks" | "habits" | "pomodoro" | "fitness" | "goals" }
    // For ADD_HABIT: { "name": "habit name", "frequency": "Daily" | "Weekly" }
    // For ADD_TASK: { "title": "task title" }
    // For ADD_GOAL: { "title": "goal title" }
    // For ADD_EXPENSE: { "amount": number, "category": "category name", "type": "Expense" | "Income", "description": "optional description" }
    // For START_POMODORO: { "minutes": number }
    // For EDIT_FITNESS: { "prompt": "the user's request regarding their workout or nutrition" }
    // For CHAT: {} (Leave empty, put your response in the top-level "message" field below)
  },
  "message": "A short, friendly conversational response acknowledging what you just did, OR your full conversational reply if action is CHAT. Always populate this field!"
}

Rules:
- If they ask to go somewhere, use NAVIGATE.
- If they ask to add a habit, use ADD_HABIT.
- If they ask to add a task, use ADD_TASK.
- If they ask to add a goal, use ADD_GOAL.
- If they ask to add an expense or income, use ADD_EXPENSE.
- If they ask to set a timer or start focus or resume, use START_POMODORO.
- If they ask to pause or stop the timer, use PAUSE_POMODORO.
- If they ask to reset the timer, use RESET_POMODORO.
- If they ask to change or edit their workout, fitness, or nutrition plan, use EDIT_FITNESS.
- If it's a general question or greeting (e.g. "Hey Sage", "How are you"), use CHAT.
- Be concise.
`;

    let responseJSON;
    try {
      const response = await ai.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' }
      });

      let responseText = response.choices[0].message.content;
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      responseJSON = JSON.parse(responseText);
    } catch (aiError) {
      console.error('Groq AI Parse Error:', aiError);
      return res.status(500).json({ success: false, message: 'AI failed to parse command.' });
    }

    // Execute backend logic based on intent
    const action = responseJSON.action;
    const payload = responseJSON.payload || {};
    
    if (action === 'ADD_HABIT') {
      const newHabit = new Habit({
        user: userId,
        name: payload.name || 'New Habit',
        frequency: payload.frequency || 'Daily'
      });
      await newHabit.save();
    } else if (action === 'ADD_TASK') {
      const newTask = new Task({
        user: userId,
        title: payload.title || 'New Task',
        status: 'To Do'
      });
      await newTask.save();
    } else if (action === 'ADD_GOAL') {
      const newGoal = new Goal({
        user: userId,
        title: payload.title || 'New Goal',
        deadline: new Date(new Date().setMonth(new Date().getMonth() + 1)) // default 1 month
      });
      await newGoal.save();
    } else if (action === 'ADD_EXPENSE') {
      const newExpense = new Expense({
        user: userId,
        amount: payload.amount || 0,
        category: payload.category || 'General',
        type: payload.type || 'Expense',
        description: payload.description || ''
      });
      await newExpense.save();
    }
    
    res.status(200).json({ 
      success: true, 
      data: responseJSON 
    });

  } catch (error) {
    console.error('AI Controller Error:', error);
    res.status(500).json({ success: false, message: 'Server error processing AI command.' });
  }
};
