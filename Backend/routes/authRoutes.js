const express = require('express');
const { loginUser, getCurrentUser } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/login', loginUser);
router.get('/me', authenticateToken, getCurrentUser);

module.exports = router;