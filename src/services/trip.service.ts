import { httpClient, ApiResponse } from './http.client';
import { PageResponse } from '../types';
import type { OrderResponse } from './order.service';
import type { VehicleResponse } from './vehicle.service';

export interface WarehouseResponse {
  id: number;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface CreateTripRequest {
  vehicleId: number;
  warehouseId: number;
  startLat: number;
  startLng: number;
  departureTime: string;
  isShareable: boolean;
  availableCapacityKg: number;
  basePrice: number;
  distanceRate: number;
  weightRate: number;
  orderIds: number[];
}

export type TripStatus =
  | 'CREATED'
  | 'OPEN_FOR_SHARE'
  | 'READY_TO_MOVE'
  | 'MOVING_TO_PICKUPS'
  | 'MOVING_TO_WAREHOUSE'
  | 'ARRIVED_WAREHOUSE'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | string;

export type TripJoinStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | string;

export interface TripJoinRequestResponse {
  id: number;
  tripId: number;
  farmerId: number;
  farmerName: string;
  orders: OrderResponse[];
  requestedKg: number;
  pickupLat: number;
  pickupLng: number;
  status: TripJoinStatus;
  priceOffer: number;
  createdAt: string;
  trip: TripResponse;
}

export interface CreateTripJoinRequest {
  orderIds: number[];
  requestedKg: number;
  pickupLat: number;
  pickupLng: number;
}

export interface TripStopResponse {
  id: number;
  sequence: number;
  lat: number;
  lng: number;
  farmer?: {
    id?: number;
    fullName?: string;
    shopName?: string;
    phoneNumber?: string;
    address?: string;
    logoUrl?: string;
  };
  stopType?: string;
  orderResponses?: OrderResponse[];
  pickup: boolean;

  actualArrivalTime?: string;
  priceForStop: number;
}

export interface TripResponse {
  id: number;
  ownerId: number;
  ownerName: string;
  vehicleId: number;
  vehicleNumber: string;
  warehouseId: number;
  warehouseName: string;
  startLat: number;
  startLng: number;
  capacityKg: number | null;
  availableCapacityKg: number;
  departureTime: string;
  encodedPolyline?: string;
  estimatedArrivalTime?: string;
  totalEstimatedDistanceKm?: number;
  isShareable?: boolean;
  pricePerKm?: number;
  basePrice?: number;
  distanceRate?: number;
  weightRate?: number;
  status: TripStatus;
  tripStops?: TripStopResponse[];
}

class TripService {
  async getWarehouses(): Promise<ApiResponse<WarehouseResponse[]>> {
    return httpClient.get<WarehouseResponse[]>('/warehouses');
  }

  async getMyTrips(page = 0, size = 10, status?: TripStatus): Promise<ApiResponse<PageResponse<TripResponse>>> {
    const params: Record<string, any> = { page, size };
    if (status) params.status = status;
    return httpClient.get<PageResponse<TripResponse>>('/trips/my-trips', { params });
  }

  async getTripById(id: number): Promise<ApiResponse<TripResponse>> {
    return httpClient.get<TripResponse>(`/trips/${id}`);
  }

  async getOrdersForTrip(page = 0, size = 20): Promise<ApiResponse<PageResponse<OrderResponse>>> {
    return httpClient.get<PageResponse<OrderResponse>>(`/trips/orders-for-trip?page=${page}&size=${size}`);
  }

  async createTrip(data: CreateTripRequest): Promise<ApiResponse<TripResponse>> {
    return httpClient.post<TripResponse>('/trips', data);
  }

  async getTripJoined(page = 0, size = 10, status?: TripStatus): Promise<ApiResponse<PageResponse<TripResponse>>> {
    const params: Record<string, any> = { page, size };
    if (status) params.status = status;
    return httpClient.get<PageResponse<TripResponse>>('/trips/trips-joined', { params });
  }

  // Trip Join Requests
  async getReceivedJoinRequests(page = 0, size = 10): Promise<ApiResponse<PageResponse<TripJoinRequestResponse>>> {
    return httpClient.get<PageResponse<TripJoinRequestResponse>>('/trips/requests-recived', { params: { page, size } });
  }

  async getSentJoinRequests(page = 0, size = 10): Promise<ApiResponse<PageResponse<TripJoinRequestResponse>>> {
    return httpClient.get<PageResponse<TripJoinRequestResponse>>('/trips/join-requests', { params: { page, size } });
  }

  async getJoinRequestById(id: number): Promise<ApiResponse<TripJoinRequestResponse>> {
    return httpClient.get<TripJoinRequestResponse>(`/trips/join-requests/${id}`);
  }

  async approveJoinRequest(id: number): Promise<ApiResponse<TripJoinRequestResponse>> {
    return httpClient.post<TripJoinRequestResponse>(`/trips/requests/${id}/approve`);
  }

  async rejectJoinRequest(id: number): Promise<ApiResponse<TripJoinRequestResponse>> {
    return httpClient.post<TripJoinRequestResponse>(`/trips/requests/${id}/reject`);
  }

  async getSuggestedTrips(lat: number, lng: number, warehouseId: number): Promise<ApiResponse<TripResponse[]>> {
    return httpClient.get<TripResponse[]>('/trips/suggested', { params: { lat, lng, warehouseId } });
  }

  async joinTrip(tripId: number, data: CreateTripJoinRequest): Promise<ApiResponse<TripJoinRequestResponse>> {
    return httpClient.post<TripJoinRequestResponse>(`/trips/${tripId}/join`, data);
  }

  async updateTripStopToPicked(stopId: number): Promise<ApiResponse<TripStopResponse>> {
    return httpClient.put<TripStopResponse>(`/trips/stops/${stopId}/picked`);
  }
}

export const tripService = new TripService();
