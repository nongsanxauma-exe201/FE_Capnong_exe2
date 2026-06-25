import React from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ChatBotProvider, ChatBot } from './components/ChatBot';
import ChatWidget from './components/chat/ChatWidget';
import AppRouter from './routes/AppRouter';
import ScrollToTop from './components/layout/ScrollToTop';
import { PopupProvider } from './contexts/PopupContext';
import './App.css';
import { useNotificationWebSocket } from './services/useNotificationWebSocket';
import { ensurePendingPayOSRolledBack, hasPendingPayOSRollback } from './utils/pendingPayOSPayment';

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
        title="Trợ lý AI FoodMarket"
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
  const isRedirectingToCartRef = React.useRef(false);

  const cancelPendingPayOS = React.useCallback(async () => {
    if (loading || !isAuthenticated) return;
    if (location.pathname.startsWith('/payment/') || isRedirectingToCartRef.current) return;

    const hadPending = hasPendingPayOSRollback();
    const restored = await ensurePendingPayOSRolledBack();

    if ((restored || hadPending) && !location.pathname.startsWith('/cart')) {
      isRedirectingToCartRef.current = true;
      window.location.replace(`/cart?payosReload=${Date.now()}`);
    }
  }, [isAuthenticated, loading, location.pathname]);

  React.useEffect(() => {
    void cancelPendingPayOS();

    const handleReturn = () => {
      void cancelPendingPayOS();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void cancelPendingPayOS();
      }
    };

    window.addEventListener('pageshow', handleReturn);
    window.addEventListener('focus', handleReturn);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pageshow', handleReturn);
      window.removeEventListener('focus', handleReturn);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [cancelPendingPayOS]);

  return null;
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