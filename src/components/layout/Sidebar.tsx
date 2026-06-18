
import React, { useState } from 'react';
import { AppRole, User } from '../../types/index';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Wallet,
  UserCircle,
  Gift,
  ShieldCheck,
  Store,
  Gavel,
  Users,
  Truck,
  Leaf,
  CheckCircle,
  LogOut,
  Bell,
  Newspaper,
  Send,
  ChevronRight,
  ChefHat,
  MessageSquare,
  ClipboardCheck,
  MapPin,
  Loader2,
  Banknote,
  BarChart3
} from 'lucide-react';
import { useNotificationWebSocket } from '@/src/services/useNotificationWebSocket';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services';
import { globalShowAlert, globalShowConfirm } from '../../contexts/PopupContext';

interface SidebarProps {
  role: AppRole;
  user: User | null;
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ role, user, currentPath, onNavigate, onLogout }) => {
  const { refreshUser } = useAuth();
  const [isTogglingShop, setIsTogglingShop] = useState(false);
  const shopActive = user?.shopActive !== false;

  const handleShopToggle = async () => {
    if (!user?.id || isTogglingShop) return;

    const nextOpen = !shopActive;
    const confirmMsg = nextOpen
      ? 'Bạn có muốn mở cửa hàng và tiếp tục bán hàng?'
      : 'Bạn có muốn tạm nghỉ bán?';
    if (!await globalShowConfirm(confirmMsg)) return;

    try {
      setIsTogglingShop(true);
      await userService.openCloseShop(Number(user.id), nextOpen);
      await refreshUser();
      globalShowAlert(
        nextOpen ? 'Cửa hàng đã mở bán' : 'Cửa hàng đã nghỉ bán',
        'Thành công',
        'success'
      );
    } catch (err: any) {
      globalShowAlert(err?.data?.message || 'Không thể thay đổi trạng thái cửa hàng', 'Lỗi', 'error');
    } finally {
      setIsTogglingShop(false);
    }
  };

  const farmerMenu = [
    { name: 'Tổng quan', icon: LayoutDashboard, id: 'overview' },
    { name: 'Sản phẩm', icon: Package, id: 'products' },
    { name: 'Đơn hàng', icon: ShoppingCart, id: 'orders' },
    { name: 'Phương tiện', icon: Truck, id: 'vehicles' },
    { name: 'Vận chuyển tới kho', icon: MapPin, id: 'trips' },
    { name: 'Ghép đơn', icon: ChefHat, id: 'trip-join' },

    { name: 'Đánh giá', icon: MessageSquare, id: 'reviews' },
    { name: 'Voucher', icon: Gift, id: 'vouchers' },
    { name: 'Thông báo', icon: Bell, id: 'notifications' },
    // { name: 'Khiếu nại', icon: Gavel, id: 'farmer-disputes' }, // tạm ẩn
    { name: 'Hồ sơ cá nhân', icon: UserCircle, id: 'profile' },
    { name: 'Tin nhắn', icon: Send, id: 'messages' },
    { name: 'Ví tiền', icon: Wallet, id: 'wallet' },
  ];

  const adminMenu = [
    { name: 'Bảng điều khiển', icon: LayoutDashboard, id: 'admin-overview' },
    { name: 'Báo cáo người dùng', icon: BarChart3, id: 'admin-user-report' },
    { name: 'Tin nhắn', icon: MessageSquare, id: 'admin-messages' },
    { name: 'Duyệt KYC', icon: ShieldCheck, id: 'admin-kyc' },
    { name: 'Quản lý tin tức', icon: Newspaper, id: 'admin-news' },
    { name: 'Quản lý thông báo', icon: Send, id: 'admin-notifications' },
    { name: 'Giám sát cửa hàng', icon: Store, id: 'admin-stores' },
    { name: 'Duyệt sản phẩm', icon: ClipboardCheck, id: 'admin-product-approval' },
    // { name: 'Tranh chấp', icon: Gavel, id: 'admin-disputes' }, // tạm ẩn
    { name: 'Quản lý Shipper', icon: Truck, id: 'admin-shippers' },
    { name: 'COD cần đối soát', icon: Banknote, id: 'admin-cod-settlement' },
    { name: 'Quản lý người dùng', icon: Users, id: 'admin-bad-buyers' },
    { name: 'Ví sàn', icon: Wallet, id: 'admin-wallet' },
  ];

  const staffMenu = [
    { name: 'Tổng quan kho', icon: LayoutDashboard, id: 'staff-overview' },
    { name: 'Quản lý đơn hàng', icon: ShoppingCart, id: 'staff-orders' },
    { name: 'Kiểm duyệt chất lượng', icon: ShieldCheck, id: 'staff-inspect' },
    { name: 'Đóng gói đơn hàng', icon: Package, id: 'staff-pack' },
    { name: 'Gọi Shipper', icon: Truck, id: 'staff-shipper' },
    { name: 'Hồ sơ nhân viên', icon: UserCircle, id: 'staff-profile' },
  ];

  const menu = role === AppRole.ADMIN ? adminMenu : (role === AppRole.STAFF ? staffMenu : farmerMenu);

  return (
    <aside className="w-80 bg-white border-r border-gray-100 flex flex-col h-full shadow-sm z-50">
      {/* Header Logo Area */}
      <div className="p-8 pb-4">
        <div className="flex items-center gap-3 px-2 cursor-pointer" onClick={() => onNavigate(role === AppRole.ADMIN ? 'admin-overview' : (role === AppRole.STAFF ? 'staff-overview' : 'overview'))}>
          <img src="/logo.png" alt="Logo" className="size-10 rounded-full shrink-0" />
          <div>
            <h1 className="text-xl font-black leading-none font-display text-gray-900 tracking-tight uppercase">NÔNG SẢN XẤU MÃ</h1>
            <p className="text-gray-400 text-[9px] font-bold mt-1 tracking-widest uppercase">{role === AppRole.ADMIN ? 'HỆ THỐNG QUẢN TRỊ' : (role === AppRole.STAFF ? 'NHÂN VIÊN HỖ TRỢ' : 'NÔNG TRẠI XANH')}</p>
          </div>
        </div>
      </div>

      {/* Scrollable Navigation Area */}
      <nav className="flex-1 overflow-y-auto px-6 py-4 space-y-1 custom-scrollbar">
        {menu.map((item) => {
          const isActive = currentPath === item.id || (currentPath === 'add-product' && item.id === 'products');
          return (
            <button
              key={item.id}
              id={`sidebar-item-${item.id}`}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${isActive
                ? 'bg-primary/5 text-primary border border-primary/10'
                : 'text-gray-400 hover:bg-gray-50'
                }`}
            >
              <item.icon className={`size-5 shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:translate-x-1'}`} />
              <span className={`text-sm font-black ${isActive ? 'text-primary' : 'text-gray-500'}`}>{item.name}</span>
              {isActive && <ChevronRight className="ml-auto size-3 opacity-50" />}
            </button>
          );
        })}
      </nav>

      {/* Footer Area - Compact User & Logout */}
      <div className="p-6 border-t border-gray-50 bg-white mt-auto">
        <div className="bg-gray-50/80 rounded-[20px] p-3 border border-gray-100 flex items-center gap-3 transition-all duration-300 hover:bg-gray-50 group/footer">
          <div className="relative shrink-0">
            <img
              className="size-9 rounded-xl border-2 border-white shadow-sm object-cover bg-orange-100"
              src={user?.avatar || (role === AppRole.FARMER ? "https://picsum.photos/seed/farmer_ba/100/100" : (role === AppRole.STAFF ? "https://picsum.photos/seed/staff_avatar/100/100" : "https://picsum.photos/seed/admin_avatar/100/100"))}
              alt="User"
            />
            <div className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white flex items-center justify-center ${
              role === AppRole.FARMER && !shopActive ? 'bg-gray-400' : 'bg-primary'
            }`}>
              <CheckCircle className="size-1.5 text-white fill-current" />
            </div>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <p className="text-[11px] font-black text-gray-900 truncate uppercase tracking-tight">
              {user?.name || (role === AppRole.FARMER ? 'Bác Ba Nông Dân' : (role === AppRole.STAFF ? 'Nhân Viên Hỗ Trợ' : 'Admin Tổng'))}
            </p>
            {role === AppRole.FARMER ? (
              <button
                type="button"
                role="switch"
                aria-checked={shopActive}
                disabled={isTogglingShop}
                onClick={handleShopToggle}
                className="mt-0.5 flex items-center gap-2 disabled:opacity-60"
                title={shopActive ? 'Nhấn để nghỉ bán' : 'Nhấn để mở bán'}
              >
                <span
                  className={`relative inline-flex h-4 w-8 shrink-0 items-center rounded-full transition-colors duration-300 ${
                    shopActive ? 'bg-primary' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block size-3 transform rounded-full bg-white shadow transition-transform duration-300 ${
                      shopActive ? 'translate-x-[18px]' : 'translate-x-0.5'
                    }`}
                  />
                </span>
                <span className={`text-[8px] uppercase tracking-widest font-black ${
                  shopActive ? 'text-primary' : 'text-gray-400'
                }`}>
                  {isTogglingShop
                    ? <Loader2 className="size-3 animate-spin" />
                    : shopActive ? 'Đang bán' : 'Nghỉ bán'
                  }
                </span>
              </button>
            ) : (
              <p className="text-[8px] text-primary uppercase tracking-widest font-black flex items-center gap-1">
                <span className="size-1 bg-primary rounded-full animate-pulse" />
                ONLINE
              </p>
            )}
          </div>
          <button
            onClick={onLogout}
            id="tour-sidebar-logout"
            title="Đăng xuất"
            className="size-8 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300 shadow-sm hover:shadow-red-200"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
