import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, MapPin, Truck, ClipboardList, AlertCircle,
  CheckSquare, X, ArrowLeft, DollarSign,
} from 'lucide-react';
import { tripService, vehicleService, OrderResponse, VehicleResponse, WarehouseResponse } from '../../services';

// ─── Weight helpers ───────────────────────────────────────────────────────────
const UNIT_KG: Record<string, number> = {
  kg: 1, g: 1 / 1000, chai: 0.5, hộp: 0.3, hũ: 0.3,
  cây: 0.2, bịch: 0.4, túi: 0.4, bó: 0.6,
};
const toKg = (qty: number, unit = 'kg') =>
  Number((qty * (UNIT_KG[unit.trim().toLowerCase()] ?? 1)).toFixed(2));
const orderWeightKg = (o: OrderResponse) =>
  o.items.reduce((s, i) => s + toKg(i.quantity, i.unit || 'kg'), 0);

const ORDER_STATUS_MAP: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  CONFIRMED: 'Đã xác nhận',
  READY_FOR_PICKUP: 'Chờ lấy hàng',
  SHIPPING: 'Đang vận chuyển',
  SHIPPING_TO_WAREHOUSE: 'Đang đến kho',
  ARRIVED_AT_WAREHOUSE: 'Đã đến kho',
  QUALITY_CHECKING: 'Đang kiểm tra chất lượng',
  QUALITY_CHECKED: 'Đã kiểm tra',
  READY: 'Chờ shipper lấy',
  DELIVERED: 'Đã giao hàng',
  CANCELLED: 'Đã hủy',
  PAID: 'Đã thanh toán',
  FAILED: 'Giao hàng thất bại',
};

// ─── Input component ──────────────────────────────────────────────────────────
const Field: React.FC<{
  label: string; hint?: string; children: React.ReactNode; col2?: boolean;
}> = ({ label, hint, children, col2 }) => (
  <label className={`flex flex-col gap-1.5 text-sm font-bold text-gray-700${col2 ? ' sm:col-span-2' : ''}`}>
    <span>{label}{hint && <span className="ml-1 text-xs font-normal text-gray-400">({hint})</span>}</span>
    {children}
  </label>
);

const inputCls = 'w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition';

