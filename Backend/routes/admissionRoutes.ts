import express from 'express';
import type { Role } from '../config/constants';
import {
  listAdmissions,
  getAdmission,
  admitPatient,
  transferPatient,
  dischargePatient
} from '../controllers/wardController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

// Admitting, moving and discharging is ward and front-desk work.
const WARD_STAFF: Role[] = ['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'];

router.get('/', listAdmissions);
router.get('/:id', getAdmission);

router.post('/', authorizeRoles(...WARD_STAFF), admitPatient);
router.post('/:id/transfer', authorizeRoles(...WARD_STAFF), transferPatient);
router.post('/:id/discharge', authorizeRoles(...WARD_STAFF), dischargePatient);

export default router;
