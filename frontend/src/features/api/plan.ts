import api from './axios';
import { TestCase } from './testcase';

export type TestResult = 'NOT_RUN' | 'IN_PROGRESS' | 'PASS' | 'FAIL' | 'BLOCK';
export type PlanStatus = 'ACTIVE' | 'ARCHIVED';
export type PlanStatusFilter = PlanStatus | 'ALL';

export interface PlanStats {
  total: number;
  pass: number;
  fail: number;
  block: number;
  notRun: number;
  progress: number;
}

export interface Plan {
  id: string;
  name: string;
  description?: string;
  status: PlanStatus;
  createdBy: string;
  createdAt: string;
  stats?: PlanStats; // 목록 조회 시 포함
}

export interface PlanItem {
  id: string;
  planId: string;
  testCaseId: string;
  testCase: TestCase;
  assignee?: string;
  result: TestResult;
  comment?: string;
  order?: number;
  executedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlanDetail extends Plan {
  items: PlanItem[];
}

export const getPlans = async (status: PlanStatusFilter = 'ACTIVE') => {
  const response = await api.get<{ success: boolean; data: Plan[] }>('/plans', { params: { status } });
  return response.data;
};

export const createPlan = async (data: { name: string; description?: string; testCaseIds: string[] }) => {
  const response = await api.post<{ success: boolean; data: Plan }>('/plans', data);
  return response.data;
};

export const getPlanDetail = async (planId: string) => {
  const response = await api.get<{ success: boolean; data: PlanDetail }>(`/plans/${planId}`);
  return response.data;
};

export const updatePlanItem = async (
  planId: string,
  itemId: string,
  data: { result?: TestResult; comment?: string; assignee?: string }
) => {
  const response = await api.patch<{ success: boolean; data: PlanItem }>(`/plans/${planId}/items/${itemId}`, data);
  return response.data;
};

export const bulkUpdatePlanItems = async (
  planId: string,
  data: { items: string[]; result?: TestResult; comment?: string; assignee?: string }
) => {
  const response = await api.patch<{ success: boolean; data: { count: number; message: string } }>(
    `/plans/${planId}/items/bulk`,
    data
  );
  return response.data;
};

// 플랜 아카이브
export const archivePlan = async (planId: string) => {
  const response = await api.patch<{ success: boolean; data: Plan; message: string }>(`/plans/${planId}/archive`);
  return response.data;
};

// 플랜 아카이브 해제 (복원)
export const unarchivePlan = async (planId: string) => {
  const response = await api.patch<{ success: boolean; data: Plan; message: string }>(`/plans/${planId}/unarchive`);
  return response.data;
};

// 플랜 삭제
export const deletePlan = async (planId: string) => {
  const response = await api.delete<{ success: boolean; message: string }>(`/plans/${planId}`);
  return response.data;
};

// 플랜 일괄 아카이브
export const bulkArchivePlans = async (planIds: string[]) => {
  const response = await api.patch<{ success: boolean; data: { count: number }; message: string }>(
    '/plans/bulk/archive',
    { planIds }
  );
  return response.data;
};

// 플랜 일괄 복원
export const bulkUnarchivePlans = async (planIds: string[]) => {
  const response = await api.patch<{ success: boolean; data: { count: number }; message: string }>(
    '/plans/bulk/unarchive',
    { planIds }
  );
  return response.data;
};

// 플랜 일괄 삭제
export const bulkDeletePlans = async (planIds: string[]) => {
  const response = await api.delete<{ success: boolean; data: { count: number }; message: string }>('/plans/bulk', {
    data: { planIds },
  });
  return response.data;
};

// 플랜 수정 (이름, 설명, 테스트케이스 목록)
export const updatePlan = async (
  planId: string,
  data: { name?: string; description?: string; testCaseIds?: string[] }
) => {
  const response = await api.patch<{ success: boolean; data: PlanDetail; message: string }>(`/plans/${planId}`, data);
  return response.data;
};
