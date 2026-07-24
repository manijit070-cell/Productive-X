const express = require('express');
const router = express.Router();
const { getFitnessData, updateProfile, generatePlan, logProgress, editPlan } = require('../controllers/fitnessController');
const { protect } = require('../middleware/auth');

router.route('/profile')
  .get(protect, getFitnessData)
  .post(protect, updateProfile);

router.post('/generate', protect, generatePlan);
router.post('/log', protect, logProgress);
router.post('/edit', protect, editPlan);

module.exports = router;
