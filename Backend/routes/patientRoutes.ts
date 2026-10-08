import express from 'express';
import {
  registerPatient,
  getAllPatients,
  getPatientById,
  updatePatient,
  dischargePatient,
  deletePatient
} from '../controllers/patientController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { departmentAccessControl } from '../middleware/abac';
import { recordVitals, listVitals } from '../controllers/vitalsController';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getAllPatients);
router.get('/:id', getPatientById);

router.post(
  '/',
  authorizeRoles('HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'),
  departmentAccessControl,
  registerPatient
);

router.put(
  '/:id',
  authorizeRoles('HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'),
  updatePatient
);

router.post(
  '/:id/discharge',
  authorizeRoles('HOSPITAL_ADMIN', 'DOCTOR', 'NURSE'),
  dischargePatient
);

// Observations belong to a patient, so they live under the patient route.
// Nurses are the primary users here - it is most of what the role does.
router.get('/:patientId/vitals', listVitals);
router.post(
  '/:patientId/vitals',
  authorizeRoles('HOSPITAL_ADMIN', 'DOCTOR', 'NURSE'),
  recordVitals
);

router.delete('/:id', authorizeRoles('HOSPITAL_ADMIN'), deletePatient);

export default router;
