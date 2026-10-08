import express from 'express';
import type { Role } from '../config/constants';
import {
  listWards,
  getWard,
  createWard,
  updateWard,
  deleteWard,
  addBed
} from '../controllers/wardController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

// Anyone clinical needs to see where the beds are; only admins reshape the ward.
const WARD_MANAGERS: Role[] = ['HOSPITAL_ADMIN'];

router.get('/', listWards);
router.get('/:id', getWard);

router.post('/', authorizeRoles(...WARD_MANAGERS), createWard);
router.put('/:id', authorizeRoles(...WARD_MANAGERS), updateWard);
router.delete('/:id', authorizeRoles(...WARD_MANAGERS), deleteWard);

router.post('/:id/beds', authorizeRoles(...WARD_MANAGERS), addBed);

export default router;
