import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Package,
  Phone,
  Play,
  Route,
  ShoppingBag,
  Square,
  Store,
  Truck,
  User,
  Warehouse,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { tripService, TripResponse, TripStopResponse, OrderResponse } from '../../services';
import { API_BASE_URL, TOKEN_KEY } from '../../services/api.config';
import { createBaseTileLayer, loadLeafletCss } from '../../utils/vietmapLeaflet';

// ─── TripTracking types ───────────────────────────────────────────────────────
interface TripTrackingResponse {
  tripId: number;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  updatedAt?: string;
}

interface RoutePoint {
  lat: number;
  lng: number;
}

type LeafletLatLng = [number, number];

// VietMap tile config đã chuyển sang src/utils/vietmapLeaflet.ts

/* ─── polyline decoder (chưa dùng — giữ lại cho encoded polyline sau này) ── */
// const decodePolyline = (encoded: string): [number, number][] => {
//   const coordinates: [number, number][] = [];
//   let index = 0;
//   let lat = 0;
//   let lng = 0;
//
//   while (index < encoded.length) {
//     let result = 0;
//     let shift = 0;
//     let byte = 0;
//
//     do {
//       byte = encoded.charCodeAt(index++) - 63;
//       result |= (byte & 0x1f) << shift;
//       shift += 5;
//     } while (byte >= 0x20);
//
//     const deltaLat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
//     lat += deltaLat;
//
//     result = 0;
//     shift = 0;
//
//     do {
//       byte = encoded.charCodeAt(index++) - 63;
//       result |= (byte & 0x1f) << shift;
//       shift += 5;
//     } while (byte >= 0x20);
//
//     const deltaLng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
//     lng += deltaLng;
//
//     coordinates.push([lat / 1e5, lng / 1e5]);
//   }
//
//   return coordinates;
// };

