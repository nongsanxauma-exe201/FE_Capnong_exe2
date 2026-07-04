
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Clock, ShoppingCart, Info, TrendingUp, CheckCircle2, ChevronRight, MoreHorizontal, Trash2, AlertCircle, X } from 'lucide-react';
import { notificationService, NotificationItem } from '../../services';
import { useResumePayment } from '../../hooks/useResumePayment';
import ResumePaymentModal from '../../components/payment/ResumePaymentModal';
import { globalShowAlert } from '../../contexts/PopupContext';

type UiNotificationType = 'order' | 'market' | 'system' | 'info';

interface UiNotification extends NotificationItem {
  uiType: UiNotificationType;
  timeLabel: string;
}

const mapNotificationToUi = (notification: NotificationItem): UiNotification => {
  let uiType: UiNotificationType = 'system';

  const title = notification.title?.toLowerCase() || '';

  if (title.includes('đơn hàng') || title.includes('order')) {
    uiType = 'order';
  } else if (title.includes('thị trường') || title.includes('giá')) {
    uiType = 'market';
  } else if (title.includes('kyc') || title.includes('xác minh')) {
    uiType = 'system';
  } else {
    uiType = 'info';
  }

  const createdAt = notification.createAt;
  const timeLabel = createdAt ? new Date(createdAt).toLocaleString('vi-VN') : 'Vừa xong';

  return {
    ...notification,
    uiType,
    timeLabel,
  };
};

