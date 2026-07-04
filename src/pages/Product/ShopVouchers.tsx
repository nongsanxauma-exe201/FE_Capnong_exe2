import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Clock, Gift, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { voucherService, VoucherResponse } from '../../services';
import { globalShowAlert } from '../../contexts/PopupContext';
import { useAuth } from '../../contexts/AuthContext';

const PAGE_SIZE = 10;

const formatMoney = (value?: number) => `${Number(value ?? 0).toLocaleString('vi-VN')}đ`;

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
};

const ShopVouchers: React.FC = () => {
  const { shopId } = useParams<{ shopId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const shopIdNum = Number(shopId);
  const [vouchers, setVouchers] = useState<VoucherResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [receivingCode, setReceivingCode] = useState<string | null>(null);
  const [canReceiveMap, setCanReceiveMap] = useState<Record<string, boolean>>({});

  const fetchVouchers = useCallback(async () => {
    if (!shopIdNum || Number.isNaN(shopIdNum)) return;
    try {
      setLoading(true);
      const response = await voucherService.getBuyerShopVouchers(shopIdNum, page, PAGE_SIZE);
      const result = response.result;
      const list = (result?.content || [])
        .filter((voucher) => voucher.voucherType === 'SHOP' && Number(voucher.shopId) === Number(shopIdNum));
      setVouchers(list);
      setTotalPages(result?.totalPages || 0);

      if (isAuthenticated && list.length > 0) {
        const statuses = await Promise.all(
          list.map(async (voucher) => {
            try {
              const canReceive = await voucherService.canReceiveVoucher(voucher.voucherCode);
              return [voucher.voucherCode, Boolean(canReceive.result)] as const;
            } catch {
              return [voucher.voucherCode, false] as const;
            }
          })
        );
        setCanReceiveMap(Object.fromEntries(statuses));
      } else {
        setCanReceiveMap({});
      }
    } catch {
      setVouchers([]);
      setTotalPages(0);
      setCanReceiveMap({});
    } finally {
      setLoading(false);
    }
  }, [shopIdNum, page, isAuthenticated]);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const handleReceive = async (voucherCode: string) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      setReceivingCode(voucherCode);
      await voucherService.receiveVoucher(voucherCode);
      setCanReceiveMap((prev) => ({ ...prev, [voucherCode]: false }));
      setVouchers((prev) => prev.map((voucher) => (
        voucher.voucherCode === voucherCode
          ? { ...voucher, claimedCount: (voucher.claimedCount ?? 0) + 1 }
          : voucher
      )));
      globalShowAlert('Đã lưu voucher vào kho của bạn.', 'Thành công', 'success');
    } catch (err: any) {
      globalShowAlert(err?.data?.message || 'Không thể nhận voucher.', 'Lỗi', 'error');
    } finally {
      setReceivingCode(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 pb-24">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="size-4" />
        Quay lại cửa hàng
      </button>

      <div className="mb-8">
        <h1 className="text-4xl font-black text-gray-900 font-display flex items-center gap-3">
          <Gift className="size-9 text-primary" />
          Voucher của shop
        </h1>
        <p className="mt-2 text-sm font-medium text-gray-500">Lưu voucher về kho để dùng khi đặt hàng.</p>
      </div>

      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center">
          <Loader2 className="size-10 animate-spin text-primary" />
        </div>
      ) : vouchers.length === 0 ? (
        <div className="rounded-[32px] border border-gray-100 bg-white p-16 text-center shadow-sm">
          <Gift className="mx-auto mb-4 size-14 text-gray-200" />
          <p className="font-black text-gray-700">Shop chưa có voucher nào.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vouchers.map((voucher) => {
            const canReceive = canReceiveMap[voucher.voucherCode] !== false;
            return (
              <div key={voucher.voucherCode} className="rounded-[28px] border border-dashed border-primary/30 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-primary">{voucher.voucherCode}</p>
                    <h3 className="mt-1 text-2xl font-black text-gray-900">Giảm {voucher.discountValue}%</h3>
                    <p className="mt-1 text-sm font-bold text-gray-500">
                      Tối đa {formatMoney(Number(voucher.maxDiscount))} · Đơn từ {formatMoney(Number(voucher.minOrderValue))}
                    </p>
                  </div>
                  <button
                    disabled={receivingCode === voucher.voucherCode || (isAuthenticated && !canReceive)}
                    onClick={() => handleReceive(voucher.voucherCode)}
                    className="rounded-2xl bg-primary px-5 py-3 text-sm font-black text-white hover:bg-primary-dark disabled:bg-gray-200 disabled:text-gray-500"
                  >
                    {receivingCode === voucher.voucherCode ? 'Đang lưu...' : isAuthenticated && !canReceive ? 'Đã nhận' : 'Nhận'}
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" />
                    HSD {formatDate(voucher.expiryDate)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold disabled:opacity-40">Trước</button>
          <span className="text-sm font-bold text-gray-500">Trang {page + 1}/{totalPages}</span>
          <button disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold disabled:opacity-40">Sau</button>
        </div>
      )}
    </div>
  );
};

export default ShopVouchers;
