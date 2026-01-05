import type { User } from './entities';
import type { ApiResponse } from './common';

/** POST /api/auth/register 요청 바디 */
export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

/** POST /api/auth/login 요청 바디 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * POST /api/auth/register 응답
 * - 주의: 공통 `data` 래퍼가 아니라 `user` 키를 사용합니다(현행 그대로).
 */
export interface RegisterResponse {
  success: boolean;
  message?: string;
  user?: User;
}

/**
 * POST /api/auth/login 응답
 * - 주의: `data`가 아니라 `accessToken`, `user`를 최상위로 제공합니다(현행 그대로).
 */
export interface LoginResponse {
  success: boolean;
  accessToken?: string;
  user?: User;
  message?: string;
}

/** GET /api/auth/me 응답 (현행: `{ success, user }`) */
export interface GetMeResponse {
  success: boolean;
  user?: User;
  message?: string;
}

/** PATCH /api/auth/profile 요청 바디 */
export interface UpdateProfileRequest {
  name: string;
}

/** PATCH /api/auth/profile 응답 (현행: `{ success, message, user }`) */
export interface UpdateProfileResponse {
  success: boolean;
  message?: string;
  user?: User;
}

/** POST /api/auth/change-password 요청 바디 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** POST /api/auth/change-password 응답 (현행: `{ success, message }`) */
export type ChangePasswordResponse = ApiResponse<never>;


