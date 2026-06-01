import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit3, Trash2, Loader2, CheckCircle, X } from 'lucide-react';
import { globalShowAlert, globalShowConfirm } from '../../contexts/PopupContext';
import { vehicleService, VehicleResponse, VehicleCreateRequest, VehicleUpdateRequest } from '../../services';

const initialFormState = {
  vehicleNumber: '',
  capacityKg: 0,
  type: '',
};

const Vehicles: React.FC<{ onNavigate: (id: string) => void }> = ({ onNavigate }) => {
  const [vehicles, setVehicles] = useState<VehicleResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<VehicleCreateRequest>(initialFormState);
  const [capacityUnit, setCapacityUnit] = useState<'KG' | 'TON'>('KG');

  const fetchVehicles = async () => {
    try {
      setIsLoading(true);
      const response = await vehicleService.getMyVehicles();
      setVehicles(response.result || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load vehicles', err);
      setError('Không thể tải danh sách phương tiện. Vui lòng thử lại.');
      setVehicles([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(initialFormState);
    setCapacityUnit('KG');
  };

  const handleSaveVehicle = async () => {
    const trimmedNumber = form.vehicleNumber.trim();
    const trimmedType = form.type.trim();
    if (!trimmedNumber || !trimmedType || !form.capacityKg) {
      globalShowAlert('Vui lòng điền đầy đủ thông tin phương tiện.', 'Lỗi', 'warning');
      return;
    }

    const capacityKg = capacityUnit === 'TON'
      ? form.capacityKg * 1000
      : form.capacityKg;

    try {
      setIsSaving(true);
      if (editingId) {
        await vehicleService.updateVehicle(editingId, {
          vehicleNumber: trimmedNumber,
          type: trimmedType,
          capacityKg,
        });
        globalShowAlert('Cập nhật phương tiện thành công.', 'Thành công', 'success');
      } else {
        await vehicleService.createVehicle({
          vehicleNumber: trimmedNumber,
          type: trimmedType,
          capacityKg,
        });
        globalShowAlert('Đã thêm phương tiện mới.', 'Thành công', 'success');
      }
      await fetchVehicles();
      resetForm();
    } catch (err: any) {
      globalShowAlert(err?.data?.message || 'Không thể lưu phương tiện. Vui lòng thử lại.', 'Lỗi', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (vehicle: VehicleResponse) => {
    setEditingId(vehicle.id);
    setForm({
      vehicleNumber: vehicle.vehicleNumber,
      capacityKg: vehicle.capacityKg,
      type: vehicle.type,
    });
    setCapacityUnit('KG');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!await globalShowConfirm(`Bạn có chắc muốn xóa phương tiện #${id}?`, 'Xác nhận')) return;
    try {
      setIsDeleting(id);
      await vehicleService.deleteVehicle(id);
      globalShowAlert('Đã xóa phương tiện.', 'Thành công', 'success');
      await fetchVehicles();
      if (editingId === id) resetForm();
    } catch (err: any) {
      globalShowAlert(err?.data?.message || 'Không thể xóa phương tiện.', 'Lỗi', 'error');
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredVehicles = vehicles.filter((vehicle) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return vehicle.vehicleNumber.toLowerCase().includes(query)
      || vehicle.type.toLowerCase().includes(query)
      || String(vehicle.id).includes(query);
  });

  return (
    <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-500 relative">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-black font-display text-gray-900">Quản Lý Phương Tiện</h2>
          <p className="text-gray-400 font-medium text-sm mt-1">Tạo, chỉnh sửa và xóa phương tiện giao hàng của bạn.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="px-6 py-3 bg-primary text-white rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all"
        >
          <Plus className="size-5" /> Thêm phương tiện
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-black text-gray-900">{editingId ? 'Chỉnh sửa phương tiện' : 'Thêm mới phương tiện'}</h3>
              <p className="text-sm text-gray-500 mt-1">Nhập thông tin để quản lý xe vận chuyển của bạn.</p>
            </div>
            {editingId && (
              <button
                onClick={resetForm}
                className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-2"
              >
                <X className="size-4" /> Hủy
              </button>
            )}
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-bold text-gray-800">Biển số xe</span>
              <input
                type="text"
                value={form.vehicleNumber}
                onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
                placeholder="Ví dụ: 29H-12345"
                className="mt-2 w-full rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-gray-800">Loại phương tiện</span>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="mt-2 w-full rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
              >
                <option value="" disabled>Chọn loại phương tiện</option>
                <option value="Xe tải">Xe tải</option>
                <option value="Xe bán tải">Xe bán tải</option>
                <option value="Xe máy">Xe máy</option>
                <option value="Xe ben">Xe ben</option>
                <option value="Xe van">Xe van</option>
                <option value="Xe kéo moóc">Xe kéo moóc</option>
                <option value="Xe container">Xe container</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-bold text-gray-800">Tải trọng</span>
              <div className="mt-2 flex gap-3">
                <input
                  type="number"
                  value={form.capacityKg === 0 ? '' : form.capacityKg}
                  onChange={(e) => setForm({ ...form, capacityKg: Number(e.target.value) })}
                  placeholder="Ví dụ: 0.5"
                  min={0}
                  step={capacityUnit === 'TON' ? 0.01 : 1}
                  className="flex-1 rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                />
                <select
                  value={capacityUnit}
                  onChange={(e) => {
                    const newUnit = e.target.value as 'KG' | 'TON';
                    const currentValue = Number(form.capacityKg) || 0;
                    const convertedValue = newUnit === 'TON'
                      ? currentValue / 1000
                      : currentValue * 1000;
                    setCapacityUnit(newUnit);
                    setForm({ ...form, capacityKg: convertedValue });
                  }}
                  className="rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                >
                  <option value="KG">kg</option>
                  <option value="TON">tấn</option>
                </select>
              </div>
              <p className="mt-2 text-xs text-gray-500">Nếu nhập tấn, hệ thống sẽ tự quy đổi thành kg khi gửi dữ liệu.</p>
            </label>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                onClick={handleSaveVehicle}
                disabled={isSaving}
                className="w-full sm:w-auto px-6 py-3 rounded-3xl bg-primary text-white font-black flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader2 className="size-5 animate-spin" /> : <Plus className="size-5" />} {editingId ? 'Cập nhật' : 'Lưu'}
              </button>
              {editingId && (
                <button
                  onClick={resetForm}
                  className="w-full sm:w-auto px-6 py-3 rounded-3xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-all"
                >
                  Hủy chỉnh sửa
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
            <div>
              <h3 className="text-xl font-black text-gray-900">Danh sách phương tiện</h3>
              <p className="text-sm text-gray-500 mt-1">Hiện có {vehicles.length} phương tiện trong hệ thống.</p>
            </div>
            <div className="flex items-center gap-2 max-w-md w-full md:w-auto">
              <Search className="size-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm biển số, loại hoặc ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-3xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3">
              <Loader2 className="size-10 text-primary animate-spin" />
              <p className="text-sm font-bold uppercase tracking-wider text-gray-400">Đang tải phương tiện...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-xs uppercase tracking-[0.2em] text-gray-400">
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Biển số</th>
                    <th className="px-4 py-3">Loại</th>
                    <th className="px-4 py-3 text-right">Tải trọng</th>
                    <th className="px-4 py-3 text-center">Tình trạng</th>
                    <th className="px-4 py-3 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-16 text-center text-sm text-gray-500">
                        Không tìm thấy phương tiện phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredVehicles.map((vehicle) => (
                      <tr key={vehicle.id} className="bg-gray-50 rounded-3xl overflow-hidden border border-gray-100">
                        <td className="px-4 py-4 align-middle font-bold text-sm text-gray-700">#{vehicle.id}</td>
                        <td className="px-4 py-4 align-middle text-sm text-gray-700">{vehicle.vehicleNumber}</td>
                        <td className="px-4 py-4 align-middle text-sm text-gray-700">{vehicle.type}</td>
                        <td className="px-4 py-4 align-middle text-sm text-gray-700 text-right">{vehicle.capacityKg.toLocaleString('vi-VN')} kg</td>
                        <td className="px-4 py-4 align-middle text-sm text-center">
                          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${vehicle.isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                            <CheckCircle className="size-3" /> {vehicle.isAvailable ? 'Sẵn sàng' : 'Đang dùng'}
                          </span>
                        </td>
                        <td className="px-4 py-4 align-middle text-right flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(vehicle)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all"
                          >
                            <Edit3 className="size-4" /> Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(vehicle.id)}
                            disabled={isDeleting === vehicle.id}
                            className="inline-flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {isDeleting === vehicle.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Xóa
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Vehicles;
