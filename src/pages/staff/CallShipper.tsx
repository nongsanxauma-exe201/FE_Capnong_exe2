import React, { useEffect, useState } from 'react';
import { Truck, Phone, CheckCircle, MapPin, Clock, Package, Star, RefreshCw, Loader2, AlertCircle, User, Wifi, WifiOff } from 'lucide-react';
import { orderService, staffService } from '../../services';
import type { OrderResponse, AvailableShipperResponse } from '../../services';

const CallShipper: React.FC = () => {
  const [readyOrders, setReadyOrders] = useState<OrderResponse[]>([]);
  const [shippers, setShippers] = useState<AvailableShipperResponse[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isLoadingShippers, setIsLoadingShippers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // orderId → shipperId đã chọn
  const [selectedShipper, setSelectedShipper] = useState<Record<number, number>>({});
  // orderId → đang gọi API
  const [assigningIds, setAssigningIds] = useState<Set<number>>(new Set());
  // orderId → đã assign thành công
  const [assignedIds, setAssignedIds] = useState<Set<number>>(new Set());

  const fetchData = async () => {
    setIsLoadingOrders(true);
    setIsLoadingShippers(true);
    setError(null);
    try {
      const [ordersRes, shippersRes] = await Promise.all([
        orderService.getOrdersForStaff(0, 50, 'READY'),
        staffService.getAvailableShippers(),
      ]);
      setReadyOrders(ordersRes.result?.content ?? []);
      setShippers(shippersRes.result ?? []);
    } catch (err: any) {
      setError(err?.data?.message || err?.message || 'Không thể tải dữ liệu');
    } finally {
      setIsLoadingOrders(false);
      setIsLoadingShippers(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAssign = async (orderId: number) => {
    const shipperId = selectedShipper[orderId];
    if (!shipperId) return;
    setAssigningIds(prev => new Set(prev).add(orderId));
    try {
      await staffService.assignShipper(orderId, shipperId);
      setAssignedIds(prev => new Set(prev).add(orderId));
      // Xoá khỏi danh sách sau 2s
      setTimeout(() => {
        setReadyOrders(prev => prev.filter(o => o.id !== orderId));
        setAssignedIds(prev => { const s = new Set(prev); s.delete(orderId); return s; });
      }, 2000);
    } catch (err: any) {
      alert(err?.data?.message || 'Không thể assign shipper');
    } finally {
      setAssigningIds(prev => { const s = new Set(prev); s.delete(orderId); return s; });
    }
  };

  const fmtCur = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

  const freeShippers = shippers.filter(s => s.currentOrderId == null);
  const busyShippers = shippers.filter(s => s.currentOrderId != null);

  return (
    <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Gọi Shipper Lấy Hàng</h2>
          <p className="text-sm text-gray-400 font-medium mt-1">
            Phân công shipper cho các đơn đã đóng gói xong (trạng thái READY)
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 border border-gray-100 rounded-2xl text-xs font-black text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="size-4" /> Làm mới
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-6 bg-red-50 border border-red-100 rounded-2xl text-red-600">
          <AlertCircle className="size-5 shrink-0" />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cột trái: Đơn sẵn sàng giao */}
        <div className="flex flex-col gap-6">
          <h4 className="font-black text-gray-600 uppercase tracking-widest text-xs px-2">
            Đơn sẵn sàng giao ({isLoadingOrders ? '...' : readyOrders.length})
          </h4>

          {isLoadingOrders && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-7 text-primary animate-spin" />
            </div>
          )}

          {!isLoadingOrders && readyOrders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 bg-white rounded-[32px] border border-gray-100">
              <Package className="size-10 mb-3 opacity-30" />
              <p className="font-black text-xs uppercase tracking-widest">Không có đơn nào chờ giao</p>
            </div>
          )}

          {readyOrders.map(order => {
            const isAssigned = assignedIds.has(order.id);
            const isAssigning = assigningIds.has(order.id);
            const chosenShipperId = selectedShipper[order.id];
            const productSummary = order.items?.map(i => i.productName || i.mysteryBoxType || 'Sản phẩm').join(', ') || '—';

            return (
              <div
                key={order.id}
                className={`bg-white rounded-[40px] border shadow-sm p-8 transition-all ${isAssigned ? 'border-emerald-200 bg-emerald-50/20' : 'border-gray-100'}`}
              >
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <span className="text-[10px] font-black text-primary bg-primary/5 px-3 py-1 rounded-lg uppercase tracking-widest">
                      #{order.id}
                    </span>
                    <h3 className="text-lg font-black text-gray-900 mt-2 line-clamp-1">{productSummary}</h3>
                    <p className="text-sm text-gray-400 font-bold">
                      Giao cho: {order.recipientName} · {order.shippingAddress}
                    </p>
                  </div>
                  {isAssigned && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl shrink-0">
                      <CheckCircle className="size-3.5 text-emerald-600" />
                      <span className="text-[10px] font-black text-emerald-700 uppercase">Đã giao</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[
                    { icon: Package, label: 'Số mặt hàng', value: `${order.items?.length ?? 0} loại` },
                    { icon: MapPin, label: 'Địa chỉ', value: order.shippingAddress },
                    { icon: Clock, label: 'Phí ship', value: fmtCur(order.shippingFee) },
                  ].map((info, j) => (
                    <div key={j} className="p-4 bg-gray-50 rounded-[16px] border border-gray-100">
                      <info.icon className="size-4 text-gray-400 mb-1" />
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{info.label}</p>
                      <p className="text-xs font-black text-gray-900 mt-0.5 line-clamp-1">{info.value}</p>
                    </div>
                  ))}
                </div>

                {/* Chọn shipper */}
                <div className="mb-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                    Chọn shipper ({freeShippers.length} rảnh)
                  </p>
                  {freeShippers.length === 0 ? (
                    <p className="text-xs text-gray-400 font-bold py-3 text-center">Không có shipper nào online</p>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                      {freeShippers.map(shipper => (
                        <button
                          key={shipper.id}
                          onClick={() => setSelectedShipper(s => ({ ...s, [order.id]: shipper.id }))}
                          disabled={isAssigned}
                          className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${chosenShipperId === shipper.id ? 'bg-primary/5 border-primary/20' : 'border-gray-100 hover:bg-gray-50'}`}
                        >
                          {shipper.logoUrl ? (
                            <img src={shipper.logoUrl} className="size-10 rounded-xl object-cover shrink-0" alt="" />
                          ) : (
                            <div className="size-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                              <User className="size-5 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-gray-900 truncate">{shipper.fullName}</p>
                            <p className="text-[10px] text-gray-400 font-bold truncate">
                              {shipper.phoneNumber}
                              {shipper.vehicleNumber ? ` · ${shipper.vehicleNumber}` : ''}
                            </p>
                          </div>
                          {shipper.ratingAverage != null && (
                            <div className="flex items-center gap-1 text-xs font-black text-amber-500 shrink-0">
                              <Star className="size-3 fill-current" /> {shipper.ratingAverage.toFixed(1)}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleAssign(order.id)}
                  disabled={!chosenShipperId || isAssigned || isAssigning}
                  className="w-full py-4 bg-[#38703d] text-white font-black rounded-2xl text-sm flex items-center justify-center gap-3 shadow-lg shadow-[#38703d]/20 hover:opacity-90 transition-all disabled:opacity-40"
                >
                  {isAssigning
                    ? <Loader2 className="size-4 animate-spin" />
                    : isAssigned
                      ? <CheckCircle className="size-4" />
                      : <Phone className="size-4" />
                  }
                  {isAssigned ? 'Đã phân công' : 'Phân công Shipper'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Cột phải: Danh sách shipper */}
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10 h-fit">
          <div className="flex items-center gap-3 mb-8">
            <Truck className="size-5 text-primary" />
            <h4 className="font-black text-gray-800 uppercase tracking-tight">
              Shipper khu vực ({isLoadingShippers ? '...' : shippers.length})
            </h4>
          </div>

          {isLoadingShippers && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 text-primary animate-spin" />
            </div>
          )}

          {!isLoadingShippers && shippers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <WifiOff className="size-8 mb-2 opacity-30" />
              <p className="text-xs font-black uppercase tracking-widest">Chưa có shipper online</p>
              <p className="text-[10px] text-gray-400 mt-1">Shipper cần mở app và bật GPS</p>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {shippers.map(shipper => {
              const isFree = shipper.currentOrderId == null;
              return (
                <div key={shipper.id} className="flex items-center gap-5 p-6 bg-gray-50 rounded-[24px] border border-gray-100">
                  <div className="relative shrink-0">
                    {shipper.logoUrl ? (
                      <img src={shipper.logoUrl} className="size-12 rounded-2xl object-cover" alt="" />
                    ) : (
                      <div className="size-12 rounded-2xl bg-gray-200 flex items-center justify-center">
                        <User className="size-6 text-gray-400" />
                      </div>
                    )}
                    <div className={`absolute -bottom-1 -right-1 size-3.5 rounded-full border-2 border-white ${isFree ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-gray-900 truncate">{shipper.fullName}</p>
                    <p className="text-[10px] text-gray-400 font-bold truncate">
                      {shipper.phoneNumber}
                      {shipper.vehicleNumber ? ` · ${shipper.vehicleNumber}` : ''}
                    </p>
                  </div>
                  {shipper.ratingAverage != null && (
                    <div className="flex items-center gap-1 text-xs font-black text-amber-500 shrink-0">
                      <Star className="size-3 fill-current" /> {shipper.ratingAverage.toFixed(1)}
                    </div>
                  )}
                  <span className={`px-3 py-1 text-[10px] font-black rounded-lg uppercase tracking-widest shrink-0 ${isFree ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    {isFree ? 'Rảnh' : 'Đang giao'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallShipper;
