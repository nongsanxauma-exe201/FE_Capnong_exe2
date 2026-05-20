import { httpClient, ApiResponse } from './http.client';

export interface VehicleResponse {
  id: number;
  vehicleNumber: string;
  capacityKg: number;
  type: string;
  owner?: any;
  isAvailable: boolean;
}

export interface VehicleCreateRequest {
  vehicleNumber: string;
  capacityKg: number;
  type: string;
}

export interface VehicleUpdateRequest {
  vehicleNumber: string;
  capacityKg: number;
  type: string;
}

class VehicleService {
  async getMyVehicles(): Promise<ApiResponse<VehicleResponse[]>> {
    return httpClient.get<VehicleResponse[]>('/vehicles/my');
  }

  async getById(id: number): Promise<ApiResponse<VehicleResponse>> {
    return httpClient.get<VehicleResponse>(`/vehicles/${id}`);
  }

  async createVehicle(data: VehicleCreateRequest): Promise<ApiResponse<VehicleResponse>> {
    return httpClient.post<VehicleResponse>('/vehicles', data);
  }

  async updateVehicle(id: number, data: VehicleUpdateRequest): Promise<ApiResponse<VehicleResponse>> {
    return httpClient.put<VehicleResponse>(`/vehicles/${id}`, data);
  }

  async deleteVehicle(id: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`/vehicles/${id}`);
  }
}

export const vehicleService = new VehicleService();
