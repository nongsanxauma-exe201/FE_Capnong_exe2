import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, CreditCard, Store, Loader2 } from 'lucide-react';
import type { OrderResponse } from '../../services/order.service';
import {
  batchHasPlatformVoucher,
  getBatchPendingTotal,
  getBatchShopCount,
} from '../../utils/groupOrdersByBatch';

interface BatchCheckoutGroupCardProps {
  batchId: number;
  orders: OrderResponse[];
  formatDate: (dateStr: string) => string;
  onResumePayment: (orderId: number, payMode?: 'batch-all') => void;
  resuming?: boolean;
}

const BatchCheckoutGroupCard: React.FC<BatchCheckoutGroupCardProps> = ({
  batchId,
  orders,
  formatDate,
  onResumePayment,
  resuming,
}) => {
  const shopCount = getBatchShopCount(orders);
  const totalAmount = getBatchPendingTotal(orders);
  const hasPlatformVoucher = batchHasPlatformVoucher(orders);
  const triggerOrderId = orders[0]?.id ?? 0;
  const createdAt = orders.reduce((latest, o) => {
    if (!latest) return o.createdAt;
    return new Date(o.createdAt).getTime() > new Date(latest).getTime() ? o.createdAt : latest;
  }, orders[0]?.createdAt ?? '');

  return (
    <div className="bg-white rounded-[40px] border-2 border-amber-200 shadow-sm overflow-hidden hover:shadow-lg transition-all">
      <div className="px-8 py-5 border-b border-amber-100 flex items-center justify-between bg-amber-50/80">
        <div className="flex items-center gap-4">
          <div className="size-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-700">
            <Clock className="size-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-amber-900">
              Checkout #{batchId} · {shopCount} shop
            </h3>
            <p className="text-xs text-amber-700 font-bold mt-1">
              Chờ thanh toán · {formatDate(createdAt)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-black text-amber-600 uppercase tracking-widest">Tổng thanh toán</p>
          <p className="text-2xl font-black text-amber-800">{totalAmount.toLocaleString('vi-VN')}đ</p>
        </div>
      </div>

      <div className="p-8 space-y-4">
        {hasPlatformVoucher && (
          <p className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
            Voucher sàn chỉ áp dụng khi thanh toán đủ cả {shopCount} shop trong cùng lần checkout.
          </p>
        )}

        <div className="space-y-2">
          {orders.map((order) => {
            const shopName = order.shopOwner?.shopName ?? order.shopOwner?.fullName ?? `Shop #${order.id}`;
            const itemCount = order.items?.length ?? 0;
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
                    {Number(order.totalAmount ?? 0).toLocaleString('vi-VN')}đ
                  </p>
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

        <div className="flex justify-end pt-4 border-t border-gray-50">
          <button
            onClick={() => onResumePayment(triggerOrderId, hasPlatformVoucher ? 'batch-all' : undefined)}
            disabled={resuming}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-2xl transition-all flex items-center gap-2 uppercase tracking-wider disabled:opacity-60"
          >
            {resuming ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
            {hasPlatformVoucher ? 'Thanh toán tất cả' : 'Tiếp tục thanh toán'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchCheckoutGroupCard;
