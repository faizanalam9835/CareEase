const express = require('express');
const { createUser, getAllUsers, getUserById, updateUser ,deleteUser } = require('../controllers/userController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Only Hospital Admin can create users
router.post('/', authenticateToken, authorizeRoles('HOSPITAL_ADMIN'), createUser);

// Hospital Admin can see all users, others see limited info
router.get('/', authenticateToken, getAllUsers);

// Get specific user
router.get('/:id', authenticateToken, getUserById);

// Update user
router.put('/:id', authenticateToken, authorizeRoles('HOSPITAL_ADMIN'), updateUser);

router.delete('/:id', authenticateToken, authorizeRoles('HOSPITAL_ADMIN'), deleteUser);

module.exports = router;