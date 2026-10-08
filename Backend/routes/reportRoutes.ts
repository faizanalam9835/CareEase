import express from 'express';
import { getReport } from '../controllers/reportController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

router.get('/', authorizeRoles('HOSPITAL_ADMIN', 'RECEPTIONIST'), getReport);

export default router;
