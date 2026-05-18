import React, { useEffect, useMemo, useState } from 'react';
import { orderService } from '../../services';
import { Truck, MapPin, Navigation, Phone, CheckCircle2, XCircle, FileText, AlertTriangle, Search, Star, ChevronDown, ChevronRight, X, CheckCircle, Package, Clock, RefreshCw, MessageSquare, Camera } from 'lucide-react';
import { ImageLightbox } from '../../components/ui';

export interface TrackingImageResponse {
  imageUrl: string;
}

export interface TrackingResponse {
  trackingId: string;
  status: string;
  createdAt: string;
  images?: TrackingImageResponse[];
}

export interface OrderItemResponse {
  orderDetailId?: number;
  productId?: number;
  mysteryBoxId?: number | null;
  productName?: string;
  mysteryBoxType?: string;
  quantity: number;
  unitPrice: number;
  itemType: 'PRODUCT' | 'MYSTERY_BOX';
  category?: string;
  imageUrl?: string;
  isRequestedReturn?: boolean;
  returnStatus?: string | null;
}

export interface OrderResponse {
  id: number;
  shopOwner?: {
    shopName?: string;
    fullName?: string;
    phoneNumber?: string;
    logoUrl?: string;
  };
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  paymentMethod: string;
  note: string;
  shippingFee: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  items: OrderItemResponse[];
  buyerId?: number;
  trackings?: TrackingResponse[];
  passedQualityCheck?: boolean | null;
}

interface UIOrderItem {
  name: string;
  qty: string;
  unitPrice: number;
  total: number;
  image?: string;
}

interface UIOrder {
  id: string;
  farmer: string;
  product: string;
  qty: string;
  eta: string;
  distance: string;
  status: string;
  statusLabel: string;
  progress: number;
  avatar: string;
  phone: string;
  time: string;
  confirmedTime?: string;
  confirmedBy?: string;
  nextStep?: string;
  issueType?: string;
  issueDetail?: string;
  reportedBy?: string;
  reportedTime?: string;
  hasTracking: boolean;
  hasQualityReview: boolean;
  passedQualityCheck?: boolean | null;
  trackings: TrackingResponse[];
  orderItems: OrderItemResponse[];
  orderInfo: {
    items: UIOrderItem[];
    subtotal: number;
    shipping: number;
    total: number;
    weight: string;
    customer: {
      name: string;
      address: string;
      phone: string;
    };
  };
}

const getOrderStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    SHIPPING_TO_WAREHOUSE: 'Đang giao tới kho',
    ARRIVED_AT_WAREHOUSE: 'Đã tới kho',
    QUALITY_CHECKING: 'Đang kiểm định',
    QUALITY_APPROVED: 'Đạt chất lượng',
    QUALITY_CHECKED: 'Đã kiểm tra',
    QUALITY_REJECTED: 'Không đạt chất lượng',
    PENDING: 'Chờ xác nhận',
    AWAITING_CONFIRMATION: 'Chờ xác nhận',
    WAREHOUSE_ARRIVED: 'Đã tới kho',
    CONFIRMED: 'Đã xác nhận',
    PREPARING: 'Đang chuẩn bị',
    PACK: 'Đang đóng gói',
    READY: 'Sẵn sàng',
    FAILED: 'Thất bại',
    REJECT: 'Bị từ chối',
    RETURN: 'Trả hàng',
    ISSUE: 'Có vấn đề',
    CANCELLED: 'Đã hủy',
    SHIPPING: 'Đang giao',
    DELIVERED: 'Đã giao',
  };

  return map[status] || status.replace(/_/g, ' ');
};

const tabDefinitions = [
  { key: 'all', label: 'Tất cả' },
  { key: 'shipping', label: 'Đang giao tới kho' },
  { key: 'arrived', label: 'Đã tới kho' },
  { key: 'qualityChecking', label: 'Đang kiểm định' },
  { key: 'qualityChecked', label: 'Đã kiểm tra' },
  { key: 'qualityApproved', label: 'Đạt chất lượng' },
  { key: 'qualityRejected', label: 'Không đạt chất lượng' },
] as const;

type TabKey = (typeof tabDefinitions)[number]['key'];

