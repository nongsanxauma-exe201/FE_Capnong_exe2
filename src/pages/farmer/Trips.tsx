import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MapPin, Plus, Truck } from 'lucide-react';
import { tripService, TripResponse, TripStatus } from '../../services';

type TabType = 'my-trips' | 'trips-joined';

const Trips: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('my-trips');
  const [myTrips, setMyTrips] = useState<TripResponse[]>([]);
  const [joinedTrips, setJoinedTrips] = useState<TripResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<TripStatus | undefined>(undefined);

  const loadTrips = async (tab: TabType, page = 0, status?: TripStatus) => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'my-trips') {
        const response = await tripService.getMyTrips(page, 10, status);
        setMyTrips(response.result?.content || []);
        setTotalPages(response.result?.totalPages || 0);
      } else {
        const response = await tripService.getTripJoined(page, 10, status);
        setJoinedTrips(response.result?.content || []);
        setTotalPages(response.result?.totalPages || 0);
      }
    } catch (err) {
      console.error('Load trips failed', err);
      setError('Không thể tải dữ liệu chuyến đi. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrips(activeTab, currentPage, selectedStatus);
  }, [activeTab, currentPage, selectedStatus]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setCurrentPage(0);
    setSelectedStatus(undefined);
  };

  const handleStatusFilter = (status: TripStatus | undefined) => {
    setSelectedStatus(status);
    setCurrentPage(0);
  };

  const trips = activeTab === 'my-trips' ? myTrips : joinedTrips;

  const tripStatusLabels: Record<TripStatus, string> = {
    CREATED: 'Đã tạo',
    MOVING_TO_PICKUPS: 'Đang đi lấy hàng',
    MOVING_TO_WAREHOUSE: 'Đang về kho',
    ARRIVED_WAREHOUSE: 'Đã đến kho',
    COMPLETED: 'Hoàn thành',
    CANCELLED: 'Đã hủy',
  };

  const statusOptions: Array<{ label: string; value: TripStatus | undefined }> = [
    { label: 'Tất cả', value: undefined },
    { label: 'Đã tạo', value: 'CREATED' },
    { label: 'Đang đi lấy hàng', value: 'MOVING_TO_PICKUPS' },
    { label: 'Đang về kho', value: 'MOVING_TO_WAREHOUSE' },
    { label: 'Đã đến kho', value: 'ARRIVED_WAREHOUSE' },
    { label: 'Hoàn thành', value: 'COMPLETED' },
    { label: 'Đã hủy', value: 'CANCELLED' },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Header with Create Trip Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-black text-gray-900">Quản lý chuyến đi</h2>
          <p className="text-sm text-gray-500 mt-1">Xem và quản lý các chuyến đi của bạn.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-white font-black uppercase tracking-widest shadow-sm hover:bg-primary/90 transition"
            onClick={() => navigate('/farmer/trips/create')}
          >
            <Plus className="size-5" /> Tạo chuyến đi
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-white font-black uppercase tracking-widest shadow-sm hover:bg-primary/90 transition"
            onClick={() => navigate('/farmer/trip-join/send')}
          >
            <Plus className="size-5" /> Gửi đề xuất ghép đơn
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => handleTabChange('my-trips')}
          className={`px-6 py-3 font-bold text-sm transition border-b-2 ${
            activeTab === 'my-trips'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Chuyến đi của mình
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('trips-joined')}
          className={`px-6 py-3 font-bold text-sm transition border-b-2 ${
            activeTab === 'trips-joined'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Chuyến đi đã tham gia
        </button>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {statusOptions.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => handleStatusFilter(option.value)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition ${
              selectedStatus === option.value
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-3xl border border-red-100 bg-red-50 p-4 text-red-700 flex items-start gap-3">
          <div>{error}</div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <Loader2 className="size-10 text-primary animate-spin" />
          <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Đang tải chuyến đi...</p>
        </div>
      ) : (
        <>
          {/* Trips List */}
          {trips.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 p-12 text-center">
              <Truck className="size-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-bold">
                {activeTab === 'my-trips' ? 'Chưa có chuyến đi nào.' : 'Bạn chưa tham gia chuyến đi nào.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {trips.map((trip) => (
                <button
                  key={trip.id}
                  type="button"
                  onClick={() => navigate(`/farmer/trips/${trip.id}`)}
                  className="text-left rounded-3xl border border-gray-200 p-6 bg-white transition hover:border-primary hover:shadow-lg"
                >
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Truck className="size-5 text-primary" />
                      <p className="text-lg font-black text-gray-900">Chuyến #{trip.id}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider ${
                        trip.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : trip.status === 'CANCELLED'
                          ? 'bg-red-100 text-red-700'
                          : trip.status === 'OPEN_FOR_SHARE'
                          ? 'bg-blue-100 text-blue-700'
                          : trip.status === 'READY_TO_MOVE'
                          ? 'bg-sky-100 text-sky-700'
                          : trip.status === 'MOVING_TO_PICKUPS' || trip.status === 'MOVING_TO_WAREHOUSE' || trip.status === 'ARRIVED_WAREHOUSE'
    
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {tripStatusLabels[trip.status as TripStatus] ?? trip.status}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="size-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Kho đích</p>
                        <p className="text-sm font-bold text-gray-900">{trip.warehouseName}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Truck className="size-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Phương tiện</p>
                        <p className="text-sm font-bold text-gray-900">{trip.vehicleNumber}</p>
                      </div>
                    </div>

                    {activeTab === 'my-trips' && (
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500">Chủ sở hữu</p>
                        <p className="text-sm font-bold text-gray-900">{trip.ownerName}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500">Sức chứa</p>
                        <p className="text-sm font-bold text-gray-900">
                          {trip.capacityKg != null ? trip.capacityKg.toLocaleString('vi-VN') : '-'} kg
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Còn trống</p>
                        <p className="text-sm font-bold text-gray-900">
                          {trip.availableCapacityKg != null ? trip.availableCapacityKg.toLocaleString('vi-VN') : '-'} kg
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500">Khởi hành</p>
                      <p className="text-sm font-bold text-gray-900">
                        {trip.departureTime ? new Date(trip.departureTime).toLocaleString('vi-VN') : '-'}
                      </p>
                    </div>

                    {trip.totalEstimatedDistanceKm && (
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500">Khoảng cách ước tính</p>
                        <p className="text-sm font-bold text-gray-900">
                          {trip.totalEstimatedDistanceKm.toFixed(2)} km
                        </p>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className="px-4 py-2 rounded-full bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Trước
              </button>
              <span className="px-4 py-2 text-sm text-gray-700">
                Trang {currentPage + 1} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
                disabled={currentPage >= totalPages - 1}
                className="px-4 py-2 rounded-full bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Trips;
