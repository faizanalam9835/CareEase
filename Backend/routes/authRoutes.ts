import express from 'express';
import {
  login,
  getCurrentUser,
  updateProfile,
  changePassword,
  refresh,
  getDemoCredentials
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Public
router.post('/login', login);
router.post('/refresh', refresh);
router.get('/demo-credentials', getDemoCredentials);

// Authenticated
router.get('/me', authenticateToken, getCurrentUser);
router.put('/me', authenticateToken, updateProfile);
router.post('/change-password', authenticateToken, changePassword);

export default router;
