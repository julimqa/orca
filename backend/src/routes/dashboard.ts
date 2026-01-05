import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getDashboardStats,
  getMyAssignments,
  getRecentActivity,
  getOverviewStats,
  getActivePlans,
} from '../controllers/dashboardController';

const router = express.Router();

// Dashboard endpoints are dynamic; disable caching to avoid stale UI / flaky E2E (304 via ETag)
router.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

router.get('/stats', authenticateToken, getDashboardStats);
router.get('/my-assignments', authenticateToken, getMyAssignments);
router.get('/recent-activity', authenticateToken, getRecentActivity);
router.get('/overview', authenticateToken, getOverviewStats);
router.get('/active-plans', authenticateToken, getActivePlans);

export default router;
