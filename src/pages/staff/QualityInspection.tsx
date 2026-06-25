import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle,
  XCircle,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Package,
  Clock,
  CheckCircle2,
  Users,
  RefreshCw,
} from 'lucide-react';
import { ImageLightbox } from '../../components/ui';
import {
  orderService,
  qualityService,
  isMysteryBoxOrderItem,
  getOrderMysteryBoxLineId,
  normalizeOrderResponse,
  type QualityCheckRequest,
  type OrderResponse,
  type OrderItemResponse,
  type StaffOrderReportResponse,
} from '../../services';

type View = 'order-list' | 'detail-list' | 'inspection';

interface CriteriaResult {
  [detailId: string]: {
    [criteriaKey: string]: 'pass' | 'fail' | null;
  };
}

interface UIOrderDetailRow {
  detailId: string;
  orderId: number;
  item: OrderItemResponse;
  farmerName: string;
  avatar: string;
  arrivedTime: string;
  location: string;
}

function detailRowKey(item: OrderItemResponse, orderId: number, lineIndex: number): string {
  if (isMysteryBoxOrderItem(item)) {
    const mbId = getOrderMysteryBoxLineId(item);
    if (mbId != null) return `mb-${mbId}`;
  }
  if (item.orderDetailId != null) return String(item.orderDetailId);
  return `ord-${orderId}-line-${lineIndex}`;
}

function buildDetailRows(orders: OrderResponse[]): UIOrderDetailRow[] {
  const rows: UIOrderDetailRow[] = [];
  for (const ord of orders) {
    const shop = ord.shopOwner;
    const farmerName = shop?.fullName || shop?.shopName || 'Nông dân';
    const avatar =
      shop?.logoUrl ||
      (ord.items || []).find((i) => i.imageUrl)?.imageUrl ||
      'https://picsum.photos/seed/farmer/80/80';
    const addr = shop?.address?.trim() || ord.shippingAddress?.trim();
    const location =
      addr && addr.length > 0 ? (addr.length > 48 ? `${addr.slice(0, 45)}…` : addr) : '—';
    const arrivedTime = orderArrivedTime(ord);
    (ord.items || []).forEach((item, idx) => {
      rows.push({
        detailId: detailRowKey(item, ord.id, idx),
        orderId: ord.id,
        item,
        farmerName,
        avatar,
        arrivedTime,
        location,
      });
    });
  }
  return rows;
}

