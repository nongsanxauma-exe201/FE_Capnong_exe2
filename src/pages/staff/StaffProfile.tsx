import React from 'react';
import { UserCircle, CheckCircle, Edit3, Calendar, Clock, Package, Star, TrendingUp } from 'lucide-react';

const StaffProfile: React.FC = () => {
  const stats = [
    { label: 'Ca làm trong tháng', value: '22', icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Đơn xử lý hôm nay', value: '34', icon: Package, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Tổng giờ làm tháng', value: '176h', icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Đánh giá hiệu suất', value: '4.8★', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
  ];

  const recentShifts = [
    { date: '14/10', shift: 'Ca sáng 08:00–16:00', orders: 34, status: 'Đang làm' },
    { date: '13/10', shift: 'Ca sáng 08:00–16:00', orders: 41, status: 'Hoàn thành' },
    { date: '12/10', shift: 'Ca chiều 14:00–22:00', orders: 28, status: 'Hoàn thành' },
    { date: '11/10', shift: 'Ca sáng 08:00–16:00', orders: 37, status: 'Hoàn thành' },
  ];

  return (
    <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10">
        <div className="flex items-center gap-8">
          <div className="relative">
            <img src="https://picsum.photos/seed/staff_01/200/200" className="size-24 rounded-[28px] object-cover border-4 border-white shadow-xl" alt="" />
            <div className="absolute -bottom-2 -right-2 size-8 bg-primary rounded-xl border-2 border-white flex items-center justify-center shadow-md">
              <CheckCircle className="size-4 text-white fill-current" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-1">
              <h2 className="text-2xl font-black text-gray-900">Nguyễn Thị Phương</h2>
              <span className="px-3 py-1 bg-primary/5 text-primary text-[10px] font-black rounded-lg uppercase tracking-widest">Staff Kho</span>
            </div>
            <p className="text-sm text-gray-400 font-bold mb-1">Mã nhân viên: NV-00421 · Kho Thủ Đức, TP.HCM</p>
            <p className="text-xs text-gray-400 font-medium">phuong.staff@xauma.vn · 0901xxxx77</p>
          </div>
          <button className="flex items-center gap-2 px-6 py-3 border border-gray-100 rounded-2xl text-xs font-black text-gray-500 hover:bg-gray-50 transition-colors">
            <Edit3 className="size-4" /> Chỉnh sửa hồ sơ
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm relative">
            <div className={`absolute top-6 right-6 size-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center`}>
              <stat.icon className="size-6" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{stat.label}</p>
            <h3 className="text-3xl font-black text-gray-900">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10">
          <div className="flex items-center gap-3 mb-8">
            <TrendingUp className="size-5 text-primary" />
            <h4 className="font-black text-gray-800 uppercase tracking-tight">Lịch sử ca làm gần đây</h4>
          </div>
          <div className="flex flex-col gap-4">
            {recentShifts.map((shift, i) => (
              <div key={i} className="flex items-center gap-5 p-5 bg-gray-50 rounded-[20px] border border-gray-100">
                <div className="size-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-[10px] font-black text-gray-700 shadow-sm">{shift.date}</div>
                <div className="flex-1">
                  <p className="text-xs font-black text-gray-900">{shift.shift}</p>
                  <p className="text-[10px] text-gray-400 font-bold">{shift.orders} đơn xử lý</p>
                </div>
                <span className={`px-3 py-1 text-[10px] font-black rounded-lg uppercase tracking-widest ${shift.status === 'Đang làm' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                  {shift.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10">
          <h4 className="font-black text-gray-800 uppercase tracking-tight mb-8">Thông tin cá nhân</h4>
          <div className="flex flex-col gap-5">
            {[
              { label: 'Họ và tên', value: 'Nguyễn Thị Phương' },
              { label: 'Ngày vào làm', value: '01/03/2023' },
              { label: 'Bộ phận', value: 'Kho vận – Ca sáng' },
              { label: 'Cấp bậc', value: 'Nhân viên chính thức' },
              { label: 'Số điện thoại', value: '0901xxxx77' },
              { label: 'Email', value: 'phuong.staff@xauma.vn' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-4 border-b border-gray-50 last:border-none">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.label}</p>
                <p className="text-sm font-bold text-gray-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffProfile;