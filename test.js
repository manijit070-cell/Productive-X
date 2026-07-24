const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = require('./server/models/User');
  
  try {
    const email = "manijit070@gmail.com";
    const password = "password"; // irrelevant what the password is
    
    const user = await User.findOne({ email }).select('+password');
    console.log("User:", user.email);
    console.log("Match:", await user.matchPassword(password));
    console.log("Token:", jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' }));
    console.log("Success!");
  } catch (error) {
    console.error("Login Error in Test:", error);
  }
  process.exit();
});
