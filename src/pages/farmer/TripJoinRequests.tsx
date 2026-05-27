import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, GitMerge, Send, Inbox, ChevronRight,
  Clock, CheckCircle, XCircle, AlertCircle, Plus,
} from 'lucide-react';
import { tripService, TripJoinRequestResponse } from '../../services';

type TabType = 'received' | 'sent';

const STATUS_CFG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  PENDING:  { label: 'Chờ duyệt', cls: 'bg-yellow-100 text-yellow-700',   icon: <Clock       className="size-3" /> },
  APPROVED: { label: 'Đã duyệt',  cls: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="size-3" /> },
  REJECTED: { label: 'Từ chối',   cls: 'bg-red-100 text-red-700',         icon: <XCircle     className="size-3" /> },
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const c = STATUS_CFG[status] ?? { label: status, cls: 'bg-gray-100 text-gray-700', icon: null };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider ${c.cls}`}>
      {c.icon}{c.label}
    </span>
  );
};

const TripJoinRequests: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab]       = useState<TabType>('received');
  const [receivedReqs, setReceivedReqs] = useState<TripJoinRequestResponse[]>([]);
  const [sentReqs, setSentReqs]         = useState<TripJoinRequestResponse[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [page, setPage]                 = useState(0);
  const [totalPages, setTotalPages]     = useState(0);

  const loadData = async (tab: TabType, p = 0) => {
    setLoading(true); setError(null);
    try {
      if (tab === 'received') {
        const r = await tripService.getReceivedJoinRequests(p, 10);
        setReceivedReqs(r.result?.content || []);
        setTotalPages(r.result?.totalPages || 0);
      } else {
        const r = await tripService.getSentJoinRequests(p, 10);
        setSentReqs(r.result?.content || []);
        setTotalPages(r.result?.totalPages || 0);
      }
    } catch { setError('Không thể tải dữ liệu. Vui lòng thử lại.'); }
    finally   { setLoading(false); }
  };

  useEffect(() => { loadData(activeTab, page); }, [activeTab, page]);

  const switchTab = (t: TabType) => { setActiveTab(t); setPage(0); };
  const requests  = activeTab === 'received' ? receivedReqs : sentReqs;

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10">
            <GitMerge className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900">Ghép đơn</h2>
            <p className="text-sm text-gray-500 mt-0.5">Quản lý các yêu cầu ghép chuyến đi.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/farmer/trip-join/send')}
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-black uppercase text-white shadow-sm hover:bg-primary/90 transition"
        >
          <Plus className="size-4" /> Gửi yêu cầu ghép đơn
        </button>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button type="button" onClick={() => switchTab('received')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition border-b-2 ${activeTab === 'received' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <Inbox className="size-4" /> Đơn nhận
        </button>
        <button type="button" onClick={() => switchTab('sent')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition border-b-2 ${activeTab === 'sent' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <Send className="size-4" /> Đơn đã gửi
        </button>
      </div>

      {error && (
        <div className="rounded-3xl border border-red-100 bg-red-50 p-4 text-red-700 flex items-start gap-3">
          <AlertCircle className="size-5 shrink-0 mt-0.5" />{error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <Loader2 className="size-10 text-primary animate-spin" />
          <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Đang tải...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 p-12 text-center">
          <GitMerge className="size-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-bold">
            {activeTab === 'received' ? 'Chưa có yêu cầu ghép đơn nào.' : 'Bạn chưa gửi yêu cầu ghép đơn nào.'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {requests.map(req => (
              <RequestCard key={req.id} request={req} isReceived={activeTab === 'received'}
                onView={() => navigate(`/farmer/trip-join/${req.id}`)}
                onRefresh={() => loadData(activeTab, page)} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="px-4 py-2 rounded-full bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition">Trước</button>
              <span className="px-4 py-2 text-sm text-gray-700">Trang {page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="px-4 py-2 rounded-full bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition">Sau</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const RequestCard: React.FC<{
  request: TripJoinRequestResponse;
  isReceived: boolean;
  onView: () => void;
  onRefresh: () => void;
}> = ({ request, isReceived, onView, onRefresh }) => {
  const [acting, setActing] = useState(false);
  const [err, setErr]       = useState<string | null>(null);

  const act = async (fn: () => Promise<any>, msg: string) => {
    setActing(true); setErr(null);
    try { await fn(); onRefresh(); }
    catch { setErr(msg); }
    finally { setActing(false); }
  };

  return (
    <div
      className={`rounded-3xl border bg-white p-5 transition ${isReceived ? 'border-primary/30 hover:border-primary hover:shadow-md cursor-pointer' : 'border-gray-200'}`}
      onClick={isReceived ? onView : undefined}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-base font-black text-gray-900">Yêu cầu #{request.id}</p>
            <StatusBadge status={request.status} />
          </div>
          <div className="grid gap-1 text-sm text-gray-600">
            <p><span className="font-bold text-gray-700">Nông dân:</span> {request.farmerName}</p>
            <p><span className="font-bold text-gray-700">Chuyến đi:</span> #{request.tripId}
              {request.trip?.warehouseName && ` → ${request.trip.warehouseName}`}</p>
            <p><span className="font-bold text-gray-700">Khối lượng:</span> {request.requestedKg?.toLocaleString('vi-VN')} kg</p>
            <p><span className="font-bold text-gray-700">Số đơn:</span> {request.orders?.length ?? 0} đơn</p>
            {request.priceOffer != null && (
              <p><span className="font-bold text-gray-700">Chi phí ước tính:</span> {Math.round(request.priceOffer).toLocaleString('vi-VN')}đ</p>
            )}
            {request.createdAt && (
              <p className="text-xs text-gray-400">Gửi lúc: {new Date(request.createdAt).toLocaleString('vi-VN')}</p>
            )}
          </div>
          {err && <p className="text-xs text-red-600 font-bold">{err}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
          {isReceived && request.status === 'PENDING' && (
            <>
              <button disabled={acting}
                onClick={() => act(() => tripService.approveJoinRequest(request.id), 'Không thể duyệt.')}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-black uppercase text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
                <CheckCircle className="size-4" /> Duyệt
              </button>
              <button disabled={acting}
                onClick={() => act(() => tripService.rejectJoinRequest(request.id), 'Không thể từ chối.')}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-red-500 px-4 py-2.5 text-sm font-black uppercase text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition">
                <XCircle className="size-4" /> Từ chối
              </button>
            </>
          )}
          {isReceived && (
            <button onClick={onView}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-gray-100 px-4 py-2.5 text-sm font-black text-gray-700 hover:bg-gray-200 transition">
              Xem chi tiết <ChevronRight className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripJoinRequests;
