import React from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { Clock, Frown } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ChatBotProvider, ChatBot } from './components/ChatBot';
import ChatWidget from './components/chat/ChatWidget';
import AppRouter from './routes/AppRouter';
import ScrollToTop from './components/layout/ScrollToTop';
import { PopupProvider, globalShowAlert } from './contexts/PopupContext';
import './App.css';
import { useNotificationWebSocket } from './services/useNotificationWebSocket';
import { ensurePendingPayOSRolledBack, getPendingPayOSPayment, clearPendingPayOSPayment, getRestoredPayOSCart, saveRestoredPayOSCart } from './utils/pendingPayOSPayment';
import { paymentService } from './services';
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
  const { isAuthenticated, loading } = useAuth();
  const [pendingInfo, setPendingInfo] = React.useState<{
    orderId: number;
    orderCode: string;
    batchId?: number | null;
    orderCount: number;
    hasPlatformBatchVoucher?: boolean;
  } | null>(null);
  const notifiedRef = React.useRef(false);
  const { openResumePayment, resumeOptions, closeResumePayment } = useResumePayment((msg) => {
    // Clear stale pending data when payment can no longer proceed (already paid, cancelled, etc.)
    clearPendingPayOSPayment();
    globalShowAlert(msg, 'Thông báo', 'warning');
  });

  const checkPending = React.useCallback(async () => {
    if (loading || !isAuthenticated) return;
    // Trang đã có UI tiếp tục TT / hủy — không chồng thêm banner nổi
    const path = location.pathname;
    if (
      path.startsWith('/payment/')
      || path.startsWith('/cart')
      || path.startsWith('/checkout')
      || path.startsWith('/my-orders')
    ) {
      setPendingInfo(null);
      closeResumePayment();
      return;
    }
    const pending = getPendingPayOSPayment();
    if (!pending?.orderId) { setPendingInfo(null); return; }

    if (!notifiedRef.current && pending.orderCode) {
      notifiedRef.current = true;
      paymentService.notifyPendingPayment(pending.orderCode).catch(() => {});
    }
    setPendingInfo({
      orderId: pending.orderId,
      orderCode: pending.orderCode ?? '',
      batchId: pending.batchId ?? null,
      orderCount: pending.orderIds?.length ?? (pending.orderId ? 1 : 0),
      hasPlatformBatchVoucher: pending.hasPlatformBatchVoucher === true,
    });
  }, [isAuthenticated, loading, location.pathname, closeResumePayment]);

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
      // Chỉ force batch-all khi có voucher sàn; không voucher + nhiều shop → popup chọn
      const payMode = pendingInfo.hasPlatformBatchVoucher ? 'batch-all' : undefined;
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
    closeResumePayment();
    await ensurePendingPayOSRolledBack();
    window.dispatchEvent(new Event('cart-updated'));
    window.location.replace(`/cart?payosReload=${Date.now()}`);
  };

  const handleDismiss = () => {
    setPendingInfo(null);
    closeResumePayment();
    clearPendingPayOSPayment();
    // Also clear orderCode from cart snapshot so cart button doesn't trigger rollback
    const snapshot = getRestoredPayOSCart();
    if (snapshot?.cart) {
      saveRestoredPayOSCart(snapshot.cart, { orderCode: null, orderId: null });
    }
  };

  const goToMyOrders = () => {
    closeResumePayment();
    setPendingInfo(null);
    // Full load — tránh SPA stale khiến thiếu nút Hủy đơn / Hủy batch
    window.location.assign(`/my-orders?fromPending=${Date.now()}`);
  };

  const isBatchCheckout = pendingInfo != null && (pendingInfo.orderCount > 1 || pendingInfo.batchId != null);
  const shopCount = Math.max(1, pendingInfo?.orderCount || 1);
  const cancelLabel = pendingInfo?.hasPlatformBatchVoucher ? 'Hủy & hoàn voucher' : 'Hủy đơn chờ thanh toán';

  return (
    <>
      {pendingInfo && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] w-full max-w-md px-4 pointer-events-none">
          <div className="bg-[#FFFBEB] border border-amber-200 rounded-lg shadow-2xl p-4 pointer-events-auto">
            <div className="flex items-start gap-3 mb-3">
              <div className="relative shrink-0">
                <div className="size-11 rounded-md bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800">
                  <Frown className="size-5" strokeWidth={2.25} />
                </div>
                <span className="absolute -bottom-1 -right-1 size-5 rounded-full bg-amber-500 border-2 border-[#FFFBEB] flex items-center justify-center shadow-sm">
                  <Clock className="size-2.5 text-white" strokeWidth={3} />
                </span>
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-amber-800 border border-amber-300/80 bg-amber-50 rounded-sm px-2 py-0.5 mb-1.5">
                  <Clock className="size-3" strokeWidth={2.5} />
                  CHƯA THANH TOÁN
                </span>
                <p className="text-[15px] font-black text-amber-950 leading-snug">Đơn hàng đang treo...</p>
                <p className="text-xs text-amber-800/75 mt-1 font-medium leading-relaxed">
                  {isBatchCheckout
                    ? `Checkout #${pendingInfo.batchId ?? '—'} · ${shopCount} shop chưa hoàn tất thanh toán.`
                    : `Đơn #${pendingInfo.orderId} đang chờ bạn hoàn tất thanh toán.`}
                </p>
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-amber-400/80 hover:text-amber-700 transition-colors shrink-0 text-xl font-bold leading-none -mt-1"
                aria-label="Đóng"
              >
                ×
              </button>
            </div>

            {pendingInfo.hasPlatformBatchVoucher && (
              <div className="mb-3 rounded-md border border-amber-100 bg-white px-3 py-2.5 text-center text-xs font-medium text-amber-900/90 leading-relaxed">
                Voucher sàn chỉ áp dụng khi thanh toán đủ cả {shopCount} shop trong cùng phiên.
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleContinuePayment}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-black rounded-md transition-all shadow-sm shadow-amber-500/20"
              >
                Tiếp tục thanh toán
              </button>
              <button
                type="button"
                onClick={goToMyOrders}
                className="w-full py-2.5 bg-white border border-amber-200 text-amber-900 text-sm font-bold rounded-md hover:bg-amber-50/80 transition-all"
              >
                Xem đơn hàng
              </button>
              <button
                type="button"
                onClick={handleCancelPending}
                className="w-full py-1.5 text-sm font-semibold text-amber-700/80 hover:text-amber-900 transition-colors"
              >
                {cancelLabel}
              </button>
            </div>
          </div>
        </div>
      )}
      {resumeOptions && (
        <ResumePaymentModal options={resumeOptions} onClose={closeResumePayment} />
      )}
    </>
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