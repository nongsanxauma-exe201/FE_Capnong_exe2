import { API_BASE_URL, TOKEN_KEY } from './api.config';

export interface ExportParams {
  from?: string;      // ISO date: YYYY-MM-DD
  to?: string;        // ISO date: YYYY-MM-DD
  statuses?: string[];
  orderIds?: number[];
}

async function downloadBlob(url: string, defaultFilename: string): Promise<void> {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token ?? ''}`,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Export thất bại (${response.status}): ${text}`);
  }

  // Ưu tiên lấy tên file từ Content-Disposition header của BE
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const match = disposition.match(/filename[^;=\n]*=["']?([^"';\n]+)["']?/i);
  const filename = match?.[1]?.trim() ?? defaultFilename;

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}

function buildQuery(params: ExportParams): string {
  const sp = new URLSearchParams();
  if (params.from) sp.append('from', params.from);
  if (params.to) sp.append('to', params.to);
  if (params.statuses?.length) {
    params.statuses.forEach(s => sp.append('statuses', s));
  }
  if (params.orderIds?.length) {
    params.orderIds.forEach(id => sp.append('orderIds', String(id)));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

/** Chuyển ISO date "2024-06-01" → "01-06-2024" (chuẩn Việt Nam) */
function toVnDate(iso?: string): string {
  if (!iso) return new Date().toLocaleDateString('vi-VN').replaceAll('/', '-');
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

/** Tạo chuỗi khoảng ngày cho fallback filename */
function dateRange(params: ExportParams): string {
  const f = toVnDate(params.from);
  const t = toVnDate(params.to);
  return `${f}_den_${t}`;
}

class ExportService {
  /**
   * Admin xuất báo cáo giao dịch Excel
   * Tên file BE trả về: BC_GiaoDich_01-06-2024_den_30-06-2024.xlsx
   */
  async exportAdminTransactionsExcel(params: ExportParams = {}): Promise<void> {
    const url = `${API_BASE_URL}/export/admin/transactions/excel${buildQuery(params)}`;
    await downloadBlob(url, `BC_GiaoDich_${dateRange(params)}.xlsx`);
  }

  /**
   * Admin xuất hóa đơn giao hàng PDF (batch — 1 file nhiều trang, API cũ)
   */
  async exportAdminTransactionsPdf(params: ExportParams = {}): Promise<void> {
    const url = `${API_BASE_URL}/export/admin/transactions/pdf${buildQuery(params)}`;
    const fallback = params.orderIds?.length
      ? `HD_GiaoHang_${params.orderIds.map(id => `DH${id}`).join('_')}_${toVnDate()}.pdf`
      : `HD_GiaoHang_${dateRange(params)}.pdf`;
    await downloadBlob(url, fallback);
  }

  /**
   * Admin: danh sách orderId DELIVERED để xuất từng hóa đơn giao hàng
   */
  async listAdminDeliveryReceiptIds(params: ExportParams = {}): Promise<number[]> {
    const token = localStorage.getItem(TOKEN_KEY);
    const url = `${API_BASE_URL}/export/admin/delivery-receipts/ids${buildQuery(params)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token ?? ''}` },
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Lấy danh sách hóa đơn thất bại (${response.status}): ${text}`);
    }
    const body = await response.json() as { result?: { orderIds?: number[] } };
    return body.result?.orderIds ?? [];
  }

  /**
   * Admin: tải 1 hóa đơn giao hàng PDF (kèm chi tiết COD nếu có)
   */
  async exportAdminDeliveryReceiptPdf(orderId: number): Promise<void> {
    const url = `${API_BASE_URL}/export/admin/delivery-receipts/${orderId}/pdf`;
    await downloadBlob(url, `HD_GiaoHang_DH${orderId}_${toVnDate()}.pdf`);
  }

  /**
   * Admin: xuất tất cả hóa đơn giao hàng — tải từng file PDF riêng
   */
  async exportAllAdminDeliveryReceipts(
    params: ExportParams = {},
    onProgress?: (current: number, total: number) => void,
  ): Promise<number> {
    const orderIds = await this.listAdminDeliveryReceiptIds(params);
    if (orderIds.length === 0) return 0;

    for (let i = 0; i < orderIds.length; i++) {
      onProgress?.(i + 1, orderIds.length);
      await this.exportAdminDeliveryReceiptPdf(orderIds[i]);
      if (i < orderIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    return orderIds.length;
  }

  /**
   * Shop owner xuất danh sách đơn hàng Excel
   * Tên file BE trả về: DS_DonHang_{TenShop}_01-06-2024_den_30-06-2024.xlsx
   */
  async exportShopOrdersExcel(params: ExportParams = {}): Promise<void> {
    const url = `${API_BASE_URL}/export/shop/orders/excel${buildQuery(params)}`;
    await downloadBlob(url, `DS_DonHang_${dateRange(params)}.xlsx`);
  }

  /**
   * Tải hóa đơn PDF cho một đơn hàng cụ thể
   * Tên file BE trả về: HD_DonHang_DH{id}_{ngay-dat-don}.pdf
   */
  async exportOrderReceiptPdf(orderId: number): Promise<void> {
    const url = `${API_BASE_URL}/export/orders/${orderId}/receipt/pdf`;
    await downloadBlob(url, `HD_DonHang_DH${orderId}_${toVnDate()}.pdf`);
  }
}

export const exportService = new ExportService();
