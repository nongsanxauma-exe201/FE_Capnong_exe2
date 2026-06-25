import React, { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Loader2,
  CheckCircle,
  X,
  Gift,
  Power,
  Clock,
  AlertCircle,
} from 'lucide-react';
import {
  voucherService,
  VoucherResponse,
  VoucherCreateRequest,
  VoucherUpdateRequest,
} from '../../services';
import Pagination, { PageInfo } from '../../components/ui/Pagination';
import { globalShowAlert, globalShowConfirm } from '../../contexts/PopupContext';

const PAGE_SIZE = 10;

const initialFormState: VoucherCreateRequest = {
  discountValue: 0,
  maxDiscount: 0,
  minOrderValue: 0,
  claimLimit: 1,
  usageLimit: 1,
  perUserLimit: 1,
  expiryDate: '',
};

const formatMoney = (value?: number) =>
  (value ?? 0).toLocaleString('vi-VN') + 'đ';

const formatCount = (value?: number | null) =>
  Number(value ?? 0).toLocaleString('vi-VN');

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
};

const toDatetimeLocal = (value?: string) => {
  if (!value) return '';
  return value.slice(0, 16);
};

const toApiDateTime = (value: string) => (value ? `${value}:00` : '');

interface VouchersProps {
  mode?: 'shop' | 'platform';
}

