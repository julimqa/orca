import api from './axios';

export type AutomationType = 'MANUAL' | 'AUTOMATED';

export interface TestCase {
  id: string;
  caseNumber?: number; // OVDR 형식 ID용 자동 증가 번호
  title: string;
  description?: string | null;
  precondition?: string;
  steps?: string;
  expectedResult?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  automationType: AutomationType;
  category?: string | null; // 사용자 정의 카테고리
  sequence: number;
  folderId?: string | null;
  folder?: { id: string; name: string; parentId?: string | null } | null; // 폴더 정보
  folderPath?: { id: string; name: string }[]; // 폴더 경로 (상위 > 하위)
  createdAt: string;
  updatedAt?: string;
}

export const getTestCases = async (folderId?: string) => {
  const params = folderId ? { folderId } : {};
  const response = await api.get<{ success: boolean; data: TestCase[] }>('/testcases', { params });
  return response.data;
};

export const createTestCase = async (data: Partial<TestCase>) => {
  const response = await api.post<{ success: boolean; data: TestCase }>('/testcases', data);
  return response.data;
};

export const importTestCases = async (folderId: string | null, file: File, mapping: Record<string, string>) => {
  const formData = new FormData();
  formData.append('file', file);
  if (folderId) formData.append('folderId', folderId);
  formData.append('mapping', JSON.stringify(mapping));

  const response = await api.post('/testcases/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const updateTestCase = async (id: string, data: Partial<TestCase>) => {
  const response = await api.patch<{ success: boolean; data: TestCase }>(`/testcases/${id}`, data);
  return response.data;
};

export const deleteTestCase = async (id: string) => {
  const response = await api.delete<{ success: boolean; message: string }>(`/testcases/${id}`);
  return response.data;
};

// 테스트케이스 순서 변경
export const reorderTestCases = async (orderedIds: string[], folderId?: string) => {
  const params = folderId ? { folderId } : {};
  const response = await api.post<{ success: boolean; data: TestCase[] }>(
    '/testcases/reorder',
    { orderedIds },
    { params }
  );
  return response.data;
};

// 테스트케이스 일괄 수정
export const bulkUpdateTestCases = async (
  ids: string[],
  updates: { priority?: 'LOW' | 'MEDIUM' | 'HIGH'; automationType?: AutomationType; category?: string | null }
) => {
  const response = await api.patch<{ success: boolean; data: { count: number; message: string } }>('/testcases/bulk', {
    ids,
    ...updates,
  });
  return response.data;
};

// 테스트케이스 일괄 삭제
export const bulkDeleteTestCases = async (ids: string[]) => {
  const response = await api.delete<{ success: boolean; data: { count: number; message: string } }>('/testcases/bulk', {
    data: { ids },
  });
  return response.data;
};

// 테스트케이스 폴더 이동
export const moveTestCasesToFolder = async (ids: string[], targetFolderId: string | null) => {
  const response = await api.post<{ success: boolean; data: { count: number; message: string } }>('/testcases/move', {
    ids,
    targetFolderId,
  });
  return response.data;
};
