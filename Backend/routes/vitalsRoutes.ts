import express from 'express';
import { deleteVitals, needsAttention } from '../controllers/vitalsController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

// The nurse worklist: abnormal or overdue observations.
router.get('/attention', needsAttention);
router.delete('/:id', deleteVitals);

export default router;
