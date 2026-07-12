import React from 'react';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import { Clock, AlertCircle } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ChatBotProvider, ChatBot } from './components/ChatBot';
import ChatWidget from './components/chat/ChatWidget';
import AppRouter from './routes/AppRouter';
import ScrollToTop from './components/layout/ScrollToTop';
import { PopupProvider } from './contexts/PopupContext';
import './App.css';
import { useNotificationWebSocket } from './services/useNotificationWebSocket';
import { ensurePendingPayOSRolledBack, getPendingPayOSPayment, clearPendingPayOSPayment, getRestoredPayOSCart, saveRestoredPayOSCart } from './utils/pendingPayOSPayment';
import { paymentService, orderService } from './services';
import { useResumePayment } from './hooks/useResumePayment';
import ResumePaymentModal from './components/payment/ResumePaymentModal';

const ChatBotWrapper: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  const getChatBotRole = (userRole?: string): 'BUYER' | 'SHOP_OWNER' | 'SHIPPER' => {
    switch (userRole) {
      case 'FARMER':
        return 'SHOP_OWNER';
      case 'SHIPPER':
        return 'SHIPPER';
      default:
        return 'BUYER';
    }
  };

  if (!isAuthenticated || !user) return null;

  return (
    <ChatBotProvider
      userId={parseInt(user.id)}
      userRole={getChatBotRole(user.role)}
    >
      <ChatBot
        title="Chat Box CapNong"
        className="z-50"
      />
    </ChatBotProvider>
  );
};

const ChatWidgetWrapper: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  // Chỉ hiển thị ChatWidget cho BUYER
  if (!isAuthenticated || !user || user.role !== 'BUYER') return null;

  return <ChatWidget />;
};
const NotificationWebSocketWrapper: React.FC = () => {
  useNotificationWebSocket({
    onNotificationReceived: (notif) => {
      console.log('[Global Notification] Received:', notif);
    },
  });

  return null;
};