const Vouchers: React.FC<VouchersProps> = ({ mode = 'shop' }) => {
  const isPlatformMode = mode === 'platform';
  const [vouchers, setVouchers] = useState<VoucherResponse[]>([]);
  const [page, setPage] = useState(0);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [activeFilter, setActiveFilter] = useState<'active' | 'inactive'>('active');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [actionCode, setActionCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [form, setForm] = useState<VoucherCreateRequest>(initialFormState);

  const fetchVouchers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = isPlatformMode ? await voucherService.getPlatformVouchers(
        page,
        PAGE_SIZE,
        activeFilter === 'active'
      ) : await voucherService.getShopVouchers(
        page,
        PAGE_SIZE,
        activeFilter === 'active'
      );
      const result = response.result;
      if (result) {
        setVouchers(result.content || []);
        setPageInfo({
          page: result.page,
          size: result.size,
          totalElements: result.totalElements,
          totalPages: result.totalPages,
          first: result.first,
          last: result.last,
        });
      } else {
        setVouchers([]);
        setPageInfo(null);
      }
      setError(null);
    } catch (err) {
      console.error('Failed to load vouchers', err);
      setError('Không thể tải danh sách voucher. Vui lòng thử lại.');
      setVouchers([]);
      setPageInfo(null);
    } finally {
      setIsLoading(false);
    }
  }, [page, activeFilter, isPlatformMode]);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  useEffect(() => {
    setPage(0);
  }, [activeFilter]);

  const closeFormModal = () => {
    setShowFormModal(false);
    setEditingCode(null);
    setForm(initialFormState);
  };

  const openCreateModal = () => {
    setEditingCode(null);
    setForm(initialFormState);
    setShowFormModal(true);
  };

  const validateForm = () => {
    if (form.discountValue <= 0 || form.discountValue > 100) {
      globalShowAlert('Phần trăm giảm giá phải từ 1 đến 100.', 'Lỗi', 'warning');
      return false;
    }
    if (form.maxDiscount <= 0) {
      globalShowAlert('Giảm tối đa phải lớn hơn 0.', 'Lỗi', 'warning');
      return false;
    }
    if (form.minOrderValue < 0) {
      globalShowAlert('Giá trị đơn tối thiểu không hợp lệ.', 'Lỗi', 'warning');
      return false;
    }
    if (!form.claimLimit || form.claimLimit < 1) {
      globalShowAlert('Tổng lượt được nhận phải ít nhất là 1.', 'Lỗi', 'warning');
      return false;
    }
    if (!form.usageLimit || form.usageLimit < 1) {
      globalShowAlert('Số lượt sử dụng phải ít nhất là 1.', 'Lỗi', 'warning');
      return false;
    }
    if (!form.perUserLimit || form.perUserLimit < 1) {
      globalShowAlert('Giới hạn mỗi user phải ít nhất là 1.', 'Lỗi', 'warning');
      return false;
    }
    if (!form.expiryDate) {
      globalShowAlert('Vui lòng chọn ngày hết hạn.', 'Lỗi', 'warning');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const payload = {
      discountValue: form.discountValue,
      maxDiscount: form.maxDiscount,
      minOrderValue: form.minOrderValue,
      claimLimit: form.claimLimit,
      usageLimit: form.usageLimit,
      perUserLimit: form.perUserLimit,
      expiryDate: toApiDateTime(form.expiryDate),
    };

    try {
      setIsSaving(true);
      if (editingCode) {
        await voucherService.update(editingCode, payload as VoucherUpdateRequest);
        globalShowAlert('Cập nhật voucher thành công.', 'Thành công', 'success');
      } else {
        if (isPlatformMode) {
          await voucherService.createPlatform(payload);
        } else {
          await voucherService.create(payload);
        }
        globalShowAlert(isPlatformMode ? 'Đã tạo voucher nền tảng mới.' : 'Đã tạo voucher mới.', 'Thành công', 'success');
      }
      closeFormModal();
      await fetchVouchers();
    } catch (err: any) {
      globalShowAlert(err?.data?.message || 'Không thể lưu voucher. Vui lòng thử lại.', 'Lỗi', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (voucher: VoucherResponse) => {
    setEditingCode(voucher.voucherCode);
    setForm({
      discountValue: Number(voucher.discountValue),
      maxDiscount: Number(voucher.maxDiscount),
      minOrderValue: Number(voucher.minOrderValue),
      claimLimit: voucher.claimLimit,
      usageLimit: voucher.usageLimit,
      perUserLimit: voucher.perUserLimit,
      expiryDate: toDatetimeLocal(voucher.expiryDate),
    });
    setShowFormModal(true);
  };

  const handleDelete = async (voucherCode: string) => {
    if (!await globalShowConfirm(`Bạn có chắc muốn xóa voucher "${voucherCode}"?`, 'Xác nhận')) return;
    try {
      setActionCode(voucherCode);
      await voucherService.delete(voucherCode);
      globalShowAlert('Đã xóa voucher.', 'Thành công', 'success');
      if (editingCode === voucherCode) closeFormModal();
      await fetchVouchers();
    } catch (err: any) {
      globalShowAlert(err?.data?.message || 'Không thể xóa voucher.', 'Lỗi', 'error');
    } finally {
      setActionCode(null);
    }
  };

  const handleActivate = async (voucherCode: string) => {
    if (!await globalShowConfirm(`Kích hoạt lại voucher "${voucherCode}"?`, 'Xác nhận')) return;
    try {
      setActionCode(voucherCode);
      await voucherService.activate(voucherCode);
      globalShowAlert('Voucher đã được kích hoạt.', 'Thành công', 'success');
      await fetchVouchers();
    } catch (err: any) {
      globalShowAlert(err?.data?.message || 'Không thể kích hoạt voucher.', 'Lỗi', 'error');
    } finally {
      setActionCode(null);
    }
  };

  const filteredVouchers = vouchers.filter((voucher) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return voucher.voucherCode.toLowerCase().includes(query)
      || voucher.voucherId.toLowerCase().includes(query);
  });

  return (
    <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-500 relative">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-black font-display text-gray-900">
            {isPlatformMode ? 'Quản Lý Voucher Nền Tảng' : 'Quản Lý Voucher'}
          </h2>
          <p className="text-gray-400 font-medium text-sm mt-1">
            {isPlatformMode
              ? 'Tạo và quản lý mã giảm giá dùng chung trên toàn hệ thống.'
              : 'Tạo và quản lý mã giảm giá cho cửa hàng của bạn.'}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-6 py-3 bg-primary text-white rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all"
        >
          <Plus className="size-5" /> {isPlatformMode ? 'Tạo voucher nền tảng' : 'Tạo voucher'}
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h3 className="text-xl font-black text-gray-900">Danh sách voucher</h3>
            <p className="text-sm text-gray-500 mt-1">
              {pageInfo ? `${pageInfo.totalElements} voucher ${isPlatformMode ? 'nền tảng' : 'trong hệ thống'}` : 'Đang tải...'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="flex rounded-2xl border border-gray-200 bg-gray-50 p-1">
              <button
                type="button"
                onClick={() => setActiveFilter('active')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  activeFilter === 'active'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Đang hoạt động
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('inactive')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  activeFilter === 'inactive'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Đã tắt
              </button>
            </div>
            <div className="flex items-center gap-2 max-w-md w-full md:w-80">
              <Search className="size-5 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Tìm mã voucher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-3xl border border-red-100 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3">
            <Loader2 className="size-10 text-primary animate-spin" />
            <p className="text-sm font-bold uppercase tracking-wider text-gray-400">Đang tải voucher...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-xs uppercase tracking-[0.2em] text-gray-400">
                    <th className="px-4 py-3">Mã</th>
                    <th className="px-4 py-3">Giảm giá</th>
                    <th className="px-4 py-3">Điều kiện</th>
                    <th className="px-4 py-3">Lượt nhận</th>
                    <th className="px-4 py-3">Lượt dùng</th>
                    <th className="px-4 py-3">Mỗi user</th>
                    <th className="px-4 py-3">Hết hạn</th>
                    <th className="px-4 py-3 text-center">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVouchers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-16 text-center text-sm text-gray-500">
                        Không có voucher nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredVouchers.map((voucher) => (
                      <tr
                        key={voucher.voucherCode}
                        className="bg-gray-50 rounded-3xl overflow-hidden border border-gray-100"
                      >
                        <td className="px-4 py-4 align-middle">
                          <p className="font-black text-sm text-primary">{voucher.voucherCode}</p>
                          <p className="text-[10px] text-gray-400 mt-1">ID: {voucher.voucherId}</p>
                        </td>
                        <td className="px-4 py-4 align-middle text-sm text-gray-700">
                          <p className="font-bold">{voucher.discountValue}%</p>
                          <p className="text-xs text-gray-500">Tối đa {formatMoney(Number(voucher.maxDiscount))}</p>
                        </td>
                        <td className="px-4 py-4 align-middle text-sm text-gray-700">
                          Đơn từ {formatMoney(Number(voucher.minOrderValue))}
                        </td>
                        <td className="px-4 py-4 align-middle text-sm text-gray-700">
                          {formatCount(voucher.claimedCount)} / {formatCount(voucher.claimLimit)}
                        </td>
                        <td className="px-4 py-4 align-middle text-sm text-gray-700">
                          {formatCount(voucher.usedCount)} / {formatCount(voucher.usageLimit)}
                        </td>
                        <td className="px-4 py-4 align-middle text-sm text-gray-700">
                          {formatCount(voucher.perUserLimit)} lượt
                        </td>
                        <td className="px-4 py-4 align-middle text-sm text-gray-700">
                          <div className="flex items-center gap-1.5">
                            <Clock className="size-3.5 text-gray-400" />
                            {formatDateTime(voucher.expiryDate)}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-middle text-center">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${
                              voucher.active
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            <CheckCircle className="size-3" />
                            {voucher.active ? 'Hoạt động' : 'Đã tắt'}
                          </span>
                        </td>
                        <td className="px-4 py-4 align-middle text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(voucher)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all"
                            >
                              <Edit3 className="size-4" /> Sửa
                            </button>
                            {!voucher.active && (
                              <button
                                type="button"
                                onClick={() => handleActivate(voucher.voucherCode)}
                                disabled={actionCode === voucher.voucherCode}
                                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-100 transition-all disabled:opacity-60"
                              >
                                {actionCode === voucher.voucherCode ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Power className="size-4" />
                                )}
                                Kích hoạt
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDelete(voucher.voucherCode)}
                              disabled={actionCode === voucher.voucherCode}
                              className="inline-flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {actionCode === voucher.voucherCode ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {pageInfo && (
              <Pagination
                pageInfo={pageInfo}
                onPageChange={setPage}
                className="mt-6"
              />
            )}
          </>
        )}
      </div>

      {showFormModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-[520px] rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4 shrink-0">
              <div>
                <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <Gift className="size-5 text-primary" />
                  {editingCode ? 'Chỉnh sửa voucher' : isPlatformMode ? 'Tạo voucher nền tảng' : 'Tạo voucher mới'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {isPlatformMode
                    ? 'Voucher nền tảng áp dụng cho buyer trên toàn hệ thống.'
                    : 'Thiết lập mức giảm, điều kiện áp dụng và thời hạn sử dụng.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeFormModal}
                className="text-gray-400 hover:text-gray-900 transition-colors shrink-0"
              >
                <X className="size-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <label className="block">
                <span className="text-sm font-bold text-gray-800">Giảm giá (%)</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={form.discountValue || ''}
                  onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                  placeholder="Ví dụ: 10"
                  className="mt-2 w-full rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-gray-800">Giảm tối đa (đ)</span>
                <input
                  type="number"
                  min={0}
                  value={form.maxDiscount || ''}
                  onChange={(e) => setForm({ ...form, maxDiscount: Number(e.target.value) })}
                  placeholder="Ví dụ: 50000"
                  className="mt-2 w-full rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-gray-800">Đơn tối thiểu (đ)</span>
                <input
                  type="number"
                  min={0}
                  value={form.minOrderValue || ''}
                  onChange={(e) => setForm({ ...form, minOrderValue: Number(e.target.value) })}
                  placeholder="Ví dụ: 200000"
                  className="mt-2 w-full rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-gray-800">Tổng lượt được nhận</span>
                <input
                  type="number"
                  min={1}
                  value={form.claimLimit || ''}
                  onChange={(e) => setForm({ ...form, claimLimit: Number(e.target.value) })}
                  placeholder="Ví dụ: 100"
                  className="mt-2 w-full rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-gray-800">Tổng lượt sử dụng</span>
                <input
                  type="number"
                  min={1}
                  value={form.usageLimit || ''}
                  onChange={(e) => setForm({ ...form, usageLimit: Number(e.target.value) })}
                  placeholder="Ví dụ: 100"
                  className="mt-2 w-full rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-gray-800">Mỗi user dùng tối đa</span>
                <input
                  type="number"
                  min={1}
                  value={form.perUserLimit || ''}
                  onChange={(e) => setForm({ ...form, perUserLimit: Number(e.target.value) })}
                  placeholder="Ví dụ: 1"
                  className="mt-2 w-full rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-gray-800">Ngày hết hạn</span>
                <input
                  type="datetime-local"
                  value={form.expiryDate}
                  onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                  className="mt-2 w-full rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </label>
            </div>

            <div className="p-6 border-t border-gray-100 flex flex-col sm:flex-row gap-3 shrink-0">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-6 py-3 rounded-2xl bg-primary text-white font-black flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader2 className="size-5 animate-spin" /> : <Plus className="size-5" />}
                {editingCode ? 'Cập nhật' : 'Tạo voucher'}
              </button>
              <button
                onClick={closeFormModal}
                disabled={isSaving}
                className="flex-1 px-6 py-3 rounded-2xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-all disabled:opacity-60"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vouchers;
