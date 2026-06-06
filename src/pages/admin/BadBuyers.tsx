
import React, { useEffect, useState } from 'react';
import { UserX, Search, Bell, ShieldAlert, Zap, AlertCircle, Lock, Unlock, History, MoreHorizontal, Filter, Download, ChevronRight, XCircle, Loader2, X, Eye, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import { userService, UserResponse } from '../../services';
import Pagination, { PageInfo } from '../../components/ui/Pagination';
import { globalShowAlert, globalShowConfirm } from '../../contexts/PopupContext';

const PAGE_SIZE = 10;

const BadBuyers: React.FC = () => {
  const [buyers, setBuyers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [selectedBuyer, setSelectedBuyer] = useState<UserResponse | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    const fetchBuyers = async () => {
      setLoading(true);
      try {
        const res = await userService.getUsersByRolePaged(['BUYER'], null, page, PAGE_SIZE);
        if (res.result) {
          setPageInfo({
            page: res.result.page,
            size: res.result.size,
            totalElements: res.result.totalElements,
            totalPages: res.result.totalPages,
            first: res.result.first,
            last: res.result.last,
          });
          setBuyers(res.result.content || []);
        }
      } catch (err) {
        console.error('Failed to load buyers', err);
        setError('Không thể tải danh sách người mua.');
      } finally {
        setLoading(false);
      }
    };
    fetchBuyers();
  }, [page]);

  const handleBlock = async (userId: number) => {
    if (!await globalShowConfirm('Xác nhận', 'Bạn có chắc muốn khóa tài khoản này?')) return;
    setProcessing(userId);
    try {
      await userService.deactivateUser(userId);
      setBuyers(prev => prev.map(b => b.id === userId ? { ...b, status: 'INACTIVE' } : b));
    } catch (err: any) {
      globalShowAlert(err?.data?.message || 'Không thể khóa tài khoản', 'Lỗi', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const handleViewProfile = async (userId: number) => {
    setModalLoading(true);
    setSelectedBuyer(null);
    try {
      const response = await userService.getUserById(userId);
      setSelectedBuyer(response.result || null);
    } catch (err) {
      globalShowAlert('Không thể tải thông tin người dùng. Vui lòng thử lại.', 'Lỗi', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedBuyer(null);
    setModalLoading(false);
  };

  const handleUnblock = async (userId: number) => {
    setProcessing(userId);
    try {
      await userService.activateUser(userId);
      setBuyers(prev => prev.map(b => b.id === userId ? { ...b, status: 'ACTIVE' } : b));
    } catch (err: any) {
      globalShowAlert(err?.data?.message || 'Không thể mở khóa tài khoản', 'Lỗi', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const blockedBuyers = buyers.filter(b => b.lockedAt != null || b.status === 'INACTIVE');
  const activeBuyers = buyers.filter(b => b.lockedAt == null && b.status === 'ACTIVE');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <Loader2 className="size-10 text-primary animate-spin" />
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Đang tải danh sách người mua...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-500">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'TỔNG TÀI KHOẢN BỊ KHÓA', value: blockedBuyers.length.toLocaleString(), sub: 'Đã bị vô hiệu hóa', icon: UserX, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'ĐANG HOẠT ĐỘNG', value: activeBuyers.length.toLocaleString(), sub: 'Tài khoản bình thường', icon: ShieldAlert, color: 'text-orange-500', bg: 'bg-orange-50' },
          { label: 'TỔNG NGƯỜI MUA', value: buyers.length.toLocaleString(), sub: 'Tất cả trạng thái', icon: Unlock, color: 'text-blue-500', bg: 'bg-blue-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[40px] border border-gray-100 shadow-sm flex items-center gap-4 group">
            <div className={`size-14 ${stat.bg} ${stat.color} rounded-[24px] flex items-center justify-center transition-transform group-hover:scale-110 shrink-0`}>
              <stat.icon className="size-7" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 line-clamp-2">{stat.label}</p>
              <h3 className="text-3xl font-black text-gray-900 font-display">{stat.value}</h3>
              <p className={`text-[9px] font-bold mt-1 ${stat.color} opacity-80`}>{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600 font-bold text-sm">
          <AlertCircle className="size-5" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Buyers Table */}
        <div className="lg:col-span-2 bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-10 py-8 border-b border-gray-50 flex items-center justify-between">
            <h4 className="font-black text-gray-800 uppercase tracking-tight">DANH SÁCH NGƯỜI MUA ({buyers.length})</h4>
            <div className="flex gap-3">
              <button className="px-5 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-black text-gray-500 flex items-center gap-2 uppercase tracking-widest"><Filter className="size-3" /> Lọc</button>
              <button className="px-5 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-black text-gray-500 flex items-center gap-2 uppercase tracking-widest"><Download className="size-3" /> Xuất</button>
            </div>
          </div>
          <table className="w-full text-left" style={{ tableLayout: 'fixed' }}>
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-10 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Người dùng</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Trạng thái</th>
                <th className="px-10 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Thao tác</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {buyers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-10 py-10 text-center text-gray-400 font-bold">Không có người mua nào.</td>
                </tr>
              ) : buyers.map((user, i) => {
                const isBlocked = user.lockedAt != null || user.status === 'INACTIVE';
                return (
                  <tr key={user.id} className={`hover:bg-gray-50/30 transition-colors ${isBlocked ? 'bg-red-50/20' : ''}`}>
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="size-11 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                          {isBlocked ? <Lock className="size-5 text-red-500" /> : <span className="material-symbols-outlined">person</span>}
                        </div>
                        <div>
                          <p className={`text-sm font-black ${isBlocked ? 'text-red-700' : 'text-gray-900'}`}>{user.fullName || user.username || 'N/A'}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">ID: {user.id}</p>
                          {user.lockedAt && <p className="text-[10px] text-red-400 font-bold mt-0.5">Khóa lúc: {new Date(user.lockedAt).toLocaleString('vi-VN')}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${isBlocked ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                        {isBlocked ? 'Đã khóa' : 'Hoạt động'}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex items-center justify-end gap-4">
                        {isBlocked ? (
                          <button onClick={() => handleUnblock(user.id)} disabled={processing === user.id} className="px-6 py-2 border border-blue-100 text-blue-600 text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-blue-50 transition-colors disabled:opacity-50">Mở khóa</button>
                        ) : (
                          <button onClick={() => handleBlock(user.id)} disabled={processing === user.id} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline disabled:opacity-50">CHẶN</button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <button
                        onClick={() => handleViewProfile(user.id)}
                        className="size-9 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors mx-auto"
                        title="Xem chi tiết"
                      >
                        <Eye className="size-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="p-8 bg-white border-t border-gray-50 flex items-center justify-between">
            <p className="text-xs text-gray-400 font-medium">Hiển thị {buyers.length} người mua</p>
          </div>
          {pageInfo && <Pagination pageInfo={pageInfo} onPageChange={setPage} className="px-8" />}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-8">
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10 flex flex-col gap-8">
            <div className="flex items-center gap-3">
              <Zap className="size-6 text-orange-500" />
              <h4 className="font-black text-gray-800 uppercase tracking-tight">Quy tắc tự động khóa</h4>
            </div>
            <div className="space-y-8">
              {[
                { id: 1, text: 'Tự động gắn cờ Cảnh báo khi người mua có 2 đơn "bom" (hủy hàng khi giao) trong 30 ngày.' },
                { id: 2, text: 'Tự động Khóa tài khoản 7 ngày nếu phát sinh đơn bom thứ 3.' },
                { id: 3, text: 'Khóa vĩnh viễn đối với tài khoản có tỉ lệ nhận hàng < 30% sau 10 đơn hàng đầu tiên.' },
              ].map((rule) => (
                <div key={rule.id} className="flex gap-4">
                  <span className="size-6 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-[10px] font-black shrink-0">{rule.id}</span>
                  <p className="text-sm font-medium text-gray-600 leading-relaxed">{rule.text}</p>
                </div>
              ))}
            </div>
            <button className="w-full py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors">Điều chỉnh cấu hình quy tắc</button>
          </div>

          <div className="bg-gray-900 rounded-[40px] p-10 flex flex-col gap-8 text-white">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-orange-400">campaign</span>
              <h4 className="font-black uppercase tracking-tight">Thao tác quản trị viên</h4>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Gửi cảnh báo hàng loạt', sub: 'Áp dụng cho đối tượng 2 đơn bom', icon: ShieldAlert, color: 'text-orange-400' },
                { label: 'Quét tài khoản ảo', sub: 'Hệ thống AI nhận diện theo IP/SĐT', icon: XCircle, color: 'text-red-400' },
                { label: 'Lịch sử mở khóa', sub: 'Xem lại các trường hợp được ân xá', icon: History, color: 'text-blue-400' },
              ].map((action, i) => (
                <button key={i} className="w-full p-6 bg-white/5 border border-white/10 rounded-3xl flex items-center gap-5 hover:bg-white/10 transition-all text-left">
                  <div className={`size-10 ${action.color} bg-white/10 rounded-2xl flex items-center justify-center`}>
                    <action.icon className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black tracking-tight">{action.label}</p>
                    <p className="text-[10px] opacity-40 font-bold mt-1 uppercase tracking-widest">{action.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Buyer Detail Modal */}
      {(selectedBuyer || modalLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {modalLoading ? (
              <div className="p-16 text-center">
                <div className="inline-block size-10 border-4 border-gray-200 border-t-primary rounded-full animate-spin mb-4" />
                <p className="text-sm font-bold text-gray-400">Đang tải thông tin...</p>
              </div>
            ) : selectedBuyer && (
              <>
                <button
                  onClick={closeModal}
                  className="absolute top-6 right-6 size-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors z-10"
                >
                  <X className="size-5" />
                </button>

                {/* Header */}
                <div className="p-10 border-b border-gray-100">
                  <div className="flex items-center gap-6">
                    <div className="size-20 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                      {(selectedBuyer.lockedAt != null || selectedBuyer.status === 'INACTIVE')
                        ? <Lock className="size-9 text-red-500" />
                        : <span className="material-symbols-outlined text-[40px]">person</span>
                      }
                    </div>
                    <div>
                      <span className={`inline-block mb-2 text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest ${
                        selectedBuyer.status === 'ACTIVE' ? 'bg-green-50 text-green-600' :
                        selectedBuyer.status === 'INACTIVE' ? 'bg-red-50 text-red-500' :
                        'bg-orange-50 text-orange-600'
                      }`}>
                        {selectedBuyer.status === 'ACTIVE' ? 'Hoạt động' :
                         selectedBuyer.status === 'INACTIVE' ? 'Đã khóa' : 'Chờ duyệt'}
                      </span>
                      <h3 className="text-2xl font-black text-gray-900 tracking-tight">{selectedBuyer.fullName || selectedBuyer.username || 'N/A'}</h3>
                      <p className="text-gray-400 font-bold text-xs mt-1 uppercase tracking-widest">Người mua · ID: #{selectedBuyer.id}</p>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-10 space-y-6 max-h-[55vh] overflow-y-auto">
                  <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Mail className="size-3.5" /> Thông tin liên hệ
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">EMAIL</p>
                        <p className="font-bold text-gray-900 mt-1 text-sm truncate" title={selectedBuyer.email}>{selectedBuyer.email || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">SỐ ĐIỆN THOẠI</p>
                        <p className="font-bold text-gray-900 mt-1 text-sm">{selectedBuyer.phoneNumber || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mt-3">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ĐỊA CHỈ</p>
                      <p className="font-bold text-gray-900 mt-1 text-sm">{selectedBuyer.address || 'Chưa cung cấp'}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Calendar className="size-3.5" /> Thông tin tài khoản
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">NGÀY TẠO</p>
                        <p className="font-bold text-gray-900 mt-1 text-sm">
                          {selectedBuyer.createdAt || selectedBuyer.createAt
                            ? new Date(selectedBuyer.createdAt || selectedBuyer.createAt!).toLocaleDateString('vi-VN')
                            : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">VAI TRÒ</p>
                        <p className="font-bold text-gray-900 mt-1 text-sm">{selectedBuyer.role?.description || selectedBuyer.role?.name || 'BUYER'}</p>
                      </div>
                    </div>
                    {selectedBuyer.lockedAt && (
                      <div className="bg-red-50 p-4 rounded-2xl border border-red-100 mt-3">
                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">THỜI GIAN BỊ KHÓA</p>
                        <p className="font-bold text-red-700 mt-1 text-sm">{new Date(selectedBuyer.lockedAt).toLocaleString('vi-VN')}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                  <button
                    onClick={closeModal}
                    className="px-6 py-3 bg-white border border-gray-200 text-gray-700 text-xs font-black rounded-2xl uppercase tracking-widest hover:bg-gray-50 transition-all"
                  >
                    Đóng lại
                  </button>
                  {(selectedBuyer.lockedAt != null || selectedBuyer.status === 'INACTIVE') ? (
                    <button
                      onClick={() => { handleUnblock(selectedBuyer.id); closeModal(); }}
                      className="px-8 py-3 bg-blue-600 text-white text-xs font-black rounded-2xl uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                    >
                      Mở khóa
                    </button>
                  ) : (
                    <button
                      onClick={() => { handleBlock(selectedBuyer.id); closeModal(); }}
                      className="px-8 py-3 bg-red-500 text-white text-xs font-black rounded-2xl uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                    >
                      Khóa tài khoản
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BadBuyers;
