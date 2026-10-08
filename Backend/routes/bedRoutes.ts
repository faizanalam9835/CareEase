import express from 'express';
import { availableBeds, updateBed, deleteBed } from '../controllers/wardController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

// Fixed path first, so `/available` is not captured by `/:id`.
router.get('/available', availableBeds);

router.put('/:id', authorizeRoles('HOSPITAL_ADMIN', 'NURSE'), updateBed);
router.delete('/:id', authorizeRoles('HOSPITAL_ADMIN'), deleteBed);

export default router;
