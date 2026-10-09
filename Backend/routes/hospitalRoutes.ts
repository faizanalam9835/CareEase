import express from 'express';
import { getMyHospital, updateMyHospital } from '../controllers/hospitalController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = express.Router();

// Hospitals no longer sign themselves up: the platform team onboards them
// through /api/platform/tenants.

// Own hospital profile. `GET /all` was removed - it exposed every hospital on
// the platform to anyone who knew the URL.
router.get('/me', authenticateToken, getMyHospital);
router.put('/me', authenticateToken, authorizeRoles('HOSPITAL_ADMIN'), updateMyHospital);

export default router;
