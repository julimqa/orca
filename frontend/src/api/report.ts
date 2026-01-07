import api from './axios';

export interface ReportShareLink {
  id: string;
  token: string;
  planId: string;
  createdByUserId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string | null;
}

export const createPlanReportShareLink = async (planId: string) => {
  const response = await api.post<{ success: boolean; data?: ReportShareLink; message?: string }>(
    `/reports/plans/${planId}/share-links`
  );
  return response.data;
};

export const listPlanReportShareLinks = async (planId: string) => {
  const response = await api.get<{ success: boolean; data?: ReportShareLink[]; message?: string }>(
    `/reports/plans/${planId}/share-links`
  );
  return response.data;
};

export const revokeReportShareLink = async (id: string) => {
  const response = await api.post<{ success: boolean; data?: ReportShareLink; message?: string }>(
    `/reports/share-links/${id}/revoke`
  );
  return response.data;
};

export interface PublicSharedReportResponse {
  share: {
    id: string;
    token: string;
    planId: string;
    createdAt: string;
    expiresAt: string;
    revokedAt?: string | null;
  };
  // Uses PlanDetail-like shape from backend include (plan + items + testCase + folder)
  plan: unknown;
}

export const getPublicPlanReportByToken = async (token: string) => {
  const response = await api.get<{ success: boolean; data?: PublicSharedReportResponse; message?: string }>(
    `/public/reports/share/${token}`
  );
  return response.data;
};
