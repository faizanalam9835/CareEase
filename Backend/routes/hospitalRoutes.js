const express = require('express');
const {
  registerHospital,
  verifyHospital,
  getMyHospital,
  updateMyHospital,
  checkLicense
} = require('../controllers/hospitalController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Public onboarding
router.post('/register', registerHospital);
router.get('/verify/:token', verifyHospital);
router.get('/check-license/:licenseNumber', checkLicense);

// Own hospital profile. `GET /all` was removed - it exposed every hospital on
// the platform to anyone who knew the URL.
router.get('/me', authenticateToken, getMyHospital);
router.put('/me', authenticateToken, authorizeRoles('HOSPITAL_ADMIN'), updateMyHospital);

module.exports = router;
