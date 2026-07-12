import {
  paymentService,
  type PaymentResponse,
  type ResumePaymentOptionsResponse,
} from '../services/payment.service';
import { savePendingPayOSPayment } from './pendingPayOSPayment';

const formatVnd = (value: number) => `${Number(value ?? 0).toLocaleString('vi-VN')}đ`;

export { formatVnd };

/** Jackson/Lombok có thể serialize boolean isBatch thành key "batch". */
export function normalizeResumeOptions(
  raw: ResumePaymentOptionsResponse & { batch?: boolean; platformVoucher?: boolean },
): ResumePaymentOptionsResponse {
  const isBatch = raw.isBatch === true || raw.batch === true;
  const hasPlatformVoucher = raw.hasPlatformVoucher === true || raw.platformVoucher === true;
  return { ...raw, isBatch, hasPlatformVoucher };
}

export function redirectToPayOSCheckout(payment: PaymentResponse, triggerOrderId: number) {
  if (!payment.checkoutUrl) {
    throw new Error('Không tìm thấy link thanh toán.');
  }

  savePendingPayOSPayment(payment, triggerOrderId, {
    batchId: payment.batchId ?? undefined,
    orderIds: payment.orderIds,
  });
  window.location.href = payment.checkoutUrl;
}

export async function loadResumePaymentOptions(orderId: number): Promise<ResumePaymentOptionsResponse> {
  const res = await paymentService.getResumePaymentOptions(orderId);
  if (!res?.result) {
    throw new Error('Không thể tải tùy chọn thanh toán.');
  }
  return normalizeResumeOptions(res.result);
}

export async function resumeSingleOrderPayment(orderId: number, existing?: PaymentResponse | null) {
  let payment = existing;
  if (!payment?.checkoutUrl) {
    // Try existing PENDING payment first to avoid ORDER_NOT_PAYABLE on retry
    try {
      const existingRes = await paymentService.getLatestPendingByOrderId(orderId);
      if (existingRes?.result?.checkoutUrl) {
        payment = existingRes.result;
      }
    } catch {
      // No existing pending payment, will create a new one below
    }
  }
  if (!payment?.checkoutUrl) {
    const created = await paymentService.createPaymentPayOS({ orderId, amount: 0 });
    payment = created.result;
  }
  if (!payment?.checkoutUrl) {
    throw new Error('Không tìm thấy link thanh toán.');
  }
  redirectToPayOSCheckout(payment, orderId);
}

export async function resumePayAllBatchPayment(
  options: ResumePaymentOptionsResponse,
) {
  if (!options.batchId || !options.payAllOption) {
    throw new Error('Thiếu thông tin thanh toán batch.');
  }

  const triggerOrderId = options.triggerOrderId ?? options.unpaidOrders?.[0]?.orderId ?? 0;

  // Luôn tạo link PayOS mới theo số tiền hiện tại (tránh reuse QR cũ còn tổng trước voucher)
  const res = await paymentService.createBatchPayOS(options.batchId);
  if (!res.result?.checkoutUrl) {
    throw new Error('Không thể tạo link thanh toán batch.');
  }
  redirectToPayOSCheckout(res.result, triggerOrderId);
}

export async function resumeSingleBatchOrderPayment(
  orderId: number,
  amount: number,
  triggerOrderId: number,
) {
  let payment: PaymentResponse | undefined;
  try {
    const existing = await paymentService.getLatestPendingByOrderId(orderId);
    if (existing?.result?.checkoutUrl) {
      payment = existing.result;
    }
  } catch {
    // no existing pending payment
  }
  if (!payment?.checkoutUrl) {
    const res = await paymentService.createPaymentPayOS({ orderId, amount });
    payment = res.result;
  }
  if (!payment?.checkoutUrl) {
    throw new Error('Không thể tạo link thanh toán cho đơn hàng.');
  }
  redirectToPayOSCheckout(payment, triggerOrderId);
}

export type ResumePayMode = 'batch-all' | 'individual';

export async function handleResumePaymentClick(
  orderId: number,
  onShowBatchModal: (options: ResumePaymentOptionsResponse) => void,
  payMode?: ResumePayMode,
) {
  const options = await loadResumePaymentOptions(orderId);

  if (!options.isBatch) {
    await resumeSingleOrderPayment(orderId, options.singleOrderPayment);
    return;
  }

  // Voucher sàn → bắt buộc PayOS batch (BE chặn TT lẻ)
  if (options.hasPlatformVoucher) {
    await resumePayAllBatchPayment(options);
    return;
  }

  if (payMode === 'batch-all') {
    await resumePayAllBatchPayment(options);
    return;
  }

  if (payMode === 'individual') {
    const unpaid = options.unpaidOrders?.find((o) => o.orderId === orderId)
      ?? options.unpaidOrders?.[0];
    if (unpaid) {
      await resumeSingleBatchOrderPayment(
        unpaid.orderId,
        Number(unpaid.amount ?? 0),
        options.triggerOrderId ?? unpaid.orderId,
      );
      return;
    }
    await resumeSingleOrderPayment(orderId, options.singleOrderPayment);
    return;
  }

  // Không voucher + nhiều đơn chưa TT → popup chọn TT tất cả / từng shop
  if ((options.unpaidOrders?.length ?? 0) > 1) {
    onShowBatchModal(options);
    return;
  }

  const unpaid = options.unpaidOrders?.[0];
  if (unpaid) {
    await resumeSingleBatchOrderPayment(
      unpaid.orderId,
      Number(unpaid.amount ?? 0),
      options.triggerOrderId ?? unpaid.orderId,
    );
    return;
  }

  await resumeSingleOrderPayment(orderId, options.singleOrderPayment);
}
