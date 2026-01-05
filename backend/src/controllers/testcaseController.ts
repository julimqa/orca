import { NextFunction, Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { TestCaseService } from '../services/testcaseService';
import { AppError } from '../errors/AppError';
import { logger } from '../lib/logger';

// 테스트케이스 목록 조회
export async function getTestCases(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { folderId } = req.query;
    const result = await TestCaseService.getTestCases(folderId ? String(folderId) : undefined);
    res.status(result.status).json(result.body);
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'testcase_get_list_error');
    return next(new AppError(500, { success: false, message: '테스트케이스 조회 실패' }));
  }
}

// 테스트케이스 생성
export async function createTestCase(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await TestCaseService.createTestCase(req.body);
    res.status(result.status).json(result.body);
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'testcase_create_error');
    return next(new AppError(500, { success: false, message: '테스트케이스 생성 실패' }));
  }
}

// CSV Import
export async function importTestCases(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'CSV 파일이 필요합니다.' });
      return;
    }
    const result = await TestCaseService.importTestCases({
      filePath: req.file.path,
      folderId: req.body.folderId,
      mapping: req.body.mapping,
    });
    res.status(result.status).json(result.body);
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'testcase_import_csv_error');
    return next(new AppError(500, { success: false, message: 'CSV Import 실패' }));
  }
}

// 테스트케이스 수정
export async function updateTestCase(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const result = await TestCaseService.updateTestCase(id, req.body);
    res.status(result.status).json(result.body);
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'testcase_update_error');
    return next(new AppError(500, { success: false, message: '테스트케이스 수정 실패' }));
  }
}

// 테스트케이스 삭제
export async function deleteTestCase(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const result = await TestCaseService.deleteTestCase(id);
    res.status(result.status).json(result.body);
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'testcase_delete_error');
    return next(new AppError(500, { success: false, message: '테스트케이스 삭제 실패' }));
  }
}

// 테스트케이스 순서 변경 (드래그 앤 드롭)
export async function reorderTestCases(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { folderId } = req.query;
    const { orderedIds } = req.body; // 새로운 순서대로 정렬된 ID 배열
    const result = await TestCaseService.reorderTestCases({ orderedIds, folderId });
    res.status(result.status).json(result.body);
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'testcase_reorder_error');
    return next(new AppError(500, { success: false, message: '테스트케이스 순서 변경 실패' }));
  }
}

// 테스트케이스 일괄 수정 (Bulk Update)
export async function bulkUpdateTestCases(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await TestCaseService.bulkUpdateTestCases(req.body);
    res.status(result.status).json(result.body);
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'testcase_bulk_update_error');
    return next(new AppError(500, { success: false, message: '테스트케이스 일괄 수정 실패' }));
  }
}

// 테스트케이스 일괄 삭제 (Bulk Delete)
export async function bulkDeleteTestCases(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await TestCaseService.bulkDeleteTestCases(req.body);
    res.status(result.status).json(result.body);
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'testcase_bulk_delete_error');
    return next(new AppError(500, { success: false, message: '테스트케이스 일괄 삭제 실패' }));
  }
}

// 테스트케이스 폴더 이동 (Bulk Move to Folder)
export async function moveTestCasesToFolder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await TestCaseService.moveTestCasesToFolder(req.body);
    res.status(result.status).json(result.body);
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'testcase_move_to_folder_error');
    return next(new AppError(500, { success: false, message: '테스트케이스 폴더 이동 실패' }));
  }
}
