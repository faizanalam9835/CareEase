import express from 'express';
import {
  getStats,
  getCharts,
  getRecentActivities,
  getAlerts,
  getSystemStatus
} from '../controllers/dashboardController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

router.get('/stats', getStats);
// The old frontend called /dashboard/admin/stats; keep it working.
router.get('/admin/stats', getStats);
router.get('/charts', getCharts);
router.get('/activities', getRecentActivities);
router.get('/alerts', getAlerts);
router.get('/system-status', getSystemStatus);

export default router;
