import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Coins, ShoppingCart, BarChart3, Star, Loader2, X,
} from 'lucide-react';
import {
  orderService,
  type OrderShopReport,
  type ShopReportOrderDay,
} from '../../services/order.service';

type PeriodKey = 'week' | 'month' | 'all';

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'week', label: 'Tuần này' },
  { key: 'month', label: 'Tháng này' },
  { key: 'all', label: 'Tất cả' },
];

const CHART_TITLES: Record<PeriodKey, string> = {
  week: 'Thống kê tuần này',
  month: 'Thống kê tháng này',
  all: '6 tháng gần nhất',
};

const STATUS_SEGMENTS = [
  { key: 'completed' as const, label: 'Hoàn thành', color: '#22c55e' },
  { key: 'processing' as const, label: 'Đang xử lý', color: '#3b82f6' },
  { key: 'cancelled' as const, label: 'Đã huỷ', color: '#ef4444' },
];

const RANK_STYLES = [
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-gray-100', text: 'text-gray-700' },
  { bg: 'bg-orange-100', text: 'text-orange-700' },
];

const CHART_HEIGHT = 120;

const fmtCurrency = (value: number) =>
  `${Number(value ?? 0).toLocaleString('vi-VN')}đ`;

const toNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const parseDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateRange = (fromDate?: string, toDate?: string) => {
  const from = parseDate(fromDate);
  const to = parseDate(toDate);
  if (from && to) {
    const fromStr = from.toLocaleDateString('vi-VN');
    const toStr = to.toLocaleDateString('vi-VN');
    return fromStr === toStr ? fromStr : `${fromStr} – ${toStr}`;
  }
  if (from) return from.toLocaleDateString('vi-VN');
  if (to) return to.toLocaleDateString('vi-VN');
  return '';
};

const getModalTitle = (day: ShopReportOrderDay | null) => {
  if (!day) return 'Chi tiết đơn hàng';
  const label = day.label?.trim();
  const range = formatDateRange(day.fromDate, day.toDate);
  if (label && range) return `${label} · ${range}`;
  if (label) return label;
  if (range) return range;
  return 'Chi tiết đơn hàng';
};

const getDayTotal = (day: ShopReportOrderDay) => {
  const total = toNumber(day?.total);
  if (total > 0) return total;
  return toNumber(day?.completed) + toNumber(day?.processing) + toNumber(day?.cancelled);
};

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color, bg }) => (
  <div className="flex-1 min-w-[140px] p-5 rounded-3xl border border-gray-100 bg-white shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{label}</p>
        <p className="text-xl font-black text-gray-900 tabular-nums">{value}</p>
      </div>
      <div className="size-11 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: bg, color }}>
        {icon}
      </div>
    </div>
  </div>
);

interface StackedBarColumnProps {
  day: ShopReportOrderDay;
  maxTotal: number;
  onSelect: (day: ShopReportOrderDay) => void;
}

const StackedBarColumn: React.FC<StackedBarColumnProps> = ({ day, maxTotal, onSelect }) => {
  const completed = toNumber(day.completed);
  const processing = toNumber(day.processing);
  const cancelled = toNumber(day.cancelled);
  const total = getDayTotal(day);
  const scale = maxTotal > 0 ? total / maxTotal : 0;
  const barHeight = total > 0 ? Math.max(scale * CHART_HEIGHT, 10) : 4;

  const segments = [
    { count: completed, color: STATUS_SEGMENTS[0].color },
    { count: processing, color: STATUS_SEGMENTS[1].color },
    { count: cancelled, color: STATUS_SEGMENTS[2].color },
  ].filter((s) => s.count > 0);

  return (
    <button
      type="button"
      onClick={() => onSelect(day)}
      className="flex-1 flex flex-col items-center gap-1 min-w-0 group"
    >
      <div className="w-full flex items-end justify-center" style={{ height: CHART_HEIGHT }}>
        <div
          className={`w-full max-w-[48px] rounded-md overflow-hidden flex flex-col justify-end transition-transform group-hover:scale-105 ${total === 0 ? 'bg-gray-200' : ''}`}
          style={{ height: barHeight }}
        >
          {segments.map((seg, idx) => (
            <div
              key={idx}
              style={{ flex: seg.count, backgroundColor: seg.color, minHeight: 2 }}
            />
          ))}
        </div>
      </div>
      <span className="text-[10px] font-bold text-gray-400 truncate w-full text-center">
        {day.label?.trim() || '—'}
      </span>
    </button>
  );
};

