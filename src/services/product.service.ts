import { httpClient, ApiResponse } from './http.client';
import { PageResponse } from '../types';


export interface ProductResponse {
    id: number;
    productId?: number;
    productName: string;
    unit: string;
    sellingPrice: number;
    stockQuantity: number;
    description: string;
    imageUrl: string;
    status?: string;
    shopOwnerId?: number;
    shopId?: number;
    shopName?: string;
    categoryId?: number;
    expiryDate?: string; // ISO date string: "YYYY-MM-DD"
}

function normalizeProduct(p: ProductResponse): ProductResponse {
    return { ...p, id: p.id || p.productId || 0 };
}

export interface ProductCreationRequest {
    productName: string;
    unit: string;
    sellingPrice: number;
    stockQuantity: number;
    description: string;
    imageUrl?: string;
    categoryId?: number;
    expiryDate?: string; // "YYYY-MM-DD"
}

class ProductService {
    async getAll(): Promise<ApiResponse<ProductResponse[]>> {
        const res = await httpClient.get<ProductResponse[]>('/products');
        if (res.result) res.result = res.result.map(normalizeProduct);
        return res;
    }

    async getAllPaged(page = 0, size = 10): Promise<ApiResponse<PageResponse<ProductResponse>>> {
        const res = await httpClient.get<PageResponse<ProductResponse>>(`/products/paged?page=${page}&size=${size}`);
        if (res.result?.content) res.result.content = res.result.content.map(normalizeProduct);
        return res;
    }

    async getById(id: number): Promise<ApiResponse<ProductResponse>> {
        const res = await httpClient.get<ProductResponse>(`/products/${id}`);
        if (res.result) res.result = normalizeProduct(res.result);
        return res;
    }

    async getByShopId(shopId: number): Promise<ApiResponse<ProductResponse[]>> {
        const res = await httpClient.get<ProductResponse[]>(`/products/shop/${shopId}`);
        if (res.result) res.result = res.result.map(normalizeProduct);
        return res;
    }

    async getByShopIdPaged(shopId: number, page = 0, size = 10): Promise<ApiResponse<PageResponse<ProductResponse>>> {
        const res = await httpClient.get<PageResponse<ProductResponse>>(`/products/shop/${shopId}/paged?page=${page}&size=${size}`);
        if (res.result?.content) res.result.content = res.result.content.map(normalizeProduct);
        return res;
    }

    async createProduct(data: ProductCreationRequest, image?: File): Promise<ApiResponse<ProductResponse>> {
        const formData = new FormData();
        formData.append('data', JSON.stringify(data));
        if (image) formData.append('image', image);
        return httpClient.post<ProductResponse>('/products', formData);
    }

    async updateProduct(id: number, data: Partial<ProductCreationRequest>, image?: File): Promise<ApiResponse<ProductResponse>> {
        const formData = new FormData();
        formData.append('data', JSON.stringify(data));
        if (image) formData.append('image', image);
        return httpClient.put<ProductResponse>(`/products/${id}`, formData);
    }

    async deleteProduct(id: number): Promise<ApiResponse<void>> {
        return httpClient.delete<void>(`/products/${id}`);
    }

    async activateProduct(id: number): Promise<ApiResponse<void>> {
        return httpClient.put<void>(`/products/active/${id}`);
    }

    async getPendingProducts(): Promise<ApiResponse<ProductResponse[]>> {
        const res = await httpClient.get<ProductResponse[]>('/products/pending');
        if (res.result) res.result = res.result.map(normalizeProduct);
        return res;
    }

    async approveProduct(id: number): Promise<ApiResponse<ProductResponse>> {
        return httpClient.patch<ProductResponse>(`/products/${id}/approve`);
    }

    async rejectProduct(id: number, reason: string): Promise<ApiResponse<ProductResponse>> {
        return httpClient.patch<ProductResponse>(`/products/${id}/reject?reason=${encodeURIComponent(reason)}`);
    }
     async getForBuyer(): Promise<ApiResponse<ProductResponse[]>> {
        const res = await httpClient.get<ProductResponse[]>('/products/buyer');
        if (res.result) res.result = res.result.map(normalizeProduct);
        return res;
    }
}

export const productService = new ProductService();
