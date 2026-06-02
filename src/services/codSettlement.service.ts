import { httpClient, ApiResponse } from './http.client';
import { OrderResponse } from './order.service';

export interface CodPendingOrderResponse extends OrderResponse {
  shipper?: {
    id?: number;
    fullName?: string;
    phoneNumber?: string;
  };
  buyer?: {
    id?: number;
    fullName?: string;
    phoneNumber?: string;
  };
}

class CodSettlementService {
  async getPendingCodOrders(): Promise<ApiResponse<CodPendingOrderResponse[]>> {
    return httpClient.get<CodPendingOrderResponse[]>('/admin/cod/pending');
  }

  async settleCodOrder(orderId: number): Promise<ApiResponse<OrderResponse>> {
    return httpClient.put<OrderResponse>(`/admin/cod/orders/${orderId}/settle`, {});
  }
}

export const codSettlementService = new CodSettlementService();

export function getCodCollectAmount(order: { codAmount?: number | null; totalAmount?: number }): number {
  return order.codAmount ?? order.totalAmount ?? 0;
}

export function isCodPayment(paymentMethod?: string | null): boolean {
  return paymentMethod?.toUpperCase() === 'COD';
}

export function isCodOrder(order: {
  paymentMethod?: string | null;
  codAmount?: number | null;
}): boolean {
  if (isCodPayment(order.paymentMethod)) return true;
  return order.codAmount != null && order.codAmount > 0;
}
