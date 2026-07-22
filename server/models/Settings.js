const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  darkMode: {
    type: Boolean,
    default: true
  },
  notificationsEnabled: {
    type: Boolean,
    default: true
  },
  pomodoroWorkTime: {
    type: Number,
    default: 25
  },
  pomodoroBreakTime: {
    type: Number,
    default: 5
  }
});

module.exports = mongoose.model('Settings', SettingsSchema);
