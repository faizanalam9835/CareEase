const express = require('express');
const {
  createAppointment,
  getAppointmentsByPatient,
  getAppointmentsByDoctor,
  updateAppointmentStatus,
  getTodaysAppointments,
  getAllAppointments
} = require('../controllers/appointmentController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { departmentAccessControl } = require('../middleware/abac');

const router = express.Router();

// Create appointment
router.post('/',
  authenticateToken,
  authorizeRoles('HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR'),
  departmentAccessControl,
  createAppointment
);

// Get all appointments (Admin view)
router.get('/',
  authenticateToken,
  authorizeRoles('HOSPITAL_ADMIN', 'RECEPTIONIST'),
  getAllAppointments
);

// Get appointments by patient ID
router.get('/patient/:patientId',
  authenticateToken,
  authorizeRoles('HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'),
  getAppointmentsByPatient
);

// Get appointments by doctor ID
router.get('/doctor/:doctorId',
  authenticateToken,
  authorizeRoles('HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR'),
  getAppointmentsByDoctor
);

// Get today's appointments
router.get('/today',
  authenticateToken,
  authorizeRoles('HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'),
  getTodaysAppointments
);

// Update appointment status
router.put('/:id/status',
  authenticateToken,
  authorizeRoles('HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR'),
  updateAppointmentStatus
);

module.exports = router;