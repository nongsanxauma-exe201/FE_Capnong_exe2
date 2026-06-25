import React, { useState, useEffect } from 'react';
import {
  Package, Clock, Truck, CheckCircle2, XCircle, Eye,
  ArrowLeft, RefreshCw, AlertCircle, Search
} from 'lucide-react';
import { orderService, OrderResponse, OrderItemResponse } from '../../services/order.service';
import { authService } from '../../services/auth.service';
import { reviewService } from '../../services/review.service';
import { returnService } from '../../services/return.service';
import { paymentService } from '../../services/payment.service';
import { Star, Camera, X, Loader2 } from 'lucide-react';
import Pagination, { PageInfo } from '../../components/ui/Pagination';
import { globalShowAlert, globalShowConfirm } from '../../contexts/PopupContext';
import ReturnRequestModal from '../../components/ReturnRequestModal';
import { savePendingPayOSPayment } from '../../utils/pendingPayOSPayment';

import { useSearchParams } from 'react-router-dom';

const PAGE_SIZE = 10;

interface MyOrdersProps {
  onBack: () => void;
  onViewTracking: (orderId: number) => void;
}

type OrderStatusFilter =
  | 'ALL'
  | 'PENDING'
  | 'SHIPPING'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED';

const BUYER_STATUS_GROUPS: Record<OrderStatusFilter, string[]> = {
  ALL: [],
  PENDING: ['PENDING', 'PAID', 'AWAITING_PAYMENT'],
  SHIPPING: [
    'CONFIRMED',
    'READY_FOR_PICKUP',
    'SHIPPING',
    'SHIPPING_TO_WAREHOUSE',
    'ARRIVED_AT_WAREHOUSE',
    'QUALITY_CHECKING',
    'QUALITY_CHECKED',
    'READY',
  ],
  DELIVERED: ['DELIVERED'],
  CANCELLED: ['CANCELLED'],
  FAILED: ['FAILED'],
};

const BUYER_FILTERS: Array<{ key: OrderStatusFilter; label: string }> = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ xác nhận' },
  { key: 'SHIPPING', label: 'Đang vận chuyển' },
  { key: 'DELIVERED', label: 'Đã nhận' },
  { key: 'CANCELLED', label: 'Đã hủy' },
  { key: 'FAILED', label: 'Giao thất bại' },
];

const getFilterLabel = (filter: OrderStatusFilter) => {
  return BUYER_FILTERS.find(item => item.key === filter)?.label ?? 'Tất cả';
};

