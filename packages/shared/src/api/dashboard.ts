import type { ApiResponse, TestResult } from './common';
import type { PlanItem } from './entities';

export interface DashboardStats {
  totalTestCases: number;
  activePlans: number;
  totalPlanItems: number;
  myAssignedCount: number;
}

export interface DashboardActivity extends Omit<PlanItem, 'testCase'> {
  testCase: {
    title: string;
    priority?: string;
  };
  plan: {
    name: string;
    id: string;
  };
  updatedAt: string;
}

export interface OverviewStats {
  activePlans: number;
  manualCases: number;
  automatedCases: number;
  ratio: {
    manual: number;
    automated: number;
  };
}

export interface PlanStatusCounts {
  pass: number;
  fail: number;
  block: number;
  untested: number;
  inProgress: number;
}

export interface TestPlanCard {
  id: string;
  title: string;
  description: string;
  caseCount: number;
  statusCounts: PlanStatusCounts;
  progress: number;
  createdBy: string;
  createdAt: string;
}

export type GetDashboardStatsResponse = ApiResponse<DashboardStats>;
export type GetMyAssignmentsResponse = ApiResponse<DashboardActivity[]>;
export type GetRecentActivityResponse = ApiResponse<DashboardActivity[]>;
export type GetOverviewStatsResponse = ApiResponse<OverviewStats>;
export type GetActivePlansResponse = ApiResponse<TestPlanCard[]>;

/**
 * 참고: `dashboardController`는 `TestResult`로 IN_PROGRESS를 사용하고 있으며,
 * 응답 데이터도 그 값을 포함할 수 있습니다.
 */
export type DashboardTestResult = TestResult;


