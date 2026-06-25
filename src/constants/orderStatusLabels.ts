/** Khớp com.swd301.foodmarket.enums.OrderStatus + alias legacy FE */
export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  AWAITING_PAYMENT: 'Đang thanh toán',
  PAID: 'Đã thanh toán',
  CONFIRMED: 'Đã xác nhận',
  READY_FOR_PICKUP: 'Chờ lấy hàng',
  SHIPPING_TO_WAREHOUSE: 'Đang giao tới kho',
  ARRIVED_AT_WAREHOUSE: 'Đã tới kho',
  QUALITY_CHECKING: 'Đang kiểm định',
  QUALITY_CHECKED: 'Đã kiểm tra',
  READY: 'Chờ shipper lấy',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
  FAILED: 'Giao thất bại',
  // Alias legacy (không có trong BE enum nhưng FE/tracking cũ vẫn có thể trả về)
  AWAITING_CONFIRMATION: 'Chờ xác nhận',
  PREPARING: 'Đang chuẩn bị',
  PACK: 'Đang đóng gói',
  QUALITY_APPROVED: 'Đạt chất lượng',
  QUALITY_REJECTED: 'Không đạt chất lượng',
  COMPLETED: 'Hoàn thành',
  PROCESSING: 'Đang xử lý',
  WAREHOUSE_ARRIVED: 'Đã tới kho',
};

export type OrderStatusBadgeTone = 'success' | 'danger' | 'warning' | 'neutral';

const BADGE_TONE_CLASS: Record<OrderStatusBadgeTone, string> = {
  success: 'bg-green-50 text-green-600',
  danger: 'bg-red-50 text-red-500',
  warning: 'bg-orange-50 text-orange-500',
  neutral: 'bg-gray-50 text-gray-600',
};

export function getOrderStatusLabel(status?: string | null): string {
  if (!status) return 'Không xác định';
  return ORDER_STATUS_LABELS[status] ?? status.replace(/_/g, ' ').toLowerCase();
}

export function getOrderStatusBadgeTone(status?: string | null): OrderStatusBadgeTone {
  if (!status) return 'neutral';
  if (status === 'DELIVERED' || status === 'COMPLETED') return 'success';
  if (status === 'CANCELLED' || status === 'FAILED') return 'danger';
  if (status === 'PENDING' || status === 'PAID') return 'warning';
  if (status === 'AWAITING_PAYMENT') return 'warning';
  return 'warning';
}

export function getOrderStatusBadgeClass(status?: string | null): string {
  return BADGE_TONE_CLASS[getOrderStatusBadgeTone(status)];
}
