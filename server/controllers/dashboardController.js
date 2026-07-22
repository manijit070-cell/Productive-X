const Task = require('../models/Task');
const Expense = require('../models/Expense');
const Goal = require('../models/Goal');
const Habit = require('../models/Habit');

exports.getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get today's start and end date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Tasks summary
    const todayTasks = await Task.find({ user: userId, dueDate: { $gte: today, $lt: tomorrow } });
    const pendingTasks = await Task.countDocuments({ user: userId, status: { $ne: 'Completed' } });
    
    // Expenses summary
    const expenses = await Expense.find({ user: userId });
    let totalIncome = 0;
    let totalExpense = 0;
    expenses.forEach(exp => {
      if (exp.type === 'Income') totalIncome += exp.amount;
      else totalExpense += exp.amount;
    });

    // Goals progress
    const activeGoals = await Goal.find({ user: userId, completed: false }).sort({ deadline: 1 }).limit(3);

    // Habits streak
    const habits = await Habit.find({ user: userId });

    res.json({
      success: true,
      data: {
        todayTasks,
        pendingTasks,
        finance: {
          totalIncome,
          totalExpense,
          balance: totalIncome - totalExpense
        },
        activeGoals,
        habits
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
