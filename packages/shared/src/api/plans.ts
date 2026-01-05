import type { ApiResponse, PlanStatus, TestResult } from './common';
import type { Plan, PlanDetail, PlanItem } from './entities';

export type PlanStatusFilter = PlanStatus | 'ALL';

/** GET /api/plans 응답 */
export type GetPlansResponse = ApiResponse<Plan[]>;

/** POST /api/plans 요청 바디 */
export interface CreatePlanRequest {
  name: string;
  description?: string;
  testCaseIds: string[];
  /** 백엔드는 지원하지만 프론트 기본 호출에서는 사용하지 않을 수 있음 */
  assignee?: string;
}

/** POST /api/plans 응답 */
export type CreatePlanResponse = ApiResponse<Plan>;

/** GET /api/plans/:planId 응답 */
export type GetPlanDetailResponse = ApiResponse<PlanDetail>;

/** PATCH /api/plans/:planId/items/:itemId 요청 바디 */
export interface UpdatePlanItemRequest {
  result?: TestResult;
  comment?: string;
  assignee?: string;
}

/** PATCH /api/plans/:planId/items/:itemId 응답 */
export type UpdatePlanItemResponse = ApiResponse<PlanItem>;

/** PATCH /api/plans/:planId/items/bulk 요청 바디 */
export interface BulkUpdatePlanItemsRequest {
  items: string[];
  result?: TestResult;
  comment?: string;
  assignee?: string;
}

/** PATCH /api/plans/:planId/items/bulk 응답 (현행: `{ success, data: { count, message } }`) */
export type BulkUpdatePlanItemsResponse = ApiResponse<{ count: number; message: string }>;

/** PATCH /api/plans/:planId 요청 바디 */
export interface UpdatePlanRequest {
  name?: string;
  description?: string;
  testCaseIds?: string[];
}

/** PATCH /api/plans/:planId 응답 (현행: `{ success, data, message }`) */
export interface UpdatePlanResponse {
  success: boolean;
  data?: PlanDetail | null;
  message?: string;
}

/** PATCH /api/plans/:planId/archive 응답 */
export interface ArchivePlanResponse {
  success: boolean;
  data?: Plan;
  message?: string;
}

/** PATCH /api/plans/:planId/unarchive 응답 */
export interface UnarchivePlanResponse {
  success: boolean;
  data?: Plan;
  message?: string;
}

/** DELETE /api/plans/:planId 응답 */
export interface DeletePlanResponse {
  success: boolean;
  message?: string;
}

/** PATCH /api/plans/bulk/archive 요청 바디 */
export interface BulkArchivePlansRequest {
  planIds: string[];
}

/** PATCH /api/plans/bulk/archive 응답 */
export interface BulkArchivePlansResponse {
  success: boolean;
  data?: { count: number };
  message?: string;
}

/** PATCH /api/plans/bulk/unarchive 요청 바디 */
export interface BulkUnarchivePlansRequest {
  planIds: string[];
}

/** PATCH /api/plans/bulk/unarchive 응답 */
export interface BulkUnarchivePlansResponse {
  success: boolean;
  data?: { count: number };
  message?: string;
}

/** DELETE /api/plans/bulk 요청 바디 */
export interface BulkDeletePlansRequest {
  planIds: string[];
}

/** DELETE /api/plans/bulk 응답 */
export interface BulkDeletePlansResponse {
  success: boolean;
  data?: { count: number };
  message?: string;
}


