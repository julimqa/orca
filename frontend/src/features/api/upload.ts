import api from './axios';

export interface UploadResponse {
  url: string;
  filename: string;
  originalname: string;
  size: number;
}

export const uploadImage = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await api.post<{ success: boolean; data: UploadResponse }>('/upload/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data.data;
};
