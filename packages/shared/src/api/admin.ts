import type { User } from './entities';

/** PATCH /api/admin/users/approve 요청 바디 */
export interface ApproveUserRequest {
  email: string;
  action: 'approve' | 'reject';
}

/** POST /api/admin/users/reset-password 요청 바디 */
export interface ResetPasswordRequest {
  email: string;
  newPassword: string;
}

/** PATCH /api/admin/users/role 요청 바디 */
export interface UpdateUserRoleRequest {
  email: string;
  role: 'ADMIN' | 'USER';
}

/** PATCH /api/admin/users/status 요청 바디 (프론트에서는 ACTIVE/REJECTED만 사용) */
export interface UpdateUserStatusRequest {
  email: string;
  status: 'ACTIVE' | 'REJECTED' | 'PENDING';
}

/**
 * GET /api/admin/pending-users 응답
 * - 주의: 공통 `data`가 아니라 `users` 키를 사용합니다(현행 그대로).
 */
export interface GetPendingUsersResponse {
  success: boolean;
  users: User[];
  message?: string;
}

/** GET /api/admin/users 응답 (현행: `{ success, users }`) */
export interface GetAllUsersResponse {
  success: boolean;
  users: User[];
  message?: string;
}

/** PATCH /api/admin/users/approve 응답 (현행: `{ success, message, user }`) */
export interface ApproveUserResponse {
  success: boolean;
  message?: string;
  user?: User;
}

/** PATCH /api/admin/users/role 응답 */
export interface UpdateUserRoleResponse {
  success: boolean;
  message?: string;
  user?: User;
}

/** PATCH /api/admin/users/status 응답 */
export interface UpdateUserStatusResponse {
  success: boolean;
  message?: string;
  user?: User;
}

/** POST /api/admin/users/reset-password 응답 (현행: `{ success, message }`) */
export interface ResetPasswordResponse {
  success: boolean;
  message?: string;
}


