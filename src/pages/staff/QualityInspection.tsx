import React, { useState } from 'react';
import { ClipboardCheck, CheckCircle, XCircle, AlertTriangle, Camera, ThumbsUp, ThumbsDown, ChevronRight, ArrowLeft, Package, Star, Clock, CheckCircle2, Users } from 'lucide-react';

type View = 'farmer-list' | 'order-list' | 'inspection';

interface CriteriaResult {
  [orderId: string]: {
    [criteriaKey: string]: 'pass' | 'fail' | null;
  };
}

const QualityInspection: React.FC = () => {
  const [view, setView] = useState<View>('farmer-list');
  const [selectedFarmer, setSelectedFarmer] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<number>(0);
  const [orderResults, setOrderResults] = useState<Record<string, 'pass' | 'fail' | null>>({});
  const [criteriaResults, setCriteriaResults] = useState<CriteriaResult>({});

  const farmers = [
    {
      id: 'F-001', name: 'Nguyễn Văn An', location: 'Đà Lạt, Lâm Đồng', avatar: 'https://picsum.photos/seed/f1/80/80',
      pendingOrders: 2, totalQty: '80kg', rating: 4.8,
      products: ['Cam hữu cơ', 'Xà lách xoăn'],
      arrivedTime: '08:30',
    },
    {
      id: 'F-002', name: 'Trần Thị Bé', location: 'Đắk Lắk', avatar: 'https://picsum.photos/seed/f2/80/80',
      pendingOrders: 1, totalQty: '100kg', rating: 4.6,
      products: ['Cà phê Tây Nguyên'],
      arrivedTime: '09:10',
    },
    {
      id: 'F-003', name: 'Lê Hoàng Nam', location: 'Tiền Giang', avatar: 'https://picsum.photos/seed/f3/80/80',
      pendingOrders: 3, totalQty: '150kg', rating: 4.9,
      products: ['Xoài cát', 'Bưởi da xanh', 'Sầu riêng'],
      arrivedTime: '09:45',
    },
    {
      id: 'F-004', name: 'Phạm Thị Hương', location: 'Bến Tre', avatar: 'https://picsum.photos/seed/f4/80/80',
      pendingOrders: 1, totalQty: '40kg', rating: 4.7,
      products: ['Dừa xiêm xanh'],
      arrivedTime: '10:15',
    },
  ];

  const ordersByFarmer: Record<string, Array<{
    id: string; farmer: string; product: string; qty: string; category: string;
    avatar: string; image: string; expectedQty: string; bags: number;
  }>> = {
    'F-001': [
      { id: 'WH-2198', farmer: 'Nguyễn Văn An', product: 'Cam hữu cơ Đà Lạt', qty: '50kg', category: 'Trái cây', avatar: 'https://picsum.photos/seed/f1/80/80', image: 'https://picsum.photos/seed/cam1/400/300', expectedQty: '50kg', bags: 5 },
      { id: 'WH-2199', farmer: 'Nguyễn Văn An', product: 'Xà lách xoăn Đà Lạt', qty: '30kg', category: 'Rau ăn lá', avatar: 'https://picsum.photos/seed/f1/80/80', image: 'https://picsum.photos/seed/rau1/400/300', expectedQty: '30kg', bags: 6 },
    ],
    'F-002': [
      { id: 'WH-2196', farmer: 'Trần Thị Bé', product: 'Cà phê Tây Nguyên', qty: '100kg', category: 'Cà phê hạt', avatar: 'https://picsum.photos/seed/f2/80/80', image: 'https://picsum.photos/seed/cafe1/400/300', expectedQty: '100kg', bags: 10 },
    ],
    'F-003': [
      { id: 'WH-2193', farmer: 'Lê Hoàng Nam', product: 'Xoài cát Hòa Lộc', qty: '60kg', category: 'Trái cây', avatar: 'https://picsum.photos/seed/f3/80/80', image: 'https://picsum.photos/seed/xoai1/400/300', expectedQty: '60kg', bags: 6 },
      { id: 'WH-2194', farmer: 'Lê Hoàng Nam', product: 'Bưởi da xanh', qty: '50kg', category: 'Trái cây', avatar: 'https://picsum.photos/seed/f3/80/80', image: 'https://picsum.photos/seed/buoi1/400/300', expectedQty: '50kg', bags: 5 },
      { id: 'WH-2195', farmer: 'Lê Hoàng Nam', product: 'Sầu riêng Ri6', qty: '40kg', category: 'Trái cây', avatar: 'https://picsum.photos/seed/f3/80/80', image: 'https://picsum.photos/seed/sau1/400/300', expectedQty: '40kg', bags: 4 },
    ],
    'F-004': [
      { id: 'WH-2190', farmer: 'Phạm Thị Hương', product: 'Dừa xiêm xanh', qty: '40kg', category: 'Trái cây', avatar: 'https://picsum.photos/seed/f4/80/80', image: 'https://picsum.photos/seed/dua1/400/300', expectedQty: '40kg', bags: 8 },
    ],
  };

  const criteria = [
    { label: 'Màu sắc', key: 'appearance', },
    { label: 'Mùi hương (không có mùi lạ)', key: 'smell', },
    { label: 'Độ tươi (không héo, dập nát)', key: 'freshness', },
    { label: 'Đóng gói (còn nguyên vẹn)', key: 'packaging', },
    { label: 'Trọng lượng (khớp với khai báo)', key: 'weight',  },
    { label: 'Đánh giá chuyên môn', key: 'expert',  },
  ];

  const farmer = farmers.find(f => f.id === selectedFarmer);
  const orders = selectedFarmer ? ordersByFarmer[selectedFarmer] || [] : [];
  const order = orders[selectedOrder];

  const setCriteria = (orderId: string, key: string, value: 'pass' | 'fail') => {
    setCriteriaResults(prev => ({
      ...prev,
      [orderId]: { ...(prev[orderId] || {}), [key]: value }
    }));
  };

  const getCriteria = (orderId: string, key: string) => criteriaResults[orderId]?.[key] ?? null;

  const passCount = (orderId: string) => criteria.filter(c => getCriteria(orderId, c.key) === 'pass').length;
  const failCount = (orderId: string) => criteria.filter(c => getCriteria(orderId, c.key) === 'fail').length;

  // ── FARMER LIST VIEW ──────────────────────────────────────────────
  if (view === 'farmer-list') {
    return (
      <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-500">
        {/* Header */}
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Kiểm Duyệt Chất Lượng</h2>
              <p className="text-sm text-gray-400 font-medium mt-1">Chọn nông dân để bắt đầu kiểm duyệt hàng hóa vừa nhập kho</p>
            </div>
            <div className="flex items-center gap-3 px-6 py-3 bg-orange-50 border border-orange-100 rounded-2xl">
              <div className="size-2 bg-orange-500 rounded-full animate-pulse" />
              <span className="text-sm font-black text-orange-700">{farmers.length} nông dân chờ kiểm duyệt</span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-6">
          {[
            { label: 'Nông dân chờ kiểm', value: farmers.length, color: 'bg-orange-50 border-orange-100', textColor: 'text-orange-700', icon: <Users className="size-5 text-orange-500" /> },
            { label: 'Tổng đơn cần kiểm', value: farmers.reduce((a, f) => a + f.pendingOrders, 0), color: 'bg-blue-50 border-blue-100', textColor: 'text-blue-700', icon: <Package className="size-5 text-blue-500" /> },
            { label: 'Đã hoàn thành hôm nay', value: Object.values(orderResults).filter(v => v !== null).length, color: 'bg-green-50 border-green-100', textColor: 'text-primary', icon: <CheckCircle2 className="size-5 text-primary" /> },
          ].map((stat, i) => (
            <div key={i} className={`${stat.color} border rounded-[24px] p-6 flex items-center gap-4`}>
              <div className="size-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">{stat.icon}</div>
              <div>
                <p className="text-2xl font-black text-gray-900">{stat.value}</p>
                <p className="text-xs font-bold text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Farmer list */}
        <div className="flex flex-col gap-4">
          {farmers.map((f) => {
            const farmerOrders = ordersByFarmer[f.id] || [];
            const done = farmerOrders.filter(o => orderResults[o.id] !== undefined && orderResults[o.id] !== null).length;
            const allDone = done === farmerOrders.length;
            return (
              <div key={f.id}
                onClick={() => { setSelectedFarmer(f.id); setSelectedOrder(0); setView('order-list'); }}
                className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 flex items-center gap-6 hover:border-primary/20 hover:shadow-md transition-all cursor-pointer group">
                <div className="relative">
                  <img src={f.avatar} className="size-16 rounded-2xl object-cover border-2 border-white shadow-md" alt="" />
                  {allDone && (
                    <div className="absolute -top-1 -right-1 size-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                      <CheckCircle className="size-3 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-base font-black text-gray-900">{f.name}</h3>
                    <div className="flex items-center gap-1">
                      <Star className="size-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-[11px] font-black text-gray-500">{f.rating}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 font-bold mb-3">📍 {f.location} · Đến kho lúc {f.arrivedTime}</p>
                  <div className="flex flex-wrap gap-2">
                    {f.products.map((p, i) => (
                      <span key={i} className="px-2.5 py-1 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-black text-gray-500">{p}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-center">
                    <p className="text-2xl font-black text-gray-900">{f.pendingOrders}</p>
                    <p className="text-[10px] font-bold text-gray-400">đơn hàng</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black text-gray-900">{f.totalQty}</p>
                    <p className="text-[10px] font-bold text-gray-400">tổng KL</p>
                  </div>
                  {/* Progress */}
                  <div className="w-24">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-black text-gray-400">Tiến độ</span>
                      <span className="text-[9px] font-black text-primary">{done}/{farmerOrders.length}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${farmerOrders.length > 0 ? (done / farmerOrders.length) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${allDone ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>
                    {allDone ? <><CheckCircle className="size-3.5" /> Xong</> : <><Clock className="size-3.5" /> Chờ kiểm</>}
                  </div>
                  <ChevronRight className="size-5 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── ORDER LIST VIEW ───────────────────────────────────────────────
  if (view === 'order-list' && farmer) {
    return (
      <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-300">
        {/* Back + Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => setView('farmer-list')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-100 rounded-2xl text-xs font-black text-gray-500 hover:bg-gray-50 transition-colors shadow-sm">
            <ArrowLeft className="size-4" /> Danh sách nông dân
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <div className="flex items-center gap-3">
            <img src={farmer.avatar} className="size-10 rounded-xl object-cover" alt="" />
            <div>
              <h2 className="text-xl font-black text-gray-900">{farmer.name}</h2>
              <p className="text-xs text-gray-400 font-medium">📍 {farmer.location} · Đến kho lúc {farmer.arrivedTime}</p>
            </div>
          </div>
        </div>

        {/* Order cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {orders.map((o, i) => {
            const result = orderResults[o.id];
            const done = done => done;
            const pCount = passCount(o.id);
            const fCount = failCount(o.id);
            const inspected = pCount + fCount;
            return (
              <div key={o.id}
                onClick={() => { setSelectedOrder(i); setView('inspection'); }}
                className={`bg-white rounded-[28px] border shadow-sm overflow-hidden cursor-pointer group hover:shadow-md transition-all ${result === 'pass' ? 'border-emerald-200 hover:border-emerald-300' : result === 'fail' ? 'border-red-200 hover:border-red-300' : 'border-gray-100 hover:border-primary/20'}`}>
                <div className="relative h-36 overflow-hidden">
                  <img src={o.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[9px] font-black text-white uppercase tracking-widest">{o.category}</span>
                  </div>
                  {result === 'pass' && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 rounded-xl">
                      <CheckCircle className="size-3 text-white" />
                      <span className="text-[9px] font-black text-white uppercase">Đạt</span>
                    </div>
                  )}
                  {result === 'fail' && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-red-500 rounded-xl">
                      <XCircle className="size-3 text-white" />
                      <span className="text-[9px] font-black text-white uppercase">Không đạt</span>
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3">
                    <p className="text-base font-black text-white">{o.product}</p>
                    <p className="text-[10px] text-white/80 font-bold">{o.qty} · {o.bags} túi</p>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-primary bg-primary/5 px-2.5 py-1 rounded-lg">#{o.id}</span>
                    <span className="text-[10px] font-bold text-gray-400">{inspected}/{criteria.length} tiêu chí</span>
                  </div>
                  {/* Mini progress bar */}
                  <div className="h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden flex">
                    <div className="h-full bg-emerald-400 transition-all duration-300" style={{ width: `${(pCount / criteria.length) * 100}%` }} />
                    <div className="h-full bg-red-400 transition-all duration-300" style={{ width: `${(fCount / criteria.length) * 100}%` }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3">
                      {pCount > 0 && <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600"><ThumbsUp className="size-3" /> {pCount} đạt</span>}
                      {fCount > 0 && <span className="flex items-center gap-1 text-[10px] font-black text-red-500"><ThumbsDown className="size-3" /> {fCount} không</span>}
                      {inspected === 0 && <span className="text-[10px] font-bold text-gray-400">Chưa kiểm tra</span>}
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-black text-primary group-hover:gap-2 transition-all">
                      Kiểm tra <ChevronRight className="size-3" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── INSPECTION VIEW ───────────────────────────────────────────────
  if (view === 'inspection' && order) {
    const pCount = passCount(order.id);
    const fCount = failCount(order.id);
    const inspected = pCount + fCount;
    const result = orderResults[order.id];

    return (
      <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-300">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3">
          <button onClick={() => setView('farmer-list')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-100 rounded-2xl text-xs font-black text-gray-500 hover:bg-gray-50 transition-colors shadow-sm">
            <ArrowLeft className="size-4" /> Danh sách nông dân
          </button>
          <ChevronRight className="size-4 text-gray-300" />
          <button onClick={() => setView('order-list')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-100 rounded-2xl text-xs font-black text-gray-500 hover:bg-gray-50 transition-colors shadow-sm">
            {farmer?.name}
          </button>
          <ChevronRight className="size-4 text-gray-300" />
          <span className="text-xs font-black text-primary px-4 py-2.5 bg-primary/5 rounded-2xl">{order.product}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order switcher sidebar */}
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-6 flex flex-col gap-3 h-fit">
            <h4 className="font-black text-gray-700 text-xs uppercase tracking-widest mb-1">
              Đơn của {farmer?.name} ({orders.length})
            </h4>
            {orders.map((o, i) => {
              const r = orderResults[o.id];
              const pc = passCount(o.id); const fc = failCount(o.id);
              return (
                <button key={o.id} onClick={() => setSelectedOrder(i)}
                  className={`flex items-center gap-3 p-4 rounded-[16px] border transition-all text-left ${selectedOrder === i ? 'bg-primary/5 border-primary/20' : 'border-gray-100 hover:bg-gray-50'}`}>
                  <img src={o.avatar} className="size-10 rounded-xl object-cover shrink-0" alt="" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-gray-900 truncate">{o.product}</p>
                    <p className="text-[9px] text-gray-400 font-bold">#{o.id} · {o.qty}</p>
                    {(pc + fc) > 0 && (
                      <div className="flex gap-2 mt-1">
                        {pc > 0 && <span className="text-[8px] font-black text-emerald-600">✓ {pc}</span>}
                        {fc > 0 && <span className="text-[8px] font-black text-red-500">✗ {fc}</span>}
                      </div>
                    )}
                  </div>
                  {r === 'pass' && <CheckCircle className="size-4 text-emerald-500 shrink-0" />}
                  {r === 'fail' && <XCircle className="size-4 text-red-500 shrink-0" />}
                  {!r && selectedOrder === i && <ChevronRight className="size-3.5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Main inspection panel */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
              {/* Hero image */}
              <div className="relative h-56">
                <img src={order.image} className="w-full h-full object-cover" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-6 left-8 text-white">
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-widest">{order.category}</span>
                  <h3 className="text-2xl font-black mt-2">{order.product}</h3>
                  <p className="text-sm opacity-80 font-medium">{order.farmer} · {order.qty} · {order.bags} túi</p>
                </div>
                <div className="absolute top-5 right-5 flex items-center gap-2">
                  {/* Progress badge */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-black/30 backdrop-blur-md rounded-xl">
                    <span className="text-[10px] font-black text-white">{inspected}/{criteria.length} tiêu chí</span>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-xl text-white text-xs font-black hover:bg-white/30 transition-colors">
                    <Camera className="size-4" /> Chụp bằng chứng
                  </button>
                </div>
              </div>

              <div className="p-8">
                {/* Progress summary */}
                <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${(pCount / criteria.length) * 100}%` }} />
                    <div className="h-full bg-red-400 transition-all duration-500" style={{ width: `${(fCount / criteria.length) * 100}%` }} />
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-xs font-black">
                    {pCount > 0 && <span className="flex items-center gap-1 text-emerald-600"><ThumbsUp className="size-3.5" /> {pCount} đạt</span>}
                    {fCount > 0 && <span className="flex items-center gap-1 text-red-500"><ThumbsDown className="size-3.5" /> {fCount} không đạt</span>}
                    {inspected < criteria.length && <span className="text-gray-400">{criteria.length - inspected} chưa kiểm</span>}
                  </div>
                </div>

                {/* Criteria list */}
                <h4 className="font-black text-gray-800 text-sm uppercase tracking-widest mb-4">Tiêu chí kiểm duyệt</h4>
                <div className="flex flex-col gap-3 mb-6">
                  {criteria.map((c, i) => {
                    const val = getCriteria(order.id, c.key);
                    return (
                      <div key={i}
                        className={`flex items-center justify-between p-5 rounded-[20px] border transition-all ${val === 'pass' ? 'bg-emerald-50/60 border-emerald-200' : val === 'fail' ? 'bg-red-50/60 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
                        <div className="flex-1 min-w-0 mr-4">
                          <div className="flex items-center gap-2">
                            {val === 'pass' && <CheckCircle className="size-4 text-emerald-500 shrink-0" />}
                            {val === 'fail' && <XCircle className="size-4 text-red-500 shrink-0" />}
                            {!val && <div className="size-4 rounded-full border-2 border-gray-300 shrink-0" />}
                            <p className={`text-sm font-black ${val === 'pass' ? 'text-emerald-700' : val === 'fail' ? 'text-red-600' : 'text-gray-700'}`}>{c.label}</p>
                          </div>
                        
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => setCriteria(order.id, c.key, 'pass')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${val === 'pass' ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30' : 'bg-white border border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50'}`}>
                            <ThumbsUp className="size-3.5" /> Đạt
                          </button>
                          <button
                            onClick={() => setCriteria(order.id, c.key, 'fail')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${val === 'fail' ? 'bg-red-500 text-white shadow-sm shadow-red-500/30' : 'bg-white border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500 hover:bg-red-50'}`}>
                            <ThumbsDown className="size-3.5" /> Không đạt
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Note box */}
                <div className="mb-6 rounded-[20px] border border-gray-200 bg-gray-50 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                    <ClipboardCheck className="size-4 text-gray-400" />
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ghi chú kiểm duyệt (nếu có)</p>
                  </div>
                  <textarea rows={2} placeholder="VD: Có 3 trái bị nứt nhẹ, còn lại đạt yêu cầu..."
                    className="w-full px-5 py-4 bg-transparent text-sm font-medium text-gray-800 outline-none resize-none placeholder:text-gray-300" />
                </div>

                {/* Final buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={() => setOrderResults(r => ({ ...r, [order.id]: 'pass' }))}
                    className={`flex-1 py-4 font-black rounded-2xl text-sm flex items-center justify-center gap-3 transition-all ${result === 'pass' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25' : 'bg-[#38703d] text-white shadow-lg shadow-[#38703d]/20 hover:bg-emerald-700 active:scale-[0.98]'}`}>
                    <CheckCircle className="size-5" /> Đạt — Chuyển đóng gói
                  </button>
                  <button
                    onClick={() => setOrderResults(r => ({ ...r, [order.id]: 'fail' }))}
                    className={`flex-1 py-4 font-black rounded-2xl text-sm flex items-center justify-center gap-3 transition-all ${result === 'fail' ? 'bg-red-500 text-white shadow-lg shadow-red-500/25' : 'bg-red-50 border border-red-100 text-red-500 hover:bg-red-100 active:scale-[0.98]'}`}>
                    <XCircle className="size-5" /> Không đạt — Trả hàng
                  </button>
                </div>

                {result === 'pass' && (
                  <div className="mt-4 p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="size-9 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                      <CheckCircle className="size-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-emerald-700">Đơn #{order.id} đã được duyệt!</p>
                      <p className="text-xs text-emerald-600 font-medium mt-0.5">Sẵn sàng chuyển sang bước đóng gói.</p>
                    </div>
                  </div>
                )}
                {result === 'fail' && (
                  <div className="mt-4 p-5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="size-9 bg-red-500 rounded-xl flex items-center justify-center shrink-0">
                      <AlertTriangle className="size-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-red-700">Đơn #{order.id} không đạt tiêu chuẩn.</p>
                      <p className="text-xs text-red-500 font-medium mt-0.5">Đã thông báo nông dân và bắt đầu quy trình hoàn hàng.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default QualityInspection;