import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Truck, ClipboardCheck, PackageCheck,
  ArrowRight, Clock, CheckCircle, AlertCircle, TrendingUp, Box, Zap, BarChart3, Loader2
} from 'lucide-react';
import { orderService } from '../../services';
import type { StaffOrderReportResponse } from '../../services';

const StaffDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [report, setReport] = useState<StaffOrderReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    orderService.getStaffOrderReport()
      .then(res => { if (res.result) setReport(res.result); })
      .catch(() => {/* silent — hiển thị 0 */})
      .finally(() => setIsLoading(false));
  }, []);

  const onNavigate = (page: string) => {
    const route = page.replace('staff-', '');
    navigate(`/staff/${route}`);
  };

  const v = (n?: number | null) => isLoading ? '...' : (n ?? 0);

  const pipeline = [
    { label: 'Đơn đang đến kho', value: v(report?.incomingOrders), color: 'text-blue-500', bg: 'bg-blue-50', icon: Truck, page: 'staff-orders' },
    { label: 'Chờ kiểm duyệt', value: v(report?.qualityCheckingOrders), color: 'text-purple-500', bg: 'bg-purple-50', icon: ClipboardCheck, page: 'staff-inspect' },
    { label: 'Chờ đóng gói', value: v(report?.packagingOrders), color: 'text-emerald-500', bg: 'bg-emerald-50', icon: Box, page: 'staff-pack' },
    { label: 'Sẵn sàng giao', value: v(report?.readyOrders), color: 'text-amber-500', bg: 'bg-amber-50', icon: PackageCheck, page: 'staff-shipper' },
  ];

  return (
    <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Tổng quan kho hàng hôm nay</h2>
          <p className="text-sm text-gray-400 font-medium mt-1">
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3 px-6 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
          <div className="size-2.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">Đang hoạt động</span>
        </div>
      </div>

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
            <h3 className="text-4xl font-black text-gray-900">
              {isLoading ? <Loader2 className="size-7 animate-spin text-gray-300" /> : item.value}
            </h3>
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
              { label: 'Đơn đang đến kho', sub: `${v(report?.incomingOrders)} đơn cần theo dõi`, icon: Truck, color: 'text-blue-500', bg: 'bg-blue-50', page: 'staff-orders' },
              { label: 'Kiểm duyệt chất lượng', sub: `${v(report?.qualityCheckingOrders)} đơn chờ kiểm`, icon: ClipboardCheck, color: 'text-purple-500', bg: 'bg-purple-50', page: 'staff-inspect' },
              { label: 'Đóng gói đơn hàng', sub: `${v(report?.packagingOrders)} đơn sẵn sàng`, icon: Box, color: 'text-emerald-500', bg: 'bg-emerald-50', page: 'staff-pack' },
              { label: 'Gọi Shipper', sub: `${v(report?.readyOrders)} đơn chờ lấy hàng`, icon: PackageCheck, color: 'text-rose-500', bg: 'bg-rose-50', page: 'staff-shipper' },
              { label: 'Nông dân chờ duyệt', sub: `${v(report?.pendingFarmerApprovals)} nông dân`, icon: Package, color: 'text-orange-500', bg: 'bg-orange-50', page: 'staff-orders' },
              { label: 'Thống kê ca làm', sub: `${v(report?.approvedTodayOrders)} duyệt hôm nay`, icon: BarChart3, color: 'text-gray-500', bg: 'bg-gray-50', page: 'staff-orders' },
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

        {/* Summary */}
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="size-5 text-gray-400" />
            <h4 className="font-black text-gray-800 uppercase tracking-tight">Tóm tắt hôm nay</h4>
          </div>
          <div className="flex flex-col gap-4">
            {[
              { label: 'Duyệt thành công', value: v(report?.approvedTodayOrders), color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Bị từ chối chất lượng', value: v(report?.quantityCheckedReject), color: 'text-red-600', bg: 'bg-red-50' },
              { label: 'Nông dân chờ duyệt', value: v(report?.pendingFarmerApprovals), color: 'text-orange-600', bg: 'bg-orange-50' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-xs font-black text-gray-700">{item.label}</p>
                <span className={`px-3 py-1 text-sm font-black rounded-xl ${item.bg} ${item.color}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => onNavigate('staff-profile')}
            className="w-full py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors mt-2"
          >
            Xem hồ sơ nhân viên
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
