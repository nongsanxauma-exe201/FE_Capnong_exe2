import { httpClient, ApiResponse } from './http.client';

export interface WalletResponse {
    id: number;
    shopOwnerId: number;
    shipperId?: number;
    buyerId?: number;
    status: string;
    totalBalance: number;
    frozenBalance: number;
    totalRevenueAllTime: number;
    totalWithdrawn: number;
    commissionWallet: number;
    createAt: string;
}

export interface WithdrawRequestCreationRequest {
    amount: number;
    reason?: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountHolder?: string;
}

export interface WithdrawRequestResponse {
    id: number;
    amount: number;
    fee: number;
    receiveAmount: number;
    reason: string;
    status: string;
    adminNote?: string;
    processedAt?: string;
    walletId: number;
    shopOwnerId?: number;
    shipperId?: number;
    buyerId?: number;
    walletType?: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountHolder?: string;
    qrCodeUrl?: string;
    checkoutUrl?: string;
}

class WalletService {
    async getMyWallet(): Promise<ApiResponse<WalletResponse>> {
        return httpClient.get<WalletResponse>('/wallets/me');
    }

    async getPlatformWallet(): Promise<ApiResponse<WalletResponse>> {
        return httpClient.get<WalletResponse>('/wallets/platform');
    }

    async createWithdrawRequest(data: WithdrawRequestCreationRequest): Promise<ApiResponse<WithdrawRequestResponse>> {
        return httpClient.post<WithdrawRequestResponse>('/wallets/withdraw-requests', data);
    }

    async getMyWithdrawRequests(): Promise<ApiResponse<WithdrawRequestResponse[]>> {
        return httpClient.get<WithdrawRequestResponse[]>('/wallets/withdraw-requests/my');
    }

    // Admin endpoints
    async getAllPendingWithdrawRequests(): Promise<ApiResponse<WithdrawRequestResponse[]>> {
        return httpClient.get<WithdrawRequestResponse[]>('/wallets/withdraw-requests/pending');
    }

    async getAllWithdrawRequests(): Promise<ApiResponse<WithdrawRequestResponse[]>> {
        return httpClient.get<WithdrawRequestResponse[]>('/wallets/withdraw-requests');
    }

    async confirmWithdrawSuccess(id: number, note?: string, evidents?: File[]): Promise<ApiResponse<WithdrawRequestResponse>> {
        const formData = new FormData();
        if (note) formData.append('note', note);
        if (evidents && evidents.length > 0) {
            evidents.forEach((file) => {
                formData.append('evidents', file);
            });
        }
        return httpClient.put<WithdrawRequestResponse>(`/wallets/withdraw-requests/${id}/confirm-success`, formData);
    }

    async rejectWithdraw(id: number, note?: string, evidents?: File[]): Promise<ApiResponse<WithdrawRequestResponse>> {
        const formData = new FormData();
        if (note) formData.append('note', note);
        if (evidents && evidents.length > 0) {
            evidents.forEach((file) => {
                formData.append('evidents', file);
            });
        }
        return httpClient.put<WithdrawRequestResponse>(`/wallets/withdraw-requests/${id}/reject`, formData);
    }

    async createWithdrawQr(id: number): Promise<ApiResponse<WithdrawRequestResponse>> {
        return httpClient.post<WithdrawRequestResponse>(`/wallets/withdraw-requests/${id}/create-qr`);
    }
}

export const walletService = new WalletService();
