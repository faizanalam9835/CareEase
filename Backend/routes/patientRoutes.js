const express = require('express');
const {
  registerPatient,
  getAllPatients,
  getPatientById,
  updatePatient,
  dischargePatient,
  deletePatient
} = require('../controllers/patientController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { departmentAccessControl } = require('../middleware/abac');
const { recordVitals, listVitals } = require('../controllers/vitalsController');

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

module.exports = router;
