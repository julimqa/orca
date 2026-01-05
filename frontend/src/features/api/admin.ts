import api from './axios';
import { User } from './types';

export interface ApproveUserData {
  email: string;
  action: 'approve' | 'reject';
}

export interface ResetPasswordData {
  email: string;
  newPassword: string;
}

export interface UpdateUserRoleData {
  email: string;
  role: 'ADMIN' | 'USER';
}

export interface UpdateUserStatusData {
  email: string;
  status: 'ACTIVE' | 'REJECTED';
}

/**
 * 가입 대기 사용자 목록 조회
 */
export const getPendingUsers = async (): Promise<{ success: boolean; users: User[] }> => {
  const response = await api.get('/admin/pending-users');
  return response.data;
};

/**
 * 모든 사용자 목록 조회
 */
export const getAllUsers = async (): Promise<{ success: boolean; users: User[] }> => {
  const response = await api.get('/admin/users');
  return response.data;
};

/**
 * 사용자 승인/거절
 */
export const approveUser = async (data: ApproveUserData): Promise<any> => {
  const response = await api.patch('/admin/users/approve', data);
  return response.data;
};

/**
 * 비밀번호 초기화
 */
export const resetPassword = async (data: ResetPasswordData): Promise<any> => {
  const response = await api.post('/admin/users/reset-password', data);
  return response.data;
};

/**
 * 사용자 Role 변경
 */
export const updateUserRole = async (data: UpdateUserRoleData): Promise<any> => {
  const response = await api.patch('/admin/users/role', data);
  return response.data;
};

/**
 * 사용자 Status 변경
 */
export const updateUserStatus = async (data: UpdateUserStatusData): Promise<any> => {
  const response = await api.patch('/admin/users/status', data);
  return response.data;
};
