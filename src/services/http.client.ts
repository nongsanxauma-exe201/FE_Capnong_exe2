/**
 * HTTP Client
 * Xử lý tất cả các HTTP requests với axios-like interface
 */

import { API_BASE_URL, API_TIMEOUT, TOKEN_KEY, REFRESH_TOKEN_KEY, USER_INFO_KEY } from './api.config';

export interface ApiResponse<T = any> {
  code?: number;
  message?: string;
  result?: T;
  suggestions?: string[];
  actions?: any[];
  context?: any;
}

export interface RequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  timeout?: number;
}

class HttpClient {
  private baseURL: string;
  private timeout: number;

  constructor(baseURL: string, timeout: number) {
    this.baseURL = baseURL;
    this.timeout = timeout;
  }

  /**
   * Lấy token từ localStorage
   */
  private getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Kiểm tra xem endpoint có phải là public không
   */
  private isPublicEndpoint(method: string, url: string): boolean {
    // Các trường hợp ngoại lệ (vẫn cần auth)
    if (url === '/mystery-boxes/me') return false;
    if (url.includes('/blogs/admin')) return false;

    // Các endpoint chỉ cho phép GET là public
    if (method === 'GET') {
      const publicGetEndpoints = [
        '/products',
        '/mystery-boxes',
        '/reviews',
        '/blogs/published',
        '/build-combos',
      ];
      if (publicGetEndpoints.some(endpoint => url === endpoint || url.startsWith(`${endpoint}?`) || url.startsWith(`${endpoint}/paged`))) {
        return true;
      }
      // Only the exact root /blogs (possibly with params) might be public if intended, 
      // but usually published is the one for users.
    }


    // Các endpoint hoàn toàn public (bất kể GET/POST)
    const fullyPublicEndpoints = [
      '/auth/login',
      '/users/register',
      '/otp-verification',
      '/forgot-password',
    ];

    return fullyPublicEndpoints.some(endpoint => url.includes(endpoint));
  }

  /**
   * Tạo headers mặc định
   */
  private getDefaultHeaders(method: string, url: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Luôn gửi token nếu có, để backend có thể phân biệt người dùng (ví dụ: Admin xem được bản nháp)
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }


  /**
   * Xử lý query parameters
   */
  private buildQueryString(params?: Record<string, any>): string {
    if (!params) return '';

    const queryString = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    return queryString ? `?${queryString}` : '';
  }

  /**
   * Thực hiện HTTP request
   */
  private async request<T>(
    method: string,
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const fullUrl = `${this.baseURL}${url}${this.buildQueryString(config?.params)}`;

    const isFormData = data instanceof FormData;

    // Tạo headers hoàn chỉnh
    const headers: Record<string, string> = {
      ...this.getDefaultHeaders(method, url),
      ...config?.headers,
    };

    // Nếu là FormData, ta để trình duyệt tự quyết định Content-Type (bao gồm boundary)
    if (isFormData) {
      delete headers['Content-Type'];
    }

    // Debug logging
    console.log(`[HTTP] ${method} ${fullUrl}`);
    console.log('[HTTP] Headers:', headers);
    console.log('[HTTP] Token:', this.getToken() ? 'Present' : 'Missing');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config?.timeout || this.timeout);

    try {
      const body = isFormData ? data : (data ? JSON.stringify(data) : undefined);

      console.log(`[HTTP] Request body:`, body);

      const response = await fetch(fullUrl, {
        method,
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseData = await response.json();

      if (!response.ok) {
        console.error(`[HTTP] Error ${response.status}:`, responseData);

        // Nếu 401:
        // - cho endpoint confirm thanh toán (được gọi từ PaymentSuccess) thì chỉ throw, không logout.
        // - các endpoint khác vẫn giữ redirect exit như cũ (cần login lại).
        if (response.status === 401) {
          console.error('[HTTP] Unauthorized - Endpoint:', url);

          const isPaymentConfirmEndpoint = method === 'POST' && /\/payments\/\d+\/confirm(?:\?.*)?$/.test(url);

          if (!isPaymentConfirmEndpoint && !this.isPublicEndpoint(method, url)) {
            console.error('[HTTP] Redirecting to login/home...');
            const token = localStorage.getItem(TOKEN_KEY);
            const basename = '/';

            // Chỉ redirect khi đang có token (cần force-logout do token hết hạn/invalid)
            // Nếu không có token, user chưa đăng nhập, không cần redirect — trang sẽ tự xử lý lỗi
            if (token) {
              localStorage.removeItem(TOKEN_KEY);
              localStorage.removeItem(REFRESH_TOKEN_KEY);
              localStorage.removeItem(USER_INFO_KEY);
              window.location.href = basename;
            }
          }
        }

        throw {
          status: response.status,
          data: responseData,
        };

      }

      return responseData;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url, undefined, config);
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, data, config);
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, data, config);
  }

  /**
   * PATCH request
   */
  async patch<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', url, data, config);
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url, undefined, config);
  }
}

// Export singleton instance
export const httpClient = new HttpClient(API_BASE_URL, API_TIMEOUT);
