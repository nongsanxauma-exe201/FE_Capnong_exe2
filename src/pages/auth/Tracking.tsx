import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin, Truck, Box, CheckCircle2, Clock,
  Phone, MessageSquare, ArrowLeft, Navigation, Wifi, WifiOff,
  AlertCircle, RefreshCw, Package, FileText, X
} from 'lucide-react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { shipperService, ShipperLocationResponse } from '../../services/shipper.service';
import { orderService, OrderResponse } from '../../services/order.service';
import { authService } from '../../services/auth.service';
import { API_BASE_URL, TOKEN_KEY } from '../../services/api.config';
import { createBaseTileLayer, loadLeafletCss } from '../../utils/vietmapLeaflet';
import { ImageLightbox } from '../../components/ui';
import { getOrderStatusLabel } from '../../constants/orderStatusLabels';

interface TrackingProps {
  onBack: () => void;
  orderId?: number;
  orderCode?: string;
  viewerRole?: 'BUYER' | 'SHOP_OWNER';
}

interface LocationState {
  lat: number;
  lng: number;
  updatedAt: string;
  shipperName: string;
  shipperId?: number;
  shopLat?: number | null;
  shopLng?: number | null;
  destLat?: number | null;
  destLng?: number | null;
}

const fmtCur = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

const fmtDateTime = (d: string) => {
  try {
    return new Date(d).toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit',
    });
  } catch { return '--'; }
};

