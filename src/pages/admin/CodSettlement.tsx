import React, { useCallback, useEffect, useState } from 'react';
import {
  Banknote,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  codSettlementService,
  CodPendingOrderResponse,
  getCodCollectAmount,
  getCodPrepaidAmount,
} from '../../services/codSettlement.service';
import { globalShowAlert, globalShowConfirm } from '../../contexts/PopupContext';

const fmtCur = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  AWAITING_CONFIRMATION: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PREPARING: 'Đang chuẩn bị',
  PACK: 'Đang đóng gói',
  READY: 'Sẵn sàng',
  SHIPPING_TO_WAREHOUSE: 'Đang giao tới kho',
  ARRIVED_AT_WAREHOUSE: 'Đã tới kho',
  QUALITY_CHECKING: 'Đang kiểm định',
  QUALITY_APPROVED: 'Đạt chất lượng',
  QUALITY_CHECKED: 'Đã kiểm tra',
  QUALITY_REJECTED: 'Không đạt chất lượng',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  COMPLETED: 'Hoàn thành',
  PAID: 'Đã thanh toán',
  CANCELLED: 'Đã hủy',
  FAILED: 'Thất bại',
};

function getOrderStatusLabel(status?: string | null): string {
  if (!status) return ORDER_STATUS_LABELS.DELIVERED;
  return ORDER_STATUS_LABELS[status] ?? status.replace(/_/g, ' ').toLowerCase();
}

