import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { notificationService, NotificationItem, orderService } from '../../services';
import {
  shipperService,
  AvailableOrderResponse,
  ShipperOrderResponse,
} from '../../services/shipper.service';
import { PageResponse } from '../../types';
import { API_BASE_URL, TOKEN_KEY } from '../../services/api.config';
import {
  Bell, MapPin, Wallet, Navigation, Zap, Clock, Bike, Package,
  ArrowRight, User, LogOut, Truck, CheckCircle2, X, Info,
  RefreshCw, Loader2, Radio, StopCircle, WifiOff, Store, MessageSquare, Camera, ImagePlus
} from 'lucide-react';
import FakeGPS from './Fakegps';
import { authService } from '../../services/auth.service';
import type { UserResponse } from '../../services/auth.service';
import { getCodCollectAmount, getCodPrepaidAmount, isCodOrder } from '../../services/codSettlement.service';
import { globalShowAlert } from '../../contexts/PopupContext';

interface ShipperDashboardProps {
  onLogout: () => void;
}

type GpsStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'error';
type TrackingStatus = 'off' | 'starting' | 'active' | 'error';

const ShipperDashboard: React.FC<ShipperDashboardProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Đơn hàng mới');
  const [radius, setRadius] = useState('5km');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle');
  const [shipperLat, setShipperLat] = useState<number | null>(null);
  const [shipperLng, setShipperLng] = useState<number | null>(null);
  const [availableOrders, setAvailableOrders] = useState<AvailableOrderResponse[]>([]);
  const [ordersPage, setOrdersPage] = useState<PageResponse<AvailableOrderResponse> | null>(null);
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const [myOrders, setMyOrders] = useState<ShipperOrderResponse[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingMyOrders, setLoadingMyOrders] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [acceptingOrderId, setAcceptingOrderId] = useState<number | null>(null);
  const [acceptSuccess, setAcceptSuccess] = useState<number | null>(null);
  const [codAcceptOrder, setCodAcceptOrder] = useState<AvailableOrderResponse | null>(null);
  const [completeModal, setCompleteModal] = useState<{
    orderId: number;
    status: 'DELIVERED' | 'FAILED';
    recipientName?: string;
  } | null>(null);
  const [completeNote, setCompleteNote] = useState('');
  const [completeFiles, setCompleteFiles] = useState<File[]>([]);
  const [completePreviews, setCompletePreviews] = useState<string[]>([]);
  const [completingOrder, setCompletingOrder] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>('off');
  const [trackingOrderId, setTrackingOrderId] = useState<number | null>(null);
  // ✅ Fake GPS: orderId đang mở panel fake GPS
  const [fakeGpsOrderId, setFakeGpsOrderId] = useState<number | null>(null);
  // ✅ Thông tin shipper đang login
  const [myProfile, setMyProfile] = useState<UserResponse | null>(() => authService.getUserInfo());

  const stompClientRef = useRef<Client | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const trackingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentPosRef = useRef<{ lat: number; lng: number } | null>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // ✅ Fetch thông tin shipper đang login
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await authService.getMyInfo();
        if (res.result) setMyProfile(res.result);
      } catch { console.warn('Cannot fetch shipper profile'); }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const fetch = async () => {
      setLoadingNotifications(true);
      try {
        const res = await notificationService.getMyNotifications();
        if (res.result) setNotifications(res.result);
      } catch { } finally { setLoadingNotifications(false); }
    };
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMyOrders = async () => {
    setLoadingMyOrders(true);
    try {
      const res = await shipperService.getMyOrders();
      const shippingOrders = (res.result ?? []).filter((o: ShipperOrderResponse) => o.status === 'SHIPPING');

      const enriched = await Promise.all(
        shippingOrders.map(async (order) => {
          try {
            const detail = await orderService.getOrderById(order.orderId);
            if (detail.result) {
              return {
                ...order,
                paymentMethod: detail.result.paymentMethod ?? order.paymentMethod,
                totalAmount: detail.result.totalAmount ?? order.totalAmount,
                codAmount: detail.result.codAmount ?? order.codAmount,
                codPrepaidAmount: detail.result.codPrepaidAmount ?? order.codPrepaidAmount,
                shippingDiscountAmount: detail.result.shippingDiscountAmount ?? order.shippingDiscountAmount,
                refundAmount: detail.result.refundAmount ?? order.refundAmount,
                refundReason: detail.result.refundReason ?? order.refundReason,
              };
            }
          } catch {
            // Giữ dữ liệu shipper nếu không lấy được chi tiết đơn
          }
          return order;
        })
      );

      setMyOrders(enriched);
    } catch { } finally { setLoadingMyOrders(false); }
  };

  useEffect(() => {
    if (activeTab === 'Đơn đang giao') fetchMyOrders();
  }, [activeTab]);

  const requestGpsAndFetchOrders = useCallback(() => {
    if (!navigator.geolocation) { setGpsStatus('error'); return; }
    setGpsStatus('loading');
    setOrdersError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setShipperLat(pos.coords.latitude);
        setShipperLng(pos.coords.longitude);
        setGpsStatus('granted');
        fetchNearbyOrders(pos.coords.latitude, pos.coords.longitude);
      },
      () => { setGpsStatus('denied'); setOrdersError('Không lấy được GPS.'); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    if (activeTab === 'Đơn hàng mới') {
      // Load paged orders for shipper (no nearby-only logic)
      fetchAvailableOrders(pageIndex, pageSize);
    }
  }, [activeTab, pageIndex, pageSize]);

  const fetchNearbyOrders = async (lat: number, lng: number) => {
    setLoadingOrders(true);
    try {
      const res = await shipperService.getNearbyOrders(lat, lng);
      setAvailableOrders(res.result ?? []);
    } catch { setOrdersError('Không tải được danh sách đơn.'); }
    finally { setLoadingOrders(false); }
  };

  const fetchAvailableOrders = async (p = 0, s = 10) => {
    setLoadingOrders(true);
    setOrdersError(null);
    try {
      const res = await shipperService.getAvailableOrders(p, s);
      if (res.result) {
        setOrdersPage(res.result);
        setAvailableOrders(res.result.content ?? []);
      } else {
        setAvailableOrders([]);
      }
    } catch (err) {
      setOrdersError('Không tải được danh sách đơn.');
      setAvailableOrders([]);
    } finally { setLoadingOrders(false); }
  };

  const handleAcceptOrder = async (order: AvailableOrderResponse, codPaymentOption?: 'CASH' | 'WALLET') => {
    if ((order.paymentMethod ?? '').toUpperCase() === 'COD' && !codPaymentOption) {
      setCodAcceptOrder(order);
      return;
    }
    const orderId = order.orderId;
    setAcceptingOrderId(orderId);
    try {
      await shipperService.acceptOrder(orderId, codPaymentOption);
      setAcceptSuccess(orderId);
      setCodAcceptOrder(null);
      setAvailableOrders(prev => prev.filter(o => o.orderId !== orderId));
      setTimeout(() => setAcceptSuccess(null), 3000);
    } catch (err: any) {
      const errorCode = err?.data?.code;
      const apiMessage = err?.data?.message || err?.message;
      const message = errorCode === 4009
        ? 'Đơn này đã được shipper khác nhận rồi.'
        : errorCode === 3004
          ? 'Số dư ví shipper không đủ để ứng COD. Số tiền ứng gồm tiền hàng và phí nền tảng từ phí ship, vui lòng nạp thêm tiền vào ví rồi thử lại.'
          : apiMessage || 'Không thể nhận đơn. Vui lòng thử lại sau.';
      globalShowAlert(message, 'Lỗi', 'error');
    } finally { setAcceptingOrderId(null); }
  };

  const startTracking = useCallback((orderId: number) => {
    if (!navigator.geolocation) { globalShowAlert('Trình duyệt không hỗ trợ GPS', 'Lỗi', 'error'); return; }
    setTrackingStatus('starting');
    setTrackingOrderId(orderId);
    const token = localStorage.getItem(TOKEN_KEY);
    const baseUrl = API_BASE_URL.endsWith('/api/v1') ? API_BASE_URL.slice(0, -7) : API_BASE_URL;
    const client = new Client({
      webSocketFactory: () => new (SockJS as any)(`${baseUrl}/api/v1/ws`),
      reconnectDelay: 5000,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      onConnect: () => {
        setTrackingStatus('active');
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            currentPosRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setShipperLat(pos.coords.latitude);
            setShipperLng(pos.coords.longitude);
          },
          (err) => console.error('GPS watch:', err),
          { enableHighAccuracy: true, maximumAge: 3000 }
        );
        trackingIntervalRef.current = setInterval(() => {
          const pos = currentPosRef.current;
          if (!pos || !client.connected) return;
          client.publish({
            destination: '/app/shipper/location',
            body: JSON.stringify({ orderId, latitude: pos.lat, longitude: pos.lng }),
          });
        }, 3000);
      },
      onDisconnect: () => setTrackingStatus(prev => prev === 'active' ? 'error' : prev),
      onStompError: () => setTrackingStatus('error'),
    });
    client.activate();
    stompClientRef.current = client;
  }, []);

  const stopTracking = useCallback(() => {
    if (trackingIntervalRef.current) { clearInterval(trackingIntervalRef.current); trackingIntervalRef.current = null; }
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    if (stompClientRef.current) { stompClientRef.current.deactivate(); stompClientRef.current = null; }
    setTrackingStatus('off');
    setTrackingOrderId(null);
    currentPosRef.current = null;
  }, []);

  useEffect(() => () => stopTracking(), []);

  const openCompleteModal = (orderId: number, status: 'DELIVERED' | 'FAILED', recipientName?: string) => {
    setCompleteModal({ orderId, status, recipientName });
    setCompleteNote('');
    setCompleteFiles([]);
    setCompletePreviews((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
  };

  const closeCompleteModal = () => {
    setCompleteModal(null);
    setCompleteNote('');
    setCompleteFiles([]);
    setCompletePreviews((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
  };

  const handlePickEvidenceFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const next = Array.from(fileList).slice(0, 5);
    setCompleteFiles(next);
    setCompletePreviews((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return next.map((f) => URL.createObjectURL(f));
    });
  };

  const handleCompleteOrder = async () => {
    if (!completeModal) return;
    const { orderId, status } = completeModal;
    try {
      setCompletingOrder(true);
      await shipperService.updateOrderStatus(
        orderId,
        { status, note: completeNote.trim() || undefined },
        completeFiles.length > 0 ? completeFiles : undefined,
      );
      if (trackingOrderId === orderId) stopTracking();
      closeCompleteModal();
      fetchMyOrders();
      globalShowAlert(
        status === 'DELIVERED' ? 'Giao hàng thành công!' : 'Đã đánh dấu thất bại',
        'Cập nhật',
        status === 'DELIVERED' ? 'success' : 'warning',
      );
    } catch (errors: any) {
      globalShowAlert(errors?.data?.message || 'Không thể cập nhật trạng thái', 'Lỗi', 'error');
    } finally {
      setCompletingOrder(false);
    }
  };

  // ===================== HELPERS =====================
  const fmtCur = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

  const fmtDist = (km: number | null | undefined) => {
    if (km == null) return '?';
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  const fmtTime = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    return diff < 1 ? 'Vừa xong' : diff < 60 ? `${diff} phút trước` : new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const renderCodCollectLine = (order: ShipperOrderResponse) => {
    if (!isCodOrder(order)) return null;

    const collectAmount = getCodCollectAmount(order);
    const prepaidAmount = getCodPrepaidAmount(order);
    const refundAmount = order.refundAmount ?? 0;
    const prepaidLabel = order.codPaymentOption === 'CASH'
      ? 'Tiền hàng + phí nền tảng đã chọn nộp tiền mặt cho admin'
      : 'Tiền hàng + phí nền tảng đã ứng từ ví shipper';

    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-black uppercase shrink-0">
              COD
            </span>
            <span className="text-xs font-black text-amber-800 truncate">
              Cần thu từ khách: {fmtCur(collectAmount)}
            </span>
          </div>
          {order.totalAmount != null && order.totalAmount !== collectAmount && (
            <span className="text-[10px] font-bold text-amber-700 shrink-0">
              Tổng đơn: {fmtCur(order.totalAmount)}
            </span>
          )}
        </div>
        {refundAmount > 0 && (
          <p className="text-[11px] font-bold text-orange-700">
            Đã trừ hoàn tiền: {fmtCur(refundAmount)}
          </p>
        )}
        <p className="text-[11px] font-black text-amber-800">
          {prepaidLabel}: {fmtCur(prepaidAmount)}
        </p>
        <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
          Lưu ý: COD cần thu là tổng tiền khách trả. Số tiền ứng gồm tiền hàng và 10% phí nền tảng từ phí ship.
        </p>
      </div>
    );
  };

  // ===================== RENDER: ĐƠN ĐANG GIAO =====================
  const renderMyOrders = () => {
    if (loadingMyOrders) return <div className="flex justify-center py-20"><Loader2 className="size-8 text-primary animate-spin" /></div>;
    if (myOrders.length === 0) return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="size-24 bg-gray-50 rounded-[40px] flex items-center justify-center text-gray-200 border border-gray-100"><Truck className="size-12" /></div>
        <p className="text-lg font-black text-gray-400 uppercase">Chưa có đơn đang giao</p>
      </div>
    );
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        {myOrders.map((order) => {
          const isTracking = trackingOrderId === order.orderId;
          const codOrder = isCodOrder(order);
          const codCollectAmount = codOrder ? getCodCollectAmount(order) : 0;
          const codPrepaidAmount = codOrder ? getCodPrepaidAmount(order) : 0;
          return (
            <div key={order.orderId} className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-8 flex flex-col gap-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Đơn #{order.orderId}</p>
                  <h3 className="text-lg font-black text-gray-900 mt-1">{order.recipientName}</h3>
                  <p className="text-xs text-gray-500 mt-1">{order.shippingAddress}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Tiền ship nhận</p>
                  <p className="text-xl font-black text-primary">{fmtCur(order.shippingFee)}</p>
                  {codOrder && (
                    <>
                      <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mt-2">Cần thu COD</p>
                      <p className="text-lg font-black text-amber-600">{fmtCur(codCollectAmount)}</p>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-2">Đã ứng cho admin</p>
                      <p className="text-sm font-black text-gray-700">{fmtCur(codPrepaidAmount)}</p>
                    </>
                  )}
                </div>
              </div>
              {renderCodCollectLine(order)}
              <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${isTracking && trackingStatus === 'active' ? 'bg-green-50 border border-green-100' :
                isTracking && trackingStatus === 'starting' ? 'bg-yellow-50 border border-yellow-100' :
                  'bg-gray-50 border border-gray-100'
                }`}>
                {isTracking && trackingStatus === 'active' ? (
                  <><div className="size-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs font-black text-green-700">Đang phát GPS live</span>
                    {shipperLat && <span className="text-[10px] text-green-500 ml-auto font-mono">{shipperLat.toFixed(4)}, {shipperLng?.toFixed(4)}</span>}</>
                ) : isTracking && trackingStatus === 'starting' ? (
                  <><Loader2 className="size-4 text-yellow-600 animate-spin" /><span className="text-xs font-black text-yellow-700">Đang kết nối...</span></>
                ) : (
                  <><Radio className="size-4 text-gray-400" /><span className="text-xs font-black text-gray-400">GPS chưa bật</span></>
                )}
              </div>
              <div className="flex gap-3 items-stretch">
                {!isTracking ? (
                  <button onClick={() => startTracking(order.orderId)} disabled={trackingStatus !== 'off'}
                    className="flex-1 min-w-0 h-12 px-3 bg-blue-500 text-white text-xs font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-600 transition-all disabled:opacity-40 whitespace-nowrap">
                    <Navigation className="size-4 shrink-0" /> Bật GPS
                  </button>
                ) : (
                  <button onClick={stopTracking}
                    className="flex-1 min-w-0 h-12 px-3 bg-gray-200 text-gray-700 text-xs font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-300 transition-all whitespace-nowrap">
                    <StopCircle className="size-4 shrink-0" /> Dừng GPS
                  </button>
                )}
                <button onClick={() => openCompleteModal(order.orderId, 'DELIVERED', order.recipientName)}
                  title={codOrder ? 'Xác nhận đã thu đúng tiền COD từ khách' : undefined}
                  className="flex-1 min-w-0 h-12 px-3 bg-primary text-white text-xs font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 whitespace-nowrap">
                  <CheckCircle2 className="size-4 shrink-0" /> Đã giao
                </button>
                <button onClick={() => openCompleteModal(order.orderId, 'FAILED', order.recipientName)}
                  className="h-12 w-12 shrink-0 bg-red-50 text-red-500 font-black rounded-2xl hover:bg-red-500 hover:text-white transition-all border border-red-100 flex items-center justify-center">
                  <X className="size-4" />
                </button>
              </div>

              {/* ✅ FAKE GPS PANEL - Toggle hiện/ẩn */}
              <button
                onClick={() => setFakeGpsOrderId(prev => prev === order.orderId ? null : order.orderId)}
                className="w-full py-2.5 border border-dashed border-yellow-300 bg-yellow-50 text-yellow-700 rounded-2xl text-[10px] font-black uppercase tracking-wider hover:bg-yellow-100 transition-all flex items-center justify-center gap-2"
              >
                🎭 {fakeGpsOrderId === order.orderId ? 'Ẩn' : 'Mở'} Demo GPS (Fake GPS)
              </button>

              {fakeGpsOrderId === order.orderId && (
                <FakeGPS
                  orderId={order.orderId}
                  // ✅ Tọa độ thật từ DB — đồng nhất với Tracking
                  shopLat={order.shopLatitude ?? 10.845}
                  shopLng={order.shopLongitude ?? 106.775}
                  destLat={order.shippingLatitude ?? 10.830}
                  destLng={order.shippingLongitude ?? 106.760}
                  currentLat={shipperLat ?? undefined}
                  currentLng={shipperLng ?? undefined}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ===================== RENDER: ORDER CARDS (ĐƠN MỚI) =====================
  const renderOrderCards = () => {
    const ordersToShow = ordersPage?.content ?? availableOrders;
    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
          {ordersToShow.length === 0 ? (
            <div className="col-span-3 flex flex-col items-center justify-center py-24 gap-6 text-center">
              <div className="size-24 bg-gray-50 rounded-[40px] flex items-center justify-center text-gray-200 border border-gray-100"><Package className="size-12" /></div>
              <p className="text-lg font-black text-gray-400 uppercase">
                Không có đơn nào
              </p>
              <p className="text-xs text-gray-400">Thử tải lại</p>
              <button onClick={() => fetchAvailableOrders(pageIndex, pageSize)}
                className="px-8 py-3 bg-primary/10 text-primary rounded-2xl text-xs font-black uppercase flex items-center gap-2">
                <RefreshCw className="size-4" /> Tải lại
              </button>
            </div>
          ) : ordersToShow.map((order) => {
            const codOrder = (order.paymentMethod ?? '').toUpperCase() === 'COD';
            const prepaidAmount = getCodPrepaidAmount(order);
            return (
            <div key={order.orderId} className="bg-white rounded-[40px] border border-gray-100 shadow-sm hover:shadow-xl transition-all p-8 flex flex-col group relative overflow-hidden">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div className="px-3 py-1 rounded-lg flex items-center gap-1.5 bg-gray-50 text-gray-400">
                  <Clock className="size-3" />
                  <span className="text-[10px] font-black uppercase">{fmtTime(order.createdAt)}</span>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Tiền ship nhận</p>
                  <span className="text-2xl font-black text-primary">{fmtCur(order.shippingFee)}</span>
                </div>
              </div>

              {/* Route: shipper → shop → buyer */}
              <div className="space-y-5 relative mb-6">
                <div className="absolute left-2.5 top-2 bottom-2 w-0.5 border-l border-dashed border-gray-200" />

                {/* Điểm lấy hàng (SHOP) */}
                <div className="relative flex items-start gap-4">
                  <div className="size-5 bg-orange-100 border-2 border-white rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm">
                    <div className="size-1.5 bg-orange-500 rounded-full" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">LẤY HÀNG TẠI KHO</p>
                    <h4 className="text-sm font-black text-gray-900">{order.shopName}</h4>
                    <p className="text-[11px] text-gray-500 font-medium leading-tight">{order.shopAddress}</p>
                    {/* ✅ Khoảng cách shipper → shop */}
                    {/* <div className="flex items-center gap-1 mt-1">
                      <Navigation className="size-3 text-orange-500" />
                      <span className="text-[10px] text-orange-600 font-black">
                        {fmtDist(order.shipToShopKm)} từ vị trí bạn
                      </span>
                    </div> */}
                  </div>
                </div>

                {/* Điểm giao hàng (BUYER) */}
                <div className="relative flex items-start gap-4">
                  <div className="size-5 bg-blue-100 border-2 border-white rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm">
                    <div className="size-1.5 bg-blue-500 rounded-full" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">GIAO ĐẾN</p>
                    <h4 className="text-sm font-black text-gray-900">{order.recipientName}</h4>
                    <p className="text-[11px] text-gray-500 font-medium leading-tight">{order.shippingAddress}</p>
                    {/* ✅ Khoảng cách shop → buyer */}
                    {/* <div className="flex items-center gap-1 mt-1">
                      <Navigation className="size-3 text-blue-500" />
                      <span className="text-[10px] text-blue-600 font-black">
                        {fmtDist(order.shopToBuyerKm)} từ shop
                      </span>
                    </div> */}
                  </div>
                </div>
              </div>

              {/* ✅ Tổng khoảng cách */}
              <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-2.5 mb-6 border border-gray-100">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tổng quãng đường</span>
                <span className="text-sm font-black text-gray-800">
                  {order.distanceKm != null
                    ? fmtDist(order.distanceKm)
                    : '?'
                  }
                </span>
              </div>
              {codOrder && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-4">
                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Đơn COD cần ứng trước</p>
                  <p className="text-lg font-black text-amber-800 mt-1">{fmtCur(prepaidAmount)}</p>
                  <p className="text-[11px] text-amber-700 font-semibold mt-1">Chọn trả tiền mặt cho admin hoặc trừ trực tiếp từ ví shipper.</p>
                </div>
              )}

              {/* Nút nhận đơn */}
              <button
                onClick={() => handleAcceptOrder(order)}
                disabled={acceptingOrderId === order.orderId}
                className={`w-full py-4 font-black rounded-2xl flex items-center justify-center gap-2 shadow-xl transition-all transform active:scale-95
              ${acceptSuccess === order.orderId ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-primary-dark'}
              ${acceptingOrderId === order.orderId ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {acceptingOrderId === order.orderId ? <><Loader2 className="size-4 animate-spin" /> Đang xử lý...</> :
                  acceptSuccess === order.orderId ? <><CheckCircle2 className="size-4" /> Đã nhận!</> :
                    <>Nhận đơn này <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" /></>}
              </button>

              <div className="absolute top-0 right-0 size-32 bg-primary/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-2xl group-hover:bg-primary/10 transition-colors" />
            </div>
            );
          })}
        </div>
        {/* Pagination controls when using paged API */}
        {ordersPage && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <button disabled={pageIndex <= 0} onClick={() => setPageIndex(prev => Math.max(0, prev - 1))}
              className="px-4 py-2 bg-white border rounded-2xl disabled:opacity-50">Trước</button>
            <div className="text-sm font-black">{pageIndex + 1} / {ordersPage.totalPages || 1}</div>
            <button disabled={pageIndex + 1 >= (ordersPage.totalPages || 1)} onClick={() => setPageIndex(prev => prev + 1)}
              className="px-4 py-2 bg-white border rounded-2xl disabled:opacity-50">Tiếp</button>
          </div>
        )}
      </>
    );
  };

  // ===================== MAIN RENDER =====================
  return (
    <div className="flex-1 bg-background animate-in fade-in duration-500 min-h-screen">
      {/* Header */}
      <div className="bg-[#1a4d2e] text-white px-4 md:px-10 lg:px-40 py-4 flex items-center justify-between sticky top-0 z-[50] shadow-xl">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-white rounded-xl flex items-center justify-center text-[#1a4d2e]"><Bike className="size-6 fill-current" /></div>
          <div>
            <h2 className="text-xl font-black tracking-tighter uppercase leading-none">XẤU MÃ SHIPPER</h2>
            <p className="text-[9px] font-black text-green-400 uppercase tracking-widest mt-1">Hệ thống vận chuyển thông minh</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {trackingStatus === 'active' && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-xl border border-green-500/30">
              <div className="size-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-green-300 uppercase">GPS Live</span>
            </div>
          )}
          {/* ✅ Nút chat — mở ChatWidget */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-chat-with-user', { detail: { userId: 1, userName: 'Admin Support' } }))}
            className="size-10 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-all"
            title="Hỗ trợ"
          >
            <MessageSquare className="size-5" />
          </button>
          <button onClick={() => setIsNotificationsOpen(true)} className="size-10 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 relative">
            <Bell className="size-5" />
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 size-5 bg-red-500 rounded-full border-2 border-[#1a4d2e] text-[10px] font-bold flex items-center justify-center">{unreadCount}</span>}
          </button>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex items-center gap-3">
            {myProfile?.logoUrl ? (
              <img src={myProfile.logoUrl} className="size-10 rounded-xl object-cover border-2 border-white/20" />
            ) : (
              <div className="size-10 rounded-xl bg-white/20 border-2 border-white/20 flex items-center justify-center text-white font-black text-sm">
                {(myProfile?.fullName ?? 'S')[0].toUpperCase()}
              </div>
            )}
          </div>
          <button onClick={onLogout} className="size-10 bg-red-500/20 text-red-200 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><LogOut className="size-5" /></button>
        </div>
      </div>
      {/* Sub Nav */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-[72px] z-40 px-4 md:px-10 lg:px-40">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-10">
            {['Đơn hàng mới', 'Đơn đang giao', 'Hồ sơ cá nhân'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`py-5 text-sm font-black uppercase tracking-tight transition-all border-b-4 flex items-center gap-2 ${activeTab === tab ? 'text-primary border-primary' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
                {tab === 'Đơn hàng mới' && <Zap className={`size-4 ${activeTab === tab ? 'fill-primary' : ''}`} />}
                {tab === 'Đơn đang giao' && <Truck className="size-4" />}
                {tab === 'Hồ sơ cá nhân' && <User className="size-4" />}
                {tab}
                {tab === 'Đơn đang giao' && trackingStatus === 'active' && <span className="size-2 bg-green-500 rounded-full animate-pulse" />}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100 hidden md:flex">
            <Wallet className="size-4 text-primary" />
            <span className="text-[10px] font-black text-gray-400 uppercase">VÍ:</span>
            {/* TODO: nối API ví khi BE có endpoint */}
            <span className="text-sm font-black text-gray-900">--</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 lg:px-40 py-12 pb-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter">{activeTab}</h1>
            <p className="text-gray-400 font-bold mt-1 uppercase text-xs tracking-widest">
              {activeTab === 'Đơn hàng mới' && (loadingOrders ? 'Đang tải...' : `📍 ${ordersPage?.totalElements ?? availableOrders.length} đơn`)}
              {activeTab === 'Đơn đang giao' && `${myOrders.length} đơn đang giao`}
            </p>
          </div>
          {activeTab === 'Đơn hàng mới' && (
            <div className="flex items-center gap-3">
              <button onClick={() => fetchAvailableOrders(pageIndex, pageSize)}
                className="size-10 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-primary transition-all">
                <RefreshCw className={`size-4 ${loadingOrders ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}
          {activeTab === 'Đơn đang giao' && (
            <button onClick={fetchMyOrders} className="size-10 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-primary transition-all">
              <RefreshCw className={`size-4 ${loadingMyOrders ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {activeTab === 'Đơn hàng mới' && (loadingOrders ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-[40px] border border-gray-100 p-8 animate-pulse h-72" />)}
          </div>
        ) : renderOrderCards())}

        {activeTab === 'Đơn đang giao' && renderMyOrders()}

        {activeTab === 'Hồ sơ cá nhân' && (
          <div className="bg-white rounded-[48px] border border-gray-100 shadow-sm p-10 flex items-center gap-10">
            <div className="size-32 rounded-[40px] overflow-hidden border-4 border-white shadow-xl bg-blue-100">
              {myProfile?.logoUrl ? (
                <img src={myProfile.logoUrl} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-blue-500 font-black text-5xl">
                  {(myProfile?.fullName ?? 'S')[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="text-3xl font-black text-gray-900">{myProfile?.fullName ?? 'Shipper'}</h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                {myProfile?.status === 'ACTIVE' ? '🟢 Đang hoạt động' : myProfile?.status ?? 'Đang hoạt động'}
              </p>
              {myProfile?.phoneNumber && (
                <p className="text-sm text-gray-600 font-bold">📞 {myProfile.phoneNumber}</p>
              )}
              {myProfile?.vehicleNumber && (
                <p className="text-sm text-gray-600 font-bold">🏍️ {myProfile.vehicleNumber}</p>
              )}
              {myProfile?.ratingAverage != null && (
                <p className="text-sm text-gray-600 font-bold">⭐ {myProfile.ratingAverage.toFixed(1)} / 5.0</p>
              )}
              {myProfile?.address && (
                <p className="text-xs text-gray-400">{myProfile.address}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Notification Modal */}
      {isNotificationsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsNotificationsOpen(false)} />
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl relative z-10 flex flex-col max-h-[80vh] overflow-hidden">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-2xl font-black text-gray-900 uppercase">Thông báo</h3>
              <button onClick={() => setIsNotificationsOpen(false)} className="size-12 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center hover:bg-gray-100"><X className="size-6" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-4">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Bell className="size-10 text-gray-200" />
                  <p className="text-xs font-black text-gray-400 uppercase">Không có thông báo</p>
                </div>
              ) : notifications.map((n) => (
                <div key={n.id} className={`p-6 rounded-[32px] border flex gap-5 ${!n.isRead ? 'bg-primary/5 border-primary/10' : 'bg-white border-gray-100'}`}>
                  <div className={`size-12 rounded-2xl flex items-center justify-center shrink-0 ${!n.isRead ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}><Info className="size-6" /></div>
                  <div><h4 className="font-black text-gray-900">{n.title}</h4><p className="text-sm text-gray-500 mt-1">{n.message}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {completeModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={closeCompleteModal} />
          <div className="bg-white w-full max-w-lg rounded-[36px] shadow-2xl relative z-10 p-8">
            <h3 className="text-2xl font-black text-gray-900 uppercase">
              {completeModal.status === 'DELIVERED' ? 'Xác nhận giao thành công' : 'Báo giao thất bại'}
            </h3>
            <p className="text-sm text-gray-500 font-semibold mt-2">
              Đơn #{completeModal.orderId}
              {completeModal.recipientName ? ` · ${completeModal.recipientName}` : ''}
            </p>

            {completeModal.status === 'FAILED' && (
              <div className="mt-5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lý do (tuỳ chọn)</label>
                <textarea
                  value={completeNote}
                  onChange={(e) => setCompleteNote(e.target.value)}
                  placeholder="VD: Không liên lạc được, sai địa chỉ..."
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-800 outline-none focus:border-primary min-h-[88px] resize-none"
                />
              </div>
            )}

            <div className="mt-5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Ảnh bằng chứng (tuỳ chọn)
              </label>
              <label className="mt-2 flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-6 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all">
                <ImagePlus className="size-6 text-gray-400" />
                <span className="text-xs font-black text-gray-500 uppercase">Chọn ảnh từ máy</span>
                <span className="text-[10px] text-gray-400 font-semibold">Tối đa 5 ảnh · Không bắt buộc</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handlePickEvidenceFiles(e.target.files)}
                />
              </label>
              {completePreviews.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {completePreviews.map((url, idx) => (
                    <div key={url} className="relative size-20 rounded-2xl overflow-hidden border border-gray-100">
                      <img src={url} alt={`evidence-${idx}`} className="size-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={closeCompleteModal}
                disabled={completingOrder}
                className="flex-1 h-12 rounded-2xl border border-gray-200 text-xs font-black text-gray-600 uppercase hover:bg-gray-50 disabled:opacity-50"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={handleCompleteOrder}
                disabled={completingOrder}
                className={`flex-1 h-12 rounded-2xl text-xs font-black text-white uppercase flex items-center justify-center gap-2 disabled:opacity-60 ${
                  completeModal.status === 'FAILED' ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary-dark'
                }`}
              >
                {completingOrder ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : completeModal.status === 'DELIVERED' ? (
                  <><Camera className="size-4" /> Xác nhận giao</>
                ) : (
                  'Báo thất bại'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {codAcceptOrder && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setCodAcceptOrder(null)} />
          <div className="bg-white w-full max-w-xl rounded-[36px] shadow-2xl relative z-10 p-8">
            <h3 className="text-2xl font-black text-gray-900 uppercase">Chọn cách ứng tiền COD</h3>
            <p className="text-sm text-gray-500 font-semibold mt-2">
              Đơn #{codAcceptOrder.orderId} cần ứng trước{' '}
              <span className="font-black text-amber-700">
                {fmtCur(getCodPrepaidAmount(codAcceptOrder))}
              </span>
              {' '}trước khi giao.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              <button
                onClick={() => handleAcceptOrder(codAcceptOrder, 'CASH')}
                disabled={acceptingOrderId === codAcceptOrder.orderId}
                className="p-5 rounded-3xl border-2 border-amber-200 bg-amber-50 text-left hover:bg-amber-100 transition-all disabled:opacity-60"
              >
                <p className="text-sm font-black text-amber-800 uppercase">Trả tiền mặt</p>
                <p className="text-xs text-amber-700 font-semibold mt-2">Shipper đưa tiền mặt, admin xác nhận đã nhận tiền rồi mới giao.</p>
              </button>
              <button
                onClick={() => handleAcceptOrder(codAcceptOrder, 'WALLET')}
                disabled={acceptingOrderId === codAcceptOrder.orderId}
                className="p-5 rounded-3xl border-2 border-emerald-200 bg-emerald-50 text-left hover:bg-emerald-100 transition-all disabled:opacity-60"
              >
                <p className="text-sm font-black text-emerald-800 uppercase">Trừ ví shipper</p>
                <p className="text-xs text-emerald-700 font-semibold mt-2">Hệ thống trừ ví ngay. Nếu không đủ số dư, đơn sẽ không được nhận.</p>
              </button>
            </div>
            <button
              onClick={() => setCodAcceptOrder(null)}
              className="w-full mt-4 py-3 rounded-2xl bg-gray-100 text-gray-500 text-xs font-black uppercase hover:bg-gray-200"
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShipperDashboard;