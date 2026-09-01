const express = require('express');
const {
  createUser,
  getAllUsers,
  getDoctors,
  getUserById,
  updateUser,
  resetUserPassword,
  deleteUser
} = require('../controllers/userController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// Every signed-in user needs the doctor list to book appointments.
router.get('/doctors', getDoctors);

router.get('/', getAllUsers);
router.get('/:id', getUserById);

router.post('/', authorizeRoles('HOSPITAL_ADMIN'), createUser);
router.put('/:id', authorizeRoles('HOSPITAL_ADMIN'), updateUser);
router.post('/:id/reset-password', authorizeRoles('HOSPITAL_ADMIN'), resetUserPassword);
router.delete('/:id', authorizeRoles('HOSPITAL_ADMIN'), deleteUser);

module.exports = router;
