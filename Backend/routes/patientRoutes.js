const express = require('express');
const { 
  registerPatient, 
  getAllPatients, 
  getPatientById, 
  updatePatient 
} = require('../controllers/patientController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { departmentAccessControl } = require('../middleware/abac'); // ✅ NEW

const router = express.Router();

// ✅ ABAC ADDED: Department-based access control
router.post('/', 
  authenticateToken, 
  authorizeRoles('HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'),
  departmentAccessControl, // ✅ DEPARTMENT CHECK
  registerPatient
);

// All authenticated users can view patients
router.get('/', authenticateToken, getAllPatients);

// Get specific patient
router.get('/:id', authenticateToken, getPatientById);

// Update patient (Admin, Doctor, Receptionist)
router.put('/:id', 
  authenticateToken, 
  authorizeRoles('HOSPITAL_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'NURSE'),
  departmentAccessControl, // ✅ DEPARTMENT CHECK
  updatePatient
);

module.exports = router;