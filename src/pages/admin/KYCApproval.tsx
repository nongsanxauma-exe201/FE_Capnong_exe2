import React, { useEffect, useState } from 'react';
import { ShieldCheck, UserCheck, CheckCircle, Search, Bell, Info, ChevronLeft, ChevronRight, FileText, Landmark, AlertCircle } from 'lucide-react';
import { userService, UserResponse } from '../../services';
import Pagination, { PageInfo } from '../../components/ui/Pagination';

const PAGE_SIZE = 10;
const URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const KYCApproval: React.FC = () => {
  const [pendingUsers, setPendingUsers] = useState<UserResponse[]>([]);
  const [approvedCount, setApprovedCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [viewingUser, setViewingUser] = useState<UserResponse | null>(null);
  const [page, setPage] = useState(0);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const [pendingRes, approvedRes] = await Promise.all([
          userService.getUsersByRolePaged(['SHOP_OWNER', 'SHIPPER'], 'PENDING', page, PAGE_SIZE),
          userService.getUsersByRolePaged(['SHOP_OWNER', 'SHIPPER'], 'ACTIVE', 0, 1),
        ]);
        if (pendingRes.result) {
          setPageInfo({
            page: pendingRes.result.page,
            size: pendingRes.result.size,
            totalElements: pendingRes.result.totalElements,
            totalPages: pendingRes.result.totalPages,
            first: pendingRes.result.first,
            last: pendingRes.result.last,
          });
          setPendingUsers(pendingRes.result.content || []);
        }
        if (approvedRes.result) {
          setApprovedCount(approvedRes.result.totalElements);
        }
      } catch (err) {
        console.error('Failed to load users for KYC', err);
        setError('Không thể tải danh sách hồ sơ KYC. Vui lòng kiểm tra quyền Admin hoặc thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [page]);

  const handleApprove = async (userId: number, roleName: string) => {
    setApprovingId(userId);
    setError(null);
    try {
      let response;
      if (roleName === 'SHOP_OWNER') {
        response = await userService.approveShopOwner(userId);
      } else {
        response = await userService.approveShipper(userId);
      }

      const updated = response.result;
      if (updated) {
        setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      }
    } catch (err) {
      console.error('Failed to approve user', err);
      setError('Duyệt hồ sơ thất bại. Vui lòng thử lại sau.');
    } finally {
      setApprovingId(null);
    }
  };

  // Helper to get image full URL
  const getImageUrl = (path?: string) => {
    if (!path) return 'https://picsum.photos/seed/user_placeholder/100/100';
    if (path.startsWith('http')) return path;
    // Tạm giả định BE serve static files tại root hoặc theo path cụ thể
    // Nếu BE dùng /images/... hoặc tương tự thì cần điều chỉnh ở đây
    
    return `URL/${path}`;
  };

  return (
    <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black font-display text-gray-900 uppercase">Duyệt Hồ Sơ (KYC)</h2>
          <p className="text-gray-400 font-medium text-sm mt-1">Xác minh danh tính người bán và shipper để đảm bảo chất lượng hệ thống.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white p-4 rounded-[28px] border border-gray-100 shadow-sm flex items-center gap-4 pr-10">
            <div className="size-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined">assignment_ind</span>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CHỜ DUYỆT</p>
              <h4 className="text-xl font-black text-gray-900">
                {loading ? '...' : pendingUsers.length}
              </h4>
            </div>
          </div>
          <div className="bg-white p-4 rounded-[28px] border border-gray-100 shadow-sm flex items-center gap-4 pr-10">
            <div className="size-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined">verified_user</span>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ĐÃ DUYỆT </p>
              <h4 className="text-xl font-black text-gray-900">
                {loading ? '...' : approvedCount}
              </h4>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 rounded-[32px] border border-red-100 shadow-sm px-6 py-4 text-sm text-red-700 flex items-center gap-3">
          <AlertCircle className="size-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-10 py-8 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h4 className="font-black text-gray-800 uppercase tracking-tight">Danh sách hồ sơ cần duyệt</h4>
            <span className="px-3 py-1 bg-gray-100 text-gray-400 text-[10px] font-black rounded-full uppercase">
              {pendingUsers.length} hồ sơ
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-10 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Người dùng / Vai trò</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Thông tin liên hệ</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Hồ sơ / Chứng chỉ</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Trạng thái</th>
                <th className="px-10 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-10 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Search className="size-10 text-gray-200 animate-pulse" />
                      <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Đang tải danh sách hồ sơ...</p>
                    </div>
                  </td>
                </tr>
              ) : pendingUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-10 py-20 text-sm text-gray-400 text-center font-medium">
                    <div className="flex flex-col items-center gap-4">
                      <CheckCircle className="size-10 text-emerald-100" />
                      <p className="uppercase font-black tracking-widest text-xs">Phù! Đã xử lý hết tất cả hồ sơ.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                pendingUsers.map((u, index) => (
                  <tr key={u.id ?? index} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <img src={getImageUrl(u.logoUrl)} className="size-12 rounded-2xl object-cover shadow-sm bg-gray-100" alt="Avatar" />
                        <div>
                          <p className="text-sm font-black text-gray-900 leading-none mb-1">
                            {u.fullName || 'N/A'}
                          </p>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${u.role?.name === 'SHOP_OWNER' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                            }`}>
                            {u.role?.name === 'SHOP_OWNER' ? 'Nhà vườn' : 'Shipper'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <p className="text-xs font-bold text-gray-700">{u.email}</p>
                      <p className="text-[10px] text-gray-400 font-medium mt-1">{u.phoneNumber || 'Không có phone'}</p>
                      <p className="text-[10px] text-gray-400 font-medium line-clamp-1">{u.address || 'Không có địa chỉ'}</p>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <div className="flex flex-col items-center gap-2">
                        {u.role?.name === 'SHIPPER' ? (
                          <>
                            {u.licenseImageUrl ? (
                              <a
                                href={getImageUrl(u.licenseImageUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 text-primary text-[10px] font-black rounded-lg hover:bg-primary/10 transition-all uppercase"
                              >
                                <FileText className="size-3" /> Xem bằng lái
                              </a>
                            ) : (
                              <span className="text-[10px] text-gray-300 font-bold italic">Chưa tải bằng lái</span>
                            )}
                            {u.logoUrl && (
                              <a
                                href={getImageUrl(u.logoUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] text-gray-400 hover:text-primary underline font-bold"
                              >
                                Xem ảnh chân dung
                              </a>
                            )}
                          </>
                        ) : (
                          <>
                            {u.achievement ? (
                              <a
                                href={getImageUrl(u.achievement)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 text-primary text-[10px] font-black rounded-lg hover:bg-primary/10 transition-all uppercase"
                              >
                                <FileText className="size-3" /> Xem chứng chỉ
                              </a>
                            ) : (
                              <span className="text-[10px] text-gray-300 font-bold italic">Chưa tải lên</span>
                            )}
                            {u.logoUrl && (
                              <a
                                href={getImageUrl(u.logoUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] text-gray-400 hover:text-primary underline font-bold"
                              >
                                Xem ảnh đại diện gốc
                              </a>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-yellow-400 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-yellow-600">
                          {u.status === 'INACTIVE' ? 'Tạm ngưng' : u.status === 'PENDING' ? 'Chờ duyệt' : u.status === 'ACTIVE' ? 'Hoạt động' : 'Chờ duyệt'}
                        </span>
                      </div>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewingUser(u)}
                          className="px-4 py-3 bg-gray-100 text-gray-700 text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-gray-200 transition-all shadow-sm"
                        >
                          XEM CHI TIẾT
                        </button>
                        <button
                          onClick={() => u.id && u.role?.name && handleApprove(u.id, u.role.name)}
                          disabled={!!approvingId}
                          className="px-4 py-3 bg-emerald-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
                        >
                          {approvingId === u.id ? 'ĐANG XỬ LÝ...' : 'DUYỆT NGAY'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pageInfo && <Pagination pageInfo={pageInfo} onPageChange={setPage} className="px-10" />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[40px] border border-gray-100 shadow-sm p-12 relative overflow-hidden">
          <div className="flex items-center gap-4 mb-10">
            <div className="size-14 bg-orange-50 text-orange-600 rounded-3xl flex items-center justify-center shadow-inner">
              <Info className="size-7" />
            </div>
            <div className="flex-1">
              <h4 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Quy trình xác minh (KYC)</h4>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">HƯỚNG DẪN CHO ADMIN</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 bg-gray-50/30 rounded-[32px] border border-gray-100/50 hover:bg-white hover:shadow-md transition-all group">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                <ShieldCheck className="size-4" /> BƯỚC 1: ĐỐI CHIẾU
              </p>
              <p className="text-sm font-medium text-gray-500 leading-relaxed italic group-hover:text-gray-700 transition-colors">
                Kiểm tra sự trùng khớp giữa Tên hiển thị, Số điện thoại và các thông tin trên Chứng chỉ/Giấy phép đã tải lên.
              </p>
            </div>
            <div className="p-8 bg-gray-50/30 rounded-[32px] border border-gray-100/50 hover:bg-white hover:shadow-md transition-all group">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                <UserCheck className="size-4" /> BƯỚC 2: QUYẾT ĐỊNH
              </p>
              <p className="text-sm font-medium text-gray-500 leading-relaxed italic group-hover:text-gray-700 transition-colors">
                Nếu hồ sơ hợp lệ, bấm "DUYỆT NGAY" để cấp quyền bán hàng hoặc vận chuyển cho người dùng trên hệ thống.
              </p>
            </div>
          </div>
          <div className="absolute -top-20 -right-20 size-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        </div>

        <div className="lg:col-span-1 rounded-[40px] bg-gray-900 p-10 flex flex-col justify-between text-white relative overflow-hidden shadow-2xl group">
          <div className="relative z-10">
            <Landmark className="size-12 text-primary mb-6 group-hover:scale-110 transition-transform duration-500" />
            <h3 className="text-3xl font-black font-display leading-[1.1] mb-4">Cam kết chất lượng nông sản</h3>
            <p className="text-gray-400 text-sm font-medium leading-relaxed">
              Hệ thống XẤU MÃ chỉ chấp nhận những nhà vườn cam kết quy trình trồng sạch, dù ngoại hình nông sản có thể không đạt chuẩn siêu thị.
            </p>
          </div>
          <div className="pt-10 relative z-10">
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle className="size-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Đã xác minh 1,240 nhà vườn</span>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-50" />
        </div>
      </div>
      {/* Modal chi tiết hồ sơ */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm shadow-2xl animate-in fade-in">
          <div className="bg-white rounded-[40px] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button
              onClick={() => setViewingUser(null)}
              className="absolute top-6 right-6 size-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="p-10 border-b border-gray-100">
              <div className="flex items-center gap-6">
                <img src={getImageUrl(viewingUser.logoUrl)} className="size-24 rounded-3xl object-cover shadow-md bg-gray-50" alt="Avatar" />
                <div>
                  <span className={`inline-block mb-2 text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest ${viewingUser.role?.name === 'SHOP_OWNER' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                    {viewingUser.role?.name === 'SHOP_OWNER' ? 'Nhà vườn' : 'Shipper'}
                  </span>
                  <h3 className="text-3xl font-black text-gray-900 tracking-tight">{viewingUser.fullName || 'Người dùng Xấu Mã'}</h3>
                  <p className="text-gray-500 font-medium text-sm mt-1">{viewingUser.email}</p>
                </div>
              </div>
            </div>

            <div className="p-10 space-y-8">
              {/* Thông tin liên hệ */}
              <div>
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">contact_phone</span> Thông tin liên hệ
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">SỐ ĐIỆN THOẠI</p>
                    <p className="font-bold text-gray-900 mt-1">{viewingUser.phoneNumber || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ĐỊA CHỈ</p>
                    <p className="font-bold text-gray-900 mt-1">{viewingUser.address || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Thông tin Cửa hàng / Shipper */}
              <div>
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">{viewingUser.role?.name === 'SHOP_OWNER' ? 'store' : 'local_shipping'}</span>
                  {viewingUser.role?.name === 'SHOP_OWNER' ? 'Thông tin cửa hàng' : 'Thông tin hoạt động'}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {viewingUser.role?.name === 'SHOP_OWNER' ? (
                    <>
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">TÊN CỬA HÀNG</p>
                        <p className="font-bold text-gray-900 mt-1">{viewingUser.shopName || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">MÔ TẢ</p>
                        <p className="font-bold text-gray-900 mt-1 line-clamp-2">{viewingUser.description || 'N/A'}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">BẰNG LÁI / CCCD</p>
                        <p className="font-bold text-gray-900 mt-1">{viewingUser.license || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">BIỂN SỐ XE</p>
                        <p className="font-bold text-gray-900 mt-1">{viewingUser.vehicleNumber || 'N/A'}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Ngân hàng */}
              <div>
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">account_balance</span> Thông tin thanh toán
                </h4>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">NGÂN HÀNG</p>
                      <p className="font-bold text-gray-900 mt-1">{viewingUser.bankName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">SỐ TÀI KHOẢN</p>
                      <p className="font-bold text-gray-900 mt-1">{viewingUser.bankAccount || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CHỦ TÀI KHOẢN</p>
                      <p className="font-bold text-gray-900 mt-1">{viewingUser.bankAccountHolder || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Giấy tờ chứng chỉ */}
              <div>
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">folder_open</span> Tài liệu đính kèm
                </h4>
                {viewingUser.role?.name === 'SHIPPER' ? (
                  (() => {
                    const docs = [
                      { url: viewingUser.licenseImageUrl, label: 'Bằng lái xe / CCCD' },
                      { url: viewingUser.logoUrl, label: 'Ảnh chân dung' },
                      { url: viewingUser.vehicleDocImageUrl, label: 'Giấy tờ xe' },
                    ].filter((d) => d.url);
                    if (docs.length === 0) {
                      return (
                        <div className="bg-gray-50 border border-gray-100 border-dashed rounded-2xl p-6 text-center">
                          <p className="text-gray-400 font-bold text-sm">Chưa tải lên chứng chỉ/hoặc giấy phép</p>
                        </div>
                      );
                    }
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {docs.map((doc) => (
                          <a key={doc.label} href={getImageUrl(doc.url)} target="_blank" rel="noopener noreferrer" className="block w-full">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{doc.label}</p>
                            <div className="h-40 w-full bg-gray-100 rounded-2xl border border-gray-200 overflow-hidden relative group">
                              <img src={getImageUrl(doc.url)} className="w-full h-full object-contain bg-white group-hover:scale-105 transition-transform duration-500" alt={doc.label} />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-white font-bold bg-black/50 px-4 py-2 rounded-full backdrop-blur-md flex items-center gap-2 text-xs">
                                  <span className="material-symbols-outlined text-sm">open_in_new</span> Xem đầy đủ
                                </span>
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    );
                  })()
                ) : viewingUser.achievement ? (
                  <a href={getImageUrl(viewingUser.achievement)} target="_blank" rel="noopener noreferrer" className="block w-full">
                    <div className="h-48 w-full bg-gray-100 rounded-2xl border border-gray-200 overflow-hidden relative group">
                      <img src={getImageUrl(viewingUser.achievement)} className="w-full h-full object-contain bg-white group-hover:scale-105 transition-transform duration-500" alt="Chứng chỉ" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white font-bold bg-black/50 px-4 py-2 rounded-full backdrop-blur-md flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">open_in_new</span> Mở xem toàn màn hình
                        </span>
                      </div>
                    </div>
                  </a>
                ) : (
                  <div className="bg-gray-50 border border-gray-100 border-dashed rounded-2xl p-6 text-center">
                    <p className="text-gray-400 font-bold text-sm">Chưa tải lên chứng chỉ/hoặc giấy phép</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-10 border-t border-gray-100 bg-gray-50/50 rounded-b-[40px] flex justify-end gap-4">
              <button
                onClick={() => setViewingUser(null)}
                className="px-6 py-4 bg-white border border-gray-200 text-gray-700 text-xs font-black rounded-2xl uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm"
              >
                ĐÓNG LẠI
              </button>
              <button
                onClick={() => {
                  if (viewingUser.id && viewingUser.role?.name) {
                    handleApprove(viewingUser.id, viewingUser.role.name);
                    setViewingUser(null);
                  }
                }}
                className="px-8 py-4 bg-emerald-600 text-white text-xs font-black rounded-2xl uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
              >
                DUYỆT HỒ SƠ NÀY
              </button>
            </div>
          </div>
        </div >
      )}
    </div >
  );
};

export default KYCApproval;
