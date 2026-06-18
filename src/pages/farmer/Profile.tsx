import React, { useEffect, useState, useRef } from 'react';
import { Camera, ShieldCheck, Mail, Phone, MapPin, Star, Award, Leaf, FileText, Plus, Save, ExternalLink, User, CheckCircle2, Hourglass, ShieldAlert, Package, ShoppingBag, TrendingUp, Loader2, BookOpen, Share2, Copy, Check, X, Facebook } from 'lucide-react';
import { authService, UserResponse, productService, ProductResponse, orderService, OrderResponse } from '../../services';

const Profile: React.FC = () => {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [shopName, setShopName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  // Real statistics
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await authService.getMyInfo();
        if (response.result) {
          const u = response.result;
          setUser(u);
          setFullName(u.fullName || '');
          setPhoneNumber(u.phoneNumber || '');
          setEmail(u.email || '');
          setAddress(u.address || '');
          setShopName(u.shopName || '');
          setDescription(u.description || '');
          
          // Fetch statistics
          await fetchStatistics(u.id);
        }
      } catch (err) {
        console.error('Failed to load profile', err);
        setError('Không thể tải hồ sơ. Vui lòng đảm bảo bạn đã đăng nhập.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();

    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, []);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
    }
  };

  const fetchStatistics = async (userId: number) => {
    setStatsLoading(true);
    try {
      const [productsRes, ordersRes] = await Promise.all([
        productService.getByShopId(userId).catch(() => ({ result: [] })),
        orderService.getAllOrders().catch(() => ({ result: [] }))
      ]);
      
      if (productsRes.result) setProducts(productsRes.result);
      if (ordersRes.result) setOrders(ordersRes.result);
    } catch (err) {
      console.error('Failed to load statistics', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await authService.updateMyInfo({
        fullName,
        phoneNumber,
        address,
        shopName,
        description,
      }, avatarFile || undefined);
      if (response.result) {
        setUser(response.result);
        setAvatarFile(null);
        setSuccess('Lưu thay đổi thành công.');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Failed to update profile', err);
      setError('Lưu thay đổi thất bại. Vui lòng thử lại sau.');
    } finally {
      setSaving(false);
    }
  };

  // Calculate real statistics
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.status === 'AVAILABLE').length;
  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === 'COMPLETED').length;
  const totalRevenue = orders
    .filter(o => o.status === 'COMPLETED')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const getStatusBadge = () => {
    if (user?.status === 'PENDING') {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 text-[10px] font-black uppercase rounded-full border border-orange-200">
          <Hourglass className="size-3.5" /> Đang chờ duyệt
        </span>
      );
    } else if (user?.status === 'ACTIVE') {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 text-[10px] font-black uppercase rounded-full border border-green-200">
          <ShieldCheck className="size-3.5" /> Đã xác thực
        </span>
      );
    } else {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 text-[10px] font-black uppercase rounded-full border border-red-200">
          <ShieldAlert className="size-3.5" /> Chưa xác thực
        </span>
      );
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black font-display text-gray-900">Hồ sơ Shop</h2>
          <p className="text-gray-500 font-medium text-sm mt-1">Quản lý thông tin và thống kê cửa hàng của bạn</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="px-6 py-2.5 bg-primary text-white rounded-xl font-black flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all transform active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 rounded-2xl border border-red-100 p-4 text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 rounded-2xl border border-green-100 p-4 text-sm text-green-700 font-medium flex items-center gap-2">
          <CheckCircle2 className="size-4" /> {success}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Loader2 className="size-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-gray-600 font-medium">Đang tải hồ sơ...</p>
        </div>
      ) : (
        <>
          {/* Profile Header Card */}
          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative group">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                <div 
                  className="size-24 rounded-2xl overflow-hidden border-4 border-white shadow-lg bg-gradient-to-br from-green-100 to-blue-100 cursor-pointer"
                  onClick={handleAvatarClick}
                >
                  <img 
                    src={avatarPreview || user?.logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || 'User')}&background=63b34a&color=fff&size=200&bold=true`}
                    className="w-full h-full object-cover" 
                    alt="Avatar"
                  />
                </div>
                <button 
                  onClick={handleAvatarClick}
                  className="absolute -bottom-1 -right-1 size-8 bg-primary text-white rounded-lg shadow-lg border-2 border-white flex items-center justify-center hover:scale-110 transition-transform"
                >
                  <Camera className="size-4" />
                </button>
              </div>
              
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                  <h3 className="text-2xl font-black text-gray-900">
                    {shopName || fullName || 'Cửa hàng'}
                  </h3>
                  {getStatusBadge()}
                </div>
                
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <User className="size-4" />
                    <span className="font-bold">ID: {user?.id}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Mail className="size-4" />
                    <span className="font-medium">{email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Phone className="size-4" />
                    <span className="font-medium">{phoneNumber || 'Chưa cập nhật'}</span>
                  </div>
                </div>
              </div>

              {/* Nút chia sẻ gian hàng */}
              {user?.id && (
                <div className="relative shrink-0">
                  <button
                    onClick={() => setShowShareMenu(v => !v)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-black hover:bg-primary-dark transition-all shadow-sm"
                  >
                    <Share2 className="size-4" />
                    Chia sẻ gian hàng
                  </button>
                  {showShareMenu && (
                    <div className="absolute right-0 top-12 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-60">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Chia sẻ cửa hàng</p>
                        <button onClick={() => setShowShareMenu(false)} className="size-6 flex items-center justify-center hover:bg-gray-100 rounded-lg">
                          <X className="size-3.5 text-gray-400" />
                        </button>
                      </div>
                      <div className="space-y-1">
                        <button
                          onClick={async () => {
                            await navigator.clipboard.writeText(`${window.location.origin}/shop/${user.id}`);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-sm font-bold text-gray-700 transition-colors"
                        >
                          {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4 text-gray-400" />}
                          {copied ? 'Đã sao chép!' : 'Sao chép link'}
                        </button>
                        <button
                          onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/shop/${user.id}`)}`, '_blank', 'width=600,height=400')}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 text-sm font-bold text-blue-600 transition-colors"
                        >
                          <Facebook className="size-4" /> Chia sẻ Facebook
                        </button>
                        <button
                          onClick={() => window.open(`https://zalo.me/share?url=${encodeURIComponent(`${window.location.origin}/shop/${user.id}`)}`, '_blank', 'width=600,height=400')}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 text-sm font-bold text-blue-500 transition-colors"
                        >
                          <span className="size-4 rounded-full bg-blue-500 text-white text-[8px] font-black flex items-center justify-center flex-shrink-0">Z</span>
                          Chia sẻ Zalo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Nút xem hướng dẫn */}
              <button
                onClick={() => {
                  localStorage.removeItem('farmer_onboarding_done');
                  window.location.reload();
                }}
                className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-white border border-primary/20 text-primary rounded-xl text-xs font-black hover:bg-primary/5 transition-all shadow-sm"
              >
                <BookOpen className="size-4" />
                Xem hướng dẫn sử dụng
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div id="tour-profile-stats" className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="size-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Package className="size-5 text-blue-600" />
                </div>
                {statsLoading && <Loader2 className="size-4 animate-spin text-gray-400" />}
              </div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Sản phẩm</p>
              <h4 className="text-2xl font-black text-gray-900">{totalProducts}</h4>
              <p className="text-[10px] text-gray-400 font-medium mt-1">{activeProducts} đang bán</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="size-10 bg-green-50 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="size-5 text-green-600" />
                </div>
                {statsLoading && <Loader2 className="size-4 animate-spin text-gray-400" />}
              </div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Đơn hàng</p>
              <h4 className="text-2xl font-black text-gray-900">{totalOrders}</h4>
              <p className="text-[10px] text-gray-400 font-medium mt-1">{completedOrders} hoàn thành</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="size-10 bg-purple-50 rounded-xl flex items-center justify-center">
                  <TrendingUp className="size-5 text-purple-600" />
                </div>
                {statsLoading && <Loader2 className="size-4 animate-spin text-gray-400" />}
              </div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Doanh thu</p>
              <h4 className="text-2xl font-black text-gray-900">{(totalRevenue / 1000000).toFixed(1)}M</h4>
              <p className="text-[10px] text-gray-400 font-medium mt-1">Tổng cộng</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="size-10 bg-yellow-50 rounded-xl flex items-center justify-center">
                  <Star className="size-5 text-yellow-600" />
                </div>
              </div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Đánh giá</p>
              <h4 className="text-2xl font-black text-gray-900">{user?.ratingAverage ? user.ratingAverage.toFixed(1) : 'N/A'}</h4>
              <p className="text-[10px] text-gray-400 font-medium mt-1">{user?.ratingAverage ? `${user.ratingAverage} sao` : 'Chưa có đánh giá'}</p>
            </div>
          </div>

          {/* Main Content Grid */}
          <div id="tour-profile-form" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Contact Info */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="size-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                  <User className="size-4" />
                </div>
                <h4 className="font-black text-gray-800 uppercase tracking-tight text-sm">Thông tin cửa hàng</h4>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Tên cửa hàng</label>
                    <input
                      type="text"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="Nhập tên cửa hàng"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Họ và tên chủ shop</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nhập họ tên"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Số điện thoại</label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Nhập số điện thoại"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Email</label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm font-medium text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Địa chỉ</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Nhập địa chỉ cửa hàng"
                      className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
                    />
                    <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Mô tả cửa hàng</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Giới thiệu về cửa hàng, phương pháp canh tác..."
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Shop Info & Certificates */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="size-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                  <Award className="size-4" />
                </div>
                <h4 className="font-black text-gray-800 uppercase tracking-tight text-sm">Thông tin bổ sung</h4>
              </div>

              <div className="space-y-4">
                {/* Role Badge */}
                <div className="p-4 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border border-green-100">
                  <p className="text-[10px] font-black text-gray-500 uppercase mb-2">Vai trò</p>
                  <p className="text-sm font-black text-gray-900">
                    {user?.role?.name === 'SHOP_OWNER' ? 'Chủ cửa hàng' : 
                     user?.role?.name === 'BUYER' ? 'Người mua' : 
                     user?.role?.name === 'SHIPPER' ? 'Người giao hàng' : 
                     user?.role?.name === 'ADMIN' ? 'Quản trị viên' : 
                     user?.role?.name || 'N/A'}
                  </p>
                </div>

                {/* Join Date */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-500 uppercase mb-2">Ngày tham gia</p>
                  <p className="text-sm font-bold text-gray-700">{formatDate(user?.createAt || user?.createdAt)}</p>
                </div>

                {/* Certificates Section */}
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-[10px] font-black text-gray-500 uppercase mb-3">Chứng chỉ</p>
                  
                  <div className="space-y-2">
                    {user?.achievement ? (
                      <div className="p-3 bg-green-50 rounded-lg border border-green-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="size-8 bg-white rounded-lg flex items-center justify-center">
                            <CheckCircle2 className="size-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-900">Chứng chỉ/Thành tựu</p>
                            <p className="text-[9px] text-gray-500 line-clamp-1">{user.achievement}</p>
                          </div>
                        </div>
                        <Award className="size-4 text-primary opacity-20" />
                      </div>
                    ) : (
                      <>
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between opacity-60">
                          <div className="flex items-center gap-2">
                            <div className="size-8 bg-white rounded-lg flex items-center justify-center">
                              <CheckCircle2 className="size-4 text-gray-400" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-400">VietGAP</p>
                              <p className="text-[9px] text-gray-400">Chưa cập nhật</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between opacity-60">
                          <div className="flex items-center gap-2">
                            <div className="size-8 bg-white rounded-lg flex items-center justify-center">
                              <Leaf className="size-4 text-gray-400" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-400">Organic</p>
                              <p className="text-[9px] text-gray-400">Chưa cập nhật</p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    <button className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 flex items-center justify-center gap-2 hover:border-primary/40 hover:text-primary transition-all text-xs font-bold">
                      <Plus className="size-3.5" /> Tải lên chứng chỉ
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Profile;
