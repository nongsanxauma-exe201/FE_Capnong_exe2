import React, { useState, useEffect } from 'react';
import { Truck, CheckCircle2, XCircle, User, AlertTriangle, X, Loader2, AlertCircle, Trash2, PackageCheck, PackageX, Gift, Eye, Navigation, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { orderService, OrderResponse, type OrderItemResponse } from '../../services';
import { ImageLightbox } from '../../components/ui';
import Pagination, { PageInfo } from '../../components/ui/Pagination';
import { globalShowAlert, globalShowConfirm } from '../../contexts/PopupContext';

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    SHIPPING_TO_WAREHOUSE: 'Đang giao tới kho', ARRIVED_AT_WAREHOUSE: 'Đã tới kho',
    QUALITY_CHECKING: 'Đang kiểm định', QUALITY_APPROVED: 'Đạt chất lượng',
    QUALITY_CHECKED: 'Đã kiểm tra', QUALITY_REJECTED: 'Không đạt chất lượng',
    PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', SHIPPING: 'Đang giao',
    DELIVERED: 'Đã giao', CANCELLED: 'Đã hủy', FAILED: 'Thất bại', PAID: 'Đã thanh toán',
  };
  return map[status] || status.replace(/_/g, ' ');
};

const PAGE_SIZE = 10;

interface OrdersProps {
  onPrepareOrder?: (orderId: string) => void;
}

