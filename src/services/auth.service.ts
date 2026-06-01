/**
 * Authentication Service
 * Xử lý tất cả các chức năng liên quan đến xác thực
 */

import { httpClient, ApiResponse } from './http.client';
import { API_BASE_URL, TOKEN_KEY, REFRESH_TOKEN_KEY, USER_INFO_KEY } from './api.config';

/**
 * Request/Response Types
 */
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  authenticated: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  roleName: 'BUYER' | 'SHOP_OWNER' | 'SHIPPER' | 'ADMIN';
  // Shop Owner specific
  address?: string;
  shopName?: string;
  description?: string;
  bankAccount?: string;
}

export interface UserResponse {
  id: number;
  email: string;
  fullName: string;
  phoneNumber: string;
  address?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  role: {
    id: number;
    name: string;
    description?: string;
  };
  // Shop Owner specific
  shopName?: string;
  bankAccount?: string;
  ratingAverage?: number;
  description?: string;
  logoUrl?: string;
  achievement?: string;
  // Shipper specific
  license?: string;
  vehicleNumber?: string;
  // Computed field for frontend
  roleName?: string;
  // Additional optional fields
  username?: string;
  profileImageUrl?: string;
  kycStatus?: string;
  createdAt?: string;
  createAt?: string;
  lockedAt?: string | null;
  shopActive?: boolean;
}

export interface IntrospectRequest {
  token: string;
}

export interface IntrospectResponse {
  valid: boolean;
}

export interface RefreshTokenRequest {
  token: string;
}

export interface LogoutRequest {
  token: string;
}

/**
 * Authentication Service Class
 */
class AuthService {
  /**
   * Đăng nhập
   */
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    try {
      const response = await httpClient.post<LoginResponse>('/auth/login', credentials);

      // Lưu token vào localStorage
      if (response.result?.token) {
        this.setToken(response.result.token);
      }

      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Đăng ký tài khoản mới
   * BE endpoint dùng multipart/form-data với @RequestPart("data")
   */
  async register(userData: RegisterRequest, logoUrl?: File, achievement?: File): Promise<ApiResponse<UserResponse>> {
    try {
      const formData = new FormData();
      // BE expects "data" part as a JSON string
      formData.append('data', JSON.stringify(userData));
      if (logoUrl) formData.append('logoUrl', logoUrl);
      if (achievement) formData.append('achievement', achievement);

      const response = await fetch(`${API_BASE_URL}/users/register`, {
        method: 'POST',
        body: formData,
        // Không set Content-Type header, để browser tự động set multipart/form-data với boundary
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw {
          status: response.status,
          data: responseData,
        };
      }

      return responseData;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }

  /**
   * Đăng xuất
   */
  async logout(): Promise<void> {
    try {
      const token = this.getToken();
      if (token) {
        await httpClient.post('/auth/logout', { token });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuth();
    }
  }

  /**
   * Kiểm tra token có hợp lệ không
   */
  async introspect(token: string): Promise<ApiResponse<IntrospectResponse>> {
    try {
      const response = await httpClient.post<IntrospectResponse>('/auth/introspect', { token });
      return response;
    } catch (error) {
      console.error('Introspect error:', error);
      throw error;
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(token: string): Promise<ApiResponse<LoginResponse>> {
    try {
      const response = await httpClient.post<LoginResponse>('/auth/refresh', { token });

      // Cập nhật token mới
      if (response.result?.token) {
        this.setToken(response.result.token);
      }

      return response;
    } catch (error) {
      console.error('Refresh token error:', error);
      throw error;
    }
  }

  /**
   * Lấy thông tin user hiện tại
   */
  async getMyInfo(): Promise<ApiResponse<UserResponse>> {
    try {
      const response = await httpClient.get<UserResponse>('/users/me');

      // Lưu thông tin user vào localStorage
      if (response.result) {
        this.setUserInfo(response.result);
      }

      return response;
    } catch (error) {
      console.error('Get my info error:', error);
      throw error;
    }
  }

  /**
   * Cập nhật thông tin user hiện tại
   */
  async updateMyInfo(userData: Partial<UserResponse>, image?: File): Promise<ApiResponse<UserResponse>> {
    try {
      // 1. Cập nhật thông tin text trước (JSON PUT)
      const response = await httpClient.put<UserResponse>('/users/me', userData);

      // 2. Nếu có ảnh và update text thành công, cập nhật ảnh riêng (Multipart PATCH)
      if (image && response.result) {
        const formData = new FormData();
        formData.append('logoUrl', image);
        
        try {
          const imageResponse = await httpClient.patch<UserResponse>('/users/me/images', formData);
          if (imageResponse.result) {
            // Cập nhật lại thông tin user trong localStorage với ảnh mới
            this.setUserInfo(imageResponse.result);
            return imageResponse;
          }
        } catch (imgError) {
          console.error('Update profile image error:', imgError);
          // Vẫn trả về response của text update, nhưng có thể thông báo lỗi ảnh
        }
      }

      // Cập nhật thông tin user trong localStorage
      if (response.result) {
        this.setUserInfo(response.result);
      }
      return response;
    } catch (error) {
      console.error('Update my info error:', error);
      throw error;
    }
  }

  /**
   * Lưu token vào localStorage
   */
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  /**
   * Lấy token từ localStorage
   */
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Lưu thông tin user vào localStorage
   */
  setUserInfo(user: UserResponse): void {
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
  }

  /**
   * Lấy thông tin user từ localStorage
   */
  getUserInfo(): UserResponse | null {
    const userStr = localStorage.getItem(USER_INFO_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * Xóa tất cả thông tin xác thực
   */
  clearAuth(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_INFO_KEY);
  }

  /**
   * Kiểm tra user đã đăng nhập chưa
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

// Export singleton instance
export const authService = new AuthService();
