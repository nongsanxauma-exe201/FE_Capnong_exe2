import { httpClient, ApiResponse } from './http.client';
import { PageResponse } from '../types';

export type QualityResult = 'APPROVED' | 'REJECTED';

export interface QualityCheckingRequest {
  qualityCrieriaId: number;
  passed: boolean;
}

export interface QualityCheckRequest {
  note?: string;
  qualityResult: QualityResult;
  orderDetailId?: number;
  orderMysteryBoxId?: number;
  qualityChecks: QualityCheckingRequest[];
  rejectedWeight?: number;
}

export interface QualityCheckImage {
  imageUrl: string;
}

export interface QualityCheckingResponse {
  qualityName: string;
  qualityCheckId: string;
  images?: QualityCheckImage[];
  passed: boolean;
}

export interface QualityCheckResponse {
  orderDetailId?: number;
  orderMysteryBoxId?: number;
  orderId?: number;
  qualityResult: QualityResult;
  note?: string | null;
  qualityCheckingResponses?: QualityCheckingResponse[];
  createdAt?: string;
  status?: string;
  summary?: string;
  rejectedWeight?: number;
}

export interface QualityCriteriaItem {
  key: string;
  label: string;
  description?: string;
}

export interface QualityCriteriaPageResponse extends PageResponse<QualityCriteriaItem> {}

class QualityService {
  async checkQuality(
    request: QualityCheckRequest,
    fileMap?: Record<string, File[]>
  ): Promise<ApiResponse<QualityCheckResponse>> {
    const formData = new FormData();
    formData.append(
      'qualityCheckRequest',
      new Blob([JSON.stringify(request)], { type: 'application/json' })
    );

    if (fileMap) {
      Object.entries(fileMap).forEach(([key, files]) => {
        files.forEach((file) => {
          formData.append(key, file);
        });
      });
    }

    return httpClient.post<QualityCheckResponse>('/quality-checks', formData);
  }

  async getByOrderItemId(orderDetailId: number): Promise<ApiResponse<QualityCheckResponse>> {
    return httpClient.get<QualityCheckResponse>(`/quality-checks/${orderDetailId}`);
  }

  async getByMysteryBox(mysteryBoxId: number): Promise<ApiResponse<QualityCheckResponse>> {
    return httpClient.get<QualityCheckResponse>(`/quality-checks/mystery-box/${mysteryBoxId}`);
  }

  async getQualityCriteriaById(page = 0, size = 10): Promise<ApiResponse<QualityCriteriaPageResponse>> {
    return httpClient.get<QualityCriteriaPageResponse>('/quality-checks/criteria', {
      params: { page, size },
    });
  }
}

export const qualityService = new QualityService();