const PendingPayOSRollbackGuard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const [pendingInfo, setPendingInfo] = React.useState<{
    orderId: number;
    orderCode: string;
    batchId?: number | null;
    orderCount: number;
    hasPlatformBatchVoucher: boolean;
  } | null>(null);
  const notifiedRef = React.useRef(false);
  const { openResumePayment, resumeOptions, closeResumePayment } = useResumePayment();

  const checkPending = React.useCallback(async () => {
    if (loading || !isAuthenticated) return;
    // On cart or payment pages, let existing rollback logic handle it
    if (location.pathname.startsWith('/payment/') || location.pathname.startsWith('/cart')) {
      setPendingInfo(null);
      return;
    }
    const pending = getPendingPayOSPayment();
    if (!pending?.orderId) { setPendingInfo(null); return; }

    if (!notifiedRef.current && pending.orderCode) {
      notifiedRef.current = true;
      paymentService.notifyPendingPayment(pending.orderCode).catch(() => {});
    }

    let orderCount = pending.orderIds?.length ?? 1;
    try {
      const res = await orderService.getOrderById(pending.orderId);
      orderCount = res.result?.batchUnpaidCount ?? orderCount;
    } catch {
      // giữ fallback từ localStorage
    }

    setPendingInfo({
      orderId: pending.orderId,
      orderCode: pending.orderCode ?? '',
      batchId: pending.batchId,
      orderCount,
      hasPlatformBatchVoucher: !!pending.hasPlatformBatchVoucher,
    });
  }, [isAuthenticated, loading, location.pathname]);

  React.useEffect(() => {
    checkPending();
  }, [checkPending]);

  React.useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        notifiedRef.current = false;
        checkPending();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [checkPending]);

  const handleContinuePayment = async () => {
    if (!pendingInfo) return;
    try {
      const payMode = pendingInfo.hasPlatformBatchVoucher ? 'batch-all' as const : undefined;
      await openResumePayment(pendingInfo.orderId, payMode);
      notifiedRef.current = false;
      setPendingInfo(null);
    } catch {
      setPendingInfo(null);
      clearPendingPayOSPayment();
    }
  };

  const handleCancelPending = async () => {
    setPendingInfo(null);
    await ensurePendingPayOSRolledBack();
    window.dispatchEvent(new Event('cart-updated'));
    window.location.replace(`/cart?payosReload=${Date.now()}`);
  };

  const handleDismiss = () => {
    setPendingInfo(null);
    clearPendingPayOSPayment();
    // Also clear orderCode from cart snapshot so cart button doesn't trigger rollback
    const snapshot = getRestoredPayOSCart();
    if (snapshot?.cart) {
      saveRestoredPayOSCart(snapshot.cart, { orderCode: null, orderId: null });
    }
  };

  if (!pendingInfo) return null;

  const isBatchCheckout = pendingInfo.orderCount > 1 || pendingInfo.batchId != null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] w-full max-w-lg px-4 pointer-events-none animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-gradient-to-br from-amber-50 via-orange-50/90 to-amber-50 border-2 border-amber-200/90 rounded-2xl shadow-[0_12px_40px_rgba(245,158,11,0.18)] overflow-hidden pointer-events-auto">
        <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400" />
        <div className="p-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="relative size-12 shrink-0 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center">
              <span className="text-[26px] leading-none select-none" aria-hidden>😔</span>
              <div className="absolute -bottom-1 -right-1 size-5 rounded-full bg-orange-500 border-2 border-amber-50 flex items-center justify-center">
                <Clock className="size-2.5 text-white" strokeWidth={3} />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-amber-900 bg-amber-100/90 border border-amber-200 rounded-full px-2.5 py-0.5 mb-1.5">
                <AlertCircle className="size-3 shrink-0" />
                Chưa thanh toán
              </span>
              <p className="text-sm font-black text-amber-950 leading-snug">Đơn hàng đang treo…</p>
              {isBatchCheckout ? (
                <>
                  <p className="text-xs text-amber-900/75 mt-1.5 leading-relaxed font-medium">
                    Checkout #{pendingInfo.batchId ?? '—'} · {pendingInfo.orderCount} shop chưa hoàn tất thanh toán.
                  </p>
                  {pendingInfo.hasPlatformBatchVoucher && (
                    <p className="text-xs text-amber-900/80 mt-2 leading-relaxed font-medium bg-white/60 border border-amber-200/80 rounded-xl px-3 py-2">
                      Voucher sàn chỉ áp dụng khi thanh toán đủ cả {pendingInfo.orderCount} shop trong cùng phiên.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-amber-900/75 mt-1.5 font-medium">
                  Đơn #{pendingInfo.orderId} chưa thanh toán xong — hoàn tất để shop xác nhận nhé.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Đóng"
              className="shrink-0 size-8 flex items-center justify-center rounded-full text-amber-400/80 hover:text-amber-700 hover:bg-amber-100/80 transition-colors text-lg leading-none -mt-0.5"
            >
              ×
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleContinuePayment}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white text-sm font-black rounded-xl transition-colors shadow-md shadow-amber-600/25"
            >
              Tiếp tục thanh toán
            </button>
            <button
              type="button"
              onClick={() => { handleDismiss(); navigate('/my-orders'); }}
              className="w-full py-2.5 bg-white/80 border border-amber-200 text-amber-900 text-xs font-bold rounded-xl hover:bg-white transition-colors"
            >
              Xem đơn hàng
            </button>
            <button
              type="button"
              onClick={handleCancelPending}
              className="w-full py-2 text-amber-700/60 hover:text-red-600 text-xs font-semibold transition-colors"
            >
              {pendingInfo.hasPlatformBatchVoucher ? 'Hủy & hoàn voucher' : 'Hủy'}
            </button>
          </div>
        </div>
      </div>
      {resumeOptions && (
        <ResumePaymentModal options={resumeOptions} onClose={closeResumePayment} />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter basename="/">
      <ScrollToTop />
      <PopupProvider>
        <AuthProvider>
          <NotificationWebSocketWrapper />
          <PendingPayOSRollbackGuard />
          <AppRouter />
          <ChatBotWrapper />
          <ChatWidgetWrapper />
        </AuthProvider>
      </PopupProvider>
    </BrowserRouter>
  );
};

export default App;