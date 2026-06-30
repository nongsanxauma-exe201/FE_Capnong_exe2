import { httpClient, ApiResponse } from './http.client';
import { PageResponse } from '../types';

export interface VoucherResponse {
  voucherId: string;
  voucherCode: string;
  discountValue: number;
  maxDiscount: number | null;
  minOrderValue: number;
  expiryDate: string;
  createAt: string;
  active: boolean;
  claimLimit: number | null;
  claimedCount?: number | null;
  usageLimit: number | null;
  usedCount?: number | null;
  perUserLimit: number | null;
  voucherType?: 'SHOP' | 'PLATFORM' | 'DAMAGED_ORDER' | 'WELCOME';
  shopId?: number | null;
  shopName?: string | null;
  autoCreatedReason?: string | null;
  autoCreatedFromOrderId?: number | null;
}

export interface VoucherUserResponse {
  voucherUserId: string;
  voucherResponse: Pick<VoucherResponse, 'voucherId' | 'voucherCode' | 'discountValue' | 'maxDiscount' | 'minOrderValue' | 'expiryDate' | 'voucherType'> | null;
  quantityUsed: number;
  quantity: number;
  claimAt: string;
}

export interface VoucherCreateRequest {
  discountValue: number;
  maxDiscount: number;
  minOrderValue: number;
  usageLimit: number;
  expiryDate: string;
  claimLimit: number;
  claimedCount?: number;
  usedCount?: number;
  perUserLimit: number;
}

export interface VoucherUpdateRequest {
  discountValue?: number;
  maxDiscount?: number;
  minOrderValue?: number;
  usageLimit?: number;
  expiryDate?: string;
  claimLimit?: number;
  claimedCount?: number;
  usedCount?: number;
  perUserLimit?: number;
}

class VoucherService {
  async getShopVouchers(
    page = 0,
    size = 10,
    active = true
  ): Promise<ApiResponse<PageResponse<VoucherResponse>>> {
    return httpClient.get<PageResponse<VoucherResponse>>('/vouchers/shop', {
      params: { page, size, active },
    });
  }

  async getPlatformVouchers(
    page = 0,
    size = 10,
    active = true
  ): Promise<ApiResponse<PageResponse<VoucherResponse>>> {
    return httpClient.get<PageResponse<VoucherResponse>>('/vouchers/admin/platform', {
      params: { page, size, active },
    });
  }

  async getBuyerShopVouchers(
    shopId: number,
    page = 0,
    size = 10
  ): Promise<ApiResponse<PageResponse<VoucherResponse>>> {
    return httpClient.get<PageResponse<VoucherResponse>>(`/vouchers/${shopId}/buyer`, {
      params: { page, size, shopId },
    });
  }

  async getMyVoucherWallet(
    page = 0,
    size = 10
  ): Promise<ApiResponse<PageResponse<VoucherUserResponse>>> {
    return httpClient.get<PageResponse<VoucherUserResponse>>('/vouchers-users', {
      params: { page, size },
    });
  }

  async receiveVoucher(voucherCode: string): Promise<ApiResponse<VoucherUserResponse>> {
    return httpClient.post<VoucherUserResponse>(`/vouchers-users/${encodeURIComponent(voucherCode)}/recieve`);
  }

  async canReceiveVoucher(voucherCode: string): Promise<ApiResponse<boolean>> {
    return httpClient.get<boolean>(`/vouchers-users/can-receive/${encodeURIComponent(voucherCode)}`);
  }

  async getVouchersForOrder(
    shopId: number,
    amount: number,
    page = 0,
    size = 10
  ): Promise<ApiResponse<PageResponse<VoucherUserResponse>>> {
    return httpClient.post<PageResponse<VoucherUserResponse>>('/vouchers-users/voucher-order', {
      shopId,
      amount,
    }, {
      params: { page, size },
    });
  }

  async getByCode(voucherCode: string): Promise<ApiResponse<VoucherResponse>> {
    return httpClient.get<VoucherResponse>(`/vouchers/${encodeURIComponent(voucherCode)}`);
  }

  async create(data: VoucherCreateRequest): Promise<ApiResponse<VoucherResponse>> {
    return httpClient.post<VoucherResponse>('/vouchers', data);
  }

  async createPlatform(data: VoucherCreateRequest): Promise<ApiResponse<VoucherResponse>> {
    return httpClient.post<VoucherResponse>('/vouchers/admin/platform', data);
  }

  async update(voucherCode: string, data: VoucherUpdateRequest): Promise<ApiResponse<VoucherResponse>> {
    return httpClient.put<VoucherResponse>(`/vouchers/${encodeURIComponent(voucherCode)}`, data);
  }

  async delete(voucherCode: string): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`/vouchers/${encodeURIComponent(voucherCode)}`);
  }

  async activate(voucherCode: string): Promise<ApiResponse<VoucherResponse>> {
    return httpClient.put<VoucherResponse>(`/vouchers/${encodeURIComponent(voucherCode)}/activate`);
  }
}

export const voucherService = new VoucherService();
