import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  createPlan,
  getPlans,
  getPlanDetail,
  updatePlan,
  updatePlanItem,
  bulkUpdatePlanItems,
  archivePlan,
  unarchivePlan,
  deletePlan,
  bulkArchivePlans,
  bulkUnarchivePlans,
  bulkDeletePlans,
} from '../controllers/planController';
import {
  createPlanSchema,
  updatePlanSchema,
  planIdListSchema,
  updatePlanItemSchema,
  bulkUpdatePlanItemsSchema,
} from './schemas/planSchemas';

const router = express.Router();

router.get('/', authenticateToken, getPlans);
router.post('/', authenticateToken, validateBody(createPlanSchema), createPlan);

// Bulk operations (must be before parameterized routes)
router.patch('/bulk/archive', authenticateToken, validateBody(planIdListSchema), bulkArchivePlans);
router.patch('/bulk/unarchive', authenticateToken, validateBody(planIdListSchema), bulkUnarchivePlans);
router.delete('/bulk', authenticateToken, validateBody(planIdListSchema), bulkDeletePlans);

router.get('/:planId', authenticateToken, getPlanDetail);
router.patch('/:planId', authenticateToken, validateBody(updatePlanSchema), updatePlan);
router.delete('/:planId', authenticateToken, deletePlan);

// Plan status updates
router.patch('/:planId/archive', authenticateToken, archivePlan);
router.patch('/:planId/unarchive', authenticateToken, unarchivePlan);

// Plan Item updates
router.patch('/:planId/items/bulk', authenticateToken, validateBody(bulkUpdatePlanItemsSchema), bulkUpdatePlanItems); // Specific route before parameterized route
router.patch('/:planId/items/:itemId', authenticateToken, validateBody(updatePlanItemSchema), updatePlanItem);

export default router;
