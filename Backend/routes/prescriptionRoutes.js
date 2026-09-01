const express = require('express');
const {
  createPrescription,
  getAllPrescriptions,
  getPrescriptionsByPatient,
  getPrescriptionById,
  updatePrescription,
  updatePrescriptionStatus,
  deletePrescription,
  checkStock
} = require('../controllers/prescriptionController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { patientDepartmentAccess } = require('../middleware/abac');

const router = express.Router();

router.use(authenticateToken);

// The controller narrows the list by role/department, so every clinical role
// can call it. Previously only admins and pharmacists could, which left the
// doctors' own prescription list permanently empty.
router.get('/', getAllPrescriptions);

router.get('/patient/:patientId', patientDepartmentAccess('patientId'), getPrescriptionsByPatient);

router.get('/:id/stock-check', authorizeRoles('HOSPITAL_ADMIN', 'PHARMACIST'), checkStock);
router.get('/:id', getPrescriptionById);

router.post('/', authorizeRoles('DOCTOR'), patientDepartmentAccess('patientId', 'body'), createPrescription);

router.put('/:id', authorizeRoles('DOCTOR', 'HOSPITAL_ADMIN'), updatePrescription);
router.put('/:id/status', authorizeRoles('PHARMACIST', 'HOSPITAL_ADMIN'), updatePrescriptionStatus);

router.delete('/:id', authorizeRoles('DOCTOR', 'HOSPITAL_ADMIN'), deletePrescription);

module.exports = router;