const FarmerRevenueReport: React.FC = () => {
  const [period, setPeriod] = useState<PeriodKey>('week');
  const [report, setReport] = useState<OrderShopReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<ShopReportOrderDay | null>(null);

  const loadReport = useCallback(async (type: PeriodKey) => {
    setLoading(true);
    setSelectedDay(null);
    try {
      const res = await orderService.getShopReport(type);
      setReport(res?.result ?? null);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport(period);
  }, [period, loadReport]);

  const chartDays = report?.reportOrderWeek ?? [];

  const maxTotal = useMemo(() => {
    if (!chartDays.length) return 0;
    return Math.max(...chartDays.map(getDayTotal), 1);
  }, [chartDays]);

  const topSold = report?.topSold ?? [];
  const avgReview = report?.averageReview != null
    ? toNumber(report.averageReview).toFixed(1)
    : '—';

  return (
    <div className="flex flex-col gap-6 p-8 animate-in fade-in duration-500 max-w-6xl">
      <div>
        <h2 className="text-3xl font-black font-display text-gray-900">Báo cáo doanh thu</h2>
        <p className="text-gray-400 font-medium text-sm mt-1">
          Doanh thu, đơn hàng và hiệu quả kinh doanh theo từng kỳ
        </p>
      </div>

      <div className="flex p-1 bg-gray-100 rounded-2xl max-w-md">
        {PERIODS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setPeriod(key)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              period === key
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[320px] gap-3">
          <Loader2 className="size-10 text-primary animate-spin" />
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Đang tải báo cáo...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              label="Doanh thu"
              value={fmtCurrency(toNumber(report?.totalRevenue))}
              icon={<Coins className="size-5" />}
              color="#16a34a"
              bg="#f0fdf4"
            />
            <StatCard
              label="Đơn hàng"
              value={String(toNumber(report?.totalOrder))}
              icon={<ShoppingCart className="size-5" />}
              color="#2563eb"
              bg="#eff6ff"
            />
            <StatCard
              label="TB/đơn"
              value={fmtCurrency(toNumber(report?.averagePrice))}
              icon={<BarChart3 className="size-5" />}
              color="#7c3aed"
              bg="#f5f3ff"
            />
            <StatCard
              label="Đánh giá"
              value={`⭐ ${avgReview}`}
              icon={<Star className="size-5" />}
              color="#d97706"
              bg="#fefce8"
            />
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-black text-gray-800 mb-4">{CHART_TITLES[period]}</h3>
            <div className="flex flex-wrap gap-4 mb-6">
              {STATUS_SEGMENTS.map((seg) => (
                <div key={seg.key} className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm" style={{ backgroundColor: seg.color }} />
                  <span className="text-xs font-semibold text-gray-500">{seg.label}</span>
                </div>
              ))}
            </div>

            {chartDays.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">Chưa có dữ liệu đơn hàng</p>
            ) : (
              <div className="flex items-end gap-2 sm:gap-3 px-2">
                {chartDays.map((day, idx) => (
                  <StackedBarColumn
                    key={`${day.label ?? 'bar'}-${day.fromDate ?? idx}-${idx}`}
                    day={day}
                    maxTotal={maxTotal}
                    onSelect={setSelectedDay}
                  />
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400 text-center mt-4">Bấm vào cột để xem chi tiết</p>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-black text-gray-800 mb-4">Top sản phẩm bán chạy</h3>
            {topSold.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Chưa có sản phẩm bán chạy</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {topSold.slice(0, 5).map((p, i) => {
                  const rank = RANK_STYLES[i] ?? RANK_STYLES[1];
                  return (
                    <div key={p.productId ?? i} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                      <div className={`size-8 rounded-full flex items-center justify-center font-black text-sm ${rank.bg} ${rank.text}`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{p.productName}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Đã bán {toNumber(p.sold)} lần</p>
                      </div>
                      <p className="text-sm font-black text-primary shrink-0">
                        {fmtCurrency(toNumber(p.price))}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {selectedDay && (
        <div
          className="fixed inset-0 z-[200] bg-black/45 flex items-center justify-center p-4"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h4 className="text-lg font-black text-gray-900">{getModalTitle(selectedDay)}</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Tổng {getDayTotal(selectedDay)} đơn
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-2 mb-6">
              {STATUS_SEGMENTS.map((seg) => (
                <div
                  key={seg.key}
                  className="flex items-center justify-between px-4 py-3 bg-[#fdfcf7] rounded-xl"
                >
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-sm" style={{ backgroundColor: seg.color }} />
                    <span className="text-sm font-semibold text-gray-700">{seg.label}</span>
                  </div>
                  <span className="text-base font-black text-gray-900">
                    {toNumber(selectedDay[seg.key])}
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerRevenueReport;
