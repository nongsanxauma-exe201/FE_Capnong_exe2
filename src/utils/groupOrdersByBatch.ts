import type { OrderResponse } from '../services/order.service';

export const UNPAID_BATCH_STATUSES = new Set(['AWAITING_PAYMENT', 'PENDING']);

export type OrderDisplayItem =
  | { kind: 'single'; order: OrderResponse }
  | { kind: 'batch'; batchId: number; orders: OrderResponse[] };

function isBatchUnpaid(order: OrderResponse): boolean {
  return order.checkoutBatchId != null && UNPAID_BATCH_STATUSES.has(order.status);
}

function shouldGroupAsBatch(order: OrderResponse, bucket: OrderResponse[]): boolean {
  if (!isBatchUnpaid(order)) return false;
  if (bucket.length > 1) return true;
  const shopCount = order.batchShopCount ?? bucket.length;
  const unpaidCount = order.batchUnpaidCount ?? bucket.length;
  return shopCount > 1 || unpaidCount > 1;
}

export function groupOrdersForDisplay(orders: OrderResponse[]): OrderDisplayItem[] {
  const batchBuckets = new Map<number, OrderResponse[]>();
  for (const order of orders) {
    if (!isBatchUnpaid(order)) continue;
    const batchId = order.checkoutBatchId!;
    if (!batchBuckets.has(batchId)) batchBuckets.set(batchId, []);
    batchBuckets.get(batchId)!.push(order);
  }

  const emittedBatches = new Set<number>();
  const result: OrderDisplayItem[] = [];

  for (const order of orders) {
    const batchId = order.checkoutBatchId;
    if (batchId != null && isBatchUnpaid(order)) {
      const bucket = batchBuckets.get(batchId) ?? [order];
      if (shouldGroupAsBatch(order, bucket)) {
        if (!emittedBatches.has(batchId)) {
          emittedBatches.add(batchId);
          result.push({ kind: 'batch', batchId, orders: bucket });
        }
        continue;
      }
    }
    result.push({ kind: 'single', order });
  }

  return result;
}

export function getBatchShopCount(orders: OrderResponse[]): number {
  const fromApi = orders[0]?.batchShopCount;
  if (fromApi != null && fromApi > 0) return fromApi;
  return orders.length;
}

export function getBatchPendingTotal(orders: OrderResponse[]): number {
  const fromApi = orders[0]?.batchPendingTotalAmount;
  if (fromApi != null && Number(fromApi) > 0) return Number(fromApi);
  return orders.reduce((sum, o) => sum + Number(o.totalAmount ?? 0), 0);
}

export function batchHasPlatformVoucher(orders: OrderResponse[]): boolean {
  return orders.some((o) => o.hasPlatformBatchVoucher === true);
}
