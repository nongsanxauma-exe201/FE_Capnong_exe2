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
    // PayOS fields
    payosOrderCode?: string;
    checkoutUrl?: string;
    qrCodeUrl?: string;
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
}

export const paymentService = new PaymentService();
