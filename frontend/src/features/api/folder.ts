import api from './axios';

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface FolderTreeItem extends Folder {
  children: FolderTreeItem[];
}

export const getFolderTree = async () => {
  const response = await api.get<{ success: boolean; data: FolderTreeItem[] }>('/folders/tree');
  return response.data;
};

export const createFolder = async (name: string, parentId: string | null) => {
  const response = await api.post<{ success: boolean; data: Folder }>('/folders', { name, parentId });
  return response.data;
};

export const getFolderTestCases = async (folderId: string) => {
  const response = await api.get(`/folders/${folderId}/testcases`);
  return response.data;
};

// 폴더 이동 (부모 변경 또는 순서 변경)
export const moveFolder = async (id: string, newParentId: string | null, newOrder?: number) => {
  const response = await api.patch<{ success: boolean; data: Folder }>(`/folders/${id}/move`, {
    newParentId,
    newOrder,
  });
  return response.data;
};

// 폴더 순서 일괄 업데이트
export const reorderFolders = async (folders: { id: string; order: number }[]) => {
  const response = await api.patch<{ success: boolean; message: string }>('/folders/reorder', {
    folders,
  });
  return response.data;
};

// 폴더 이름 변경
export const renameFolder = async (id: string, name: string) => {
  const response = await api.patch<{ success: boolean; data: Folder }>(`/folders/${id}/rename`, {
    name,
  });
  return response.data;
};

// 폴더 삭제 (하위 폴더 및 테스트케이스 포함)
export const deleteFolder = async (id: string) => {
  const response = await api.delete<{ success: boolean; message: string }>(`/folders/${id}`);
  return response.data;
};

// 폴더 일괄 삭제
export const bulkDeleteFolders = async (ids: string[]) => {
  const response = await api.delete<{
    success: boolean;
    data: { count: number; totalDeleted: number; message: string };
  }>('/folders/bulk', { data: { ids } });
  return response.data;
};
