import React, { useState } from 'react';
import { Box, CheckCircle, Printer, ScanLine, Tag, PackageCheck } from 'lucide-react';

const Packing: React.FC = () => {
  const [packed, setPacked] = useState<Record<string, boolean>>({});

  const orders = [
    { id: 'WH-2198', farmer: 'Nguyễn Văn An', product: 'Cam hữu cơ Đà Lạt', qty: '50kg', buyer: 'Nguyễn Minh Tuấn', buyerAddr: 'Q.7, TP.HCM', bags: 5, boxType: 'Thùng carton 10kg', avatar: 'https://picsum.photos/seed/f1/80/80' },
    { id: 'WH-2196', farmer: 'Trần Thị Bé', product: 'Xà lách xoăn Đà Lạt', qty: '30kg', buyer: 'Trần Thu Hương', buyerAddr: 'Q.Bình Thạnh, TP.HCM', bags: 6, boxType: 'Túi PE 5kg', avatar: 'https://picsum.photos/seed/f2/80/80' },
  ];

  return (
    <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Đóng Gói Đơn Hàng</h2>
        <p className="text-sm text-gray-400 font-medium mt-1">Đóng gói theo đúng quy cách, dán nhãn và chuẩn bị giao shipper</p>
      </div>

      <div className="flex flex-col gap-6">
        {orders.map((order, i) => (
          <div key={i} className={`bg-white rounded-[40px] border shadow-sm overflow-hidden transition-all ${packed[order.id] ? 'border-emerald-200' : 'border-gray-100'}`}>
            <div className="p-10">
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-5">
                  <img src={order.avatar} className="size-14 rounded-2xl object-cover border-2 border-white shadow-md" alt="" />
                  <div>
                    <span className="text-[10px] font-black text-primary bg-primary/5 px-3 py-1 rounded-lg uppercase tracking-widest">#{order.id}</span>
                    <h3 className="text-xl font-black text-gray-900 mt-2">{order.product}</h3>
                    <p className="text-sm text-gray-400 font-bold">{order.farmer} → {order.buyer} ({order.buyerAddr})</p>
                  </div>
                </div>
                {packed[order.id] ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-2xl">
                    <CheckCircle className="size-4 text-emerald-600" />
                    <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">Đã đóng gói</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-2xl">
                    <div className="size-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Chờ đóng gói</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Tổng khối lượng', value: order.qty },
                  { label: 'Số kiện / túi', value: `${order.bags} kiện` },
                  { label: 'Loại đóng gói', value: order.boxType },
                  { label: 'Địa chỉ giao', value: order.buyerAddr },
                ].map((info, j) => (
                  <div key={j} className="p-5 bg-gray-50 rounded-[20px] border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{info.label}</p>
                    <p className="text-sm font-black text-gray-900">{info.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 mb-8">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Checklist đóng gói</p>
                {['Hàng đã được phân loại theo đơn', 'Dán nhãn đơn hàng lên mỗi kiện', 'Bọc bảo vệ / lót xốp (nếu cần)', 'Kiểm tra lại số lượng lần cuối', 'Chụp ảnh thùng hàng đã đóng'].map((step, j) => (
                  <label key={j} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors">
                    <input type="checkbox" className="size-4 accent-emerald-600" />
                    <span className="text-sm font-bold text-gray-700">{step}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-4">
                <button className="flex items-center gap-3 px-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black text-gray-600 hover:bg-gray-100 transition-colors">
                  <Printer className="size-4" /> In nhãn đơn hàng
                </button>
                <button className="flex items-center gap-3 px-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black text-gray-600 hover:bg-gray-100 transition-colors">
                  <Tag className="size-4" /> Dán QR code
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => setPacked(p => ({ ...p, [order.id]: true }))}
                  disabled={packed[order.id]}
                  className="flex items-center gap-3 px-8 py-3 bg-[#38703d] text-white rounded-2xl text-xs font-black shadow-lg shadow-[#38703d]/20 hover:opacity-90 transition-all disabled:opacity-50"
                >
                  <PackageCheck className="size-4" /> Hoàn tất đóng gói
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Packing;