const FarmerNotifications: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<UiNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<UiNotification | null>(null);
  const { openResumePayment, resumeOptions, closeResumePayment } = useResumePayment((msg) => {
    globalShowAlert(msg, 'Thông báo', 'warning');
  });

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await notificationService.getMyNotifications();
        const list = response.result || [];
        setNotifications(list.map(mapNotificationToUi));
      } catch (err) {
        console.error('Failed to load notifications', err);
        setError('Không thể tải danh sách thông báo. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: number) => {
    // Optimistic UI
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    try {
      await notificationService.markAsRead(id);
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const handleDeleteNotification = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    // Optimistic UI
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await notificationService.deleteNotification(id);
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
    if (unreadIds.length === 0) return;

    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      // Vì backend chưa có API đánh dấu tất cả, ta tạm gọi API nhiều lần
      await Promise.all(unreadIds.map(id => notificationService.markAsRead(id)));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  return (
    <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black font-display text-gray-900 uppercase tracking-tight">Thông báo của bạn</h2>
          <p className="text-gray-400 font-medium text-sm mt-1">Cập nhật tin nhắn hệ thống, đơn hàng và biến động thị trường.</p>
        </div>
        <button
          onClick={handleMarkAllAsRead}
          className="text-[10px] font-black text-primary uppercase tracking-[0.2em] hover:underline disabled:text-gray-300"
          disabled={!notifications.length || notifications.every(n => n.isRead)}
        >
          Đánh dấu tất cả đã đọc
        </button>
      </div>

      <div id="tour-notifications-list" className="max-w-4xl space-y-4">
        {loading && (
          <div className="p-8 bg-white rounded-[40px] border border-gray-100 shadow-sm flex items-center gap-4">
            <Clock className="size-5 text-primary animate-spin-slow" />
            <p className="text-sm font-medium text-gray-600">Đang tải danh sách thông báo...</p>
          </div>
        )}

        {error && !loading && (
          <div className="p-8 bg-red-50 rounded-[40px] border border-red-100 shadow-sm flex items-center gap-4">
            <AlertCircle className="size-5 text-red-500" />
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && notifications.map((n) => (
          <div
            key={n.id}
            className={`p-8 bg-white rounded-[40px] border border-gray-100 shadow-sm flex items-start gap-8 group hover:shadow-md transition-all relative overflow-hidden ${!n.isRead ? 'border-primary/20 bg-primary/5' : ''}`}
          >
            {!n.isRead && (
              <div className="absolute top-8 right-8 size-2.5 bg-primary rounded-full shadow-lg shadow-primary/40" />
            )}

            <div
              className={`size-16 rounded-[24px] flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 duration-500 ${n.uiType === 'order'
                ? 'bg-blue-50 text-blue-500'
                : n.uiType === 'market'
                  ? 'bg-orange-50 text-orange-500'
                  : n.uiType === 'system'
                    ? 'bg-emerald-50 text-emerald-500'
                    : 'bg-gray-50 text-gray-400'
                }`}
            >
              {n.uiType === 'order' && <ShoppingCart className="size-8" />}
              {n.uiType === 'market' && <TrendingUp className="size-8" />}
              {n.uiType === 'system' && <CheckCircle2 className="size-8" />}
              {n.uiType === 'info' && <Info className="size-8" />}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h4 className="text-xl font-black text-gray-900 leading-tight">{n.title}</h4>
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                  • {n.timeLabel}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-500 leading-relaxed mb-6">
                {n.message}
              </p>
              <div className="flex items-center gap-6">
                <button
                  onClick={() => {
                    setSelectedNotification(n);
                    if (!n.isRead) handleMarkAsRead(n.id);
                  }}
                  className="px-6 py-2.5 bg-white border border-gray-100 rounded-xl text-[10px] font-black text-gray-600 uppercase tracking-widest shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-2">
                  Xem chi tiết <ChevronRight className="size-3" />
                </button>
                <button
                  onClick={(e) => handleDeleteNotification(n.id, e)}
                  className="text-[10px] font-black text-gray-300 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center gap-1">
                  <Trash2 className="size-3" /> Xóa
                </button>
              </div>
            </div>

            {!n.isRead && (
              <button
                onClick={() => handleMarkAsRead(n.id)}
                title="Đánh dấu đã đọc"
                className="absolute top-8 right-12 text-gray-200 hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                <CheckCircle2 className="size-6" />
              </button>
            )}
          </div>
        ))}

        {!loading && !error && !notifications.length && (
          <div className="pt-8 text-center">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">
              Hiện chưa có thông báo nào mới
            </p>
          </div>
        )}
      </div>

      {/* Notification Detail Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className={`size-10 rounded-xl flex items-center justify-center ${selectedNotification.uiType === 'order' ? 'bg-blue-100 text-blue-600' :
                    selectedNotification.uiType === 'market' ? 'bg-orange-100 text-orange-600' :
                      selectedNotification.uiType === 'system' ? 'bg-emerald-100 text-emerald-600' :
                        'bg-gray-200 text-gray-600'
                  }`}>
                  {selectedNotification.uiType === 'order' && <ShoppingCart className="size-5" />}
                  {selectedNotification.uiType === 'market' && <TrendingUp className="size-5" />}
                  {selectedNotification.uiType === 'system' && <CheckCircle2 className="size-5" />}
                  {selectedNotification.uiType === 'info' && <Info className="size-5" />}
                </div>
                <h3 className="text-xl font-black text-gray-900 leading-tight pr-4 line-clamp-2">{selectedNotification.title}</h3>
              </div>
              <button
                onClick={() => setSelectedNotification(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors shrink-0"
              >
                <X className="size-5 text-gray-500" />
              </button>
            </div>

            <div className="p-8">
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <p className="text-[15px] font-medium text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {selectedNotification.message}
                </p>
              </div>

              {/* Action buttons for pending payment notifications */}
              {selectedNotification.title === 'Bạn chưa thanh toán' && selectedNotification.evidence && (() => {
                const orderId = parseInt(selectedNotification.evidence, 10);
                if (!orderId) return null;
                return (
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={async () => {
                        setSelectedNotification(null);
                        await openResumePayment(orderId, 'individual');
                      }}
                      className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-black rounded-2xl transition-all shadow-lg shadow-amber-500/20"
                    >
                      💳 Tiếp tục thanh toán
                    </button>
                    <button
                      onClick={() => { setSelectedNotification(null); navigate('/my-orders'); }}
                      className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-2xl transition-all"
                    >
                      📋 Xem đơn hàng
                    </button>
                  </div>
                );
              })()}

              <div className="mt-8 flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock className="size-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">{selectedNotification.timeLabel}</span>
                </div>

                <button
                  onClick={() => setSelectedNotification(null)}
                  className="px-8 py-3 bg-primary text-white text-sm font-black rounded-full shadow-lg shadow-primary/20 hover:bg-primary-dark hover:-translate-y-0.5 transition-all"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {resumeOptions && (
        <ResumePaymentModal options={resumeOptions} onClose={closeResumePayment} />
      )}
    </div>
  );
};

export default FarmerNotifications;
