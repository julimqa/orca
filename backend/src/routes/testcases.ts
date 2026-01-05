import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  createTestCase,
  getTestCases,
  importTestCases,
  updateTestCase,
  deleteTestCase,
  reorderTestCases,
  bulkUpdateTestCases,
  bulkDeleteTestCases,
  moveTestCasesToFolder,
} from '../controllers/testcaseController';
import {
  createTestCaseSchema,
  updateTestCaseSchema,
  reorderTestCasesSchema,
  bulkUpdateTestCasesSchema,
  bulkDeleteTestCasesSchema,
  moveTestCasesSchema,
} from './schemas/testcaseSchemas';

const upload = multer({ dest: 'uploads/' });
const router = express.Router();

router.get('/', authenticateToken, getTestCases);
router.post('/', authenticateToken, validateBody(createTestCaseSchema), createTestCase);
router.post('/reorder', authenticateToken, validateBody(reorderTestCasesSchema), reorderTestCases);
router.post('/move', authenticateToken, validateBody(moveTestCasesSchema), moveTestCasesToFolder);
router.patch('/bulk', authenticateToken, validateBody(bulkUpdateTestCasesSchema), bulkUpdateTestCases);
router.delete('/bulk', authenticateToken, validateBody(bulkDeleteTestCasesSchema), bulkDeleteTestCases);
router.patch('/:id', authenticateToken, validateBody(updateTestCaseSchema), updateTestCase);
router.delete('/:id', authenticateToken, deleteTestCase);
router.post('/import', authenticateToken, upload.single('file'), importTestCases);

export default router;
