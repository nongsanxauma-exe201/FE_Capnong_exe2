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
  const [pendingInfo, setPendingInfo] = React.useState<{ orderId: number; orderCode: string } | null>(null);
  const notifiedRef = React.useRef(false);
  const { openResumePayment, resumeOptions, closeResumePayment } = useResumePayment((msg) => {
    // Clear stale pending data when payment can no longer proceed (already paid, cancelled, etc.)
    clearPendingPayOSPayment();
    globalShowAlert(msg, 'Thông báo', 'warning');
  });

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
    setPendingInfo({ orderId: pending.orderId, orderCode: pending.orderCode ?? '' });
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
      await openResumePayment(pendingInfo.orderId);
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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] w-full max-w-md px-4 pointer-events-none">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl shadow-2xl p-4 pointer-events-auto">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-xl shrink-0">⏳</span>
          <div className="flex-1">
            <p className="text-sm font-black text-amber-900">Đơn hàng chờ thanh toán</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Đơn hàng #{pendingInfo.orderId} đang chờ bạn hoàn tất thanh toán.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-amber-400 hover:text-amber-700 transition-colors shrink-0 text-lg font-bold leading-none"
          >
            ×
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleContinuePayment}
            className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl transition-all"
          >
            💳 Tiếp tục thanh toán
          </button>
          <button
            onClick={() => { handleDismiss(); navigate('/my-orders'); }}
            className="flex-1 py-2 bg-white border border-amber-200 text-amber-800 text-xs font-bold rounded-xl hover:bg-amber-50 transition-all"
          >
            Xem đơn hàng
          </button>
          <button
            onClick={handleCancelPending}
            className="py-2 px-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-xl hover:bg-red-100 transition-all"
          >
            Hủy
          </button>
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