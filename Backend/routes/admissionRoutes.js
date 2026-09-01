const express = require('express');
const {
  listAdmissions,
  getAdmission,
  admitPatient,
  transferPatient,
  dischargePatient
} = require('../controllers/wardController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// Admitting, moving and discharging is ward and front-desk work.
const WARD_STAFF = ['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'];

router.get('/', listAdmissions);
router.get('/:id', getAdmission);

router.post('/', authorizeRoles(...WARD_STAFF), admitPatient);
router.post('/:id/transfer', authorizeRoles(...WARD_STAFF), transferPatient);
router.post('/:id/discharge', authorizeRoles(...WARD_STAFF), dischargePatient);

module.exports = router;
