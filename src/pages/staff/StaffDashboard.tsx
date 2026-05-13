import React from 'react';
import {
  Package, Truck, ClipboardCheck, PackageCheck,
  ArrowRight, Clock, CheckCircle, AlertCircle, TrendingUp, Box, Zap, BarChart3
} from 'lucide-react';

interface StaffDashboardProps {
  onNavigate: (page: string) => void;
}

const StaffDashboard: React.FC<StaffDashboardProps> = ({ onNavigate }) => {
  const pipeline = [
    { label: 'Đơn đang đến kho', value: 14, color: 'text-blue-500', bg: 'bg-blue-50', icon: Truck, page: 'staff-incoming' },
    { label: 'Chờ xác nhận', value: 6, color: 'text-orange-500', bg: 'bg-orange-50', icon: Package, page: 'staff-incoming' },
    { label: 'Chờ kiểm duyệt', value: 9, color: 'text-purple-500', bg: 'bg-purple-50', icon: ClipboardCheck, page: 'staff-inspect' },
    { label: 'Chờ đóng gói', value: 4, color: 'text-emerald-500', bg: 'bg-emerald-50', icon: Box, page: 'staff-pack' },
  ];

  const recentActivities = [
    { text: 'Đơn #WH-2201 đã được xác nhận nhập kho', time: '5 phút trước', type: 'success' },
    { text: 'Đơn #WH-2198 kiểm duyệt KHÔNG ĐẠT - Cam bị nứt', time: '12 phút trước', type: 'error' },
    { text: 'Đơn #WH-2195 đã gọi shipper thành công', time: '28 phút trước', type: 'success' },
    { text: 'Đơn #WH-2190 đã đóng gói xong, sẵn sàng giao', time: '1 giờ trước', type: 'success' },
    { text: 'Đơn #WH-2185 đang trên đường đến kho (còn ~20 phút)', time: '1.5 giờ trước', type: 'info' },
  ];

  return (
    <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Tổng quan kho hàng hôm nay</h2>
          <p className="text-sm text-gray-400 font-medium mt-1">Thứ Hai, 14/10/2024 — Ca sáng 08:00–16:00</p>
        </div>
        <div className="flex items-center gap-3 px-6 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
          <div className="size-2.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">Ca làm việc đang diễn ra</span>
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
              { label: 'Đơn đang đến kho', sub: '14 đơn cần theo dõi', icon: Truck, color: 'text-blue-500', bg: 'bg-blue-50', page: 'staff-incoming' },
              { label: 'Xác nhận nhận hàng', sub: '6 đơn đang chờ', icon: Package, color: 'text-orange-500', bg: 'bg-orange-50', page: 'staff-receive' },
              { label: 'Kiểm duyệt chất lượng', sub: '9 đơn chờ kiểm', icon: ClipboardCheck, color: 'text-purple-500', bg: 'bg-purple-50', page: 'staff-inspect' },
              { label: 'Đóng gói đơn hàng', sub: '4 đơn sẵn sàng', icon: Box, color: 'text-emerald-500', bg: 'bg-emerald-50', page: 'staff-pack' },
              { label: 'Gọi Shipper', sub: '3 đơn chờ lấy hàng', icon: PackageCheck, color: 'text-rose-500', bg: 'bg-rose-50', page: 'staff-shipper' },
              { label: 'Thống kê ca làm', sub: 'Xem báo cáo hôm nay', icon: BarChart3, color: 'text-gray-500', bg: 'bg-gray-50', page: 'staff-incoming' },
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

        {/* Activity Log */}
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <Clock className="size-5 text-gray-400" />
            <h4 className="font-black text-gray-800 uppercase tracking-tight">Nhật ký hoạt động</h4>
          </div>
          <div className="flex flex-col gap-5">
            {recentActivities.map((act, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className={`mt-0.5 size-2 rounded-full shrink-0 ${act.type === 'success' ? 'bg-emerald-500' : act.type === 'error' ? 'bg-red-500' : 'bg-blue-400'}`} />
                <div>
                  <p className="text-xs font-bold text-gray-700 leading-relaxed">{act.text}</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-1">{act.time}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors mt-2">
            Xem toàn bộ lịch sử
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;