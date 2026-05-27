import React, { useEffect, useState } from 'react';
import { UserCircle, CheckCircle, Edit3, Calendar, Clock, Package, Star, TrendingUp, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { authService } from '../../services/auth.service';
import { orderService } from '../../services/order.service';
import type { UserResponse } from '../../services/auth.service';
import type { StaffOrderReportResponse } from '../../services/order.service';

const StaffProfile: React.FC = () => {
  const [profile, setProfile] = useState<UserResponse | null>(() => authService.getUserInfo());
  const [report, setReport] = useState<StaffOrderReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [profileRes, reportRes] = await Promise.all([
        authService.getMyInfo(),
        orderService.getStaffOrderReport(),
      ]);
      if (profileRes.result) setProfile(profileRes.result);
      if (reportRes.result) setReport(reportRes.result);
    } catch (err: any) {
      setError(err?.data?.message || err?.message || 'Không thể tải thông tin');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (isLoading && !profile) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="size-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="flex items-center gap-3 p-6 m-8 bg-red-50 border border-red-100 rounded-2xl text-red-600">
        <AlertCircle className="size-5 shrink-0" />
        <p className="text-sm font-bold">{error}</p>
      </div>
    );
  }

  const stats = [
    {
      label: 'Đơn đang đến kho',
      value: report?.incomingOrders ?? '—',
      icon: TrendingUp,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
    },
    {
      label: 'Đơn chờ đóng gói',
      value: report?.packagingOrders ?? '—',
      icon: Package,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Đơn sẵn sàng giao',
      value: report?.readyOrders ?? '—',
      icon: Star,
      color: 'text-amber-500',
      bg: 'bg-amber-50',
    },
    {
      label: 'Duyệt thành công hôm nay',
      value: report?.approvedTodayOrders ?? '—',
      icon: Calendar,
      color: 'text-orange-500',
      bg: 'bg-orange-50',
    },
  ];

  const joinDate = profile?.createAt
    ? new Date(profile.createAt).toLocaleDateString('vi-VN')
    : '—';

  return (
    <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-500">
      {/* Header card */}
      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10">
        <div className="flex items-center gap-8">
          <div className="relative">
            {profile?.logoUrl ? (
              <img
                src={profile.logoUrl}
                className="size-24 rounded-[28px] object-cover border-4 border-white shadow-xl"
                alt=""
              />
            ) : (
              <div className="size-24 rounded-[28px] bg-primary/10 flex items-center justify-center border-4 border-white shadow-xl">
                <UserCircle className="size-12 text-primary" />
              </div>
            )}
            <div className="absolute -bottom-2 -right-2 size-8 bg-primary rounded-xl border-2 border-white flex items-center justify-center shadow-md">
              <CheckCircle className="size-4 text-white fill-current" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-1">
              <h2 className="text-2xl font-black text-gray-900">{profile?.fullName || '—'}</h2>
              <span className="px-3 py-1 bg-primary/5 text-primary text-[10px] font-black rounded-lg uppercase tracking-widest">
                {profile?.role?.name || 'Staff'}
              </span>
              {profile?.status === 'ACTIVE' && (
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-lg uppercase tracking-widest">
                  Đang hoạt động
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 font-bold mb-1">
              ID: #{profile?.id} · {profile?.address || 'Chưa cập nhật địa chỉ'}
            </p>
            <p className="text-xs text-gray-400 font-medium">
              {profile?.email} · {profile?.phoneNumber || 'Chưa có SĐT'}
            </p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-6 py-3 border border-gray-100 rounded-2xl text-xs font-black text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="size-4" /> Làm mới
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm relative">
            <div className={`absolute top-6 right-6 size-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center`}>
              <stat.icon className="size-6" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{stat.label}</p>
            <h3 className="text-3xl font-black text-gray-900">
              {isLoading ? <Loader2 className="size-6 animate-spin text-gray-300" /> : stat.value}
            </h3>
          </div>
        ))}
      </div>

      {/* Info + Report */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Thông tin cá nhân */}
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10">
          <h4 className="font-black text-gray-800 uppercase tracking-tight mb-8">Thông tin cá nhân</h4>
          <div className="flex flex-col gap-5">
            {[
              { label: 'Họ và tên', value: profile?.fullName },
              { label: 'Email', value: profile?.email },
              { label: 'Số điện thoại', value: profile?.phoneNumber || 'Chưa cập nhật' },
              { label: 'Địa chỉ', value: profile?.address || 'Chưa cập nhật' },
              { label: 'Vai trò', value: profile?.role?.name },
              { label: 'Ngày tham gia', value: joinDate },
              { label: 'Trạng thái', value: profile?.status },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-4 border-b border-gray-50 last:border-none">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.label}</p>
                <p className="text-sm font-bold text-gray-900">{item.value || '—'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Báo cáo tổng quan */}
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10">
          <div className="flex items-center gap-3 mb-8">
            <TrendingUp className="size-5 text-primary" />
            <h4 className="font-black text-gray-800 uppercase tracking-tight">Báo cáo tổng quan kho</h4>
          </div>
          <div className="flex flex-col gap-4">
            {[
              { label: 'Đơn đang vận chuyển tới kho', value: report?.incomingOrders, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Đơn đang kiểm duyệt chất lượng', value: report?.qualityCheckingOrders, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Đơn bị từ chối chất lượng', value: report?.quantityCheckedReject, color: 'text-red-600', bg: 'bg-red-50' },
              { label: 'Đơn chờ / đang đóng gói', value: report?.packagingOrders, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Đơn sẵn sàng giao shipper', value: report?.readyOrders, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Nông dân chờ duyệt', value: report?.pendingFarmerApprovals, color: 'text-orange-600', bg: 'bg-orange-50' },
              { label: 'Duyệt thành công hôm nay', value: report?.approvedTodayOrders, color: 'text-teal-600', bg: 'bg-teal-50' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-5 bg-gray-50 rounded-[20px] border border-gray-100">
                <p className="text-xs font-black text-gray-700">{item.label}</p>
                <span className={`px-3 py-1 text-sm font-black rounded-xl ${item.bg} ${item.color}`}>
                  {isLoading ? '...' : (item.value ?? 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffProfile;
