import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Loader2, ArrowLeft, MapPin, Truck, Package,
  CheckCircle, XCircle, AlertCircle, Navigation,
  Warehouse, DollarSign, User,
} from 'lucide-react';
import { tripService, TripJoinRequestResponse } from '../../services';
import { USER_INFO_KEY } from '../../services/api.config';

// ─── Get current user id from localStorage ────────────────────────────────────
function getCurrentUserId(): number | null {
  try {
    const raw = localStorage.getItem(USER_INFO_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user?.id ?? null;
  } catch { return null; }
}

// ─── Decode Google encoded polyline → [lat, lng][] ───────────────────────────
function decodePolyline(encoded: string): [number, number][] {
  const pts: [number, number][] = [];
  let idx = 0, lat = 0, lng = 0;
  while (idx < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(idx++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(idx++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : result >> 1;
    pts.push([lat / 1e5, lng / 1e5]);
  }
  return pts;
}

// ─── OSRM: ordered waypoints → full geometry ─────────────────────────────────
async function fetchOSRMRoute(waypoints: [number, number][]): Promise<{
  geometry: [number, number][];
  distanceKm: number;
  durationMin: number;
} | null> {
  if (waypoints.length < 2) return null;
  try {
    const coords = waypoints.map(([la, lo]) => `${lo},${la}`).join(';');
    const data = await (await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
    )).json();
    if (data.code !== 'Ok' || !data.routes?.length) return null;
    const r = data.routes[0];
    return {
      geometry: r.geometry.coordinates.map(([lo, la]: number[]) => [la, lo] as [number, number]),
      distanceKm: r.distance / 1000,
      durationMin: r.duration / 60,
    };
  } catch { return null; }
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const d = await (await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
    )).json();
    return d.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch { return `${lat.toFixed(5)}, ${lng.toFixed(5)}`; }
}

function fmtDuration(min: number) {
  if (min < 60) return `${Math.round(min)} phút`;
  return `${Math.floor(min / 60)}h ${Math.round(min % 60)}p`;
}

function distanceKm(a: [number, number], b: [number, number]) {
  const toRad = (v: number) => v * Math.PI / 180;
  const r = 6371;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// ─── Thuật toán tìm vị trí chèn tối ưu (Minimum Detour) ─────────────────────
function insertJoinRequestWaypoint<T extends { lat: number; lng: number }>(
  startPt: [number, number],
  stops: T[],
  pickupPt: [number, number],
) {
  // Gom tất cả các điểm thành 1 mảng theo thứ tự: Start -> Stop1 -> Stop2 ...
  const allPoints: [number, number][] = [
    startPt,
    ...stops.map((s) => [s.lat, s.lng] as [number, number]),
  ];

  let bestIndex = 1; // Mặc định chèn sau điểm Start
  let minDetour = Infinity;

  // Duyệt qua từng cặp điểm nối tiếp nhau để tìm xem chèn vào đâu thì tốn ít quãng đường nhất
  for (let i = 0; i < allPoints.length; i++) {
    const current = allPoints[i];
    const next = i === allPoints.length - 1 ? null : allPoints[i + 1];

    if (next) {
      // Độ lệch = (khoảng cách current->pickup + pickup->next) - khoảng cách current->next ban đầu
      const detour = distanceKm(current, pickupPt) + distanceKm(pickupPt, next) - distanceKm(current, next);
      if (detour < minDetour) {
        minDetour = detour;
        bestIndex = i + 1; 
      }
    } else {
      // Nếu chèn ở điểm cuối cùng
      const detour = distanceKm(current, pickupPt);
      if (detour < minDetour) {
        minDetour = detour;
        bestIndex = i + 1;
      }
    }
  }

  // bestIndex đang tính cả điểm Start, nên index trong mảng stops sẽ lùi 1
  const insertIndexInStops = bestIndex - 1;
  const before = stops.slice(0, insertIndexInStops);
  const after = stops.slice(insertIndexInStops);

  return {
    insertIndex: insertIndexInStops,
    waypoints: [
      startPt,
      ...before.map((stop) => [stop.lat, stop.lng] as [number, number]),
      pickupPt,
      ...after.map((stop) => [stop.lat, stop.lng] as [number, number]),
    ],
  };
}

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Chờ duyệt', cls: 'bg-yellow-100 text-yellow-700' },
  APPROVED: { label: 'Đã duyệt', cls: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: 'Từ chối', cls: 'bg-red-100 text-red-700' },
};
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const c = STATUS_CFG[status] ?? { label: status, cls: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider ${c.cls}`}>
      {c.label}
    </span>
  );
};

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3 py-2.5 border-b border-gray-50 last:border-0">
    <span className="text-sm text-gray-500 shrink-0">{label}</span>
    <span className="text-sm font-bold text-gray-900 text-right">{value}</span>
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
const TripJoinRequestDetail: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();

  const [req, setReq] = useState<TripJoinRequestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actMsg, setActMsg] = useState<string | null>(null);
  const [startAddr, setStartAddr] = useState('');
  const [pickupAddr, setPickupAddr] = useState('');
  const [routeDistKm, setRouteDistKm] = useState<number | null>(null);
  const [routeDurMin, setRouteDurMin] = useState<number | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<any>(null);

  // ── Load join request ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!requestId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await tripService.getJoinRequestById(Number(requestId));
        setReq(res.result ?? null);
      } catch { setError('Không thể tải thông tin yêu cầu.'); }
      finally { setLoading(false); }
    })();
  }, [requestId]);

  // ── Build map ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!req || !mapRef.current) return;
    const trip = req.trip;
    if (!trip?.startLat || !trip?.startLng) return;

    const currentUserId = getCurrentUserId();
    const isOwner = currentUserId != null && trip.ownerId === currentUserId;

    let dead = false;

    (async () => {
      if (trip.startLat && trip.startLng)
        reverseGeocode(trip.startLat, trip.startLng).then(a => { if (!dead) setStartAddr(a); });
      if (req.pickupLat && req.pickupLng)
        reverseGeocode(req.pickupLat, req.pickupLng).then(a => { if (!dead) setPickupAddr(a); });

      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const l = document.createElement('link');
        l.rel = 'stylesheet'; l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(l);
      }
      const L = await import('leaflet');
      if (dead || !mapRef.current) return;

      if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null; }

      const startPt: [number, number] = [trip.startLat, trip.startLng];
      const pickupPt: [number, number] = [req.pickupLat, req.pickupLng];

      const map = L.map(mapRef.current, { center: startPt, zoom: 13 });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
      leafletRef.current = map;

      // ── Icons Helper ───────────────────────────────────────────────────────
      const mkIcon = (color: string, label: string, extraStyle = '') => L.divIcon({
        className: '',
        html: `<div style="background:${color};color:#fff;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3); ${extraStyle}">${label}</div>`,
        iconSize: [34, 34], iconAnchor: [17, 17],
      });

      L.marker(startPt, { icon: mkIcon('#3b82f6', 'S') })
        .addTo(map).bindPopup('<b>Điểm xuất phát</b>');

      // Join request marker - Nổi bật màu cam (Amber) cùng box-shadow sáng
      L.marker(pickupPt, { icon: mkIcon('#f59e0b', 'Y/C', 'box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.4); transform: scale(1.05);') })
        .addTo(map).bindPopup(
          `<b>Yêu cầu ghép chuyến (MỚI)</b><br/>${req.farmerName || ''}<br/><span style="color:#6b7280">Điểm đang chờ duyệt vào lộ trình</span>`
        );

      const sortedStops = (trip.tripStops ?? [])
        .slice()
        .sort((a, b) => a.sequence - b.sequence);

      let finalGeometry: [number, number][] | null = null;

      if (isOwner) {
        // ── OWNER: show all stops + full route ──────────────────────────────
        sortedStops.forEach(stop => {
          const color = stop.isPickup ? '#10b981' : '#6366f1';
          L.marker([stop.lat, stop.lng], { icon: mkIcon(color, String(stop.sequence)) })
            .addTo(map)
            .bindPopup(`<b>Điểm ${stop.sequence}</b><br/>${stop.farmer?.shopName || stop.farmer?.fullName || ''}`);
        });

        // Tìm vị trí chèn tốt nhất dựa vào thuật toán tối ưu độ lệch
        const { insertIndex, waypoints } = insertJoinRequestWaypoint(startPt, sortedStops, pickupPt);
        
        // Vẽ tia đứt nét màu cam tới điểm Join Request để dễ hình dung đoạn chèn thêm
        const prevStop = insertIndex === 0 ? null : sortedStops[insertIndex - 1];
        const nextStop = insertIndex === sortedStops.length ? null : sortedStops[insertIndex];

        const prevPt: [number, number] = prevStop ? [prevStop.lat, prevStop.lng] : startPt;
        const nextPt: [number, number] | null = nextStop ? [nextStop.lat, nextStop.lng] : null;

        // L.polyline([prevPt, pickupPt], { color: '#f59e0b', weight: 4, opacity: 0.9, dashArray: '6 8' }).addTo(map);
        // if (nextPt) {
        //   L.polyline([pickupPt, nextPt], { color: '#f59e0b', weight: 4, opacity: 0.9, dashArray: '6 8' }).addTo(map);
        // }

        const osrm = await fetchOSRMRoute(waypoints);
        if (!dead && osrm) {
          finalGeometry = osrm.geometry;
          setRouteDistKm(osrm.distanceKm);
          setRouteDurMin(osrm.durationMin);
        }
      } else {
        // ── NON-OWNER ──────────────────
        const osrm = await fetchOSRMRoute([startPt, pickupPt]);
        if (!dead) {
          if (osrm) {
            finalGeometry = osrm.geometry;
            setRouteDistKm(osrm.distanceKm);
            setRouteDurMin(osrm.durationMin);
          } else {
            finalGeometry = [startPt, pickupPt];
          }
        }
      }

      if (!dead) {
        if (trip.totalEstimatedDistanceKm && routeDistKm == null)
          setRouteDistKm(trip.totalEstimatedDistanceKm);
        if (trip.departureTime && trip.estimatedArrivalTime && routeDurMin == null) {
          const dep = new Date(trip.departureTime).getTime();
          const arr = new Date(trip.estimatedArrivalTime).getTime();
          setRouteDurMin((arr - dep) / 60000);
        }

        if (finalGeometry && finalGeometry.length > 1) {
          L.polyline(finalGeometry, { color: '#6366f1', weight: 5, opacity: 0.85 }).addTo(map);
          map.fitBounds(L.latLngBounds(finalGeometry), { padding: [40, 40] });
        } else {
          const fallback: [number, number][] = [startPt, pickupPt];
          L.polyline(fallback, { color: '#6366f1', weight: 4, dashArray: '8 6', opacity: 0.7 }).addTo(map);
          map.fitBounds(L.latLngBounds(fallback), { padding: [40, 40] });
        }
      }
    })();

    return () => {
      dead = true;
      if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null; }
    };
  }, [req]);

  const doAction = async (fn: () => Promise<any>, newStatus: string, msg: string) => {
    setActing(true); setError(null);
    try { await fn(); setActMsg(msg); setReq(prev => prev ? { ...prev, status: newStatus } : prev); }
    catch { setError('Thao tác thất bại. Vui lòng thử lại.'); }
    finally { setActing(false); }
  };

  // ── Loading / not found ───────────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
      <Loader2 className="size-10 text-primary animate-spin" />
      <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Đang tải...</p>
    </div>
  );

  if (!req) return (
    <div className="p-8">
      <div className="rounded-3xl border border-red-100 bg-red-50 p-6 text-red-700 flex items-center gap-3">
        <AlertCircle className="size-5" /> Không tìm thấy yêu cầu ghép đơn.
      </div>
    </div>
  );

  const trip = req.trip;

  const calcPrice = (): number | null => {
    const base = trip?.basePrice ?? 0;
    const dRate = trip?.distanceRate ?? 0;
    const wRate = trip?.weightRate ?? 0;
    const km = routeDistKm ?? trip?.totalEstimatedDistanceKm ?? 0;
    if (base === 0 && dRate === 0 && wRate === 0) return null;
    return base + dRate * km + wRate * (req.requestedKg ?? 0);
  };
  const price = calcPrice();

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/farmer/trip-join')}
            className="inline-flex items-center gap-2 rounded-2xl bg-gray-100 px-4 py-2.5 text-gray-700 font-bold hover:bg-gray-200 transition">
            <ArrowLeft className="size-4" /> Quay lại
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-black text-gray-900">Yêu cầu ghép đơn #{req.id}</h2>
              <StatusBadge status={req.status} />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {req.createdAt ? `Gửi lúc: ${new Date(req.createdAt).toLocaleString('vi-VN')}` : ''}
            </p>
          </div>
        </div>
        {req.status === 'PENDING' && (
          <div className="flex gap-3">
            <button disabled={acting}
              onClick={() => doAction(() => tripService.approveJoinRequest(req.id), 'APPROVED', 'Đã duyệt yêu cầu.')}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-black uppercase text-white hover:bg-emerald-700 disabled:opacity-50 transition">
              <CheckCircle className="size-4" /> {acting ? 'Đang xử lý…' : 'Duyệt'}
            </button>
            <button disabled={acting}
              onClick={() => doAction(() => tripService.rejectJoinRequest(req.id), 'REJECTED', 'Đã từ chối yêu cầu.')}
              className="inline-flex items-center gap-2 rounded-2xl bg-red-500 px-5 py-2.5 text-sm font-black uppercase text-white hover:bg-red-600 disabled:opacity-50 transition">
              <XCircle className="size-4" /> {acting ? 'Đang xử lý…' : 'Từ chối'}
            </button>
          </div>
        )}
      </div>

      {error && <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-red-700 flex items-start gap-3"><AlertCircle className="size-5 shrink-0" />{error}</div>}
      {actMsg && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-700 flex items-start gap-3"><CheckCircle className="size-5 shrink-0" />{actMsg}</div>}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        {/* ── Left: Map ── */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
            <Navigation className="size-5 text-primary" />
            <div>
              <p className="font-black text-gray-900">Lộ trình đề xuất cập nhật</p>
              <p className="text-xs text-gray-500">Xem trước tuyến đường nếu duyệt điểm ghép chuyến</p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 px-6 pt-4">
            {[
              { color: 'bg-blue-500', label: 'S', text: 'Xuất phát' },
              { color: 'bg-amber-500 ring-2 ring-amber-500/40', label: 'Y/C', text: 'Điểm ghép (Đang chờ)' },
              ...(getCurrentUserId() === req?.trip?.ownerId
                ? [{ color: 'bg-emerald-500', label: '#', text: 'Điểm dừng hiện tại' }]
                : []
              ),
            ].map(i => (
              <div key={i.label} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className={`inline-flex size-5 items-center justify-center rounded-full ${i.color} text-white text-[9px] font-black`}>{i.label}</span>
                {i.text}
              </div>
            ))}
          </div>

          {/* Map */}
          <div className="px-6 py-4">
            <div ref={mapRef} className="h-80 w-full rounded-2xl border border-gray-200 bg-gray-100 overflow-hidden" />
          </div>

          {/* Route stats */}
          {(routeDistKm != null || routeDurMin != null) && (
            <div className="grid grid-cols-2 gap-4 px-6 pb-4">
              {routeDistKm != null && (
                <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4">
                  <p className="text-[11px] uppercase tracking-widest text-indigo-400 font-bold">Tổng quãng đường</p>
                  <p className="text-xl font-black text-indigo-700 mt-1">{routeDistKm.toFixed(1)} km</p>
                </div>
              )}
              {routeDurMin != null && (
                <div className="rounded-xl bg-violet-50 border border-violet-100 p-4">
                  <p className="text-[11px] uppercase tracking-widest text-violet-400 font-bold">Thời gian lái xe</p>
                  <p className="text-xl font-black text-violet-700 mt-1">{fmtDuration(routeDurMin)}</p>
                </div>
              )}
            </div>
          )}

          {/* Addresses */}
          <div className="grid grid-cols-1 gap-3 px-6 pb-6 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-[11px] uppercase tracking-widest text-gray-400 font-bold mb-1">Điểm xuất phát</p>
              <p className="text-sm font-bold text-gray-700 leading-snug">{startAddr || '—'}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-[11px] uppercase tracking-widest text-amber-500 font-bold mb-1">Điểm lấy hàng (Yêu cầu)</p>
              <p className="text-sm font-bold text-amber-900 leading-snug">{pickupAddr || '—'}</p>
            </div>
          </div>


          {/* Pricing */}
          {trip && (trip.basePrice || trip.distanceRate || trip.weightRate) && (
            <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5 mx-6 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="size-4 text-primary" />
                <p className="font-black text-gray-900">Cấu hình giá</p>
              </div>
              {trip.basePrice != null && <Row label="Giá cơ bản" value={`${trip.basePrice.toLocaleString('vi-VN')}đ`} />}
              {trip.distanceRate != null && <Row label="Giá theo km" value={`${trip.distanceRate.toLocaleString('vi-VN')}đ/km`} />}
              {trip.weightRate != null && <Row label="Giá theo kg" value={`${trip.weightRate.toLocaleString('vi-VN')}đ/kg`} />}
              <p className="mt-2 text-[11px] text-gray-400">Tổng = basePrice + distanceRate × km + weightRate × kg</p>
            </section>
          )}

        </div>

        {/* ── Right: Info panels ── */}
        <div className="space-y-4">
          {/* Join request info */}
          <section className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <User className="size-4 text-amber-600" />
              <p className="font-black text-gray-900">Chi tiết yêu cầu</p>
            </div>
            <Row label="Nông dân" value={req.farmerName || '—'} />
            <Row label="Khối lượng" value={req.requestedKg != null ? `${req.requestedKg.toLocaleString('vi-VN')} kg` : '—'} />
            <Row label="Số đơn hàng" value={`${req.orders?.length ?? 0} đơn`} />
            <Row label="Trạng thái" value={<StatusBadge status={req.status} />} />
            {price != null && (
              <Row label="Chi phí ước tính"
                value={<span className="text-emerald-700 font-black">{Math.round(req.priceOffer).toLocaleString('vi-VN')}đ</span>} />
            )}
          </section>

          {/* Trip info */}
          {trip && (
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Truck className="size-4 text-primary" />
                <p className="font-black text-gray-900">Thông tin chuyến đi</p>
              </div>
              <Row label="Chuyến #" value={`#${trip.id}`} />
              <Row label="Chủ xe" value={trip.ownerName} />
              <Row label="Phương tiện" value={trip.vehicleNumber} />
              <Row label="Trạng thái" value={trip.status} />
              {trip.availableCapacityKg != null && (
                <Row label="Còn trống" value={`${trip.availableCapacityKg.toLocaleString('vi-VN')} kg`} />
              )}
              {trip.departureTime && (
                <Row label="Khởi hành" value={new Date(trip.departureTime).toLocaleString('vi-VN')} />
              )}
              {trip.estimatedArrivalTime && (
                <Row label="Dự kiến đến" value={new Date(trip.estimatedArrivalTime).toLocaleString('vi-VN')} />
              )}
            </section>
          )}
          {/* Warehouse */}
          {trip?.warehouseName && (
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Warehouse className="size-4 text-primary" />
                <p className="font-black text-gray-900">Kho đích</p>
              </div>
              <Row label="Tên kho" value={trip.warehouseName} />
            </section>
          )}
          {/* Orders */}
          {req.orders?.length > 0 && (
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Package className="size-4 text-primary" />
                <p className="font-black text-gray-900">Đơn hàng ({req.orders.length})</p>
              </div>
              <div className="space-y-2">
                {req.orders.map(o => (
                  <div key={o.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-black text-gray-900">Đơn #{o.id}</p>
                      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-600">{o.status}</span>
                    </div>
                    {o.shippingAddress && <p className="text-xs text-gray-500 truncate">{o.shippingAddress}</p>}
                    <div className="mt-1.5 space-y-0.5">
                      {o.items?.map(i => (
                        <p key={i.orderDetailId} className="text-xs text-gray-500">
                          • {i.productName} — {i.quantity} {i.unit}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
};

export default TripJoinRequestDetail;