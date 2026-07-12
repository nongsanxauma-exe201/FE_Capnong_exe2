import type { OrderResponse } from '../services/order.service';

export const UNPAID_BATCH_STATUSES = new Set(['AWAITING_PAYMENT', 'PENDING']);
export const BUYER_CANCELLABLE_STATUSES = new Set(['PENDING', 'PAID']);

/** Dùng gom đủ shop trong batch (kể cả đơn đã xác nhận để biết khi nào tách card). */
export const BATCH_HYDRATION_STATUSES = [
  'AWAITING_PAYMENT', 'PENDING', 'PAID', 'CONFIRMED', 'READY_FOR_PICKUP', 'CANCELLED',
] as const;

export type OrderDisplayItem =
  | { kind: 'single'; order: OrderResponse }
  | { kind: 'batch'; batchId: number; orders: OrderResponse[]; variant: 'pending' | 'cancelled' | 'paid_cancellable' | 'voucher_cancellable' };

function isBatchUnpaid(order: OrderResponse): boolean {
  return order.checkoutBatchId != null && UNPAID_BATCH_STATUSES.has(order.status);
}

/** PayOS chờ thanh toán — không áp dụng COD. */
export function isBatchPayosPending(order: OrderResponse): boolean {
  if (!isBatchUnpaid(order)) return false;
  if (order.status === 'AWAITING_PAYMENT') return true;
  if (order.paymentMethod?.toUpperCase() === 'PAYOS') return true;
  const batchSt = order.checkoutBatchStatus;
  return batchSt === 'PENDING' || batchSt === 'PARTIALLY_PAID';
}

function isCodOrder(order: OrderResponse): boolean {
  return order.paymentMethod?.toUpperCase() === 'COD';
}

/** COD + voucher sàn + cả batch còn hủy được → gom card, không có nút thanh toán. */
export function batchAllOrdersStillCodVoucherCancellable(batchId: number, pool: OrderResponse[]): boolean {
  const batchOrders = getBatchOrdersFromPool(batchId, pool);
  if (batchOrders.length < 2) return false;
  const shopCount = Math.max(
    ...batchOrders.map((o) => o.batchShopCount ?? 0),
    batchOrders.length,
  );
  if (batchOrders.length < shopCount) return false;
  return batchOrders.every(
    (o) => isCodOrder(o)
      && BUYER_CANCELLABLE_STATUSES.has(o.status)
      && o.hasPlatformBatchVoucher === true,
  );
}

function shouldGroupPayosPendingBatch(order: OrderResponse, bucket: OrderResponse[]): boolean {
  // Chỉ gom PayOS pending khi có voucher sàn
  if (!order.hasPlatformBatchVoucher) return false;
  if (!isBatchPayosPending(order)) return false;
  if (bucket.length > 1) return true;
  const unpaidCount = order.batchUnpaidCount ?? bucket.length;
  return unpaidCount > 1;
}

function shouldGroupCodVoucherBatch(order: OrderResponse, pool: OrderResponse[]): boolean {
  if (!isBatchUnpaid(order) || !isCodOrder(order)) return false;
  if (!order.hasPlatformBatchVoucher) return false;
  const batchId = order.checkoutBatchId!;
  if (!batchAllOrdersStillCodVoucherCancellable(batchId, pool)) return false;
  const bucket = getBatchOrdersFromPool(batchId, pool).filter(
    (o) => isCodOrder(o) && BUYER_CANCELLABLE_STATUSES.has(o.status),
  );
  return bucket.length >= 2;
}

function isBatchCancelled(order: OrderResponse): boolean {
  return order.checkoutBatchId != null && order.status === 'CANCELLED';
}

function shouldGroupCancelledBatch(order: OrderResponse, bucket: OrderResponse[]): boolean {
  if (!isBatchCancelled(order)) return false;
  // Chỉ gom card khi hủy cả checkout có voucher sàn (batch CANCELLED)
  if (order.checkoutBatchStatus !== 'CANCELLED') return false;
  const hasVoucher = order.hasPlatformBatchVoucher === true
    || bucket.some((o) => o.hasPlatformBatchVoucher === true);
  if (!hasVoucher) return false;
  const shopCount = order.batchShopCount ?? bucket.length;
  return shopCount > 1 || bucket.length > 1;
}

function getBatchOrdersFromPool(batchId: number, pool: OrderResponse[]): OrderResponse[] {
  return pool.filter((o) => o.checkoutBatchId === batchId && o.status !== 'CANCELLED');
}

export function isBatchPayosOrder(order: OrderResponse): boolean {
  if (order.checkoutBatchId == null) return false;
  if (isCodOrder(order)) return false;
  const batchSt = order.checkoutBatchStatus;
  if (batchSt === 'PAID' || batchSt === 'PARTIALLY_PAID' || batchSt === 'PENDING') return true;
  return order.paymentMethod?.toUpperCase() === 'PAYOS';
}