/* ─── helpers ────────────────────────────────────────────────────────────── */
const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  CREATED: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  OPEN_FOR_SHARE: { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
  READY_TO_MOVE: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  MOVING_TO_PICKUPS: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  MOVING_TO_WAREHOUSE: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  ARRIVED_WAREHOUSE: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  IN_PROGRESS: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

const getStatusColor = (status: string) =>
  statusColors[status] ?? { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-500' };

const statusLabels: Record<string, string> = {
  CREATED: 'Đã tạo',
  OPEN_FOR_SHARE: 'Mở chia sẻ',
  READY_TO_MOVE: 'Sẵn sàng',
  MOVING_TO_PICKUPS: 'Đang đi lấy hàng',
  MOVING_TO_WAREHOUSE: 'Đang về kho',
  ARRIVED_WAREHOUSE: 'Đã đến kho',
  IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

const formatDate = (d?: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatCurrency = (v?: number) => {
  if (v == null) return '—';
  return v.toLocaleString('vi-VN') + ' đ';
};

/* ─── component ──────────────────────────────────────────────────────────── */
const isPickupStop = (stop: TripStopResponse) =>
  stop.stopType === "PICKUP";

const isStopPicked = (stop: TripStopResponse) =>
  stop.pickup === true;

const canPickStop = (stop: TripStopResponse) =>
  stop.pickup === false && !isStopPicked(stop);

const isStopDoneForSequence = (stop: TripStopResponse) =>
  isStopPicked(stop);

const getHeading = (from: RoutePoint, to: RoutePoint) => {
  const lat1 = from.lat * Math.PI / 180;
  const lat2 = to.lat * Math.PI / 180;
  const lngDelta = (to.lng - from.lng) * Math.PI / 180;
  const y = Math.sin(lngDelta) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(lngDelta);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};

const addHeadingToPath = (points: RoutePoint[]) => {
  const path: Array<RoutePoint & { heading?: number }> = [];
  points.forEach((point, idx) => {
    const next = points[idx + 1];
    path.push({
      ...point,
      heading: next ? getHeading(point, next) : undefined,
    });
  });
  return path;
};

const fetchOsrmRoutePath = async (points: RoutePoint[]) => {
  if (points.length < 2) return addHeadingToPath(points);

  const coordinatesQuery = points
    .map((point) => `${point.lng},${point.lat}`)
    .join(';');
  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordinatesQuery}?overview=full&geometries=geojson`;

  const response = await fetch(osrmUrl);
  const data = await response.json();

  if (data.code !== 'Ok' || !data.routes?.[0]?.geometry?.coordinates?.length) {
    throw new Error('OSRM route not found');
  }

  const routePoints: RoutePoint[] = data.routes[0].geometry.coordinates.map(
    ([lng, lat]: [number, number]) => ({ lat, lng })
  );
  return addHeadingToPath(routePoints);
};

const toLeafletLatLngs = (points: RoutePoint[]): LeafletLatLng[] => {
  return points.map((point) => [point.lat, point.lng]);
};

const TripDetail: React.FC = () => {
  const navigate = useNavigate();
  const { tripId } = useParams();
  const [trip, setTrip] = useState<TripResponse | null>(null);
  const [selectedStop, setSelectedStop] = useState<TripStopResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [truckLocation, setTruckLocation] = useState<TripTrackingResponse | null>(null);
  const [fakeGpsRunning, setFakeGpsRunning] = useState(false);
  const [fakeGpsStep, setFakeGpsStep] = useState(0);
  const [pickingStopId, setPickingStopId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isTripOwner, setIsTripOwner] = useState(false);
  const [initialTruckPoint, setInitialTruckPoint] = useState<RoutePoint | null>(null);

  /* map refs */
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const baseTileLayerRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const routePointsRef = useRef<[number, number][]>([]);
  const truckMarkerRef = useRef<any>(null);
  const stopMarkersRef = useRef<any[]>([]);
  const warehouseMarkerRef = useRef<any>(null);

  /* WebSocket ref */
  const stompClientRef = useRef<Client | null>(null);
  const fakeGpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const trimPassedRoute = (lat: number, lng: number) => {
    if (!routeLayerRef.current || routePointsRef.current.length === 0) return;

    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    routePointsRef.current.forEach(([pointLat, pointLng], idx) => {
      const distance = (pointLat - lat) ** 2 + (pointLng - lng) ** 2;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = idx;
      }
    });

    routeLayerRef.current.setLatLngs([
      [lat, lng],
      ...routePointsRef.current.slice(nearestIndex + 1),
    ]);
  };

  const drawRouteWithOsrmFallback = async (
    L: any,
    map: any,
    routeWaypoints: LeafletLatLng[],
    displayPoints: LeafletLatLng[]
  ) => {
    if (routeWaypoints.length <= 1) {
      if (displayPoints.length > 1) {
        map.fitBounds(L.latLngBounds(displayPoints), { padding: [50, 50] });
      } else if (displayPoints.length === 1) {
        map.setView(displayPoints[0], 14);
      }

      return;
    }

    try {
      const osrmPath = await fetchOsrmRoutePath(
        routeWaypoints.map(([lat, lng]) => ({ lat, lng }))
      );

      const osrmRoutePoints = toLeafletLatLngs(osrmPath);

      routePointsRef.current = osrmRoutePoints;

      routeLayerRef.current = L.polyline(osrmRoutePoints, {
        color: '#6366f1',
        weight: 5,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      if (truckLocation) {
        trimPassedRoute(truckLocation.lat, truckLocation.lng);
      }

      map.fitBounds(L.latLngBounds([...osrmRoutePoints, ...displayPoints]), {
        padding: [50, 50],
      });
    } catch (err) {
      console.error('[Map] OSRM failed, fallback to straight line:', err);

      routePointsRef.current = routeWaypoints;

      routeLayerRef.current = L.polyline(routeWaypoints, {
        color: '#6366f1',
        weight: 5,
        opacity: 0.8,
        dashArray: '5, 10',
      }).addTo(map);

      map.fitBounds(L.latLngBounds(displayPoints), {
        padding: [50, 50],
      });
    }
  };

  /* ─── Get current user from localStorage ───────────────────────────────── */
  useEffect(() => {
    const userInfoStr = localStorage.getItem('user_info');
    if (userInfoStr) {
      try {
        const userInfo = JSON.parse(userInfoStr);
        setCurrentUserId(userInfo.id || userInfo.userId);
      } catch (e) {
        console.error('Failed to parse user_info from localStorage', e);
      }
    }
  }, []);

  /* ─── Check if current user is trip owner ──────────────────────────────── */
  useEffect(() => {
    if (trip && currentUserId != null) {
      // Check if current user is the owner (farmerId) of the trip
      const owner = trip.ownerId !== undefined && trip.ownerId === currentUserId;
      setIsTripOwner(owner);
    }
  }, [trip, currentUserId]);

  /* ─── data fetch ───────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!tripId) {
      setError('Không tìm thấy mã chuyến đi.');
      setLoading(false);
      return;
    }

    const loadTrip = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await tripService.getTripById(Number(tripId));
        if (!response.result) {
          setError('Không tìm thấy chuyến đi.');
          return;
        }

        const loadedTrip = response.result as TripResponse & {
          tripTrackingResponse?: TripTrackingResponse | null;
        };

        setTrip(loadedTrip);

        // Ưu tiên vị trí tracking mới nhất từ backend khi mở lại trang
        // Vị trí ban đầu của xe khi mở trang:
        // có tripTrackingResponse thì lấy vị trí mới nhất,
        // không có thì lấy startLat/startLng.
        const firstTruckPoint: RoutePoint = loadedTrip.tripTrackingResponse
          ? {
            lat: loadedTrip.tripTrackingResponse.lat,
            lng: loadedTrip.tripTrackingResponse.lng,
          }
          : {
            lat: loadedTrip.startLat,
            lng: loadedTrip.startLng,
          };

        setInitialTruckPoint(firstTruckPoint);
        setTruckLocation(loadedTrip.tripTrackingResponse ?? null);

        // Only auto-select first stop for trip owner; non-owners start with no selection
        if (currentUserId != null && loadedTrip.ownerId === currentUserId) {
          setSelectedStop(loadedTrip.tripStops?.[0] ?? null);
        } else {
          setSelectedStop(null);
        }
      } catch (err) {
        console.error('Load trip detail failed', err);
        setError('Không thể tải thông tin chuyến đi. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };

    loadTrip();
  }, [tripId]);

  /* ─── WebSocket: subscribe trip location ──────────────────────────────── */
  useEffect(() => {
    if (!tripId) return;

    const token = localStorage.getItem(TOKEN_KEY);
    const baseUrl = API_BASE_URL.endsWith('/api/v1')
      ? API_BASE_URL.slice(0, -7)
      : API_BASE_URL;

    const client = new Client({
      webSocketFactory: () => new (SockJS as any)(`${baseUrl}/api/v1/ws`),
      reconnectDelay: 5000,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      onConnect: () => {
        console.log('[Trip WS] Connected', {
          tripId,
          topic: `/topic/trip/${tripId}/location`,
          sendDestination: '/app/trip/location',
        });
        setWsConnected(true);
        client.subscribe(`/topic/trip/${tripId}/location`, (msg) => {
          try {
            const data: TripTrackingResponse = JSON.parse(msg.body);
            console.log('[Trip WS] Received location', {
              topic: `/topic/trip/${tripId}/location`,
              raw: msg.body,
              data,
            });
            setTruckLocation(data);
          } catch (e) {
            console.error('[Trip WS] Parse error:', e);
          }
        });
      },
      onDisconnect: () => {
        console.log('[Trip WS] Disconnected', { tripId });
        setWsConnected(false);
      },
      onStompError: (frame) => {
        console.error('[Trip WS] STOMP error', frame);
        setWsConnected(false);
      },
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      client.deactivate();
      stompClientRef.current = null;
      setWsConnected(false);
    };
  }, [tripId]);

  /* ─── Update truck marker when location changes ────────────────────────── */
  useEffect(() => {
    if (!truckLocation) return;

    const { lat, lng, heading } = truckLocation;

    if (!leafletMapRef.current || !truckMarkerRef.current) return;

    // Chỉ di chuyển marker xe hiện tại, không init lại map.
    truckMarkerRef.current.setLatLng([lat, lng]);
    trimPassedRoute(lat, lng);

    if (heading != null) {
      const el = truckMarkerRef.current.getElement();
      if (el) {
        const inner = el.querySelector('div');
        if (inner) inner.style.transform = `rotate(${heading}deg)`;
      }
    }
  }, [truckLocation]);

  /* ─── map init ─────────────────────────────────────────────────────────── */
  /* ── map init (Cập nhật sử dụng OSRM API để vẽ đường thực tế) ── */
  useEffect(() => {
    let cancelled = false;
    const cleanup = () => {
      if (!leafletMapRef.current) return;
      try {
        if (routeLayerRef.current) {
          leafletMapRef.current.removeLayer(routeLayerRef.current);
          routeLayerRef.current = null;
          routePointsRef.current = [];
        }
      } catch { }
      stopMarkersRef.current.forEach((marker) => {
        try { leafletMapRef.current.removeLayer(marker); } catch { }
      });
      stopMarkersRef.current = [];
    };

    if (!trip) return undefined;

    const initMap = async () => {
      if (!mapContainerRef.current) return;
      loadLeafletCss();

      const L = await import('leaflet');
      if (cancelled) return;

      // 1. Sắp xếp danh sách điểm dừng theo đúng thứ tự sequence
      const sortedStops = trip.tripStops?.slice().sort((a, b) => a.sequence - b.sequence) ?? [];
      const truckPoint: [number, number] = initialTruckPoint
        ? [initialTruckPoint.lat, initialTruckPoint.lng]
        : [trip.startLat, trip.startLng];

      // 2. Router bắt đầu từ vị trí xe và đi qua toàn bộ stop theo sequence.
      const routeStops = sortedStops;
      const routeWaypoints: [number, number][] = [
        truckPoint,
        ...routeStops.map((stop) => [stop.lat, stop.lng] as [number, number]),
      ];
      const displayPoints: [number, number][] = [
        truckPoint,
        ...sortedStops.map((stop) => [stop.lat, stop.lng] as [number, number]),
      ];

      const center = truckPoint;

      // 3. Khởi tạo bản đồ Leaflet + nền VietMap
      if (!leafletMapRef.current) {
        const map = L.map(mapContainerRef.current, {
          center,
          zoom: 14,
          zoomControl: false,
        });
        L.control.zoom({ position: 'bottomright' }).addTo(map);
        leafletMapRef.current = map;
      }

      const map = leafletMapRef.current;
      const baseTileLayer = await createBaseTileLayer(L);

      if (baseTileLayerRef.current) {
        try {
          map.removeLayer(baseTileLayerRef.current);
        } catch { /* ignore */ }
      }

      baseTileLayer.addTo(map);
      baseTileLayerRef.current = baseTileLayer;

      // OSM tile cũ (giữ lại tham khảo):
      // L.tileLayer(OSM_TILE_URL, {
      //   maxZoom: 19,
      //   attribution: '&copy; OpenStreetMap contributors',
      // }).addTo(map);

      cleanup();

      await drawRouteWithOsrmFallback(L, map, routeWaypoints, displayPoints);

      // OSRM inline cũ (đã tách sang drawRouteWithOsrmFallback):
      // if (routeWaypoints.length > 1) {
      //   const coordinatesQuery = routeWaypoints.map(pt => `${pt[1]},${pt[0]}`).join(';');
      //   const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordinatesQuery}?overview=full&geometries=geojson`;
      //   try {
      //     const response = await fetch(osrmUrl);
      //     const data = await response.json();
      //     if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates) {
      //       const osrmRoutePoints: [number, number][] = data.routes[0].geometry.coordinates.map(
      //         (coord: [number, number]) => [coord[1], coord[0]]
      //       );
      //       routePointsRef.current = osrmRoutePoints;
      //       routeLayerRef.current = L.polyline(osrmRoutePoints, {
      //         color: '#6366f1', weight: 5, opacity: 0.8, lineCap: 'round', lineJoin: 'round',
      //       }).addTo(map);
      //       if (truckLocation) trimPassedRoute(truckLocation.lat, truckLocation.lng);
      //       map.fitBounds(L.latLngBounds([...osrmRoutePoints, ...displayPoints]), { padding: [50, 50] });
      //     } else {
      //       routePointsRef.current = routeWaypoints;
      //       routeLayerRef.current = L.polyline(routeWaypoints, {
      //         color: '#6366f1', weight: 5, opacity: 0.8, dashArray: '5, 10',
      //       }).addTo(map);
      //       map.fitBounds(L.latLngBounds(displayPoints), { padding: [50, 50] });
      //     }
      //   } catch (err) {
      //     console.error('Gọi API OSRM thất bại, chuyển sang vẽ đường thẳng fallback:', err);
      //     routePointsRef.current = routeWaypoints;
      //     routeLayerRef.current = L.polyline(routeWaypoints, {
      //       color: '#6366f1', weight: 5, opacity: 0.8, dashArray: '5, 10',
      //     }).addTo(map);
      //     map.fitBounds(L.latLngBounds(displayPoints), { padding: [50, 50] });
      //   }
      // } else {
      //   if (displayPoints.length > 1) {
      //     map.fitBounds(L.latLngBounds(displayPoints), { padding: [50, 50] });
      //   } else {
      //     map.setView(center, 14);
      //   }
      // }

      if (cancelled) return;

      /* ── Giữ nguyên đoạn vẽ các Marker (Xuất phát & Điểm dừng) dưới đây ── */
      // Điểm xuất phát (truck) marker
      const truckIcon = L.divIcon({
        html: `<div style="width:40px;height:40px;background:linear-gradient(135deg, #6366f1, #8b5cf6);border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow: 0 4px 14px rgba(99,102,241,0.45);"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 13.52 9H12v9"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg></div>`,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      if (truckMarkerRef.current) {
        truckMarkerRef.current.setLatLng(truckPoint);
      } else {
        truckMarkerRef.current = L.marker(truckPoint, { icon: truckIcon })
          .addTo(map)
          .bindPopup(
            `<div style="font-family:system-ui;padding:4px 0;">
        <p style="font-weight:800;font-size:13px;margin:0 0 4px;">📍 Vị trí xe hiện tại</p>
        <p style="font-size:12px;color:#6b7280;margin:0;">Xe: ${trip.vehicleNumber}</p>
        ${truckLocation?.updatedAt
              ? `<p style="font-size:12px;color:#6b7280;margin:4px 0 0;">Cập nhật: ${formatDate(truckLocation.updatedAt)}</p>`
              : ''
            }
      </div>`
          );
      }
      // Các điểm dừng trên hành trình
      sortedStops.forEach((stop) => {
        const isPickup = isPickupStop(stop);
        const picked = isStopPicked(stop);
        const bgColor = picked ? '#22c55e' : isPickup ? '#0ea5e9' : '#f59e0b';
        const shadow = picked
          ? 'rgba(34,197,94,0.45)'
          : isPickup
            ? 'rgba(14,165,233,0.45)'
            : 'rgba(245,158,11,0.45)';

        const stopIcon = L.divIcon({
          html: `<div style="width:36px;height:36px;background:${bgColor};border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:white;box-shadow: 0 4px 12px ${shadow};">${stop.sequence}</div>`,
          className: '',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const shopName = stop.farmer?.shopName || stop.farmer?.fullName || `Điểm ${stop.sequence}`;
        const orderCount = stop.orderResponses?.length ?? 0;
        const typeLabel = isPickup ? 'Lấy hàng' : 'Giao hàng';

        const popupContent = `
          <div style="font-family: system-ui; padding: 4px 0; min-width: 200px;">
            <p style="font-weight:800;font-size:13px;margin:0;">${shopName}</p>
            <p style="font-size:11px;color:#6b7280;margin:0 0 4px;">${typeLabel} • ${orderCount} đơn hàng</p>
            <p style="font-size:12px;color:#6b7280;margin:0;">📍 ${stop.farmer?.address || ''}</p>
          </div>
        `;

        const marker = L.marker([stop.lat, stop.lng], { icon: stopIcon }).addTo(map);
        marker.bindPopup(popupContent, { maxWidth: 280 });
        // Only allow setting selectedStop if user is owner OR this is their own stop
        marker.on('click', () => {
          if (isTripOwner || stop.farmer?.id === currentUserId) {
            setSelectedStop(stop);
          }
        });

        stopMarkersRef.current.push(marker);
      });
    };

    initMap();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [trip, initialTruckPoint, isTripOwner, currentUserId]);

  /* ─── derived ──────────────────────────────────────────────────────────── */
  const allStops = useMemo(() => {
    return trip?.tripStops?.slice().sort((a, b) => a.sequence - b.sequence) ?? [];
  }, [trip]);

  // For non-owners: filter to only show their own stops
  const stopList = useMemo(() => {
    if (isTripOwner) return allStops;
    // Non-owner: only show stops where their farmerId matches
    return allStops.filter(stop => stop.farmer?.id === currentUserId);
  }, [allStops, isTripOwner, currentUserId]);

  const selectedStopOrders = selectedStop?.orderResponses ?? [];

  const totalOrders = useMemo(() => {
    return stopList.reduce((sum, s) => sum + (s.orderResponses?.length ?? 0), 0);
  }, [stopList]);

  const pickableStopId = useMemo(() => {
    return stopList.find((stop, idx) => {
      if (!canPickStop(stop)) return false;
      return stopList.slice(0, idx).every(isStopDoneForSequence);
    })?.id ?? null;
  }, [stopList]);

  const stopFakeGps = () => {
    if (fakeGpsIntervalRef.current) {
      clearInterval(fakeGpsIntervalRef.current);
      fakeGpsIntervalRef.current = null;
    }
    setFakeGpsRunning(false);
    setFakeGpsStep(0);
  };

  const publishTripLocation = (point: RoutePoint & { heading?: number }) => {
    if (!trip) return;
    const payload = {
      tripId: trip.id,
      lat: point.lat,
      lng: point.lng,
      speed: 35,
      heading: point.heading,
    };
    console.log('[Trip WS] Sending fake GPS location', {
      destination: '/app/trip/location',
      payload,
      connected: stompClientRef.current?.connected ?? false,
    });
    stompClientRef.current?.publish({
      destination: '/app/trip/location',
      body: JSON.stringify(payload),
    });
  };
  const startFakeGps = async () => {
    if (!trip) return;

    if (!stompClientRef.current?.connected) {
      window.alert('WebSocket chưa kết nối, vui lòng chờ vài giây rồi thử lại.');
      return;
    }

    stopFakeGps();

    const startPoint: RoutePoint = truckLocation
      ? { lat: truckLocation.lat, lng: truckLocation.lng }
      : initialTruckPoint
        ? { lat: initialTruckPoint.lat, lng: initialTruckPoint.lng }
        : { lat: trip.startLat, lng: trip.startLng };

    if (routePointsRef.current.length < 2) {
      window.alert('Chưa có tuyến đường trên bản đồ để chạy fake GPS.');
      return;
    }

    // Tìm điểm gần xe nhất trên route hiện tại
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    routePointsRef.current.forEach(([pointLat, pointLng], idx) => {
      const distance = (pointLat - startPoint.lat) ** 2 + (pointLng - startPoint.lng) ** 2;

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = idx;
      }
    });

    // Chạy tiếp theo tuyến đường còn lại, không quay lại stop đầu
    const remainingRoutePoints = routePointsRef.current
      .slice(nearestIndex + 1)
      .map(([lat, lng]) => ({ lat, lng }));

    const points: RoutePoint[] = [
      startPoint,
      ...remainingRoutePoints,
    ];

    if (points.length < 2) {
      window.alert('Xe đã ở điểm cuối hoặc không còn điểm tiếp theo để chạy GPS.');
      return;
    }

    const path = addHeadingToPath(points);

    setFakeGpsRunning(true);
    setFakeGpsStep(0);

    let idx = 0;

    fakeGpsIntervalRef.current = setInterval(() => {
      const point = path[idx];

      if (!point) {
        stopFakeGps();
        return;
      }

      publishTripLocation(point);
      setFakeGpsStep(idx + 1);
      idx += 1;
    }, 1000);
  };

  const handlePickStop = async (stop: TripStopResponse) => {
    setPickingStopId(stop.id);
    try {
      const response = await tripService.updateTripStopToPicked(stop.id);
      const updatedStop = response.result
        ? {
          ...response.result,
          isPicked: true,
          isPickup: true,
          actualArrivalTime: response.result.actualArrivalTime ?? new Date().toISOString(),
        }
        : null;
      if (!updatedStop) return;
      setTrip((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tripStops: prev.tripStops?.map((item) =>
            item.id === updatedStop.id ? updatedStop : item
          ),
        };
      });
      setSelectedStop((prev) => prev?.id === updatedStop.id ? updatedStop : prev);
    } catch (err) {
      console.error('Pick stop failed', err);
      window.alert('Không thể cập nhật điểm dừng đã lấy hàng. Vui lòng thử lại.');
    } finally {
      setPickingStopId(null);
    }
  };

  useEffect(() => {
    return () => stopFakeGps();
  }, []);

  /* ─── focus stop on map ────────────────────────────────────────────────── */
  const focusStopOnMap = (stop: TripStopResponse) => {
    setSelectedStop(stop);
    if (leafletMapRef.current) {
      leafletMapRef.current.setView([stop.lat, stop.lng], 16, { animate: true });

      /* open the popup of the matching marker */
      const idx = stopList.findIndex((s) => s.id === stop.id);
      if (idx >= 0 && stopMarkersRef.current[idx]) {
        stopMarkersRef.current[idx].openPopup();
      }
    }
  };

  /* ─── loading ──────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex min-h-[520px] flex-col items-center justify-center gap-4 py-16">
        <Loader2 className="size-10 text-primary animate-spin" />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">
          Đang tải chi tiết chuyến đi...
        </p>
      </div>
    );
  }

  /* ─── error ────────────────────────────────────────────────────────────── */
  if (error) {
    return (
      <div className="p-8">
        <button
          onClick={() => navigate('/farmer/trips')}
          className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="size-4" /> Quay lại danh sách chuyến
        </button>
        <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-8 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  /* ─── no data ──────────────────────────────────────────────────────────── */
  if (!trip) {
    return (
      <div className="p-8">
        <button
          onClick={() => navigate('/farmer/trips')}
          className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="size-4" /> Quay lại danh sách chuyến
        </button>
        <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-8 text-gray-700">
          Không có dữ liệu chuyến đi.
        </div>
      </div>
    );
  }

  const sc = getStatusColor(trip.status);

  /* ─── render ───────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-100 bg-white px-6 py-5 lg:px-8">
        <div className="mx-auto flex max-w-screen-2xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/farmer/trips')}
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-500">
                Chi tiết chuyến đi
              </p>
              <h1 className="mt-0.5 text-2xl font-black text-gray-900">Chuyến #{trip.id}</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${sc.bg} ${sc.text}`}
            >
              <span className={`size-2 rounded-full ${sc.dot}`} />
              {statusLabels[trip.status] ?? trip.status}
            </span>
          </div>
        </div>
      </div>

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-100 bg-white px-6 lg:px-8">
        <div className="mx-auto grid max-w-screen-2xl grid-cols-2 gap-px sm:grid-cols-4">
          {[
            {
              icon: <Warehouse className="size-4 text-indigo-500" />,
              label: 'Kho đích',
              value: trip.warehouseName,
            },
            {
              icon: <Truck className="size-4 text-indigo-500" />,
              label: 'Biển số xe',
              value: trip.vehicleNumber,
            },
            {
              icon: <Clock className="size-4 text-indigo-500" />,
              label: 'Khởi hành',
              value: formatDate(trip.departureTime),
            },
            {
              icon: <Route className="size-4 text-indigo-500" />,
              label: 'Khoảng cách',
              value: trip.totalEstimatedDistanceKm
                ? `${trip.totalEstimatedDistanceKm.toFixed(1)} km`
                : '—',
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-gray-50 px-4 py-4 sm:border-b-0 sm:border-r sm:last:border-r-0"
            >
              <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-50">
                {stat.icon}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-gray-400">{stat.label}</p>
                <p className="truncate text-sm font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-screen-2xl px-6 py-6 lg:px-8">
        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          {/* ── Left: Map ─────────────────────────────────────────────────── */}
          <div className="space-y-6">
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-50">
                    <MapPin className="size-4 text-indigo-500" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Bản đồ hành trình</h2>
                    <p className="text-xs text-gray-500">
                      Ấn vào điểm dừng trên bản đồ để xem chi tiết
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
                    {stopList.length} điểm • {totalOrders} đơn
                  </span>
                  {isTripOwner && (
                    <button
                      type="button"
                      onClick={fakeGpsRunning ? stopFakeGps : startFakeGps}
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${fakeGpsRunning
                          ? 'bg-red-50 text-red-700 hover:bg-red-100'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      title={fakeGpsRunning ? 'Dừng fake GPS' : 'Chạy fake GPS'}
                    >
                      {fakeGpsRunning ? <Square className="size-3.5" /> : <Play className="size-3.5" />}
                      {fakeGpsRunning ? `Dừng GPS (${fakeGpsStep})` : 'Fake GPS'}
                    </button>
                  )}
                </div>
              </div>
              <div
                className="h-[500px] w-full bg-gray-100 xl:h-[600px]"
                ref={mapContainerRef}
              />
            </section>

            {/* ── Info cards below map ─────────────────────────────────────── */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-gray-400">Sức chứa</p>
                <p className="mt-1 text-xl font-black text-gray-900">
                  {trip.capacityKg != null ? trip.capacityKg.toLocaleString('vi-VN') : '—'} kg
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-gray-400">Còn trống</p>
                <p className="mt-1 text-xl font-black text-emerald-600">
                  {trip.availableCapacityKg != null
                    ? trip.availableCapacityKg.toLocaleString('vi-VN')
                    : '—'}{' '}
                  kg
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-gray-400">Dự kiến đến kho</p>
                <p className="mt-1 text-lg font-black text-gray-900">
                  {formatDate(trip.estimatedArrivalTime)}
                </p>
              </div>
            </div>
          </div>

          {/* ── Right sidebar: Stops + Selected stop detail ───────────────── */}
          <div className="space-y-6">
            {/* ── Timeline stop list ──────────────────────────────────────── */}
            <section className="rounded-2xl border border-gray200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-4">
                <h3 className="text-base font-bold text-gray-900">Các điểm dừng</h3>
                <p className="text-xs text-gray-500">Chọn điểm dừng để xem thông tin shop và đơn hàng</p>
              </div>

              {stopList.length === 0 ? (
                <div className="p-5 text-center text-sm text-gray-500">
                  Chưa có điểm dừng trong chuyến đi.
                </div>
              ) : (
                <div className="max-h-[280px] overflow-y-auto">
                  {stopList.map((stop, idx) => {
                    const isActive = selectedStop?.id === stop.id;
                    const shopName =
                      stop.farmer?.shopName || stop.farmer?.fullName || `Điểm ${stop.sequence}`;
                    const isPickup = isPickupStop(stop);
                    const picked = isStopPicked(stop);

                    return (
                      <div key={stop.id} className="border-b border-gray-50 last:border-b-0">
                        <button
                          type="button"
                          onClick={() => focusStopOnMap(stop)}
                          className={`group flex w-full items-start gap-3 px-5 py-3.5 text-left transition-all ${isActive
                            ? 'bg-indigo-50/60'
                            : 'bg-white hover:bg-gray-50'
                            }`}
                        >
                          {/* timeline dot */}
                          <div className="relative mt-0.5 flex flex-col items-center">
                            <div
                              className={`flex size-8 items-center justify-center rounded-full text-xs font-black text-white shadow-md ${picked ? 'bg-emerald-500' : isPickup ? 'bg-sky-500' : 'bg-amber-500'
                                } ${isActive ? 'ring-2 ring-indigo-400 ring-offset-2' : ''}`}
                            >
                              {stop.sequence}
                            </div>
                            {idx < stopList.length - 1 && (
                              <div className="mt-1 h-4 w-0.5 bg-gray-200" />
                            )}
                          </div>

                          {/* content */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p
                                className={`truncate text-sm font-bold ${isActive ? 'text-indigo-700' : 'text-gray-900'
                                  }`}
                              >
                                {shopName}
                              </p>
                              <ChevronRight
                                className={`size-4 shrink-0 transition-transform ${isActive
                                  ? 'rotate-90 text-indigo-500'
                                  : 'text-gray-300 group-hover:text-gray-500'
                                  }`}
                              />
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                              <span
                                className={`rounded-md px-1.5 py-0.5 font-semibold ${picked
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : isPickup
                                    ? 'bg-sky-50 text-sky-600'
                                    : 'bg-amber-50 text-amber-600'
                                  }`}
                              >
                                {isPickup ? 'Lấy hàng' : 'Giao hàng'}
                              </span>
                              <span>• {stop.orderResponses?.length ?? 0} đơn</span>
                              {isStopPicked(stop) && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-600">
                                  <CheckCircle2 className="size-3" />
                                  Đã picked
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                        {/* Only show Pickup button for trip owner */}
                        {isTripOwner && stop.id === pickableStopId && (
                          <div className="bg-white px-5 pb-3 pl-16">
                            <button
                              type="button"
                              onClick={() => handlePickStop(stop)}
                              disabled={pickingStopId === stop.id}
                              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {pickingStopId === stop.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="size-3.5" />
                              )}
                              Đã lấy hàng
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── Selected stop detail ─────────────────────────────────────── */}
            {selectedStop && (
              <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                {/* shop header */}
                <div className="border-b border-gray-100 px-5 py-4">
                  <div className="flex items-start gap-3">
                    {selectedStop.farmer?.logoUrl ? (
                      <img
                        src={selectedStop.farmer.logoUrl}
                        alt={selectedStop.farmer.shopName || ''}
                        className="size-12 rounded-xl border border-gray-100 object-cover shadow-sm"
                      />
                    ) : (
                      <div className="flex size-12 items-center justify-center rounded-xl bg-indigo-50">
                        <Store className="size-5 text-indigo-500" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-base font-bold text-gray-900">
                        {selectedStop.farmer?.shopName ||
                          selectedStop.farmer?.fullName ||
                          'Tên shop không rõ'}
                      </h4>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold ${isStopPicked(selectedStop)
                            ? 'bg-emerald-50 text-emerald-600'
                            : isPickupStop(selectedStop)
                              ? 'bg-sky-50 text-sky-600'
                              : 'bg-amber-50 text-amber-600'
                            }`}
                        >
                          <Package className="size-3" />
                          {isStopPicked(selectedStop)
                            ? 'Đã picked'
                            : isPickupStop(selectedStop)
                              ? 'Lấy hàng'
                              : 'Giao hàng'}
                        </span>
                        <span>Điểm #{selectedStop.sequence}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* shop info */}
                <div className="space-y-2 border-b border-gray-100 px-5 py-3">
                  {selectedStop.farmer?.phoneNumber && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="size-3.5 text-gray-400" />
                      <span>{selectedStop.farmer.phoneNumber}</span>
                    </div>
                  )}
                  {selectedStop.farmer?.address && (
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <MapPin className="mt-0.5 size-3.5 shrink-0 text-gray-400" />
                      <span>{selectedStop.farmer.address}</span>
                    </div>
                  )}
                  {selectedStop.actualArrivalTime && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="size-3.5 text-gray-400" />
                      <span>Đến lúc: {formatDate(selectedStop.actualArrivalTime)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="size-3.5 text-gray-400" />
                    <p><span className="font-bold text-gray-700">Phí cước:</span> {Math.round(selectedStop.priceForStop).toLocaleString('vi-VN')}đ</p>
                  </div>
                </div>

                {/* orders at this stop */}
                <div className="px-5 py-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
                    Đơn hàng ({selectedStopOrders.length})
                  </p>

                  {selectedStopOrders.length === 0 ? (
                    <p className="text-sm text-gray-500">Không có đơn hàng tại điểm này.</p>
                  ) : (
                    <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
                      {selectedStopOrders.map((order: OrderResponse) => (
                        <div
                          key={order.id}
                          className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 transition hover:border-gray-300"
                        >
                          {/* order header */}
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ShoppingBag className="size-4 text-indigo-500" />
                              <span className="text-sm font-bold text-gray-900">
                                Đơn #{order.id}
                              </span>
                            </div>

                          </div>



                          {/* order items */}
                          <div className="space-y-2">
                            {order.items.map((item, itemIdx) => (
                              <div
                                key={item.orderDetailId ?? itemIdx}
                                className="flex items-center gap-3 rounded-lg bg-white p-2.5 border border-gray-100"
                              >
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.productName || ''}
                                    className="size-11 rounded-lg border border-gray-100 object-cover"
                                  />
                                ) : (
                                  <div className="flex size-11 items-center justify-center rounded-lg bg-gray-100">
                                    <Package className="size-4 text-gray-400" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-gray-800">
                                    {item.productName || 'Sản phẩm'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {item.quantity} {item.unit || 'kg'}</p>
                                </div>

                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* prompt if no stop selected */}
            {!selectedStop && (
              <section className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                <MapPin className="mx-auto size-8 text-gray-300" />
                <p className="mt-3 text-sm font-medium text-gray-500">
                  Chọn một điểm dừng trên bản đồ hoặc từ danh sách để xem chi tiết shop và đơn hàng.
                </p>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripDetail;
