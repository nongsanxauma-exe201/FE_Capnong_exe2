import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from '../contexts/AuthContext';
import { globalShowAlert } from '../contexts/PopupContext'; 
import { NotificationItem } from './notification.service';
import { API_BASE_URL, TOKEN_KEY } from './api.config';

interface UseNotificationWebSocketProps {
  onNotificationReceived: (notif: NotificationItem) => void;
}

export const useNotificationWebSocket = ({ onNotificationReceived }: UseNotificationWebSocketProps) => {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const stompClient = useRef<Client | null>(null);
  
  // Giữ callback luôn mới nhất mà không làm trigger lại useEffect kết nối WS
  const callbackRef = useRef(onNotificationReceived);
  useEffect(() => {
    callbackRef.current = onNotificationReceived;
  }, [onNotificationReceived]);

  useEffect(() => {
    // Chỉ kết nối khi đã đăng nhập và có email
    if (!isAuthenticated || !user?.email) return;

    // QUAN TRỌNG: Phải dùng TOKEN_KEY ('auth_token') vì localStorage lưu dưới key này, không phải 'token'
    const token = localStorage.getItem(TOKEN_KEY); 
    const baseUrl = API_BASE_URL.endsWith('/api/v1')
      ? API_BASE_URL.slice(0, -7)
      : API_BASE_URL;

    const client = new Client({
      // Sử dụng package stompjs (lưu ý import từ @stomp/stompjs thay vì @stomp/stomp-js để hết báo lỗi)
      webSocketFactory: () => new (SockJS as any)(`${baseUrl}/api/v1/ws`),
      reconnectDelay: 5000,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      
        onConnect: () => {
          console.log('[Notification WS] Connected successfully for user:', user.email);
          setIsConnected(true);
          
          /**
           * Backend gửi notification đến "/queue/notifications.{userId}" bằng convertAndSend()
           * Client cần subscribe vào đúng destination mà backend gửi
           */
          client.subscribe(`/queue/notifications.${user.id}`, (message) => {
          try {
            const notif: NotificationItem = JSON.parse(message.body);
            console.log('[Notification WS] Received notification:', notif);
            
            // Gọi callback để Header cập nhật số lượng và danh sách thông báo
            if (callbackRef.current) {
              callbackRef.current(notif);
            }
            
            // Hiện Popup lên màn hình
            globalShowAlert(notif.message, notif.title || 'Thông báo mới', 'alert');
            
          } catch (error) {
            console.error('[Notification WS] Error parsing notification:', error);
          }
        });
      },
      onDisconnect: () => {
        console.log('[Notification WS] Disconnected');
        setIsConnected(false);
      },
      onStompError: (frame) => {
        console.error('[Notification WS] Broker reported error:', frame.headers['message']);
        console.error('[Notification WS] Additional details:', frame.body);
        setIsConnected(false);
      },
      onWebSocketError: (evt) => {
        console.error('[Notification WS] WebSocket error:', evt);
      }
    });

    client.activate();
    stompClient.current = client;

    // Cleanup: Ngắt kết nối khi unmount hoặc user thay đổi
    return () => {
      if (stompClient.current) {
        stompClient.current.deactivate();
        stompClient.current = null;
        setIsConnected(false);
      }
    };
  }, [user, isAuthenticated]); // Chỉ render và connect lại khi 'user' thay đổi

  return { isConnected };
};
