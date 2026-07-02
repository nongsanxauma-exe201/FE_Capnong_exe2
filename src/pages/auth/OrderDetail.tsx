import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Loader2, AlertCircle, Eye, Sprout, Award, Store, Package,
} from 'lucide-react';
import {
  orderService,
  OrderResponse,
  OrderItemResponse,
  isMysteryBoxOrderItem,
} from '../../services/order.service';
import { getOrderStatusLabel, getOrderStatusBadgeClass } from '../../constants/orderStatusLabels';
import { globalShowAlert } from '../../contexts/PopupContext';
import ResumePaymentModal from '../../components/payment/ResumePaymentModal';
import { useResumePayment } from '../../hooks/useResumePayment';

const getQtyKg = (item: OrderItemResponse) => Number(item.quantityKg ?? item.quantity ?? 0);
const getPricePerKg = (item: OrderItemResponse) => Number(item.pricePerKg ?? item.unitPrice ?? 0);

const formatImpactNumber = (value?: number | null) =>
  Number(value ?? 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 });

const formatItemQty = (item: OrderItemResponse) => {
  if (isMysteryBoxOrderItem(item)) {
    return `${(item.quantity ?? 0).toLocaleString('vi-VN')} túi`;
  }
  return `${getQtyKg(item).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} kg`;
};

const formatItemPrice = (item: OrderItemResponse) => {
  if (isMysteryBoxOrderItem(item)) {
    return `${(item.unitPrice ?? item.pricePerKg ?? 0).toLocaleString('vi-VN')}đ/túi`;
  }
  return `${getPricePerKg(item).toLocaleString('vi-VN')}đ/kg`;
};

const itemLineTotal = (item: OrderItemResponse) => {
  if (isMysteryBoxOrderItem(item)) {
    return (item.unitPrice ?? 0) * (item.quantity ?? 0);
  }
  return getPricePerKg(item) * getQtyKg(item);
};

const canTrack = (status: string) =>
  [
    'CONFIRMED', 'READY_FOR_PICKUP', 'SHIPPING_TO_WAREHOUSE', 'ARRIVED_AT_WAREHOUSE',
    'QUALITY_CHECKING', 'QUALITY_CHECKED', 'QC_PENDING_BUYER', 'READY', 'SHIPPING',
  ].includes(status);