export function isBatchPaidCancellableOrder(order: OrderResponse): boolean {
  // Gom hủy cả batch PayOS đã TT chỉ khi có voucher sàn
  if (!order.hasPlatformBatchVoucher) return false;
  if (!isBatchPayosOrder(order)) return false;
  const batchSt = order.checkoutBatchStatus;
  if (batchSt !== 'PAID' && batchSt !== 'PARTIALLY_PAID') return false;
  return BUYER_CANCELLABLE_STATUSES.has(order.status);
}

/** Cả batch còn hủy được (shop chưa xác nhận hết) → mới gom card batch đã thanh toán. */
export function batchAllOrdersStillCancellable(batchId: number, pool: OrderResponse[]): boolean {
  const batchOrders = getBatchOrdersFromPool(batchId, pool);
  if (batchOrders.length < 2) return false;
  const shopCount = Math.max(
    ...batchOrders.map((o) => o.batchShopCount ?? 0),
    batchOrders.length,
  );
  if (batchOrders.length < shopCount) return false;
  return batchOrders.every((o) => isBatchPaidCancellableOrder(o));
}

function shouldGroupPaidCancellableBatch(order: OrderResponse, pool: OrderResponse[]): boolean {
  if (!isBatchPaidCancellableOrder(order)) return false;
  const batchId = order.checkoutBatchId!;
  if (!batchAllOrdersStillCancellable(batchId, pool)) return false;
  const bucket = getBatchOrdersFromPool(batchId, pool).filter((o) => isBatchPaidCancellableOrder(o));
  return bucket.length >= 2;
}

export function shouldHideIndividualCancel(order: OrderResponse, pool: OrderResponse[]): boolean {
  // Không voucher sàn → luôn cho hủy lẻ
  if (!order.hasPlatformBatchVoucher) return false;
  if (!requiresBatchWideCancel(order)) return false;

  const batchId = order.checkoutBatchId!;

  // Còn hủy cả batch → ẩn nút hủy lẻ (dùng card batch)
  if (isBatchPaidCancellableOrder(order) && batchAllOrdersStillCancellable(batchId, pool)) return true;
  if (isCodOrder(order) && isBatchUnpaid(order)
      && batchAllOrdersStillCodVoucherCancellable(batchId, pool)) return true;

  // Batch voucher đã tách / có shop xác nhận → không cho hủy lẻ nữa
  return batchCheckoutCancelWindowClosed(batchId, pool, order);
}

/** Batch voucher không còn trong cửa sổ hủy cả batch (đã tách đơn). */
function batchCheckoutCancelWindowClosed(batchId: number, pool: OrderResponse[], order: OrderResponse): boolean {
  const batchOrders = getBatchOrdersFromPool(batchId, pool);
  const shopCount = Math.max(order.batchShopCount ?? 0, batchOrders.length);
  if (shopCount <= 1) return false;

  if (batchOrders.some((o) => !BUYER_CANCELLABLE_STATUSES.has(o.status))) return true;

  if (batchOrders.length >= shopCount) {
    if (isCodOrder(order) && !batchAllOrdersStillCodVoucherCancellable(batchId, pool)) return true;
    if (isBatchPayosOrder(order)
        && (order.checkoutBatchStatus === 'PAID' || order.checkoutBatchStatus === 'PARTIALLY_PAID')
        && !batchAllOrdersStillCancellable(batchId, pool)) return true;
  }

  return false;
}

function upsertBatchOrder(
  buckets: Map<number, OrderResponse[]>,
  order: OrderResponse,
  matcher: (order: OrderResponse) => boolean,
) {
  if (!matcher(order)) return;
  const batchId = order.checkoutBatchId!;
  if (!buckets.has(batchId)) buckets.set(batchId, []);
  const bucket = buckets.get(batchId)!;
  if (!bucket.some((o) => o.id === order.id)) bucket.push(order);
}

