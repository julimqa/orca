import api from './axios';
import { PlanItem } from './plan';

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

// 새로운 Overview 통계 타입
export interface OverviewStats {
  activePlans: number;
  manualCases: number;
  automatedCases: number;
  ratio: {
    manual: number;
    automated: number;
  };
}

// Active Test Plan 카드 타입
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

export const getDashboardStats = async () => {
  const response = await api.get<{ success: boolean; data: DashboardStats }>('/dashboard/stats');
  return response.data;
};

export const getMyAssignments = async () => {
  const response = await api.get<{ success: boolean; data: DashboardActivity[] }>('/dashboard/my-assignments');
  return response.data;
};

export const getRecentActivity = async () => {
  const response = await api.get<{ success: boolean; data: DashboardActivity[] }>('/dashboard/recent-activity');
  return response.data;
};

// 새로운 API 함수들
export const getOverviewStats = async () => {
  const response = await api.get<{ success: boolean; data: OverviewStats }>('/dashboard/overview');
  return response.data;
};

export const getActivePlans = async () => {
  const response = await api.get<{ success: boolean; data: TestPlanCard[] }>('/dashboard/active-plans');
  return response.data;
};
