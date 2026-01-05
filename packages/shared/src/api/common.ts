/**
 * Phase 2.1: 현행 API 응답을 그대로 미러링한 공통 타입들
 *
 * ⚠️ 중요
 * - "API 계약 변경 금지" 원칙에 따라, 응답 포맷을 통일하지 않습니다.
 * - 실제 응답은 endpoint마다 `data`, `user`, `users` 등 키가 다를 수 있으며,
 *   이는 아래에서 각각 별도의 타입으로 표현합니다.
 */

/** 프론트(`frontend/src/api/types.ts`)에 존재하는 가장 기본 형태의 응답 타입 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export type UserRole = 'USER' | 'ADMIN';
export type UserStatus = 'PENDING' | 'ACTIVE' | 'REJECTED';

export type PlanStatus = 'ACTIVE' | 'ARCHIVED';

/**
 * 현행 코드에서 사용되는 테스트 실행 결과 상태.
 * - Prisma schema 주석엔 NOT_RUN/PASS/FAIL/BLOCK이 기본이지만,
 *   `dashboardController`/프론트 타입에는 `IN_PROGRESS`도 등장합니다.
 */
export type TestResult = 'NOT_RUN' | 'IN_PROGRESS' | 'PASS' | 'FAIL' | 'BLOCK';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type AutomationType = 'MANUAL' | 'AUTOMATED';


