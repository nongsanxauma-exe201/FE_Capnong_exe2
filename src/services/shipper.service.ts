import { httpClient, ApiResponse } from './http.client';
import { API_BASE_URL, TOKEN_KEY } from './api.config';
import { PageResponse } from '../types';

// ===================== TYPES =====================

export interface ShipperRegisterRequest {
  fullName: string;
  phoneNumber: string;
  email: string;
  password: string;
  address: string;
  license: string;
  vehicleNumber: string;
  bankAccount?: string;
  description?: string;
}

export interface ShipperRegisterResponse {
  id: number;
  email: string;
  fullName: string;
  phoneNumber: string;
  status: string;
}

/** Response từ GET /shipper/orders/nearby */
export interface AvailableOrderResponse {
  orderId: number;
  shopName: string;
  shopAddress: string;
  shopPhone?: string | null;        // ✅ SĐT shop để shipper liên hệ
  shippingAddress: string;
  recipientName: string;
  recipientPhone: string;
  shippingFee: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  estimatedDeliveryDate: string | null;

  // ✅ Khoảng cách shipper → shop (shipper tới lấy hàng)
  shipToShopKm: number | null;

  // ✅ Khoảng cách shop → nhà buyer (đường giao hàng)
  shopToBuyerKm: number | null;

  // backward compat (= shipToShopKm)
  distanceKm: number | null;
}

/** Response từ POST /shipper/orders/{id}/accept và /status */
export interface ShipperOrderResponse {
  orderId: number;
  buyerName: string;
  buyerPhone: string;
  shippingAddress: string;
  recipientName: string;
  recipientPhone: string;
  shippingFee: number;
  status: string;
  createdAt: string;
  estimatedDeliveryDate: string | null;
  note: string | null;
  paymentMethod?: string;
  totalAmount?: number;
  codAmount?: number | null;
  refundAmount?: number | null;
  refundReason?: string | null;
  // ✅ Tọa độ thật để FakeGPS dùng đúng điểm
  shopLatitude?: number | null;
  shopLongitude?: number | null;
  shippingLatitude?: number | null;
  shippingLongitude?: number | null;
}

export type UpdateOrderStatus = 'DELIVERED' | 'FAILED';

export interface UpdateOrderStatusRequest {
  status: UpdateOrderStatus;
  note?: string;
}

/** Response từ GET /shipper/location/order/{orderId} */
export interface ShipperLocationResponse {
  shipperId: number;
  shipperName: string;
  orderId: number;
  latitude: number;
  longitude: number;
  updatedAt: string;

  // ✅ Điểm lấy hàng (shop)
  shopLatitude?: number | null;
  shopLongitude?: number | null;

  // ✅ Điểm giao hàng (nhà buyer)
  destLatitude?: number | null;
  destLongitude?: number | null;
}

// ===================== SERVICE =====================

class ShipperService {

  async register(
    shipperData: ShipperRegisterRequest,
    documents?: { driverLicense?: File; portrait?: File }
  ): Promise<ApiResponse<ShipperRegisterResponse>> {
    const formData = new FormData();
    formData.append('data', JSON.stringify({ ...shipperData, roleName: 'SHIPPER' }));
    if (documents?.portrait) formData.append('logoUrl', documents.portrait);
    if (documents?.driverLicense) formData.append('achievement', documents.driverLicense);
    const response = await fetch(`${API_BASE_URL}/users/register`, { method: 'POST', body: formData });
    const data = await response.json();
    if (!response.ok) throw { status: response.status, data };
    return data;
  }

  async getNearbyOrders(lat: number, lng: number): Promise<ApiResponse<AvailableOrderResponse[]>> {
    return httpClient.get<AvailableOrderResponse[]>(`/shipper/orders/nearby?lat=${lat}&lng=${lng}`);
  }

  async getAvailableOrders(page = 0, size = 10): Promise<ApiResponse<PageResponse<AvailableOrderResponse>>> {
    return httpClient.get<PageResponse<AvailableOrderResponse>>(`/shipper/orders?page=${page}&size=${size}`);
  }

  async acceptOrder(orderId: number): Promise<ApiResponse<ShipperOrderResponse>> {
    return httpClient.post<ShipperOrderResponse>(`/shipper/orders/${orderId}/accept`, {});
  }

  async updateOrderStatus(orderId: number, request: UpdateOrderStatusRequest): Promise<ApiResponse<ShipperOrderResponse>> {
    return httpClient.post<ShipperOrderResponse>(`/shipper/orders/${orderId}/status`, request);
  }

  async getMyOrders(): Promise<ApiResponse<ShipperOrderResponse[]>> {
    return httpClient.get<ShipperOrderResponse[]>('/shipper/orders/my');
  }

  async getShipperLocation(orderId: number): Promise<ApiResponse<ShipperLocationResponse>> {
    return httpClient.get<ShipperLocationResponse>(`/shipper/location/order/${orderId}`);
  }
}

export const shipperService = new ShipperService();