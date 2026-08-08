
import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Gavel,
  TrendingDown,
  UserCheck,
  Search,
  Bell,
  Clock,
  Lock,
  ChevronRight,
  UserX,
  CheckCircle2,
  XCircle,
  LogOut,
  Loader2,
  AlertCircle,
  Download,
  FileText,
} from 'lucide-react';
import { exportService } from '../../services/export.service';
import { userService, orderService, productService, UserResponse, OrderResponse, ProductResponse } from '../../services';
import { getOrderStatusBadgeClass, getOrderStatusLabel } from '../../constants/orderStatusLabels';

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Export state — default: last 30 days
  const defaultTo = new Date().toISOString().slice(0, 10);
  const defaultFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [exportFrom, setExportFrom] = useState(defaultFrom);
  const [exportTo, setExportTo] = useState(defaultTo);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfExportProgress, setPdfExportProgress] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExportExcel = async () => {
    setExportingExcel(true);
    setExportError(null);
    try {
      await exportService.exportAdminTransactionsExcel({ from: exportFrom, to: exportTo });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xuất Excel thất bại';
      setExportError(msg);
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    setExportError(null);
    setPdfExportProgress(null);
    try {
      const count = await exportService.exportAllAdminDeliveryReceipts(
        { from: exportFrom, to: exportTo },
        (current, total) => setPdfExportProgress(`Đang tải ${current}/${total}`),
      );
      if (count === 0) {
        setExportError('Không có hóa đơn nào trong khoảng ngày đã chọn.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xuất PDF thất bại';
      setExportError(msg);
    } finally {
      setExportingPdf(false);
      setPdfExportProgress(null);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [usersRes, ordersRes, productsRes] = await Promise.all([
          userService.getAllUsers(),
          orderService.getAllOrders(),
          productService.getAll(),
        ]);
        if (usersRes.result) {
          const rawUsers = Array.isArray(usersRes.result) ? usersRes.result : [usersRes.result];
          // Normalize: map role.name -> roleName nếu chưa có
          setUsers(rawUsers.map(u => ({ ...u, roleName: u.roleName || u.role?.name })));
        }
        if (ordersRes.result) setOrders(Array.isArray(ordersRes.result) ? ordersRes.result : [ordersRes.result]);
        if (productsRes.result) setProducts(Array.isArray(productsRes.result) ? productsRes.result : [productsRes.result]);
      } catch (err) {
        console.error('Failed to load admin dashboard', err);
        setError('Không thể tải dữ liệu admin dashboard.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const pendingKyc = users.filter(u => u.status === 'PENDING' || u.kycStatus === 'PENDING');
  const shopOwners = users.filter(u => u.roleName === 'SHOP_OWNER' || u.roleName === 'FARMER' || u.role?.name === 'SHOP_OWNER' || u.role?.name === 'FARMER');
  const buyers = users.filter(u => u.roleName === 'BUYER' || u.role?.name === 'BUYER');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <Loader2 className="size-10 text-primary animate-spin" />
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Đang tải admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-500">
      {/* Top Admin Action Bar */}
      <div className="flex justify-between items-center bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
        <div className="flex items-center gap-6 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-300" />
            <input type="text" placeholder="Tìm kiếm nhanh đơn hàng, tài khoản, khiếu nại..." className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="size-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 hover:text-primary transition-all relative">
            <Bell className="size-6" />
            <span className="absolute top-3 right-3 size-2.5 bg-red-500 border-2 border-white rounded-full"></span>
          </button>
          <div className="h-8 w-px bg-gray-100 mx-2" />
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-black text-gray-900">Admin Hệ Thống</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Root Access</p>
            </div>
            <img src="https://picsum.photos/seed/admin_avatar/100/100" className="size-11 rounded-2xl object-cover border-2 border-white shadow-sm" alt="avatar" />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600 font-bold text-sm">
          <AlertCircle className="size-5" /> {error}
        </div>
      )}

      {/* Top Bar Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'CHỜ DUYỆT KYC', value: pendingKyc.length.toString().padStart(2, '0'), trend: `${users.length} tổng tài khoản`, icon: UserCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'TỔNG CỬA HÀNG', value: shopOwners.length.toString().padStart(2, '0'), trend: `${shopOwners.filter(s => s.status === 'ACTIVE').length} đang hoạt động`, icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-50' },
          { label: 'TỔNG ĐƠN HÀNG', value: orders.length.toString().padStart(2, '0'), trend: `${products.length} sản phẩm`, icon: Gavel, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'TỔNG NGƯỜI MUA', value: buyers.length.toString(), trend: 'Đang hoạt động', icon: TrendingDown, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm relative group">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-3xl font-black text-gray-900 font-display">{stat.value}</h3>
            <p className={`text-[10px] font-bold mt-2 ${stat.color}`}>{stat.trend}</p>
            <div className={`absolute top-6 right-6 size-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center`}>
              <stat.icon className="size-6" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* KYC Queue */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-10 py-6 border-b border-gray-50 flex items-center justify-between">
              <h4 className="font-black text-gray-800 uppercase tracking-tight">Hàng đợi xác minh KYC (Nông dân)</h4>
              <button className="text-xs font-black text-primary hover:underline uppercase">Xem tất cả</button>
            </div>
            <table className="w-full text-left">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-10 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nông dân</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest min-w-[110px]">Trạng thái</th>
                  <th className="px-10 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pendingKyc.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-10 py-8 text-center text-gray-400 font-bold text-sm">Không có yêu cầu KYC nào đang chờ.</td>
                  </tr>
                ) : pendingKyc.slice(0, 5).map((item, i) => (
                  <tr key={item.id || i} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-10 py-5">
                      <div className="flex items-center gap-4">
                        <img src={item.logoUrl || `https://picsum.photos/seed/k${i}/80/80`} className="size-10 rounded-full object-cover" />
                        <span className="text-sm font-bold text-gray-900">{item.fullName || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-xs font-bold text-gray-600">{item.email || 'N/A'}</td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1.5 bg-orange-50 text-orange-600 text-xs font-bold rounded-lg leading-none">
                        {item.status === 'ACTIVE' ? 'Hoạt động' : item.status === 'INACTIVE' ? 'Tạm ngưng' : 'Chờ duyệt'}
                      </span>
                    </td>
                    <td className="px-10 py-5 text-right">
                      <button onClick={async () => { try { await userService.approveShopOwner(item.id); setUsers(prev => prev.map(u => u.id === item.id ? { ...u, status: 'ACTIVE', kycStatus: 'APPROVED' } : u)); } catch (e) { console.error(e); } }} className="px-6 py-2 bg-blue-50 text-blue-600 text-xs font-black rounded-xl hover:bg-blue-100 transition-colors">Duyệt</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-10 py-6 border-b border-gray-50">
              <h4 className="font-black text-gray-800 uppercase tracking-tight">Đơn hàng gần đây</h4>
            </div>
            <table className="w-full text-left">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-10 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Mã đơn</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Tổng tiền</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.slice(0, 5).map((order, i) => (
                  <tr key={order.id || i} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-10 py-5 text-sm font-black text-gray-900">#{order.id}</td>
                    <td className="px-6 py-5 text-center text-sm font-bold text-gray-700">{(order.totalAmount || 0).toLocaleString('vi-VN')}đ</td>
                    <td className="px-6 py-5 text-center">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${getOrderStatusBadgeClass(order.status)}`}>
                        {getOrderStatusLabel(order.status)}
                      </span>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-10 py-8 text-center text-gray-400 font-bold text-sm">Chưa có đơn hàng nào.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side Widgets */}
        <div className="flex flex-col gap-8">
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10">
            <div className="flex items-center gap-3 mb-8">
              <AlertTriangle className="size-6 text-red-500" />
              <h4 className="font-black text-gray-800 uppercase tracking-tight">Giám sát shop (Tín nhiệm thấp)</h4>
            </div>
            <div className="space-y-6">
              {shopOwners.filter(s => s.status === 'INACTIVE').length === 0 ? (
                <p className="text-sm text-gray-400 font-medium text-center py-4">Không có shop nào vi phạm.</p>
              ) : shopOwners.filter(s => s.status === 'INACTIVE').slice(0, 3).map((shop, i) => (
                <div key={i} className="p-6 bg-gray-50/50 rounded-[32px] border border-gray-100 relative group">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-black text-gray-900">{shop.shopName || shop.fullName || 'Shop N/A'}</p>
                      <p className="text-[10px] text-red-500 font-black mt-1 uppercase">{shop.status === 'INACTIVE' ? 'Tạm ngưng' : shop.status === 'PENDING' ? 'Chờ duyệt' : shop.status}</p>
                    </div>
                    <div className="size-10 bg-red-500 text-white rounded-xl flex items-center justify-center">
                      <Lock className="size-5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10">
            <h4 className="font-black text-gray-800 uppercase tracking-tight mb-8">Tổng quan hệ thống</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                <span className="text-xs font-bold text-gray-600">Tổng tài khoản</span>
                <span className="text-sm font-black text-gray-900">{users.length}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                <span className="text-xs font-bold text-gray-600">Tổng sản phẩm</span>
                <span className="text-sm font-black text-gray-900">{products.length}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                <span className="text-xs font-bold text-gray-600">Tổng đơn hàng</span>
                <span className="text-sm font-black text-gray-900">{orders.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Export section */}
      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10">
        <div className="flex items-center gap-3 mb-6">
          <Download className="size-6 text-emerald-600" />
          <h4 className="font-black text-gray-800 uppercase tracking-tight">Xuất báo cáo giao dịch</h4>
        </div>

        {exportError && (
          <div className="mb-4 bg-red-50 border border-red-100 p-3 rounded-2xl flex items-center gap-2 text-red-600 font-bold text-sm">
            <AlertCircle className="size-4 shrink-0" /> {exportError}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Từ ngày</label>
            <input
              type="date"
              value={exportFrom}
              max={exportTo}
              onChange={e => setExportFrom(e.target.value)}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-200 transition-all"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Đến ngày</label>
            <input
              type="date"
              value={exportTo}
              min={exportFrom}
              onChange={e => setExportTo(e.target.value)}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-200 transition-all"
            />
          </div>
          <button
            onClick={handleExportExcel}
            disabled={exportingExcel || exportingPdf}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-2xl text-sm font-black hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {exportingExcel ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Xuất Excel
          </button>
          <button
            onClick={handleExportPdf}
            disabled={exportingExcel || exportingPdf}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {exportingPdf ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
            {pdfExportProgress ?? 'Xuất tất cả hóa đơn'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
