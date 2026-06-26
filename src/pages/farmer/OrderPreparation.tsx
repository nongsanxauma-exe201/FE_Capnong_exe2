import React, { useState, useEffect } from 'react';
import {
  CheckCircle2, AlertCircle, Loader2, Gift, Package,
  Truck, Phone, MessageCircle, Star, MapPin, ChevronLeft
} from 'lucide-react';
import { orderService, OrderResponse } from '../../services';
import { globalShowAlert } from '../../contexts/PopupContext';

interface OrderPreparationProps {
  orderId: string;
  onBack: () => void;
  onComplete: () => void;
}

type ShipmentMethod = 'self' | 'shipper' | null;

// Mock shipper data — replace with real API when available
const NEARBY_SHIPPERS = [
  { id: 'shipper-1', name: 'Nguyễn Văn Hoàng', rating: 4.8, reviews: 142, distance: '0.8 km', phone: '0922222222', vehicle: 'Xe tải van', status: 'Có sẵn', avgTime: '20 phút' },
  { id: 'shipper-2', name: 'Trần Giao Hàng',   rating: 4.6, reviews: 87,  distance: '1.4 km', phone: '0933333333', vehicle: 'Xe tải ben',  status: 'Có sẵn', avgTime: '25 phút' },
  { id: 'shipper-3', name: 'Lê Minh Shipper',  rating: 4.9, reviews: 210, distance: '2.1 km', phone: '0944444444', vehicle: 'Xe tải nhỏ', status: 'Bận',    avgTime: '35 phút' },
];

