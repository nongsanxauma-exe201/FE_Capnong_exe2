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
    quantityKg?: number;
}

export interface OrderCreationRequest {
    recipientName: string;
    recipientPhone: string;
    shippingAddress: string;
    note?: string;
    paymentMethod: string;
    voucherUserId?: string;
    voucherUserIds?: string[];
    voucherCodes?: string[];
    items: OrderItemRequest[];
}

export interface ShopOrderRequest {
    shopOwnerId?: number;
    voucherUserId?: string;
    voucherUserIds?: string[];
    voucherCodes?: string[];
    items: OrderItemRequest[];
}

export interface CheckoutBatchRequest {
    recipientName: string;
    recipientPhone: string;
    shippingAddress: string;
    note?: string;
    paymentMethod: string;
    shopOrders: ShopOrderRequest[];
    batchVoucherUserId?: string;
}

export interface CheckoutBatchResponse {
    batchId: number;
    orders: OrderResponse[];
    orderIds: number[];
    totalAmount: number;
    paymentMethod?: string;
    checkoutUrl?: string;
    qrCodeUrl?: string;
    payosOrderCode?: string;
}

export interface OrderUpdateRequest {
    status: string;
    [key: string]: any;
}

export interface QcBuyerDecisionRequest {
    acceptRemaining: boolean;
}

export interface OrderItemResponse {
    orderDetailId?: number;
    productId?: number;
    mysteryBoxId?: number;
    orderMysteryBoxId?: number;
    productName?: string;
    mysteryBoxType?: string;
    quantity: number;
    quantityKg?: number;
    unit?: string;
    unitPrice: number;
    pricePerKg?: number;
    unitWeightKg?: number;
    rescuedWeightKg?: number;
    itemType: 'PRODUCT' | 'MYSTERY_BOX';
    category?: string;
    imageUrl?: string;
    isRequestedReturn?: boolean;
    returnStatus?: string;
    qualityResult?: QualityCheckResponse;
}

/** Dòng hàng là hộp mù (không chỉ dựa vào itemType vì BE đôi khi trả thiếu/sai). */
export function isMysteryBoxOrderItem(item: OrderItemResponse): boolean {
    if (item.orderMysteryBoxId != null) return true;
    const type = String(item.itemType ?? '').toUpperCase();
    if (type === 'MYSTERY_BOX') return true;
    if (item.mysteryBoxType) return true;
    if (item.mysteryBoxId != null && item.productId == null) return true;
    return false;
}

/** ID dòng order_mystery_box — không dùng orderDetailId cho hộp mù. */
export function getOrderMysteryBoxLineId(item: OrderItemResponse): number | undefined {
    if (item.orderMysteryBoxId != null) return Number(item.orderMysteryBoxId);
    const extra = item as OrderItemResponse & { id?: number; orderMysteryBoxID?: number };
    if (extra.orderMysteryBoxID != null) return Number(extra.orderMysteryBoxID);
    if (isMysteryBoxOrderItem(item) && extra.id != null && item.orderDetailId == null) {
        return Number(extra.id);
    }
    return undefined;
}

export function normalizeOrderItem(item: OrderItemResponse): OrderItemResponse {
    const mystery = isMysteryBoxOrderItem(item);
    const orderMysteryBoxId = getOrderMysteryBoxLineId(item);
    return {
        ...item,
        itemType: mystery ? 'MYSTERY_BOX' : (item.itemType ?? 'PRODUCT'),
        orderMysteryBoxId: orderMysteryBoxId ?? item.orderMysteryBoxId,
    };
}

export function normalizeOrderResponse(order: OrderResponse): OrderResponse {
    return {
        ...order,
        items: (order.items ?? []).map(normalizeOrderItem),
    };
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
  shippingDiscountAmount?: number;
    totalAmount: number;
    totalKg?: number;
    rescuedKg?: number;
    rescuedWeight?: number;
    rewardPoints?: number;
    rewardApplied?: boolean;
    status: string;
    createdAt: string;
    items: OrderItemResponse[];
    buyerId?: number;
    trackings?: TrackingResponse[];
    passedQualityCheck?: boolean | null;
    refundAmount?: number | null;
    refundReason?: string | null;
    codAmount?: number | null;
    codPrepaidAmount?: number | null;
    codPaymentOption?: 'CASH' | 'WALLET' | null;
    codPaymentStatus?: string | null;
    codSettled?: boolean | null;
    codSettledAt?: string | null;
    qcRefundedAmount?: number | null;
    qcBuyerDecisionDeadline?: string | null;
    qcBuyerAcceptedRemaining?: boolean | null;
    checkoutBatchId?: number | null;
    batchUnpaidCount?: number | null;
    batchShopCount?: number | null;
    hasPlatformBatchVoucher?: boolean | null;
    batchPendingTotalAmount?: number | null;
}

export interface ShopReportOrderDay {
    label?: string;
    fromDate?: string;
    toDate?: string;
    completed?: number;
    processing?: number;
    cancelled?: number;
    total?: number;
}

export interface ShopReportTopSold {
    productId?: number;
    productName?: string;
    sold?: number;
    price?: number;
}

export interface OrderShopReport {
    totalRevenue?: number;
    totalOrder?: number;
    averagePrice?: number;
    averageReview?: number;
    reportOrderWeek?: ShopReportOrderDay[];
    topSold?: ShopReportTopSold[];
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

    async getAllOrdersPaged(page = 0, size = 10, statuses?: string[]): Promise<ApiResponse<PageResponse<OrderResponse>>> {
        const statusParam = statuses && statuses.length > 0
            ? `&${statuses.map(s => `statuses=${s}`).join('&')}`
            : '';
        return httpClient.get<PageResponse<OrderResponse>>(`/orders/paged?page=${page}&size=${size}${statusParam}`);
    }

    async getOrdersByUserId(userId: number): Promise<ApiResponse<OrderResponse[]>> {
        return httpClient.get<OrderResponse[]>(`/orders/user/${userId}`);
    }

    async getOrdersByUserIdPaged(userId: number, page = 0, size = 10, statuses?: string[]): Promise<ApiResponse<PageResponse<OrderResponse>>> {
        const statusParam = statuses && statuses.length > 0
            ? `&${statuses.map(s => `statuses=${s}`).join('&')}`
            : '';
        return httpClient.get<PageResponse<OrderResponse>>(`/orders/user/${userId}/paged?page=${page}&size=${size}${statusParam}`);
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

    async getShopReport(type: 'week' | 'month' | 'all'): Promise<ApiResponse<OrderShopReport>> {
        return httpClient.get<OrderShopReport>('/orders/shop/reports', { params: { type } });
    }

    async createOrder(data: OrderCreationRequest): Promise<ApiResponse<OrderResponse>> {
        return httpClient.post<OrderResponse>('/orders', data);
    }

    async checkoutBatch(data: CheckoutBatchRequest): Promise<ApiResponse<CheckoutBatchResponse>> {
        return httpClient.post<CheckoutBatchResponse>('/orders/checkout-batch', data);
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

    async qcBuyerDecision(id: number, request: QcBuyerDecisionRequest): Promise<ApiResponse<OrderResponse>> {
        return httpClient.post<OrderResponse>(`/orders/${id}/qc-buyer-decision`, request);
    }

    async deleteOrder(id: number): Promise<ApiResponse<string>> {
        return httpClient.delete<string>(`/orders/${id}`);
    }
}

export const orderService = new OrderService();
