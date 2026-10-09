import express from 'express';
import { listCalls, callForAppointment, getTranscript, getRecording } from '../controllers/callController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = express.Router();

// Recordings hold patients' voices and details: front desk and admins only.
router.use(authenticateToken, authorizeRoles('HOSPITAL_ADMIN', 'RECEPTIONIST'));

router.get('/', listCalls);
router.get('/transcript', getTranscript);
router.get('/recording', getRecording);
router.get('/for-appointment/:id', callForAppointment);

export default router;