const OrderPreparation: React.FC<OrderPreparationProps> = ({ orderId, onBack, onComplete }) => {
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shipmentMethod, setShipmentMethod] = useState<ShipmentMethod>(null);
  const [selectedShipperId, setSelectedShipperId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState('Honda Wave - Xanh dương');
  const [customVehicle, setCustomVehicle] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      try {
        const res = await orderService.getOrderById(Number(orderId));
        if (res.result) setOrder(res.result);
        else setError(`Không tìm thấy đơn hàng #${orderId}`);
      } catch {
        setError('Không thể tải thông tin đơn hàng.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  const handleConfirm = async () => {
    if (!order) return;
    setConfirming(true);
    try {
      await orderService.updateOrder(order.id, { status: 'CONFIRMED' });
      globalShowAlert('Đã xác nhận chuẩn bị hàng thành công!', 'Thành công', 'success');
      onComplete();
    } catch (err: any) {
      globalShowAlert(err?.data?.message || 'Có lỗi xảy ra khi xác nhận.', 'Lỗi', 'error');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <Loader2 className="size-10 text-primary animate-spin" />
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Đang tải đơn hàng...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="w-full max-w-4xl mx-auto px-6 py-8">
        <button onClick={onBack} className="mb-6 text-gray-500 hover:text-primary font-bold flex items-center gap-2">← Quay lại</button>
        <div className="bg-red-50 border border-red-100 p-6 rounded-2xl flex items-center gap-3 text-red-600 font-bold">
          <AlertCircle className="size-5" /> {error || 'Không tìm thấy đơn hàng'}
        </div>
      </div>
    );
  }

  const canConfirm = shipmentMethod === 'self' || (shipmentMethod === 'shipper' && selectedShipperId !== null);

  return (
    <div className="flex-1 bg-background">
      <div className="w-full max-w-4xl mx-auto px-4 md:px-6 py-8 animate-in fade-in duration-300">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={onBack} className="size-10 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-500">
            <ChevronLeft className="size-5" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-gray-900">Chuẩn Bị Hàng</h1>
            <p className="text-sm text-gray-500">Đơn hàng #{order.id}</p>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-[32px] border border-gray-100 p-8 mb-6">
          <h2 className="text-lg font-black text-gray-900 mb-6">📦 Thông Tin Đơn Hàng</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Items */}
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Sản phẩm</p>
              <div className="space-y-3 mb-4">
                {(order.items || []).map((item: any, i: number) => {
                  const isMysteryBox = item.itemType === 'MYSTERY_BOX';
                  const fallback = isMysteryBox
                    ? `https://picsum.photos/seed/box${item.mysteryBoxId}/80/80`
                    : `https://picsum.photos/seed/product${item.productId}/80/80`;
                  return (
                    <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                      <div className="size-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 relative">
                        <img src={item.imageUrl || fallback} alt={item.productName}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.src = fallback; }} />
                        {isMysteryBox && (
                          <div className="absolute -top-1 -right-1 size-5 bg-primary rounded-full flex items-center justify-center">
                            <Gift className="size-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">{item.productName || `Sản phẩm #${i + 1}`}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{(item.quantityKg ?? item.quantity).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} kg x {((item.pricePerKg ?? item.unitPrice) || 0).toLocaleString('vi-VN')}đ/kg</p>
                      </div>
                      <p className="text-sm font-black text-primary flex-shrink-0">
                        {(((item.quantityKg ?? item.quantity) || 1) * ((item.pricePerKg ?? item.unitPrice) || 0)).toLocaleString('vi-VN')}đ
                      </p>
                    </div>
                  );
                })}
                {(!order.items || order.items.length === 0) && (
                  <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-400 flex items-center gap-2">
                    <Package className="size-4" /> Không có chi tiết sản phẩm
                  </div>
                )}
              </div>
              <div className="p-4 bg-green-50 rounded-2xl border border-green-100 flex justify-between items-center">
                <span className="text-sm font-black text-green-700 uppercase">Tổng cộng</span>
                <span className="text-lg font-black text-primary">{(order.totalAmount || 0).toLocaleString('vi-VN')}đ</span>
              </div>
            </div>

            {/* Buyer Info */}
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Thông tin khách hàng</p>
              <div className="space-y-3">
                {[
                  { label: 'Tên', value: order.recipientName },
                  { label: 'Địa chỉ', value: order.shippingAddress },
                  { label: 'Số điện thoại', value: order.recipientPhone },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{label}</p>
                    <p className="text-sm font-bold text-gray-900">{value || 'N/A'}</p>
                  </div>
                ))}
                {order.note && (
                  <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                    <p className="text-[10px] font-bold text-yellow-600 uppercase mb-1">Ghi chú</p>
                    <p className="text-sm font-bold text-yellow-800">{order.note}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Shipment Method */}
        <div className="bg-white rounded-[32px] border border-gray-100 p-8 mb-6">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">🚗 Phương tiện vận chuyển</p>
          <div className="space-y-4">
            <label
              onClick={() => { setShipmentMethod('self'); setSelectedShipperId(null); }}
              className={`flex items-start gap-4 p-5 border-2 rounded-2xl cursor-pointer transition-all ${shipmentMethod === 'self' ? 'border-primary bg-green-50' : 'border-gray-200 hover:border-primary/40 hover:bg-gray-50'}`}
            >
              <input type="radio" readOnly checked={shipmentMethod === 'self'} className="mt-1 accent-primary" />
              <div className="flex-1">
                <p className="font-black text-gray-900">Tôi có phương tiện giao hàng</p>
                <p className="text-xs text-gray-500 mt-1">Tự vận chuyển đến khách hoặc liên hệ shipper bên ngoài</p>
              </div>
              <Truck className="size-5 text-gray-400 mt-1 flex-shrink-0" />
            </label>

            <label
              onClick={() => setShipmentMethod('shipper')}
              className={`flex items-start gap-4 p-5 border-2 rounded-2xl cursor-pointer transition-all ${shipmentMethod === 'shipper' ? 'border-primary bg-green-50' : 'border-gray-200 hover:border-primary/40 hover:bg-gray-50'}`}
            >
              <input type="radio" readOnly checked={shipmentMethod === 'shipper'} className="mt-1 accent-primary" />
              <div className="flex-1">
                <p className="font-black text-gray-900">Tôi không có phương tiện — Tìm shipper gần đây</p>
                <p className="text-xs text-gray-500 mt-1">Hệ thống gợi ý shipper có sẵn trong bán kính gần</p>
              </div>
              <MessageCircle className="size-5 text-gray-400 mt-1 flex-shrink-0" />
            </label>
          </div>
        </div>

        {/* Self shipment form */}
        {shipmentMethod === 'self' && (
          <div className="bg-white rounded-[32px] border border-gray-100 p-8 mb-6 animate-in fade-in duration-200">
            <h3 className="text-lg font-black text-gray-900 mb-6">📋 Thông tin giao hàng tự vận chuyển</h3>
            <div className="space-y-5 mb-8">
              <div>
                <label className="text-xs font-black text-gray-700 uppercase tracking-wider mb-2 block">Phương tiện</label>
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm font-bold bg-white"
                >
                  <option>Xe tải Van - Xanh dương</option>
                  <option>Xe tải Ben - Đen</option>
                  <option>Xe tải nhỏ</option>
                  <option value="other">Khác</option>
                </select>
                {selectedVehicle === 'other' && (
                  <input
                    type="text"
                    value={customVehicle}
                    onChange={(e) => setCustomVehicle(e.target.value)}
                    placeholder="Nhập phương tiện của bạn..."
                    className="mt-3 w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm font-bold"
                  />
                )}
              </div>
              <div>
                <label className="text-xs font-black text-gray-700 uppercase tracking-wider mb-2 block">Biển số xe</label>
                <input
                  type="text"
                  placeholder="VD: 51A-123.45"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-black text-gray-700 uppercase tracking-wider mb-2 block">Thời gian dự kiến giao hàng</label>
                <input
                  type="time"
                  defaultValue="14:30"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-black text-gray-700 uppercase tracking-wider mb-2 block">Ghi chú cho khách hàng</label>
                <textarea
                  rows={3}
                  placeholder="VD: Giao tại cửa trước, chuông doorbell..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm font-bold resize-none"
                />
              </div>
            </div>
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="w-full py-4 bg-primary text-white font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:opacity-50"
            >
              {confirming ? <Loader2 className="size-5 animate-spin" /> : <CheckCircle2 className="size-5" />}
              {confirming ? 'Đang xử lý...' : 'Xác nhận giao hàng tự vận chuyển'}
            </button>
          </div>
        )}

        {/* Nearby shippers */}
        {shipmentMethod === 'shipper' && (
          <div className="bg-white rounded-[32px] border border-gray-100 p-8 mb-6 animate-in fade-in duration-200">
            <h3 className="text-lg font-black text-gray-900 mb-1">🚚 Shipper Có Sẵn Gần Bạn</h3>
            <p className="text-sm text-gray-500 mb-6">Chọn shipper để liên hệ, sau đó xác nhận giao hàng bên dưới</p>
            <div className="space-y-4 mb-8">
              {NEARBY_SHIPPERS.map((shipper) => (
                <div
                  key={shipper.id}
                  onClick={() => setSelectedShipperId(shipper.id)}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${selectedShipperId === shipper.id ? 'border-primary bg-green-50' : 'border-gray-200 hover:border-primary/40 hover:bg-gray-50'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-black text-gray-900">{shipper.name}</h4>
                        <span className={`px-2 py-0.5 text-[9px] font-black rounded-lg ${shipper.status === 'Có sẵn' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {shipper.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
                        <span className="flex items-center gap-1"><Star className="size-3 fill-yellow-400 text-yellow-400" />{shipper.rating} ({shipper.reviews})</span>
                        <span className="flex items-center gap-1"><MapPin className="size-3" />{shipper.distance}</span>
                        <span>⏱ {shipper.avgTime}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Phương tiện: <span className="font-black text-gray-600">{shipper.vehicle}</span></p>
                    </div>
                    {selectedShipperId === shipper.id && (
                      <a
                        href={`tel:${shipper.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-black text-xs hover:bg-primary/90 transition-colors flex-shrink-0 ml-4"
                      >
                        <Phone className="size-3.5" /> Gọi ngay
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Confirm button — only active after selecting a shipper */}
            <button
              onClick={handleConfirm}
              disabled={confirming || !selectedShipperId}
              className="w-full py-4 bg-primary text-white font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {confirming ? <Loader2 className="size-5 animate-spin" /> : <CheckCircle2 className="size-5" />}
              {confirming ? 'Đang xử lý...' : selectedShipperId ? 'Xác nhận giao hàng' : 'Chọn shipper để tiếp tục'}
            </button>
          </div>
        )}

        {/* Bottom hint if nothing selected */}
        {!shipmentMethod && (
          <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 text-center text-sm text-gray-400 font-bold">
            Vui lòng chọn phương thức vận chuyển để tiếp tục
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderPreparation;
