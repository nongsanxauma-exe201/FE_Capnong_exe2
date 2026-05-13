import React, { useState } from 'react';
import { Truck, MapPin, Navigation, Phone, CheckCircle2, XCircle, FileText, AlertTriangle, Search, Star, ChevronDown, ChevronRight, X, CheckCircle, Package, Clock, RefreshCw, MessageSquare, Camera } from 'lucide-react';

const IncomingOrders: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Tất cả (5)');
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const [reportingOrderId, setReportingOrderId] = useState<string | null>(null);
  const [orderDetailId, setOrderDetailId] = useState<string | null>(null);
  const [showShippers, setShowShippers] = useState(false);
  const [selectedShipper, setSelectedShipper] = useState<string | null>(null);
  const [assignedShippers, setAssignedShippers] = useState<Record<string, string>>({});

  const tabs = ['Tất cả (5)', 'Đang đến (1)', 'Chờ xác nhận (2)', 'Đã xác nhận (1)', 'Có vấn đề (1)'];

  const incomingOrders = [
    { id: 'WH-2210', farmer: 'Nguyễn Văn An', product: 'Cam hữu cơ Đà Lạt', qty: '50kg', eta: '~15 phút', distance: '3.2km', status: 'Đang di chuyển', progress: 80, avatar: 'https://picsum.photos/seed/farmer1/80/80', phone: '0912xxxx88', time: '09:30, 14/10/2024' },
  ];

  const arrivedOrders = [
    {
      id: 'WH-2205', farmer: 'Phạm Văn Đức', product: 'Bơ sáp Đắk Lắk', qty: '80kg', arrivedTime: '08:30', avatar: 'https://picsum.photos/seed/farmer4/80/80', phone: '0988xxxx44', time: '08:30, 14/10/2024',
      orderInfo: { items: [{ name: 'Bơ sáp Đắk Lắk', qty: '80kg', unitPrice: 45000, total: 3600000 }], subtotal: 3600000, shipping: 50000, total: 3650000, weight: '80 kg', customer: { name: 'Nguyễn Văn A', address: '123 Đường ABC, Quận 1, TP.HCM', phone: '0987 654 321' } }
    },
  ];

  const confirmedOrders = [
    {
      id: 'WH-2198', farmer: 'Trần Văn Khoa', product: 'Xoài cát Hòa Lộc', qty: '40kg', arrivedTime: '07:45', confirmedTime: '08:10', avatar: 'https://picsum.photos/seed/farmer6/80/80', phone: '0933xxxx66', time: '07:45, 14/10/2024',
      confirmedBy: 'Nguyễn Thị Phương', nextStep: 'Kiểm duyệt chất lượng',
      orderInfo: { items: [{ name: 'Xoài cát Hòa Lộc', qty: '40kg', unitPrice: 55000, total: 2200000 }], subtotal: 2200000, shipping: 40000, total: 2240000, weight: '40 kg', customer: { name: 'Lê Văn C', address: '789 Đường DEF, Quận 5, TP.HCM', phone: '0909 123 456' } }
    },
  ];

  const issuedOrders = [
    {
      id: 'WH-2195', farmer: 'Nguyễn Văn Bình', product: 'Khoai lang Nhật', qty: '60kg', arrivedTime: '07:20', avatar: 'https://picsum.photos/seed/farmer7/80/80', phone: '0966xxxx77', time: '07:20, 14/10/2024',
      issueType: 'Thiếu số lượng', issueDetail: 'Thực tế nhận 45kg, thiếu 15kg so với khai báo. Một số túi bị rách.', reportedBy: 'Nguyễn Thị Phương', reportedTime: '07:35',
      orderInfo: { items: [{ name: 'Khoai lang Nhật', qty: '60kg', unitPrice: 38000, total: 2280000 }], subtotal: 2280000, shipping: 45000, total: 2325000, weight: '60 kg', customer: { name: 'Phạm Thị D', address: '321 Đường GHI, Quận 7, TP.HCM', phone: '0978 654 321' } }
    },
  ];

  const nearbyShippers = [
    { id: 'SH-01', name: 'Nguyễn Hùng', distance: '0.8km', rating: 4.9, orders: 312, status: 'Sẵn sàng', avatar: 'https://picsum.photos/seed/shipper1/80/80' },
    { id: 'SH-02', name: 'Trần Văn Minh', distance: '1.2km', rating: 4.7, orders: 245, status: 'Sẵn sàng', avatar: 'https://picsum.photos/seed/farmer7/80/80' },
    { id: 'SH-03', name: 'Lê Thị Hoa', distance: '2.1km', rating: 4.8, orders: 189, status: 'Sẵn sàng', avatar: 'https://picsum.photos/seed/shipper3/80/80' },
  ];

  const orderDetailData = [...arrivedOrders, ...confirmedOrders, ...issuedOrders].find(o => o.id === orderDetailId);
  const showIncoming = activeTab === 'Tất cả (5)' || activeTab === 'Đang đến (1)';
  const showArrived = activeTab === 'Tất cả (5)' || activeTab === 'Chờ xác nhận (2)';
  const showConfirmed = activeTab === 'Tất cả (5)' || activeTab === 'Đã xác nhận (1)';
  const showIssues = activeTab === 'Tất cả (5)' || activeTab === 'Có vấn đề (1)';

  return (
    <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-500 relative">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black font-display text-gray-900">Quản Lý Đơn Hàng Tại Kho</h2>
          <p className="text-gray-400 font-medium text-sm mt-1">Theo dõi đơn hàng từ nông trại đến kho và điều phối giao hàng.</p>
        </div>
        <div className="relative">
          <input type="text" placeholder="Tìm mã đơn, nông dân..." className="pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-full text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all w-64 shadow-sm" />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        {/* Tab Bar */}
        <div className="px-10 py-2 border-b border-gray-50 flex items-center gap-12 overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`py-5 text-xs font-black whitespace-nowrap transition-all border-b-2 ${activeTab === tab ? 'text-primary border-primary' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="p-8 space-y-6">

          {/* ── SECTION 1: ĐANG ĐẾN ── */}
          {showIncoming && (
            <>
              {(activeTab === 'Tất cả (5)') && <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Đang trên đường đến kho</p>}
              {incomingOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden hover:border-primary/20 transition-all">
                  <div className="px-8 py-5 bg-gray-50/50 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-black text-primary">#{order.id}</span>
                      <span className="text-[11px] text-gray-400 font-bold">Xuất phát lúc: {order.time}</span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-500 text-[10px] font-black uppercase rounded-md flex items-center gap-1">
                        <Truck className="size-3" /> {order.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <MapPin className="size-3" /> {order.distance}
                      </div>
                      <span className="text-sm font-black text-gray-700">{order.qty}</span>
                    </div>
                  </div>
                  <div className="p-8 flex flex-col md:flex-row gap-8">
                    <div className="flex-1 flex flex-col gap-6">
                      <div className="flex items-center gap-4">
                        <img src={order.avatar} className="size-12 rounded-full object-cover" alt="" />
                        <div>
                          <h4 className="text-sm font-black text-gray-900">{order.farmer}</h4>
                          <p className="text-[11px] text-gray-400 font-bold">{order.phone} · Nông trại</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Sản phẩm đang vận chuyển</p>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 w-fit">
                          <img src={order.avatar} className="size-10 rounded-xl object-cover" alt="" />
                          <div>
                            <p className="text-xs font-bold text-gray-800">{order.product}</p>
                            <p className="text-[10px] text-gray-400 font-bold">{order.qty}</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><MapPin className="size-3 text-green-500" /> Nông trại</span>
                          <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><MapPin className="size-3 text-primary" /> Kho XẤU MÃ</span>
                        </div>
                        <div className="relative h-2.5 bg-gray-100 rounded-full overflow-visible">
                          <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-400 to-primary rounded-full" style={{ width: `${order.progress}%` }} />
                          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2" style={{ left: `${order.progress}%` }}>
                            <div className="size-5 bg-white border-2 border-primary rounded-full shadow-md flex items-center justify-center">
                              <Truck className="size-2.5 text-primary" />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] font-black text-blue-500">Còn {order.distance}</span>
                          <span className="text-[10px] font-black text-orange-500">ETA: {order.eta}</span>
                        </div>
                      </div>
                    </div>
                    <div className="w-full md:w-72 flex flex-col gap-4 border-l border-gray-100 md:pl-8">
                      <div className="flex items-center gap-2 text-[11px] font-black text-blue-500 uppercase tracking-widest">
                        <Truck className="size-4" /> Thông tin vận chuyển
                      </div>
                      <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100">
                        <p className="text-sm font-black text-gray-900">{order.farmer}</p>
                        <p className="text-[11px] text-gray-400 font-bold mt-1">📞 {order.phone}</p>
                        <p className="text-[10px] text-blue-400 font-bold italic mt-2">Đang di chuyển · Còn {order.distance}</p>
                      </div>
                      <button onClick={() => setTrackingOrderId(order.id)}
                        className="w-full py-4 bg-primary/10 text-primary font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all shadow-md shadow-primary/5 group">
                        <Navigation className="size-4 group-hover:animate-bounce" /> Theo dõi hành trình
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ── SECTION 2: CHỜ XÁC NHẬN ── */}
          {showArrived && (
            <>
              {(activeTab === 'Tất cả (5)') && <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 pt-2">Đã đến kho — Chờ xác nhận</p>}
              {arrivedOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden hover:border-primary/20 transition-all">
                  <div className="px-8 py-5 bg-gray-50/50 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-black text-primary">#{order.id}</span>
                      <span className="text-[11px] text-gray-400 font-bold">Đến kho lúc: {order.time}</span>
                      <span className="px-2 py-0.5 bg-orange-50 text-orange-500 text-[10px] font-black uppercase rounded-md flex items-center gap-1">
                        <span className="size-1.5 bg-orange-500 rounded-full inline-block animate-pulse" /> Chờ xác nhận
                      </span>
                    </div>
                    <span className="text-sm font-black text-gray-700">{order.qty}</span>
                  </div>
                  <div className="p-8 flex flex-col md:flex-row gap-8">
                    <div className="flex-1 flex flex-col gap-6">
                      <div className="flex items-center gap-4">
                        <img src={order.avatar} className="size-12 rounded-full object-cover" alt="" />
                        <div>
                          <h4 className="text-sm font-black text-gray-900">{order.farmer}</h4>
                          <p className="text-[11px] text-gray-400 font-bold">{order.phone} · Nông dân</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Chi tiết hàng hóa</p>
                        <div className="flex flex-wrap gap-3">
                          {order.orderInfo.items.map((item, j) => (
                            <div key={j} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                              <img src={order.avatar} className="size-10 rounded-xl object-cover" alt="" />
                              <div>
                                <p className="text-xs font-bold text-gray-800">{item.name}</p>
                                <p className="text-[10px] text-gray-400 font-bold">{item.qty} · {item.unitPrice.toLocaleString()}đ/kg</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="w-full md:w-80 flex flex-col gap-3 justify-center">
                      <button onClick={() => setConfirmingOrderId(order.id)}
                        className="w-full py-4 bg-primary text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all transform active:scale-95">
                        <CheckCircle2 className="size-5" /> Xác nhận đã nhận hàng
                      </button>
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setOrderDetailId(order.id)}
                          className="py-3 border border-gray-100 text-gray-600 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-all">
                          <FileText className="size-4" /> Thông tin đơn
                        </button>
                        <button onClick={() => setReportingOrderId(order.id)}
                          className="py-3 border border-red-50 text-red-500 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 hover:bg-red-50 transition-all">
                          <XCircle className="size-4" /> Báo cáo vấn đề
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ── SECTION 3: ĐÃ XÁC NHẬN ── */}
          {showConfirmed && (
            <>
              {(activeTab === 'Tất cả (5)') && <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 pt-2">Đã xác nhận — Đang xử lý</p>}
              {confirmedOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden hover:border-primary/20 transition-all opacity-90">
                  <div className="px-8 py-5 bg-gray-50/50 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-black text-gray-400">#{order.id}</span>
                      <span className="text-[11px] text-gray-400 font-bold">Xác nhận lúc: {order.confirmedTime}, 14/10/2024</span>
                      <span className="px-2 py-0.5 bg-green-50 text-primary text-[10px] font-black uppercase rounded-md flex items-center gap-1">
                        <CheckCircle className="size-3" /> Đã xác nhận
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-black text-gray-700">{order.qty}</span>
                    </div>
                  </div>
                  <div className="p-8 flex flex-col md:flex-row gap-8">
                    <div className="flex-1 flex flex-col gap-6">
                      <div className="flex items-center gap-4">
                        <img src={order.avatar} className="size-12 rounded-full object-cover" alt="" />
                        <div>
                          <h4 className="text-sm font-black text-gray-900">{order.farmer}</h4>
                          <p className="text-[11px] text-gray-400 font-bold">{order.phone} · Nông dân</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Chi tiết hàng hóa</p>
                        <div className="flex flex-wrap gap-3">
                          {order.orderInfo.items.map((item, j) => (
                            <div key={j} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                              <img src={order.avatar} className="size-10 rounded-xl object-cover" alt="" />
                              <div>
                                <p className="text-xs font-bold text-gray-800">{item.name}</p>
                                <p className="text-[10px] text-gray-400 font-bold">{item.qty} · {item.unitPrice.toLocaleString()}đ/kg</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Timeline */}
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Tiến trình xử lý</p>
                        <div className="flex items-center gap-0">
                          {[
                            { label: 'Đến kho', time: order.arrivedTime, done: true },
                            { label: 'Xác nhận', time: order.confirmedTime, done: true },
                            { label: 'Kiểm duyệt', time: 'Đang chờ', done: false },
                            { label: 'Đóng gói', time: '--', done: false },
                          ].map((step, i, arr) => (
                            <React.Fragment key={i}>
                              <div className="flex flex-col items-center gap-1">
                                <div className={`size-7 rounded-full flex items-center justify-center border-2 ${step.done ? 'bg-primary border-primary' : 'bg-white border-gray-200'}`}>
                                  {step.done ? <CheckCircle className="size-3.5 text-white" /> : <Clock className="size-3 text-gray-300" />}
                                </div>
                                <p className={`text-[9px] font-black ${step.done ? 'text-primary' : 'text-gray-300'}`}>{step.label}</p>
                                <p className="text-[8px] text-gray-400 font-medium">{step.time}</p>
                              </div>
                              {i < arr.length - 1 && (
                                <div className={`flex-1 h-0.5 mb-6 ${step.done && arr[i+1].done ? 'bg-primary' : step.done ? 'bg-gradient-to-r from-primary to-gray-200' : 'bg-gray-200'}`} />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="w-full md:w-80 flex flex-col gap-4 justify-center border-l border-gray-100 md:pl-8">
                      <div className="p-6 bg-green-50/50 rounded-[32px] border border-primary/10 text-center w-full">
                        <CheckCircle2 className="size-10 text-primary mx-auto mb-3" />
                        <p className="text-sm font-black text-primary">Nhận hàng thành công</p>
                        <p className="text-[10px] text-gray-400 font-bold mt-1">Xác nhận bởi: {order.confirmedBy}</p>
                        <p className="text-[10px] text-gray-400 font-bold">Lúc {order.confirmedTime}, 14/10/2024</p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-3">
                        <Package className="size-5 text-blue-500 shrink-0" />
                        <div>
                          <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Bước tiếp theo</p>
                          <p className="text-xs font-bold text-blue-600 mt-0.5">{order.nextStep}</p>
                        </div>
                      </div>
                      <button onClick={() => setOrderDetailId(order.id)}
                        className="w-full py-3 border border-gray-100 text-gray-600 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-all">
                        <FileText className="size-4" /> Xem thông tin đơn hàng
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ── SECTION 4: CÓ VẤN ĐỀ ── */}
          {showIssues && (
            <>
              {(activeTab === 'Tất cả (5)') && <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 pt-2">Có vấn đề — Đang xử lý</p>}
              {issuedOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-[32px] border border-red-100 shadow-sm overflow-hidden hover:border-red-200 transition-all">
                  <div className="px-8 py-5 bg-red-50/50 border-b border-red-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-black text-red-500">#{order.id}</span>
                      <span className="text-[11px] text-gray-400 font-bold">Đến kho lúc: {order.time}</span>
                      <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-black uppercase rounded-md flex items-center gap-1">
                        <AlertTriangle className="size-3" /> {order.issueType}
                      </span>
                    </div>
                    <span className="text-sm font-black text-gray-700">{order.qty}</span>
                  </div>
                  <div className="p-8 flex flex-col md:flex-row gap-8">
                    <div className="flex-1 flex flex-col gap-6">
                      <div className="flex items-center gap-4">
                        <img src={order.avatar} className="size-12 rounded-full object-cover" alt="" />
                        <div>
                          <h4 className="text-sm font-black text-gray-900">{order.farmer}</h4>
                          <p className="text-[11px] text-gray-400 font-bold">{order.phone} · Nông dân</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Chi tiết hàng hóa</p>
                        <div className="flex flex-wrap gap-3">
                          {order.orderInfo.items.map((item, j) => (
                            <div key={j} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                              <img src={order.avatar} className="size-10 rounded-xl object-cover" alt="" />
                              <div>
                                <p className="text-xs font-bold text-gray-800">{item.name}</p>
                                <p className="text-[10px] text-gray-400 font-bold">{item.qty}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Issue detail */}
                      <div className="p-5 bg-red-50 border border-red-100 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="size-4 text-red-500 shrink-0" />
                          <p className="text-xs font-black text-red-700 uppercase tracking-wide">Mô tả vấn đề</p>
                        </div>
                        <p className="text-sm text-red-600 font-medium leading-relaxed">{order.issueDetail}</p>
                        <p className="text-[10px] text-red-400 font-bold mt-3">Báo cáo bởi: {order.reportedBy} · {order.reportedTime}, 14/10/2024</p>
                      </div>
                    </div>

                    <div className="w-full md:w-80 flex flex-col gap-3 justify-center border-l border-gray-100 md:pl-8">
                      <div className="p-5 bg-orange-50 border border-orange-100 rounded-[24px] text-center mb-1">
                        <div className="size-12 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <RefreshCw className="size-5 text-orange-500" />
                        </div>
                        <p className="text-sm font-black text-orange-700">Đang chờ xử lý</p>
                        <p className="text-[10px] text-orange-500 font-bold mt-1">Admin đang xem xét vấn đề</p>
                      </div>

                      <button onClick={() => setOrderDetailId(order.id)}
                        className="w-full py-3 border border-gray-100 text-gray-600 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-all">
                        <FileText className="size-4" /> Xem thông tin đơn hàng
                      </button>
                      <button className="w-full py-3 border border-orange-100 text-orange-600 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 hover:bg-orange-50 transition-all">
                        <MessageSquare className="size-4" /> Liên hệ nông dân
                      </button>
                      <button className="w-full py-3 border border-blue-100 text-blue-600 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-50 transition-all">
                        <Camera className="size-4" /> Xem ảnh bằng chứng
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="p-10 border-t border-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Hiển thị 1-5 trong số 5 đơn hàng</p>
          <div className="flex items-center gap-2">
            <button className="size-10 border border-gray-100 rounded-2xl flex items-center justify-center text-gray-300 hover:bg-gray-50">
              <ChevronRight className="size-4 rotate-180" />
            </button>
            <button className="size-10 bg-primary text-white rounded-2xl flex items-center justify-center text-sm font-black">1</button>
            <button className="size-10 border border-gray-100 rounded-2xl flex items-center justify-center text-gray-300 hover:bg-gray-50">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL: THEO DÕI HÀNH TRÌNH ── */}
      {trackingOrderId && (() => {
        const order = incomingOrders.find(o => o.id === trackingOrderId)!;
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-[520px] rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-black text-gray-900">Theo Dõi Hành Trình</h3>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">#{order.id} · {order.product}</p>
                  </div>
                  <button onClick={() => setTrackingOrderId(null)} className="size-9 rounded-2xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50">
                    <X className="size-4" />
                  </button>
                </div>
                <div className="relative h-48 bg-gradient-to-br from-green-50 via-blue-50 to-primary/5 rounded-[24px] border border-gray-100 mb-6 overflow-hidden">
                  <div className="absolute inset-0 opacity-20">
                    {[...Array(6)].map((_, i) => <div key={i} className="absolute border border-gray-300" style={{ left: `${i * 20}%`, top: 0, bottom: 0, width: 1 }} />)}
                    {[...Array(5)].map((_, i) => <div key={i} className="absolute border border-gray-300" style={{ top: `${i * 25}%`, left: 0, right: 0, height: 1 }} />)}
                  </div>
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 520 192">
                    <path d="M 60 150 Q 180 80 350 100 L 460 90" stroke="#5c8d5e" strokeWidth="3" fill="none" strokeDasharray="8 4" opacity="0.6" />
                  </svg>
                  <div className="absolute size-8 bg-green-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center" style={{ left: 44, top: 134 }}>
                    <MapPin className="size-3.5 text-white" />
                  </div>
                  <div className="absolute" style={{ left: `${(order.progress / 100) * 75 + 10}%`, top: '42%', transform: 'translate(-50%, -50%)' }}>
                    <div className="size-10 bg-primary rounded-2xl border-4 border-white shadow-xl flex items-center justify-center animate-pulse">
                      <Truck className="size-4 text-white" />
                    </div>
                    <div className="mt-1 bg-primary text-white text-[9px] font-black px-2 py-0.5 rounded-full text-center whitespace-nowrap">{order.eta}</div>
                  </div>
                  <div className="absolute size-8 bg-primary rounded-full border-4 border-white shadow-lg flex items-center justify-center" style={{ right: 44, top: 74 }}>
                    <MapPin className="size-3.5 text-white" />
                  </div>
                  <div className="absolute bottom-3 left-4 text-[9px] font-black text-gray-500">🌿 Nông trại</div>
                  <div className="absolute bottom-3 right-4 text-[9px] font-black text-gray-500">🏭 Kho XẤU MÃ</div>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-gray-50 rounded-2xl text-center border border-gray-100">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Khoảng cách</p>
                    <p className="text-base font-black text-gray-900">{order.distance}</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-2xl text-center border border-orange-100">
                    <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-1">Dự kiến đến</p>
                    <p className="text-base font-black text-orange-700">{order.eta}</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-2xl text-center border border-blue-100">
                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Tiến độ</p>
                    <p className="text-base font-black text-blue-700">{order.progress}%</p>
                  </div>
                </div>
                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4 mb-6">
                  <img src={order.avatar} className="size-12 rounded-xl object-cover" alt="" />
                  <div className="flex-1">
                    <p className="text-sm font-black text-gray-900">{order.farmer}</p>
                    <p className="text-xs text-gray-400 font-bold">📞 {order.phone} · {order.product}</p>
                  </div>
                  <button className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-black text-gray-600 hover:border-primary hover:text-primary transition-all">
                    <Phone className="size-3.5" /> Gọi
                  </button>
                </div>
                <button onClick={() => setTrackingOrderId(null)} className="w-full py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black text-gray-500 hover:bg-gray-100 transition-all">Đóng</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── MODAL: XÁC NHẬN ── */}
      {confirmingOrderId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-[440px] rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative">
            <div className="p-8 flex flex-col items-center text-center">
              <div className="size-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
                <div className="size-14 bg-green-100 rounded-full flex items-center justify-center text-primary"><CheckCircle2 className="size-8" /></div>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3">Xác nhận nhận hàng</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed px-4">
                Xác nhận đã nhận hàng từ đơn <span className="text-primary font-black">#{confirmingOrderId}</span>? Hàng hóa sẽ chuyển sang bước kiểm duyệt chất lượng.
              </p>
              <div className="w-full flex flex-col gap-3 mt-10">
                <button onClick={() => setConfirmingOrderId(null)}
                  className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-black rounded-2xl transition-all shadow-lg shadow-primary/20 transform active:scale-[0.98]">
                  XÁC NHẬN ĐÃ NHẬN HÀNG
                </button>
                <button onClick={() => setConfirmingOrderId(null)} className="w-full py-4 bg-gray-50 hover:bg-gray-100 text-gray-500 font-bold rounded-2xl transition-all">Quay lại</button>
              </div>
            </div>
            <button onClick={() => setConfirmingOrderId(null)} className="absolute top-6 right-6 text-gray-300 hover:text-gray-900 transition-colors"><X className="size-6" /></button>
          </div>
        </div>
      )}

      {/* ── MODAL: BÁO CÁO ── */}
      {reportingOrderId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-[440px] rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative">
            <div className="p-8 flex flex-col items-center text-center">
              <div className="size-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                <div className="size-14 bg-red-100 rounded-full flex items-center justify-center text-red-500"><AlertTriangle className="size-8" /></div>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3">Báo Cáo Vấn Đề</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed px-4 mb-4">
                Mô tả vấn đề với đơn hàng <span className="text-primary font-black">#{reportingOrderId}</span>:
              </p>
              <textarea rows={4} placeholder="VD: Hàng bị dập, thiếu số lượng, sai sản phẩm..."
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium text-gray-700 outline-none focus:border-red-300 focus:ring-2 focus:ring-red-50 resize-none text-left" />
              <div className="w-full flex flex-col gap-3 mt-4">
                <button onClick={() => setReportingOrderId(null)}
                  className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl transition-all shadow-lg shadow-red-500/20 transform active:scale-[0.98]">
                  GỬI BÁO CÁO
                </button>
                <button onClick={() => setReportingOrderId(null)} className="w-full py-4 bg-gray-50 hover:bg-gray-100 text-gray-500 font-bold rounded-2xl transition-all">Quay lại</button>
              </div>
            </div>
            <button onClick={() => setReportingOrderId(null)} className="absolute top-6 right-6 text-gray-300 hover:text-gray-900 transition-colors"><X className="size-6" /></button>
          </div>
        </div>
      )}

      {/* ── MODAL: THÔNG TIN ĐƠN HÀNG ── */}
      {orderDetailId && orderDetailData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-[680px] rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                    <FileText className="size-5 text-orange-400" /> Thông Tin Đơn Hàng
                  </h3>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">#{orderDetailData.id}</p>
                </div>
                <button onClick={() => setOrderDetailId(null)} className="size-9 rounded-2xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50">
                  <X className="size-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Sản phẩm</p>
                  <div className="flex flex-col gap-3">
                    {orderDetailData.orderInfo.items.map((item, j) => (
                      <div key={j} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div>
                          <p className="text-sm font-black text-gray-800">{item.name}</p>
                          <p className="text-[11px] text-gray-400 font-medium mt-0.5">{item.qty} × {item.unitPrice.toLocaleString()}đ/kg</p>
                        </div>
                        <span className="text-sm font-black text-primary">{item.total.toLocaleString()}đ</span>
                      </div>
                    ))}
                    <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                      <div className="flex justify-between text-xs font-bold text-gray-500 mb-1"><span>TẠM TÍNH:</span><span>{orderDetailData.orderInfo.subtotal.toLocaleString()}đ</span></div>
                      <div className="flex justify-between text-xs font-bold text-gray-500 mb-2"><span>PHÍ VẬN CHUYỂN:</span><span>{orderDetailData.orderInfo.shipping.toLocaleString()}đ</span></div>
                      <div className="flex justify-between text-sm font-black text-primary border-t border-green-200 pt-2"><span>TỔNG CỘNG:</span><span>{orderDetailData.orderInfo.total.toLocaleString()}đ</span></div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span>🏋️</span>
                      <span className="text-xs font-black text-gray-500">Tổng trọng lượng: <span className="text-primary">{orderDetailData.orderInfo.weight}</span></span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Thông tin khách hàng</p>
                  <div className="flex flex-col gap-3 mb-4">
                    {[{ label: 'Tên', value: orderDetailData.orderInfo.customer.name }, { label: 'Địa chỉ', value: orderDetailData.orderInfo.customer.address }, { label: 'Số điện thoại', value: orderDetailData.orderInfo.customer.phone }].map((field, j) => (
                      <div key={j} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{field.label}</p>
                        <p className="text-sm font-bold text-gray-800">{field.value}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Tìm Shipper</p>
                  {assignedShippers[orderDetailData.id] ? (
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3">
                      <Truck className="size-4 text-blue-500" />
                      <p className="text-xs font-black text-blue-700">Đã giao: {nearbyShippers.find(s => s.id === assignedShippers[orderDetailData.id])?.name}</p>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => setShowShippers(!showShippers)} className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white rounded-xl text-xs font-black mb-3">
                        <Search className="size-3" /> {showShippers ? 'Ẩn' : 'Tìm shipper'} <ChevronDown className={`size-3 transition-transform ${showShippers ? 'rotate-180' : ''}`} />
                      </button>
                      {showShippers && (
                        <div className="flex flex-col gap-2">
                          {nearbyShippers.map(shipper => (
                            <div key={shipper.id} onClick={() => setSelectedShipper(shipper.id)}
                              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedShipper === shipper.id ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}>
                              <img src={shipper.avatar} className="size-9 rounded-xl object-cover" alt="" />
                              <div className="flex-1">
                                <p className="text-xs font-black text-gray-900">{shipper.name}</p>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                                  <span>{shipper.distance}</span>
                                  <span className="flex items-center gap-0.5"><Star className="size-2.5 text-yellow-400 fill-yellow-400" />{shipper.rating}</span>
                                </div>
                              </div>
                              {selectedShipper === shipper.id && <CheckCircle className="size-4 text-primary" />}
                            </div>
                          ))}
                          {selectedShipper && (
                            <button onClick={() => { setAssignedShippers(p => ({ ...p, [orderDetailData.id]: selectedShipper })); setShowShippers(false); setSelectedShipper(null); }}
                              className="w-full py-2.5 bg-primary text-white rounded-xl text-xs font-black mt-1">
                              Giao cho {nearbyShippers.find(s => s.id === selectedShipper)?.name} →
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <button onClick={() => setOrderDetailId(null)} className="w-full py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black text-gray-500 hover:bg-gray-100 transition-all mt-6">
                Quay lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncomingOrders;