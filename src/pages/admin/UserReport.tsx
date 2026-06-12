import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users,
  Store,
  ShoppingBag,
  UserCheck,
  UserX,
  Lock,
  Clock,
  Loader2,
  RefreshCw,
  AlertCircle,
  BarChart3,
  TrendingUp,
  CalendarRange,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  userService,
  AdminUserReport,
  AdminUserReportType,
} from '../../services';

type PeriodPreset = AdminUserReportType | 'custom';

const PERIOD_OPTIONS: { id: PeriodPreset; label: string }[] = [
  { id: 'week', label: '7 ngày' },
  { id: 'month', label: '1 tháng' },
  { id: 'year', label: '1 năm' },
  { id: 'all', label: 'Toàn bộ' },
  { id: 'custom', label: 'Tùy chọn' },
];

const toInputDate = (d: Date) => d.toISOString().slice(0, 10);

const defaultCustomRange = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: toInputDate(from), to: toInputDate(to) };
};

const CHART_COLORS = {
  buyers: '#10b981',
  shops: '#3b82f6',
  locked: '#ef4444',
};

const PIE_COLORS = ['#10b981', '#94a3b8', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const fmt = (n?: number | null) => (n ?? 0).toLocaleString('vi-VN');

type ChartViewType = 'column' | 'line';

const UserReport: React.FC = () => {
  const [report, setReport] = useState<AdminUserReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartView, setChartView] = useState<ChartViewType>('column');
  const [period, setPeriod] = useState<PeriodPreset>('month');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [appliedRange, setAppliedRange] = useState<{ from: string; to: string } | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let res;
      if (period === 'custom') {
        if (!appliedRange) {
          setLoading(false);
          return;
        }
        if (appliedRange.from > appliedRange.to) {
          setError('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
          setLoading(false);
          return;
        }
        res = await userService.generateAdminUserReport({
          from: appliedRange.from,
          to: appliedRange.to,
        });
      } else {
        res = await userService.generateAdminUserReport({ type: period });
      }
      setReport(res.result ?? null);
    } catch (err: any) {
      console.error('Failed to load user report', err);
      setError(err?.data?.message || 'Không thể tải báo cáo người dùng.');
    } finally {
      setLoading(false);
    }
  }, [period, appliedRange]);

  useEffect(() => {
    if (period === 'custom' && !appliedRange) return;
    fetchReport();
  }, [fetchReport, period, appliedRange]);

  const handlePeriodChange = (next: PeriodPreset) => {
    setPeriod(next);
    setError(null);
    if (next === 'custom') {
      const range = defaultCustomRange();
      setFromDate(range.from);
      setToDate(range.to);
      setAppliedRange(range);
    } else {
      setAppliedRange(null);
    }
  };

  const handleApplyCustomRange = () => {
    if (!fromDate || !toDate) {
      setError('Vui lòng chọn đủ ngày bắt đầu và ngày kết thúc.');
      return;
    }
    if (fromDate > toDate) {
      setError('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
      return;
    }
    setError(null);
    setAppliedRange({ from: fromDate, to: toDate });
  };

  const chartData = useMemo(
    () =>
      (report?.userReports ?? []).map((item) => ({
        label: item.label || '',
        buyers: item.totalBuyers ?? 0,
        shops: item.totalShops ?? 0,
        locked: item.totalUserLock ?? 0,
      })),
    [report?.userReports]
  );

  const rolePieData = useMemo(() => {
    const totalUsers = report?.totalUsers ?? 0;
    const buyers = report?.totalBuyers ?? 0;
    const shops = report?.totalShops ?? 0;
    const others = Math.max(0, totalUsers - buyers - shops);
    return [
      { name: 'Người mua', value: buyers, color: PIE_COLORS[0] },
      { name: 'Cửa hàng', value: shops, color: PIE_COLORS[1] },
      { name: 'Khác', value: others, color: PIE_COLORS[2] },
    ].filter((d) => d.value > 0);
  }, [report]);

  const statusPieData = useMemo(
    () =>
      [
        { name: 'Hoạt động', value: report?.totalActiveUsers ?? 0, color: PIE_COLORS[0] },
        { name: 'Không hoạt động', value: report?.totalInactiveUsers ?? 0, color: PIE_COLORS[2] },
        { name: 'Chờ duyệt', value: report?.totalShopPending ?? 0, color: PIE_COLORS[3] },
        { name: 'Bị khóa', value: report?.totalUserLock ?? 0, color: PIE_COLORS[4] },
      ].filter((d) => d.value > 0),
    [report]
  );

  const shopPieData = useMemo(
    () =>
      [
        { name: 'Đang bán', value: report?.totalShopSelling ?? 0, color: PIE_COLORS[0] },
        { name: 'Tạm nghỉ', value: report?.totalShopNotSelling ?? 0, color: PIE_COLORS[2] },
      ].filter((d) => d.value > 0),
    [report]
  );

  const statCards = [
    { label: 'Tổng người dùng', value: report?.totalUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Người mua', value: report?.totalBuyers, icon: ShoppingBag, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Cửa hàng', value: report?.totalShops, icon: Store, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Đang hoạt động', value: report?.totalActiveUsers, icon: UserCheck, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Không hoạt động', value: report?.totalInactiveUsers, icon: UserX, color: 'text-gray-600', bg: 'bg-gray-50' },
    { label: 'Chờ duyệt KYC', value: report?.totalShopPending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Cửa hàng đang bán', value: report?.totalShopSelling, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Cửa hàng tạm nghỉ', value: report?.totalShopNotSelling, icon: Store, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Tài khoản bị khóa', value: report?.totalUserLock, icon: Lock, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  if (loading && !report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <Loader2 className="size-10 text-primary animate-spin" />
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Đang tải báo cáo...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <BarChart3 className="size-7 text-primary" />
            Báo cáo người dùng
          </h1>
          <p className="text-sm text-gray-400 mt-1">Thống kê tăng trưởng người mua, cửa hàng và tài khoản bị khóa</p>
        </div>
        <button
          type="button"
          onClick={fetchReport}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gray-50 text-gray-600 font-bold text-sm hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600">
          <AlertCircle className="size-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm flex items-center gap-4"
          >
            <div className={`p-3 rounded-2xl ${card.bg}`}>
              <card.icon className={`size-6 ${card.color}`} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{card.label}</p>
              <p className="text-2xl font-black text-gray-900">{fmt(card.value)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Phân bổ vai trò', data: rolePieData },
          { title: 'Trạng thái tài khoản', data: statusPieData },
          { title: 'Trạng thái cửa hàng', data: shopPieData },
        ].map((pie) => {
          const total = pie.data.reduce((sum, d) => sum + d.value, 0);
          return (
            <div key={pie.title} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
              <h2 className="text-base font-black text-gray-900 mb-4">{pie.title}</h2>
              {pie.data.length > 0 ? (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                      <Pie
                        data={pie.data}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                      >
                        {pie.data.map((entry, i) => (
                          <Cell key={entry.name} fill={entry.color ?? PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => [fmt(value), name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="w-full mt-3 space-y-2">
                    {pie.data.map((item) => {
                      const pct = total ? Math.round((item.value / total) * 100) : 0;
                      return (
                        <li key={item.name} className="flex items-center justify-between gap-3 text-sm">
                          <span className="flex items-center gap-2 min-w-0">
                            <span
                              className="size-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-gray-600 font-medium truncate">{item.name}</span>
                          </span>
                          <span className="font-bold text-gray-800 shrink-0">
                            {pct}% <span className="text-gray-400 font-medium">({fmt(item.value)})</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">Không có dữ liệu</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
        <div className="flex flex-wrap gap-2 mb-4">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handlePeriodChange(opt.id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                period === opt.id
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex flex-wrap items-end gap-4 pt-2 border-t border-gray-50">
            <label className="flex flex-col gap-1.5 min-w-[160px]">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Từ ngày</span>
              <input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium outline-none focus:ring-4 focus:ring-primary/10"
              />
            </label>
            <label className="flex flex-col gap-1.5 min-w-[160px]">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Đến ngày</span>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                max={toInputDate(new Date())}
                onChange={(e) => setToDate(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium outline-none focus:ring-4 focus:ring-primary/10"
              />
            </label>
            <button
              type="button"
              onClick={handleApplyCustomRange}
              disabled={!fromDate || !toDate || loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              <CalendarRange className="size-4" />
              Áp dụng
            </button>
            {appliedRange && (
              <p className="text-xs text-gray-400 font-medium pb-2.5">
                Đang xem: {appliedRange.from} → {appliedRange.to}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-black text-gray-900 mb-1">Tăng trưởng theo thời gian</h2>
            <p className="text-xs text-gray-400">Số lượng đăng ký mới và tài khoản bị khóa trong từng kỳ</p>
          </div>
          <label className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kiểu biểu đồ</span>
            <select
              value={chartView}
              onChange={(e) => setChartView(e.target.value as ChartViewType)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-bold text-gray-700 outline-none focus:ring-4 focus:ring-primary/10 cursor-pointer"
            >
              <option value="column">Cột</option>
              <option value="line">Đường</option>
            </select>
          </label>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={360}>
            {chartView === 'column' ? (
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #f1f5f9', fontSize: 13 }}
                  formatter={(value: number) => [fmt(value), '']}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="buyers" name="Người mua mới" fill={CHART_COLORS.buyers} radius={[6, 6, 0, 0]} />
                <Bar dataKey="shops" name="Cửa hàng mới" fill={CHART_COLORS.shops} radius={[6, 6, 0, 0]} />
                <Bar dataKey="locked" name="Bị khóa" fill={CHART_COLORS.locked} radius={[6, 6, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #f1f5f9', fontSize: 13 }}
                  formatter={(value: number) => [fmt(value), '']}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line type="monotone" dataKey="buyers" name="Người mua mới" stroke={CHART_COLORS.buyers} strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="shops" name="Cửa hàng mới" stroke={CHART_COLORS.shops} strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="locked" name="Bị khóa" stroke={CHART_COLORS.locked} strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="h-[360px] flex items-center justify-center text-gray-400 text-sm">Chưa có dữ liệu biểu đồ</div>
        )}
      </div>
    </div>
  );
};

export default UserReport;
