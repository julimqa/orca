import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  createFolder,
  getFolderTree,
  getTestCasesByFolder,
  moveFolder,
  reorderFolders,
  renameFolder,
  deleteFolder,
  bulkDeleteFolders,
} from '../controllers/folderController';

const router = express.Router();

router.get('/tree', authenticateToken, getFolderTree);
router.post('/', authenticateToken, createFolder);
router.patch('/reorder', authenticateToken, reorderFolders);
router.delete('/bulk', authenticateToken, bulkDeleteFolders);
router.patch('/:id/move', authenticateToken, moveFolder);
router.patch('/:id/rename', authenticateToken, renameFolder);
router.delete('/:id', authenticateToken, deleteFolder);
router.get('/:folderId/testcases', authenticateToken, getTestCasesByFolder);

export default router;