function orderArrivedTime(ord: OrderResponse): string {
  const tr =
    ord.trackings?.find((t) => t.status === 'ARRIVED_AT_WAREHOUSE') ||
    ord.trackings
      ?.slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  if (tr) return new Date(tr.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  if (ord.createdAt) return new Date(ord.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return '—';
}

function getQualityCriteriaKeyFromName(qualityName: string): string | undefined {
  const normalized = qualityName.trim().toLowerCase();
  if (normalized.includes('màu')) return 'appearance';
  if (normalized.includes('mùi')) return 'smell';
  if (normalized.includes('tươi')) return 'freshness';
  if (normalized.includes('đóng gói')) return 'packaging';
  if (normalized.includes('trọng lượng')) return 'weight';
  if (normalized.includes('chuyên môn') || normalized.includes('đánh giá chuyên môn')) return 'expert';
  return undefined;
}

/** Badge danh sách — chỉ theo kết quả cuối BE/staff (APPROVED / REJECTED). */
function qualityOverallToBadge(overall?: string | null): 'pass' | 'fail' | null {
  if (overall === 'APPROVED') return 'pass';
  if (overall === 'REJECTED') return 'fail';
  return null;
}

function getExistingDetailResult(item: OrderItemResponse): 'pass' | 'fail' | null {
  if (!item.qualityResult) return null;
  return qualityOverallToBadge(item.qualityResult.qualityResult);
}

function buildDetailResultsFromOrders(orders: OrderResponse[]): Record<string, 'pass' | 'fail'> {
  const map: Record<string, 'pass' | 'fail'> = {};
  for (const ord of orders) {
    (ord.items ?? []).forEach((item, idx) => {
      const badge = getExistingDetailResult(item);
      if (badge != null) {
        map[detailRowKey(item, ord.id, idx)] = badge;
      }
    });
  }
  return map;
}

const ARRIVED_ORDERS_PAGE_SIZE = 10;

type OrderListTab = 'pending' | 'checking';

const ORDER_LIST_TAB_STATUS: Record<OrderListTab, string> = {
  pending: 'ARRIVED_AT_WAREHOUSE',
  checking: 'QUALITY_CHECKING',
};

const QualityInspection: React.FC = () => {
  const [view, setView] = useState<View>('order-list');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
  const [detailResults, setDetailResults] = useState<Record<string, 'pass' | 'fail' | null>>({});
  const [criteriaResults, setCriteriaResults] = useState<CriteriaResult>({});
  const [criteriaEvidence, setCriteriaEvidence] = useState<Record<string, Record<string, File[]>>>({});
  const [criteriaImages, setCriteriaImages] = useState<Record<string, Record<string, string[]>>>({});
  const [detailRejectedWeights, setDetailRejectedWeights] = useState<Record<string, number>>({});
  const [qualityResult, setQualityResult] = useState<Record<string, 'APPROVED' | 'REJECTED' | null>>({});
  const [inspectionNotes, setInspectionNotes] = useState<Record<string, string>>({});
  const [damageNotes, setDamageNotes] = useState<Record<string, string>>({});
  const [criteriaPage, setCriteriaPage] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inspectionError, setInspectionError] = useState<string | null>(null);
  const [imageViewer, setImageViewer] = useState<{ images: string[]; currentIndex: number } | null>(null);

  const [orderListTab, setOrderListTab] = useState<OrderListTab>('pending');
  const [arrivedOrders, setArrivedOrders] = useState<OrderResponse[]>([]);
  const [ordersPage, setOrdersPage] = useState(0);
  const [ordersPageTotalElements, setOrdersPageTotalElements] = useState(0);
  const [ordersTotalPages, setOrdersTotalPages] = useState(0);
  const [staffReport, setStaffReport] = useState<StaffOrderReportResponse | null>(null);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    const reportRes = await orderService.getStaffOrderReport();
    if (reportRes.result) setStaffReport(reportRes.result);
    else setStaffReport(null);
  }, []);

  const loadOrdersPage = useCallback(async (page: number, tab: OrderListTab) => {
    setIsOrdersLoading(true);
    setLoadError(null);
    try {
      const res = await orderService.getOrdersForStaff(
        page,
        ARRIVED_ORDERS_PAGE_SIZE,
        ORDER_LIST_TAB_STATUS[tab]
      );
      const data = res.result;
      const normalized = (data?.content ?? []).map(normalizeOrderResponse);
      setArrivedOrders(normalized);
      setDetailResults(buildDetailResultsFromOrders(normalized));
      setOrdersPageTotalElements(data?.totalElements ?? 0);
      setOrdersTotalPages(data?.totalPages ?? 0);
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; message?: string };
      setLoadError(err?.data?.message || err?.message || 'Không thể tải đơn hàng');
      setArrivedOrders([]);
      setDetailResults({});
      setOrdersPageTotalElements(0);
      setOrdersTotalPages(0);
    } finally {
      setIsOrdersLoading(false);
    }
  }, []);

  const refreshOrdersFromServer = useCallback(async () => {
    try {
      const res = await orderService.getOrdersForStaff(
        ordersPage,
        ARRIVED_ORDERS_PAGE_SIZE,
        ORDER_LIST_TAB_STATUS[orderListTab]
      );
      const normalized = (res.result?.content ?? []).map(normalizeOrderResponse);
      setArrivedOrders(normalized);
      setDetailResults(buildDetailResultsFromOrders(normalized));
    } catch {
      // Giữ state hiện tại nếu refresh thất bại
    }
  }, [ordersPage, orderListTab]);

  const handleOrderListTabChange = useCallback((tab: OrderListTab) => {
    setOrderListTab(tab);
    setOrdersPage(0);
    setSelectedOrderId(null);
    setSelectedDetailId(null);
    setView('order-list');
  }, []);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  useEffect(() => {
    if (view !== 'order-list') return;
    void loadOrdersPage(ordersPage, orderListTab);
  }, [ordersPage, orderListTab, view, loadOrdersPage]);

  const handleRefresh = useCallback(async () => {
    setLoadError(null);
    setSelectedOrderId(null);
    setSelectedDetailId(null);
    setView('order-list');
    await loadReport();
    if (ordersPage === 0) {
      await loadOrdersPage(0, orderListTab);
    } else {
      setOrdersPage(0);
    }
  }, [loadReport, loadOrdersPage, ordersPage, orderListTab]);

  const detailRowsPage = useMemo(() => buildDetailRows(arrivedOrders), [arrivedOrders]);

  const detailRowsForOrder = useMemo(
    () => (selectedOrderId == null ? [] : detailRowsPage.filter((r) => r.orderId === selectedOrderId)),
    [detailRowsPage, selectedOrderId]
  );

  const selectedOrder = useMemo(
    () => (selectedOrderId == null ? null : arrivedOrders.find((o) => o.id === selectedOrderId) ?? null),
    [arrivedOrders, selectedOrderId]
  );

  const selectedRow = useMemo(() => {
    if (!selectedDetailId) return null;
    return detailRowsForOrder.find((r) => r.detailId === selectedDetailId) ?? null;
  }, [detailRowsForOrder, selectedDetailId]);

  const detailsDoneOnPage = detailRowsPage.filter((r) => detailResults[r.detailId] != null || r.item.qualityResult != null).length;

  useEffect(() => {
    if (!selectedRow) return;
    const detailId = selectedRow.detailId;
    const existing = selectedRow.item.qualityResult;
    if (!existing) return;

    if (existing.qualityResult === 'APPROVED' || existing.qualityResult === 'REJECTED') {
      setQualityResult((prev) => ({
        ...(prev as Record<string, 'APPROVED' | 'REJECTED' | null>),
        [detailId]: existing.qualityResult,
      }) as Record<string, 'APPROVED' | 'REJECTED' | null>);
      const badge = qualityOverallToBadge(existing.qualityResult);
      if (badge != null) {
        setDetailResults((prev) => ({
          ...prev,
          [detailId]: badge,
        }));
      }
    }

    if (existing.note != null) {
      setInspectionNotes((prev) => ({
        ...(prev as Record<string, string>),
        [detailId]: existing.note,
      }) as Record<string, string>);
    }

    if (existing.damageNote != null) {
      setDamageNotes((prev) => ({
        ...prev,
        [detailId]: existing.damageNote || '',
      }));
    }

    if (existing.rejectedWeight != null && existing.qualityResult === 'REJECTED') {
      setDetailRejectedWeights((prev) => ({
        ...prev,
        [detailId]: existing.rejectedWeight as number,
      }));
    }

    if (existing.qualityCheckingResponses && existing.qualityCheckingResponses.length > 0) {
      const nextCriteria = existing.qualityCheckingResponses.reduce<Record<string, 'pass' | 'fail' | null>>((resultMap, item) => {
        const key = getQualityCriteriaKeyFromName(item.qualityName);
        if (!key) return resultMap;
        return {
          ...resultMap,
          [key]: item.passed ? 'pass' : 'fail',
        };
      }, {});
      setCriteriaResults((prev) => ({
        ...prev,
        [detailId]: nextCriteria,
      }));

      const nextImages: Record<string, string[]> = {};
      existing.qualityCheckingResponses.forEach((item) => {
        const key = getQualityCriteriaKeyFromName(item.qualityName);
        if (key && item.images && item.images.length > 0) {
          nextImages[key] = item.images.map(img => img.imageUrl);
        }
      });
      setCriteriaImages((prev) => ({
        ...prev,
        [detailId]: nextImages,
      }));
    }
  }, [selectedRow]);

  useEffect(() => {
    if (view === 'inspection' && selectedDetailId && !selectedRow) {
      setView(selectedOrderId != null ? 'detail-list' : 'order-list');
      setSelectedDetailId(null);
    }
  }, [view, selectedDetailId, selectedRow, selectedOrderId]);

  useEffect(() => {
    if (view === 'detail-list' && selectedOrderId != null && !arrivedOrders.some((o) => o.id === selectedOrderId)) {
      setView('order-list');
      setSelectedOrderId(null);
    }
  }, [view, selectedOrderId, arrivedOrders]);

  const criteria = [
    { id: 1, label: 'Màu sắc', key: 'appearance' },
    { id: 2, label: 'Mùi hương (không có mùi lạ)', key: 'smell' },
    { id: 3, label: 'Độ tươi (không héo, dập nát)', key: 'freshness' },
    { id: 4, label: 'Đóng gói (còn nguyên vẹn)', key: 'packaging' },
    { id: 5, label: 'Trọng lượng (khớp với khai báo)', key: 'weight' },
    { id: 6, label: 'Đánh giá chuyên môn', key: 'expert' },
  ];

  const setCriteria = (detailId: string, key: string, value: 'pass' | 'fail') => {
    setCriteriaResults((prev) => ({
      ...prev,
      [detailId]: { ...(prev[detailId] || {}), [key]: value },
    }));
  };

  const getCriteria = (detailId: string, key: string) => criteriaResults[detailId]?.[key] ?? null;

  const setEvidence = (detailId: string, key: string, files: File[]) => {
    setCriteriaEvidence((prev) => ({
      ...prev,
      [detailId]: {
        ...(prev[detailId] || {}),
        [key]: [...(prev[detailId]?.[key] || []), ...files],
      },
    }));
  };

  const removeEvidence = (detailId: string, key: string, fileIndex: number) => {
    setCriteriaEvidence((prev) => {
      const current = prev[detailId]?.[key] || [];
      return {
        ...prev,
        [detailId]: {
          ...(prev[detailId] || {}),
          [key]: current.filter((_, i) => i !== fileIndex),
        },
      };
    });
  };

  const setNote = (detailId: string, note: string) => {
    setInspectionNotes((prev) => ({
      ...prev,
      [detailId]: note,
    }));
  };

  const handleSubmitQuality = async (detailId: string) => {
    if (!selectedRow) return;

    const criteriaPayload = criteria.map((c) => ({
      qualityCrieriaId: c.id,
      passed: getCriteria(detailId, c.key) === 'pass',
    }));

    const unfilled = criteria.filter((c) => getCriteria(detailId, c.key) == null);
    if (unfilled.length > 0) {
      setInspectionError('Vui lòng đánh giá tất cả các tiêu chí trước khi gửi.');
      return;
    }

    const rejectedWeight = detailRejectedWeights[detailId];
    if (rejectedWeight !== undefined && rejectedWeight !== null) {
      if (Number.isNaN(rejectedWeight) || rejectedWeight < 0) {
        setInspectionError('Vui lòng nhập khối lượng không đạt chuẩn hợp lệ.');
        return;
      }
      const itemQuantity = selectedRow.item.quantityKg ?? selectedRow.item.quantity ?? 0;
      if (itemQuantity > 0 && rejectedWeight > itemQuantity) {
        setInspectionError('Khối lượng không đạt chuẩn không được lớn hơn khối lượng của đơn hàng.');
        return;
      }
    }
    const currentDamageNote = damageNotes[detailId]?.trim();
    const inferredQualityResult: 'APPROVED' | 'REJECTED' =
      criteriaPayload.some((c) => !c.passed) || (rejectedWeight ?? 0) > 0 || Boolean(currentDamageNote)
        ? 'REJECTED'
        : 'APPROVED';

    const item = selectedRow.item;
    const isMysteryBox = isMysteryBoxOrderItem(item);

    let requestBody: QualityCheckRequest;
    if (isMysteryBox) {
      const orderMysteryBoxId = getOrderMysteryBoxLineId(item);
      if (!orderMysteryBoxId || Number.isNaN(orderMysteryBoxId)) {
        setInspectionError(
          'Không tìm thấy orderMysteryBoxId cho hộp mù. Kiểm tra API đơn hàng có trả đúng ID dòng hộp mù (không dùng orderDetailId).'
        );
        return;
      }
      requestBody = {
        orderMysteryBoxId,
        qualityChecks: criteriaPayload,
        note: inspectionNotes[detailId]?.trim() || undefined,
        rejectedWeight: rejectedWeight && rejectedWeight > 0 ? rejectedWeight : undefined,
        rejectedKg: rejectedWeight && rejectedWeight > 0 ? rejectedWeight : undefined,
        damageNote: currentDamageNote || undefined,
      };
    } else {
      const orderDetailId = item.orderDetailId;
      if (!orderDetailId || Number.isNaN(orderDetailId)) {
        setInspectionError('Không xác định được dòng sản phẩm trong đơn.');
        return;
      }
      requestBody = {
        orderDetailId,
        qualityChecks: criteriaPayload,
        note: inspectionNotes[detailId]?.trim() || undefined,
        rejectedWeight: rejectedWeight && rejectedWeight > 0 ? rejectedWeight : undefined,
        rejectedKg: rejectedWeight && rejectedWeight > 0 ? rejectedWeight : undefined,
        damageNote: currentDamageNote || undefined,
      };
    }

    const request = requestBody;
    const fileMap: Record<string, File[]> = {};

    criteria.forEach((c, index) => {
      const files = criteriaEvidence[detailId]?.[c.key] || [];

      fileMap[`qc_${index + 1}`] = files;
    });

    setIsSubmitting(true);
    setInspectionError(null);
    try {
      await qualityService.checkQuality(request, fileMap);
      setDetailResults((prev) => ({
        ...prev,
        [detailId]: inferredQualityResult === 'APPROVED' ? 'pass' : 'fail',
      }));
      setInspectionError(null);
      setView('detail-list');
      await refreshOrdersFromServer();
    } catch (error: unknown) {
      const err = error as { data?: { message?: string }; message?: string };
      setInspectionError(err?.data?.message || err?.message || 'Gửi kiểm tra chất lượng thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const CRITERIA_PAGE_SIZE = 10;
  const criteriaPageCount = Math.max(1, Math.ceil(criteria.length / CRITERIA_PAGE_SIZE));
  const visibleCriteria = criteria.slice(criteriaPage * CRITERIA_PAGE_SIZE, (criteriaPage + 1) * CRITERIA_PAGE_SIZE);

  useEffect(() => {
    setCriteriaPage(0);
  }, [selectedDetailId]);

  const passCount = (detailId: string) => criteria.filter((c) => getCriteria(detailId, c.key) === 'pass').length;
  const failCount = (detailId: string) => criteria.filter((c) => getCriteria(detailId, c.key) === 'fail').length;

  const statFarmersWaiting = staffReport?.pendingFarmerApprovals ?? 0;
  const statOrdersNeedingCheck = staffReport?.qualityCheckingOrders ?? 0;
  const statCheckingInProgress = staffReport?.quantityChecking ?? 0;
  const statApprovedToday = staffReport?.approvedTodayOrders ?? 0;

  const orderListTabs: { id: OrderListTab; label: string; reportCount?: number }[] = [
    { id: 'pending', label: 'Chưa kiểm tra', reportCount: statOrdersNeedingCheck },
    { id: 'checking', label: 'Đang kiểm tra', reportCount: statCheckingInProgress },
  ];

  // ── ORDER LIST (mỗi dòng = 1 đơn hàng) ─────────────────────────────
  if (view === 'order-list') {
    return (
      <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-500">
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Kiểm Duyệt Chất Lượng</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleRefresh()}
                disabled={isOrdersLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-100 rounded-2xl text-xs font-black text-gray-500 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`size-4 ${isOrdersLoading ? 'animate-spin' : ''}`} />
                Làm mới
              </button>
            </div>
          </div>
          {loadError && (
            <p className="mt-4 text-sm font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{loadError}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              label: 'Nông dân (báo cáo)',
              value: statFarmersWaiting,
              color: 'bg-orange-50 border-orange-100',
              icon: <Users className="size-5 text-orange-500" />,
            },
            {
              label: 'Tổng đơn cần kiểm',
              value: statOrdersNeedingCheck,
              color: 'bg-blue-50 border-blue-100',
              icon: <Package className="size-5 text-blue-500" />,
            },
            {
              label: 'Đã hoàn thành hôm nay',
              value: statApprovedToday,
              color: 'bg-green-50 border-green-100',
              icon: <CheckCircle2 className="size-5 text-primary" />,
            },
          ].map((stat, i) => (
            <div key={i} className={`${stat.color} border rounded-[24px] p-6 flex items-center gap-4`}>
              <div className="size-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">{stat.icon}</div>
              <div>
                <p className="text-2xl font-black text-gray-900">{isOrdersLoading ? '—' : stat.value}</p>
                <p className="text-xs font-bold text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 p-1.5 bg-gray-100 rounded-2xl w-fit">
          {orderListTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleOrderListTabChange(tab.id)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all flex items-center gap-2 ${
                orderListTab === tab.id
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.reportCount != null && tab.reportCount > 0 && (
                <span
                  className={`min-w-[1.25rem] px-1.5 py-0.5 rounded-md text-[10px] font-black text-center ${
                    orderListTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {tab.reportCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {!isOrdersLoading && detailRowsPage.length > 0 && (
          <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs font-black text-gray-600">
              Tiến độ dòng chi tiết (trang): {detailsDoneOnPage}/{detailRowsPage.length}
            </p>
            <div className="h-2 flex-1 min-w-[120px] max-w-md bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${detailRowsPage.length ? (detailsDoneOnPage / detailRowsPage.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {isOrdersLoading && (
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-12 text-center text-sm font-bold text-gray-400">
              {orderListTab === 'pending' ? 'Đang tải đơn chờ kiểm…' : 'Đang tải đơn đang kiểm…'}
            </div>
          )}
          {!isOrdersLoading && arrivedOrders.length === 0 && (
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-12 text-center text-sm font-bold text-gray-500">
              {orderListTab === 'pending'
                ? 'Không có đơn chờ kiểm duyệt.'
                : 'Không có đơn đang kiểm tra.'}
            </div>
          )}
          {!isOrdersLoading &&
            arrivedOrders.map((ord) => {
              const shop = ord.shopOwner;
              const farmerName = shop?.fullName || shop?.shopName || 'Nông dân';
              const items = ord.items || [];
              const productNames = [...new Set(items.map((i) => i.productName).filter(Boolean))] as string[];
              const lines = detailRowsPage.filter((r) => r.orderId === ord.id);
              const done = lines.filter((l) => detailResults[l.detailId] != null || l.item.qualityResult != null).length;
              const totalLines = lines.length;
              const allDone = totalLines > 0 && done === totalLines;
              const itemQtySum = items.reduce((s, i) => s + (i.quantity || 0), 0);
              const cover =
                shop?.logoUrl || items.find((i) => i.imageUrl)?.imageUrl || 'https://picsum.photos/seed/order/80/80';
              const addr = shop?.address?.trim() || ord.shippingAddress?.trim();
              const location =
                addr && addr.length > 0 ? (addr.length > 48 ? `${addr.slice(0, 45)}…` : addr) : '—';
              const arrivedTime = orderArrivedTime(ord);

              return (
                <div
                  key={ord.id}
                  onClick={() => {
                    setSelectedOrderId(ord.id);
                    setSelectedDetailId(null);
                    setView('detail-list');
                  }}
                  className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 flex items-center gap-6 hover:border-primary/20 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="relative">
                    <img src={cover} className="size-16 rounded-2xl object-cover border-2 border-white shadow-md" alt="" />
                    {allDone && (
                      <div className="absolute -top-1 -right-1 size-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                        <CheckCircle className="size-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h3 className="text-base font-black text-gray-900">Đơn #{ord.id}</h3>
                      <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-lg">
                        {items.length} dòng hàng
                      </span>
                    </div>
                    <p className="text-xs font-black text-gray-700 mb-1">{farmerName}</p>
                    <p className="text-xs text-gray-400 font-bold mb-3">
                      📍 {location} · Đến kho {arrivedTime}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(productNames.length ? productNames : ['—']).slice(0, 6).map((p, i) => (
                        <span key={i} className="px-2.5 py-1 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-black text-gray-500">
                          {p}
                        </span>
                      ))}
                      {productNames.length > 6 && (
                        <span className="px-2.5 py-1 text-[10px] font-black text-gray-400">+{productNames.length - 6}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-center">
                      <p className="text-2xl font-black text-gray-900">{items.length}</p>
                      <p className="text-[10px] font-bold text-gray-400">dòng chi tiết</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-gray-900">{itemQtySum}</p>
                      <p className="text-[10px] font-bold text-gray-400">tổng SL</p>
                    </div>
                    <div className="w-24">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-black text-gray-400">Tiến độ</span>
                        <span className="text-[9px] font-black text-primary">
                          {done}/{totalLines || items.length}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{
                            width: `${totalLines > 0 ? (done / totalLines) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${allDone
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          : ord.status === 'QUALITY_CHECKING'
                            ? 'bg-sky-50 text-sky-600 border border-sky-100'
                            : 'bg-orange-50 text-orange-600 border border-orange-100'
                        }`}
                    >
                      {allDone ? (
                        <>
                          <CheckCircle className="size-3.5" /> Xong
                        </>
                      ) : ord.status === 'QUALITY_CHECKING' ? (
                        <>
                          <Clock className="size-3.5" /> Đang kiểm
                        </>
                      ) : (
                        <>
                          <Clock className="size-3.5" /> Chờ kiểm
                        </>
                      )}
                    </div>
                    <ChevronRight className="size-5 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              );
            })}
        </div>

        {!isOrdersLoading && ordersPageTotalElements > 0 && ordersTotalPages > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-4 bg-white rounded-[24px] border border-gray-100 shadow-sm px-6 py-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={ordersPage <= 0 || isOrdersLoading}
                onClick={() => {
                  setSelectedOrderId(null);
                  setSelectedDetailId(null);
                  setView('order-list');
                  setOrdersPage((p) => Math.max(0, p - 1));
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronLeft className="size-4" /> Trước
              </button>
              <span className="text-xs font-black text-gray-500 tabular-nums">
                {ordersPage + 1} / {ordersTotalPages}
              </span>
              <button
                type="button"
                disabled={ordersTotalPages <= 0 || ordersPage >= ordersTotalPages - 1 || isOrdersLoading}
                onClick={() => {
                  setSelectedOrderId(null);
                  setSelectedDetailId(null);
                  setView('order-list');
                  setOrdersPage((p) => p + 1);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
              >
                Sau <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── DETAIL LIST (items trong 1 đơn) ──────────────────────────────
  if (view === 'detail-list' && selectedOrder) {
    const shop = selectedOrder.shopOwner;
    const farmerName = shop?.fullName || shop?.shopName || 'Nông dân';
    const cover =
      shop?.logoUrl ||
      (selectedOrder.items || []).find((i) => i.imageUrl)?.imageUrl ||
      'https://picsum.photos/seed/farmer/80/80';
    const addr = shop?.address?.trim() || selectedOrder.shippingAddress?.trim();
    const location =
      addr && addr.length > 0 ? (addr.length > 48 ? `${addr.slice(0, 45)}…` : addr) : '—';
    const arrivedTime = orderArrivedTime(selectedOrder);

    return (
      <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-300">
        <div className="flex items-center gap-4 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setSelectedOrderId(null);
              setSelectedDetailId(null);
              setView('order-list');
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-100 rounded-2xl text-xs font-black text-gray-500 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="size-4" /> Danh sách đơn
          </button>
          <div className="h-5 w-px bg-gray-200 hidden sm:block" />
          <div className="flex items-center gap-3 min-w-0">
            <img src={cover} className="size-10 rounded-xl object-cover shrink-0" alt="" />
            <div className="min-w-0">
              <h2 className="text-xl font-black text-gray-900 truncate">Đơn #{selectedOrder.id}</h2>
              <p className="text-xs text-gray-400 font-medium truncate">
                {farmerName} · 📍 {location} · Đến kho {arrivedTime}
              </p>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-500 font-medium -mt-4">Chọn dòng chi tiết để mở kiểm duyệt.</p>

        <div className="flex flex-col gap-2">
          {detailRowsForOrder.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-sm font-bold text-gray-500">
              Đơn này không có dòng sản phẩm (items).
            </div>
          )}
          {detailRowsForOrder.map((row) => {
            const { detailId, orderId, item } = row;
            const existingResult = getExistingDetailResult(item);
            const result = detailResults[detailId] ?? existingResult;
            const isChecked = Boolean(item.qualityResult?.qualityResult);
            const pCount = passCount(detailId);
            const fCount = failCount(detailId);
            const inspected = pCount + fCount;
            const qty = item.quantity ?? 0;
            const image = item.imageUrl || 'https://picsum.photos/seed/qc/80/80';
            const productLabel = item.productName || item.mysteryBoxType || 'Sản phẩm';
            const lineTypeLabel = isMysteryBoxOrderItem(item) ? 'Hộp mù' : 'Nông sản';

            return (
              <div
                key={`${orderId}-${detailId}`}
                onClick={() => {
                  setSelectedDetailId(detailId);
                  setView('inspection');
                }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-4 hover:border-primary/25 cursor-pointer group"
              >
                <img src={image} className="size-12 rounded-xl object-cover shrink-0" alt="" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-gray-900 truncate">{productLabel}</p>
                  <p className="text-[11px] text-gray-500 font-bold">
                    {lineTypeLabel} · Khối lượng {Number(item.quantityKg ?? qty).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} kg · Tiêu chí {inspected}/{criteria.length}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {result === 'pass' && (
                    <span className="text-[10px] font-black text-emerald-600 flex items-center justify-end gap-1">
                      <CheckCircle className="size-3.5" /> Đạt
                    </span>
                  )}
                  {result === 'fail' && (
                    <span className="text-[10px] font-black text-red-500 flex items-center justify-end gap-1">
                      <XCircle className="size-3.5" /> Lỗi
                    </span>
                  )}
                  {!result && (
                    <span className="text-[10px] font-black text-gray-400 flex items-center justify-end gap-1">
                      <Clock className="size-3.5" /> Chờ
                    </span>
                  )}
                  <ChevronRight className="size-4 text-gray-300 group-hover:text-primary ml-auto mt-1" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── INSPECTION (từng dòng hàng trong đơn) ─────────────────────────
  if (view === 'inspection' && selectedRow) {
    const { detailId, orderId, item, farmerName } = selectedRow;
    const existingQualityResult = item.qualityResult?.qualityResult;
    const selectedQualityResult = qualityResult[detailId] ?? existingQualityResult;
    const isAlreadyChecked = Boolean(existingQualityResult);
    const pCount = passCount(detailId);
    const fCount = failCount(detailId);
    const inspected = pCount + fCount;
    const result = detailResults[detailId];
    const qty = item.quantityKg ?? item.quantity ?? 0;
    const thumb = item.imageUrl || 'https://picsum.photos/seed/qc/80/80';
    const productLabel = item.productName || item.mysteryBoxType || 'Sản phẩm';
    const lineTypeLabel = isMysteryBoxOrderItem(item) ? 'Hộp mù' : 'Nông sản';
    const unitPrice = item.unitPrice != null ? `${Number(item.pricePerKg ?? item.unitPrice).toLocaleString('vi-VN')} ₫/kg` : '—';
    const qtyLabel = `${Number(qty).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} kg`;
    const inferredResult = criteria.some((c) => getCriteria(detailId, c.key) === 'fail')
      || (detailRejectedWeights[detailId] ?? 0) > 0
      || Boolean(damageNotes[detailId]?.trim())
      ? 'REJECTED'
      : 'APPROVED';

    return (
      <div className="flex flex-col gap-6 p-8 animate-in fade-in duration-300 max-w-2xl mx-auto w-full">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedDetailId(null);
              setView('detail-list');
            }}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-100 rounded-xl text-xs font-black text-gray-500 hover:bg-gray-50 shadow-sm"
          >
            <ArrowLeft className="size-4" /> Quay lại
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-lg font-black text-gray-900 truncate">{productLabel}</h3>
          <p className="text-xs text-gray-500 font-bold mt-0.5">
            Đơn #{orderId} · {lineTypeLabel}
          </p>
          <div className="mt-4 flex gap-4">
            <img src={thumb} className="size-20 rounded-xl object-cover border border-gray-100 shrink-0" alt="" />
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm flex-1 min-w-0">
              <div className="flex justify-between gap-4 border-b border-gray-50 pb-2">
                <dt className="text-gray-400 font-bold text-xs">Loại</dt>
                <dd className="font-bold text-gray-800 text-right">{lineTypeLabel}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-gray-50 pb-2">
                <dt className="text-gray-400 font-bold text-xs">Số lượng</dt>
                <dd className="font-black text-gray-900 text-right">{qtyLabel}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-gray-50 pb-2">
                <dt className="text-gray-400 font-bold text-xs">Đơn giá</dt>
                <dd className="font-bold text-gray-800 text-right">{unitPrice}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-400 font-bold text-xs">Nông dân / shop</dt>
                <dd className="font-bold text-gray-800 text-right truncate">{farmerName}</dd>
              </div>
            </dl>
          </div>
          <p className="mt-3 text-[10px] font-bold text-gray-400">
            Tiến độ tiêu chí: {inspected}/{criteria.length}
          </p>
          <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
            <div className="h-full bg-emerald-400" style={{ width: `${(pCount / criteria.length) * 100}%` }} />
            <div className="h-full bg-red-400" style={{ width: `${(fCount / criteria.length) * 100}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between gap-4 mb-3">
            <h4 className="font-black text-gray-800 text-xs uppercase tracking-widest">Tiêu chí</h4>
            {criteriaPageCount > 1 && (
              <div className="flex items-center gap-2 text-[11px] font-black text-gray-600">
                <button
                  type="button"
                  disabled={criteriaPage <= 0}
                  onClick={() => setCriteriaPage((page) => Math.max(0, page - 1))}
                  className="px-2 py-1 rounded-lg border border-gray-200 bg-white disabled:opacity-40"
                >
                  <ChevronLeft className="size-3" />
                </button>
                <span>
                  {criteriaPage * CRITERIA_PAGE_SIZE + 1}-{Math.min((criteriaPage + 1) * CRITERIA_PAGE_SIZE, criteria.length)}/{criteria.length}
                </span>
                <button
                  type="button"
                  disabled={criteriaPage >= criteriaPageCount - 1}
                  onClick={() => setCriteriaPage((page) => Math.min(criteriaPageCount - 1, page + 1))}
                  className="px-2 py-1 rounded-lg border border-gray-200 bg-white disabled:opacity-40"
                >
                  <ChevronRight className="size-3" />
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {visibleCriteria.map((c, i) => {
              const val = getCriteria(detailId, c.key);
              return (
                <div
                  key={`${criteriaPage}-${i}-${c.key}`}
                  className={`flex flex-col gap-3 p-3 rounded-xl border text-left ${val === 'pass'
                      ? 'bg-emerald-50/60 border-emerald-200'
                      : val === 'fail'
                        ? 'bg-red-50/60 border-red-200'
                        : 'bg-gray-50 border-gray-100'
                    }`}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className={`text-xs font-black min-w-0 ${val === 'pass' ? 'text-emerald-800' : val === 'fail' ? 'text-red-700' : 'text-gray-700'}`}>
                      {c.label}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {!isAlreadyChecked && (
                        <label className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-black border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 cursor-pointer">
                          📷 Chọn ảnh
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(event) => {
                              const files = event.target.files;
                              if (files && files.length > 0) {
                                setEvidence(detailId, c.key, Array.from(files));
                              }
                              event.target.value = '';
                            }}
                          />
                        </label>
                      )}
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={isAlreadyChecked}
                          onClick={() => setCriteria(detailId, c.key, 'pass')}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black ${val === 'pass'
                              ? 'bg-emerald-500 text-white'
                              : isAlreadyChecked
                                ? 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-white border border-gray-200 text-gray-500'
                            }`}
                        >
                          Đạt
                        </button>
                        <button
                          type="button"
                          disabled={isAlreadyChecked}
                          onClick={() => setCriteria(detailId, c.key, 'fail')}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black ${val === 'fail'
                              ? 'bg-red-500 text-white'
                              : isAlreadyChecked
                                ? 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-white border border-gray-200 text-gray-500'
                            }`}
                        >
                          Không
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Show selected files (not yet submitted) */}
                  {!isAlreadyChecked && criteriaEvidence[detailId]?.[c.key] && criteriaEvidence[detailId][c.key].length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {criteriaEvidence[detailId][c.key].map((file, fIdx) => (
                        <div key={fIdx} className="relative group">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="size-14 rounded-lg object-cover border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeEvidence(detailId, c.key, fIdx)}
                            className="absolute -top-1.5 -right-1.5 size-5 bg-red-500 text-white rounded-full text-[10px] font-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                          >
                            ✕
                          </button>
                          <p className="text-[8px] text-gray-400 truncate max-w-[56px] mt-0.5 text-center">{file.name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Show saved evidence images (already submitted) with click-to-zoom */}
                  {criteriaImages[detailId]?.[c.key] && criteriaImages[detailId][c.key].length > 0 && (
                    <div className="flex gap-2 mt-2 overflow-x-auto">
                      {criteriaImages[detailId][c.key].map((imgUrl, imgIdx) => (
                        <img
                          key={imgIdx}
                          src={imgUrl}
                          alt={`Evidence ${imgIdx + 1}`}
                          className="size-14 rounded-lg object-cover border border-gray-200 cursor-pointer hover:opacity-80 hover:ring-2 hover:ring-primary/40 transition-all"
                          onClick={() => setImageViewer({ images: criteriaImages[detailId][c.key], currentIndex: imgIdx })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4">
          {isAlreadyChecked && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <div className="text-sm font-black text-emerald-700">
              </div>
              {existingQualityResult === 'REJECTED' && item.qualityResult?.rejectedWeight != null && (
                <div className="mt-2 text-sm font-black text-emerald-700">
                  Khối lượng không đạt: <span className="text-red-600">{item.qualityResult.rejectedWeight} kg</span>
                </div>
              )}
              {item.qualityResult?.damageNote && (
                <div className="mt-2 text-sm font-bold text-orange-700">
                  Mô tả hàng hư: <span className="text-orange-600">{item.qualityResult.damageNote}</span>
                </div>
              )}
            </div>
          )}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kết quả kiểm định</p>
            <p className="text-sm font-medium text-gray-600 mt-1">
              Hệ thống tự suy ra kết quả từ tiêu chí, khối lượng lỗi và mô tả hàng hư.
            </p>
          </div>

          {!isAlreadyChecked && (
            <>
              <div className="bg-red-50 border border-red-200 rounded-2xl shadow-sm p-4">
                <label className="text-[10px] font-black text-red-700 uppercase tracking-widest">Khối lượng không đạt chuẩn (kg)</label>
                <input
                  type="number"
                  min="0"
                  max={item.quantityKg ?? item.quantity ?? undefined}
                  step="0.1"
                  value={detailRejectedWeights[detailId] ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      setDetailRejectedWeights((prev) => ({
                        ...prev,
                        [detailId]: parseFloat(val),
                      }));
                    } else {
                      setDetailRejectedWeights((prev) => {
                        const updated = { ...prev };
                        delete updated[detailId];
                        return updated;
                      });
                    }
                  }}
                  placeholder="Không bắt buộc, nhập nếu có khối lượng bị lỗi"
                  className="w-full mt-2 px-3 py-2 bg-white rounded-xl text-sm font-bold text-red-700 border border-red-200 outline-none placeholder:text-red-300"
                />
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-2xl shadow-sm p-4">
                <label className="text-[10px] font-black text-orange-700 uppercase tracking-widest">Mô tả hàng hư</label>
                <textarea
                  rows={2}
                  value={damageNotes[detailId] ?? ''}
                  onChange={(event) => setDamageNotes((prev) => ({ ...prev, [detailId]: event.target.value }))}
                  placeholder="Ví dụ: Hàng bị nước đọng, dập nát, cần gửi voucher xin lỗi..."
                  className="w-full mt-2 px-3 py-2 bg-white rounded-xl text-sm font-bold text-orange-700 border border-orange-200 outline-none placeholder:text-orange-300 resize-none"
                />
              </div>
            </>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ghi chú</label>
            <textarea
              rows={2}
              value={inspectionNotes[detailId] ?? ''}
              onChange={(event) => setNote(detailId, event.target.value)}
              placeholder="Ghi chú ngắn…"
              disabled={isAlreadyChecked}
              className="w-full mt-2 px-3 py-2 bg-gray-50 rounded-xl text-sm font-medium text-gray-800 outline-none border border-gray-100 resize-none placeholder:text-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <div className="text-sm font-black text-gray-600">
            Kết quả dự kiến: <span className="text-base text-black">{(selectedQualityResult ?? inferredResult) === 'APPROVED' ? 'Đạt' : 'Không đạt'}</span>
          </div>
        </div>

        {inspectionError && (
          <p className="text-sm font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {inspectionError}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => handleSubmitQuality(detailId)}
            disabled={isSubmitting || isAlreadyChecked}
            className={`w-full py-3 font-black rounded-xl text-sm flex items-center justify-center gap-2 ${isAlreadyChecked
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : isSubmitting
                  ? 'bg-gray-300 text-gray-700 cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary/90'
              }`}
          >
            <Package className="size-4" /> {isAlreadyChecked ? 'Đã kiểm định' : isSubmitting ? 'Đang gửi...' : 'Gửi kiểm định'}
          </button>
          {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDetailResults((prev) => ({ ...prev, [detailId]: 'pass' }))}
              className={`w-full py-3 font-black rounded-xl text-sm flex items-center justify-center gap-2 ${
                result === 'pass' ? 'bg-emerald-600 text-white' : 'bg-[#38703d] text-white hover:bg-emerald-700'
              }`}
            >
              <CheckCircle className="size-4" /> Đạt
            </button>
            <button
              type="button"
              onClick={() => setDetailResults((prev) => ({ ...prev, [detailId]: 'fail' }))}
              className={`w-full py-3 font-black rounded-xl text-sm flex items-center justify-center gap-2 ${
                result === 'fail' ? 'bg-red-500 text-white' : 'bg-red-50 border border-red-100 text-red-600'
              }`}
            >
              <XCircle className="size-4" /> Không đạt
            </button>
          </div> */}
        </div>

        {result === 'pass' && (
          <p className="text-center text-xs font-bold text-emerald-700">Đã đánh dấu đạt cho chi tiết #{detailId}.</p>
        )}
        {result === 'fail' && (
          <p className="text-center text-xs font-bold text-red-600">Đã đánh dấu không đạt cho chi tiết #{detailId}.</p>
        )}

        {imageViewer && (
          <ImageLightbox
            imageUrl={imageViewer.images[imageViewer.currentIndex]}
            alt="Ảnh chứng cứ"
            onClose={() => setImageViewer(null)}
            images={imageViewer.images.map((url) => ({ imageUrl: url }))}
            currentIndex={imageViewer.currentIndex}
            onIndexChange={(idx) => setImageViewer((prev) => prev ? { ...prev, currentIndex: idx } : null)}
          />
        )}
      </div>
    );
  }

  return (
    <>
      {imageViewer && (
        <ImageLightbox
          imageUrl={imageViewer.images[imageViewer.currentIndex]}
          alt="Ảnh chứng cứ"
          onClose={() => setImageViewer(null)}
          images={imageViewer.images.map((url) => ({ imageUrl: url }))}
          currentIndex={imageViewer.currentIndex}
          onIndexChange={(idx) => setImageViewer((prev) => prev ? { ...prev, currentIndex: idx } : null)}
        />
      )}
    </>
  );
};

export default QualityInspection;
