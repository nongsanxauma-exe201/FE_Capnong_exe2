import React, { useState } from 'react';
import { Truck, Phone, CheckCircle, MapPin, Clock, Package, Star, User } from 'lucide-react';

const CallShipper: React.FC = () => {
  const [calledOrders, setCalledOrders] = useState<Record<string, boolean>>({});

  const readyOrders = [
    { id: 'WH-2195', product: 'Bơ sáp Đắk Lắk', qty: '80kg', buyer: 'Trần Văn Bình', buyerAddr: 'Q.3, TP.HCM', weight: '82kg', distance: '8.5km', estimatedShip: '10:30 – 11:45' },
    { id: 'WH-2192', product: 'Cà phê Tây Nguyên', qty: '50kg', buyer: 'Lê Thị Mai', buyerAddr: 'Q.Tân Bình, TP.HCM', weight: '52kg', distance: '12km', estimatedShip: '11:00 – 12:30' },
  ];

  const availableShippers = [
    { id: 'S001', name: 'Anh Hùng Shipper', phone: '0912xxxx01', rating: 4.9, deliveries: 320, distance: '1.2km', avatar: 'https://picsum.photos/seed/s1/80/80', online: true },
    { id: 'S002', name: 'Minh Tuấn Express', phone: '0901xxxx55', rating: 4.7, deliveries: 210, distance: '2.8km', avatar: 'https://picsum.photos/seed/s2/80/80', online: true },
    { id: 'S003', name: 'Văn Long Giao Hàng', phone: '0773xxxx88', rating: 4.5, deliveries: 145, distance: '4.1km', avatar: 'https://picsum.photos/seed/s3/80/80', online: false },
  ];

  const [selectedShipper, setSelectedShipper] = useState<Record<string, string>>({});

  return (
    <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Gọi Shipper Lấy Hàng</h2>
        <p className="text-sm text-gray-400 font-medium mt-1">Phân công và liên hệ shipper cho các đơn đã đóng gói xong</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Ready Orders */}
        <div className="flex flex-col gap-6">
          <h4 className="font-black text-gray-600 uppercase tracking-widest text-xs px-2">Đơn sẵn sàng giao ({readyOrders.length})</h4>
          {readyOrders.map((order, i) => (
            <div key={i} className={`bg-white rounded-[40px] border shadow-sm p-8 transition-all ${calledOrders[order.id] ? 'border-emerald-200 bg-emerald-50/20' : 'border-gray-100'}`}>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <span className="text-[10px] font-black text-primary bg-primary/5 px-3 py-1 rounded-lg uppercase tracking-widest">#{order.id}</span>
                  <h3 className="text-lg font-black text-gray-900 mt-2">{order.product}</h3>
                  <p className="text-sm text-gray-400 font-bold">Giao cho: {order.buyer} · {order.buyerAddr}</p>
                </div>
                {calledOrders[order.id] && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <CheckCircle className="size-3.5 text-emerald-600" />
                    <span className="text-[10px] font-black text-emerald-700 uppercase">Đã gọi</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { icon: Package, label: 'Khối lượng', value: order.weight },
                  { icon: MapPin, label: 'Khoảng cách', value: order.distance },
                  { icon: Clock, label: 'Dự kiến giao', value: order.estimatedShip },
                ].map((info, j) => (
                  <div key={j} className="p-4 bg-gray-50 rounded-[16px] border border-gray-100">
                    <info.icon className="size-4 text-gray-400 mb-1" />
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{info.label}</p>
                    <p className="text-xs font-black text-gray-900 mt-0.5">{info.value}</p>
                  </div>
                ))}
              </div>

              <div className="mb-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Chọn shipper</p>
                <div className="flex flex-col gap-2">
                  {availableShippers.filter(s => s.online).map(shipper => (
                    <button
                      key={shipper.id}
                      onClick={() => setSelectedShipper(s => ({ ...s, [order.id]: shipper.id }))}
                      className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${selectedShipper[order.id] === shipper.id ? 'bg-primary/5 border-primary/20' : 'border-gray-100 hover:bg-gray-50'}`}
                    >
                      <img src={shipper.avatar} className="size-10 rounded-xl object-cover" alt="" />
                      <div className="flex-1">
                        <p className="text-xs font-black text-gray-900">{shipper.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold">{shipper.distance} · {shipper.deliveries} chuyến</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-black text-amber-500">
                        <Star className="size-3 fill-current" /> {shipper.rating}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setCalledOrders(c => ({ ...c, [order.id]: true }))}
                disabled={!selectedShipper[order.id] || calledOrders[order.id]}
                className="w-full py-4 bg-[#38703d] text-white font-black rounded-2xl text-sm flex items-center justify-center gap-3 shadow-lg shadow-[#38703d]/20 hover:opacity-90 transition-all disabled:opacity-40"
              >
                <Phone className="size-4" /> Gọi Shipper Lấy Hàng
              </button>
            </div>
          ))}
        </div>

        {/* All Shippers Status */}
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10 h-fit">
          <div className="flex items-center gap-3 mb-8">
            <Truck className="size-5 text-primary" />
            <h4 className="font-black text-gray-800 uppercase tracking-tight">Danh sách shipper khu vực</h4>
          </div>
          <div className="flex flex-col gap-4">
            {availableShippers.map((shipper, i) => (
              <div key={i} className="flex items-center gap-5 p-6 bg-gray-50 rounded-[24px] border border-gray-100">
                <div className="relative">
                  <img src={shipper.avatar} className="size-12 rounded-2xl object-cover" alt="" />
                  <div className={`absolute -bottom-1 -right-1 size-3.5 rounded-full border-2 border-white ${shipper.online ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-gray-900">{shipper.name}</p>
                  <p className="text-[10px] text-gray-400 font-bold">{shipper.phone} · {shipper.distance} · {shipper.deliveries} chuyến</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-black text-amber-500">
                  <Star className="size-3 fill-current" /> {shipper.rating}
                </div>
                <span className={`px-3 py-1 text-[10px] font-black rounded-lg uppercase tracking-widest ${shipper.online ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                  {shipper.online ? 'Online' : 'Offline'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallShipper;