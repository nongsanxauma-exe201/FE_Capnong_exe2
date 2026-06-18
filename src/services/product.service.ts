import { httpClient, ApiResponse } from './http.client';
import { PageResponse } from '../types';

export interface ProductImageResponse {
    id: number;
    imageUrl: string;
    isPrimary: boolean;
    displayOrder: number;
}

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
    expiryDate?: string;
    images?: ProductImageResponse[];
    // Discount
    discountPercent?: number;
    discountStartDate?: string;
    discountEndDate?: string;
    salePrice?: number;
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
    categoryId?: number;
    expiryDate?: string;
    discountPercent?: number;
    discountStartDate?: string;
    discountEndDate?: string;
}

export interface ImageOrderItem {
    id: number;
    displayOrder: number;
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

    async createProduct(data: ProductCreationRequest, images?: File[]): Promise<ApiResponse<ProductResponse>> {
        const formData = new FormData();
        formData.append('data', JSON.stringify(data));
        if (images && images.length > 0) {
            images.forEach(img => formData.append('images', img));
        }
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

    // ── Gallery APIs ────────────────────────────────────────────────────────

    async getImages(productId: number): Promise<ApiResponse<ProductImageResponse[]>> {
        return httpClient.get<ProductImageResponse[]>(`/products/${productId}/images`);
    }

    async addImages(productId: number, images: File[]): Promise<ApiResponse<ProductImageResponse[]>> {
        const formData = new FormData();
        images.forEach(img => formData.append('images', img));
        return httpClient.post<ProductImageResponse[]>(`/products/${productId}/images`, formData);
    }

    async deleteImage(productId: number, imageId: number): Promise<ApiResponse<void>> {
        return httpClient.delete<void>(`/products/${productId}/images/${imageId}`);
    }

    async setPrimaryImage(productId: number, imageId: number): Promise<ApiResponse<ProductImageResponse>> {
        return httpClient.patch<ProductImageResponse>(`/products/${productId}/images/primary`, { imageId });
    }

    async reorderImages(productId: number, images: ImageOrderItem[]): Promise<ApiResponse<ProductImageResponse[]>> {
        return httpClient.patch<ProductImageResponse[]>(`/products/${productId}/images/reorder`, { images });
    }
}

export const productService = new ProductService();
