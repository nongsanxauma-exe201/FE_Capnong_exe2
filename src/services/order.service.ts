import { httpClient, ApiResponse } from './http.client';
import { PageResponse } from '../types';
import type { QualityCheckResponse } from './quality.service';

export interface TrackingImageResponse {
    imageUrl: string;
}

export interface TrackingResponse {
    trackingId: string;
    status: string;
    createdAt: string;
    images?: TrackingImageResponse[];
}

export interface OrderItemRequest {
    productId?: number;
    mysteryBoxId?: number;
    buildComboId?: number;
    quantity: number;
}

export interface OrderCreationRequest {
    recipientName: string;
    recipientPhone: string;
    shippingAddress: string;
    note?: string;
    paymentMethod: string;
    items: OrderItemRequest[];
}

export interface OrderUpdateRequest {
    status: string;
    [key: string]: any;
}

export interface OrderItemResponse {
    orderDetailId?: number;
    productId?: number;
    mysteryBoxId?: number;
    productName?: string;
    mysteryBoxType?: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    itemType: 'PRODUCT' | 'MYSTERY_BOX';
    category?: string;
    imageUrl?: string;
    isRequestedReturn?: boolean;
    returnStatus?: string;
    qualityResult?: QualityCheckResponse;
}

export interface OrderResponse {
    id: number;
    shopOwner?: {
        id?: number;
        shopName?: string;
        fullName?: string;
        phoneNumber?: string;
        logoUrl?: string;
        address?: string;
    };
    recipientName: string;
    recipientPhone: string;
    shippingAddress: string;
    paymentMethod: string;
    note: string;
    shippingFee: number;
    totalAmount: number;
    status: string;
    createdAt: string;
    items: OrderItemResponse[];
    buyerId?: number;
    trackings?: TrackingResponse[];
    passedQualityCheck?: boolean | null;
}

/** Báo cáo đơn cho staff — khớp `StaffOrderReportResponse` (BE). */
export interface StaffOrderReportResponse {
    /** Đơn hàng đang được vận chuyển tới kho */
    incomingOrders?: number | null;
    /** Đơn hàng đang kiểm tra (QUALITY_CHECKING) */
    quantityChecking?: number | null;
    /** Đơn hàng đang chờ kiểm duyệt chất lượng (ARRIVED_AT_WAREHOUSE) */
    qualityCheckingOrders?: number | null;
    /** Đơn hàng đã đạt chuẩn và cần đóng gói (QUALITY_CHECKED) */
    packagingOrders?: number | null;
    /** Đơn hàng đã đóng gói xong, chờ shipper lấy (READY) */
    readyOrders?: number | null;
    /** Số lượng nông dân cần được duyệt / xử lý */
    pendingFarmerApprovals?: number | null;
    /** Số đơn hàng đã kiểm duyệt thành công hôm nay */
    approvedTodayOrders?: number | null;
}

class OrderService {
    async getAllOrders(): Promise<ApiResponse<OrderResponse[]>> {
        return httpClient.get<OrderResponse[]>('/orders');
    }

    async getAllOrdersPaged(page = 0, size = 10): Promise<ApiResponse<PageResponse<OrderResponse>>> {
        return httpClient.get<PageResponse<OrderResponse>>(`/orders/paged?page=${page}&size=${size}`);
    }

    async getOrdersByUserId(userId: number): Promise<ApiResponse<OrderResponse[]>> {
        return httpClient.get<OrderResponse[]>(`/orders/user/${userId}`);
    }

    async getOrdersByUserIdPaged(userId: number, page = 0, size = 10): Promise<ApiResponse<PageResponse<OrderResponse>>> {
        return httpClient.get<PageResponse<OrderResponse>>(`/orders/user/${userId}/paged?page=${page}&size=${size}`);
    }

    async getOrdersForStaff(page = 0, size = 10, status?: string): Promise<ApiResponse<PageResponse<OrderResponse>>> {
        const params: Record<string, any> = { page, size };
        if (status) params.status = status;
        return httpClient.get<PageResponse<OrderResponse>>('/orders/staff', { params });
    }

    async getOrderById(id: number): Promise<ApiResponse<OrderResponse>> {
        return httpClient.get<OrderResponse>(`/orders/${id}`);
    }

    /** GET báo cáo staff (VD: controller `/orders/staff` + `/report`). */
    async getStaffOrderReport(): Promise<ApiResponse<StaffOrderReportResponse>> {
        return httpClient.get<StaffOrderReportResponse>('/orders/staff/report');
    }

    async createOrder(data: OrderCreationRequest): Promise<ApiResponse<OrderResponse>> {
        return httpClient.post<OrderResponse>('/orders', data);
    }

    async updateOrder(
        id: number,
        request: OrderUpdateRequest,
        files?: File[]
    ): Promise<ApiResponse<OrderResponse>> {
        const formData = new FormData();
        
        // Add request as JSON blob
        formData.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }), 'request.json');
        
        // Add files if provided
        if (files && files.length > 0) {
            files.forEach((file, index) => {
                formData.append('files', file);
            });
        }

        console.log('[OrderService] Updating order:', id, 'with data:', request);
        return httpClient.patch<OrderResponse>(`/orders/${id}`, formData);
    }

    async deleteOrder(id: number): Promise<ApiResponse<string>> {
        return httpClient.delete<string>(`/orders/${id}`);
    }
}

export const orderService = new OrderService();
