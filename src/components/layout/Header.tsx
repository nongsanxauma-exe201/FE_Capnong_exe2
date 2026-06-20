
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AppRole, User, KYCStatus } from '../../types/index';
import { Search, ShoppingCart, Bell, Menu, User as UserIcon, LogOut, Phone, X, CheckCircle2, Trash2, Store, Truck, LayoutDashboard, Package, MessageSquare, RefreshCw, Ticket } from 'lucide-react';
import { notificationService, NotificationItem, cartService } from '../../services';
import { useNotificationWebSocket } from '../../services/useNotificationWebSocket';
import { getRestoredPayOSCartData, hasPendingPayOSRollback, redirectToCartAfterPayOSCancel } from '../../utils/pendingPayOSPayment';

import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  // Kept for backward compatibility but mostly internal refactored
  onRoleSwitch?: (role: AppRole) => void;
  activeTab?: 'home' | 'blindbox' | 'news';
}

const Header: React.FC<HeaderProps> = ({
  activeTab: activeTabProp
}) => {
  const { user, isAuthenticated, logout: onLogout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleOpenCart = () => {
    if (hasPendingPayOSRollback()) {
      void redirectToCartAfterPayOSCancel();
      return;
    }
    navigate('/cart');
  };
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const notifRef = useRef<HTMLDivElement>(null);

  // Kích hoạt WebSocket để nhận thông báo realtime
  useNotificationWebSocket({
    onNotificationReceived: (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
    }
  });

  // Determine active tab based on location if not provided
  const activeTab = activeTabProp || (
    location.pathname === '/' ? 'home' :
      location.pathname.startsWith('/news') ? 'news' : undefined
  );

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    setLoadingNotifs(true);
    try {
      const res = await notificationService.getMyNotifications();
      setNotifications(res.result || []);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  const fetchCartCount = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await cartService.getCart();
      if (res.result?.items?.length) {
        setCartCount(res.result.items.length);
        return;
      }
      const snapshot = getRestoredPayOSCartData();
      setCartCount(snapshot?.items?.length || 0);
    } catch (err) {
      const snapshot = getRestoredPayOSCartData();
      setCartCount(snapshot?.items?.length || 0);
      console.error('Failed to fetch cart count', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      fetchCartCount();
    } else {
      setNotifications([]);
      setCartCount(0);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleCartUpdate = () => fetchCartCount();
    window.addEventListener('cart-updated', handleCartUpdate);
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, [isAuthenticated]);

  const handleMarkAsRead = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      await notificationService.markAsRead(id);
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const handleDeleteNotification = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setNotifications(prev => prev.filter(n => n.id !== id));
      await notificationService.deleteNotification(id);
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };

  const handleToggleNotifications = () => {
    const next = !showNotifications;
    setShowNotifications(next);
    setShowProfileMenu(false);
    if (next) fetchNotifications();
  };

  const handleViewDetails = (n: NotificationItem) => {
    setSelectedNotification(n);
    if (!n.isRead) {
      handleMarkAsRead(n.id, { stopPropagation: () => { } } as React.MouseEvent);
    }
    // Close the dropdown so it doesn't stay open behind the modal
    setShowNotifications(false);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const roleLabelMap: Record<string, string> = {
    [AppRole.BUYER]: 'Người mua',
    [AppRole.FARMER]: 'Nhà vườn',
    [AppRole.SHIPPER]: 'Shipper',
    [AppRole.ADMIN]: 'Quản trị viên',
  };

  const handleDashboardRedirect = () => {
    setShowProfileMenu(false);
    if (!user) return;

    // Block PENDING farmers/shippers from dashboard
    if (user.kycStatus === KYCStatus.PENDING && (user.role === AppRole.FARMER || user.role === AppRole.SHIPPER)) {
      navigate('/kyc');
      return;
    }

    switch (user.role) {
      case AppRole.ADMIN: navigate('/admin'); break;
      case AppRole.FARMER: navigate('/farmer'); break;
      case AppRole.SHIPPER: navigate('/shipper'); break;
      default: navigate('/'); break;
    }
  };

  // Sync search input with URL if user navigates back or types directly
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q') || params.get('search') || '';
    setSearchInput(q);
  }, [location.search]);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchInput.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`);
    } else {
      navigate('/');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const containerClass = 'w-full max-w-[1280px] mx-auto';
  const outerPaddingClass = 'px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12';

  return (
    <header className="sticky top-0 z-[60] flex flex-col w-full bg-white shadow-sm font-sans">
      {/* Top Bar - Dark Green Section */}
      <div className={`bg-[#5DBE61] text-white ${outerPaddingClass} py-4 w-full`}>
        <div className={`flex items-center justify-between ${containerClass} gap-4 md:gap-10`}>
          {/* Logo Area */}
          <Link to="/" className="flex items-center gap-3 shrink-0 cursor-pointer">
            <img src="/logo.png" alt="Logo" className="size-10 object-contain rounded-full bg-white" />
            <h2 className="text-white text-xl font-black leading-tight tracking-tighter uppercase font-display italic">NÔNG SẢN XẤU MÃ</h2>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-[700px] relative">
            <div className="relative flex items-center bg-white rounded-full h-11 px-5 overflow-hidden shadow-inner">
              <Search className="size-4 text-gray-400 mr-3 cursor-pointer hover:text-primary transition-colors" onClick={handleSearch} />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full border-none focus:ring-0 focus:outline-none text-sm text-gray-800 placeholder:text-gray-400 font-medium"
                placeholder="Tìm kiếm sản phẩm (vd: xà lách, cà chua)..."
                type="text"
              />
            </div>
          </form>

          {/* Icons / Auth Area */}
          <div className="flex items-center gap-6 relative">
            {isAuthenticated ? (
              <>
                {/* Notification Bell */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={handleToggleNotifications}
                    className="relative text-white hover:opacity-80 transition-opacity"
                  >
                    <Bell className="size-6" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-[#E66666] text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-[#38543a]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notification Dropdown */}
                  {showNotifications && (
                    <div className="absolute top-full right-0 mt-3 w-96 bg-white rounded-[24px] shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-gray-800 ring-1 ring-black/5">
                      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Thông báo</h4>
                        <button onClick={() => setShowNotifications(false)} className="text-gray-300 hover:text-gray-600 transition-colors">
                          <X className="size-4" />
                        </button>
                      </div>

                      <div className="max-h-80 overflow-y-auto">
                        {loadingNotifs ? (
                          <div className="p-8 text-center">
                            <div className="inline-block size-6 border-2 border-gray-200 border-t-primary rounded-full animate-spin mb-2" />
                            <p className="text-xs text-gray-400 font-bold">Đang tải...</p>
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="p-8 text-center">
                            <Bell className="size-8 text-gray-200 mx-auto mb-2" />
                            <p className="text-xs text-gray-400 font-bold">Chưa có thông báo nào</p>
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              onClick={() => handleViewDetails(n)}
                              className={`px-6 py-4 border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer group flex items-start justify-between gap-2 ${!n.isRead ? 'bg-primary/5' : ''}`}
                            >
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                {!n.isRead && (
                                  <span className="mt-1.5 size-2 bg-primary rounded-full shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <h5 className="text-xs font-black text-gray-900 leading-snug truncate">{n.title}</h5>
                                  <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                                  <p className="text-[9px] text-gray-300 font-bold mt-1.5 uppercase tracking-widest">
                                    {n.createAt ? new Date(n.createAt).toLocaleString('vi-VN') : ''}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                {!n.isRead && (
                                  <button onClick={(e) => handleMarkAsRead(n.id, e)} title="Đánh dấu đã đọc" className="text-gray-400 hover:text-primary transition-colors">
                                    <CheckCircle2 className="size-4" />
                                  </button>
                                )}
                                <button onClick={(e) => handleDeleteNotification(n.id, e)} title="Xóa thông báo" className="text-gray-400 hover:text-red-500 transition-colors">
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={handleOpenCart} className="relative text-white hover:opacity-80 transition-opacity">
                  <ShoppingCart className="size-6" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-[#FAD973] text-[#38543a] text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-[#38543a]">
                      {cartCount}
                    </span>
                  )}
                </button>

                <div className="relative">
                  <div
                    className="size-10 rounded-full border-2 border-white/20 cursor-pointer hover:border-white transition-all overflow-hidden bg-gray-200"
                    style={{ backgroundImage: user?.avatar ? `url(${user.avatar})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}
                    onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); }}
                  >
                    {!user?.avatar && <UserIcon className="size-5 m-auto mt-2 text-gray-500" />}
                  </div>

                  {showProfileMenu && (
                    <div className="absolute top-full right-0 mt-3 w-64 bg-white rounded-[24px] shadow-2xl border border-gray-100 py-3 animate-in fade-in zoom-in-95 duration-200 text-gray-800 overflow-hidden ring-1 ring-black/5">
                      <div className="px-5 py-3 border-b border-gray-50 mb-1">
                        <p className="text-sm font-black truncate">{user?.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                          {user ? roleLabelMap[user.role] : 'Khách'}
                        </p>
                      </div>

                      {user && user.role !== AppRole.BUYER && (
                        <button
                          onClick={handleDashboardRedirect}
                          className={`w-full px-5 py-3 text-left text-xs font-black flex items-center gap-3 transition-colors border-b border-gray-50 ${user.kycStatus === KYCStatus.PENDING ? 'text-gray-400' : 'text-primary hover:bg-primary/5'
                            }`}
                        >
                          {user.role === AppRole.ADMIN ? <LayoutDashboard className="size-4" /> :
                            user.role === AppRole.FARMER ? <Store className="size-4" /> : <Truck className="size-4" />}
                          <div className="flex-1">
                            {user.role === AppRole.ADMIN ? 'Trang quản trị' :
                              user.role === AppRole.FARMER ? 'Quản lý cửa hàng' : 'Trang tài xế'}
                          </div>
                          {user.kycStatus === KYCStatus.PENDING && (
                            <span className="bg-orange-100 text-orange-600 text-[8px] px-2 py-0.5 rounded-full">
                              CHỜ DUYỆT
                            </span>
                          )}
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          if (user?.role === AppRole.FARMER) {
                            navigate('/farmer/profile');
                          } else {
                            navigate('/profile');
                          }
                        }}
                        className="w-full px-5 py-3 text-left text-xs font-bold hover:bg-gray-50 flex items-center gap-3 transition-colors"
                      >
                        <UserIcon className="size-4 text-gray-400" /> Hồ sơ của tôi
                      </button>
                      <button onClick={() => { setShowProfileMenu(false); navigate('/my-orders'); }} className="w-full px-5 py-3 text-left text-xs font-bold hover:bg-gray-50 flex items-center gap-3 transition-colors">
                        <Package className="size-4 text-gray-400" /> Đơn hàng của tôi
                      </button>
                      {user?.role === AppRole.BUYER && (
                        <button onClick={() => { setShowProfileMenu(false); navigate('/my-vouchers'); }} className="w-full px-5 py-3 text-left text-xs font-bold hover:bg-gray-50 flex items-center gap-3 transition-colors">
                          <Ticket className="size-4 text-gray-400" /> Kho voucher
                        </button>
                      )}
                      {/* <button onClick={() => { setShowProfileMenu(false); navigate('/my-returns'); }} className="w-full px-5 py-3 text-left text-xs font-bold hover:bg-gray-50 flex items-center gap-3 transition-colors">
                        <RefreshCw className="size-4 text-gray-400" /> Đổi trả / Hoàn tiền
                      </button> */}
                      {/* {(user?.role === AppRole.BUYER || user?.role === AppRole.FARMER) && (
                        <button onClick={() => { setShowProfileMenu(false); navigate('/chat'); }} className="w-full px-5 py-3 text-left text-xs font-bold hover:bg-gray-50 flex items-center gap-3 transition-colors">
                          <MessageSquare className="size-4 text-gray-400" /> Tin nhắn
                        </button>
                      )} */}
                      <div className="h-px bg-gray-50 mx-3 my-1" />
                      <button onClick={() => { setShowProfileMenu(false); onLogout(); }} className="w-full px-5 py-3 text-left text-xs font-black text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors">
                        <LogOut className="size-4" /> Đăng xuất
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/login')}
                  className="px-6 py-2.5 text-sm font-black uppercase tracking-widest hover:opacity-80 transition-opacity"
                >
                  Đăng nhập
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="px-6 py-2.5 bg-[#FAD973] text-[#38543a] rounded-full text-sm font-black uppercase tracking-widest shadow-lg shadow-black/10 hover:scale-105 transition-all"
                >
                  Đăng ký
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sub Header - Navigation (cùng padding & max-width với top bar để thẳng hàng) */}
      <div className={`bg-white border-b border-gray-100 ${outerPaddingClass} h-14 flex items-center w-full`}>
        <div className={`flex items-center justify-between w-full ${containerClass}`}>
          <div className="flex-1" />
          <nav className="flex items-center gap-10">
            <Link
              to="/mystery-boxes"
              className={`text-xs font-bold uppercase tracking-tight transition-all ${location.pathname.includes('/mystery-box') ? 'text-gray-900 border-b-2 border-[#29a33d] pb-1' : 'text-gray-600 hover:text-primary'}`}
            >
              GÓI MÙ
            </Link>
            <Link
              to="/"
              className={`text-xs font-black pb-1 uppercase tracking-tight text-nowrap transition-all ${activeTab === 'home' ? 'text-gray-900 border-b-2 border-[#29a33d]' : 'text-gray-600 hover:text-primary'}`}
            >
              TRANG CHỦ
            </Link>
            <Link
              to="/news"
              className={`text-xs font-bold uppercase tracking-tight transition-all ${activeTab === 'news' ? 'text-gray-900 border-b-2 border-[#29a33d] pb-1' : 'text-gray-600 hover:text-primary'}`}
            >
              TIN TỨC
            </Link>
            {/* <Link
              to="/meal-plan"
              className={`text-xs font-bold uppercase tracking-tight transition-all ${location.pathname === '/meal-plan' ? 'text-gray-900 border-b-2 border-[#29a33d] pb-1' : 'text-gray-600 hover:text-primary'}`}
            >
              KẾ HOẠCH ĂN UỐNG
            </Link> */}
          </nav>
          <div className="flex-1" />

          <div className="flex items-center gap-2.5 text-gray-800">
            <Phone className="size-4 fill-current" />
            <span className="text-xs font-black uppercase tracking-tight">HOTLINE: 0913 135 603</span>
          </div>
        </div>
      </div>
      {/* Notification Detail Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-black text-gray-900 truncate pr-4">{selectedNotification.title}</h3>
              <button
                onClick={() => setSelectedNotification(null)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors shrink-0"
              >
                <X className="size-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm font-medium text-gray-600 leading-relaxed whitespace-pre-wrap">
                {selectedNotification.message}
              </p>

              <p className="mt-6 text-xs text-gray-400 font-bold uppercase tracking-widest text-right">
                {selectedNotification.createAt ? new Date(selectedNotification.createAt).toLocaleString('vi-VN') : ''}
              </p>
            </div>
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedNotification(null)}
                className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-dark transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
