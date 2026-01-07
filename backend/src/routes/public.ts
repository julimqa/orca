import express from 'express';
import { getPublicPlanReportByToken } from '../controllers/reportController';

const router = express.Router();

// Public report share view (no auth)
router.get('/reports/share/:token', getPublicPlanReportByToken);

export default router;
