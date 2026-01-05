import api from './axios';
import { User, SignupRequest, LoginRequest, LoginResponse } from './types';

export type SignupData = SignupRequest;
export type LoginData = LoginRequest;
export type AuthResponse = LoginResponse;

/**
 * 회원가입
 */
export const signup = async (data: SignupData): Promise<AuthResponse> => {
  const response = await api.post('/auth/register', data);
  return response.data;
};

/**
 * 로그인
 */
export const login = async (data: LoginData): Promise<AuthResponse> => {
  const response = await api.post('/auth/login', data);
  return response.data;
};

/**
 * 현재 사용자 정보 조회
 */
export const getCurrentUser = async (): Promise<{ success: boolean; user: User }> => {
  const response = await api.get('/auth/me');
  return response.data;
};
