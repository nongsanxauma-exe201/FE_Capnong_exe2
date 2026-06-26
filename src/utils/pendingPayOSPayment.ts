import { paymentService, type PaymentResponse } from '../services/payment.service';
import { cartService, type CartItemResponse, type CartResponse } from '../services/cart.service';
import { orderService } from '../services/order.service';
import { USER_INFO_KEY } from '../services/api.config';

export const PENDING_PAYOS_PAYMENT_KEY = 'pendingPayOSPayment';
export const PAYOS_RESTORED_CART_KEY = 'payOSRestoredCartSnapshot';
export const PAYOS_RELOAD_CART_ON_ARRIVAL_KEY = 'payOSReloadCartOnArrival';

export type PendingPayOSPayment = {
  orderCode?: string | null;
  orderId?: number | null;
  createdAt?: number;
};

export type PayOSCartSnapshot = {
  cart: CartResponse;
  orderCode?: string | null;
  orderId?: number | null;
  savedAt?: number;
  ownerKey?: string | null;
};

const PENDING_EXPIRES_MS = 2 * 60 * 60 * 1000;
const readStorages = [localStorage, sessionStorage];
const writeStorages = [localStorage, sessionStorage];

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function getCurrentCartOwnerKey(): string | null {
  try {
    const raw = localStorage.getItem(USER_INFO_KEY) || sessionStorage.getItem(USER_INFO_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as { id?: string | number; email?: string };
    if (user?.id != null) return `id:${user.id}`;
    if (user?.email) return `email:${user.email}`;
  } catch {}
  return null;
}

export function clearPendingPayOSPayment() {
  for (const storage of writeStorages) {
    try {
      storage.removeItem(PENDING_PAYOS_PAYMENT_KEY);
    } catch {}
  }
}

export function clearPayOSRecoveryState() {
  clearPendingPayOSPayment();
  clearRestoredPayOSCart();
}

export function getPendingPayOSPayment(): PendingPayOSPayment | null {
  for (const storage of readStorages) {
    try {
      const raw = storage.getItem(PENDING_PAYOS_PAYMENT_KEY);
      if (!raw) continue;

      const parsed = JSON.parse(raw) as PendingPayOSPayment;
      if (!parsed?.orderCode && !parsed?.orderId) continue;

      if (parsed.createdAt && Date.now() - parsed.createdAt > PENDING_EXPIRES_MS) {
        clearPendingPayOSPayment();
        return null;
      }

      return parsed;
    } catch {}
  }

  return null;
}

export function resolvePayOSOrderCode(payment: PaymentResponse): string | null {
  const extra = payment as PaymentResponse & { orderCode?: string | number };
  const directCode = payment.payosOrderCode ?? extra.orderCode;
  if (directCode != null && String(directCode).trim()) {
    return String(directCode);
  }

  try {
    if (!payment.checkoutUrl) return null;
    const url = new URL(payment.checkoutUrl);
    return url.searchParams.get('orderCode');
  } catch {
    return null;
  }
}

export function savePendingPayOSPayment(payment: PaymentResponse, orderId: number) {
  const orderCode = resolvePayOSOrderCode(payment);
  const payload = JSON.stringify({
    orderCode,
    orderId,
    createdAt: Date.now(),
  });

  for (const storage of writeStorages) {
    try {
      storage.setItem(PENDING_PAYOS_PAYMENT_KEY, payload);
    } catch {}
  }
}

function parseSnapshotPayload(raw: string): PayOSCartSnapshot | null {
  try {
    const parsed = JSON.parse(raw) as PayOSCartSnapshot | CartResponse;
    if (parsed && 'cart' in parsed && parsed.cart?.items?.length) {
      const currentOwnerKey = getCurrentCartOwnerKey();
      if (!parsed.ownerKey || parsed.ownerKey !== currentOwnerKey) {
        clearRestoredPayOSCart();
        return null;
      }
      return parsed;
    }
  } catch {}
  return null;
}

export function saveRestoredPayOSCart(
  cart: CartResponse | null | undefined,
  meta?: { orderCode?: string | null; orderId?: number | null },
) {
  if (!cart || !cart.items || cart.items.length === 0) return;

  const existing = getRestoredPayOSCart();
  const nextOrderCode = meta && 'orderCode' in meta ? meta.orderCode : existing?.orderCode ?? null;
  const nextOrderId = meta && 'orderId' in meta ? meta.orderId : existing?.orderId ?? null;
  const payload = JSON.stringify({
    cart,
    orderCode: nextOrderCode ?? null,
    orderId: nextOrderId ?? null,
    savedAt: Date.now(),
    ownerKey: getCurrentCartOwnerKey(),
  } satisfies PayOSCartSnapshot);

  for (const storage of writeStorages) {
    try {
      storage.setItem(PAYOS_RESTORED_CART_KEY, payload);
    } catch {}
  }
}

export function clearRestoredPayOSCart() {
  for (const storage of writeStorages) {
    try {
      storage.removeItem(PAYOS_RESTORED_CART_KEY);
    } catch {}
  }
}

export function getRestoredPayOSCart(): PayOSCartSnapshot | null {
  for (const storage of readStorages) {
    try {
      const raw = storage.getItem(PAYOS_RESTORED_CART_KEY);
      if (!raw) continue;
      const parsed = parseSnapshotPayload(raw);
      if (parsed) return parsed;
    } catch {}
  }
  return null;
}

export function getRestoredPayOSCartData(): CartResponse | null {
  return getRestoredPayOSCart()?.cart ?? null;
}

export function consumeRestoredPayOSCart(): CartResponse | null {
  return getRestoredPayOSCartData();
}

export function hasPayOSCartRecovery(): boolean {
  return !!getPendingPayOSPayment() || !!getRestoredPayOSCartData()?.items?.length;
}

export function hasPendingPayOSRollback(): boolean {
  const pending = getPendingPayOSPayment();
  const snapshot = getRestoredPayOSCart();
  return !!pending?.orderCode || !!pending?.orderId || !!snapshot?.orderCode;
}

async function tryCancelPayOSPending(pending: PendingPayOSPayment): Promise<void> {
  if (pending.orderCode) {
    await paymentService.cancelPaymentByOrderCode(String(pending.orderCode));
    return;
  }
  if (pending.orderId) {
    await orderService.updateOrder(pending.orderId, { status: 'CANCELLED' });
  }
}

async function tryCancelFromSnapshot(snapshot: PayOSCartSnapshot | null): Promise<void> {
  if (!snapshot?.orderCode) return;
  try {
    await paymentService.cancelPaymentByOrderCode(String(snapshot.orderCode));
  } catch (error) {
    console.warn('Failed to cancel PayOS from snapshot orderCode', error);
  }
}

export async function pollRestoredCartSnapshot(maxAttempts = 40): Promise<CartResponse | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const snapshot = getRestoredPayOSCartData();
    if (snapshot?.items?.length) {
      return snapshot;
    }

    try {
      const cartRes = await cartService.getCart();
      if (cartRes.result?.items?.length) {
        saveRestoredPayOSCart(cartRes.result);
        return cartRes.result;
      }
    } catch (error) {
      console.warn('Failed to poll restored cart', error);
    }

    await sleep(300);
  }

  return getRestoredPayOSCartData();
}

