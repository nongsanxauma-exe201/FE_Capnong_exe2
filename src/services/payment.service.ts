import { httpClient, ApiResponse } from './http.client';

export interface CreatePaymentRequest {
    orderId: number;
    amount: number;
    method?: string;
    paymentGateway?: string;
}

export interface PaymentResponse {
    id: number;
    orderId: number;
    amount: number;
    paymentGateway: string;
    status: string;
    paymentDate?: string;
    createdAt?: string;
    updatedAt?: string;
    payosOrderCode?: string;
    checkoutUrl?: string;
    qrCodeUrl?: string;
    batchId?: number;
    orderIds?: number[];
    paymentScope?: 'BATCH' | 'ORDER' | string;
}

export interface ResumePaymentOrderOption {
    orderId: number;
    shopName?: string;
    amount: number;
    status?: string;
}

export interface PayAllOption {
    amount: number;
    checkoutUrl?: string;
    payosOrderCode?: string;
    canReuseExistingLink: boolean;
}

export interface ResumePaymentOptionsResponse {
    isBatch: boolean;
    batchId?: number;
    hasPlatformVoucher?: boolean;
    triggerOrderId?: number;
    unpaidOrders?: ResumePaymentOrderOption[];
    payAllOption?: PayAllOption;
    singleOrderPayment?: PaymentResponse;
}

class PaymentService {
    async createPayment(data: CreatePaymentRequest): Promise<ApiResponse<PaymentResponse>> {
        return httpClient.post<PaymentResponse>('/payments', data);
    }

    async getById(id: number | string): Promise<ApiResponse<PaymentResponse>> {
        return httpClient.get<PaymentResponse>(`/payments/${id}`);
    }

    async updateStatus(id: number, status: string): Promise<ApiResponse<PaymentResponse>> {
        return httpClient.put<PaymentResponse>(`/payments/${id}/status`, null, { params: { status } });
    }

    async confirmPaymentById(id: number): Promise<ApiResponse<string>> {
        return httpClient.post<string>(`/payments/${id}/confirm`, {});
    }

    async confirmPaymentByOrderCode(orderCode: string): Promise<ApiResponse<string>> {
        return httpClient.post<string>(`/payments/${encodeURIComponent(orderCode)}/confirm`, {});
    }

    async cancelPaymentByOrderCode(orderCode: string): Promise<ApiResponse<string>> {
        return httpClient.post<string>(`/payments/${encodeURIComponent(orderCode)}/cancel`, {});
    }

    async createPaymentPayOS(data: CreatePaymentRequest): Promise<ApiResponse<PaymentResponse>> {
        return httpClient.post<PaymentResponse>('/payments/payos', data);
    }

    async notifyPendingPayment(orderCode: string): Promise<ApiResponse<string>> {
        return httpClient.post<string>(`/payments/${encodeURIComponent(orderCode)}/notify-pending`, {});
    }

    async getLatestPendingByOrderId(orderId: number): Promise<ApiResponse<PaymentResponse>> {
        return httpClient.get<PaymentResponse>(`/payments/order/${orderId}/latest-pending`);
    }

    async getResumePaymentOptions(orderId: number): Promise<ApiResponse<ResumePaymentOptionsResponse>> {
        return httpClient.get<ResumePaymentOptionsResponse>(`/payments/order/${orderId}/resume-options`);
    }

    async createBatchPayOS(batchId: number): Promise<ApiResponse<PaymentResponse>> {
        return httpClient.post<PaymentResponse>(`/payments/batch/${batchId}/payos`, {});
    }
}

export const paymentService = new PaymentService();