const OrderDetail: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const parsedId = Number(orderId);

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [qcModalOpen, setQcModalOpen] = useState(false);
  const [submittingQc, setSubmittingQc] = useState(false);

  const { openResumePayment, resuming, resumeOptions, closeResumePayment } = useResumePayment((message) => {
    globalShowAlert(message, 'Lỗi', 'error');
  });

  const loadOrder = useCallback(async () => {
    if (!Number.isFinite(parsedId) || parsedId <= 0) return;
    setLoading(true);
    try {
      const res = await orderService.getOrderById(parsedId);
      if (res.result) setOrder(res.result);
      else setOrder(null);
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [parsedId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handleQcDecision = async (acceptRemaining: boolean) => {
    if (!order) return;
    setSubmittingQc(true);
    try {
      await orderService.qcBuyerDecision(order.id, { acceptRemaining });
      globalShowAlert(
        acceptRemaining
          ? 'Bạn đã chọn nhận phần hàng còn lại. Đơn sẽ được đóng gói và giao.'
          : order.paymentMethod?.toUpperCase() === 'COD'
            ? 'Bạn đã từ chối nhận phần còn lại. Số tiền COD khi nhận hàng sẽ được cập nhật.'
            : 'Bạn đã từ chối nhận phần còn lại. Tiền hoàn (nếu có) sẽ được cộng vào ví.',
        'Thành công',
        'success',
      );
      setQcModalOpen(false);
      await loadOrder();
    } catch (err: unknown) {
      const e = err as { data?: { message?: string }; message?: string };
      globalShowAlert(e?.data?.message || e?.message || 'Không thể gửi lựa chọn.', 'Lỗi', 'error');
    } finally {
      setSubmittingQc(false);
    }
  };

  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <p className="text-gray-500 font-bold">Mã đơn không hợp lệ.</p>
      </div>
    );
  }

  if (loading && !order) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="size-10 text-primary animate-spin" />
        <p className="text-sm font-bold text-gray-400">Đang tải chi tiết đơn...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6">
        <Package className="size-16 text-gray-300" />
        <p className="text-gray-600 font-bold">Không tìm thấy đơn hàng #{parsedId}</p>
        <button
          onClick={() => navigate('/my-orders')}
          className="px-6 py-3 bg-primary text-white font-black rounded-2xl"
        >
          Về đơn hàng của tôi
        </button>
      </div>
    );
  }

  const shopName = order.shopOwner?.shopName ?? order.shopOwner?.fullName ?? 'Cửa hàng';
  const items = order.items ?? [];
  const subtotal = items.reduce((sum, it) => sum + itemLineTotal(it), 0);
  const statusLabel = order.status === 'QC_PENDING_BUYER'
    ? 'Chờ bạn xác nhận'
    : getOrderStatusLabel(order.status);
  const statusBadgeClass = order.status === 'QC_PENDING_BUYER'
    ? 'bg-orange-50 text-orange-600'
    : getOrderStatusBadgeClass(order.status);

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => navigate('/my-orders')}
            className="size-12 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all shadow-sm"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-gray-900">Chi tiết đơn #{order.id}</h1>
            <p className="text-xs font-bold text-gray-400 mt-0.5">
              {order.createdAt
                ? new Date(order.createdAt).toLocaleString('vi-VN', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })
                : ''}
            </p>
          </div>
        </div>

        {/* Trạng thái */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Trạng thái đơn hàng</h2>
            <span className={`px-3 py-1 text-xs font-black rounded-full uppercase ${statusBadgeClass}`}>
              {statusLabel}
            </span>
          </div>
          <InfoRow label="Mã đơn" value={`#${order.id}`} />
        </section>

        {/* QC banner */}
        {order.status === 'QC_PENDING_BUYER' && (
          <section className="bg-orange-50 border border-orange-200 rounded-3xl p-6 shadow-sm">
            <p className="text-sm font-black text-orange-800 mb-2">⚠️ Cần xác nhận kiểm định</p>
            <p className="text-sm text-orange-900 leading-relaxed mb-3">
              Một phần hàng bị hư nặng (≥80%). Phần hư đã được hoàn. Bạn có muốn nhận phần còn lại không?
            </p>
            {order.qcBuyerDecisionDeadline && (
              <p className="text-xs font-bold text-orange-600 mb-4">
                Hạn xác nhận: {new Date(order.qcBuyerDecisionDeadline).toLocaleString('vi-VN')}
              </p>
            )}
            <button
              onClick={() => setQcModalOpen(true)}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl transition-colors"
            >
              Xác nhận QC
            </button>
          </section>
        )}

        {/* Giao hàng */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Thông tin giao hàng</h2>
          <div className="flex justify-between items-start gap-4 mb-3">
            <span className="text-sm text-gray-500 shrink-0">Cửa hàng</span>
            {order.shopOwner?.id ? (
              <Link
                to={`/shop/${order.shopOwner.id}`}
                className="text-sm font-bold text-primary text-right hover:underline flex items-center gap-1"
              >
                <Store className="size-4 shrink-0" />
                {shopName}
              </Link>
            ) : (
              <span className="text-sm font-semibold text-gray-800 text-right">{shopName}</span>
            )}
          </div>
          <InfoRow label="Người nhận" value={order.recipientName ?? '—'} />
          <InfoRow label="Điện thoại" value={order.recipientPhone ?? '—'} />
          <InfoRow label="Địa chỉ" value={order.shippingAddress ?? '—'} />
          <InfoRow label="Thanh toán" value={order.paymentMethod ?? '—'} />
          {order.note && <InfoRow label="Ghi chú" value={order.note} />}
        </section>

        {/* Sản phẩm */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Sản phẩm</h2>
          {items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Không có sản phẩm.</p>
          ) : (
            <div className="space-y-3">
              {items.map((item, idx) => {
                const isBox = isMysteryBoxOrderItem(item);
                const productLink = !isBox && item.productId ? `/san-pham/${item.productId}` : null;
                const boxLink = isBox && item.mysteryBoxId ? `/mystery-box/${item.mysteryBoxId}` : null;
                const href = productLink ?? boxLink;

                const row = (
                  <div className="flex items-center gap-4 py-3">
                    <div className="size-14 rounded-2xl bg-gray-50 overflow-hidden shrink-0 flex items-center justify-center">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <span className="text-2xl">{isBox ? '📦' : '🛒'}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 line-clamp-2">
                        {item.productName ?? item.mysteryBoxType ?? 'Sản phẩm'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Khối lượng: {formatItemQty(item)}</p>
                      {href && (
                        <p className="text-xs font-bold text-primary mt-1">Xem chi tiết ›</p>
                      )}
                    </div>
                    <p className="text-sm font-black text-gray-800 shrink-0">{formatItemPrice(item)}</p>
                  </div>
                );

                return href ? (
                  <Link
                    key={item.orderDetailId ?? item.orderMysteryBoxId ?? idx}
                    to={href}
                    className={`block hover:bg-gray-50/80 rounded-2xl -mx-2 px-2 transition-colors ${idx < items.length - 1 ? 'border-b border-gray-50' : ''}`}
                  >
                    {row}
                  </Link>
                ) : (
                  <div
                    key={item.orderDetailId ?? item.orderMysteryBoxId ?? idx}
                    className={idx < items.length - 1 ? 'border-b border-gray-50' : ''}
                  >
                    {row}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Đóng góp */}
        {order.rewardApplied && Number(order.rescuedWeight ?? 0) > 0 && (
          <section className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-3xl p-6">
            <div className="flex items-start gap-3">
              <div className="size-11 bg-white rounded-2xl flex items-center justify-center shadow-sm text-primary shrink-0">
                <Sprout className="size-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-black text-primary uppercase tracking-widest mb-1">Đóng góp từ đơn hàng</p>
                <p className="text-sm font-bold text-green-800 leading-relaxed">
                  Bạn đã góp phần giải cứu {formatImpactNumber(order.rescuedWeight)} kg nông sản giúp người nông dân.
                </p>
              </div>
            </div>
            <div className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white/80 px-4 py-2 text-sm font-black text-amber-600">
              <Award className="size-4" />
              +{formatImpactNumber(order.rewardPoints)} điểm tích lũy
            </div>
          </section>
        )}

        {/* Thanh toán */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Thanh toán</h2>
          <InfoRow label="Tạm tính" value={`${subtotal.toLocaleString('vi-VN')}đ`} />
          <InfoRow label="Phí vận chuyển" value={`${(order.shippingFee ?? 0).toLocaleString('vi-VN')}đ`} />
          {(order.refundAmount ?? 0) > 0 && (
            <InfoRow label="Đã hoàn (QC)" value={`${order.refundAmount!.toLocaleString('vi-VN')}đ`} />
          )}
          <div className="border-t border-gray-100 my-3" />
          <InfoRow label="Tổng cộng" value={`${(order.totalAmount ?? 0).toLocaleString('vi-VN')}đ`} bold />
        </section>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-2">
          {order.status === 'AWAITING_PAYMENT' && (
            <button
              onClick={() => openResumePayment(order.id)}
              disabled={resuming}
              className="flex-1 min-w-[200px] py-4 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl shadow-lg shadow-amber-500/20 disabled:opacity-60 transition-colors"
            >
              {resuming ? 'Đang tải...' : '💳 Tiếp tục thanh toán'}
            </button>
          )}
          {canTrack(order.status) && (
            <button
              onClick={() => navigate(`/tracking/${order.id}`)}
              className="flex-1 min-w-[200px] py-4 bg-primary text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary-dark transition-colors"
            >
              <Eye className="size-4" />
              Theo dõi đơn hàng
            </button>
          )}
        </div>
      </div>

      {/* QC Modal */}
      {qcModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-50">
              <h3 className="text-lg font-black text-gray-900">Xác nhận kiểm định chất lượng</h3>
              <p className="text-xs text-gray-400 font-medium mt-1">
                Bạn muốn nhận phần còn lại hay không?
              </p>
            </div>
            <div className="p-8 space-y-4">
              <button
                disabled={submittingQc}
                onClick={() => handleQcDecision(true)}
                className="w-full py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary-dark disabled:opacity-60"
              >
                Nhận phần còn lại
              </button>
              <button
                disabled={submittingQc}
                onClick={() => handleQcDecision(false)}
                className="w-full py-4 bg-red-50 text-red-700 font-black rounded-2xl border border-red-100 hover:bg-red-100 disabled:opacity-60"
              >
                {order.paymentMethod?.toUpperCase() === 'COD'
                  ? 'Không nhận phần còn lại'
                  : 'Không nhận, hoàn tiền phần còn lại'}
              </button>
              <p className="text-[11px] text-gray-400 font-medium text-center">
                {order.paymentMethod?.toUpperCase() === 'COD'
                  ? 'Phần còn lại sẽ bị hủy và số tiền COD khi nhận hàng sẽ được giảm tương ứng.'
                  : 'Phần còn lại sẽ bị hủy và tiền hoàn sẽ được cộng vào ví (đơn thanh toán online).'}
              </p>
              <button
                onClick={() => setQcModalOpen(false)}
                className="w-full py-3 text-gray-500 font-bold text-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {resumeOptions && (
        <ResumePaymentModal options={resumeOptions} onClose={closeResumePayment} />
      )}
    </div>
  );
};

function InfoRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-4 mb-3 last:mb-0">
      <span className={`text-sm text-gray-500 shrink-0 ${bold ? 'font-black text-gray-800' : ''}`}>{label}</span>
      <span className={`text-sm text-right ${bold ? 'font-black text-primary text-base' : 'font-semibold text-gray-800'}`}>
        {value}
      </span>
    </div>
  );
}

export default OrderDetail;
