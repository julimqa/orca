import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireActive } from '../middleware/roleCheck';
import {
  createPlanReportShareLink,
  listPlanReportShareLinks,
  revokeReportShareLink,
} from '../controllers/reportController';

const router = express.Router();

// Plan report share links (auth required)
router.post('/plans/:planId/share-links', authenticateToken, requireActive, createPlanReportShareLink);
router.get('/plans/:planId/share-links', authenticateToken, requireActive, listPlanReportShareLinks);
router.post('/share-links/:id/revoke', authenticateToken, requireActive, revokeReportShareLink);

export default router;