const CodSettlement: React.FC = () => {
  const [orders, setOrders] = useState<CodPendingOrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settlingId, setSettlingId] = useState<number | null>(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await codSettlementService.getPendingCodOrders();
      setOrders(res.result ?? []);
    } catch (err: any) {
      console.error('Failed to load pending COD orders', err);
      setError(err?.data?.message || 'Không thể tải danh sách COD cần đối soát.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleSettle = async (order: CodPendingOrderResponse) => {
    const amount = getCodCollectAmount(order);
    if (!await globalShowConfirm(
      `Xác nhận đã nhận ${fmtCur(amount)} từ shipper cho đơn #${order.id}?`,
      'Đối soát COD'
    )) return;

    try {
      setSettlingId(order.id);
      await codSettlementService.settleCodOrder(order.id);
      globalShowAlert('Đối soát COD thành công', 'Thành công', 'success');
      fetchPending();
    } catch (err: any) {
      globalShowAlert(err?.data?.message || 'Đối soát COD thất bại', 'Lỗi', 'error');
    } finally {
      setSettlingId(null);
    }
  };

  const handleConfirmCash = async (order: CodPendingOrderResponse) => {
    const amount = getCodPrepaidAmount(order);
    if (!await globalShowConfirm(
      `Xác nhận đã nhận ${fmtCur(amount)} tiền mặt từ shipper cho đơn #${order.id}?`,
      'Xác nhận tiền mặt COD'
    )) return;

    try {
      setSettlingId(order.id);
      await codSettlementService.confirmShipperCashPayment(order.id);
      globalShowAlert('Đã xác nhận tiền mặt COD', 'Thành công', 'success');
      fetchPending();
    } catch (err: any) {
      globalShowAlert(err?.data?.message || 'Xác nhận tiền mặt thất bại', 'Lỗi', 'error');
    } finally {
      setSettlingId(null);
    }
  };

  const handleRefundShipper = async (order: CodPendingOrderResponse) => {
    const amount = getCodPrepaidAmount(order);
    if (!await globalShowConfirm(
      `Hoàn ${fmtCur(amount)} tiền hàng cho shipper đơn #${order.id}? Phí ship không hoàn.`,
      'Hoàn tiền shipper COD'
    )) return;

    try {
      setSettlingId(order.id);
      await codSettlementService.refundCodPrepaymentToShipper(order.id);
      globalShowAlert('Đã hoàn tiền hàng cho shipper', 'Thành công', 'success');
      fetchPending();
    } catch (err: any) {
      globalShowAlert(err?.data?.message || 'Hoàn tiền thất bại', 'Lỗi', 'error');
    } finally {
      setSettlingId(null);
    }
  };

  const buyerLabel = (order: CodPendingOrderResponse) =>
    order.buyer?.fullName || order.recipientName || (order.buyerId ? `Buyer #${order.buyerId}` : '—');

  const shipperLabel = (order: CodPendingOrderResponse) =>
    order.shipper?.fullName || (order.shipper?.id ? `Shipper #${order.shipper.id}` : '—');

  return (
    <div className="p-8 flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black font-display text-gray-900 uppercase tracking-tight">
            COD cần đối soát
          </h2>
          <p className="text-gray-400 font-medium text-sm mt-1">
            Danh sách đơn COD shipper đã giao, chờ admin xác nhận đã nhận tiền.
          </p>
        </div>
        <button
          onClick={fetchPending}
          disabled={loading}
          className="px-5 py-3 bg-white border border-gray-100 rounded-2xl text-xs font-black uppercase flex items-center gap-2 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          Tải lại
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-6 rounded-3xl flex items-center gap-4 text-red-600 font-bold">
          <AlertCircle className="size-6 shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="size-10 text-primary animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <Banknote className="size-12 text-gray-200" />
            <p className="text-sm font-black text-gray-400 uppercase">Không có đơn COD cần đối soát</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Mã đơn</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Buyer</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Shipper</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Số tiền COD</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Refund</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Trạng thái</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((order) => {
                  const codAmount = getCodCollectAmount(order);
                  const prepaidAmount = getCodPrepaidAmount(order);
                  const hasRefund = (order.refundAmount ?? 0) > 0;
                  const isCashPending = order.codPaymentStatus === 'PENDING_ADMIN_CONFIRM';
                  const isRefundPending = order.codPaymentStatus === 'REFUND_PENDING';
                  return (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-5">
                        <p className="text-sm font-black text-gray-900">#{order.id}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">COD</p>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm font-bold text-gray-800">{buyerLabel(order)}</p>
                        {order.recipientPhone && (
                          <p className="text-[10px] text-gray-400 font-medium">{order.recipientPhone}</p>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm font-bold text-gray-800">{shipperLabel(order)}</p>
                        {order.shipper?.phoneNumber && (
                          <p className="text-[10px] text-gray-400 font-medium">{order.shipper.phoneNumber}</p>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <p className="text-sm font-black text-primary">{fmtCur(codAmount)}</p>
                        <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                          Tổng đơn: {fmtCur(order.totalAmount ?? 0)}
                        </p>
                        {(isCashPending || isRefundPending || order.codPrepaidAmount != null) && (
                          <p className="text-[10px] text-amber-600 font-black mt-0.5">
                            Tiền hàng ứng: {fmtCur(prepaidAmount)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        {hasRefund ? (
                          <div>
                            <p className="text-sm font-black text-orange-600">{fmtCur(order.refundAmount!)}</p>
                            {order.refundReason && (
                              <p className="text-[10px] text-gray-400 font-medium max-w-[140px] ml-auto truncate" title={order.refundReason}>
                                {order.refundReason}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300 font-bold">—</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-50 text-emerald-700">
                          {getOrderStatusLabel(order.status)}
                        </span>
                        {order.codSettled === false && (
                          <p className="text-[9px] text-gray-400 font-bold mt-1 uppercase">Chưa đối soát</p>
                        )}
                        {order.codPaymentStatus && (
                          <p className="text-[9px] text-amber-600 font-bold mt-1 uppercase">{order.codPaymentStatus}</p>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        {isCashPending ? (
                          <button
                            onClick={() => handleConfirmCash(order)}
                            disabled={settlingId === order.id}
                            className="px-4 py-2.5 bg-amber-50 text-amber-700 text-[10px] font-black rounded-xl uppercase hover:bg-amber-100 transition-colors flex items-center gap-1.5 ml-auto disabled:opacity-50"
                          >
                            {settlingId === order.id ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                            Xác nhận tiền mặt
                          </button>
                        ) : isRefundPending ? (
                          <button
                            onClick={() => handleRefundShipper(order)}
                            disabled={settlingId === order.id}
                            className="px-4 py-2.5 bg-orange-50 text-orange-700 text-[10px] font-black rounded-xl uppercase hover:bg-orange-100 transition-colors flex items-center gap-1.5 ml-auto disabled:opacity-50"
                          >
                            {settlingId === order.id ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                            Hoàn shipper
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSettle(order)}
                            disabled={settlingId === order.id}
                            className="px-4 py-2.5 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-xl uppercase hover:bg-emerald-100 transition-colors flex items-center gap-1.5 ml-auto disabled:opacity-50"
                          >
                            {settlingId === order.id ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                            Xác nhận đã nhận tiền
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodSettlement;