const IncomingOrders: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const [confirmEvidenceFiles, setConfirmEvidenceFiles] = useState<File[]>([]);
  const [isSubmittingConfirm, setIsSubmittingConfirm] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [reportingOrderId, setReportingOrderId] = useState<string | null>(null);
  const [orderDetailId, setOrderDetailId] = useState<string | null>(null);
  const [showShippers, setShowShippers] = useState(false);
  const [selectedShipper, setSelectedShipper] = useState<string | null>(null);
  const [assignedShippers, setAssignedShippers] = useState<Record<string, string>>({});
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [qualityReviewItem, setQualityReviewItem] = useState<OrderItemResponse | null>(null);
  const [qualityImageUrl, setQualityImageUrl] = useState<string | null>(null);
  const [qualityImageIndex, setQualityImageIndex] = useState(0);
  const [qualityCurrentResponseIdx, setQualityCurrentResponseIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await orderService.getOrdersForStaff(0, 10);
      if (response.result) {
        setOrders(response.result.content || []);
      } else {
        setOrders([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch staff orders:', err);
      setError(err.data?.message || err.message || 'Không thể tải đơn hàng');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleEvidenceFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    setConfirmEvidenceFiles(files);
  };

  const handleConfirmArrival = async () => {
    if (!confirmingOrderId) return;

    setIsSubmittingConfirm(true);
    setConfirmError(null);

    try {
      await orderService.updateOrder(Number(confirmingOrderId), { status: 'ARRIVED_AT_WAREHOUSE' }, confirmEvidenceFiles);
      setConfirmingOrderId(null);
      setConfirmEvidenceFiles([]);
      await fetchOrders();
    } catch (err: any) {
      console.error('Failed to confirm arrival:', err);
      setConfirmError(err.data?.message || err.message || 'Không thể xác nhận đơn hàng');
    } finally {
      setIsSubmittingConfirm(false);
    }
  };

  const normalizedOrders = useMemo(() => {
    return orders.map((order) => {
      const itemCount = order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const relevantTracking = order.trackings?.find((tracking) => tracking.status === order.status)
        || order.trackings?.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      const shopOwner = order.shopOwner;
      const isComplete = ['ARRIVED_AT_WAREHOUSE', 'QUALITY_CHECKED', 'QUALITY_APPROVED', 'QUALITY_REJECTED'].includes(order.status);
      const nextStep = order.status === 'ARRIVED_AT_WAREHOUSE'
        ? 'Chờ kiểm duyệt'
        : order.status === 'QUALITY_CHECKING'
          ? 'Đang kiểm duyệt'
          : order.status === 'QUALITY_CHECKED' || order.status === 'QUALITY_APPROVED'
            ? 'Chờ đóng gói'
            : order.status === 'QUALITY_REJECTED'
              ? 'Xử lý chất lượng'
              : '';
      return {
        id: order.id.toString(),
        farmer: shopOwner?.shopName || shopOwner?.fullName || order.recipientName,
        product: order.items[0]?.productName || 'Sản phẩm',
        qty: `${itemCount} sp`,
        eta: '',
        distance: '---',
        status: order.status,
        statusLabel: getOrderStatusLabel(order.status),
        progress: order.status === 'SHIPPING_TO_WAREHOUSE' ? 60 : order.status === 'ARRIVED_AT_WAREHOUSE' ? 80 : 100,
        progressCompleted: isComplete,
        avatar: shopOwner?.logoUrl || order.items[0]?.imageUrl || 'https://picsum.photos/seed/staff_order/80/80',
        phone: shopOwner?.phoneNumber || order.recipientPhone,
        time: relevantTracking ? new Date(relevantTracking.createdAt).toLocaleString('vi-VN') : 'Chưa có data',
        confirmedTime: order.status === 'ARRIVED_AT_WAREHOUSE' ? (relevantTracking ? new Date(relevantTracking.createdAt).toLocaleString('vi-VN') : '') : '',
        confirmedBy: '',
        nextStep,
        issueType: '',
        issueDetail: '',
        reportedBy: '',
        reportedTime: '',
        hasTracking: !!order.trackings?.length,
        hasQualityReview: order.items.some((item) => item.qualityResult != null),
        passedQualityCheck: order.passedQualityCheck ?? null,
        trackings: order.trackings || [],
        orderItems: order.items,
        orderInfo: {
          items: order.items.map((item) => ({
            name: item.productName || 'Sản phẩm',
            qty: `${item.quantity}`,
            unitPrice: item.unitPrice,
            total: (item.quantity || 0) * (item.unitPrice || 0),
            image: item.imageUrl,
          })),
          subtotal: order.totalAmount - order.shippingFee,
          shipping: order.shippingFee,
          total: order.totalAmount,
          weight: `${itemCount} kg`,
          customer: {
            name: order.recipientName,
            address: order.shippingAddress,
            phone: order.recipientPhone,
          },
        },
      };
    });
  }, [orders]);

  const incomingOrders = useMemo(
    () => normalizedOrders.filter((order) => order.status === 'SHIPPING_TO_WAREHOUSE'),
    [normalizedOrders]
  );

  const arrivedOrders = useMemo(
    () => normalizedOrders.filter((order) => order.status === 'ARRIVED_AT_WAREHOUSE'),
    [normalizedOrders]
  );

  const qualityCheckingOrders = useMemo(
    () => normalizedOrders.filter((order) => order.status === 'QUALITY_CHECKING'),
    [normalizedOrders]
  );

  const qualityCheckedOrders = useMemo(
    () => normalizedOrders.filter((order) => order.status === 'QUALITY_CHECKED'),
    [normalizedOrders]
  );

  const qualityApprovedOrders = useMemo(
    () => normalizedOrders.filter((order) => order.passedQualityCheck === true),
    [normalizedOrders]
  );

  const qualityRejectedOrders = useMemo(
    () => normalizedOrders.filter((order) => order.passedQualityCheck === false),
    [normalizedOrders]
  );

  const qualityOrders = useMemo(
    () => [...qualityCheckingOrders, ...qualityCheckedOrders, ...qualityApprovedOrders],
    [qualityCheckingOrders, qualityCheckedOrders, qualityApprovedOrders]
  );

  const currentQualityOrders = useMemo(() => {
    if (activeTab === 'qualityChecking') return qualityCheckingOrders;
    if (activeTab === 'qualityChecked') return qualityCheckedOrders;
    if (activeTab === 'qualityApproved') return qualityApprovedOrders;
    return qualityOrders;
  }, [activeTab, qualityCheckingOrders, qualityCheckedOrders, qualityApprovedOrders, qualityOrders]);

  const tabCounts = useMemo(() => ({
    all: normalizedOrders.length,
    shipping: incomingOrders.length,
    arrived: arrivedOrders.length,
    qualityChecking: qualityCheckingOrders.length,
    qualityChecked: qualityCheckedOrders.length,
    qualityApproved: qualityApprovedOrders.length,
    qualityRejected: qualityRejectedOrders.length,
  }), [
    normalizedOrders,
    incomingOrders,
    arrivedOrders,
    qualityCheckingOrders,
    qualityCheckedOrders,
    qualityApprovedOrders,
    qualityRejectedOrders,
  ]);

  const tabs = tabDefinitions.map((tab) => ({
    ...tab,
    label: `${tab.label} (${tabCounts[tab.key]})`,
  }));

  const showIncoming = activeTab === 'all' || activeTab === 'shipping';
  const showArrived = activeTab === 'all' || activeTab === 'arrived';
  const showConfirmed = activeTab === 'all' || ['qualityChecking', 'qualityChecked', 'qualityApproved'].includes(activeTab);
  const showIssues = activeTab === 'all' || activeTab === 'qualityRejected';

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-10">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-white rounded-3xl border border-red-100 shadow-sm text-red-600">
        <h2 className="text-lg font-black mb-2">Lỗi tải đơn hàng</h2>
        <p>{error}</p>
      </div>
    );
  }


  const nearbyShippers = [
    { id: 'SH-01', name: 'Nguyễn Hùng', distance: '0.8km', rating: 4.9, orders: 312, status: 'Sẵn sàng', avatar: 'https://picsum.photos/seed/shipper1/80/80' },
    { id: 'SH-02', name: 'Trần Văn Minh', distance: '1.2km', rating: 4.7, orders: 245, status: 'Sẵn sàng', avatar: 'https://picsum.photos/seed/farmer7/80/80' },
    { id: 'SH-03', name: 'Lê Thị Hoa', distance: '2.1km', rating: 4.8, orders: 189, status: 'Sẵn sàng', avatar: 'https://picsum.photos/seed/shipper3/80/80' },
  ];

  const orderDetailData = [...incomingOrders, ...arrivedOrders, ...qualityOrders, ...qualityRejectedOrders].find(o => o.id === orderDetailId);
  const trackingOrder = trackingOrderId ? normalizedOrders.find((o) => o.id === trackingOrderId) : null;

  return (
    <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-500 relative">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black font-display text-gray-900">Quản Lý Đơn Hàng Tại Kho</h2>
          <p className="text-gray-400 font-medium text-sm mt-1">Theo dõi đơn hàng từ shop đến kho và điều phối giao hàng.</p>
        </div>
        <div className="relative">
          <input type="text" placeholder="Tìm mã đơn, shop..." className="pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-full text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all w-64 shadow-sm" />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        {/* Tab Bar */}
        <div className="px-10 py-2 border-b border-gray-50 flex items-center gap-12 overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`py-5 text-xs font-black whitespace-nowrap transition-all border-b-2 ${activeTab === tab.key ? 'text-primary border-primary' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-8 space-y-6">

          {/* ── SECTION 1: ĐANG ĐẾN ── */}
          {showIncoming && (
            <>
              {(activeTab === 'all') && <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Đang trên đường đến kho</p>}
              {incomingOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden hover:border-primary/20 transition-all">
                  <div className="px-8 py-5 bg-gray-50/50 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-black text-primary">#{order.id}</span>
                      <span className="text-[11px] text-gray-400 font-bold">Xuất phát lúc: {order.time}</span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-500 text-[10px] font-black uppercase rounded-md flex items-center gap-1">
                        <Truck className="size-3" /> {order.statusLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <MapPin className="size-3" /> {order.distance}
                      </div>
                      <span className="text-sm font-black text-gray-700">{order.qty}</span>
                    </div>
                  </div>
                  <div className="p-8 flex flex-col md:flex-row gap-8">
                    <div className="flex-1 flex flex-col gap-6">
                      <div className="flex items-center gap-4">
                        <img src={order.avatar} className="size-12 rounded-full object-cover" alt="" />
                        <div>
                          <h4 className="text-sm font-black text-gray-900">{order.farmer}</h4>
                          <p className="text-[11px] text-gray-400 font-bold">{order.phone} · Shop</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Sản phẩm đang vận chuyển</p>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 w-fit">
                          <img src={order.avatar} className="size-10 rounded-xl object-cover" alt="" />
                          <div>
                            <p className="text-xs font-bold text-gray-800">{order.product}</p>
                            <p className="text-[10px] text-gray-400 font-bold">{order.qty}</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><MapPin className="size-3 text-green-500" /> Shop</span>
                          <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><MapPin className="size-3 text-primary" /> Kho XẤU MÃ</span>
                        </div>
                        <div className="relative h-2.5 bg-gray-100 rounded-full overflow-visible">
                          <div className={`absolute left-0 top-0 h-full rounded-full ${order.progressCompleted ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-blue-400 to-primary'}`} style={{ width: `${order.progress}%` }} />
                          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2" style={{ left: `${order.progress}%` }}>
                            <div className={`size-5 rounded-full shadow-md flex items-center justify-center ${order.progressCompleted ? 'bg-emerald-50 border-2 border-emerald-500' : 'bg-white border-2 border-primary'}`}>
                              <Truck className={`size-2.5 ${order.progressCompleted ? 'text-emerald-600' : 'text-primary'}`} />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] font-black text-blue-500">Còn {order.distance}</span>
                          <span className="text-[10px] font-black text-orange-500">ETA: {order.eta}</span>
                        </div>
                      </div>
                    </div>
                    <div className="w-full md:w-72 flex flex-col gap-4 border-l border-gray-100 md:pl-8">
                      <div className="flex items-center gap-2 text-[11px] font-black text-blue-500 uppercase tracking-widest">
                        <Truck className="size-4" /> Thông tin vận chuyển
                      </div>
                      <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100">
                        <p className="text-sm font-black text-gray-900">{order.farmer}</p>
                        <p className="text-[11px] text-gray-400 font-bold mt-1">📞 {order.phone}</p>
                        <p className="text-[10px] text-blue-400 font-bold italic mt-2">Đang di chuyển · Còn {order.distance}</p>
                      </div>
                      {order.hasTracking ? (
                        <button onClick={() => setTrackingOrderId(order.id)}
                          className="w-full py-4 bg-primary/10 text-primary font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all shadow-md shadow-primary/5 group">
                          <Navigation className="size-4 group-hover:animate-bounce" /> Theo dõi hành trình
                        </button>
                      ) : (
                        <div className="w-full py-4 bg-gray-100 text-gray-400 font-black rounded-2xl flex items-center justify-center gap-2 cursor-not-allowed">
                          <Navigation className="size-4" /> Chưa có tracking
                        </div>
                      )}
                      <button onClick={() => {
                        setConfirmingOrderId(order.id);
                        setConfirmEvidenceFiles([]);
                        setConfirmError(null);
                      }}
                        className="w-full py-4 bg-green-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-green-600 transition-all shadow-sm shadow-green-500/20 mt-3">
                        <CheckCircle2 className="size-4" /> Xác nhận đã đến kho
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ── SECTION 2: ĐÃ TỚI KHO ── */}
          {showArrived && (
            <>
              {(activeTab === 'all') && <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 pt-2">Đã đến kho</p>}
              {arrivedOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden hover:border-primary/20 transition-all">
                  <div className="px-8 py-5 bg-gray-50/50 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-black text-primary">#{order.id}</span>
                      <span className="text-[11px] text-gray-400 font-bold">Đến kho lúc: {order.time}</span>
                      <span className="px-2 py-0.5 bg-orange-50 text-orange-500 text-[10px] font-black uppercase rounded-md flex items-center gap-1">
                        <span className="size-1.5 bg-orange-500 rounded-full inline-block animate-pulse" /> {order.statusLabel}
                      </span>
                    </div>
                    <span className="text-sm font-black text-gray-700">{order.qty}</span>
                  </div>
                  <div className="p-8 flex flex-col md:flex-row gap-8">
                    <div className="flex-1 flex flex-col gap-6">
                      <div className="flex items-center gap-4">
                        <img src={order.avatar} className="size-12 rounded-full object-cover" alt="" />
                        <div>
                          <h4 className="text-sm font-black text-gray-900">{order.farmer}</h4>
                          <p className="text-[11px] text-gray-400 font-bold">{order.phone} · Shop</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Chi tiết hàng hóa</p>
                        <div className="flex flex-wrap gap-3">
                          {order.orderInfo.items.map((item, j) => (
                            <div key={j} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                              <img src={item.image} className="size-10 rounded-xl object-cover" alt="" />
                              <div>
                                <p className="text-xs font-bold text-gray-800">{item.name}</p>
                                <p className="text-[10px] text-gray-400 font-bold">{item.qty} · {item.unitPrice.toLocaleString()}đ/kg</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="w-full md:w-80 flex flex-col gap-3 justify-center">
                      {order.status === 'ARRIVED_AT_WAREHOUSE' && (
                        <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-3xl text-center">
                          <CheckCircle2 className="size-8 text-emerald-600 mx-auto mb-3" />
                          <p className="text-sm font-black text-emerald-700">Nhận hàng thành công</p>
                          <p className="text-[10px] text-emerald-500 font-bold mt-1">Đã tới kho lúc {order.time}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setOrderDetailId(order.id)}
                          className="py-3 border border-gray-100 text-gray-600 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-all">
                          <FileText className="size-4" /> Thông tin đơn
                        </button>
                        <button onClick={() => setReportingOrderId(order.id)}
                          className="py-3 border border-red-50 text-red-500 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 hover:bg-red-50 transition-all">
                          <XCircle className="size-4" /> Báo cáo vấn đề
                        </button>
                      </div>
                      {order.hasTracking && (
                        <button onClick={() => setTrackingOrderId(order.id)}
                          className="w-full py-3 bg-primary/10 text-primary font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all shadow-sm shadow-primary/10 mt-3">
                          <Navigation className="size-4" /> Xem tracking
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ── SECTION 3: CHẤT LƯỢNG ── */}
          {showConfirmed && (
            <>
              {(activeTab === 'all') && <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 pt-2">Đã xác nhận — Đang xử lý</p>}
              {(activeTab === 'qualityChecking') && <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 pt-2">Đang kiểm định</p>}
              {(activeTab === 'qualityChecked') && <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 pt-2">Đã kiểm tra</p>}
              {(activeTab === 'qualityApproved') && <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 pt-2">Đạt chất lượng</p>}
              {currentQualityOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden hover:border-primary/20 transition-all opacity-90">
                  <div className="px-8 py-5 bg-gray-50/50 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-black text-gray-400">#{order.id}</span>
                      <span className="text-[11px] text-gray-400 font-bold">Xác nhận lúc: {order.confirmedTime}, 14/10/2024</span>
                      <span className="px-2 py-0.5 bg-green-50 text-primary text-[10px] font-black uppercase rounded-md flex items-center gap-1">
                        <CheckCircle className="size-3" /> Đã xác nhận
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-black text-gray-700">{order.qty}</span>
                    </div>
                  </div>
                  <div className="p-8 flex flex-col md:flex-row gap-8">
                    <div className="flex-1 flex flex-col gap-6">
                      <div className="flex items-center gap-4">
                        <img src={order.avatar} className="size-12 rounded-full object-cover" alt="" />
                        <div>
                          <h4 className="text-sm font-black text-gray-900">{order.farmer}</h4>
                          <p className="text-[11px] text-gray-400 font-bold">{order.phone} · Shop</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Chi tiết hàng hóa</p>
                        <div className="flex flex-wrap gap-3">
                          {order.orderInfo.items.map((item, j) => (
                            <div key={j} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                              <img src={item.image} className="size-10 rounded-xl object-cover" alt="" />
                              <div>
                                <p className="text-xs font-bold text-gray-800">{item.name}</p>
                                <p className="text-[10px] text-gray-400 font-bold">{item.qty} · {item.unitPrice.toLocaleString()}đ/kg</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Timeline */}
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Tiến trình xử lý</p>
                        <div className="flex items-center gap-0">
                          {(() => {
                            const confirmed = order.status !== 'SHIPPING_TO_WAREHOUSE';
                            const qualityDone = ['QUALITY_CHECKED', 'QUALITY_APPROVED', 'QUALITY_REJECTED'].includes(order.status);
                            return [
                              { label: 'Đến kho', time: order.time, done: confirmed },
                              { label: 'Xác nhận', time: order.time, done: confirmed },
                              { label: 'Kiểm duyệt', time: qualityDone ? order.time : order.status === 'QUALITY_CHECKING' ? 'Đang kiểm' : 'Đang chờ', done: qualityDone },
                              { label: 'Đóng gói', time: '--', done: false },
                            ];
                          })().map((step, i, arr) => (
                            <React.Fragment key={i}>
                              <div className="flex flex-col items-center gap-1">
                                <div className={`size-7 rounded-full flex items-center justify-center border-2 ${step.done ? 'bg-primary border-primary' : 'bg-white border-gray-200'}`}>
                                  {step.done ? <CheckCircle className="size-3.5 text-white" /> : <Clock className="size-3 text-gray-300" />}
                                </div>
                                <p className={`text-[9px] font-black ${step.done ? 'text-primary' : 'text-gray-300'}`}>{step.label}</p>
                                <p className="text-[8px] text-gray-400 font-medium">{step.time}</p>
                              </div>
                              {i < arr.length - 1 && (
                                <div className={`flex-1 h-0.5 mb-6 ${step.done && arr[i + 1].done ? 'bg-primary' : step.done ? 'bg-gradient-to-r from-primary to-gray-200' : 'bg-gray-200'}`} />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="w-full md:w-80 flex flex-col gap-4 justify-center border-l border-gray-100 md:pl-8">
                      <div className={`p-6 rounded-[32px] text-center w-full ${order.status === 'QUALITY_REJECTED' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-green-50 border-primary/10 text-primary'}`}>
                        <CheckCircle2 className={`size-10 mx-auto mb-3 ${order.status === 'QUALITY_REJECTED' ? 'text-red-600' : 'text-primary'}`} />
                        <p className="text-sm font-black">
                          {order.status === 'QUALITY_CHECKING' && 'Đang kiểm duyệt'}
                          {order.status === 'QUALITY_CHECKED' && 'Đã kiểm duyệt'}
                          {order.status === 'QUALITY_APPROVED' && 'Đạt chất lượng'}
                          {order.status === 'QUALITY_REJECTED' && 'Không đạt chất lượng'}
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold mt-1">{order.nextStep || 'Đang cập nhật tiến độ'}</p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-3">
                        <Package className="size-5 text-blue-500 shrink-0" />
                        <div>
                          <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Bước tiếp theo</p>
                          <p className="text-xs font-bold text-blue-600 mt-0.5">{order.nextStep}</p>
                        </div>
                      </div>
                      <button onClick={() => setOrderDetailId(order.id)}
                        className="w-full py-3 border border-gray-100 text-gray-600 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-all">
                        <FileText className="size-4" /> Xem thông tin đơn hàng
                      </button>
                      {order.hasTracking && (
                        <button onClick={() => setTrackingOrderId(order.id)}
                          className="w-full py-3 bg-primary/10 text-primary font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all shadow-sm shadow-primary/10">
                          <Navigation className="size-4" /> Xem vận đơn
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ── SECTION 4: CÓ VẤN ĐỀ ── */}
          {showIssues && (
            <>
              {(activeTab === 'all') && <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 pt-2">Có vấn đề — Đang xử lý</p>}
              {qualityRejectedOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-[32px] border border-red-100 shadow-sm overflow-hidden hover:border-red-200 transition-all">
                  <div className="px-8 py-5 bg-red-50/50 border-b border-red-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-black text-red-500">#{order.id}</span>
                      <span className="text-[11px] text-gray-400 font-bold">Đến kho lúc: {order.time}</span>
                      <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-black uppercase rounded-md flex items-center gap-1">
                        <AlertTriangle className="size-3" /> {order.issueType}
                      </span>
                    </div>
                    <span className="text-sm font-black text-gray-700">{order.qty}</span>
                  </div>
                  <div className="p-8 flex flex-col md:flex-row gap-8">
                    <div className="flex-1 flex flex-col gap-6">
                      <div className="flex items-center gap-4">
                        <img src={order.avatar} className="size-12 rounded-full object-cover" alt="" />
                        <div>
                          <h4 className="text-sm font-black text-gray-900">{order.farmer}</h4>
                          <p className="text-[11px] text-gray-400 font-bold">{order.phone} · Shop</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Chi tiết hàng hóa</p>
                        <div className="flex flex-wrap gap-3">
                          {order.orderInfo.items.map((item, j) => (
                            <div key={j} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                              <img src={order.avatar} className="size-10 rounded-xl object-cover" alt="" />
                              <div>
                                <p className="text-xs font-bold text-gray-800">{item.name}</p>
                                <p className="text-[10px] text-gray-400 font-bold">{item.qty}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Issue detail */}
                      <div className="p-5 bg-red-50 border border-red-100 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="size-4 text-red-500 shrink-0" />
                          <p className="text-xs font-black text-red-700 uppercase tracking-wide">Mô tả vấn đề</p>
                        </div>
                        <p className="text-sm text-red-600 font-medium leading-relaxed">{order.issueDetail}</p>
                        <p className="text-[10px] text-red-400 font-bold mt-3">Báo cáo bởi: {order.reportedBy} · {order.reportedTime}, 14/10/2024</p>
                      </div>
                    </div>

                    <div className="w-full md:w-80 flex flex-col gap-3 justify-center border-l border-gray-100 md:pl-8">
                      <div className="p-5 bg-orange-50 border border-orange-100 rounded-[24px] text-center mb-1">
                        <div className="size-12 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <RefreshCw className="size-5 text-orange-500" />
                        </div>
                        <p className="text-sm font-black text-orange-700">Đang chờ xử lý</p>
                        <p className="text-[10px] text-orange-500 font-bold mt-1">Admin đang xem xét vấn đề</p>
                      </div>

                      <button onClick={() => setOrderDetailId(order.id)}
                        className="w-full py-3 border border-gray-100 text-gray-600 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-all">
                        <FileText className="size-4" /> Xem thông tin đơn hàng
                      </button>
                      {order.hasTracking && (
                        <button onClick={() => setTrackingOrderId(order.id)}
                          className="w-full py-3 bg-primary/10 text-primary font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all shadow-sm shadow-primary/10">
                          <Navigation className="size-4" /> Xem tracking
                        </button>
                      )}
                      <button className="w-full py-3 border border-orange-100 text-orange-600 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 hover:bg-orange-50 transition-all">
                        <MessageSquare className="size-4" /> Liên hệ shop
                      </button>

                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="p-10 border-t border-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Hiển thị 1-5 trong số 5 đơn hàng</p>
          <div className="flex items-center gap-2">
            <button className="size-10 border border-gray-100 rounded-2xl flex items-center justify-center text-gray-300 hover:bg-gray-50">
              <ChevronRight className="size-4 rotate-180" />
            </button>
            <button className="size-10 bg-primary text-white rounded-2xl flex items-center justify-center text-sm font-black">1</button>
            <button className="size-10 border border-gray-100 rounded-2xl flex items-center justify-center text-gray-300 hover:bg-gray-50">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL: XEM ẢNH KIỂM DUYỆT PHÓNG TO ── */}
      {qualityImageUrl && qualityReviewItem?.qualityResult?.qualityCheckingResponses && (
        <ImageLightbox
          imageUrl={qualityImageUrl}
          alt="Ảnh phóng to"
          images={qualityReviewItem.qualityResult.qualityCheckingResponses[qualityCurrentResponseIdx]?.images}
          currentIndex={qualityImageIndex}
          onIndexChange={(newIndex) => {
            setQualityImageIndex(newIndex);
            const images = qualityReviewItem.qualityResult?.qualityCheckingResponses[qualityCurrentResponseIdx]?.images || [];
            if (images[newIndex]) {
              setQualityImageUrl(images[newIndex].imageUrl);
            }
          }}
          onClose={() => setQualityImageUrl(null)}
        />
      )}

      {/* ── MODAL: THEO DÕI HÀNH TRÌNH ── */}
      {qualityReviewItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white w-full max-w-[520px] rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh]">
            <div className="p-8 overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between mb-5 gap-4">
                <div>
                  <h3 className="text-xl font-black text-gray-900">Thông tin kiểm duyệt</h3>
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
                      <p className="text-sm font-black text-gray-900">{qualityReviewItem.qualityResult?.qualityResult === 'APPROVED' ? 'Đạt' : 'Không đạt'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-black text-gray-400">Ghi chú</p>
                      <p className="text-sm font-medium text-gray-700">{qualityReviewItem.qualityResult?.note || 'Không có'}</p>
                    </div>
                    {qualityReviewItem.qualityResult?.qualityResult === 'REJECTED' && qualityReviewItem.qualityResult?.rejectedWeight != null && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-black text-red-600">Khối lượng ko đạt</p>
                        <p className="text-sm font-black text-red-600">{qualityReviewItem.qualityResult.rejectedWeight} kg</p>
                      </div>
                    )}
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
                          <button
                            key={imageIndex}
                            type="button"
                            onClick={() => {
                              setQualityImageUrl(image.imageUrl);
                              setQualityImageIndex(imageIndex);
                              setQualityCurrentResponseIdx(idx);
                            }}
                            className="w-full h-20 object-cover rounded-2xl overflow-hidden border border-gray-100 hover:border-primary transition-all cursor-pointer hover:opacity-80"
                          >
                            <img
                              src={image.imageUrl}
                              alt={`Ảnh tiêu chí ${idx + 1} - ${imageIndex + 1}`}
                              className="w-full h-20 object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {trackingOrder && (
        <>
          <div className="fixed inset-0 z-[100] overflow-y-auto px-4 py-8 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="mx-auto bg-white w-full max-w-[620px] rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh]">
              <div className="p-8 overflow-y-auto max-h-[90vh]">
                <div className="flex items-center justify-between mb-6 gap-4">
                  <div>
                    <h3 className="text-xl font-black text-gray-900">Theo Dõi Hành Trình</h3>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">#{trackingOrder.id} · {trackingOrder.product}</p>
                  </div>
                  <button onClick={() => setTrackingOrderId(null)} className="size-9 rounded-2xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50">
                    <X className="size-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-5 mb-6">
                  <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-black text-gray-400 mb-1">Trạng thái đơn hàng</p>
                        <p className="text-sm font-black text-gray-900">{trackingOrder.statusLabel}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-widest font-black text-gray-400 mb-1">Tổng sản phẩm</p>
                        <p className="text-sm font-black text-gray-900">{trackingOrder.qty}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 bg-blue-50 rounded-3xl border border-blue-100">
                    <div className="flex items-center gap-4">
                      <img src={trackingOrder.avatar} className="size-12 rounded-3xl object-cover" alt="" />
                      <div>
                        <p className="text-sm font-black text-gray-900">{trackingOrder.farmer}</p>
                        <p className="text-[11px] text-gray-500 mt-1">{trackingOrder.phone}</p>
                        <p className="text-[10px] uppercase tracking-widest text-blue-700 font-black mt-3">{trackingOrder.product}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  {trackingOrder.trackings.length === 0 ? (
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
                              <p className="text-sm font-black text-gray-900">{getOrderStatusLabel(tracking.status)}</p>
                              <p className="text-[11px] text-gray-400 mt-1">{new Date(tracking.createdAt).toLocaleString('vi-VN')}</p>
                            </div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-primary">{trackingOrder.statusLabel}</div>
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

      {/* ── MODAL: XÁC NHẬN ĐÃ NHẬN HÀNG ── */}
      {confirmingOrderId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-[480px] rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative">
            <button
              type="button"
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              onClick={() => {
                setConfirmingOrderId(null);
                setConfirmEvidenceFiles([]);
                setConfirmError(null);
              }}
            >
              <X className="size-5" />
            </button>
            <div className="p-8">
              <div className="flex flex-col items-center text-center gap-4 mb-6">
                <div className="size-20 rounded-full bg-green-50 flex items-center justify-center">
                  <CheckCircle2 className="size-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-black text-gray-900">Xác nhận đã nhận hàng</h3>
                <p className="text-sm text-gray-500 max-w-[380px]">
                  Bạn có thể chọn nhiều ảnh evidence khi xác nhận nhận hàng. Ảnh là tùy chọn, có thể bỏ qua.
                </p>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-black text-gray-700">Ảnh chứng cứ (Tùy chọn)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleEvidenceFilesChange}
                  className="w-full rounded-3xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 file:mr-4 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-white file:font-black"
                />
                {confirmEvidenceFiles.length > 0 && (
                  <p className="text-sm text-gray-500">Đã chọn {confirmEvidenceFiles.length} ảnh.</p>
                )}
                {confirmError && <p className="text-sm text-red-500">{confirmError}</p>}
              </div>

              <div className="mt-8 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleConfirmArrival}
                  disabled={isSubmittingConfirm}
                  className="w-full py-4 rounded-2xl bg-primary text-white font-black hover:bg-primary/90 transition-all disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmittingConfirm ? 'Đang xác nhận...' : 'Xác nhận nhận hàng'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmingOrderId(null);
                    setConfirmEvidenceFiles([]);
                    setConfirmError(null);
                  }}
                  className="w-full py-4 rounded-2xl border border-gray-200 text-gray-600 font-black hover:bg-gray-50 transition-all"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: BÁO CÁO ── */}
      {reportingOrderId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-[440px] rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative">
            <div className="p-8 flex flex-col items-center text-center">
              <div className="size-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                <div className="size-14 bg-red-100 rounded-full flex items-center justify-center text-red-500"><AlertTriangle className="size-8" /></div>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3">Báo Cáo Vấn Đề</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed px-4 mb-4">
                Mô tả vấn đề với đơn hàng <span className="text-primary font-black">#{reportingOrderId}</span>:
              </p>
              <textarea rows={4} placeholder="VD: Hàng bị dập, thiếu số lượng, sai sản phẩm..."
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium text-gray-700 outline-none focus:border-red-300 focus:ring-2 focus:ring-red-50 resize-none text-left" />
              <div className="w-full flex flex-col gap-3 mt-4">
                <button onClick={() => setReportingOrderId(null)}
                  className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl transition-all shadow-lg shadow-red-500/20 transform active:scale-[0.98]">
                  GỬI BÁO CÁO
                </button>
                <button onClick={() => setReportingOrderId(null)} className="w-full py-4 bg-gray-50 hover:bg-gray-100 text-gray-500 font-bold rounded-2xl transition-all">Quay lại</button>
              </div>
            </div>
            <button onClick={() => setReportingOrderId(null)} className="absolute top-6 right-6 text-gray-300 hover:text-gray-900 transition-colors"><X className="size-6" /></button>
          </div>
        </div>
      )}

      {/* ── MODAL: THÔNG TIN ĐƠN HÀNG ── */}
      {orderDetailId && orderDetailData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-[680px] rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                    <FileText className="size-5 text-orange-400" /> Thông Tin Đơn Hàng
                  </h3>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">#{orderDetailData.id}</p>
                </div>
                <button onClick={() => setOrderDetailId(null)} className="size-9 rounded-2xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50">
                  <X className="size-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Sản phẩm</p>
                  <div className="flex flex-col gap-3">
                    {orderDetailData.orderInfo.items.map((item, j) => {
                      const matchedItem = orderDetailData.orderItems[j];
                      const hasItemQuality = Boolean(matchedItem?.qualityResult);
                      return (
                        <div key={j} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                          <div>
                            <p className="text-sm font-black text-gray-800">{item.name}</p>
                            <p className="text-[11px] text-gray-400 font-medium mt-0.5">{item.qty} × {item.unitPrice.toLocaleString()}đ/kg</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {hasItemQuality && (
                              <button
                                type="button"
                                onClick={() => setQualityReviewItem(matchedItem)}
                                className="text-[10px] font-black text-primary border border-primary rounded-full px-3 py-2 hover:bg-primary/10 transition-all"
                              >
                                Xem kiểm duyệt
                              </button>
                            )}
                            <span className="text-sm font-black text-primary">{item.total.toLocaleString()}đ</span>
                          </div>
                        </div>
                      );
                    })}
                    <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                      <div className="flex justify-between text-xs font-bold text-gray-500 mb-1"><span>TẠM TÍNH:</span><span>{orderDetailData.orderInfo.subtotal.toLocaleString()}đ</span></div>
                      <div className="flex justify-between text-xs font-bold text-gray-500 mb-2"><span>PHÍ VẬN CHUYỂN:</span><span>{orderDetailData.orderInfo.shipping.toLocaleString()}đ</span></div>
                      <div className="flex justify-between text-sm font-black text-primary border-t border-green-200 pt-2"><span>TỔNG CỘNG:</span><span>{orderDetailData.orderInfo.total.toLocaleString()}đ</span></div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span>🏋️</span>
                      <span className="text-xs font-black text-gray-500">Tổng trọng lượng: <span className="text-primary">{orderDetailData.orderInfo.weight}</span></span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Thông tin khách hàng</p>
                  <div className="flex flex-col gap-3 mb-4">
                    {[{ label: 'Tên', value: orderDetailData.orderInfo.customer.name }, { label: 'Địa chỉ', value: orderDetailData.orderInfo.customer.address }, { label: 'Số điện thoại', value: orderDetailData.orderInfo.customer.phone }].map((field, j) => (
                      <div key={j} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{field.label}</p>
                        <p className="text-sm font-bold text-gray-800">{field.value}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Tìm Shipper</p>
                  {assignedShippers[orderDetailData.id] ? (
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3">
                      <Truck className="size-4 text-blue-500" />
                      <p className="text-xs font-black text-blue-700">Đã giao: {nearbyShippers.find(s => s.id === assignedShippers[orderDetailData.id])?.name}</p>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => setShowShippers(!showShippers)} className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white rounded-xl text-xs font-black mb-3">
                        <Search className="size-3" /> {showShippers ? 'Ẩn' : 'Tìm shipper'} <ChevronDown className={`size-3 transition-transform ${showShippers ? 'rotate-180' : ''}`} />
                      </button>
                      {showShippers && (
                        <div className="flex flex-col gap-2">
                          {nearbyShippers.map(shipper => (
                            <div key={shipper.id} onClick={() => setSelectedShipper(shipper.id)}
                              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedShipper === shipper.id ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}>
                              <img src={shipper.avatar} className="size-9 rounded-xl object-cover" alt="" />
                              <div className="flex-1">
                                <p className="text-xs font-black text-gray-900">{shipper.name}</p>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                                  <span>{shipper.distance}</span>
                                  <span className="flex items-center gap-0.5"><Star className="size-2.5 text-yellow-400 fill-yellow-400" />{shipper.rating}</span>
                                </div>
                              </div>
                              {selectedShipper === shipper.id && <CheckCircle className="size-4 text-primary" />}
                            </div>
                          ))}
                          {selectedShipper && (
                            <button onClick={() => { setAssignedShippers(p => ({ ...p, [orderDetailData.id]: selectedShipper })); setShowShippers(false); setSelectedShipper(null); }}
                              className="w-full py-2.5 bg-primary text-white rounded-xl text-xs font-black mt-1">
                              Giao cho {nearbyShippers.find(s => s.id === selectedShipper)?.name} →
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <button onClick={() => setOrderDetailId(null)} className="w-full py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black text-gray-500 hover:bg-gray-100 transition-all mt-6">
                Quay lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncomingOrders;