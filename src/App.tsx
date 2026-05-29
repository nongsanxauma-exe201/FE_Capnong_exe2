import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ChatBotProvider, ChatBot } from './components/ChatBot';
import ChatWidget from './components/chat/ChatWidget';
import AppRouter from './routes/AppRouter';
import ScrollToTop from './components/layout/ScrollToTop';
import { PopupProvider } from './contexts/PopupContext';
import './App.css';
import { useNotificationWebSocket } from './services/useNotificationWebSocket';

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

const App: React.FC = () => {
  return (
    <BrowserRouter basename="/">
      <ScrollToTop />
      <PopupProvider>
        <AuthProvider>
          <NotificationWebSocketWrapper />
          <AppRouter />
          <ChatBotWrapper />
          <ChatWidgetWrapper />
        </AuthProvider>
      </PopupProvider>
    </BrowserRouter>
  );
};

export default App;