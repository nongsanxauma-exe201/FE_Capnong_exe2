import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Truck, ClipboardCheck,
  ArrowRight, Clock, CheckCircle, Zap, Box, BarChart3, PackageCheck, RefreshCw, Search,
} from 'lucide-react';
import { orderService, type StaffOrderReportResponse } from '../../services';

const StaffDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [report, setReport] = useState<StaffOrderReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await orderService.getStaffOrderReport();
      setReport(res.result ?? null);
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; message?: string };
      setError(err?.data?.message || err?.message || 'Không thể tải báo cáo');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const onNavigate = (page: string) => {
    const route = page.replace('staff-', '');
    navigate(`/staff/${route}`);
  };

  const val = (v: number | null | undefined) => (isLoading ? '—' : v ?? 0);

  const pipeline = [
    { label: 'Đơn đang đến kho', value: val(report?.incomingOrders), color: 'text-blue-500', bg: 'bg-blue-50', icon: Truck, page: 'staff-orders' },
    { label: 'Đang kiểm tra', value: val(report?.quantityChecking), color: 'text-orange-500', bg: 'bg-orange-50', icon: Search, page: 'staff-orders' },
    { label: 'Chờ kiểm duyệt', value: val(report?.qualityCheckingOrders), color: 'text-purple-500', bg: 'bg-purple-50', icon: ClipboardCheck, page: 'staff-inspect' },
    { label: 'Chờ đóng gói', value: val(report?.packagingOrders), color: 'text-emerald-500', bg: 'bg-emerald-50', icon: Box, page: 'staff-pack' },
  ];

  const now = new Date();
  const dayNames = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dateStr = `${dayNames[now.getDay()]}, ${now.toLocaleDateString('vi-VN')}`;

  return (
    <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Tổng quan kho hàng hôm nay</h2>
          <p className="text-sm text-gray-400 font-medium mt-1">{dateStr}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void loadReport()}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-100 rounded-2xl text-xs font-black text-gray-500 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
          <div className="flex items-center gap-3 px-6 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
            <div className="size-2.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">Đang hoạt động</span>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
      )}

      {/* Pipeline Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {pipeline.map((item, i) => (
          <button
            key={i}
            onClick={() => onNavigate(item.page)}
            className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm text-left group hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden"
          >
            <div className={`absolute top-6 right-6 size-12 ${item.bg} ${item.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
              <item.icon className="size-6" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{item.label}</p>
            <h3 className="text-4xl font-black text-gray-900">{item.value}</h3>
            <p className="text-[10px] font-black text-gray-300 uppercase mt-3 flex items-center gap-1 group-hover:text-primary transition-colors">
              Xem chi tiết <ArrowRight className="size-3" />
            </p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-white rounded-[40px] border border-gray-100 shadow-sm p-10">
          <div className="flex items-center gap-3 mb-8">
            <Zap className="size-5 text-primary" />
            <h4 className="font-black text-gray-800 uppercase tracking-tight">Thao tác nhanh theo quy trình</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Đơn đang đến kho', sub: `${val(report?.incomingOrders)} đơn cần theo dõi`, icon: Truck, color: 'text-blue-500', bg: 'bg-blue-50', page: 'staff-orders' },
              { label: 'Đang kiểm tra', sub: `${val(report?.quantityChecking)} đơn đang kiểm`, icon: Search, color: 'text-orange-500', bg: 'bg-orange-50', page: 'staff-orders' },
              { label: 'Kiểm duyệt chất lượng', sub: `${val(report?.qualityCheckingOrders)} đơn chờ kiểm`, icon: ClipboardCheck, color: 'text-purple-500', bg: 'bg-purple-50', page: 'staff-inspect' },
              { label: 'Đóng gói đơn hàng', sub: `${val(report?.packagingOrders)} đơn sẵn sàng`, icon: Box, color: 'text-emerald-500', bg: 'bg-emerald-50', page: 'staff-pack' },
              { label: 'Gọi Shipper', sub: 'Gọi shipper lấy hàng', icon: PackageCheck, color: 'text-rose-500', bg: 'bg-rose-50', page: 'staff-shipper' },
              { label: 'Thống kê', sub: `${val(report?.approvedTodayOrders)} đơn hoàn thành hôm nay`, icon: BarChart3, color: 'text-gray-500', bg: 'bg-gray-50', page: 'staff-orders' },
            ].map((action, i) => (
              <button
                key={i}
                onClick={() => onNavigate(action.page)}
                className="flex items-center gap-4 p-6 rounded-[24px] border border-gray-100 hover:bg-gray-50 transition-all group text-left"
              >
                <div className={`size-12 ${action.bg} ${action.color} rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                  <action.icon className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900">{action.label}</p>
                  <p className="text-[10px] text-gray-400 font-bold mt-0.5">{action.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <Clock className="size-5 text-gray-400" />
            <h4 className="font-black text-gray-800 uppercase tracking-tight">Tổng hợp hôm nay</h4>
          </div>
          <div className="flex flex-col gap-5">
            {[
              { label: 'Nông dân cần duyệt', value: val(report?.pendingFarmerApprovals), color: 'bg-orange-500' },
              { label: 'Đã hoàn thành hôm nay', value: val(report?.approvedTodayOrders), color: 'bg-emerald-500' },
              { label: 'Đơn đang đến kho', value: val(report?.incomingOrders), color: 'bg-blue-500' },
              { label: 'Đang kiểm tra', value: val(report?.quantityChecking), color: 'bg-orange-400' },
              { label: 'Chờ kiểm duyệt', value: val(report?.qualityCheckingOrders), color: 'bg-purple-500' },
              { label: 'Chờ đóng gói', value: val(report?.packagingOrders), color: 'bg-emerald-400' },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className={`size-2 rounded-full shrink-0 ${stat.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-700">{stat.label}</p>
                </div>
                <span className="text-lg font-black text-gray-900">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;