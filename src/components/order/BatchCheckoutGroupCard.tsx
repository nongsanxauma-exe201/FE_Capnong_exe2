import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Clock, CreditCard, Store, Loader2, XCircle } from 'lucide-react';
import type { OrderResponse } from '../../services/order.service';
import {
  batchHasPlatformVoucher,
  getBatchCheckoutTotal,
  getBatchGrossSubtotal,
  getBatchOrderPayableMap,
  getBatchPlatformDiscount,
  getBatchShopCount,
} from '../../utils/groupOrdersByBatch';

interface BatchCheckoutGroupCardProps {
  batchId: number;
  orders: OrderResponse[];
  formatDate: (dateStr: string) => string;
  onResumePayment: (orderId: number, payMode?: 'batch-all') => void;
  onCancelBatch?: (orders: OrderResponse[]) => void;
  resuming?: boolean;
  cancelling?: boolean;
  variant?: 'pending' | 'cancelled' | 'paid_cancellable' | 'voucher_cancellable';
}

const BatchCheckoutGroupCard: React.FC<BatchCheckoutGroupCardProps> = ({
  batchId,
  orders,
  formatDate,
  onResumePayment,
  onCancelBatch,
  resuming,
  cancelling,
  variant = 'pending',
}) => {
  const shopCount = getBatchShopCount(orders);
  const checkoutTotal = getBatchCheckoutTotal(orders);
  const grossSubtotal = getBatchGrossSubtotal(orders);
  const platformDiscount = getBatchPlatformDiscount(orders);
  const payableByOrder = useMemo(() => getBatchOrderPayableMap(orders), [orders]);
  const payableSum = useMemo(
    () => orders.reduce((sum, o) => sum + (payableByOrder.get(o.id!) ?? 0), 0),
    [orders, payableByOrder],
  );
  const hasPlatformVoucher = batchHasPlatformVoucher(orders);
  const triggerOrderId = orders[0]?.id ?? 0;
  const isCancelled = variant === 'cancelled';
  const isPaidCancellable = variant === 'paid_cancellable';
  const isVoucherCancellable = variant === 'voucher_cancellable';
  const isPayosBatch = !isVoucherCancellable;
  const shareLabel = isPayosBatch ? 'Phần PayOS' : 'Tiền hàng';
  const batchTotalLabel = isVoucherCancellable
    ? 'Tổng COD'
    : isCancelled || isPaidCancellable || variant === 'pending'
      ? 'Tổng PayOS'
      : 'Tổng thanh toán';
  const createdAt = orders.reduce((latest, o) => {
    if (!latest) return o.createdAt;
    return new Date(o.createdAt).getTime() > new Date(latest).getTime() ? o.createdAt : latest;
  }, orders[0]?.createdAt ?? '');

  return (
    <div className={`bg-white rounded-[40px] border-2 shadow-sm overflow-hidden hover:shadow-lg transition-all ${
      isCancelled ? 'border-red-100' : isPaidCancellable ? 'border-sky-200' : isVoucherCancellable ? 'border-violet-200' : 'border-amber-200'
    }`}>
      <div className={`px-8 py-5 border-b flex items-center justify-between ${
        isCancelled ? 'border-red-50 bg-red-50/60' : isPaidCancellable ? 'border-sky-100 bg-sky-50/80' : isVoucherCancellable ? 'border-violet-100 bg-violet-50/80' : 'border-amber-100 bg-amber-50/80'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`size-12 rounded-2xl flex items-center justify-center ${
            isCancelled ? 'bg-red-100 text-red-600' : isPaidCancellable ? 'bg-sky-100 text-sky-700' : isVoucherCancellable ? 'bg-violet-100 text-violet-700' : 'bg-amber-100 text-amber-700'
          }`}>
            <Clock className="size-6" />
          </div>
          <div>
            <h3 className={`text-lg font-black ${isCancelled ? 'text-red-900' : isPaidCancellable ? 'text-sky-900' : isVoucherCancellable ? 'text-violet-900' : 'text-amber-900'}`}>
              Checkout #{batchId} · {shopCount} shop
            </h3>
            <p className={`text-xs font-bold mt-1 ${isCancelled ? 'text-red-700' : isPaidCancellable ? 'text-sky-700' : isVoucherCancellable ? 'text-violet-700' : 'text-amber-700'}`}>
              {isCancelled
                ? 'Đã hủy thanh toán PayOS'
                : isPaidCancellable
                  ? 'Đã thanh toán PayOS · Chờ shop xác nhận'
                  : isVoucherCancellable
                    ? 'COD · Voucher sàn · Chờ shop xác nhận'
                    : 'Chờ thanh toán'} · {formatDate(createdAt)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-xs font-black uppercase tracking-widest ${
            isCancelled ? 'text-red-500' : isPaidCancellable ? 'text-sky-600' : isVoucherCancellable ? 'text-violet-600' : 'text-amber-600'
          }`}>
            {batchTotalLabel}
          </p>
          <p className={`text-2xl font-black ${isCancelled ? 'text-red-800' : isPaidCancellable ? 'text-sky-800' : isVoucherCancellable ? 'text-violet-800' : 'text-amber-800'}`}>
            {checkoutTotal.toLocaleString('vi-VN')}đ
          </p>
        </div>
      </div>

      <div className="p-8 space-y-4">
        {platformDiscount > 0 && (
          <div className="text-xs font-bold text-gray-700 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 space-y-1">
            <div className="flex justify-between gap-4">
              <span>Tạm tính {shopCount} đơn</span>
              <span>{grossSubtotal.toLocaleString('vi-VN')}đ</span>
            </div>
            <div className="flex justify-between gap-4 text-primary">
              <span>Voucher sàn (checkout)</span>
              <span>-{platformDiscount.toLocaleString('vi-VN')}đ</span>
            </div>
            <div className="flex justify-between gap-4 pt-1 border-t border-gray-200 text-gray-900">
              <span>{batchTotalLabel}</span>
              <span>{checkoutTotal.toLocaleString('vi-VN')}đ</span>
            </div>
          </div>
        )}

        {!isCancelled && !isPaidCancellable && !isVoucherCancellable && hasPlatformVoucher && (
          <p className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
            Voucher sàn chỉ áp dụng khi thanh toán đủ cả {shopCount} shop trong cùng lần checkout.
          </p>
        )}

        {isVoucherCancellable && (
          <p className="text-xs font-bold text-violet-800 bg-violet-50 border border-violet-100 rounded-2xl px-4 py-3">
            COD có voucher sàn — chỉ có thể hủy toàn bộ checkout khi tất cả shop chưa xác nhận.
          </p>
        )}

        {isPaidCancellable && (
          <p className="text-xs font-bold text-sky-800 bg-sky-50 border border-sky-100 rounded-2xl px-4 py-3">
            Checkout PayOS nhiều shop — chỉ có thể hủy toàn bộ khi tất cả shop chưa xác nhận đơn.
          </p>
        )}

        <div className="space-y-2">
          {orders.map((order) => {
            const shopName = order.shopOwner?.shopName ?? order.shopOwner?.fullName ?? `Shop #${order.id}`;
            const itemCount = order.items?.length ?? 0;
            const payable = payableByOrder.get(order.id!) ?? 0;
            return (
              <div
                key={order.id}
                className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                    <Store className="size-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-gray-900 truncate">
                      Đơn #{order.id} — {shopName}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">{itemCount} sản phẩm</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-primary">
                    {payable.toLocaleString('vi-VN')}đ
                  </p>
                  <p className="text-[10px] font-bold text-gray-400">{shareLabel}</p>
                  <Link
                    to={`/my-orders/${order.id}`}
                    className="text-[10px] font-black text-gray-400 uppercase tracking-wider hover:text-primary"
                  >
                    Chi tiết
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between text-xs font-bold text-gray-600 px-1">
          <span>Cộng {shopCount} đơn ({shareLabel.toLowerCase()})</span>
          <span className="text-gray-900">{payableSum.toLocaleString('vi-VN')}đ</span>
        </div>

        <div className={`flex justify-end pt-4 border-t border-gray-50 gap-3 ${isCancelled ? 'hidden' : ''}`}>
          {isPaidCancellable || isVoucherCancellable ? (
            <button
              onClick={() => onCancelBatch?.(orders)}
              disabled={cancelling}
              className="px-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-black text-xs rounded-2xl transition-all flex items-center gap-2 uppercase tracking-wider border border-red-100 disabled:opacity-60"
            >
              {cancelling ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
              Hủy toàn bộ checkout
            </button>
          ) : (
            <button
              onClick={() => onResumePayment(triggerOrderId, hasPlatformVoucher ? 'batch-all' : undefined)}
              disabled={resuming}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-2xl transition-all flex items-center gap-2 uppercase tracking-wider disabled:opacity-60"
            >
              {resuming ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
              {hasPlatformVoucher ? 'Thanh toán tất cả' : 'Tiếp tục thanh toán'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchCheckoutGroupCard;
