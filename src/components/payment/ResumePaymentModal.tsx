import React, { useState } from 'react';
import { X, Loader2, CreditCard } from 'lucide-react';
import type { ResumePaymentOptionsResponse } from '../../services/payment.service';
import {
  formatVnd,
  resumePayAllBatchPayment,
  resumeSingleBatchOrderPayment,
} from '../../utils/resumePayOSPayment';

interface ResumePaymentModalProps {
  options: ResumePaymentOptionsResponse | null;
  onClose: () => void;
}

const ResumePaymentModal: React.FC<ResumePaymentModalProps> = ({ options, onClose }) => {
  const [loadingAll, setLoadingAll] = useState(false);
  const [loadingOrderId, setLoadingOrderId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!options?.isBatch) return null;

  const unpaidCount = options.unpaidOrders?.length ?? 0;
  const shopCount = unpaidCount || options.unpaidOrders?.length || 0;
  const payAmount = Number(options.payAllOption?.amount ?? 0);
  const mustPayAll = options.hasPlatformVoucher === true;
  const triggerOrderId = options.triggerOrderId ?? options.unpaidOrders?.[0]?.orderId ?? 0;
  const busy = loadingAll || loadingOrderId != null;

  const runPayAll = async () => {
    setLoadingAll(true);
    setError(null);
    try {
      await resumePayAllBatchPayment(options);
    } catch (e: any) {
      setError(e?.message ?? e?.data?.message ?? 'Không thể tiếp tục thanh toán.');
      setLoadingAll(false);
    }
  };

  const runPayOne = async (orderId: number, amount: number) => {
    setLoadingOrderId(orderId);
    setError(null);
    try {
      await resumeSingleBatchOrderPayment(orderId, amount, triggerOrderId);
    } catch (e: any) {
      setError(e?.message ?? e?.data?.message ?? 'Không thể tiếp tục thanh toán.');
      setLoadingOrderId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-black text-gray-900">Thanh toán checkout</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Checkout #{options.batchId} · {shopCount} shop · {unpaidCount} đơn chờ thanh toán
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="size-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {mustPayAll && (
            <p className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
              Voucher sàn chỉ áp khi thanh toán đủ cả {shopCount} shop trong cùng lần checkout.
            </p>
          )}

          {!mustPayAll && unpaidCount > 1 && (
            <p className="text-xs font-bold text-gray-600 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3">
              Bạn có thể thanh toán từng đơn hoặc thanh toán tất cả cùng lúc.
            </p>
          )}

          {options.unpaidOrders?.map((order) => (
            <div
              key={order.orderId}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-800 truncate">
                  Đơn #{order.orderId}
                  {order.shopName ? ` — ${order.shopName}` : ''}
                </p>
                <p className="text-sm font-black text-primary mt-0.5">
                  {formatVnd(Number(order.amount ?? 0))}
                </p>
              </div>
              {!mustPayAll && (
                <button
                  onClick={() => runPayOne(order.orderId, Number(order.amount ?? 0))}
                  disabled={busy}
                  className="shrink-0 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-black rounded-xl disabled:opacity-60 flex items-center gap-1.5"
                >
                  {loadingOrderId === order.orderId
                    ? <Loader2 className="size-3.5 animate-spin" />
                    : <CreditCard className="size-3.5" />}
                  Trả đơn này
                </button>
              )}
            </div>
          ))}

          {(mustPayAll || unpaidCount > 1) && (
            <button
              onClick={runPayAll}
              disabled={busy || !options.payAllOption}
              className="w-full p-4 rounded-2xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 transition-all text-left disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <div className="size-11 bg-amber-500 rounded-xl flex items-center justify-center shrink-0">
                  {loadingAll
                    ? <Loader2 className="size-5 text-white animate-spin" />
                    : <CreditCard className="size-5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-amber-900">
                    Thanh toán tất cả ({unpaidCount} đơn)
                  </p>
                  <p className="text-lg font-black text-amber-700 mt-0.5">
                    {formatVnd(payAmount)}
                  </p>
                </div>
              </div>
            </button>
          )}

          {error && (
            <p className="text-sm font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumePaymentModal;