const MyOrders: React.FC<MyOrdersProps> = ({ onBack, onViewTracking }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const orderIdFromUrl = searchParams.get('orderId');
  const [allOrders, setAllOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState(orderIdFromUrl || '');
  const [page, setPage] = useState(0);
  const [userId, setUserId] = useState<number | null>(null);

  // Review state
  const [selectedItem, setSelectedItem] = useState<OrderItemResponse | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [evidence, setEvidence] = useState<File | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewedOrderDetailIds, setReviewedOrderDetailIds] = useState<Set<number>>(new Set());
  const [reviewedMysteryBoxIds, setReviewedMysteryBoxIds] = useState<Set<number>>(new Set());
  const [selectedReturnItem, setSelectedReturnItem] = useState<OrderItemResponse | null>(null);
  const [orderReturnModal, setOrderReturnModal] = useState<{ orderId: number; orderNum: number } | null>(null);
  const [orderReturnReason, setOrderReturnReason] = useState('');
  const [orderReturnEvidence, setOrderReturnEvidence] = useState<File | null>(null);
  const [submittingOrderReturn, setSubmittingOrderReturn] = useState(false);

  const loadReviewedIds = async () => {
    try {
      const res = await reviewService.getMyReviews();
      const reviews = res.result ?? [];
      setReviewedOrderDetailIds(new Set(
        reviews.filter(r => r.orderDetailId != null).map(r => r.orderDetailId!)
      ));
      setReviewedMysteryBoxIds(new Set(
        reviews.filter(r => r.mysteryBoxId != null && r.orderDetailId == null).map(r => r.mysteryBoxId!)
      ));
    } catch { }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const userInfo = await authService.getMyInfo();
      if (!userInfo.result) {
        console.error('No user info found');
        return;
      }

      const uid = userInfo.result.id;
      setUserId(uid);

      if (orderIdFromUrl) {
        const response = await orderService.getOrderById(parseInt(orderIdFromUrl));
        if (response.result) {
          setAllOrders([response.result]);
          return;
        }
      }

      // Fetch tất cả đơn một lần, filter và phân trang hoàn toàn client-side
      // để tránh lỗi pagination khi backend không hỗ trợ filter statuses
      const response = await orderService.getOrdersByUserId(uid);
      if (response.result) {
        setAllOrders(response.result.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
      }
    } catch (error: any) {
      console.error('Failed to fetch orders:', error);
      if (error.status === 401) {
        globalShowAlert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'Yêu cầu đăng nhập', 'warning');
      } else {
        globalShowAlert('Không thể tải danh sách đơn hàng. Vui lòng thử lại.', 'Lỗi', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!selectedItem) return;

    try {
      setSubmittingReview(true);

      // Validate comment
      if (!comment.trim()) {
        globalShowAlert('Vui lòng nhập nhận xét của bạn', 'Nhắc nhở', 'warning');
        return;
      }

      // Phân biệt product vs mystery box
      const reviewData: any = {
        ratingStar: rating,
        comment: comment.trim()
      };

      if (selectedItem.itemType === 'MYSTERY_BOX') {
        if (!selectedItem.mysteryBoxId) {
          globalShowAlert('Lỗi: Không tìm thấy ID hộp mù để đánh giá. Vui lòng liên hệ hỗ trợ.', 'Lỗi hệ thống', 'error');
          return;
        }
        reviewData.mysteryBoxId = selectedItem.mysteryBoxId;
      } else {
        if (!selectedItem.orderDetailId) {
          globalShowAlert('Lỗi: Không tìm thấy ID chi tiết đơn hàng để đánh giá. Vui lòng liên hệ hỗ trợ.', 'Lỗi hệ thống', 'error');
          return;
        }
        reviewData.orderDetailId = selectedItem.orderDetailId;
      }

      const res = await reviewService.createReview(reviewData, evidence || undefined);

      if (res.result) {
        globalShowAlert(`Cảm ơn bạn đã đánh giá ${selectedItem.itemType === 'MYSTERY_BOX' ? 'hộp mù' : 'sản phẩm'}!`, 'Thành công', 'success');
        // Đánh dấu item đã review
        if (selectedItem.itemType === 'MYSTERY_BOX' && selectedItem.mysteryBoxId) {
          setReviewedMysteryBoxIds(prev => new Set([...prev, selectedItem.mysteryBoxId!]));
        } else if (selectedItem.orderDetailId) {
          setReviewedOrderDetailIds(prev => new Set([...prev, selectedItem.orderDetailId!]));
        }
        setShowReviewModal(false);
        setSelectedItem(null);
        setRating(5);
        setComment('');
        setEvidence(null);
      }
    } catch (err: any) {
      console.error('Failed to submit review:', err);

      // Better error handling
      let errorMessage = 'Không thể gửi đánh giá. Vui lòng thử lại.';

      if (err.data?.message) {
        errorMessage = err.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      // Handle specific error cases
      if (err.data?.code === 9999) {
        errorMessage = 'Dữ liệu không hợp lệ. Vui lòng thử lại hoặc liên hệ hỗ trợ.';
      }

      globalShowAlert(errorMessage, 'Lỗi', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!await globalShowConfirm('Bạn có chắc chắn muốn hủy đơn hàng này không?', 'Xác nhận hủy đơn')) return;

    try {
      setLoading(true);
      const res = await orderService.updateOrder(orderId, { status: 'CANCELLED' });
      if (res.result) {
        globalShowAlert('Đã hủy đơn hàng thành công!', 'Thành công', 'success');
        fetchOrders(); // Refresh table
      }
    } catch (error: any) {
      console.error('Failed to cancel order:', error);
      globalShowAlert(error.message || 'Không thể hủy đơn hàng. Vui lòng thử lại sau.', 'Lỗi', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderReturn = async () => {
    if (!orderReturnModal) return;
    if (!orderReturnReason.trim()) {
      globalShowAlert('Vui lòng nhập lý do trả hàng.', 'Nhắc nhở', 'warning');
      return;
    }
    const confirmOk = await globalShowConfirm(
      `Bạn có chắc muốn yêu cầu trả toàn bộ đơn hàng #${orderReturnModal.orderNum}? Toàn bộ tiền sẽ được hoàn lại nếu được phê duyệt.`,
      'Xác nhận trả hàng'
    );
    if (!confirmOk) return;
    setSubmittingOrderReturn(true);
    try {
      await returnService.createOrderReturn(
        { orderId: orderReturnModal.orderId, reason: orderReturnReason.trim() },
        orderReturnEvidence || undefined
      );
      globalShowAlert('Yêu cầu trả toàn bộ đơn hàng đã được gửi thành công!', 'Thành công', 'success');
      setOrderReturnModal(null);
      setOrderReturnReason('');
      setOrderReturnEvidence(null);
      fetchOrders();
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Không thể gửi yêu cầu trả hàng. Vui lòng thử lại.';
      globalShowAlert(msg, 'Lỗi', 'error');
    } finally {
      setSubmittingOrderReturn(false);
    }
  };

  // Fetch tất cả đơn 1 lần khi mount (hoặc khi orderId URL thay đổi)
  useEffect(() => {
    fetchOrders();
    loadReviewedIds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderIdFromUrl]);

  // Reset về trang đầu khi đổi tab hoặc thay đổi search
  useEffect(() => {
    setPage(0);
  }, [filter, searchQuery]);

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: any; bg: string }> = {
      PENDING: {
        label: 'Chờ xác nhận',
        color: 'text-blue-600',
        icon: Clock,
        bg: 'bg-blue-50',
      },
      AWAITING_PAYMENT: {
        label: 'Đang thanh toán',
        color: 'text-amber-600',
        icon: Clock,
        bg: 'bg-amber-50',
      },
      PAID: {
        label: 'Đã thanh toán',
        color: 'text-blue-600',
        icon: Clock,
        bg: 'bg-blue-50',
      },
      CONFIRMED: {
        label: 'Đã xác nhận',
        color: 'text-yellow-600',
        icon: CheckCircle2,
        bg: 'bg-yellow-50',
      },
      READY_FOR_PICKUP: {
        label: 'Sẵn sàng lấy hàng',
        color: 'text-yellow-600',
        icon: Package,
        bg: 'bg-yellow-50',
      },
      SHIPPING_TO_WAREHOUSE: {
        label: 'Đang vận chuyển kho',
        color: 'text-yellow-600',
        icon: Truck,
        bg: 'bg-yellow-50',
      },
      ARRIVED_AT_WAREHOUSE: {
        label: 'Đã đến kho',
        color: 'text-yellow-600',
        icon: Package,
        bg: 'bg-yellow-50',
      },
      QUALITY_CHECKING: {
        label: 'Đang kiểm tra',
        color: 'text-yellow-600',
        icon: Package,
        bg: 'bg-yellow-50',
      },
      QUALITY_CHECKED: {
        label: 'Đã kiểm tra',
        color: 'text-yellow-600',
        icon: CheckCircle2,
        bg: 'bg-yellow-50',
      },
      READY: {
        label: 'Sẵn sàng giao',
        color: 'text-yellow-600',
        icon: Package,
        bg: 'bg-yellow-50',
      },
      SHIPPING: {
        label: 'Đang giao hàng',
        color: 'text-blue-600',
        icon: Truck,
        bg: 'bg-blue-50',
      },
      DELIVERED: {
        label: 'Đã nhận hàng',
        color: 'text-green-600',
        icon: CheckCircle2,
        bg: 'bg-green-50',
      },
      CANCELLED: {
        label: 'Đã hủy',
        color: 'text-red-600',
        icon: XCircle,
        bg: 'bg-red-50',
      },
      FAILED: {
        label: 'Giao thất bại',
        color: 'text-red-600',
        icon: XCircle,
        bg: 'bg-red-50',
      },
      RETURNED: {
        label: 'Đã hoàn hàng',
        color: 'text-red-600',
        icon: XCircle,
        bg: 'bg-red-50',
      },
    };

    return configs[status] || {
      label: 'Đang xử lý',
      color: 'text-gray-600',
      icon: Clock,
      bg: 'bg-gray-50',
    };
  };

  const canTrack = (status: string) => {
    return [
      'CONFIRMED',
      'READY_FOR_PICKUP',
      'SHIPPING_TO_WAREHOUSE',
      'ARRIVED_AT_WAREHOUSE',
      'QUALITY_CHECKING',
      'QUALITY_CHECKED',
      'READY',
      'SHIPPING',
    ].includes(status);
  };

  // Lọc theo tab
  const tabOrders = filter === 'ALL'
    ? allOrders
    : allOrders.filter(o => BUYER_STATUS_GROUPS[filter].includes(o.status));

  // Lọc theo search
  const filteredOrders = tabOrders.filter(order =>
    searchQuery === '' ||
    order.id.toString().includes(searchQuery) ||
    order.recipientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Phân trang client-side — chính xác theo số đơn đã lọc
  const totalElements = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paginatedOrders = filteredOrders.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const clientPageInfo: PageInfo = {
    page: safePage,
    size: PAGE_SIZE,
    totalElements,
    totalPages,
    first: safePage === 0,
    last: safePage >= totalPages - 1,
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20 animate-in fade-in duration-500">
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 lg:px-40 py-12">

        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <button
            onClick={onBack}
            className="size-12 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all shadow-sm"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-4xl font-black text-gray-900">
              {orderIdFromUrl ? `Chi tiết đơn #${orderIdFromUrl}` : 'Đơn Hàng Của Tôi'}
            </h1>
            <p className="text-gray-400 font-bold text-sm mt-1">
              {orderIdFromUrl
                ? 'Đang hiển thị đơn hàng cụ thể từ yêu cầu trả hàng'
                : 'Quản lý và theo dõi tất cả đơn hàng của bạn'
              }
              {orderIdFromUrl && (
                <button
                  onClick={() => { setSearchParams({}); setSearchQuery(''); }}
                  className="ml-4 text-primary hover:underline font-black"
                >
                  Xem tất cả đơn hàng
                </button>
              )}
            </p>
          </div>
          <button
            onClick={() => fetchOrders()}
            disabled={loading}
            className="px-6 py-3 bg-white border border-gray-100 rounded-2xl flex items-center gap-2 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-6 md:p-8 mb-8">
          <div className="flex flex-col gap-6">
            {/* Search */}
            <div className="relative w-full">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo mã đơn hoặc tên nhận hàng..."
                className="w-full pl-14 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-[20px] text-sm font-bold outline-none focus:border-primary focus:bg-white focus:shadow-xl focus:shadow-primary/5 transition-all text-gray-800 placeholder:font-medium"
              />
            </div>

            {/* Status Filter */}
            <div className="flex flex-wrap items-center gap-3">
              {BUYER_FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { setFilter(key); setPage(0); }}
                  className={`px-6 py-3 rounded-[18px] text-[11px] font-black uppercase tracking-wider transition-all transform hover:scale-105 active:scale-95 ${
                    filter === key
                      ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-105'
                      : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-gray-400">Đang tải đơn hàng...</p>
          </div>
        ) : paginatedOrders.length === 0 ? (
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-16 text-center">
            <div className="size-24 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-6 mx-auto">
              <Package className="size-12" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Chưa có đơn hàng nào</h3>
            <p className="text-gray-500 mb-8">
              {filter !== 'ALL'
                ? `Không tìm thấy đơn hàng trong nhóm "${getFilterLabel(filter)}"`
                : 'Hãy bắt đầu mua sắm để tạo đơn hàng đầu tiên nhé!'
              }
            </p>
            <button
              onClick={onBack}
              className="px-8 py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all"
            >
              Khám phá sản phẩm
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {paginatedOrders.map((order) => {
              const statusConfig = getStatusConfig(order.status);
              const StatusIcon = statusConfig.icon;
              const trackable = canTrack(order.status);

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg transition-all"
                >
                  {/* Order Header */}
                  <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-4">
                      <div className={`size-12 ${statusConfig.bg} rounded-2xl flex items-center justify-center ${statusConfig.color}`}>
                        <StatusIcon className="size-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-black text-gray-900">Đơn hàng #{order.id}</h3>
                          <span className={`px-3 py-1 ${statusConfig.bg} ${statusConfig.color} text-xs font-black rounded-full uppercase`}>
                            {statusConfig.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 font-bold mt-1">
                          Đặt lúc: {formatDate(order.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Tổng tiền</p>
                      <p className="text-2xl font-black text-primary">{order.totalAmount.toLocaleString('vi-VN')}đ</p>
                    </div>
                  </div>

                  {/* Order Body */}
                  <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                      {/* Delivery Info */}
                      <div className="space-y-3">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Thông tin giao hàng</p>
                        <div className="space-y-2">
                          <p className="text-sm font-bold text-gray-900">{order.recipientName}</p>
                          <p className="text-sm text-gray-600">{order.recipientPhone}</p>
                          <p className="text-sm text-gray-600">{order.shippingAddress}</p>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="space-y-3">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                          Sản phẩm ({order.items?.length || 0})
                        </p>
                        <div className="space-y-2">
                          {order.items?.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm py-1">
                              <span className="text-gray-600">{item.productName} x{item.quantity}</span>
                              <div className="flex items-center gap-4">
                                <span className="font-bold text-gray-900">{item.unitPrice.toLocaleString('vi-VN')}đ</span>
                                {order.status === 'DELIVERED' && (
                                  <div className="flex gap-3">
                                    {(() => {
                                      const alreadyReviewed =
                                        (item.itemType === 'MYSTERY_BOX' && item.mysteryBoxId && reviewedMysteryBoxIds.has(item.mysteryBoxId)) ||
                                        (item.itemType !== 'MYSTERY_BOX' && item.orderDetailId && reviewedOrderDetailIds.has(item.orderDetailId));
                                      return alreadyReviewed ? (
                                        <span className="text-green-600 font-black text-[10px] uppercase tracking-wider">✓ Đã đánh giá</span>
                                      ) : (
                                        <button
                                          onClick={() => { setSelectedItem(item); setShowReviewModal(true); }}
                                          className="text-primary font-black text-[10px] uppercase tracking-wider hover:underline"
                                        >
                                          Đánh giá
                                        </button>
                                      );
                                    })()}
                                    {item.isRequestedReturn ? (
                                      <span className={`font-black text-[10px] uppercase tracking-wider italic ${item.returnStatus === 'REJECTED' ? 'text-red-500' :
                                        item.returnStatus === 'COMPLETED' ? 'text-green-500' : 'text-orange-500'
                                        }`}>
                                        {item.returnStatus === 'PENDING' ? 'Đang chờ duyệt' :
                                          item.returnStatus === 'SHOP_APPROVED' ? 'Shop đã duyệt' :
                                            item.returnStatus === 'APPROVED' ? 'Admin đã duyệt' :
                                              item.returnStatus === 'REJECTED' ? 'Bị từ chối' :
                                                item.returnStatus === 'DISPUTED' ? 'Đang khiếu nại' :
                                                  item.returnStatus === 'COMPLETED' ? 'Đã hoàn tiền' :
                                                    item.returnStatus === 'REFUND_PENDING' ? 'Đang hoàn tiền' : 'Đã y/c trả'}
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => setSelectedReturnItem(item)}
                                        className="text-red-500 font-black text-[10px] uppercase tracking-wider hover:underline"
                                      >
                                        Trả hàng
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {(order.items?.length || 0) > 3 && (
                            <p className="text-xs text-gray-400 italic">
                              +{(order.items?.length || 0) - 3} sản phẩm khác
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Note */}
                    {order.note && (
                      <div className="mb-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                        <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Ghi chú</p>
                        <p className="text-sm text-gray-700">{order.note}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400">Phương thức:</span>
                        <span className="px-3 py-1 bg-gray-50 text-gray-700 text-xs font-black rounded-full uppercase">
                          {order.paymentMethod || 'WALLET'}
                        </span>
                      </div>

                      {order.status === 'DELIVERED' ? (
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2 px-6 py-3 bg-green-50 text-green-700 rounded-2xl border border-green-100">
                            <CheckCircle2 className="size-4" />
                            <span className="text-sm font-black uppercase tracking-wider">Đã nhận được hàng</span>
                          </div>
                          {/* Return whole order button — only shown if NO item has been returned yet */}
                          {!order.items?.some(i => i.isRequestedReturn) && (
                            <button
                              onClick={() => setOrderReturnModal({ orderId: order.id, orderNum: order.id })}
                              className="px-5 py-3 bg-orange-50 text-orange-600 font-black text-xs rounded-2xl border border-orange-100 hover:bg-orange-100 transition-all flex items-center gap-2 uppercase tracking-wider"
                            >
                              <RefreshCw className="size-3.5" />
                              Trả toàn bộ đơn
                            </button>
                          )}
                        </div>
                      ) : trackable ? (
                        <button
                          onClick={() => onViewTracking(order.id)}
                          className="px-6 py-3 bg-primary text-white font-black rounded-2xl flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
                        >
                          <Eye className="size-4" />
                          Theo dõi đơn hàng
                        </button>
                      ) : order.status === 'AWAITING_PAYMENT' ? (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={async () => {
                              try {
                                const res = await paymentService.getLatestPendingByOrderId(order.id);
                                const payment = res?.result;
                                if (payment?.checkoutUrl) {
                                  savePendingPayOSPayment(payment, order.id);
                                  window.location.href = payment.checkoutUrl;
                                } else {
                                  globalShowAlert('Không tìm thấy link thanh toán. Vui lòng thử lại.', 'Thông báo', 'warning');
                                }
                              } catch (e: any) {
                                globalShowAlert(e?.data?.message ?? 'Không thể tiếp tục thanh toán.', 'Lỗi', 'error');
                              }
                            }}
                            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                          >
                            💳 Tiếp tục thanh toán
                          </button>
                          <div className="flex items-center gap-2 px-6 py-3 bg-amber-50 text-amber-700 rounded-2xl border border-amber-100">
                            <AlertCircle className="size-4" />
                            <span className="text-sm font-bold">Chờ thanh toán</span>
                          </div>
                        </div>
                      ) : order.status === 'PENDING' || order.status === 'PAID' ? (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            className="px-6 py-3 bg-red-50 text-red-600 font-bold rounded-2xl border border-red-100 hover:bg-red-100 hover:text-red-700 transition-all flex items-center gap-2"
                          >
                            <XCircle className="size-4" />
                            Hủy đơn hàng
                          </button>
                          <div className="flex items-center gap-2 px-6 py-3 bg-yellow-50 text-yellow-700 rounded-2xl border border-yellow-100">
                            <AlertCircle className="size-4" />
                            <span className="text-sm font-bold">Đang chờ shop duyệt</span>
                          </div>
                        </div>
                      ) : (
                        <div className="px-6 py-3 bg-gray-50 text-gray-400 rounded-2xl">
                          <span className="text-sm font-bold">Không thể theo dõi</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {totalPages > 1 && <Pagination pageInfo={clientPageInfo} onPageChange={setPage} className="mt-6" />}
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedItem && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-10 py-8 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-gray-900">
                  {selectedItem.itemType === 'MYSTERY_BOX' ? 'Đánh giá hộp mù' : 'Đánh giá sản phẩm'}
                </h3>
                <p className="text-gray-400 font-bold text-sm mt-1">
                  {selectedItem.itemType === 'MYSTERY_BOX'
                    ? selectedItem.mysteryBoxType || selectedItem.productName
                    : selectedItem.productName
                  }
                </p>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="size-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all"
              >
                <X className="size-6" />
              </button>
            </div>

            <div className="p-10 space-y-8">
              {/* Rating */}
              <div className="flex flex-col items-center gap-4">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Độ hài lòng của bạn</p>
                <div className="flex gap-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="transition-transform hover:scale-125 focus:outline-none"
                    >
                      <Star
                        className={`size-10 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} transition-colors`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div className="space-y-3">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Nhận xét của bạn</p>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Hãy chia sẻ cảm nhận của bạn về sản phẩm này nhé..."
                  className="w-full h-32 p-6 bg-gray-50 border border-gray-100 rounded-3xl text-sm font-medium outline-none focus:border-primary transition-all resize-none"
                />
              </div>

              {/* Evidence Upload */}
              <div className="space-y-3">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Hình ảnh thực tế (không bắt buộc)</p>
                <div className="flex items-center gap-4">
                  <label className="size-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group">
                    <Camera className="size-6 text-gray-300 group-hover:text-primary transition-colors" />
                    <span className="text-[8px] font-black text-gray-300 mt-1 uppercase group-hover:text-primary">Tải lên</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => setEvidence(e.target.files?.[0] || null)}
                    />
                  </label>
                  {evidence && (
                    <div className="relative size-20 rounded-2xl overflow-hidden border border-gray-100 group">
                      <img
                        src={URL.createObjectURL(evidence)}
                        alt="Evidence"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => setEvidence(null)}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="size-5 text-white" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-10 py-8 bg-gray-50 border-t border-gray-100">
              <button
                onClick={handleReviewSubmit}
                disabled={submittingReview || !comment.trim()}
                className="w-full py-5 bg-primary text-white font-black rounded-[24px] shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {submittingReview ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  'Gửi đánh giá ngay'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedReturnItem && (
        <ReturnRequestModal
          item={selectedReturnItem}
          onClose={() => setSelectedReturnItem(null)}
          onSuccess={() => { setSelectedReturnItem(null); fetchOrders(); }}
        />
      )}

      {/* Order-level Return Modal */}
      {orderReturnModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-10 py-8 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-gray-900">Trả toàn bộ đơn hàng</h3>
                <p className="text-gray-400 font-bold text-sm mt-1">Đơn hàng #{orderReturnModal.orderNum}</p>
              </div>
              <button
                onClick={() => { setOrderReturnModal(null); setOrderReturnReason(''); setOrderReturnEvidence(null); }}
                className="size-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all"
              >
                <X className="size-6" />
              </button>
            </div>
            <div className="p-10 space-y-6">
              <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                <p className="text-xs font-bold text-orange-700 leading-relaxed">
                  ⚠️ Yêu cầu này sẽ trả <strong>toàn bộ sản phẩm</strong> trong đơn hàng. Toàn bộ số tiền sẽ được hoàn lại nếu được phê duyệt.
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Lý do trả hàng *</p>
                <textarea
                  value={orderReturnReason}
                  onChange={(e) => setOrderReturnReason(e.target.value)}
                  placeholder="Mô tả vấn đề với đơn hàng này..."
                  className="w-full h-32 p-6 bg-gray-50 border border-gray-100 rounded-3xl text-sm font-medium outline-none focus:border-primary transition-all resize-none"
                />
              </div>
              <div className="space-y-3">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Hình ảnh minh chứng (không bắt buộc)</p>
                <div className="flex items-center gap-4">
                  <label className="size-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all group">
                    <Camera className="size-6 text-gray-300 group-hover:text-orange-400 transition-colors" />
                    <span className="text-[8px] font-black text-gray-300 mt-1 uppercase group-hover:text-orange-400">Tải lên</span>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => setOrderReturnEvidence(e.target.files?.[0] || null)} />
                  </label>
                  {orderReturnEvidence && (
                    <div className="relative size-20 rounded-2xl overflow-hidden border border-gray-100 group">
                      <img src={URL.createObjectURL(orderReturnEvidence)} alt="Evidence" className="w-full h-full object-cover" />
                      <button onClick={() => setOrderReturnEvidence(null)} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="size-5 text-white" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="px-10 py-8 bg-gray-50 border-t border-gray-100">
              <button
                onClick={handleOrderReturn}
                disabled={submittingOrderReturn || !orderReturnReason.trim()}
                className="w-full py-5 bg-orange-500 text-white font-black rounded-[24px] shadow-xl shadow-orange-500/20 hover:bg-orange-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {submittingOrderReturn ? <Loader2 className="size-5 animate-spin" /> : <><RefreshCw className="size-5" />Gửi yêu cầu trả hàng</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyOrders;
