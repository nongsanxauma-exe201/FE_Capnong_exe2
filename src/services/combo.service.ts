import { httpClient, ApiResponse } from './http.client';

export interface ProductComboRequest {
    productId: number;
    quantity: number;
}

export type Region = 'MIEN_BAC' | 'MIEN_TRUNG' | 'MIEN_NAM';

export interface BuildComboCreationRequest {
    comboName: string;
    discountPrice: number;
    description: string;
    type: string;
    region?: Region;
    items: ProductComboRequest[];
    totalQuantity?: number;
}

export interface BuildComboUpdateRequest extends BuildComboCreationRequest { }

export interface ProductComboResponse {
    productId: number;
    productName: string;
    price: number;
    quantity: number;
}

export interface BuildComboResponse {
    id: number;
    comboName: string;
    discountPrice: number;
    description: string;
    type: string;
    region?: Region;
    mealType?: string;
    shopOwnerId: number;
    imageUrl?: string;
    items: ProductComboResponse[];
    totalQuantity?: number;
    soldQuantity?: number;
}

export interface ShopComboCountResponse {
    shopId: number;
    shopName: string;
    logoUrl: string;
    comboCount: number;
}

class ComboService {
    private readonly baseUrl = '/build-combos';

    async getAll(): Promise<ApiResponse<BuildComboResponse[]>> {
        const response = await httpClient.get<BuildComboResponse[]>(this.baseUrl);
        return response;
    }

    async getShopsByComboCount(): Promise<ApiResponse<ShopComboCountResponse[]>> {
        const response = await httpClient.get<ShopComboCountResponse[]>(`${this.baseUrl}/shops`);
        return response;
    }

    async create(request: BuildComboCreationRequest, image?: File): Promise<ApiResponse<BuildComboResponse>> {
        const formData = new FormData();
        formData.append('data', new Blob([JSON.stringify(request)], { type: 'application/json' }));
        if (image) formData.append('image', image);
        return httpClient.post<BuildComboResponse>(this.baseUrl, formData);
    }

    async update(id: number, request: BuildComboUpdateRequest, image?: File): Promise<ApiResponse<BuildComboResponse>> {
        const formData = new FormData();
        formData.append('data', new Blob([JSON.stringify(request)], { type: 'application/json' }));
        if (image) formData.append('image', image);
        return httpClient.put<BuildComboResponse>(`${this.baseUrl}/${id}`, formData);
    }

    async delete(id: number): Promise<ApiResponse<void>> {
        const response = await httpClient.delete<void>(`${this.baseUrl}/${id}`);
        return response;
    }

    async getById(id: number): Promise<ApiResponse<BuildComboResponse>> {
        const response = await httpClient.get<BuildComboResponse>(`${this.baseUrl}/${id}`);
        return response;
    }

    async getByShop(shopId: number): Promise<ApiResponse<BuildComboResponse[]>> {
        const response = await httpClient.get<BuildComboResponse[]>(`${this.baseUrl}/shop/${shopId}`);
        return response;
    }

    async getMyCombos(): Promise<ApiResponse<BuildComboResponse[]>> {
        const response = await httpClient.get<BuildComboResponse[]>(`${this.baseUrl}/my-combos`);
        return response;
    }
}

export const comboService = new ComboService();
