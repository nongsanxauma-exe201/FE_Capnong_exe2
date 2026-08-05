import { httpClient, ApiResponse } from './http.client';

export interface AvailableShipperResponse {
    id: number;
    fullName: string;
    phoneNumber: string;
    vehicleNumber?: string | null;
    logoUrl?: string | null;
    ratingAverage?: number | null;
    latitude: number;
    longitude: number;
    currentOrderId?: number | null; // null = chưa nhận đơn nào (rảnh)
}

class StaffService {
    /** Lấy danh sách shipper đang online */
    async getAvailableShippers(): Promise<ApiResponse<AvailableShipperResponse[]>> {
        return httpClient.get<AvailableShipperResponse[]>('/staff/shippers/available');
    }

    /** Staff assign shipper cho đơn READY */
    async assignShipper(orderId: number, shipperId: number): Promise<ApiResponse<any>> {
        return httpClient.post<any>(`/staff/orders/${orderId}/assign-shipper?shipperId=${shipperId}`, {});
    }

    /** Staff xác nhận buyer đã đến kho lấy hàng (đơn nhận tại kho) → DELIVERED */
    async confirmWarehousePickup(orderId: number): Promise<ApiResponse<any>> {
        return httpClient.post<any>(`/staff/orders/${orderId}/confirm-pickup`, {});
    }

    /** Staff đánh dấu buyer không đến lấy hàng (đơn nhận tại kho) → FAILED */
    async markWarehousePickupFailed(orderId: number): Promise<ApiResponse<any>> {
        return httpClient.post<any>(`/staff/orders/${orderId}/pickup-failed`, {});
    }
}

export const staffService = new StaffService();
