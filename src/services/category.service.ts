import { httpClient, ApiResponse } from './http.client';

export interface CategoryResponse {
    id: number;
    name: string;
    description?: string;
}

class CategoryService {
    async getAll(): Promise<ApiResponse<CategoryResponse[]>> {
        return httpClient.get<CategoryResponse[]>('/categories');
    }
}

export const categoryService = new CategoryService();
