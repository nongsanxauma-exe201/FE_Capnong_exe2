
import React, { useEffect, useState } from 'react';
import { ShoppingCart, TrendingUp, Star, Package, MoreVertical, Sparkles, Landmark, History, Loader2, AlertCircle } from 'lucide-react';
import { productService, orderService, walletService, authService, mysteryBoxService, ProductResponse, OrderResponse, WalletResponse, MysteryBox } from '../../services';

const FarmerDashboard: React.FC<{ onNavigate: (id: string) => void }> = ({ onNavigate }) => {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [mysteryBoxes, setMysteryBoxes] = useState<MysteryBox[]>([]);
  const [activeTab, setActiveTab] = useState<'NONG_SAN' | 'BLIND_BOX'>('NONG_SAN');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Get user info to get shopId
        const userInfo = await authService.getMyInfo();
        const shopId = userInfo.result?.id;

        const [productsRes, ordersRes, walletRes, mysteryBoxesRes] = await Promise.all([
          (shopId ? productService.getByShopId(shopId) : productService.getAll())
            .catch(e => { console.error('Products fetch error', e); return { result: [] }; }),
          orderService.getAllOrders()
            .catch(e => { console.error('Orders fetch error', e); return { result: [] }; }),
          walletService.getMyWallet()
            .catch(e => { console.error('Wallet fetch error', e); return { result: null }; }),
          mysteryBoxService.getMyBoxes()
            .catch(e => { console.error('Mystery boxes fetch error', e); return { result: [] }; }),
        ]);

        if (productsRes.result) setProducts(Array.isArray(productsRes.result) ? productsRes.result : [productsRes.result]);
        if (ordersRes.result) setOrders(Array.isArray(ordersRes.result) ? ordersRes.result : [ordersRes.result]);
        if (walletRes.result) setWallet(walletRes.result as WalletResponse);
        if (mysteryBoxesRes.result) setMysteryBoxes(Array.isArray(mysteryBoxesRes.result) ? mysteryBoxesRes.result : [mysteryBoxesRes.result]);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
        setError('Không thể tải một số dữ liệu. Vui lòng làm mới trang.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalOrders = orders.length;
  const totalBalance = wallet?.totalBalance || 0;
  const totalBlindBoxes = mysteryBoxes.length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <Loader2 className="size-10 text-primary animate-spin" />
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Đang tải bảng điều khiển...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black font-display text-gray-900">Bảng Điều Khiển Nông Dân</h2>
          <p className="text-gray-400 font-medium text-sm mt-1">Chào buổi sáng, hôm nay bạn có {orders.filter(o => o.status === 'PENDING' || o.status === 'NEW').length} đơn hàng mới.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <input type="text" placeholder="Tìm kiếm nhanh..." className="pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-full text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all w-64 shadow-sm" />
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">search</span>
          </div>
          <button onClick={() => onNavigate('trips')} className="rounded-3xl bg-primary px-4 py-2 text-sm font-black uppercase tracking-widest text-white shadow-sm hover:bg-primary/90 transition">
            Vận chuyển tới kho
          </button>
          <button onClick={() => onNavigate('notifications')} className="size-11 bg-white border border-gray-100 rounded-full flex items-center justify-center text-gray-400 relative shadow-sm">
            <span className="material-symbols-outlined fill-1">notifications</span>
            <span className="absolute top-2 right-2 size-2.5 bg-red-500 border-2 border-white rounded-full"></span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600 font-bold text-sm">
          <AlertCircle className="size-5" /> {error}
        </div>
      )}

      {/* Stats Grid */}
      <div id="tour-overview-stats" className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tổng đơn hàng', value: totalOrders.toLocaleString('vi-VN'), trend: `${products.length} sản phẩm`, icon: ShoppingCart },
          { label: 'Sản phẩm đang bán', value: products.length.toString(), trend: 'Đang hoạt động', icon: TrendingUp },
          { label: 'Hộp mù (Blind Box)', value: totalBlindBoxes.toString(), trend: 'Giải cứu nông sản', icon: Sparkles },
          { label: 'Chất lượng Shop', value: '98%', trend: 'Top 5%', icon: Star, bar: 98 },
        ].map((stat, i) => (
          <div
            key={i}
            className={`p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group min-h-[140px] flex flex-col justify-between ${stat.isPrimary ? 'bg-primary text-white md:col-span-3 lg:col-span-1' : 'bg-white'
              }`}
          >
            {/* Label phần trên */}
            <div className="relative z-10">
              <p className={`text-[10px] font-black uppercase tracking-widest leading-tight mb-3 h-[28px] ${stat.isPrimary ? 'text-white/70' : 'text-gray-400'
                }`}>
                {stat.label}
              </p>

              {/* Row chứa Số và Trend - Dùng items-end để chân số thẳng hàng */}
              <div className="flex flex-col justify-center">
                <h3 className="text-2xl font-black font-display leading-none tabular-nums">
                  {stat.value}
                </h3>

                {stat.trend && (
                  <span
                    className={`text-[11px] font-medium mt-1 ${stat.isPrimary ? 'text-white/80' : 'text-primary'
                      }`}
                  >
                    {stat.trend}
                  </span>
                )}
              </div>
            </div>

            {/* Phần bổ sung phía dưới (Bar hoặc Wallet info) */}
            <div className="relative z-10 mt-auto">
              {stat.bar ? (
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${stat.bar}%` }} />
                </div>
              ) : stat.isPrimary ? (
                <div className="pt-2">
                  <p className="text-[9px] text-white/70 font-bold mb-2">Đóng băng: {stat.frozen}</p>
                  <button
                    onClick={() => onNavigate('wallet')}
                    className="w-full bg-white text-primary text-[10px] font-black py-2 rounded-xl hover:bg-gray-50 transition-all active:scale-95"
                  >
                    RÚT TIỀN
                  </button>
                </div>
              ) : (
                /* Tạo khoảng trống giả để các card không có bar vẫn giữ layout */
                <div className="h-1.5 w-full" />
              )}
            </div>

            {/* Icon nền - Thu nhỏ lại và cố định góc để không đè chữ */}
            <stat.icon className={`absolute -right-3 -bottom-3 size-16 opacity-[0.05] transform group-hover:scale-110 transition-transform ${stat.isPrimary ? 'text-white' : 'text-gray-400'
              }`} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Product Management Section */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div id="tour-overview-products" className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <Package className="size-5" />
                </div>
                <h4 className="font-black text-gray-800 uppercase tracking-tight">Quản lý sản phẩm</h4>
              </div>
            </div>
            <div className="p-0 overflow-x-auto">
              {/* Inline Tabs for Table */}
              <div className="flex border-b border-gray-100 w-full bg-gray-50/30">
                <button
                  onClick={() => setActiveTab('NONG_SAN')}
                  className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'NONG_SAN' ? 'bg-primary/5 text-primary border-b-2 border-primary' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
                >
                  Nông Sản ({products.length})
                </button>
                <button
                  onClick={() => setActiveTab('BLIND_BOX')}
                  className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'BLIND_BOX' ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-500' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
                >
                  Hộp Mù ({totalBlindBoxes})
                </button>
              </div>

              <table className="w-full text-left">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{activeTab === 'NONG_SAN' ? 'Sản phẩm' : 'Tên Combo / Hộp mù'}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Giá</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">{activeTab === 'NONG_SAN' ? 'Danh mục' : 'Thành phần phụ'}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Trạng thái</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {/* Rendering Products */}
                  {activeTab === 'NONG_SAN' && products.slice(0, 5).map((p, i) => (
                    <tr key={p.id || i} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={p.imageUrl || `https://picsum.photos/seed/product${i}/40/40`} className="size-10 rounded-xl object-cover" />
                          <div>
                            <p className="text-sm font-bold text-gray-900 line-clamp-1">{p.productName}</p>
                            <p className="text-[10px] text-gray-400 font-medium">Nông sản</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {p.salePrice != null && p.salePrice > 0 ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-red-500 line-through font-semibold">{(p.sellingPrice || 0).toLocaleString('vi-VN')}đ</span>
                              <span className="bg-primary text-white text-[8px] font-black px-1 py-0.5 rounded-full">-{p.discountPercent}%</span>
                            </div>
                            <span className="text-sm font-bold text-primary">{p.salePrice.toLocaleString('vi-VN')}đ</span>
                          </div>
                        ) : (
                          <span className="text-sm font-bold text-primary">{(p.sellingPrice || 0).toLocaleString('vi-VN')}đ</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded-full">Nông sản</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="size-1.5 bg-primary rounded-full"></span>
                          <span className="text-[11px] font-bold text-gray-600">
                            {p.status === 'AVAILABLE' ? 'Đang bán' : p.status === 'OUT_OF_STOCK' ? 'Hết hàng' : p.status === 'INACTIVE' ? 'Đã ẩn' : p.status === 'PENDING' ? 'Chờ duyệt' : 'Đang bán'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="size-8 rounded-lg hover:bg-gray-100 flex items-center justify-center ml-auto">
                          <MoreVertical className="size-4 text-gray-400" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* Rendering Blind Boxes */}
                  {activeTab === 'BLIND_BOX' && mysteryBoxes.slice(0, 5).map((box, i) => (
                    <tr key={box.id || i} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-xl flex items-center justify-center text-white shadow-sm bg-purple-500">
                            <Sparkles className="size-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold line-clamp-1 text-purple-700">{box.boxType}</p>
                            <p className="text-[10px] text-gray-400 font-medium">Hộp mù</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-bold text-gray-700">{(box.price || 0).toLocaleString('vi-VN')}đ</td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-full">{box.totalQuantity || 0} túi</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`size-1.5 ${(box.isActive === true || box.isActive === 1) ? 'bg-green-500' : 'bg-gray-300'} rounded-full`}></span>
                          <span className="text-[11px] font-bold text-gray-600">{(box.isActive === true || box.isActive === 1) ? 'Đang Mở' : 'Đang Ẩn'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="size-8 rounded-lg hover:bg-gray-100 flex items-center justify-center ml-auto">
                          <MoreVertical className="size-4 text-gray-400" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {activeTab === 'NONG_SAN' && products.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-400 font-bold text-sm">Chưa có sản phẩm nào. Hãy thêm sản phẩm mới!</td>
                    </tr>
                  )}
                  {activeTab === 'BLIND_BOX' && mysteryBoxes.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-400 font-bold text-sm">Chưa có hộp mù nào được tạo.</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <button onClick={() => onNavigate(activeTab === 'NONG_SAN' ? 'products' : 'blind-box-list')} className="w-full py-4 text-primary text-xs font-bold hover:bg-primary/5 border-t border-gray-50 transition-all uppercase tracking-widest">
                Xem chi tiết tất cả {activeTab === 'NONG_SAN' ? products.length : mysteryBoxes.length} đối tượng
              </button>
            </div>
          </div>

          <div id="tour-overview-finance" className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Landmark className="size-5" />
              </div>
              <h4 className="font-black text-gray-800 uppercase tracking-tight">Chi tiết tài chính</h4>
            </div>
            <div id="tour-overview-finance-cards" className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-gray-50/50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Số dư khả dụng</p>
                <h3 className="text-2xl font-black text-gray-900 mt-1">{totalBalance.toLocaleString('vi-VN')}đ</h3>
              </div>
              <div className="p-6 bg-yellow-50/50 rounded-2xl border border-yellow-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-yellow-600">Số dư đóng băng</p>
                <h3 className="text-2xl font-black text-yellow-700 mt-1">{wallet?.frozenBalance?.toLocaleString('vi-VN')}đ</h3>
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button onClick={() => onNavigate('wallet')} className="flex-1 py-3 bg-primary text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                <Landmark className="size-4" /> Rút tiền về ngân hàng
              </button>
              <button onClick={() => onNavigate('wallet')} className="flex-1 py-3 bg-white border border-gray-100 text-gray-600 font-bold rounded-2xl flex items-center justify-center gap-2 shadow-sm">
                <History className="size-4" /> Lịch sử giao dịch
              </button>
            </div>
          </div>

        </div>

        {/* Sidebar Tool: Recent Orders */}
        <div className="flex flex-col gap-6">
          <div id="tour-overview-orders" className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 overflow-hidden relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <ShoppingCart className="size-5" />
              </div>
              <div>
                <h4 className="font-black text-gray-800 uppercase tracking-tight">Quản lý Đơn hàng</h4>
                <p className="text-[10px] text-gray-400 font-medium">Danh sách các đơn hàng mới nhất.</p>
              </div>
            </div>

            <div className="space-y-4">
              {orders.slice(0, 5).map((order, i) => (
                <div key={order.id || i} className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="size-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                      <Package className="size-5" />
                    </div>
                    <div className="max-w-[120px]">
                      <p className="text-xs font-bold text-gray-800 truncate">Đơn #{order.id}</p>
                      <p className="text-[10px] text-gray-400 font-medium truncate">{order.shippingAddress || 'Khách hàng'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-black text-primary">{(order.totalAmount || 0).toLocaleString('vi-VN')}đ</p>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${order.status === 'PENDING' ? 'bg-orange-50 text-orange-600' :
                      order.status === 'PAID' ? 'bg-blue-50 text-blue-600' :
                        order.status === 'CONFIRMED' ? 'bg-purple-50 text-purple-700' :
                          order.status === 'SHIPPING' ? 'bg-blue-50 text-blue-600' :
                            order.status === 'DELIVERED' ? 'bg-green-50 text-green-600' :
                              order.status === 'FAILED' ? 'bg-red-50 text-red-600' :
                                order.status === 'CANCELLED' ? 'bg-gray-100 text-gray-500' :
                                  'bg-gray-50 text-gray-600'
                      }`}>
                      {order.status === 'PENDING' ? 'Chờ xác nhận' :
                        order.status === 'PAID' ? 'Đã TT QR' :
                          order.status === 'CONFIRMED' ? 'Đang chuẩn bị' :
                            order.status === 'SHIPPING' ? 'Đang giao' :
                              order.status === 'DELIVERED' ? 'Đã giao' :
                                order.status === 'FAILED' ? 'Thất bại' :
                                  order.status === 'CANCELLED' ? 'Đã hủy' :
                                    order.status || 'Mới'}
                    </span>

                  </div>
                </div>
              ))}
              {orders.length === 0 && (
                <div className="p-8 text-center bg-gray-50 rounded-2xl">
                  <p className="text-xs font-bold text-gray-400">Chưa có đơn hàng nào.</p>
                </div>
              )}
              <button
                onClick={() => onNavigate('orders')}
                className="w-full mt-2 py-4 bg-primary text-white font-black rounded-[20px] flex items-center justify-center gap-2 shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all transform active:scale-95"
              >
                <ShoppingCart className="size-4" /> Xem Tất Cả Đơn Hàng
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmerDashboard;