const Tracking: React.FC<TrackingProps> = ({ onBack, orderId: orderIdProp, orderCode, viewerRole = 'BUYER' }) => {
  const { orderId: orderIdParam } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const orderId = orderIdProp || Number(orderIdParam) || 0;
  const displayCode = orderCode || `#${orderId}`;

  const viewerRoleRef = useRef(viewerRole);
  useEffect(() => { viewerRoleRef.current = viewerRole; }, [viewerRole]);

  // ---- MAP REFS ----
  const mapRef             = useRef<HTMLDivElement>(null);
  const leafletMapRef      = useRef<any>(null);
  const shipperMarkerRef   = useRef<any>(null);
  const routeLayer1Ref     = useRef<any>(null);
  const routeLayer2Ref     = useRef<any>(null);
  const fullRoute1Ref      = useRef<[number, number][]>([]);
  const fullRoute2Ref      = useRef<[number, number][]>([]);
  const arrivedShopRef     = useRef(false);
  const lastIdx1Ref        = useRef(0);
  const lastIdx2Ref        = useRef(0);
  const stompClientRef     = useRef<Client | null>(null);
  const userInteractingRef = useRef(false);
  const interactTimeoutRef = useRef<any>(null);
  // ✅ FIX Map container already initialized
  const mapInitializedRef  = useRef(false);

  // ---- STATE ----
  const [wsStatus,        setWsStatus]        = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [location,        setLocation]        = useState<LocationState | null>(null);
  const [loadingInitial,  setLoadingInitial]  = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [followShipper,   setFollowShipper]   = useState(true);
  const [shipperActive,   setShipperActive]   = useState(false);
  const lastUpdateRef      = useRef<number | null>(null);
  const shipperActiveRef   = useRef(false);

  // ---- DATA FROM API ----
  const [orderData,    setOrderData]    = useState<OrderResponse | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [showWaybill,  setShowWaybill]  = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    (async () => {
      setLoadingOrder(true);
      try {
        // Ưu tiên chi tiết đơn (có trackings + ảnh bằng chứng)
        try {
          const byId = await orderService.getOrderById(orderId);
          if (byId.result) {
            setOrderData(byId.result);
            return;
          }
        } catch {
          /* fallback list */
        }

        let found: OrderResponse | undefined;
        if (viewerRole === 'SHOP_OWNER') {
          const ordersRes = await orderService.getAllOrders();
          if (ordersRes.result) found = ordersRes.result.find((o) => o.id === orderId);
        } else {
          const userRes = await authService.getMyInfo();
          if (!userRes.result) return;
          const ordersRes = await orderService.getOrdersByUserId(userRes.result.id);
          if (ordersRes.result) found = ordersRes.result.find((o) => o.id === orderId);
        }
        if (found) setOrderData(found);
      } catch (e) {
        console.error('[Tracking] fetch order failed:', e);
      } finally {
        setLoadingOrder(false);
      }
    })();
  }, [orderId, viewerRole]);

  // ---- TIMELINE ----
  const buildTimeline = (order: OrderResponse | null) => {
    const s         = order?.status ?? '';
    const confirmed = ['CONFIRMED', 'WAITING_SHIPPER', 'SHIPPING', 'DELIVERED'].includes(s);
    const shipping  = s === 'SHIPPING';
    const delivered = s === 'DELIVERED';
    const failed    = s === 'FAILED';
    const createdAt = order ? fmtDateTime(order.createdAt) : '--';
    return [
      { label: 'Đã đặt hàng',            time: createdAt,                          done: true,      active: false,    failed: false, icon: Box        },
      { label: 'Nhà vườn đang chuẩn bị',  time: confirmed ? 'Đã xác nhận' : '--',  done: confirmed, active: false,    failed: false, icon: Clock      },
      { label: 'Shipper đang lấy hàng',   time: shipping  ? 'Đang giao'   : '--',  done: delivered, active: shipping, failed: false, icon: Truck      },
      { label: 'Đang trên đường giao',    time: shipping  ? 'Đang di chuyển' : '--', done: delivered, active: shipping, failed: false, icon: MapPin   },
      { label: failed ? 'Giao hàng thất bại' : 'Giao hàng thành công',
        time: delivered || failed ? createdAt : '--:--',
        done: delivered, active: false, failed, icon: CheckCircle2 },
    ];
  };
  const steps = buildTimeline(orderData);

  // ---- LEAFLET CSS ----
  useEffect(() => {
    if (document.querySelector('link[href*="leaflet.css"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // ✅ HELPER: tính opacity của shipper marker theo role + phase
  //
  //   BUYER      → chỉ thấy shipper khi arrivedShop = true  (phase 2: shop→buyer)
  //   SHOP_OWNER → chỉ thấy shipper khi arrivedShop = false (phase 1: shipper→shop)
  //
  // Gọi hàm này mỗi khi arrivedShop thay đổi hoặc nhận location mới
  // ─────────────────────────────────────────────────────────────────────────
  const updateShipperVisibility = useCallback(() => {
    if (!shipperMarkerRef.current) return;
    const role       = viewerRoleRef.current;
    const arrived    = arrivedShopRef.current;
    const shouldShow =
      role === 'BUYER'
        ? arrived    // BUYER: chỉ thấy khi shipper đã qua shop (phase 2)
        : !arrived;  // SHOP_OWNER: chỉ thấy khi shipper chưa tới shop (phase 1)
    shipperMarkerRef.current.setOpacity(shouldShow ? 1 : 0);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // ✅ HELPER: detect phase dựa vào khoảng cách shipper → shop
  //
  // Đây là cách duy nhất đáng tin cậy cho GPS thật (không dùng trimRoute)
  // Ngưỡng ARRIVED_KM: shipper trong vòng 300m từ shop → coi là đã đến shop
  //
  // Khi arrivedShop chuyển false→true: gọi updateShipperVisibility ngay
  // ─────────────────────────────────────────────────────────────────────────
  const ARRIVED_KM = 0.3; // 300 mét

  const checkAndUpdatePhase = useCallback((
    shipperLat: number, shipperLng: number,
    shopLat: number,    shopLng: number,
  ) => {
    if (arrivedShopRef.current) return; // đã arrived rồi → không check nữa

    // Tính khoảng cách Haversine đơn giản (đủ chính xác cho ~km)
    const dLat  = (shipperLat - shopLat) * (Math.PI / 180);
    const dLng  = (shipperLng - shopLng) * (Math.PI / 180);
    const a     = Math.sin(dLat / 2) ** 2
                + Math.cos(shopLat * Math.PI / 180)
                * Math.cos(shipperLat * Math.PI / 180)
                * Math.sin(dLng / 2) ** 2;
    const distKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    if (distKm <= ARRIVED_KM) {
      arrivedShopRef.current = true;
      updateShipperVisibility(); // ← cập nhật marker ngay khi phase đổi
    }
  }, [updateShipperVisibility]);

  // ---- INIT MAP ----
  const initMap = useCallback((lat: number, lng: number) => {
    if (!mapRef.current)          return;
    if (mapInitializedRef.current) return;
    if ((mapRef.current as any)._leaflet_id) return;
    if (leafletMapRef.current)    return;
    mapInitializedRef.current = true;

    import('leaflet').then(async (L) => {
      if (leafletMapRef.current)                return;
      if ((mapRef.current as any)?._leaflet_id) return;

      loadLeafletCss();
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current!, { center: [lat, lng], zoom: 15 });
      const baseTile = await createBaseTileLayer(L);
      baseTile.addTo(map);

      const shipperIcon = L.divIcon({
        html: `<div style="width:44px;height:44px;background:#3B82F6;border:3px solid white;border-radius:12px;
            display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(59,130,246,0.5);">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 3h15v13H1z"/><path d="m16 8 4 0 3 3 0 5-3 0"/>
              <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
            </svg></div>
          <div style="position:absolute;bottom:-24px;left:50%;transform:translateX(-50%);
            background:#1D4ED8;color:white;padding:3px 10px;border-radius:20px;
            font-size:10px;font-weight:900;white-space:nowrap;">Shipper</div>`,
        className: '', iconSize: [44, 44], iconAnchor: [22, 22],
      });

      shipperMarkerRef.current = L.marker([lat, lng], { icon: shipperIcon }).addTo(map);
      leafletMapRef.current    = map;

      // ✅ Áp dụng visibility ngay khi marker vừa được tạo
      updateShipperVisibility();

      map.on('dragstart', () => {
        userInteractingRef.current = true;
        clearTimeout(interactTimeoutRef.current);
        mapRef.current?.dispatchEvent(new CustomEvent('user-drag'));
      });
      map.on('zoomstart', () => {
        userInteractingRef.current = true;
        clearTimeout(interactTimeoutRef.current);
        interactTimeoutRef.current = setTimeout(() => { userInteractingRef.current = false; }, 5000);
      });
    });
  }, [updateShipperVisibility]);

  const updateMarker = useCallback((lat: number, lng: number) => {
    if (shipperMarkerRef.current) {
      shipperMarkerRef.current.setLatLng([lat, lng]);
      // ✅ Cập nhật visibility mỗi khi vị trí thay đổi
      updateShipperVisibility();
    } else {
      initMap(lat, lng);
    }
  }, [initMap, updateShipperVisibility]);

  // Pan theo shipper
  useEffect(() => {
    if (followShipper && location && leafletMapRef.current) {
      // ✅ Chỉ pan khi shipper đang visible với role hiện tại
      const arrived    = arrivedShopRef.current;
      const shouldShow =
        viewerRole === 'BUYER' ? arrived : !arrived;
      if (shouldShow) {
        leafletMapRef.current.panTo([location.lat, location.lng], { animate: true, duration: 0.8 });
      }
    }
  }, [location, followShipper, viewerRole]);

  // Tắt follow khi kéo map
  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const handler = () => setFollowShipper(false);
    el.addEventListener('user-drag', handler);
    return () => el.removeEventListener('user-drag', handler);
  }, []);

  // ---- TRIM ROUTE ----
  const findForward = (route: [number, number][], lat: number, lng: number, from: number) => {
    let minD = Infinity, minI = from;
    for (let i = from; i < route.length; i++) {
      const d = (route[i][0] - lat) ** 2 + (route[i][1] - lng) ** 2;
      if (d < minD) { minD = d; minI = i; }
    }
    return minI;
  };

  const trimRoute = useCallback((sLat: number, sLng: number, shopLat: number, shopLng: number) => {
    import('leaflet').then((L) => {
      const map  = leafletMapRef.current;
      if (!map)  return;
      const NEAR = 0.004;
      const dShop = Math.sqrt((sLat - shopLat) ** 2 + (sLng - shopLng) ** 2);

      if (!arrivedShopRef.current) {
        const r1 = fullRoute1Ref.current;
        if (r1.length > 1) {
          const idx = findForward(r1, sLat, sLng, lastIdx1Ref.current);
          lastIdx1Ref.current = idx;
          const rem = r1.slice(idx);
          if (routeLayer1Ref.current) { try { map.removeLayer(routeLayer1Ref.current); } catch {} routeLayer1Ref.current = null; }
          if (dShop < NEAR || rem.length < 2) {
            // ✅ Dùng checkAndUpdatePhase thay vì set trực tiếp
            // (checkAndUpdatePhase đã xử lý setOpacity + arrivedShopRef)
            arrivedShopRef.current = true;
            updateShipperVisibility();
            if (map._shopMarker) { try { map.removeLayer(map._shopMarker); } catch {} map._shopMarker = null; }
          } else {
            routeLayer1Ref.current = L.polyline(rem, { color: '#F97316', weight: 5, opacity: 0.85 }).addTo(map);
          }
        }
      } else {
        const r2 = fullRoute2Ref.current;
        if (r2.length > 1) {
          const idx = findForward(r2, sLat, sLng, lastIdx2Ref.current);
          lastIdx2Ref.current = idx;
          const rem = r2.slice(idx);
          if (routeLayer2Ref.current) { try { map.removeLayer(routeLayer2Ref.current); } catch {} routeLayer2Ref.current = null; }
          if (rem.length < 2) {
            if (map._destMarker) { try { map.removeLayer(map._destMarker); } catch {} map._destMarker = null; }
          } else {
            routeLayer2Ref.current = L.polyline(rem, { color: '#3B82F6', weight: 5, opacity: 0.85 }).addTo(map);
          }
        }
      }
    });
  }, [updateShipperVisibility]);

  // ---- DRAW ROUTES ----
  const drawRoutes = useCallback(async (
    sLat: number, sLng: number,
    shopLat: number, shopLng: number,
    destLat: number, destLng: number,
    isFake = false,
  ) => {
    if (!shipperActiveRef.current) return;

    if (fullRoute1Ref.current.length > 0 || fullRoute2Ref.current.length > 0) {
      if (isFake) trimRoute(sLat, sLng, shopLat, shopLng);
      return;
    }
    if ((drawRoutes as any)._fetching) return;
    (drawRoutes as any)._fetching = true;

    import('leaflet').then(async (L) => {
      const map = leafletMapRef.current;
      if (!map) { (drawRoutes as any)._fetching = false; return; }

      if (!map._shopMarker) {
        const shopLabel = viewerRoleRef.current === 'SHOP_OWNER' ? 'Shop của bạn' : 'Lấy hàng';
        const shopIcon  = L.divIcon({
          html: `<div style="width:40px;height:40px;background:#F97316;border:3px solid white;border-radius:10px;
              display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(249,115,22,0.5);">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/></svg></div>
            <div style="position:absolute;bottom:-22px;left:50%;transform:translateX(-50%);
              background:#EA580C;color:white;padding:2px 8px;border-radius:12px;
              font-size:9px;font-weight:900;white-space:nowrap;">${shopLabel}</div>`,
          className: '', iconSize: [40, 40], iconAnchor: [20, 20],
        });
        map._shopMarker = L.marker([shopLat, shopLng], { icon: shopIcon }).addTo(map);
      }

      if (viewerRoleRef.current !== 'SHOP_OWNER' && !map._destMarker) {
        const destIcon = L.divIcon({
          html: `<div style="width:40px;height:40px;background:#22C55E;border:3px solid white;border-radius:50%;
              display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(34,197,94,0.5);">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/></svg></div>
            <div style="position:absolute;bottom:-22px;left:50%;transform:translateX(-50%);
              background:#16A34A;color:white;padding:2px 8px;border-radius:12px;
              font-size:9px;font-weight:900;white-space:nowrap;">Giao hàng</div>`,
          className: '', iconSize: [40, 40], iconAnchor: [20, 20],
        });
        map._destMarker = L.marker([destLat, destLng], { icon: destIcon }).addTo(map);
      }

      try {
        const [r1, r2] = await Promise.all([
          fetch(`https://router.project-osrm.org/route/v1/driving/${sLng},${sLat};${shopLng},${shopLat}?overview=full&geometries=geojson`),
          fetch(`https://router.project-osrm.org/route/v1/driving/${shopLng},${shopLat};${destLng},${destLat}?overview=full&geometries=geojson`),
        ]);
        const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
        const role = viewerRoleRef.current;

        if (role !== 'BUYER' && d1.routes?.length) {
          fullRoute1Ref.current = d1.routes[0].geometry.coordinates.map(([lng, lat]: number[]) => [lat, lng] as [number, number]);
          if (routeLayer1Ref.current) { try { map.removeLayer(routeLayer1Ref.current); } catch {} }
          routeLayer1Ref.current = L.polyline(fullRoute1Ref.current, { color: '#F97316', weight: 5, opacity: 0.8 }).addTo(map);
        }
        if (role !== 'SHOP_OWNER' && d2.routes?.length) {
          fullRoute2Ref.current = d2.routes[0].geometry.coordinates.map(([lng, lat]: number[]) => [lat, lng] as [number, number]);
          if (routeLayer2Ref.current) { try { map.removeLayer(routeLayer2Ref.current); } catch {} }
          routeLayer2Ref.current = L.polyline(fullRoute2Ref.current, { color: '#3B82F6', weight: 5, opacity: 0.8 }).addTo(map);
        }

        const boundsPoints: [number, number][] =
          role === 'BUYER'      ? [[shopLat, shopLng], [destLat, destLng]] :
          role === 'SHOP_OWNER' ? [[sLat, sLng], [shopLat, shopLng]] :
                                  [[sLat, sLng], [shopLat, shopLng], [destLat, destLng]];
        if (!userInteractingRef.current) {
          map.fitBounds(L.latLngBounds(boundsPoints), { padding: [50, 50], animate: true });
        }
      } catch (e) {
        console.warn('[Route]', e);
      } finally {
        (drawRoutes as any)._fetching = false;
      }
    });
  }, [trimRoute]);

  // ---- CLEAR LAYERS ----
  const clearMapLayers = useCallback(() => {
    const map = leafletMapRef.current;
    if (!map) return;
    if (routeLayer1Ref.current)   { try { map.removeLayer(routeLayer1Ref.current);   } catch {} routeLayer1Ref.current   = null; }
    if (routeLayer2Ref.current)   { try { map.removeLayer(routeLayer2Ref.current);   } catch {} routeLayer2Ref.current   = null; }
    if (map._shopMarker)          { try { map.removeLayer(map._shopMarker);           } catch {} map._shopMarker          = null; }
    if (map._destMarker)          { try { map.removeLayer(map._destMarker);           } catch {} map._destMarker          = null; }
    if (shipperMarkerRef.current) { try { shipperMarkerRef.current.setOpacity(0);    } catch {} }
    fullRoute1Ref.current  = [];
    fullRoute2Ref.current  = [];
    arrivedShopRef.current = false;
    lastIdx1Ref.current    = 0;
    lastIdx2Ref.current    = 0;
    (drawRoutes as any)._fetching = false;
  }, []);

  // ---- INTERVAL: CHECK SHIPPER ACTIVE ----
  useEffect(() => {
    const iv = setInterval(() => {
      if (lastUpdateRef.current === null) return;
      const sec    = (Date.now() - lastUpdateRef.current) / 1000;
      const active = sec < 30;
      shipperActiveRef.current = active;
      setShipperActive(prev => { if (prev && !active) clearMapLayers(); return active; });
    }, 5000);
    return () => clearInterval(iv);
  }, [clearMapLayers]);

  // ---- FETCH INITIAL LOCATION ----
  useEffect(() => {
    if (!orderId) return;
    (async () => {
      try {
        setLoadingInitial(true);
        const res = await shipperService.getShipperLocation(orderId);
        if (res.result) {
          const loc = res.result;
          setLocation({
            lat: loc.latitude, lng: loc.longitude,
            updatedAt: loc.updatedAt, shipperName: loc.shipperName,
            shipperId: loc.shipperId,
            shopLat: loc.shopLatitude, shopLng: loc.shopLongitude,
            destLat: loc.destLatitude, destLng: loc.destLongitude,
          });
          setShipperActive(true);
          shipperActiveRef.current = true;
          lastUpdateRef.current    = new Date(loc.updatedAt).getTime();
          initMap(loc.latitude, loc.longitude);
          if (loc.shopLatitude && loc.shopLongitude && loc.destLatitude && loc.destLongitude) {
            setTimeout(() => drawRoutes(
              loc.latitude, loc.longitude,
              loc.shopLatitude!, loc.shopLongitude!,
              loc.destLatitude!, loc.destLongitude!,
              false,
            ), 600);
          }
        }
      } catch {
        initMap(10.7769, 106.7009);
        setError('Shipper chưa bắt đầu di chuyển');
      } finally {
        setLoadingInitial(false);
      }
    })();
  }, [orderId, initMap, drawRoutes]);

  // ---- WEBSOCKET ----
  useEffect(() => {
    if (!orderId) return;
    const token   = localStorage.getItem(TOKEN_KEY);
    const baseUrl = API_BASE_URL.endsWith('/api/v1') ? API_BASE_URL.slice(0, -7) : API_BASE_URL;
    const client  = new Client({
      webSocketFactory: () => new (SockJS as any)(`${baseUrl}/api/v1/ws`),
      reconnectDelay: 5000,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      onConnect: () => {
        setWsStatus('connected'); setError(null);
        client.subscribe(`/topic/order/${orderId}/location`, (msg) => {
          try {
            const data = JSON.parse(msg.body);

            if (data.gpsOff === true) {
              shipperActiveRef.current = false;
              lastUpdateRef.current    = null;
              setShipperActive(false);
              clearMapLayers();
              return;
            }

            const lat = Number(data.latitude);
            const lng = Number(data.longitude);
            if (!isFinite(lat) || !isFinite(lng) || lat === 0 || lng === 0) return;

            lastUpdateRef.current    = Date.now();
            shipperActiveRef.current = true;
            setShipperActive(true);

            setLocation({
              lat, lng,
              updatedAt:   data.updatedAt ?? new Date().toISOString(),
              shipperName: data.shipperName ?? 'Shipper',
              shipperId:   data.shipperId,
              shopLat:     data.shopLatitude,
              shopLng:     data.shopLongitude,
              destLat:     data.destLatitude,
              destLng:     data.destLongitude,
            });

            // ✅ Detect phase từ khoảng cách thực tế (hoạt động cho cả GPS thật + FakeGPS)
            // Phải gọi TRƯỚC updateMarker để opacity đúng ngay lần render này
            if (data.shopLatitude && data.shopLongitude) {
              checkAndUpdatePhase(lat, lng, data.shopLatitude, data.shopLongitude);
            }

            updateMarker(lat, lng); // bên trong gọi updateShipperVisibility

            if (data.shopLatitude && data.shopLongitude && data.destLatitude && data.destLongitude) {
              drawRoutes(lat, lng, data.shopLatitude, data.shopLongitude, data.destLatitude, data.destLongitude, Boolean(data.isFake));
            }
          } catch (e) { console.error('[WS]', e); }
        });
      },
      onDisconnect: () => setWsStatus('disconnected'),
      onStompError: () => setWsStatus('disconnected'),
    });
    client.activate();
    stompClientRef.current = client;
    return () => { client.deactivate(); };
  }, [orderId, updateMarker, drawRoutes, clearMapLayers]);

  // ---- CLEANUP ----
  useEffect(() => {
    return () => {
      clearTimeout(interactTimeoutRef.current);
      if (leafletMapRef.current) { leafletMapRef.current.remove(); leafletMapRef.current = null; }
      shipperMarkerRef.current = null;
      routeLayer1Ref.current   = null;
      routeLayer2Ref.current   = null;
      mapInitializedRef.current = false;
    };
  }, []);

  const fmt = (d: string) => {
    try { return new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }); }
    catch { return '--'; }
  };

  // ===================== RENDER =====================
  return (
    <div className="flex-1 bg-background animate-in fade-in duration-500 pb-20">
      <div style={{ position: 'relative', overflow: 'clip' }}>
      <div className={viewerRole === 'SHOP_OWNER' ? "px-8 py-8" : "max-w-[1280px] mx-auto px-4 md:px-10 lg:px-40 py-12"}>

        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <button onClick={onBack} className="size-12 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all shadow-sm">
            <ArrowLeft className="size-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-black text-gray-900">Chi tiết hành trình</h1>
            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">
              Đơn hàng: {displayCode}{orderData?.recipientName ? ` • ${orderData.recipientName}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowWaybill(true)}
            className="shrink-0 px-5 py-3 bg-primary text-white font-black rounded-2xl flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all text-xs uppercase tracking-wider"
          >
            <FileText className="size-4" />
            Xem vận đơn
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

          {/* LEFT */}
          <div className="lg:col-span-4 flex flex-col gap-8">

            {/* TIMELINE */}
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10">
              <div className="space-y-8 relative">
                <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-gray-100" />
                {steps.map((step, idx) => (
                  <div key={idx} className="relative flex items-start gap-6">
                    <div className={`size-12 rounded-2xl flex items-center justify-center z-10 shadow-sm transition-all ${
                      step.failed ? 'bg-red-500 text-white' :
                      step.done   ? 'bg-primary text-white' :
                      step.active ? 'bg-blue-500 text-white animate-pulse' :
                      'bg-gray-50 text-gray-300 border border-gray-100'
                    }`}>
                      <step.icon className="size-6" />
                    </div>
                    <div className="flex-1 pt-1">
                      <p className={`text-sm font-black uppercase tracking-tight ${
                        step.failed ? 'text-red-500' :
                        step.done   ? 'text-gray-900' :
                        step.active ? 'text-blue-600' : 'text-gray-300'
                      }`}>{step.label}</p>
                      <p className="text-[11px] font-bold text-gray-400 mt-1">{step.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowWaybill(true)}
                className="w-full mt-8 py-3 bg-primary/10 text-primary font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all text-xs uppercase tracking-wider"
              >
                <FileText className="size-4" />
                Xem vận đơn &amp; bằng chứng
              </button>
            </div>

            {/* Chú thích */}
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-6 flex flex-col gap-4">
              <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Chú thích bản đồ</h4>
              {viewerRole !== 'BUYER' && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-1 rounded-full bg-orange-500" />
                  <span className="text-xs font-bold text-gray-600">Shipper → Lấy hàng tại shop</span>
                </div>
              )}
              {viewerRole !== 'SHOP_OWNER' && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-1 rounded-full bg-blue-500" />
                  <span className="text-xs font-bold text-gray-600">Shop → Giao tới nhà bạn</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="size-4 bg-orange-500 rounded" />
                <span className="text-xs font-bold text-gray-600">
                  {viewerRole === 'SHOP_OWNER' ? 'Shop của bạn' : 'Điểm lấy hàng (shop)'}
                </span>
              </div>
              {viewerRole !== 'SHOP_OWNER' && (
                <div className="flex items-center gap-3">
                  <div className="size-4 bg-green-500 rounded-full" />
                  <span className="text-xs font-bold text-gray-600">Điểm giao hàng (nhà bạn)</span>
                </div>
              )}

              {/* ✅ Thêm chú thích phase hiện tại cho dễ hiểu */}
              <div className="mt-2 pt-3 border-t border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Trạng thái hiển thị</p>
                {viewerRole === 'BUYER' ? (
                  <p className="text-xs text-gray-500 leading-relaxed">
                    🔵 Shipper sẽ hiện trên bản đồ <strong>sau khi lấy hàng</strong> từ shop và đang trên đường giao đến bạn.
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 leading-relaxed">
                    🟠 Shipper hiện trên bản đồ <strong>khi đang trên đường đến shop</strong> lấy hàng.
                  </p>
                )}
              </div>
            </div>

            {/* Thông tin Shipper — chỉ hiện khi SHIPPING */}
            {orderData?.status === 'SHIPPING' && (
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-8 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Thông tin Shipper</h4>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                  wsStatus === 'connected'   ? 'bg-green-50 text-green-600'  :
                  wsStatus === 'connecting'  ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-500'
                }`}>
                  {wsStatus === 'connected'  ? <><Wifi      className="size-3" /> Live</>          :
                   wsStatus === 'connecting' ? <><RefreshCw className="size-3 animate-spin" /> Kết nối...</> :
                                               <><WifiOff   className="size-3" /> Mất kết nối</>}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="size-14 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-500 font-black text-xl border-2 border-white shadow-sm">
                    {(location?.shipperName ?? 'S')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900">{location?.shipperName ?? 'Đang tải...'}</p>
                    <p className="text-[10px] text-gray-400 font-bold mt-1">⭐ -- • Đang giao hàng</p>
                    {location && (
                      <p className="text-[10px] text-green-500 font-bold mt-1 flex items-center gap-1">
                        <Navigation className="size-3" /> Cập nhật lúc {fmt(location.updatedAt)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="size-11 bg-green-50 text-primary rounded-xl flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                    <Phone className="size-5" />
                  </button>
                  <button
                    onClick={() => {
                      if (location?.shipperId) {
                        window.dispatchEvent(new CustomEvent('open-chat-with-user', {
                          detail: { userId: location.shipperId, userName: location.shipperName || 'Shipper' }
                        }));
                      }
                    }}
                    className="size-11 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all"
                  >
                    <MessageSquare className="size-5" />
                  </button>
                </div>
              </div>
              {location && (
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Vị trí hiện tại</p>
                  <p className="text-xs font-mono text-gray-600">{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</p>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 bg-yellow-50 text-yellow-700 rounded-2xl p-4 border border-yellow-100">
                  <AlertCircle className="size-4 shrink-0" />
                  <p className="text-xs font-bold">{error}</p>
                </div>
              )}
              {location && !shipperActive && lastUpdateRef.current && (
                <div className="flex items-center gap-2 bg-gray-50 text-gray-500 rounded-2xl p-4 border border-gray-200">
                  <WifiOff className="size-4 shrink-0" />
                  <p className="text-xs font-bold">Shipper đã tắt GPS — vị trí hiển thị lần cuối</p>
                </div>
              )}
            </div>
            )}
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            <div className="relative rounded-[40px] shadow-lg border border-gray-100" style={{ height: viewerRole === 'SHOP_OWNER' ? '600px' : '480px' }}>
              <div
                className="absolute inset-0 rounded-[40px] bg-gray-100"
                style={{ overflow: 'hidden', contain: 'strict' }}
              >
                {loadingInitial && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 gap-4">
                    <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Đang tải bản đồ...</p>
                  </div>
                )}
                <div ref={mapRef} className="w-full h-full" />
              </div>

              {wsStatus === 'connected' && (
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white/95 backdrop-blur px-4 py-2 rounded-2xl shadow-lg pointer-events-none">
                  <div className="size-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Đang theo dõi live</span>
                </div>
              )}

              {/* ✅ Badge phase hiện tại trên map */}
              {shipperActive && (
                <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-white/95 backdrop-blur px-4 py-2 rounded-2xl shadow-lg pointer-events-none">
                  <div className={`size-2 rounded-full ${arrivedShopRef.current ? 'bg-blue-500' : 'bg-orange-500'}`} />
                  <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">
                    {arrivedShopRef.current ? 'Đang giao tới bạn' : 'Đang lấy hàng'}
                  </span>
                </div>
              )}

              <button
                onClick={() => setFollowShipper(prev => {
                  const next = !prev;
                  if (next && location && leafletMapRef.current) {
                    leafletMapRef.current.panTo([location.lat, location.lng], { animate: true });
                  }
                  return next;
                })}
                className={`absolute bottom-4 right-4 z-10 px-5 py-3 rounded-2xl flex items-center gap-2 text-xs font-black shadow-xl transition-all uppercase tracking-widest border
                  ${followShipper
                    ? 'bg-primary text-white border-primary shadow-primary/30'
                    : 'bg-white/95 text-primary border-white/20 hover:bg-white'}`}
              >
                <Navigation className="size-4" />
                {followShipper ? 'Đang theo dõi' : 'Theo dõi shipper'}
              </button>
            </div>

            {/* Tóm tắt đơn hàng */}
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10">
              <div className="flex items-center justify-between mb-8">
                <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight">Tóm tắt đơn hàng</h4>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {loadingOrder ? '...' : `${orderData?.items?.length ?? 0} món • Tổng: ${fmtCur(orderData?.totalAmount ?? 0)}`}
                </span>
              </div>
              {loadingOrder ? (
                <div className="flex items-center justify-center py-8 gap-3">
                  <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-gray-400">Đang tải...</span>
                </div>
              ) : orderData?.items && orderData.items.length > 0 ? (
                <>
                  <div className="space-y-2 mb-6">
                    {orderData.items.map((item) => (
                      <div key={item.orderDetailId} className="flex justify-between items-center text-sm py-2 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="size-8 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                            <Package className="size-4 text-primary" />
                          </div>
                          <span className="text-gray-700 font-bold">{item.productName}</span>
                          <span className="text-gray-400 text-xs">x{item.quantity}</span>
                        </div>
                        <span className="font-black text-gray-900 shrink-0">{fmtCur(item.unitPrice * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Người nhận</p>
                      <p className="text-sm font-black text-gray-800">{orderData.recipientName}</p>
                      <p className="text-xs text-gray-500">{orderData.recipientPhone}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Địa chỉ</p>
                      <p className="text-xs text-gray-600 leading-snug">{orderData.shippingAddress}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Phí ship</p>
                      <p className="text-sm font-black text-primary">{fmtCur(orderData.shippingFee)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Thanh toán</p>
                      <p className="text-sm font-black text-gray-800">{orderData.paymentMethod}</p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-center text-sm text-gray-400 py-6">Không có thông tin sản phẩm</p>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Modal vận đơn — trạng thái + ảnh bằng chứng (giống farmer) */}
      {showWaybill && (
        <>
          <div className="fixed inset-0 z-[100] overflow-y-auto px-4 py-8 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="mx-auto bg-white w-full max-w-[620px] rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh]">
              <div className="p-8 overflow-y-auto max-h-[90vh]">
                <div className="flex items-center justify-between mb-6 gap-4">
                  <div>
                    <h3 className="text-xl font-black text-gray-900">Theo dõi hành trình</h3>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">
                      #{orderId} · {getOrderStatusLabel(orderData?.status)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowWaybill(false)}
                    className="size-9 rounded-2xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 mb-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-black text-gray-400 mb-1">Trạng thái</p>
                      <p className="text-sm font-black text-gray-900">{getOrderStatusLabel(orderData?.status)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-widest font-black text-gray-400 mb-1">Người nhận</p>
                      <p className="text-sm font-black text-gray-900">{orderData?.recipientName || '—'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  {(!orderData?.trackings || orderData.trackings.length === 0) ? (
                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 text-center text-sm text-gray-500">
                      Hiện chưa có thông tin hành trình / bằng chứng.
                    </div>
                  ) : (
                    orderData.trackings
                      .slice()
                      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                      .map((tracking, index) => {
                        const isDeliveryEvidence =
                          tracking.status === 'DELIVERED' || tracking.status === 'FAILED';
                        return (
                          <div key={tracking.trackingId ?? index} className="rounded-3xl border border-gray-100 p-5 shadow-sm bg-white">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                                  Bước {index + 1}
                                  {isDeliveryEvidence ? ' · Bằng chứng giao hàng' : ''}
                                </p>
                                <p className="text-sm font-black text-gray-900">
                                  {getOrderStatusLabel(tracking.status)}
                                </p>
                                <p className="text-[11px] text-gray-400 mt-1">
                                  {new Date(tracking.createdAt).toLocaleString('vi-VN')}
                                </p>
                              </div>
                            </div>
                            {tracking.images && tracking.images.length > 0 && (
                              <div className="mt-4 grid grid-cols-3 gap-3">
                                {tracking.images.map((image, imageIndex) => (
                                  <button
                                    key={imageIndex}
                                    type="button"
                                    onClick={() => setLightboxImageUrl(image.imageUrl)}
                                    className="overflow-hidden rounded-3xl border border-gray-100 bg-gray-50 hover:border-primary transition-all"
                                  >
                                    <img
                                      src={image.imageUrl}
                                      alt={`Tracking ${index + 1} ảnh ${imageIndex + 1}`}
                                      className="w-full h-20 object-cover"
                                    />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowWaybill(false)}
                  className="w-full py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black text-gray-500 hover:bg-gray-100 transition-all mt-6"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
          <ImageLightbox
            imageUrl={lightboxImageUrl}
            alt="Ảnh bằng chứng"
            onClose={() => setLightboxImageUrl(null)}
          />
        </>
      )}
    </div>
  );
};

export default Tracking;