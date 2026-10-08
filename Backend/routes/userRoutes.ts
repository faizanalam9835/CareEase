import express from 'express';
import {
  createUser,
  getAllUsers,
  getDoctors,
  getUserById,
  updateUser,
  resetUserPassword,
  deleteUser
} from '../controllers/userController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

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

export default router;
