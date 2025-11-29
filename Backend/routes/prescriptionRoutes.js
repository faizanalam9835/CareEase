const express = require('express');
const { 
  createPrescription, 
  getPrescriptionsByPatient, 
  getPrescriptionById, 
  updatePrescriptionStatus,
  getAllPrescriptions
} = require('../controllers/prescriptionController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { departmentAccessControl } = require('../middleware/abac'); // ✅ ABAC ADDED

const router = express.Router();

// Create prescription (Doctor only) + ABAC
router.post('/', 
  authenticateToken, 
  authorizeRoles('DOCTOR'), // ✅ RBAC
  departmentAccessControl,  // ✅ ABAC - Doctor apne department ke hi patient ko prescribe kar sake
  createPrescription
);

// Get all prescriptions (Admin view) - No ABAC needed for admin
router.get('/', 
  authenticateToken, 
  authorizeRoles('HOSPITAL_ADMIN', 'PHARMACIST'), 
  getAllPrescriptions
);

// Get prescriptions by patient ID + ABAC for Doctors/Nurses
router.get('/patient/:patientId', 
  authenticateToken, 
  authorizeRoles('HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST'),
  (req, res, next) => {
    // ✅ CUSTOM ABAC: Agar Doctor/Nurse hai to patient ka department check karo
    if (req.user.roles.includes('DOCTOR') || req.user.roles.includes('NURSE')) {
      // Pehle patient ka department check karo
      const Patient = require('../models/Patient');
      Patient.findById(req.params.patientId)
        .then(patient => {
          if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
          }
          if (patient.tenantId !== req.user.tenantId) {
            return res.status(403).json({ error: 'Access denied' });
          }
          if (patient.department !== req.user.department) {
            return res.status(403).json({
              error: 'Access denied',
              message: `You can only view patients from your department (${req.user.department})`
            });
          }
          next();
        })
        .catch(error => {
          console.error('ABAC patient check error:', error);
          res.status(500).json({ error: 'Access control error' });
        });
    } else {
      // Admin/Pharmacist ke liye no restrictions
      next();
    }
  },
  getPrescriptionsByPatient
);

// Get specific prescription + ABAC for Doctors/Nurses
router.get('/:id', 
  authenticateToken, 
  authorizeRoles('HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST'),
  (req, res, next) => {
    // ✅ CUSTOM ABAC: Agar Doctor/Nurse hai to prescription ke patient ka department check karo
    if (req.user.roles.includes('DOCTOR') || req.user.roles.includes('NURSE')) {
      const Prescription = require('../models/Prescription');
      Prescription.findById(req.params.id)
        .populate('patientId')
        .then(prescription => {
          if (!prescription) {
            return res.status(404).json({ error: 'Prescription not found' });
          }
          if (prescription.tenantId !== req.user.tenantId) {
            return res.status(403).json({ error: 'Access denied' });
          }
          if (prescription.patientId.department !== req.user.department) {
            return res.status(403).json({
              error: 'Access denied',
              message: `You can only view prescriptions from your department (${req.user.department})`
            });
          }
          next();
        })
        .catch(error => {
          console.error('ABAC prescription check error:', error);
          res.status(500).json({ error: 'Access control error' });
        });
    } else {
      // Admin/Pharmacist ke liye no restrictions
      next();
    }
  },
  getPrescriptionById
);

// Update prescription status (Pharmacist) - No ABAC needed
router.put('/:id/status', 
  authenticateToken, 
  authorizeRoles('PHARMACIST'), 
  updatePrescriptionStatus
);

module.exports = router;