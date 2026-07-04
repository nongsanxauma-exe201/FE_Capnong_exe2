import React, { useState } from 'react';
import { X, Loader2, CreditCard, Store } from 'lucide-react';
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
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!options?.isBatch) return null;

  const triggerOrderId = options.triggerOrderId ?? options.unpaidOrders?.[0]?.orderId ?? 0;
  const unpaidCount = options.unpaidOrders?.length ?? 0;

  const runAction = async (key: string, action: () => Promise<void>) => {
    setLoadingKey(key);
    setError(null);
    try {
      await action();
    } catch (e: any) {
      setError(e?.message ?? e?.data?.message ?? 'Không thể tiếp tục thanh toán.');
      setLoadingKey(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-black text-gray-900">Chọn cách thanh toán</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Bạn có {unpaidCount} đơn chưa thanh toán trong cùng lần checkout
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={!!loadingKey}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="size-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          {options.payAllOption && unpaidCount > 1 && (
            <button
              onClick={() => runAction('pay-all', () => resumePayAllBatchPayment(options))}
              disabled={!!loadingKey}
              className="w-full p-4 rounded-2xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 transition-all text-left disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <div className="size-11 bg-amber-500 rounded-xl flex items-center justify-center shrink-0">
                  {loadingKey === 'pay-all'
                    ? <Loader2 className="size-5 text-white animate-spin" />
                    : <CreditCard className="size-5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-amber-900">Thanh toán tất cả ({unpaidCount} đơn)</p>
                  <p className="text-lg font-black text-amber-700 mt-0.5">
                    {formatVnd(Number(options.payAllOption.amount ?? 0))}
                  </p>
                </div>
              </div>
            </button>
          )}

          {options.unpaidOrders?.map((order) => (
            <button
              key={order.orderId}
              onClick={() => runAction(
                `order-${order.orderId}`,
                () => resumeSingleBatchOrderPayment(
                  order.orderId!,
                  Number(order.amount ?? 0),
                  triggerOrderId,
                ),
              )}
              disabled={!!loadingKey}
              className="w-full p-4 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 transition-all text-left disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <div className="size-11 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  {loadingKey === `order-${order.orderId}`
                    ? <Loader2 className="size-5 text-primary animate-spin" />
                    : <Store className="size-5 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-gray-900 truncate">
                    Thanh toán đơn #{order.orderId}
                    {order.shopName ? ` — ${order.shopName}` : ''}
                  </p>
                  <p className="text-base font-black text-primary mt-0.5">
                    {formatVnd(Number(order.amount ?? 0))}
                  </p>
                </div>
              </div>
            </button>
          ))}

          {unpaidCount === 1 && options.payAllOption && (
            <button
              onClick={() => runAction('pay-all', () => resumePayAllBatchPayment(options))}
              disabled={!!loadingKey}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-black rounded-2xl transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loadingKey === 'pay-all'
                ? <Loader2 className="size-4 animate-spin" />
                : <CreditCard className="size-4" />}
              Thanh toán {formatVnd(Number(options.payAllOption.amount ?? 0))}
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
