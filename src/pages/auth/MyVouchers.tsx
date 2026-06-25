import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Clock, Gift, Loader2, Ticket, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { voucherService, VoucherUserResponse } from '../../services';
import { globalShowAlert } from '../../contexts/PopupContext';

const PAGE_SIZE = 10;

const formatMoney = (value?: number) => `${Number(value ?? 0).toLocaleString('vi-VN')}đ`;

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
};

const MyVouchers: React.FC = () => {
  const navigate = useNavigate();
  const [vouchers, setVouchers] = useState<VoucherUserResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [claiming, setClaiming] = useState(false);

  const fetchVouchers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await voucherService.getMyVoucherWallet(page, PAGE_SIZE);
      const result = response.result;
      setVouchers(result?.content || []);
      setTotalPages(result?.totalPages || 0);
    } catch {
      setError('Không thể tải kho voucher. Vui lòng thử lại.');
      setVouchers([]);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const handleClaimVoucher = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const code = voucherCode.trim().toUpperCase();
    if (!code) {
      globalShowAlert('Vui lòng nhập mã voucher.', 'Thiếu mã voucher', 'warning');
      return;
    }

    try {
      setClaiming(true);
      await voucherService.receiveVoucher(code);
      setVoucherCode('');
      setPage(0);
      await fetchVouchers();
      globalShowAlert('Đã nhận voucher vào kho của bạn.', 'Thành công', 'success');
    } catch (err: any) {
      globalShowAlert(err?.data?.message || 'Không thể nhận voucher. Vui lòng kiểm tra lại mã.', 'Lỗi', 'error');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 pb-24">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="size-4" />
        Quay lại
      </button>

      <div className="mb-8">
        <h1 className="text-4xl font-black text-gray-900 font-display flex items-center gap-3">
          <Ticket className="size-9 text-primary" />
          Kho voucher
        </h1>
        <p className="mt-2 text-sm font-medium text-gray-500">Các voucher bạn đã nhận và có thể dùng khi đặt hàng.</p>
      </div>

      <form
        onSubmit={handleClaimVoucher}
        className="mb-8 rounded-[32px] border border-primary/10 bg-primary/5 p-5 shadow-sm"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <PlusCircle className="size-5 text-primary" />
              <h2 className="text-lg font-black text-gray-900">Nhập mã để nhận voucher</h2>
            </div>
            <p className="mt-1 text-xs font-semibold text-gray-500">
              Nhập mã voucher từ admin hoặc shop để lưu vào kho voucher của bạn.
            </p>
            <input
              value={voucherCode}
              onChange={(event) => setVoucherCode(event.target.value.toUpperCase())}
              placeholder="VD: XUAN2026"
              className="mt-4 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-black uppercase tracking-wider text-gray-800 outline-none transition-all focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
            />
          </div>
          <button
            type="submit"
            disabled={claiming}
            className="h-12 rounded-2xl bg-primary px-6 text-sm font-black text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60 md:min-w-[150px]"
          >
            {claiming ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Đang nhận
              </span>
            ) : (
              'Nhận voucher'
            )}
          </button>
        </div>
      </form>

      {error && <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">{error}</div>}

      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center">
          <Loader2 className="size-10 animate-spin text-primary" />
        </div>
      ) : vouchers.length === 0 ? (
        <div className="rounded-[32px] border border-gray-100 bg-white p-16 text-center shadow-sm">
          <Gift className="mx-auto mb-4 size-14 text-gray-200" />
          <p className="font-black text-gray-700">Bạn chưa có voucher nào.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vouchers.map((item) => {
            const voucher = item.voucherResponse;
            const remaining = Math.max(0, Number(item.quantity ?? 0) - Number(item.quantityUsed ?? 0));
            return (
              <div key={item.voucherUserId} className="rounded-[28px] border border-emerald-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-primary">
                      {voucher?.voucherCode || 'Voucher không còn khả dụng'}
                    </p>
                    <h3 className="mt-1 text-2xl font-black text-gray-900">
                      {voucher ? `Giảm ${voucher.discountValue}%` : 'Không có thông tin voucher'}
                    </h3>
                    <p className="mt-1 text-sm font-bold text-gray-500">
                      Tối đa {formatMoney(Number(voucher?.maxDiscount ?? 0))} · Đơn từ {formatMoney(Number(voucher?.minOrderValue ?? 0))}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-primary/10 px-3 py-2 text-center">
                    <p className="text-[10px] font-black uppercase text-primary">Còn lại</p>
                    <p className="text-lg font-black text-primary">{remaining}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold text-gray-500">
                  <span>Đã dùng {item.quantityUsed ?? 0}/{item.quantity ?? 0}</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" />
                    HSD {formatDate(voucher?.expiryDate)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold disabled:opacity-40"
          >
            Trước
          </button>
          <span className="text-sm font-bold text-gray-500">Trang {page + 1}/{totalPages}</span>
          <button
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
};

export default MyVouchers;