// ─── Main component ───────────────────────────────────────────────────────────
const CreateTrip: React.FC = () => {
  const navigate = useNavigate();

  const [warehouses, setWarehouses]   = useState<WarehouseResponse[]>([]);
  const [vehicles, setVehicles]       = useState<VehicleResponse[]>([]);
  const [orders, setOrders]           = useState<OrderResponse[]>([]);
  const [loading, setLoading]         = useState(true);
  const [creating, setCreating]       = useState(false);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [error, setError]             = useState<string | null>(null);
  const [success, setSuccess]         = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState('Chưa chọn địa điểm');

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef   = useRef<any>(null);
  const markerRef       = useRef<any>(null);

  const [form, setForm] = useState({
    warehouseId:        '',
    vehicleId:          '',
    startLat:           '',
    startLng:           '',
    departureTime:      '',
    isShareable:        false,
    availableCapacityKg: '',
    // pricing — only when isShareable
    basePrice:          '',
    distanceRate:       '',
    weightRate:         '',
    orderIds:           [] as number[],
  });

  // ── Map helpers ─────────────────────────────────────────────────────────────
  const loadLeafletCss = () => {
    if (document.querySelector('link[href*="leaflet.css"]')) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(l);
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      const d = await r.json();
      setSelectedAddress(d.display_name || 'Địa chỉ không xác định');
    } catch { setSelectedAddress('Không xác định địa chỉ'); }
  };

  const initMap = async (lat: number, lng: number) => {
    if (!mapContainerRef.current) return;
    loadLeafletCss();
    const L = await import('leaflet');
    if (leafletMapRef.current) {
      leafletMapRef.current.setView([lat, lng], 15);
      markerRef.current?.setLatLng([lat, lng]);
      return;
    }
    const map = L.map(mapContainerRef.current, { center: [lat, lng], zoom: 15 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
    marker.on('dragend', () => {
      const p = marker.getLatLng();
      setForm(prev => ({ ...prev, startLat: String(p.lat), startLng: String(p.lng) }));
      reverseGeocode(p.lat, p.lng);
    });
    leafletMapRef.current = map; markerRef.current = marker;
  };

  const requestCurrentLocation = () => {
    if (!navigator.geolocation) { setError('Trình duyệt không hỗ trợ GPS.'); return; }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        setLocationLoading(false);
        const { latitude: lat, longitude: lng } = pos.coords;
        setForm(prev => ({ ...prev, startLat: String(lat), startLng: String(lng) }));
        await reverseGeocode(lat, lng);
        await initMap(lat, lng);
      },
      err => { setLocationLoading(false); console.error(err); setError('Không thể lấy vị trí GPS.'); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  // ── Load data ────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [wRes, vRes, oRes] = await Promise.all([
          tripService.getWarehouses().catch(() => ({ result: [] as WarehouseResponse[] })),
          vehicleService.getMyVehicles().catch(() => ({ result: [] as VehicleResponse[] })),
          tripService.getOrdersForTrip(0, 50).catch(() => ({ result: { content: [] as OrderResponse[] } })),
        ]);
        setWarehouses(wRes.result || []);
        setVehicles(vRes.result || []);
        setOrders(oRes.result?.content || []);
      } catch { setError('Không thể tải dữ liệu. Vui lòng thử lại.'); }
      finally   { setLoading(false); }
    })();
  }, []);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const selectedOrders = useMemo(
    () => orders.filter(o => selectedOrderIds.includes(o.id)), [orders, selectedOrderIds],
  );
  const selectedOrdersWeight = useMemo(
    () => selectedOrders.reduce((s, o) => s + orderWeightKg(o), 0), [selectedOrders],
  );
  const selectedVehicle = useMemo(
    () => vehicles.find(v => String(v.id) === form.vehicleId), [vehicles, form.vehicleId],
  );
  const computedAvailableKg = useMemo(() => {
    if (!selectedVehicle) return 0;
    return Math.max(0, Number((selectedVehicle.capacityKg - selectedOrdersWeight).toFixed(2)));
  }, [selectedVehicle, selectedOrdersWeight]);

  useEffect(() => {
    if (!form.availableCapacityKg || form.availableCapacityKg === '0')
      setForm(prev => ({ ...prev, availableCapacityKg: String(computedAvailableKg) }));
  }, [computedAvailableKg]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const toggleOrder = (id: number) =>
    setSelectedOrderIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleCreateTrip = async () => {
    const missing = !form.warehouseId || !form.vehicleId || !form.departureTime || !form.startLat || !form.startLng;
    const missingPricing = form.isShareable && (!form.basePrice || !form.distanceRate || !form.weightRate);
    if (missing || missingPricing) { setError('Vui lòng điền đầy đủ thông tin chuyến đi.'); return; }
    if (selectedOrderIds.length === 0) { setError('Vui lòng chọn tối thiểu một đơn hàng.'); return; }

    setCreating(true); setError(null);
    try {
      await tripService.createTrip({
        warehouseId:         Number(form.warehouseId),
        vehicleId:           Number(form.vehicleId),
        startLat:            Number(form.startLat),
        startLng:            Number(form.startLng),
        departureTime:       form.departureTime,
        isShareable:         form.isShareable,
        availableCapacityKg: Number(form.availableCapacityKg || computedAvailableKg),
        basePrice:           form.isShareable ? Number(form.basePrice)    : 0,
        distanceRate:        form.isShareable ? Number(form.distanceRate) : 0,
        weightRate:          form.isShareable ? Number(form.weightRate)   : 0,
        orderIds:            selectedOrderIds,
      });
      setSuccess('Tạo chuyến đi thành công.');
      setTimeout(() => navigate('/farmer/trips'), 1500);
    } catch { setError('Không thể tạo chuyến đi. Vui lòng thử lại.'); }
    finally   { setCreating(false); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <Loader2 className="size-10 text-primary animate-spin" />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Đang tải thông tin...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => navigate('/farmer/trips')}
          className="inline-flex items-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 text-gray-700 font-bold hover:bg-gray-200 transition">
          <ArrowLeft className="size-4" /> Quay lại
        </button>
        <div>
          <h2 className="text-3xl font-black text-gray-900">Tạo chuyến đi mới</h2>
          <p className="text-sm text-gray-500 mt-1">Chọn kho, xe và đơn hàng để tạo chuyến vận chuyển.</p>
        </div>
      </div>

      {error   && <div className="rounded-3xl border border-red-100 bg-red-50 p-4 text-red-700 flex items-start gap-3"><AlertCircle className="size-5 shrink-0" />{error}</div>}
      {success && <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-700 flex items-start gap-3"><CheckSquare className="size-5 shrink-0" />{success}</div>}

      <div className="grid gap-8 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm space-y-6">
            {/* Section title */}
            <div className="flex items-center gap-3">
              <Truck className="size-5 text-primary" />
              <h3 className="text-lg font-black text-gray-900">Thông tin chuyến đi</h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Warehouse */}
              <Field label="Kho đích">
                <select value={form.warehouseId} onChange={e => setForm({ ...form, warehouseId: e.target.value })} className={inputCls}>
                  <option value="">Chọn kho</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}{w.address ? ` - ${w.address}` : ''}</option>)}
                </select>
              </Field>

              {/* Vehicle */}
              <Field label="Phương tiện">
                <select value={form.vehicleId} onChange={e => setForm({ ...form, vehicleId: e.target.value })}
                  disabled={vehicles.length === 0} className={`${inputCls} disabled:cursor-not-allowed disabled:bg-gray-100`}>
                  <option value="">{vehicles.length === 0 ? 'Chưa có phương tiện' : 'Chọn phương tiện'}</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicleNumber} — {v.capacityKg.toLocaleString('vi-VN')} kg</option>)}
                </select>
              </Field>

              {vehicles.length === 0 && (
                <div className="sm:col-span-2 flex items-center gap-3">
                  <p className="text-sm text-gray-500">Bạn chưa có phương tiện.</p>
                  <button type="button" onClick={() => navigate('/farmer/vehicles')}
                    className="rounded-2xl bg-primary px-4 py-2 text-sm font-black uppercase text-white hover:bg-primary/90 transition">
                    Tạo phương tiện
                  </button>
                </div>
              )}

              {/* Departure time */}
              <Field label="Thời gian khởi hành">
                <input type="datetime-local" value={form.departureTime}
                  onChange={e => setForm({ ...form, departureTime: e.target.value })} className={inputCls} />
              </Field>

              {/* Shareable toggle */}
              <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.isShareable}
                  onChange={e => setForm({ ...form, isShareable: e.target.checked, basePrice: '', distanceRate: '', weightRate: '' })}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                Chuyến đi có thể chia sẻ
              </label>

              {/* Pricing fields — only when shareable */}
              {form.isShareable && (
                <>
                  <div className="sm:col-span-2">
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="size-4 text-primary" />
                      <p className="text-sm font-black text-gray-700">Cấu hình giá (chuyến chia sẻ)</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                      <Field label="Giá cơ bản (đ)" hint="base">
                        <input type="number" min="0" step="1000" value={form.basePrice}
                          onChange={e => setForm({ ...form, basePrice: e.target.value })}
                          placeholder="VD: 10000" className={inputCls} />
                      </Field>
                      <Field label="Giá theo km (đ/km)" hint="distance">
                        <input type="number" min="0" step="500" value={form.distanceRate}
                          onChange={e => setForm({ ...form, distanceRate: e.target.value })}
                          placeholder="VD: 5000" className={inputCls} />
                      </Field>
                      <Field label="Giá theo kg (đ/kg)" hint="weight">
                        <input type="number" min="0" step="100" value={form.weightRate}
                          onChange={e => setForm({ ...form, weightRate: e.target.value })}
                          placeholder="VD: 500" className={inputCls} />
                      </Field>
                    </div>
                    <p className="mt-2 text-xs text-gray-400">
                      Tổng phí = basePrice + distanceRate × km + weightRate × kg
                    </p>
                  </div>
                </>
              )}

              {/* Map */}
              <div className="sm:col-span-2">
                <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <div>
                      <p className="text-sm font-black text-gray-900">Chọn vị trí xuất phát</p>
                      <p className="text-xs text-gray-500">Kéo marker trên bản đồ hoặc sử dụng GPS.</p>
                    </div>
                    <button type="button" onClick={requestCurrentLocation} disabled={locationLoading}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-black uppercase text-white hover:bg-primary/90 disabled:opacity-60 transition">
                      {locationLoading ? 'Đang lấy...' : 'Sử dụng GPS'}
                    </button>
                  </div>
                  <div className="h-72 bg-gray-100" ref={mapContainerRef} />
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                    <p className="text-[11px] uppercase tracking-widest text-gray-400 font-bold mb-1">Địa chỉ</p>
                    <p className="text-sm font-bold text-gray-800">{selectedAddress}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order summary */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <p className="text-sm font-black uppercase tracking-widest text-gray-500 mb-3">Tóm tắt đơn hàng đã chọn</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                  <p className="text-xs uppercase tracking-widest text-gray-400">Đơn hàng đã chọn</p>
                  <p className="text-xl font-black text-gray-900">{selectedOrderIds.length}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                  <p className="text-xs uppercase tracking-widest text-gray-400">Tổng khối lượng</p>
                  <p className="text-xl font-black text-gray-900">{selectedOrdersWeight.toFixed(2)} kg</p>
                </div>
              </div>
            </div>

            {/* Available capacity */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <p className="text-sm font-black uppercase tracking-widest text-gray-500 mb-1">Sức chứa còn lại</p>
              <p className="text-xs text-gray-400 mb-3">Tự động tính từ xe − đơn hàng, có thể điều chỉnh.</p>
              <Field label="Số kg còn lại (kg)">
                <input type="number" min="0" step="0.1" value={form.availableCapacityKg}
                  onChange={e => setForm({ ...form, availableCapacityKg: e.target.value })}
                  placeholder={String(computedAvailableKg)} className={inputCls} />
              </Field>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" onClick={() => setOrderModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-black uppercase text-white hover:bg-primary/90 transition">
                <ClipboardList className="size-4" /> Chọn đơn hàng
              </button>
              <button type="button" onClick={handleCreateTrip} disabled={creating}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black uppercase text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
                {creating ? 'Đang tạo...' : 'Xác nhận tạo chuyến'}
              </button>
            </div>
          </section>
        </div>

        {/* Warehouse list sidebar */}
        <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <MapPin className="size-5 text-primary" />
            <div>
              <h3 className="text-lg font-black text-gray-900">Danh sách kho</h3>
              <p className="text-sm text-gray-500">Chọn kho làm điểm đến vận chuyển.</p>
            </div>
          </div>
          {warehouses.length === 0 ? (
            <p className="text-sm text-gray-500">Không tìm thấy kho nào.</p>
          ) : (
            <div className="space-y-3">
              {warehouses.map(w => (
                <div key={w.id} className="rounded-2xl border border-gray-200 p-4">
                  <p className="font-black text-gray-900">{w.name}</p>
                  <p className="text-sm text-gray-500">{w.address || 'Địa chỉ chưa rõ'}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Order selection modal */}
      {orderModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="w-full max-w-5xl overflow-hidden rounded-[32px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <h4 className="text-xl font-black text-gray-900">Chọn đơn hàng cho chuyến đi</h4>
                <p className="text-sm text-gray-500">Tính khối lượng theo đơn vị và cộng dồn thành kg.</p>
              </div>
              <button className="rounded-full p-2 text-gray-500 hover:bg-gray-100" onClick={() => setOrderModalOpen(false)}>
                <X className="size-5" />
              </button>
            </div>
            <div className="max-h-[72vh] overflow-y-auto px-6 py-5">
              {orders.length === 0 ? (
                <p className="text-sm text-gray-600">Không có đơn hàng để chọn.</p>
              ) : (
                <div className="space-y-3">
                  {orders.map(order => {
                    const w = orderWeightKg(order);
                    const sel = selectedOrderIds.includes(order.id);
                    return (
                      <button key={order.id} type="button"
                        className={`w-full rounded-2xl border px-5 py-4 text-left transition ${sel ? 'border-primary bg-primary/10' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                        onClick={() => toggleOrder(order.id)}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-black text-gray-900">Đơn #{order.id}</p>
                            <p className="text-sm text-gray-500">{order.shippingAddress}</p>
                          </div>
                          <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                            <span className="rounded-full bg-gray-100 px-3 py-1">{ORDER_STATUS_MAP[order.status] || order.status}</span>
                            <span className="rounded-full bg-gray-100 px-3 py-1">{order.items.length} sản phẩm</span>
                            <span className="rounded-full bg-gray-100 px-3 py-1">{w.toFixed(2)} kg</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 sm:flex-row sm:justify-between sm:items-center">
              <div className="text-sm text-gray-700">
                Đã chọn <span className="font-black text-gray-900">{selectedOrderIds.length}</span> đơn,
                tổng <span className="font-black text-gray-900">{selectedOrdersWeight.toFixed(2)} kg</span>.
              </div>
              <button type="button" onClick={() => { setForm(prev => ({ ...prev, orderIds: selectedOrderIds })); setOrderModalOpen(false); }}
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-black uppercase text-white hover:bg-primary/90 transition">
                Hoàn tất lựa chọn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateTrip;
