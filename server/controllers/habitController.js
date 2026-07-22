const Habit = require('../models/Habit');

exports.getHabits = async (req, res) => {
  try {
    const habits = await Habit.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: habits });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createHabit = async (req, res) => {
  try {
    req.body.user = req.user._id;
    const habit = await Habit.create(req.body);
    res.status(201).json({ success: true, data: habit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateHabit = async (req, res) => {
  try {
    let habit = await Habit.findById(req.params.id);
    if (!habit) return res.status(404).json({ success: false, message: 'Habit not found' });
    if (habit.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    habit = await Habit.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, data: habit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteHabit = async (req, res) => {
  try {
    const habit = await Habit.findById(req.params.id);
    if (!habit) return res.status(404).json({ success: false, message: 'Habit not found' });
    if (habit.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    await habit.deleteOne();
    res.json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
