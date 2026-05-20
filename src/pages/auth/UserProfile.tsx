
import React, { useEffect, useState, useRef } from 'react';
import { Camera, ShieldCheck, Mail, Phone, MapPin, Save, User, CheckCircle2, Package, Wallet, ShoppingCart, Loader2, ArrowRight, UserCircle } from 'lucide-react';
import { authService, UserResponse } from '../../services';
import { useNavigate } from 'react-router-dom';

const UserProfile: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<UserResponse | null>(null);
    const [fullName, setFullName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

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
                }
            } catch (err) {
                console.error('Failed to load profile', err);
                setError('Không thể tải hồ sơ. Vui lòng đảm bảo bạn đã đăng nhập.');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

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
            }, avatarFile || undefined);
            if (response.result) {
                setUser(response.result);
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

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            const previewUrl = URL.createObjectURL(file);
            setAvatarPreview(previewUrl);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center">
                <Loader2 className="size-10 animate-spin text-primary mb-4" />
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Đang tải hồ sơ...</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-12 pb-24 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 font-display">Hồ sơ cá nhân</h1>
                    <p className="text-gray-500 font-medium mt-2">Quản lý thông tin tài khoản và bảo mật của bạn</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-3 bg-primary text-white rounded-2xl font-black flex items-center gap-2 shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all transform active:scale-95 disabled:bg-gray-300"
                    >
                        {saving ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
                        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                </div>
            </div>

            {/* Status Alerts */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-sm font-bold flex items-center gap-2">
                    <div className="size-2 bg-red-500 rounded-full animate-pulse" />
                    {error}
                </div>
            )}
            {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-100 text-green-700 rounded-2xl text-sm font-bold flex items-center gap-2">
                    <CheckCircle2 className="size-5" />
                    {success}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column - Avatar & Quick Stats */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 flex flex-col items-center">
                        <div className="relative group mb-6">
                            <div className="size-32 rounded-3xl overflow-hidden border-4 border-white shadow-2xl bg-gradient-to-br from-green-50 to-blue-50">
                                <img
                                    src={avatarPreview || user?.logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || 'User')}&background=5DBE61&color=fff&size=200&bold=true`}
                                    className="w-full h-full object-cover"
                                    alt="Avatar"
                                />
                            </div>
                            <button
                                onClick={triggerFileInput}
                                className="absolute -bottom-2 -right-2 size-10 bg-white text-primary rounded-xl shadow-xl flex items-center justify-center hover:scale-110 hover:text-white hover:bg-primary transition-all"
                            >
                                <Camera className="size-5" />
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageChange}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>

                        <h2 className="text-2xl font-black text-gray-900 mb-1">{fullName || 'Người dùng'}</h2>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase rounded-full">
                            <ShieldCheck className="size-3" />
                            Tài khoản {user?.role?.name || 'BUYER'}
                        </div>

                        <div className="w-full h-px bg-gray-50 my-6" />

                        <div className="w-full space-y-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Email</span>
                                <span className="text-gray-900 font-medium truncate max-w-[150px]">{email}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Ngày tham gia</span>
                                <span className="text-gray-900 font-medium">{formatDate(user?.createdAt)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions Card */}
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-[32px] p-8 text-white shadow-xl">
                        <h3 className="text-lg font-black mb-6">Lối tắt</h3>
                        <div className="grid grid-cols-1 gap-3">
                            <button onClick={() => navigate('/my-orders')} className="group flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 bg-white/10 rounded-xl flex items-center justify-center">
                                        <Package className="size-5" />
                                    </div>
                                    <span className="font-bold text-sm">Đơn hàng của tôi</span>
                                </div>
                                <ArrowRight className="size-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                            </button>

                            <button onClick={() => navigate('/cart')} className="group flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 bg-white/10 rounded-xl flex items-center justify-center">
                                        <ShoppingCart className="size-5" />
                                    </div>
                                    <span className="font-bold text-sm">Giỏ hàng</span>
                                </div>
                                <ArrowRight className="size-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                            </button>

                            <button onClick={() => navigate('/wallet')} className="group flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 bg-white/10 rounded-xl flex items-center justify-center">
                                        <Wallet className="size-5" />
                                    </div>
                                    <span className="font-bold text-sm">Rút tiền</span>
                                </div>
                                <ArrowRight className="size-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column - Edit Form */}
                <div className="lg:col-span-8">
                    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="size-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                                <UserCircle className="size-6" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Chi tiết hồ sơ</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Họ và tên</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                        <User className="size-4" />
                                    </span>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Nhập họ tên đầy đủ"
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Số điện thoại</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                        <Phone className="size-4" />
                                    </span>
                                    <input
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        placeholder="Nhập số điện thoại"
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 mb-8">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Địa chỉ nhận hàng mặc định</label>
                            <div className="relative">
                                <span className="absolute left-4 top-4 text-gray-400">
                                    <MapPin className="size-4" />
                                </span>
                                <textarea
                                    rows={3}
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="Nhập địa chỉ giao hàng của bạn..."
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary transition-all resize-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Mail className="size-3" /> Địa chỉ Email (Không thể thay đổi)
                            </label>
                            <input
                                type="email"
                                value={email}
                                disabled
                                className="w-full px-6 py-4 bg-gray-100 border border-gray-100 rounded-2xl font-bold text-sm text-gray-400 cursor-not-allowed"
                            />
                        </div>

                        <div className="mt-12 pt-8 border-t border-gray-50">
                            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 flex items-start gap-4">
                                <div className="size-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                                    <ShieldCheck className="size-5 text-blue-500" />
                                </div>
                                <div>
                                    <h4 className="font-black text-blue-900 text-sm">Bảo mật tài khoản</h4>
                                    <p className="text-xs text-blue-700/70 font-medium mt-1 leading-relaxed">
                                        Thông tin của bạn được bảo mật tuyệt đối và chỉ được sử dụng cho mục đích giao hàng và hỗ trợ.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
