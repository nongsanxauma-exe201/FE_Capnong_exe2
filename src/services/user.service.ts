import { httpClient, ApiResponse } from './http.client';
import { UserResponse } from './auth.service';
import { API_BASE_URL, TOKEN_KEY } from './api.config';
import { PageResponse } from '../types';

export interface UserUpdateRequest {
  fullName?: string;
  phoneNumber?: string;
  address?: string;
  shopName?: string;
  bankAccount?: string;
  description?: string;
}

class UserService {
  async getAllUsers(): Promise<ApiResponse<UserResponse[]>> {
    return httpClient.get<UserResponse[]>('/users');
  }

  async getAllUsersPaged(page = 0, size = 10): Promise<ApiResponse<PageResponse<UserResponse>>> {
    return httpClient.get<PageResponse<UserResponse>>(`/users/paged?page=${page}&size=${size}`);
  }

  async getUsersByRolePaged(roles: string[], status: string | null, page = 0, size = 10): Promise<ApiResponse<PageResponse<UserResponse>>> {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    roles.forEach(r => params.append('roles', r));
    if (status) params.append('status', status);
    return httpClient.get<PageResponse<UserResponse>>(`/users/paged?${params.toString()}`);
  }

  /**
   * Get user by ID (Admin only)
   */
  async getUserById(userId: number): Promise<ApiResponse<UserResponse>> {
    return httpClient.get<UserResponse>(`/users/${userId}`);
  }

  /**
   * Update user (Admin only) - multipart form-data
   */
  async updateUser(userId: number, data: UserUpdateRequest, logoUrl?: File, achievement?: File): Promise<ApiResponse<UserResponse>> {
    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    if (logoUrl) formData.append('logoUrl', logoUrl);
    if (achievement) formData.append('achievement', achievement);

    const token = localStorage.getItem(TOKEN_KEY);
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PUT',
      headers,
      body: formData,
    });

    const responseData = await response.json();
    if (!response.ok) {
      throw { status: response.status, data: responseData };
    }
    return responseData;
  }

  /**
   * Approve shop owner (Admin only)
   */
  async approveShopOwner(userId: number): Promise<ApiResponse<UserResponse>> {
    return httpClient.patch<UserResponse>(`/users/${userId}/approve-shop-owner`, {});
  }

  /**
   * Approve shipper (Admin only)
   */
  async approveShipper(userId: number): Promise<ApiResponse<UserResponse>> {
    return httpClient.patch<UserResponse>(`/users/${userId}/approve-shipper`, {});
  }

  /**
   * Activate user (Admin only)
   */
  async activateUser(userId: number): Promise<ApiResponse<void>> {
    return httpClient.patch<void>(`/users/${userId}/activate`, {});
  }

  /**
   * Deactivate user (Admin only)
   */
  async deactivateUser(userId: number): Promise<ApiResponse<void>> {
    return httpClient.patch<void>(`/users/${userId}/deactivate`, {});
  }

  async openCloseShop(shopId: number, open: boolean): Promise<ApiResponse<UserResponse>> {
    return httpClient.patch<UserResponse>(`/users/${shopId}/open-close?open=${open}`, {});
  }

  /**
   * Delete user (Admin only)
   */
  async deleteUser(userId: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`/users/${userId}`);
  }
}

export const userService = new UserService();
