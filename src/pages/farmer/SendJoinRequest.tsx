import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Navigation, Loader2, Truck,
  CheckCircle, AlertCircle, Star,
} from 'lucide-react';
import { tripService, TripResponse, OrderResponse, WarehouseResponse } from '../../services';
import { createBaseTileLayer, loadLeafletCss } from '../../utils/vietmapLeaflet';

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 'location' | 'trips' | 'confirm';

interface RouteInfo { distanceKm: number; durationMin: number; }
interface TripWithRoute extends TripResponse { routeInfo?: RouteInfo; routeLoading: boolean; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function fetchOSRMDuration(
  from: [number, number], to: [number, number],
): Promise<RouteInfo | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=false`;
    const data = await (await fetch(url)).json();
    if (data.code !== 'Ok' || !data.routes?.length) return null;
    return { distanceKm: data.routes[0].distance / 1000, durationMin: data.routes[0].duration / 60 };
  } catch { return null; }
}

const UNIT_KG: Record<string, number> = {
  kg: 1, g: 0.001, chai: 0.5, hộp: 0.3, hũ: 0.3, cây: 0.2, bịch: 0.4, túi: 0.4, bó: 0.6,
};
const toKg = (qty?: number | null, unit?: string | null, itemType?: string | null) => {
  const safeQty = Number(qty ?? 0);

  if (itemType === 'MYSTERY_BOX') {
    // DTO chưa có weightKg nên tạm tính 1 mystery box = 1kg
    return Number((safeQty * 1).toFixed(2));
  }

  const safeUnit = (unit ?? 'kg').trim().toLowerCase();
  return Number((safeQty * (UNIT_KG[safeUnit] ?? 1)).toFixed(2));
};

const orderWeightKg = (o: OrderResponse) =>
  (o.items ?? []).reduce(
    (sum, item) => sum + toKg(item.quantity, item.unit, item.itemType),
    0
  );
function formatDuration(min: number) {
  if (min < 60) return `${Math.round(min)} phút`;
  return `${Math.floor(min / 60)}h ${Math.round(min % 60)}p`;
}

function addMinutes(isoStr: string, minutes: number): string {
  const d = new Date(isoStr);
  d.setMinutes(d.getMinutes() + Math.round(minutes));
  return d.toLocaleString('vi-VN');
}

// ─── Step bar ─────────────────────────────────────────────────────────────────
const STEPS: { key: Step; label: string }[] = [
  { key: 'location', label: 'Chọn vị trí & kho' },
  { key: 'trips', label: 'Chọn chuyến đi' },
  { key: 'confirm', label: 'Xác nhận & gửi' },
];

const StepBar: React.FC<{ current: Step }> = ({ current }) => {
  const idx = STEPS.findIndex(s => s.key === current);
  return (
    <div className="flex items-center">
      {STEPS.map((s, i) => (
        <React.Fragment key={s.key}>
          <div className="flex items-center gap-2">
            <span className={`flex size-7 items-center justify-center rounded-full text-xs font-black transition ${i < idx ? 'bg-primary text-white' :
              i === idx ? 'bg-primary text-white ring-4 ring-primary/20' :
                'bg-gray-100 text-gray-400'
              }`}>
              {i < idx ? '✓' : i + 1}
            </span>
            <span className={`text-sm font-bold hidden sm:block ${i === idx ? 'text-primary' : i < idx ? 'text-primary/70' : 'text-gray-400'}`}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-3 ${i < idx ? 'bg-primary' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const SendJoinRequest: React.FC = () => {
  const navigate = useNavigate();

  // Step state
  const [step, setStep] = useState<Step>('location');

  // Step 1 – location
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [pickupLat, setPickupLat] = useState('');
  const [pickupLng, setPickupLng] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Step 2 – trips + orders
  const [trips, setTrips] = useState<TripWithRoute[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<TripWithRoute | null>(null);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [requestedKg, setRequestedKg] = useState('');

  // Global
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load warehouses once
  useEffect(() => {
    tripService.getWarehouses().then(r => setWarehouses(r.result || [])).catch(() => { });
  }, []);

  // Load orders once
  useEffect(() => {
    tripService.getOrdersForTrip(0, 50)
      .then(r => setOrders(r.result?.content || []))
      .catch(() => { });
  }, []);

  // Init map on step 1
  useEffect(() => {
    if (step !== 'location') return;
    let dead = false;
    (async () => {
      if (!mapRef.current || leafletRef.current) return;
      loadLeafletCss();
      const L = await import('leaflet');
      if (dead || !mapRef.current) return;
      const lat = pickupLat ? +pickupLat : 10.8231;
      const lng = pickupLng ? +pickupLng : 106.6297;
      const map = L.map(mapRef.current, { center: [lat, lng], zoom: 13 });
      const baseTileLayer = await createBaseTileLayer(L);
      baseTileLayer.addTo(map);
      // OSM tile cũ:
      // L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      //   maxZoom: 19, attribution: '&copy; OpenStreetMap contributors',
      // }).addTo(map);
      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      marker.on('dragend', () => {
        const p = marker.getLatLng();
        setPickupLat(String(p.lat)); setPickupLng(String(p.lng));
        reverseGeocode(p.lat, p.lng);
      });
      leafletRef.current = map; markerRef.current = marker;
    })();
    return () => {
      dead = true;
      if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null; }
    };
  }, [step]);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      const d = await r.json();
      setPickupAddress(d.display_name || '');
    } catch { setPickupAddress(''); }
  };

  const useGPS = () => {
    if (!navigator.geolocation) { setError('Trình duyệt không hỗ trợ GPS.'); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      setPickupLat(String(lat)); setPickupLng(String(lng));
      await reverseGeocode(lat, lng);
      if (leafletRef.current && markerRef.current) {
        leafletRef.current.setView([lat, lng], 15);
        markerRef.current.setLatLng([lat, lng]);
      }
      setGpsLoading(false);
    }, () => { setError('Không lấy được vị trí GPS.'); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 15000 });
  };

  // ── Step 1 → 2: fetch suggested trips + OSRM ──────────────────────────────
  const handleFindTrips = async () => {
    if (!pickupLat || !pickupLng) { setError('Vui lòng chọn vị trí lấy hàng.'); return; }
    if (!warehouseId) { setError('Vui lòng chọn kho đích.'); return; }
    setError(null); setTripsLoading(true);
    try {
      const res = await tripService.getSuggestedTrips(+pickupLat, +pickupLng, +warehouseId);
      const raw: TripWithRoute[] = (res.result || []).map(t => ({ ...t, routeLoading: true }));
      setTrips(raw);
      setStep('trips');
      // Fetch OSRM for each trip concurrently, update one by one
      const selectedWarehouse = warehouses.find(w => String(w.id) === warehouseId);

      if (!selectedWarehouse?.latitude || !selectedWarehouse?.longitude) {
        setError('Kho chưa có tọa độ để tính phí.');
        setTripsLoading(false);
        return;
      }

      raw.forEach(async (trip, idx) => {
        const info = await fetchOSRMDuration(
          [+pickupLat, +pickupLng],
          [Number(selectedWarehouse.latitude), Number(selectedWarehouse.longitude)],
        );

        setTrips(prev => prev.map((t, i) =>
          i === idx ? { ...t, routeInfo: info ?? undefined, routeLoading: false } : t,
        ));
      });
    } catch { setError('Không thể tải chuyến đi đề xuất.'); }
    finally { setTripsLoading(false); }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const selectedWeight = orders
    .filter(o => selectedOrderIds.includes(o.id))
    .reduce((s, o) => s + orderWeightKg(o), 0);

  const effectiveKg = requestedKg ? +requestedKg : selectedWeight;

  const shortestTripId = (() => {
    const loaded = trips.filter(t => !t.routeLoading && t.routeInfo);
    if (!loaded.length) return null;
    return loaded.reduce((a, b) =>
      (a.routeInfo!.distanceKm < b.routeInfo!.distanceKm ? a : b),
    ).id;
  })();

  const toggleOrder = (id: number) =>
    setSelectedOrderIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedTrip) return;
    if (selectedOrderIds.length === 0) { setError('Chọn ít nhất 1 đơn hàng.'); return; }
    if (effectiveKg <= 0) { setError('Khối lượng phải lớn hơn 0.'); return; }
    if (effectiveKg < selectedWeight) {
      setError(`Khối lượng yêu cầu (${effectiveKg} kg) không được nhỏ hơn tổng khối lượng đơn hàng (${selectedWeight.toFixed(1)} kg).`);
      return;
    }
    if (selectedTrip.availableCapacityKg != null && effectiveKg > selectedTrip.availableCapacityKg) {
      setError(`Khối lượng (${effectiveKg} kg) vượt quá sức chứa còn lại của chuyến (${selectedTrip.availableCapacityKg} kg).`);
      return;
    }
    setSubmitting(true); setError(null);
    try {
      await tripService.joinTrip(selectedTrip.id, {
        orderIds: selectedOrderIds,
        requestedKg: effectiveKg,
        pickupLat: +pickupLat,
        pickupLng: +pickupLng,
      });
      setSuccess(true);
    } catch { setError('Gửi yêu cầu thất bại. Vui lòng thử lại.'); }
    finally { setSubmitting(false); }
  };

  // ── Success screen ─────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8">
        <div className="flex size-20 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle className="size-10 text-emerald-600" />
        </div>
        <div className="text-center">
          <h3 className="text-2xl font-black text-gray-900">Gửi yêu cầu thành công!</h3>
          <p className="text-gray-500 mt-2">Yêu cầu ghép đơn của bạn đã được gửi đến chủ chuyến.</p>
        </div>
        <button onClick={() => navigate('/farmer/trip-join')}
          className="rounded-2xl bg-primary px-6 py-3 text-sm font-black uppercase text-white hover:bg-primary/90 transition">
          Về trang Ghép đơn
        </button>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-3xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => step === 'location' ? navigate('/farmer/trip-join') : setStep(step === 'confirm' ? 'trips' : 'location')}
            className="inline-flex items-center gap-2 rounded-2xl bg-white border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm">
            <ArrowLeft className="size-4" /> Quay lại
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Gửi yêu cầu ghép đơn</h1>
            <p className="text-sm text-gray-500">Chọn kho và vị trí lấy hàng để tìm chuyến phù hợp.</p>
          </div>
        </div>

        {/* Step bar */}
        <div className="rounded-2xl bg-white border border-gray-100 px-6 py-4 shadow-sm">
          <StepBar current={step} />
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="size-4 mt-0.5 shrink-0" />{error}
          </div>
        )}

        {/* ──── STEP 1: Location ──── */}
        {step === 'location' && (
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-50">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-100">
                  <MapPin className="size-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-800">Chọn kho và vị trí lấy hàng</p>
                  <p className="text-xs text-gray-500">Dùng GPS hoặc kéo marker để chọn vị trí pickup.</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Warehouse */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Kho đích</label>
                <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none bg-white">
                  <option value="">— Chọn kho —</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}{w.address ? ` - ${w.address}` : ''}</option>
                  ))}
                </select>
              </div>

              {/* Map section */}
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <div>
                    <p className="text-sm font-bold text-gray-700">Địa điểm lấy hàng</p>
                    <p className="text-xs text-gray-500">Kéo marker hoặc dùng GPS để chọn vị trí trên bản đồ.</p>
                  </div>
                  <button type="button" onClick={useGPS} disabled={gpsLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition shrink-0">
                    <Navigation className="size-4" />
                    {gpsLoading ? 'Đang lấy…' : 'Sử dụng GPS'}
                  </button>
                </div>
                {/* Map */}
                <div ref={mapRef} style={{ height: 280, width: '100%' }} />
                {/* Address display */}
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <p className="text-[11px] uppercase tracking-widest text-gray-400 font-bold mb-1">Địa chỉ</p>
                  <p className="text-sm font-bold text-gray-800">
                    {pickupAddress || (pickupLat ? 'Đang xác định địa chỉ…' : 'Chưa chọn vị trí')}
                  </p>
                </div>
              </div>

              <button type="button" onClick={handleFindTrips} disabled={tripsLoading}
                className="w-full rounded-xl bg-primary py-3.5 text-sm font-black uppercase text-white hover:bg-primary/90 disabled:opacity-50 transition flex items-center justify-center gap-2">
                {tripsLoading ? <><Loader2 className="size-4 animate-spin" /> Đang tìm…</> : <><Truck className="size-4" /> Tìm chuyến đi phù hợp</>}
              </button>
            </div>
          </div>
        )}

        {/* ──── STEP 2: Trips + Orders ──── */}
        {step === 'trips' && (
          <div className="space-y-4">
            {/* Trip list */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-blue-100">
                    <Truck className="size-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">Chuyến đi đề xuất</p>
                    <p className="text-xs text-gray-500">Chọn chuyến đi — đơn hàng sẽ hiện bên dưới.</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-5 space-y-3">
                {trips.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
                    <Truck className="size-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-bold">Không tìm thấy chuyến đi phù hợp.</p>
                  </div>
                ) : (
                  trips.map(trip => {
                    const isShortest = shortestTripId === trip.id;
                    const isSelected = selectedTrip?.id === trip.id;
                    // Tính giá theo công thức: basePrice + distanceRate × km + weightRate × kg
                    const calcPrice = (kg: number) => {
                      if (!trip.routeInfo) return null;
                      const base = (trip as any).basePrice ?? 0;
                      const dRate = (trip as any).distanceRate ?? 0;
                      const wRate = (trip as any).weightRate ?? 0;
                      if (base === 0 && dRate === 0 && wRate === 0) return null;
                      return base + dRate * trip.routeInfo.distanceKm + wRate * kg;
                    };
                    const previewPrice = isSelected ? calcPrice(effectiveKg) : calcPrice(0);
                    const eta = trip.routeInfo && trip.departureTime
                      ? addMinutes(trip.departureTime, trip.routeInfo.durationMin)
                      : null;
                    const overCapacity = trip.availableCapacityKg != null && effectiveKg > trip.availableCapacityKg;

                    return (
                      <div key={trip.id}
                        onClick={() => { if (!overCapacity) { setSelectedTrip(trip); setError(null); } }}
                        className={`rounded-xl border p-4 transition ${overCapacity ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed' :
                          isSelected ? 'border-primary bg-primary/5 shadow-sm cursor-pointer' :
                            'border-gray-200 hover:border-primary/50 hover:shadow-sm cursor-pointer'
                          }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-black text-gray-900">Chuyến #{trip.id} — {trip.vehicleNumber}</p>
                              {isShortest && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700">
                                  <Star className="size-2.5" /> Gần nhất
                                </span>
                              )}
                              {overCapacity && (
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-600">Hết chỗ</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">Kho: <span className="font-bold text-gray-700">{trip.warehouseName}</span> · Chủ: {trip.ownerName}</p>
                            <p className="text-sm text-gray-500">
                              Còn trống: <span className="font-bold text-primary">{trip.availableCapacityKg?.toLocaleString('vi-VN')} kg</span>
                              {trip.departureTime && <> · Khởi hành: {new Date(trip.departureTime).toLocaleString('vi-VN')}</>}
                            </p>
                            {trip.routeLoading ? (
                              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                <Loader2 className="size-3 animate-spin" /> Đang tính quãng đường…
                              </div>
                            ) : trip.routeInfo ? (
                              <div className="flex flex-wrap gap-3 mt-1">
                                <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                                  📍 {trip.routeInfo.distanceKm.toFixed(1)} km · {formatDuration(trip.routeInfo.durationMin)}
                                </span>
                                {eta && (
                                  <span className="rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">
                                    🕐 Dự kiến đến: {eta}
                                  </span>
                                )}
                                {previewPrice != null && (
                                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                                    💰 {isSelected && selectedOrderIds.length > 0 ? 'Phí dự tính' : 'Phí cơ bản'}: ~{Math.round(previewPrice).toLocaleString('vi-VN')}đ
                                  </span>
                                )}
                              </div>
                            ) : null}
                          </div>
                          {isSelected && (
                            <CheckCircle className="size-5 text-primary shrink-0 mt-0.5" />
                          )}
                        </div>

                        {/* Orders panel — shown when this trip is selected */}
                        {isSelected && (
                          <div className="mt-4 pt-4 border-t border-primary/20 space-y-3" onClick={e => e.stopPropagation()}>
                            <p className="text-sm font-black text-gray-700">Chọn đơn hàng để ghép</p>
                            {ordersLoading ? (
                              <div className="flex items-center gap-2 py-4 justify-center">
                                <Loader2 className="size-5 text-primary animate-spin" />
                                <span className="text-sm text-gray-500">Đang tải đơn hàng…</span>
                              </div>
                            ) : orders.length === 0 ? (
                              <p className="text-sm text-gray-500 text-center py-4">Không có đơn hàng khả dụng.</p>
                            ) : (
                              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                {orders.map(o => {
                                  const w = orderWeightKg(o);
                                  const checked = selectedOrderIds.includes(o.id);
                                  return (
                                    <label key={o.id}
                                      className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition ${checked ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}>
                                      <input type="checkbox" checked={checked} onChange={() => toggleOrder(o.id)}
                                        className="size-4 rounded border-gray-300 text-primary focus:ring-primary shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900">Đơn #{o.id}</p>
                                        <p className="text-xs text-gray-500 truncate">
                                          {o.items
                                            .map(i => {
                                              const unitLabel = i.itemType === 'MYSTERY_BOX'
                                                ? 'box'
                                                : (i.unit || 'kg');

                                              return `${i.productName} (${i.quantity} ${unitLabel})`;
                                            })
                                            .join(', ')}
                                        </p>
                                      </div>
                                      <span className="text-xs font-bold text-gray-600 shrink-0">{w.toFixed(1)} kg</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}

                            {selectedOrderIds.length > 0 && (
                              <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 space-y-2">
                                {/* Tổng khối lượng + giá */}
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">Đã chọn <span className="font-black text-primary">{selectedOrderIds.length}</span> đơn</span>
                                  <span className="font-black text-primary">{selectedWeight.toFixed(1)} kg</span>
                                </div>
                                {calcPrice(effectiveKg) != null && (
                                  <div className="flex items-center justify-between text-sm rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
                                    <span className="text-emerald-700 font-bold">💰 Phí dự tính</span>
                                    <span className="font-black text-emerald-700">
                                      ~{Math.round(calcPrice(effectiveKg)!).toLocaleString('vi-VN')}đ
                                    </span>
                                  </div>
                                )}
                                {/* Khối lượng yêu cầu — chỉ được tăng, không được giảm */}
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1">
                                    Khối lượng yêu cầu (kg)
                                    <span className="ml-1 font-normal text-gray-400">— tối thiểu {selectedWeight.toFixed(1)} kg</span>
                                  </label>
                                  <input
                                    type="number"
                                    min={selectedWeight}
                                    step="0.1"
                                    value={requestedKg}
                                    onChange={e => {
                                      const val = e.target.value;
                                      // Không cho nhập nhỏ hơn selectedWeight
                                      if (val !== '' && +val < selectedWeight) return;
                                      setRequestedKg(val);
                                    }}
                                    placeholder={selectedWeight.toFixed(1)}
                                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                                  />
                                  <p className="mt-1 text-[11px] text-gray-400">Chỉ có thể tăng thêm, không được nhỏ hơn tổng khối lượng đơn hàng.</p>
                                </div>
                                {trip.availableCapacityKg != null && effectiveKg > trip.availableCapacityKg && (
                                  <p className="text-xs text-red-600 font-bold flex items-center gap-1">
                                    <AlertCircle className="size-3" />
                                    Vượt sức chứa còn lại ({trip.availableCapacityKg} kg)
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Confirm button */}
            {selectedTrip && selectedOrderIds.length > 0 && (
              <button type="button" onClick={() => {
                if (effectiveKg > (selectedTrip.availableCapacityKg ?? Infinity)) {
                  setError(`Khối lượng (${effectiveKg} kg) vượt quá sức chứa còn lại (${selectedTrip.availableCapacityKg} kg).`);
                  return;
                }
                setError(null); setStep('confirm');
              }}
                className="w-full rounded-xl bg-primary py-3.5 text-sm font-black uppercase text-white hover:bg-primary/90 transition flex items-center justify-center gap-2">
                <CheckCircle className="size-4" /> Tiếp tục xác nhận
              </button>
            )}
          </div>
        )}

        {/* ──── STEP 3: Confirm ──── */}
        {step === 'confirm' && selectedTrip && (
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-50">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                  <CheckCircle className="size-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-gray-800">Xác nhận yêu cầu ghép đơn</p>
                  <p className="text-xs text-gray-500">Kiểm tra lại thông tin trước khi gửi.</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="rounded-xl bg-gray-50 border border-gray-100 divide-y divide-gray-100">
                {[
                  ['Chuyến đi', `#${selectedTrip.id} — ${selectedTrip.vehicleNumber}`],
                  ['Kho đích', selectedTrip.warehouseName],
                  ['Chủ chuyến', selectedTrip.ownerName],
                  ['Vị trí lấy hàng', pickupAddress || `${pickupLat}, ${pickupLng}`],
                  ['Số đơn hàng', `${selectedOrderIds.length} đơn`],
                  ['Khối lượng yêu cầu', `${effectiveKg.toFixed(1)} kg`],
                  ...(selectedTrip.routeInfo ? [
                    ['Quãng đường', `${selectedTrip.routeInfo.distanceKm.toFixed(1)} km`],
                    ['Thời gian di chuyển', formatDuration(selectedTrip.routeInfo.durationMin)],
                    ...(selectedTrip.departureTime ? [['Dự kiến đến', addMinutes(selectedTrip.departureTime, selectedTrip.routeInfo.durationMin)]] : []),
                    ...((() => {
                      const base = (selectedTrip as any).basePrice ?? 0;
                      const dRate = (selectedTrip as any).distanceRate ?? 0;
                      const wRate = (selectedTrip as any).weightRate ?? 0;
                      if (base === 0 && dRate === 0 && wRate === 0) return [];
                      const total = base + dRate * selectedTrip.routeInfo.distanceKm + wRate * effectiveKg;
                      return [['Chi phí ước tính', `~${Math.round(total).toLocaleString('vi-VN')}đ`]];
                    })()),
                  ] : []),
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-gray-500">{label}</span>
                    <span className="text-sm font-bold text-gray-900 text-right max-w-[60%]">{value}</span>
                  </div>
                ))}
              </div>

              <button type="button" onClick={handleSubmit} disabled={submitting}
                className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-black uppercase text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2">
                {submitting
                  ? <><Loader2 className="size-4 animate-spin" /> Đang gửi…</>
                  : <><CheckCircle className="size-4" /> Gửi yêu cầu ghép đơn</>}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SendJoinRequest;
