import React, { useEffect, useState } from 'react';
import { Box, CheckCircle, Printer, Tag, PackageCheck, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { orderService } from '../../services';
import type { OrderResponse } from '../../services';

const CHECKLIST_ITEMS = [
  'Hàng đã được phân loại theo đơn',
  'Dán nhãn đơn hàng lên mỗi kiện',
  'Bọc bảo vệ / lót xốp (nếu cần)',
  'Kiểm tra lại số lượng lần cuối',
  'Chụp ảnh thùng hàng đã đóng',
];

const Packing: React.FC = () => {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checklists, setChecklists] = useState<Record<number, Set<number>>>({});
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const [doneIds, setDoneIds] = useState<Set<number>>(new Set());

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await orderService.getOrdersForStaff(0, 50, 'QUALITY_APPROVED');
      setOrders(res.result?.content ?? []);
    } catch (err: any) {
      setError(err?.data?.message || err?.message || 'Không thể tải danh sách đơn');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const toggleCheck = (orderId: number, idx: number) => {
    setChecklists(prev => {
      const current = new Set(prev[orderId] ?? []);
      current.has(idx) ? current.delete(idx) : current.add(idx);
      return { ...prev, [orderId]: current };
    });
  };

  const isAllChecked = (orderId: number) =>
    (checklists[orderId]?.size ?? 0) >= CHECKLIST_ITEMS.length;

  // QUALITY_APPROVED → READY trực tiếp, bỏ PACK
  const handleReady = async (orderId: number) => {
    setProcessingIds(prev => new Set(prev).add(orderId));
    try {
      await orderService.updateOrder(orderId, { status: 'READY' });
      setDoneIds(prev => new Set(prev).add(orderId));
      setTimeout(() => {
        setOrders(prev => prev.filter(o => o.id !== orderId));
        setDoneIds(prev => { const s = new Set(prev); s.delete(orderId); return s; });
      }, 1500);
    } catch (err: any) {
      alert(err?.data?.message || 'Không thể cập nhật trạng thái');
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(orderId); return s; });
    }
  };

  return (
    <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Đóng Gói Đơn Hàng</h2>
          <p className="text-sm text-gray-400 font-medium mt-1">
            Đơn đã qua kiểm duyệt — tick đủ checklist rồi bấm Hoàn tất đóng gói
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-2 px-4 py-2 border border-gray-100 rounded-2xl text-xs font-black text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="size-4" /> Làm mới
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 text-primary animate-spin" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-6 bg-red-50 border border-red-100 rounded-2xl text-red-600">
          <AlertCircle className="size-5 shrink-0" />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      {!isLoading && !error && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Box className="size-12 mb-4 opacity-30" />
          <p className="font-black text-sm uppercase tracking-widest">Không có đơn nào chờ đóng gói</p>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {orders.map(order => {
          const isDone = doneIds.has(order.id);
          const isProcessing = processingIds.has(order.id);
          const allChecked = isAllChecked(order.id);
          const shopName = order.shopOwner?.shopName || order.shopOwner?.fullName || 'Nông trại';
          const productSummary = order.items?.map(i => i.productName || i.mysteryBoxType || 'Sản phẩm').join(', ') || '—';
          const totalQty = order.items?.reduce((s, i) => s + i.quantity, 0) ?? 0;

          return (
            <div
              key={order.id}
              className={`bg-white rounded-[40px] border shadow-sm overflow-hidden transition-all ${isDone ? 'border-emerald-200' : 'border-gray-100'}`}
            >
              <div className="p-10">
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center gap-5">
                    {order.shopOwner?.logoUrl ? (
                      <img src={order.shopOwner.logoUrl} className="size-14 rounded-2xl object-cover border-2 border-white shadow-md" alt="" />
                    ) : (
                      <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Box className="size-7 text-primary" />
                      </div>
                    )}
                    <div>
                      <span className="text-[10px] font-black text-primary bg-primary/5 px-3 py-1 rounded-lg uppercase tracking-widest">
                        #{order.id}
                      </span>
                      <h3 className="text-xl font-black text-gray-900 mt-2 line-clamp-1">{productSummary}</h3>
                      <p className="text-sm text-gray-400 font-bold">
                        {shopName} → {order.recipientName} ({order.shippingAddress})
                      </p>
                    </div>
                  </div>
                  {isDone ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-2xl">
                      <CheckCircle className="size-4 text-emerald-600" />
                      <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">Đã hoàn tất</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-2xl">
                      <div className="size-2 bg-blue-500 rounded-full animate-pulse" />
                      <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Chờ đóng gói</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-4 mb-8">
                  {[
                    { label: 'Tổng số lượng', value: `${totalQty} sản phẩm` },
                    { label: 'Số mặt hàng', value: `${order.items?.length ?? 0} loại` },
                    { label: 'Tổng tiền', value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalAmount) },
                    { label: 'Địa chỉ giao', value: order.shippingAddress },
                  ].map((info, j) => (
                    <div key={j} className="p-5 bg-gray-50 rounded-[20px] border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{info.label}</p>
                      <p className="text-sm font-black text-gray-900 line-clamp-2">{info.value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-3 mb-8">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Checklist đóng gói</p>
                  {CHECKLIST_ITEMS.map((step, j) => (
                    <label
                      key={j}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <input
                        type="checkbox"
                        className="size-4 accent-emerald-600"
                        checked={checklists[order.id]?.has(j) ?? false}
                        onChange={() => toggleCheck(order.id, j)}
                        disabled={isDone}
                      />
                      <span className="text-sm font-bold text-gray-700">{step}</span>
                    </label>
                  ))}
                </div>

                <div className="flex gap-4">
                  <button className="flex items-center gap-3 px-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black text-gray-600 hover:bg-gray-100 transition-colors">
                    <Printer className="size-4" /> In nhãn đơn hàng
                  </button>
                  <button className="flex items-center gap-3 px-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black text-gray-600 hover:bg-gray-100 transition-colors">
                    <Tag className="size-4" /> Dán QR code
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => handleReady(order.id)}
                    disabled={isDone || isProcessing || !allChecked}
                    title={!allChecked ? 'Hoàn thành checklist trước' : ''}
                    className="flex items-center gap-3 px-6 py-3 bg-[#38703d] text-white rounded-2xl text-xs font-black shadow-lg shadow-[#38703d]/20 hover:opacity-90 transition-all disabled:opacity-40"
                  >
                    {isProcessing
                      ? <Loader2 className="size-4 animate-spin" />
                      : isDone
                        ? <CheckCircle className="size-4" />
                        : <PackageCheck className="size-4" />
                    }
                    {isDone ? 'Đã hoàn tất' : 'Hoàn tất đóng gói'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Packing;