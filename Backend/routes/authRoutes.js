const express = require('express');
const {
  login,
  getCurrentUser,
  updateProfile,
  changePassword,
  refresh,
  getDemoCredentials
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Public
router.post('/login', login);
router.post('/refresh', refresh);
router.get('/demo-credentials', getDemoCredentials);

// Authenticated
router.get('/me', authenticateToken, getCurrentUser);
router.put('/me', authenticateToken, updateProfile);
router.post('/change-password', authenticateToken, changePassword);

module.exports = router;
