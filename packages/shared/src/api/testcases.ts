import type { ApiResponse } from './common';
import type { AutomationType, Priority } from './common';
import type { TestCase } from './entities';

/** GET /api/testcases 응답 */
export type GetTestCasesResponse = ApiResponse<TestCase[]>;

/** POST /api/testcases 요청 바디 (현행은 Partial<TestCase> 형태로 사용) */
export type CreateTestCaseRequest = Partial<TestCase>;

/** POST /api/testcases 응답 */
export type CreateTestCaseResponse = ApiResponse<TestCase>;

/** PATCH /api/testcases/:id 요청 바디 */
export type UpdateTestCaseRequest = Partial<TestCase>;

/** PATCH /api/testcases/:id 응답 */
export type UpdateTestCaseResponse = ApiResponse<TestCase>;

/** DELETE /api/testcases/:id 응답 (현행: `{ success, message }`) */
export interface DeleteTestCaseResponse {
  success: boolean;
  message?: string;
}

/** POST /api/testcases/reorder 요청 바디 */
export interface ReorderTestCasesRequest {
  orderedIds: string[];
}

/** POST /api/testcases/reorder 응답 */
export type ReorderTestCasesResponse = ApiResponse<TestCase[]>;

/** PATCH /api/testcases/bulk 요청 바디 */
export interface BulkUpdateTestCasesRequest {
  ids: string[];
  priority?: Priority;
  automationType?: AutomationType;
  category?: string | null;
  folderId?: string | null;
}

/** PATCH /api/testcases/bulk 응답 (현행: `{ success, data: { count, message } }`) */
export type BulkUpdateTestCasesResponse = ApiResponse<{ count: number; message: string }>;

/** DELETE /api/testcases/bulk 요청 바디 */
export interface BulkDeleteTestCasesRequest {
  ids: string[];
}

/** DELETE /api/testcases/bulk 응답 */
export type BulkDeleteTestCasesResponse = ApiResponse<{ count: number; message: string }>;

/** POST /api/testcases/move 요청 바디 */
export interface MoveTestCasesToFolderRequest {
  ids: string[];
  targetFolderId: string | null;
}

/** POST /api/testcases/move 응답 */
export type MoveTestCasesToFolderResponse = ApiResponse<{ count: number; message: string }>;

/**
 * POST /api/testcases/import 응답
 * - 현행: `{ success, data: { successCount, failureCount, failures } }`
 */
export type ImportTestCasesResponse = ApiResponse<{
  successCount: number;
  failureCount: number;
  failures: any[];
}>;


