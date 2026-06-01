import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, MapPin, CheckCircle, AlertCircle, Navigation } from 'lucide-react';
import { tripService, TripResponse, WarehouseResponse } from '../../services';

const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
    const data = await response.json();
    return data.display_name || 'Địa chỉ không xác định';
  } catch (err) {
    console.error('Reverse geocode failed', err);
    return 'Không xác định địa chỉ';
  }
};

const loadLeafletCss = () => {
  if (document.querySelector('link[href*="leaflet.css"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  link.crossOrigin = '';
  document.head.appendChild(link);
};

const TripJoinRequestSend: React.FC = () => {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);
  const [suggestedTrips, setSuggestedTrips] = useState<TripResponse[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [selectedAddress, setSelectedAddress] = useState('Chưa chọn địa điểm');
  const [loadingWarehouses, setLoadingWarehouses] = useState(true);
  const [loadingSuggested, setLoadingSuggested] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

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
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
    marker.on('dragend', async () => {
      const pos = marker.getLatLng();
      setPickupLat(pos.lat);
      setPickupLng(pos.lng);
      setSelectedAddress(await reverseGeocode(pos.lat, pos.lng));
    });

    leafletMapRef.current = map;
    markerRef.current = marker;
  };

  const updateLocationFromGps = async (lat: number, lng: number) => {
    setPickupLat(lat);
    setPickupLng(lng);
    setSelectedAddress(await reverseGeocode(lat, lng));
    await initMap(lat, lng);
  };

  const requestCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Trình duyệt không hỗ trợ GPS.');
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setLocationLoading(false);
        await updateLocationFromGps(position.coords.latitude, position.coords.longitude);
      },
      (err) => {
        setLocationLoading(false);
        console.error('GPS error', err);
        setError('Không thể lấy vị trí GPS. Vui lòng cho phép quyền truy cập vị trí.');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  useEffect(() => {
    const loadWarehouses = async () => {
      setLoadingWarehouses(true);
      setError(null);
      try {
        const res = await tripService.getWarehouses();
        setWarehouses(res.result || []);
      } catch (err) {
        console.error(err);
        setError('Không thể tải danh sách kho. Vui lòng thử lại.');
      } finally {
        setLoadingWarehouses(false);
      }
    };

    loadWarehouses();
  }, []);

  useEffect(() => {
    const loadSuggestedTrips = async () => {
      if (!selectedWarehouseId || pickupLat == null || pickupLng == null) {
        setSuggestedTrips([]);
        setSelectedTripId(null);
        return;
      }
      setLoadingSuggested(true);
      setError(null);
      try {
        const res = await tripService.getSuggestedTrips(pickupLat, pickupLng, selectedWarehouseId);
        setSuggestedTrips(res.result || []);
        setSelectedTripId(null);
      } catch (err) {
        console.error(err);
        setError('Không thể tải chuyến gợi ý. Vui lòng thử lại.');
      } finally {
        setLoadingSuggested(false);
      }
    };

    loadSuggestedTrips();
  }, [selectedWarehouseId, pickupLat, pickupLng]);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!selectedWarehouseId) {
      setError('Vui lòng chọn kho.');
      return;
    }

    if (pickupLat == null || pickupLng == null) {
      setError('Vui lòng chọn vị trí lấy hàng trên bản đồ hoặc bật GPS.');
      return;
    }

    if (!selectedTripId) {
      setError('Vui lòng chọn một chuyến gợi ý.');
      return;
    }

    setSubmitting(true);
    try {
      await tripService.joinTrip(selectedTripId, {
        pickupLat,
        pickupLng,
        requestedKg: 0,
        orderIds: [],
      });
      setSuccess('Gửi yêu cầu ghép đơn thành công.');
      setTimeout(() => navigate('/farmer/trip-join'), 1500);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Gửi yêu cầu thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/farmer/trip-join')}
            className="inline-flex items-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 text-gray-700 font-bold hover:bg-gray-200 transition"
          >
            <ArrowLeft className="size-4" /> Quay lại
          </button>
          <div>
            <h2 className="text-3xl font-black text-gray-900">Gửi yêu cầu ghép đơn</h2>
            <p className="text-sm text-gray-500 mt-1">Chọn kho và vị trí lấy hàng để tìm chuyến phù hợp.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-3xl border border-red-100 bg-red-50 p-4 text-red-700 flex items-start gap-3">
          <AlertCircle className="size-5" />
          <div>{error}</div>
        </div>
      )}

      {success && (
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-700 flex items-start gap-3">
          <CheckCircle className="size-5" />
          <div>{success}</div>
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <MapPin className="size-5 text-primary" />
            <div>
              <h3 className="text-lg font-black text-gray-900">Chọn kho và vị trí lấy hàng</h3>
              <p className="text-sm text-gray-500">Dùng GPS hoặc kéo marker để chọn vị trí pickup.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-bold text-gray-700 sm:col-span-2">
              Kho đích
              <select
                value={selectedWarehouseId ?? ''}
                onChange={(e) => setSelectedWarehouseId(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-3xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              >
                <option value="">Chọn kho</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} {warehouse.address ? `- ${warehouse.address}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <div className="sm:col-span-2">
              <div className="flex flex-col gap-3 rounded-3xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest text-gray-500">Địa điểm lấy hàng</p>
                    <p className="text-sm text-gray-500">Kéo marker hoặc dùng GPS để chọn vị trí trên bản đồ.</p>
                  </div>
                  <button
                    type="button"
                    onClick={requestCurrentLocation}
                    disabled={locationLoading}
                    className="inline-flex items-center justify-center rounded-3xl bg-primary px-4 py-3 text-sm font-black uppercase text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
                  >
                    {locationLoading ? 'Đang lấy vị trí...' : 'Sử dụng GPS'}
                  </button>
                </div>

                <div className="h-72 overflow-hidden rounded-3xl border border-gray-200 bg-gray-100" ref={mapContainerRef}></div>
                <div className="rounded-3xl border border-gray-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-widest text-gray-400">Địa chỉ</p>
                  <p className="mt-2 text-sm font-black text-gray-900">{selectedAddress}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[32px] border border-gray-100 bg-gray-50 p-5">
            <div className="flex items-center gap-3 mb-4">
              <Navigation className="size-5 text-primary" />
              <div>
                <h4 className="text-base font-black text-gray-900">Chuyến gợi ý</h4>
                <p className="text-sm text-gray-500">Chọn một trong các chuyến được gợi ý theo kho và vị trí pickup.</p>
              </div>
            </div>

            {loadingSuggested ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="size-10 text-primary animate-spin" />
              </div>
            ) : !selectedWarehouseId || pickupLat == null || pickupLng == null ? (
              <div className="rounded-3xl border border-dashed border-gray-200 p-8 text-center text-gray-500">
                Chọn kho và vị trí lấy hàng để xem chuyến gợi ý.
              </div>
            ) : suggestedTrips.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 p-8 text-center text-gray-500">
                Không có chuyến gợi ý phù hợp.
              </div>
            ) : (
              <div className="space-y-3">
                {suggestedTrips.map((trip) => (
                  <button
                    key={trip.id}
                    type="button"
                    onClick={() => setSelectedTripId(trip.id)}
                    className={`w-full rounded-3xl border px-4 py-4 text-left transition ${selectedTripId === trip.id ? 'border-primary bg-primary/10' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-black text-gray-900">Chuyến #{trip.id}</p>
                        <p className="text-sm text-gray-500">Kho: {trip.warehouseName}</p>
                      </div>
                      <span className="text-xs uppercase tracking-widest text-gray-500">{trip.status}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">Lái xe: {trip.ownerName} • {trip.availableCapacityKg?.toLocaleString('vi-VN')} kg trống</p>
                    <p className="text-sm text-gray-600">Khởi hành: {new Date(trip.departureTime).toLocaleString('vi-VN')}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-3xl bg-primary px-5 py-3 text-sm font-black uppercase text-white shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
            >
              {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </button>
            <p className="text-sm text-gray-600">
              {selectedTripId ? `Đã chọn chuyến #${selectedTripId}` : 'Chưa chọn chuyến gợi ý'}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TripJoinRequestSend;
