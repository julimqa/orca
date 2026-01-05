import type { ApiResponse } from './common';

/**
 * POST /api/upload/image 응답
 * - 현행: `{ success, data: { url, filename, originalname, size } }`
 */
export type UploadImageResponse = ApiResponse<{
  url: string;
  filename: string;
  originalname: string;
  size: number;
}>;


