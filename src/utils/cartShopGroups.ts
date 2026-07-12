import type { CartItemResponse } from '../services/cart.service';
import type { OrderItemRequest, ShopOrderRequest, CheckoutBatchRequest } from '../services/order.service';
import type { VoucherUserResponse } from '../services/voucher.service';

export type ShopCartGroup = {
  shopOwnerId: number;
  shopName: string;
  items: CartItemResponse[];
};

const getQuantityKg = (item: CartItemResponse) => Number(item.quantityKg ?? item.quantity ?? 0);

export function groupCartItemsByShop(items: CartItemResponse[]): ShopCartGroup[] {
  const map = new Map<number, ShopCartGroup>();

  for (const item of items) {
    const shopOwnerId = item.shopOwnerId ?? 0;
    const shopName = item.shopName || 'Nông Trại Khác';
    if (!map.has(shopOwnerId)) {
      map.set(shopOwnerId, { shopOwnerId, shopName, items: [] });
    }
    map.get(shopOwnerId)!.items.push(item);
  }

  return Array.from(map.values()).filter((g) => g.shopOwnerId > 0);
}

export function cartItemToOrderItem(item: CartItemResponse): OrderItemRequest {
  const type = (item.itemType || '').toUpperCase();
  const qty = item.quantity ?? 1;
  const quantityKg = getQuantityKg(item);

  if (type === 'MYSTERY_BOX' || (item.mysteryBoxId != null && !item.buildComboId && !item.productId)) {
    if (!item.mysteryBoxId) {
      throw new Error(`Túi mù "${item.productName ?? ''}" thiếu mã. Vui lòng xóa khỏi giỏ và thêm lại.`);
    }
    return { mysteryBoxId: item.mysteryBoxId, quantity: qty, quantityKg };
  }
  if (type === 'BUILD_COMBO' || type === 'COMBO' || item.buildComboId != null) {
    const comboId = item.buildComboId ?? (item as { comboId?: number }).comboId;
    if (!comboId) {
      throw new Error(`Combo "${item.productName ?? ''}" thiếu mã. Vui lòng xóa khỏi giỏ và thêm lại.`);
    }
    return { buildComboId: comboId, quantity: qty, quantityKg };
  }
  if (!item.productId) {
    throw new Error(
      `Sản phẩm "${item.productName ?? 'không xác định'}" không hợp lệ. Vui lòng làm mới giỏ hàng.`,
    );
  }
  return { productId: item.productId, quantity: qty, quantityKg };
}

export function buildCheckoutBatchPayload(
  groups: ShopCartGroup[],
  base: Omit<CheckoutBatchRequest, 'shopOrders'>,
  voucherByShop: Record<number, VoucherUserResponse | null | undefined>,
  batchVoucher?: VoucherUserResponse | null,
): CheckoutBatchRequest {
  return {
    ...base,
    batchVoucherUserId: batchVoucher?.voucherUserId,
    shopOrders: groups.map((group): ShopOrderRequest => ({
      shopOwnerId: group.shopOwnerId,
      voucherUserId: voucherByShop[group.shopOwnerId]?.voucherUserId,
      items: group.items.map(cartItemToOrderItem),
    })),
  };
}

export function buildGroupedCartItemsByShopId(items: CartItemResponse[]): Record<string, CartItemResponse[]> {
  return items.reduce<Record<string, CartItemResponse[]>>((acc, item) => {
    const key = String(item.shopOwnerId ?? item.shopName ?? 'unknown');
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}
