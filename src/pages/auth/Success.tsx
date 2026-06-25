
import React, { useEffect, useMemo, useState } from 'react';
import { Award, CheckCircle2, Clock, Home, ShoppingBag, Eye, Sprout } from 'lucide-react';
import { orderService } from '../../services/order.service';
import type { OrderResponse } from '../../services/order.service';

interface SuccessProps {
  onViewMyOrders: () => void;
  onGoHome: () => void;
  orderId?: number;
}

const Success: React.FC<SuccessProps> = ({ onViewMyOrders, onGoHome, orderId }) => {
  const urlOrderId = useMemo(() => {
    const raw = new URLSearchParams(window.location.search).get('orderId');
    const parsed = raw ? Number(raw) : 0;
    return Number.isNaN(parsed) ? 0 : parsed;
  }, []);
  const resolvedOrderId = orderId || urlOrderId;
  const [orderSummary, setOrderSummary] = useState<OrderResponse | null>(null);

  useEffect(() => {
    if (!resolvedOrderId) return;
    orderService.getOrderById(resolvedOrderId)
      .then((res) => {
        if (res.result) setOrderSummary(res.result);
      })
      .catch((err) => console.error('Failed to load COD rescue summary', err));
  }, [resolvedOrderId]);

  const rescuedWeight = Number(orderSummary?.rescuedWeight ?? 0);
  const rewardPoints = Number(orderSummary?.rewardPoints ?? 0);
  const rewardApplied = Boolean(orderSummary?.rewardApplied);
  const formatKg = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 2 });

  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-20 px-4 animate-in fade-in zoom-in-95 duration-500">
      <div className="max-w-md w-full text-center flex flex-col items-center">
        <div className="size-24 bg-green-50 rounded-full flex items-center justify-center text-primary mb-8 relative">
           <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-20" />
           <CheckCircle2 className="size-14 relative z-10" />
        </div>
        
        <h2 className="text-3xl font-black text-gray-900 font-display uppercase tracking-tight mb-4">Đặt hàng thành công!</h2>
        <p className="text-gray-500 font-medium leading-relaxed mb-10">
          Cảm ơn bạn đã đồng hành cùng <span className="text-primary font-black">XẤU MÃ</span> để cứu nông sản. Đơn hàng <span className="font-bold text-gray-900">#{resolvedOrderId || 'XM-XXXX'}</span> đã được gửi đến nhà vườn để duyệt.
        </p>

        {orderSummary && rescuedWeight > 0 && (
          <div className="w-full p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-[32px] border border-green-100 mb-8 text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                <Sprout className="size-6 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-black text-primary uppercase tracking-widest">Giải cứu nông sản</p>
                <p className="text-lg font-black text-gray-900">{formatKg(rescuedWeight)} kg</p>
              </div>
            </div>
            <p className="text-sm text-green-800 font-bold leading-relaxed">
              Với đơn hàng này, bạn đã góp phần giải cứu {formatKg(rescuedWeight)} kg nông sản, giúp nông dân giảm lãng phí.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/80 px-4 py-3 text-sm font-black text-amber-600">
              <Award className="size-5" />
              {rewardApplied
                ? `+${formatKg(rewardPoints)} điểm tích lũy`
                : `${formatKg(rewardPoints)} điểm dự kiến, sẽ cộng khi đơn hoàn tất`
              }
            </div>
          </div>
        )}

        <div className="w-full p-8 bg-yellow-50 rounded-[40px] border border-yellow-100 mb-10 flex flex-col gap-6">
           <div className="flex items-center gap-3 pb-4 border-b border-yellow-100">
              <div className="size-10 bg-yellow-100 rounded-2xl flex items-center justify-center text-yellow-600">
                <Clock className="size-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-yellow-900 uppercase">Đang chờ duyệt</h4>
                <p className="text-xs text-yellow-600 font-medium mt-0.5">Nhà vườn sẽ xác nhận đơn hàng trong vòng 1-2 giờ</p>
              </div>
           </div>
           
           <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Mã đơn hàng:</span>
                <span className="text-gray-900 font-black">#{resolvedOrderId || 'XM-XXXX'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Trạng thái:</span>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-black rounded-full uppercase">Chờ duyệt</span>
              </div>
           </div>
        </div>

        <div className="flex flex-col w-full gap-4">
           <button 
             onClick={onViewMyOrders}
             className="w-full py-5 bg-primary text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all transform active:scale-95"
           >
              <Eye className="size-5" /> XEM ĐƠN HÀNG CỦA TÔI
           </button>
           <button 
             onClick={onGoHome}
             className="w-full py-5 bg-white border-2 border-gray-100 text-gray-400 font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-50 hover:text-gray-900 transition-all"
           >
              <Home className="size-5" /> TIẾP TỤC MUA SẮM
           </button>
        </div>

        <div className="mt-12 p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex items-center gap-4 text-left">
           <div className="size-10 bg-white rounded-xl flex items-center justify-center text-blue-500 shadow-sm shrink-0">
              <ShoppingBag className="size-5" />
           </div>
           <p className="text-[11px] text-blue-900 font-bold leading-relaxed">
              💡 <span className="font-black">Mẹo:</span> Bạn có thể xem trạng thái đơn hàng bất cứ lúc nào trong mục "Đơn hàng của tôi". Chúng tôi sẽ thông báo khi nhà vườn duyệt đơn!
           </p>
        </div>
      </div>
    </div>
  );
};

export default Success;