let rollbackInFlight: Promise<boolean> | null = null;

export function ensurePendingPayOSRolledBack(): Promise<boolean> {
  if (rollbackInFlight) return rollbackInFlight;

  const pending = getPendingPayOSPayment();
  const snapshot = getRestoredPayOSCart();

  if (!pending?.orderCode && !pending?.orderId && !snapshot?.orderCode) {
    return Promise.resolve(false);
  }

  rollbackInFlight = (async () => {
    try {
      if (pending?.orderCode || pending?.orderId) {
        await tryCancelPayOSPending(pending);
      } else {
        await tryCancelFromSnapshot(snapshot);
      }

      await pollRestoredCartSnapshot();
      clearPendingPayOSPayment();
      window.dispatchEvent(new Event('cart-updated'));
      return true;
    } catch (error) {
      console.warn('Failed to rollback pending PayOS payment', error);

      // Vẫn thử poll — BE có thể đã restore từ callback trước đó.
      await pollRestoredCartSnapshot(10);
      return !!getRestoredPayOSCartData()?.items?.length;
    } finally {
      rollbackInFlight = null;
    }
  })();

  return rollbackInFlight;
}

export async function redirectToCartAfterPayOSCancel(): Promise<void> {
  await ensurePendingPayOSRolledBack();
  await pollRestoredCartSnapshot();
  window.location.replace(`/cart?payosReload=${Date.now()}`);
}

export function hardReloadCartPage(): void {
  try {
    sessionStorage.setItem(PAYOS_RELOAD_CART_ON_ARRIVAL_KEY, '1');
  } catch {}
  window.location.href = `/cart?payosReload=${Date.now()}`;
}

export function buildGroupedCartItems(items: CartItemResponse[]) {
  return items.reduce<Record<string, CartItemResponse[]>>((acc, item) => {
    const key = item.shopName || 'Nông Trại Khác';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}