/** batchPool: toàn bộ đơn chưa thanh toán (dùng gom đủ shop trong batch khi trang đang phân trang). */
export function groupOrdersForDisplay(
  orders: OrderResponse[],
  batchPool?: OrderResponse[],
): OrderDisplayItem[] {
  const pendingBuckets = new Map<number, OrderResponse[]>();
  const cancelledBuckets = new Map<number, OrderResponse[]>();
  const paidCancellableBuckets = new Map<number, OrderResponse[]>();
  const pool = batchPool?.length ? batchPool : orders;

  for (const order of pool) upsertBatchOrder(pendingBuckets, order, isBatchUnpaid);
  for (const order of pool) upsertBatchOrder(cancelledBuckets, order, isBatchCancelled);
  for (const order of pool) {
    if (!isBatchPaidCancellableOrder(order)) continue;
    const batchId = order.checkoutBatchId!;
    if (!batchAllOrdersStillCancellable(batchId, pool)) continue;
    upsertBatchOrder(paidCancellableBuckets, order, isBatchPaidCancellableOrder);
  }

  for (const bucket of pendingBuckets.values()) {
    bucket.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  for (const bucket of cancelledBuckets.values()) {
    bucket.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  for (const bucket of paidCancellableBuckets.values()) {
    bucket.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const emittedPending = new Set<number>();
  const emittedCancelled = new Set<number>();
  const emittedPaidCancellable = new Set<number>();
  const emittedVoucherCancellable = new Set<number>();
  const result: OrderDisplayItem[] = [];

  for (const order of orders) {
    const batchId = order.checkoutBatchId;

    if (batchId != null && isBatchPaidCancellableOrder(order)) {
      const bucket = paidCancellableBuckets.get(batchId) ?? [order];
      if (shouldGroupPaidCancellableBatch(order, pool)) {
        if (!emittedPaidCancellable.has(batchId)) {
          emittedPaidCancellable.add(batchId);
          result.push({ kind: 'batch', batchId, orders: bucket, variant: 'paid_cancellable' });
        }
        continue;
      }
    }

    if (batchId != null && isBatchUnpaid(order) && isCodOrder(order)) {
      if (shouldGroupCodVoucherBatch(order, pool)) {
        const bucket = getBatchOrdersFromPool(batchId, pool).filter(
          (o) => isCodOrder(o) && BUYER_CANCELLABLE_STATUSES.has(o.status),
        );
        if (!emittedVoucherCancellable.has(batchId)) {
          emittedVoucherCancellable.add(batchId);
          result.push({ kind: 'batch', batchId, orders: bucket, variant: 'voucher_cancellable' });
        }
        continue;
      }
    }

    if (batchId != null && isBatchUnpaid(order)) {
      const bucket = (pendingBuckets.get(batchId) ?? [order]).filter(isBatchPayosPending);
      if (shouldGroupPayosPendingBatch(order, bucket)) {
        if (!emittedPending.has(batchId)) {
          emittedPending.add(batchId);
          result.push({ kind: 'batch', batchId, orders: bucket, variant: 'pending' });
        }
        continue;
      }
    }

    if (batchId != null && isBatchCancelled(order)) {
      const bucket = cancelledBuckets.get(batchId) ?? [order];
      if (shouldGroupCancelledBatch(order, bucket)) {
        if (!emittedCancelled.has(batchId)) {
          emittedCancelled.add(batchId);
          result.push({ kind: 'batch', batchId, orders: bucket, variant: 'cancelled' });
        }
        continue;
      }
    }

    result.push({ kind: 'single', order });
  }

  return result;
}

export function getBatchUnpaidCount(orders: OrderResponse[]): number {
  const fromApi = orders[0]?.batchUnpaidCount;
  if (fromApi != null && fromApi > 0) return fromApi;
  return orders.length;
}

/** Số shop hiển thị — khớp số dòng trong danh sách. */
export function getBatchShopCount(orders: OrderResponse[]): number {
  if (orders.length > 0) return orders.length;
  return getBatchUnpaidCount(orders);
}

export function resolvePendingBatchShopCount(
  order: OrderResponse | null | undefined,
  fallbackOrderIds?: number[],
): number {
  const fromApi = order?.batchUnpaidCount;
  if (fromApi != null && fromApi > 0) return fromApi;
  if (fallbackOrderIds?.length) return fallbackOrderIds.length;
  return 1;
}

/** Tổng PayOS / checkout batch — khớp số tiền thanh toán thực tế. */
export function getBatchCheckoutTotal(orders: OrderResponse[]): number {
  const fromApi = orders[0]?.batchCheckoutTotalAmount;
  if (fromApi != null && Number(fromApi) > 0) return Number(fromApi);
  return orders.reduce((sum, o) => sum + Number(o.totalAmount ?? 0), 0);
}

/** Phần tiền từng đơn trong batch — luôn cộng lại bằng tổng PayOS. */
export function getBatchOrderPayableMap(orders: OrderResponse[]): Map<number, number> {
  const checkoutTotal = getBatchCheckoutTotal(orders);
  const map = new Map<number, number>();
  if (!orders.length) return map;

  const grossSum = orders.reduce((sum, o) => sum + Number(o.totalAmount ?? 0), 0);
  const batchDiscSum = orders.reduce((sum, o) => sum + Number(o.batchDiscountAmount ?? 0), 0);
  const apiBatchDisc = Number(orders[0]?.batchPlatformDiscountAmount ?? 0);

  if (grossSum <= 0) {
    orders.forEach((o) => map.set(o.id!, 0));
    return map;
  }

  // Ưu tiên: totalAmount đã trừ batchDiscountAmount trên từng đơn
  if (batchDiscSum > 0) {
    let allocated = 0;
    orders.forEach((o, i) => {
      const disc = Number(o.batchDiscountAmount ?? 0);
      const payable = Math.max(0, Number(o.totalAmount ?? 0) - disc);
      if (i === orders.length - 1) {
        map.set(o.id!, Math.max(0, checkoutTotal - allocated));
      } else {
        map.set(o.id!, payable);
        allocated += payable;
      }
    });
    return map;
  }

  // Khớp sẵn — không cần phân bổ
  if (Math.abs(grossSum - checkoutTotal) <= 1) {
    orders.forEach((o) => map.set(o.id!, Number(o.totalAmount ?? 0)));
    return map;
  }

  // Dữ liệu cũ / sau hủy: phân bổ tổng PayOS theo tỷ lệ tiền hàng từng đơn
  let allocated = 0;
  orders.forEach((o, i) => {
    const weight = Number(o.totalAmount ?? 0);
    if (i === orders.length - 1) {
      map.set(o.id!, Math.max(0, checkoutTotal - allocated));
      return;
    }
    const share = Math.floor((checkoutTotal * weight) / grossSum);
    map.set(o.id!, share);
    allocated += share;
  });
  return map;
}

export function getBatchOrderPayableAmount(order: OrderResponse, orders: OrderResponse[]): number {
  const map = getBatchOrderPayableMap(orders);
  return map.get(order.id!) ?? Number(order.totalAmount ?? 0);
}

export function getBatchGrossSubtotal(orders: OrderResponse[]): number {
  return orders.reduce((sum, o) => sum + Number(o.totalAmount ?? 0), 0);
}

export function getBatchPlatformDiscount(orders: OrderResponse[]): number {
  const fromApi = Number(orders[0]?.batchPlatformDiscountAmount ?? 0);
  if (fromApi > 0) return fromApi;
  const fromOrders = orders.reduce((sum, o) => sum + Number(o.batchDiscountAmount ?? 0), 0);
  if (fromOrders > 0) return fromOrders;
  const gross = getBatchGrossSubtotal(orders);
  const checkout = getBatchCheckoutTotal(orders);
  return Math.max(0, gross - checkout);
}

export function getBatchPendingTotal(orders: OrderResponse[]): number {
  const fromApi = orders[0]?.batchPendingTotalAmount;
  if (fromApi != null && Number(fromApi) > 0) return Number(fromApi);
  return getBatchCheckoutTotal(orders);
}

export function batchHasPlatformVoucher(orders: OrderResponse[]): boolean {
  return orders.some((o) => o.hasPlatformBatchVoucher === true);
}

/** Chỉ gom hủy cả batch khi có voucher sàn. */
export function requiresBatchWideCancel(order: OrderResponse): boolean {
  return Boolean(order.hasPlatformBatchVoucher) && (order.batchShopCount ?? 1) > 1;
}

export function getBatchCancelConfirmMessage(order: OrderResponse, orders?: OrderResponse[]): string {
  const shopCount = orders?.length ?? order.batchShopCount ?? 1;
  return `Checkout này dùng voucher sàn cho ${shopCount} shop. Hủy sẽ áp dụng cho TẤT CẢ đơn trong cùng lần thanh toán (hoàn tiền từng đơn đã thanh toán nếu có). Bạn có chắc muốn tiếp tục?`;
}

/** Chỉ lấy checkout/đơn chưa TT gần nhất.
 * Có voucher sàn → kèm các shop cùng batch; không voucher → chỉ 1 đơn. */
export function pickLatestPendingCheckout(orders: OrderResponse[]): OrderResponse[] {
  const unpaid = orders.filter(isBatchPayosPending);
  if (!unpaid.length) return [];

  const sorted = [...unpaid].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const latest = sorted[0];
  if (latest.checkoutBatchId != null && latest.hasPlatformBatchVoucher) {
    return unpaid.filter((o) => o.checkoutBatchId === latest.checkoutBatchId);
  }
  return [latest];
}

/** Một nhóm hiển thị duy nhất cho giỏ hàng — đơn/batch chờ TT mới nhất. */
export function pickLatestPendingDisplayItems(orders: OrderResponse[]): OrderDisplayItem[] {
  const picked = pickLatestPendingCheckout(orders);
  if (!picked.length) return [];
  return groupOrdersForDisplay(picked, picked).slice(0, 1);
}
