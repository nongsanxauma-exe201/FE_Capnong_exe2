import React, { useCallback, useEffect, useState } from 'react';
import {
  Banknote,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Eye,
  X,
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

const COD_PAYMENT_STATUS_LABELS: Record<string, string> = {
  NOT_REQUIRED: 'Không cần ứng tiền',
  PENDING_ADMIN_CONFIRM: 'Chờ admin xác nhận tiền mặt',
  PAID: 'Đã ứng tiền',
  REFUND_PENDING: 'Chờ hoàn tiền shipper',
  REFUNDED: 'Đã hoàn tiền shipper',
};

const COD_PAYMENT_OPTION_LABELS: Record<string, string> = {
  CASH: 'Trả tiền mặt',
  WALLET: 'Trừ ví shipper',
};

function getOrderStatusLabel(status?: string | null): string {
  if (!status) return ORDER_STATUS_LABELS.DELIVERED;
  return ORDER_STATUS_LABELS[status] ?? status.replace(/_/g, ' ').toLowerCase();
}

function getCodPaymentStatusLabel(status?: string | null): string {
  if (!status) return 'Chưa có trạng thái ứng tiền';
  return COD_PAYMENT_STATUS_LABELS[status] ?? status.replace(/_/g, ' ').toLowerCase();
}

function getCodPaymentOptionLabel(option?: string | null): string {
  if (!option) return 'Chưa chọn';
  return COD_PAYMENT_OPTION_LABELS[option] ?? option;
}

const CodSettlement: React.FC = () => {
  const [orders, setOrders] = useState<CodPendingOrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settlingId, setSettlingId] = useState<number | null>(null);
  const [detailOrder, setDetailOrder] = useState<CodPendingOrderResponse | null>(null);

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
      `Hoàn ${fmtCur(amount)} tiền COD đã ứng cho shipper đơn #${order.id}? Phí ship không hoàn.`,
      'Hoàn tiền shipper COD'
    )) return;

    try {
      setSettlingId(order.id);
      await codSettlementService.refundCodPrepaymentToShipper(order.id);
      globalShowAlert('Đã hoàn tiền COD đã ứng cho shipper', 'Thành công', 'success');
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

  const getItemQuantity = (item: CodPendingOrderResponse['items'][number]) =>
    Number(item.quantityKg ?? item.quantity ?? 0);

  const getItemUnitPrice = (item: CodPendingOrderResponse['items'][number]) =>
    Number(item.pricePerKg ?? item.unitPrice ?? 0);

  const getItemTotal = (item: CodPendingOrderResponse['items'][number]) =>
    getItemQuantity(item) * getItemUnitPrice(item);

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
                            Tiền COD đã ứng: {fmtCur(prepaidAmount)}
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
                          <p className="text-[9px] text-amber-600 font-bold mt-1 uppercase">
                            {getCodPaymentStatusLabel(order.codPaymentStatus)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={() => setDetailOrder(order)}
                          className="px-4 py-2.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded-xl uppercase hover:bg-blue-100 transition-colors flex items-center gap-1.5"
                        >
                          <Eye className="size-3.5" />
                          Chi tiết
                        </button>
                        {isCashPending ? (
                          <button
                            onClick={() => handleConfirmCash(order)}
                            disabled={settlingId === order.id}
                            className="px-4 py-2.5 bg-amber-50 text-amber-700 text-[10px] font-black rounded-xl uppercase hover:bg-amber-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {settlingId === order.id ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                            Xác nhận tiền mặt
                          </button>
                        ) : isRefundPending ? (
                          <button
                            onClick={() => handleRefundShipper(order)}
                            disabled={settlingId === order.id}
                            className="px-4 py-2.5 bg-orange-50 text-orange-700 text-[10px] font-black rounded-xl uppercase hover:bg-orange-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {settlingId === order.id ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                            Hoàn shipper
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSettle(order)}
                            disabled={settlingId === order.id}
                            className="px-4 py-2.5 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-xl uppercase hover:bg-emerald-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {settlingId === order.id ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                            Xác nhận đã nhận tiền
                          </button>
                        )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {detailOrder && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setDetailOrder(null)} />
          <div className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[36px] bg-white shadow-2xl flex flex-col">
            <div className="p-7 border-b border-gray-100 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Chi tiết COD</p>
                <h3 className="text-2xl font-black text-gray-900 mt-1">Đơn #{detailOrder.id}</h3>
                <p className="text-sm text-gray-500 font-semibold mt-1">
                  {buyerLabel(detailOrder)} · {detailOrder.recipientPhone || 'Chưa có SĐT'}
                </p>
              </div>
              <button
                onClick={() => setDetailOrder(null)}
                className="size-11 rounded-2xl bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700 flex items-center justify-center transition-all"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-7 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-3xl bg-gray-50 border border-gray-100 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Shipper</p>
                  <p className="text-sm font-black text-gray-900 mt-2">{shipperLabel(detailOrder)}</p>
                  <p className="text-xs font-semibold text-gray-500 mt-1">{detailOrder.shipper?.phoneNumber || 'Chưa có SĐT'}</p>
                </div>
                <div className="rounded-3xl bg-amber-50 border border-amber-100 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Hình thức ứng tiền</p>
                  <p className="text-sm font-black text-amber-900 mt-2">{getCodPaymentOptionLabel(detailOrder.codPaymentOption)}</p>
                  <p className="text-xs font-semibold text-amber-700 mt-1">{getCodPaymentStatusLabel(detailOrder.codPaymentStatus)}</p>
                </div>
                <div className="rounded-3xl bg-emerald-50 border border-emerald-100 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Trạng thái đơn</p>
                  <p className="text-sm font-black text-emerald-900 mt-2">{getOrderStatusLabel(detailOrder.status)}</p>
                  <p className="text-xs font-semibold text-emerald-700 mt-1">
                    {detailOrder.codSettled ? 'Đã đối soát COD' : 'Chưa đối soát COD'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-3xl border border-gray-100 p-5">
                  <h4 className="text-sm font-black text-gray-900 uppercase">Chi tiết tiền</h4>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="font-semibold text-gray-500">Tổng đơn buyer trả</span>
                      <span className="font-black text-gray-900">{fmtCur(detailOrder.totalAmount ?? 0)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="font-semibold text-gray-500">Phí ship</span>
                      <span className="font-black text-gray-900">{fmtCur(detailOrder.shippingFee ?? 0)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="font-semibold text-gray-500">Refund/hàng lỗi</span>
                      <span className="font-black text-orange-600">-{fmtCur(detailOrder.refundAmount ?? 0)}</span>
                    </div>
                    <div className="h-px bg-gray-100" />
                    <div className="flex justify-between gap-4">
                      <span className="font-black text-amber-700">Tiền COD shipper cần ứng/xác nhận</span>
                      <span className="font-black text-amber-700">{fmtCur(getCodPrepaidAmount(detailOrder))}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="font-black text-primary">Số tiền COD hiển thị</span>
                      <span className="font-black text-primary">{fmtCur(getCodCollectAmount(detailOrder))}</span>
                    </div>
                    {detailOrder.refundReason && (
                      <div className="rounded-2xl bg-orange-50 p-3 text-xs font-semibold text-orange-700">
                        Lý do refund: {detailOrder.refundReason}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-100 p-5">
                  <h4 className="text-sm font-black text-gray-900 uppercase">Địa chỉ giao</h4>
                  <p className="text-sm font-bold text-gray-800 mt-4">{detailOrder.recipientName}</p>
                  <p className="text-xs font-semibold text-gray-500 mt-1">{detailOrder.recipientPhone}</p>
                  <p className="text-sm text-gray-600 mt-3 leading-relaxed">{detailOrder.shippingAddress}</p>
                  {detailOrder.note && (
                    <div className="mt-4 rounded-2xl bg-gray-50 p-3 text-xs font-semibold text-gray-500">
                      Ghi chú: {detailOrder.note}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <h4 className="text-sm font-black text-gray-900 uppercase">Sản phẩm trong đơn</h4>
                  <span className="text-xs font-bold text-gray-400">{detailOrder.items?.length ?? 0} dòng</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {(detailOrder.items ?? []).length === 0 ? (
                    <p className="p-5 text-sm font-semibold text-gray-400">Chưa có dữ liệu sản phẩm.</p>
                  ) : (
                    detailOrder.items.map((item, index) => {
                      const quantity = getItemQuantity(item);
                      const unitPrice = getItemUnitPrice(item);
                      return (
                        <div key={`${item.orderDetailId ?? item.orderMysteryBoxId ?? index}`} className="p-5 flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-black text-gray-900">{item.productName || item.mysteryBoxType || 'Sản phẩm'}</p>
                            <p className="text-xs font-semibold text-gray-500 mt-1">
                              {quantity.toLocaleString('vi-VN')} kg × {fmtCur(unitPrice)}
                            </p>
                          </div>
                          <p className="text-sm font-black text-primary shrink-0">{fmtCur(getItemTotal(item))}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodSettlement;