const Orders: React.FC<OrdersProps> = ({ onPrepareOrder }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Tất cả');
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Tracking modal
  const [trackingOrderId, setTrackingOrderId] = useState<number | null>(null);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // Order detail modal
  const [orderDetailId, setOrderDetailId] = useState<number | null>(null);

  // Quality review modal
  const [qualityReviewItem, setQualityReviewItem] = useState<OrderItemResponse | null>(null);
  const [qualityImageUrl, setQualityImageUrl] = useState<string | null>(null);
  const [qualityImageIndex, setQualityImageIndex] = useState(0);
  const [qualityCurrentResponseIdx, setQualityCurrentResponseIdx] = useState(0);

  const trackingOrder = trackingOrderId ? orders.find(o => o.id === trackingOrderId) : null;
  const detailOrder = orderDetailId ? orders.find(o => o.id === orderDetailId) : null;

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const res = await orderService.getAllOrdersPaged(page, PAGE_SIZE);
      if (res.result) {
        setOrders(res.result.content.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setPageInfo({
          page: res.result.page,
          size: res.result.size,
          totalElements: res.result.totalElements,
          totalPages: res.result.totalPages,
          first: res.result.first,
          last: res.result.last,
        });
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError('Mất kết nối tải dữ liệu. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [page]);

  const handleOpenCancelModal = (orderId: number) => {
    setCancellingOrderId(orderId);
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingOrderId) return;
    try {
      setIsProcessing(true);
      await orderService.updateOrder(cancellingOrderId, { status: 'CANCELLED' });
      globalShowAlert(`Đã hủy đơn hàng #${cancellingOrderId}`, 'Thành công', 'success');
      setShowCancelModal(false);
      setCancellingOrderId(null);
      fetchOrders();
    } catch (err: any) {
      globalShowAlert(err?.data?.message || 'Có lỗi khi hủy đơn hàng', 'Lỗi', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteOrder = async (orderId: number) => {
    if (!await globalShowConfirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN đơn hàng #${orderId} không?`, 'Xác nhận xóa')) return;
    try {
      setIsProcessing(true);
      await orderService.deleteOrder(orderId);
      globalShowAlert(`Đã xóa vĩnh viễn đơn hàng #${orderId}`, 'Thành công', 'success');
      fetchOrders();
    } catch (err: any) {
      globalShowAlert(err?.data?.message || 'Có lỗi khi xóa đơn hàng', 'Lỗi', 'error');
    } finally {
      setIsProcessing(false);
    }
  };
  // xác nhậnd dơn hàng đang vận chuyển tới kho 
  const hancleDeliveringWarehouse = async (orderId: number) => {
    try {
      setIsProcessing(true);
      await orderService.updateOrder(orderId, { status: 'SHIPPING_TO_WAREHOUSE' });
      globalShowAlert(`Đã cập nhật trạng thái đơn hàng #${orderId}`, 'Thành công', 'success');
      fetchOrders();
    } catch (err: any) {
      globalShowAlert(err?.data?.message || 'Có lỗi khi cập nhật trạng thái  đơn hàng', 'Lỗi', 'error');
    } finally {
      setIsProcessing(false);
    }
  };
  const handleConfirmOrder = (orderId: number) => {
    if (onPrepareOrder) onPrepareOrder(orderId.toString());
  };

  const tabs = [
    { label: 'Tất cả', statuses: [] },

    // Chờ nông dân xác nhận
    { label: 'Chờ xác nhận', statuses: ['PENDING', 'PAID'] },

    // Nông dân chuẩn bị hàng
    { label: 'Đang chuẩn bị', statuses: ['CONFIRMED'] },

    // Nông dân giao tới kho
    { label: 'Đang giao tới kho', statuses: ['SHIPPING_TO_WAREHOUSE'] },

    // Kho đã nhận hàng
    { label: 'Đã tới kho', statuses: ['ARRIVED_AT_WAREHOUSE'] },

    // Đang kiểm tra chất lượng
    { label: 'Đang kiểm định', statuses: ['QUALITY_CHECKING'] },

    // Đã kiểm tra chất lượng
    { label: 'Đã kiểm tra', statuses: ['QUALITY_CHECKED'] },

    // Đạt chuẩn chất lượng
    { label: 'Đạt chất lượng', statuses: ['QUALITY_APPROVED'] },

    // Không đạt chất lượng
    { label: 'Không đạt chất lượng', statuses: ['QUALITY_REJECTED'] },

    // Đang giao cho khách
    { label: 'Đang giao', statuses: ['SHIPPING'] },

    // Giao thành công
    { label: 'Đã giao', statuses: ['DELIVERED'] },

    // Đơn bị hủy
    { label: 'Đã hủy', statuses: ['CANCELLED'] },

    // Giao thất bại
    { label: 'Thất bại', statuses: ['FAILED'] },
  ];

  const getFilteredOrders = () => {
    const activeTabDef = tabs.find(t => t.label === activeTab);
    if (!activeTabDef || activeTabDef.statuses.length === 0) return orders;
    return orders.filter(o => activeTabDef.statuses.includes(o.status));
  };

  const filteredOrders = getFilteredOrders();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4 w-full">
        <Loader2 className="size-10 text-primary animate-spin" />
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Đang tải danh sách đơn hàng...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-500 relative">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black font-display text-gray-900">Quản Lý Đơn Hàng</h2>
          <p className="text-gray-400 font-medium text-sm mt-1">Theo dõi và xử lý các đơn hàng nông sản của bạn.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <input type="text" placeholder="Tìm mã đơn, khách hàng..." className="pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-full text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all w-64 shadow-sm" />
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">search</span>
          </div>
          <button className="size-11 bg-white border border-gray-100 rounded-full flex items-center justify-center text-gray-400 relative shadow-sm hover:text-primary transition-colors">
            <span className="material-symbols-outlined fill-1">notifications</span>
            <span className="absolute top-2 right-2 size-2 bg-red-500 border-2 border-white rounded-full"></span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-6 rounded-3xl flex items-center gap-4 text-red-600 font-bold">
          <AlertCircle className="size-6" /> {error}
        </div>
      )}

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        {/* Tabs */}
        <div id="tour-orders-tabs" className="px-10 py-2 border-b border-gray-50 flex items-center gap-8 overflow-x-auto custom-scrollbar">
          {tabs.map((tab) => {
            const count = tab.statuses.length === 0
              ? orders.length
              : orders.filter(o => tab.statuses.includes(o.status)).length;
            return (
              <button key={tab.label} onClick={() => setActiveTab(tab.label)}
                className={`py-5 text-xs font-black whitespace-nowrap transition-all border-b-2 ${activeTab === tab.label ? 'text-primary border-primary' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
                {tab.label} ({count})
              </button>
            );
          })}
        </div>

        <div id="tour-orders-list" className="p-8 space-y-6">
          {filteredOrders.length === 0 ? (
            <div className="py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
              Không tìm thấy đơn hàng nào.
            </div>
          ) : filteredOrders.map(order => {
            const isPending = order.status === 'PENDING';
            const isPaid = order.status === 'PAID';
            const isConfirmed = order.status === 'CONFIRMED';
            const isShippingToWarehouse = order.status === 'SHIPPING_TO_WAREHOUSE';
            const isArrivedAtWarehouse = order.status === 'ARRIVED_AT_WAREHOUSE';
            const isShipping = order.status === 'SHIPPING';
            const isDelivered = order.status === 'DELIVERED';
            const isCancelled = order.status === 'CANCELLED';
            const isFailed = order.status === 'FAILED';
            const isQualityChecking = order.status === 'QUALITY_CHECKING';
            const isQualityChecked = order.status === 'QUALITY_CHECKED';
            const isQualityApproved = order.status === 'QUALITY_APPROVED';
            const isQualityRejected = order.status === 'QUALITY_REJECTED';
            const needsFarmerConfirm = isPending || isPaid;

            return (
              <div key={order.id} id={filteredOrders.indexOf(order) === 0 ? 'tour-orders-first-card' : undefined} className={`bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden group hover:border-primary/20 transition-all ${isDelivered || isCancelled || isFailed ? 'opacity-80' : ''}`}>
                {/* Order header */}
                <div className="px-8 py-5 bg-gray-50/50 border-b border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-sm font-black text-primary">#ORD-{order.id}</span>
                    <span className="text-[11px] text-gray-400 font-bold">Ngày đặt: {new Date(order.createdAt).toLocaleString('vi-VN')}</span>
                    {isPending && <span className="px-2 py-0.5 bg-yellow-50 text-yellow-600 text-[10px] font-black uppercase rounded-md">Chờ xác nhận</span>}
                    {isPaid && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black uppercase rounded-md">✅ Đã thanh toán QR</span>}
                    {isConfirmed && <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-black uppercase rounded-md">🔄 Đang chuẩn bị</span>}
                    {isShipping && <span className="px-2 py-0.5 bg-blue-50 text-blue-500 text-[10px] font-black uppercase rounded-md">🚚 Đang giao</span>}
                    {isDelivered && <span className="px-2 py-0.5 bg-green-50 text-emerald-600 text-[10px] font-black uppercase rounded-md">✅ Đã giao</span>}
                    {isCancelled && <span className="px-2 py-0.5 bg-red-50 text-red-500 text-[10px] font-black uppercase rounded-md">Đã hủy</span>}
                    {isFailed && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black uppercase rounded-md">⚠️ Giao thất bại</span>}
                    {isShippingToWarehouse && (
                      <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-[10px] font-black uppercase rounded-md">
                        🚚 Đang giao tới kho
                      </span>
                    )}

                    {isArrivedAtWarehouse && (
                      <span className="px-2 py-0.5 bg-cyan-50 text-cyan-700 text-[10px] font-black uppercase rounded-md">
                        📦 Đã tới kho
                      </span>
                    )}

                    {isQualityChecking && (
                      <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 text-[10px] font-black uppercase rounded-md">
                        🔍 Đang kiểm định
                      </span>
                    )}

                    {isQualityChecked && (
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase rounded-md">
                        ✅ Đã kiểm tra
                      </span>
                    )}

                    {isQualityApproved && (
                      <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-black uppercase rounded-md">
                        🌱 Đạt chất lượng
                      </span>
                    )}

                    {isQualityRejected && (
                      <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-black uppercase rounded-md">
                        ❌ Không đạt chất lượng
                      </span>
                    )}
                    {order.paymentMethod && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold uppercase rounded-md">{order.paymentMethod}</span>}
                  </div>
                  <span className="text-base font-black text-gray-900">{(order.totalAmount || 0).toLocaleString('vi-VN')}đ</span>
                </div>

                <div className="p-8 flex flex-col md:flex-row gap-8">
                  {/* Left: customer + items */}
                  <div className="flex-1 flex flex-col gap-6">
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400">
                        <User className="size-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-gray-900">{order.recipientName}</h4>
                        <p className="text-[11px] text-gray-400 font-bold">{order.recipientPhone} • {order.shippingAddress}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Chi tiết sản phẩm</p>
                      <div className="flex flex-wrap gap-3">
                        {order.items && order.items.map((item: any, idx: number) => {
                          const isMysteryBox = item.itemType === 'MYSTERY_BOX';
                          // ✅ Dùng imageUrl từ backend, fallback nếu null
                          const fallback = isMysteryBox
                            ? `https://picsum.photos/seed/box${item.mysteryBoxId}/40/40`
                            : `https://picsum.photos/seed/product${item.productId}/40/40`;

                          return (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                              <div className="relative flex-shrink-0">
                                <img
                                  src={item.imageUrl || fallback}
                                  alt={item.productName}
                                  className="size-10 rounded-xl object-cover bg-white"
                                  onError={(e) => { e.currentTarget.src = fallback; }}
                                />
                                {/* Badge túi mù */}
                                {isMysteryBox && (
                                  <div className="absolute -top-1 -right-1 size-4 bg-primary rounded-full flex items-center justify-center">
                                    <Gift className="size-2.5 text-white" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-gray-800 line-clamp-1">{item.productName}</p>
                                <p className="text-[10px] text-gray-400 font-bold">
                                  {item.quantity} x {(item.unitPrice || 0).toLocaleString('vi-VN')}đ
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {order.note && (
                        <div className="mt-3 p-3 bg-yellow-50 text-yellow-800 text-xs rounded-xl font-medium border border-yellow-100">
                          <span className="font-bold">Ghi chú:</span> {order.note}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: action panel */}
                  <div id={filteredOrders.indexOf(order) === 0 ? 'tour-orders-action-panel' : undefined} className="w-full md:w-80 flex flex-col gap-3 justify-center">
                    {needsFarmerConfirm && (
                      <>
                        {isPaid && (
                          <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 text-center">
                            <p className="text-xs font-black text-blue-700">💳 Khách đã thanh toán QR</p>
                            <p className="text-[10px] text-blue-500 font-bold mt-0.5">Hãy xác nhận và bắt đầu chuẩn bị hàng</p>
                          </div>
                        )}
                        <button disabled={isProcessing} onClick={() => handleConfirmOrder(order.id)}
                          className="w-full py-4 bg-primary text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all transform active:scale-95 disabled:opacity-50">
                          <CheckCircle2 className="size-5" /> Chuẩn bị hàng
                        </button>
                        <div id={filteredOrders.indexOf(order) === 0 ? 'tour-orders-contact-btns' : undefined} className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => navigate(`/farmer/messages?userId=${order.buyerId}&userName=${order.recipientName}`)}
                            className="py-3 border border-gray-100 text-gray-600 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-all font-display uppercase tracking-tight"
                          >
                            <Truck className="size-4" /> Liên hệ KH
                          </button>
                          <button disabled={isProcessing} onClick={() => handleOpenCancelModal(order.id)}
                            className="py-3 border border-red-50 text-red-500 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 hover:bg-red-50 transition-all disabled:opacity-50">
                            <XCircle className="size-4" /> Hủy đơn
                          </button>
                        </div>
                      </>
                    )}

                    {isConfirmed && (
                      <button disabled={isProcessing} onClick={() => hancleDeliveringWarehouse(order.id)}
                        className="w-full py-4 bg-primary text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all transform active:scale-95 disabled:opacity-50">
                        <CheckCircle2 className="size-5" />Đơn hàng đang giao tới kho
                      </button>
                    )}

                    {isShipping && (
                      <div className="p-5 bg-blue-50 rounded-3xl border border-blue-100 text-center">
                        <Truck className="size-8 text-blue-500 mx-auto mb-3" />
                        <p className="text-sm font-black text-blue-700">Đơn hàng đang giao</p>
                        <p className="text-[11px] text-blue-500 font-bold mt-1">Shipper đang trên đường đến khách hàng</p>
                        <button
                          onClick={() => navigate(`/farmer/tracking/${order.id}`)}
                          className="mt-4 w-full py-3 bg-blue-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
                        >
                          <Eye className="size-4" /> Theo dõi đơn hàng
                        </button>
                      </div>
                    )}

                    {isDelivered && (
                      <div className="p-6 bg-green-50/50 rounded-[32px] border border-primary/10 text-center w-full">
                        <CheckCircle2 className="size-8 text-primary mx-auto mb-3" />
                        <p className="text-sm font-black text-primary">Giao hàng thành công</p>
                      </div>
                    )}

                    {isFailed && (
                      <div className="flex flex-col gap-3 h-full justify-center">
                        <div className="p-5 bg-red-50 rounded-3xl border border-red-100 text-center w-full">
                          <PackageX className="size-8 text-red-500 mx-auto mb-3" />
                          <p className="text-sm font-black text-red-700">Giao hàng thất bại</p>
                          <p className="text-[11px] text-red-500 font-bold mt-1">Khách không nhận hàng hoặc shipper giao lỗi</p>
                        </div>

                      </div>
                    )}

                    {isCancelled && (
                      <div className="flex flex-col gap-3 h-full justify-center">
                        <div className="p-4 bg-red-50/50 rounded-2xl border border-red-100 text-center w-full">
                          <XCircle className="size-6 text-red-500 mx-auto mb-2" />
                          <p className="text-xs font-black text-red-600">Đơn hàng đã hủy</p>
                        </div>

                      </div>
                    )}
                    {isShippingToWarehouse && (
                      <div className="p-5 bg-orange-50 rounded-3xl border border-orange-100 text-center">
                        <Truck className="size-8 text-orange-500 mx-auto mb-3" />
                        <p className="text-sm font-black text-orange-700">Đang vận chuyển tới kho</p>
                        <p className="text-[11px] text-orange-500 font-bold mt-1">Hàng đang được chuyển tới kho kiểm định</p>
                      </div>
                    )}

                    {isArrivedAtWarehouse && (
                      <div className="p-5 bg-cyan-50 rounded-3xl border border-cyan-100 text-center">
                        <PackageCheck className="size-8 text-cyan-600 mx-auto mb-3" />
                        <p className="text-sm font-black text-cyan-700">Kho đã nhận hàng</p>
                      </div>
                    )}

                    {isQualityChecking && (
                      <div className="p-5 bg-yellow-50 rounded-3xl border border-yellow-100 text-center">
                        <Loader2 className="size-8 text-yellow-600 mx-auto mb-3 animate-spin" />
                        <p className="text-sm font-black text-yellow-700">Đang kiểm định chất lượng</p>
                      </div>
                    )}

                    {isQualityApproved && (
                      <div className="p-5 bg-green-50 rounded-3xl border border-green-100 text-center">
                        <CheckCircle2 className="size-8 text-green-600 mx-auto mb-3" />
                        <p className="text-sm font-black text-green-700">Sản phẩm đạt chất lượng</p>
                      </div>
                    )}

                    {isQualityRejected && (
                      <div className="p-5 bg-red-50 rounded-3xl border border-red-100 text-center">
                        <XCircle className="size-8 text-red-600 mx-auto mb-3" />
                        <p className="text-sm font-black text-red-700">Không đạt chất lượng</p>
                      </div>
                    )}

                    {/* Tracking button */}
                    {order.trackings && order.trackings.length > 0 && (
                      <button onClick={() => setTrackingOrderId(order.id)}
                        className="w-full py-3 bg-primary/10 text-primary font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all shadow-sm shadow-primary/10">
                        <Navigation className="size-4" /> Xem vận đơn
                      </button>
                    )}

                    {/* Order detail + quality per item */}
                    <button onClick={() => setOrderDetailId(order.id)}
                      className="w-full py-3 border border-gray-100 text-gray-600 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-all">
                      <Eye className="size-4" /> Xem thông tin đơn hàng
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {pageInfo && <Pagination pageInfo={pageInfo} onPageChange={setPage} className="mt-4" />}

      {/* ── MODAL: THÔNG TIN ĐƠN HÀNG (per-item quality check) ── */}
      {detailOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-[580px] rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                    <Eye className="size-5 text-primary" /> Thông tin đơn hàng
                  </h3>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">#ORD-{detailOrder.id} · {getStatusLabel(detailOrder.status)}</p>
                </div>
                <button onClick={() => setOrderDetailId(null)} className="size-9 rounded-2xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50">
                  <X className="size-4" />
                </button>
              </div>

              {/* Customer info */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-5">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Khách hàng</p>
                <p className="text-sm font-black text-gray-900">{detailOrder.recipientName}</p>
                <p className="text-xs text-gray-500 font-medium mt-1">{detailOrder.recipientPhone} · {detailOrder.shippingAddress}</p>
              </div>

              {/* Items with quality check buttons */}
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Sản phẩm ({detailOrder.items?.length || 0})</p>
              <div className="flex flex-col gap-3 mb-5">
                {detailOrder.items?.map((item, idx) => {
                  const hasQuality = Boolean(item.qualityResult);
                  const fallback = item.itemType === 'MYSTERY_BOX'
                    ? `https://picsum.photos/seed/box${item.mysteryBoxId}/40/40`
                    : `https://picsum.photos/seed/product${item.productId}/40/40`;
                  return (
                    <div key={idx} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={item.imageUrl || fallback} alt="" className="size-10 rounded-xl object-cover shrink-0" onError={(e) => { e.currentTarget.src = fallback; }} />
                        <div className="min-w-0">
                          <p className="text-sm font-black text-gray-800 truncate">{item.productName || item.mysteryBoxType || 'Sản phẩm'}</p>
                          <p className="text-[11px] text-gray-400 font-medium mt-0.5">{item.quantity} x {(item.unitPrice || 0).toLocaleString('vi-VN')}đ</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {hasQuality && (
                          <button type="button" onClick={() => setQualityReviewItem(item)}
                            className="text-[10px] font-black text-primary border border-primary rounded-full px-3 py-2 hover:bg-primary/10 transition-all">
                            Xem kiểm duyệt
                          </button>
                        )}
                        <span className="text-sm font-black text-primary">{((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString('vi-VN')}đ</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="p-4 bg-green-50 rounded-2xl border border-green-100 mb-4">
                <div className="flex justify-between text-xs font-bold text-gray-500 mb-1"><span>PHÍ VẬN CHUYỂN:</span><span>{(detailOrder.shippingFee || 0).toLocaleString('vi-VN')}đ</span></div>
                <div className="flex justify-between text-sm font-black text-primary border-t border-green-200 pt-2"><span>TỔNG CỘNG:</span><span>{(detailOrder.totalAmount || 0).toLocaleString('vi-VN')}đ</span></div>
              </div>

              {detailOrder.note && (
                <div className="p-3 bg-yellow-50 text-yellow-800 text-xs rounded-xl font-medium border border-yellow-100 mb-4">
                  <span className="font-bold">Ghi chú:</span> {detailOrder.note}
                </div>
              )}

              <button onClick={() => setOrderDetailId(null)} className="w-full py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black text-gray-500 hover:bg-gray-100 transition-all">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-[440px] rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative">
            <div className="p-8 flex flex-col items-center text-center">
              <div className="size-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                <div className="size-14 bg-red-100 rounded-full flex items-center justify-center text-red-500">
                  <AlertTriangle className="size-8" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3 font-display">Xác nhận hủy đơn hàng</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed px-4">
                Bạn có chắc chắn muốn hủy đơn hàng <span className="text-primary font-black">#{cancellingOrderId}</span>? Hành động này không thể hoàn tác.
              </p>
              <div className="w-full flex flex-col gap-3 mt-10">
                <button disabled={isProcessing} onClick={handleConfirmCancel}
                  className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl transition-all shadow-lg shadow-red-500/20 disabled:opacity-50">
                  XÁC NHẬN HỦY ĐƠN
                </button>
                <button disabled={isProcessing} onClick={() => setShowCancelModal(false)}
                  className="w-full py-4 bg-gray-50 hover:bg-gray-100 text-gray-500 font-bold rounded-2xl transition-all disabled:opacity-50">
                  Quay lại
                </button>
              </div>
            </div>
            <button disabled={isProcessing} onClick={() => setShowCancelModal(false)}
              className="absolute top-6 right-6 text-gray-300 hover:text-gray-900 transition-colors disabled:opacity-50">
              <X className="size-6" />
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: XEM VẬN ĐƠN / TRACKING ── */}
      {trackingOrder && (
        <>
          <div className="fixed inset-0 z-[100] overflow-y-auto px-4 py-8 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="mx-auto bg-white w-full max-w-[620px] rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh]">
              <div className="p-8 overflow-y-auto max-h-[90vh]">
                <div className="flex items-center justify-between mb-6 gap-4">
                  <div>
                    <h3 className="text-xl font-black text-gray-900">Theo Dõi Hành Trình</h3>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">#{trackingOrder.id} · {getStatusLabel(trackingOrder.status)}</p>
                  </div>
                  <button onClick={() => setTrackingOrderId(null)} className="size-9 rounded-2xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50">
                    <X className="size-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-5 mb-6">
                  <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-black text-gray-400 mb-1">Trạng thái</p>
                        <p className="text-sm font-black text-gray-900">{getStatusLabel(trackingOrder.status)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-widest font-black text-gray-400 mb-1">Khách hàng</p>
                        <p className="text-sm font-black text-gray-900">{trackingOrder.recipientName}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  {(!trackingOrder.trackings || trackingOrder.trackings.length === 0) ? (
                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 text-center text-sm text-gray-500">
                      Hiện chưa có thông tin hành trình.
                    </div>
                  ) : (
                    trackingOrder.trackings
                      .slice()
                      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                      .map((tracking, index) => (
                        <div key={tracking.trackingId} className="rounded-3xl border border-gray-100 p-5 shadow-sm bg-white">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Bước {index + 1}</p>
                              <p className="text-sm font-black text-gray-900">{getStatusLabel(tracking.status)}</p>
                              <p className="text-[11px] text-gray-400 mt-1">{new Date(tracking.createdAt).toLocaleString('vi-VN')}</p>
                            </div>
                          </div>
                          {tracking.images && tracking.images.length > 0 && (
                            <div className="mt-4 grid grid-cols-3 gap-3">
                              {tracking.images.map((image, imageIndex) => (
                                <button key={imageIndex} type="button" onClick={() => setLightboxImageUrl(image.imageUrl)} className="overflow-hidden rounded-3xl border border-gray-100 bg-gray-50 hover:border-primary transition-all">
                                  <img src={image.imageUrl} alt={`Tracking ${index + 1} ảnh ${imageIndex + 1}`} className="w-full h-20 object-cover" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                  )}
                </div>

                <button onClick={() => setTrackingOrderId(null)} className="w-full py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black text-gray-500 hover:bg-gray-100 transition-all mt-6">
                  Đóng
                </button>
              </div>
            </div>
          </div>
          <ImageLightbox imageUrl={lightboxImageUrl} alt="Ảnh tracking" onClose={() => setLightboxImageUrl(null)} />
        </>
      )}

      {/* ── MODAL: XEM ẢNH KIỂM DUYỆT PHÓNG TO ── */}
      {qualityImageUrl && qualityReviewItem?.qualityResult?.qualityCheckingResponses && (
        <ImageLightbox
          imageUrl={qualityImageUrl}
          alt="Ảnh kiểm duyệt"
          images={qualityReviewItem.qualityResult.qualityCheckingResponses[qualityCurrentResponseIdx]?.images}
          currentIndex={qualityImageIndex}
          onIndexChange={(newIndex) => {
            setQualityImageIndex(newIndex);
            const images = qualityReviewItem.qualityResult?.qualityCheckingResponses?.[qualityCurrentResponseIdx]?.images || [];
            if (images[newIndex]) setQualityImageUrl(images[newIndex].imageUrl);
          }}
          onClose={() => setQualityImageUrl(null)}
        />
      )}

      {/* ── MODAL: KẾT QUẢ KIỂM DUYỆT ── */}
      {qualityReviewItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white w-full max-w-[520px] rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh]">
            <div className="p-8 overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between mb-5 gap-4">
                <div>
                  <h3 className="text-xl font-black text-gray-900">Kết quả kiểm duyệt</h3>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">{qualityReviewItem.productName || qualityReviewItem.mysteryBoxType || 'Sản phẩm'}</p>
                </div>
                <button onClick={() => setQualityReviewItem(null)} className="size-9 rounded-2xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50">
                  <X className="size-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-black text-gray-400">Kết quả tổng</p>
                      <p className={`text-sm font-black ${qualityReviewItem.qualityResult?.qualityResult === 'APPROVED' ? 'text-emerald-700' : 'text-red-600'}`}>
                        {qualityReviewItem.qualityResult?.qualityResult === 'APPROVED' ? '✅ Đạt' : '❌ Không đạt'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-black text-gray-400">Ghi chú</p>
                      <p className="text-sm font-medium text-gray-700">{qualityReviewItem.qualityResult?.note || 'Không có'}</p>
                    </div>
                  </div>
                </div>
                {(qualityReviewItem.qualityResult?.qualityCheckingResponses || []).map((response, idx) => (
                  <div key={idx} className="p-4 bg-white rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Tiêu chí</p>
                        <p className="text-sm font-black text-gray-900">{response.qualityName}</p>
                      </div>
                      <span className={`text-[10px] font-black uppercase rounded-full px-3 py-1 ${response.passed ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                        {response.passed ? 'Đạt' : 'Không đạt'}
                      </span>
                    </div>
                    {response.images && response.images.length > 0 && (
                      <div className="grid grid-cols-3 gap-3">
                        {response.images.map((image, imageIndex) => (
                          <button key={imageIndex} type="button"
                            onClick={() => { setQualityImageUrl(image.imageUrl); setQualityImageIndex(imageIndex); setQualityCurrentResponseIdx(idx); }}
                            className="w-full h-20 object-cover rounded-2xl overflow-hidden border border-gray-100 hover:border-primary transition-all cursor-pointer hover:opacity-80">
                            <img src={image.imageUrl} alt={`Ảnh tiêu chí ${idx + 1}`} className="w-full h-20 object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={() => setQualityReviewItem(null)} className="w-full py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black text-gray-500 hover:bg-gray-100 transition-all mt-6">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;