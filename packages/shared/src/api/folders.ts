import type { ApiResponse } from './common';
import type { Folder, FolderTreeItem, TestCase } from './entities';

/** GET /api/folders/tree 응답 */
export type GetFolderTreeResponse = ApiResponse<FolderTreeItem[]>;

/** POST /api/folders 요청 바디 */
export interface CreateFolderRequest {
  name: string;
  parentId: string | null;
}

/** POST /api/folders 응답 */
export type CreateFolderResponse = ApiResponse<Folder>;

/** GET /api/folders/:folderId/testcases 응답 */
export type GetFolderTestCasesResponse = ApiResponse<TestCase[]>;

/** PATCH /api/folders/:id/move 요청 바디 */
export interface MoveFolderRequest {
  newParentId: string | null;
  newOrder?: number;
}

/** PATCH /api/folders/:id/move 응답 */
export type MoveFolderResponse = ApiResponse<Folder>;

/** PATCH /api/folders/reorder 요청 바디 */
export interface ReorderFoldersRequest {
  folders: { id: string; order: number }[];
}

/** PATCH /api/folders/reorder 응답 (현행: `{ success, message }`) */
export interface ReorderFoldersResponse {
  success: boolean;
  message?: string;
}

/** PATCH /api/folders/:id/rename 요청 바디 */
export interface RenameFolderRequest {
  name: string;
}

/** PATCH /api/folders/:id/rename 응답 */
export type RenameFolderResponse = ApiResponse<Folder>;

/** DELETE /api/folders/:id 응답 (현행: `{ success, message }`) */
export interface DeleteFolderResponse {
  success: boolean;
  message?: string;
}

/** DELETE /api/folders/bulk 요청 바디 */
export interface BulkDeleteFoldersRequest {
  ids: string[];
}

/** DELETE /api/folders/bulk 응답 (현행: `{ success, data: { count, totalDeleted, message } }`) */
export type BulkDeleteFoldersResponse = ApiResponse<{
  count: number;
  totalDeleted: number;
  message: string;
}>;


