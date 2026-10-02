const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getUserProfile, sendOtp, verifyOtp } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.get('/profile', protect, getUserProfile);

module.exports = router;
