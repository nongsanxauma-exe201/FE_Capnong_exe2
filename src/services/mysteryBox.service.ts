import { httpClient, ApiResponse } from './http.client';

export interface MysteryBox {
  id: number;
  boxType: string;
  imageUrl?: string;
  price: number;
  description?: string;
  note?: string;
  shopOwnerId: number;
  isActive?: boolean | number;
  totalQuantity?: number;
  soldQuantity?: number;
}

export interface ProductMysteryResponse {
  productId: number;
  productName: string;
  quantity: number;
  sellingPrice?: number;
}

export interface MysteryBoxResponse extends MysteryBox {
  products: ProductMysteryResponse[];
}

export interface ProductMysteryRequest {
  productId: number;
  quantity: number;
}

export interface MysteryBoxCreationRequest {
  boxType: string;
  price: number;
  description?: string;
  note?: string;
  totalQuantity: number;
  products: ProductMysteryRequest[];
}

export interface MysteryBoxUpdateRequest {
  boxType?: string;
  price?: number;
  description?: string;
  note?: string;
  totalQuantity?: number;
  products?: ProductMysteryRequest[];
  active?: boolean;
}

class MysteryBoxService {
  async getMyBoxes(): Promise<ApiResponse<MysteryBox[]>> {
    return httpClient.get<MysteryBox[]>('/mystery-boxes/me');
  }

  async getAll(): Promise<ApiResponse<MysteryBox[]>> {
    return httpClient.get<MysteryBox[]>('/mystery-boxes');
  }

  async getById(id: number): Promise<ApiResponse<MysteryBoxResponse>> {
    return httpClient.get<MysteryBoxResponse>(`/mystery-boxes/${id}`);
  }

  async getProductsByBoxId(boxId: number): Promise<ApiResponse<ProductMysteryResponse[]>> {
    return httpClient.get<ProductMysteryResponse[]>(`/mystery-boxes/${boxId}/products`);
  }

  async createMysteryBox(data: MysteryBoxCreationRequest, image?: File): Promise<ApiResponse<MysteryBox>> {
    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    if (image) {
      formData.append('image', image);
    }
    return httpClient.post<MysteryBox>('/mystery-boxes', formData);
  }

  async updateMysteryBox(id: number, data: MysteryBoxUpdateRequest, image?: File): Promise<ApiResponse<MysteryBox>> {
    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    if (image) {
      formData.append('image', image);
    }
    return httpClient.put<MysteryBox>(`/mystery-boxes/${id}`, formData);
  }

  async toggleActive(id: number): Promise<ApiResponse<MysteryBox>> {
    return httpClient.patch<MysteryBox>(`/mystery-boxes/${id}/toggle-active`);
  }

  async deleteMysteryBox(id: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`/mystery-boxes/${id}`);
  }
  async getForBuyer(): Promise<ApiResponse<MysteryBox[]>> {
    return httpClient.get<MysteryBox[]>('/mystery-boxes/buyer');
  }
 
}

export const mysteryBoxService = new MysteryBoxService();

