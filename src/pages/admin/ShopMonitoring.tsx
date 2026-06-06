
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock, Search, Filter, History, Lock, Bell, ChevronRight, Star, ShieldAlert, Loader2, AlertCircle, X, Eye, Mail, Phone, MapPin, CreditCard, Store } from 'lucide-react';
import { userService, UserResponse } from '../../services';
import Pagination, { PageInfo } from '../../components/ui/Pagination';
import { globalShowAlert, globalShowConfirm } from '../../contexts/PopupContext';

const PAGE_SIZE = 10;

const ShopMonitoring: React.FC = () => {
   const [shops, setShops] = useState<UserResponse[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [searchTerm, setSearchTerm] = useState('');
   const [page, setPage] = useState(0);
   const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
   const [selectedShop, setSelectedShop] = useState<UserResponse | null>(null);
   const [modalLoading, setModalLoading] = useState(false);

   useEffect(() => {
      const fetchShops = async () => {
         setLoading(true);
         try {
            const res = await userService.getUsersByRolePaged(['SHOP_OWNER'], null, page, PAGE_SIZE);
            if (res.result) {
               setPageInfo({
                  page: res.result.page,
                  size: res.result.size,
                  totalElements: res.result.totalElements,
                  totalPages: res.result.totalPages,
                  first: res.result.first,
                  last: res.result.last,
               });
               setShops(res.result.content || []);
            }
         } catch (err) {
            console.error('Failed to load shops', err);
            setError('Không thể tải danh sách cửa hàng.');
         } finally {
            setLoading(false);
         }
      };
      fetchShops();
   }, [page]);

   const handleViewProfile = async (userId: number) => {
      setModalLoading(true);
      setSelectedShop(null);
      try {
         const response = await userService.getUserById(userId);
         setSelectedShop(response.result || null);
      } catch (err) {
         globalShowAlert('Không thể tải thông tin cửa hàng. Vui lòng thử lại.', 'Lỗi', 'error');
      } finally {
         setModalLoading(false);
      }
   };

   const closeModal = () => {
      setSelectedShop(null);
      setModalLoading(false);
   };

   const handleDeactivate = async (userId: number) => {
      if (!await globalShowConfirm('Xác nhận', 'Bạn có chắc muốn khóa tạm thời cửa hàng này?')) return;
      try {
         await userService.deactivateUser(userId);
         setShops(prev => prev.map(s => s.id === userId ? { ...s, status: 'INACTIVE' } : s));
      } catch (err: any) {
         globalShowAlert(err?.data?.message || 'Không thể khóa cửa hàng', 'Lỗi', 'error');
      }
   };

   const handleActivate = async (userId: number) => {
      try {
         await userService.activateUser(userId);
         setShops(prev => prev.map(s => s.id === userId ? { ...s, status: 'ACTIVE' } : s));
      } catch (err: any) {
         globalShowAlert(err?.data?.message || 'Không thể mở khóa cửa hàng', 'Lỗi', 'error');
      }
   };

   const filteredShops = shops.filter(s => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (s.shopName || '').toLowerCase().includes(term) ||
         (s.fullName || '').toLowerCase().includes(term) ||
         (s.email || '').toLowerCase().includes(term);
   });

   const inactiveShops = shops.filter(s => s.status === 'INACTIVE');

   if (loading) {
      return (
         <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
            <Loader2 className="size-10 text-primary animate-spin" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Đang tải danh sách cửa hàng...</p>
         </div>
      );
   }

   return (
      <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-500">
         {/* Warning cards for inactive shops */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {inactiveShops.length > 0 ? inactiveShops.slice(0, 2).map((shop, i) => (
               <div key={shop.id} className={`${i === 0 ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'} border rounded-[40px] p-10 flex flex-col justify-between group overflow-hidden relative`}>
                  <div className="flex items-start gap-4 relative z-10">
                     <div className={`size-12 ${i === 0 ? 'bg-red-500' : 'bg-orange-500'} text-white rounded-2xl flex items-center justify-center shadow-lg`}>
                        {i === 0 ? <AlertTriangle className="size-6" /> : <Bell className="size-6" />}
                     </div>
                     <div className="flex-1">
                        <h3 className={`text-xl font-black ${i === 0 ? 'text-red-900' : 'text-orange-900'} leading-tight`}>
                           {i === 0 ? 'CẢNH BÁO: SHOP BỊ KHÓA' : 'ĐANG THEO DÕI CHẶT CHẼ'}
                        </h3>
                     </div>
                  </div>
                  <div className="mt-8 bg-white/50 backdrop-blur rounded-[32px] border border-gray-100 p-8 relative z-10">
                     <div className="flex items-center justify-between mb-4">
                        <h4 className="font-black text-gray-900">{shop.shopName || shop.fullName || 'Shop N/A'}</h4>
                        <span className={`text-[10px] font-black text-gray-400 font-bold uppercase tracking-widest`}>
                           {shop.status === 'ACTIVE' ? 'Hoạt động' : shop.status === 'INACTIVE' ? 'Tạm ngưng' : shop.status === 'PENDING' ? 'Chờ duyệt' : 'N/A'}
                        </span>
                     </div>
                     <div className="flex items-center justify-between mt-4">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email: {shop.email}</span>
                        <button onClick={() => handleActivate(shop.id)} className="px-4 py-2 bg-blue-50 text-blue-600 text-[10px] font-black rounded-xl hover:bg-blue-100 transition-colors">Mở khóa</button>
                     </div>
                  </div>
               </div>
            )) : (
               <div className="col-span-2 bg-green-50 border border-green-100 rounded-[40px] p-10 text-center">
                  <p className="text-green-700 font-bold">✅ Tất cả cửa hàng đang hoạt động bình thường</p>
               </div>
            )}
         </div>

         {error && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600 font-bold text-sm">
               <AlertCircle className="size-5" /> {error}
            </div>
         )}

         {/* Shop Table */}
         <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-10 py-8 border-b border-gray-50 flex flex-wrap items-center justify-between gap-6">
               <div className="flex items-center gap-4">
                  <Filter className="size-5 text-gray-400" />
                  <h4 className="font-black text-gray-800 uppercase tracking-tight">Danh sách cửa hàng ({filteredShops.length})</h4>
               </div>
               <div className="relative w-full max-w-sm">
                  <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Tìm tên shop, chủ shop..." className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all" />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-300" />
               </div>
            </div>

            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead className="bg-gray-50/50">
                     <tr>
                        <th className="px-10 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cửa hàng</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Chủ shop</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Email</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Trạng thái</th>
                        <th className="px-10 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Hành động</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Chi tiết</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                     {filteredShops.length === 0 ? (
                        <tr>
                           <td colSpan={6} className="px-10 py-10 text-center text-gray-400 font-bold">Không tìm thấy cửa hàng nào.</td>
                        </tr>
                     ) : filteredShops.map((shop, i) => (
                        <tr key={shop.id} className="hover:bg-gray-50/30 transition-colors">
                           <td className="px-10 py-6">
                              <div className="flex items-center gap-4">
                                 <div className="size-10 bg-gray-50 rounded-2xl flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined">storefront</span>
                                 </div>
                                 <div>
                                    <p className="text-sm font-black text-gray-900">{shop.shopName || 'Shop N/A'}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">ID: {shop.id}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-6">
                              <div className="flex items-center gap-3">
                                 <img src={shop.logoUrl || `https://picsum.photos/seed/o${i}/60/60`} className="size-8 rounded-full object-cover" />
                                 <span className="text-xs font-bold text-gray-700">{shop.fullName || 'N/A'}</span>
                              </div>
                           </td>
                           <td className="px-6 py-6 text-center text-xs font-bold text-gray-600">{shop.email || 'N/A'}</td>
                           <td className="px-6 py-6 text-center">
                              {/* Thêm whitespace-nowrap để chặn xuống dòng, w-max để thẻ co giãn theo chữ */}
                              <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider whitespace-nowrap min-w-[100px] ${
                                    shop.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                    shop.status === 'INACTIVE' ? 'bg-red-100 text-red-600' :
                                    'bg-orange-100 text-orange-600'
                                 }`}>
                                 {/* Thêm dấu chấm tròn nhỏ cho chuẩn giao diện Monitoring */}
                                 <span className={`size-1.5 rounded-full mr-2 ${
                                    shop.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'
                                 }`}></span>
                                 
                                 {shop.status === 'ACTIVE' ? 'Hoạt động' :
                                 shop.status === 'INACTIVE' ? 'Tạm ngưng' :
                                 shop.status === 'PENDING' ? 'Chờ duyệt' : 'N/A'}
                              </span>
                              </td>
                           <td className="px-10 py-6 text-right">
                              <div className="flex items-center justify-end gap-3">
                                 {shop.status === 'ACTIVE' ? (
                                    <button onClick={() => handleDeactivate(shop.id)} className="px-6 py-2.5 bg-red-50 text-red-500 text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-red-100 transition-colors">Khóa tạm thời</button>
                                 ) : (
                                    <button onClick={() => handleActivate(shop.id)} className="px-6 py-2.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-blue-100 transition-colors">Mở khóa</button>
                                 )}
                              </div>
                           </td>
                           <td className="px-6 py-6 text-center">
                              <button
                                 onClick={() => handleViewProfile(shop.id)}
                                 className="size-9 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors mx-auto"
                                 title="Xem chi tiết"
                              >
                                 <Eye className="size-4" />
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>

            <div className="p-10 bg-white border-t border-gray-50 flex items-center justify-between">
               <p className="text-[10px] text-gray-400 font-bold italic">
                  * Hiển thị {filteredShops.length} cửa hàng.
               </p>
            </div>
            {pageInfo && <Pagination pageInfo={pageInfo} onPageChange={(p) => { setPage(p); }} className="px-10" />}
         </div>

      {/* Shop Detail Modal */}
      {(selectedShop || modalLoading) && (
         <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
            <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
               {modalLoading ? (
                  <div className="p-16 text-center">
                     <div className="inline-block size-10 border-4 border-gray-200 border-t-primary rounded-full animate-spin mb-4" />
                     <p className="text-sm font-bold text-gray-400">Đang tải thông tin...</p>
                  </div>
               ) : selectedShop && (
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
                           {selectedShop.logoUrl ? (
                              <img src={selectedShop.logoUrl} className="size-20 rounded-3xl object-cover shadow-md bg-gray-50 flex-shrink-0" alt="Logo" />
                           ) : (
                              <div className="size-20 rounded-3xl bg-green-50 flex items-center justify-center text-green-600 flex-shrink-0">
                                 <span className="material-symbols-outlined text-[40px]">storefront</span>
                              </div>
                           )}
                           <div>
                              <span className={`inline-block mb-2 text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest ${
                                 selectedShop.status === 'ACTIVE' ? 'bg-green-50 text-green-600' :
                                 selectedShop.status === 'INACTIVE' ? 'bg-red-50 text-red-500' :
                                 'bg-orange-50 text-orange-600'
                              }`}>
                                 {selectedShop.status === 'ACTIVE' ? 'Hoạt động' :
                                  selectedShop.status === 'INACTIVE' ? 'Tạm ngưng' : 'Chờ duyệt'}
                              </span>
                              <h3 className="text-2xl font-black text-gray-900 tracking-tight">{selectedShop.shopName || selectedShop.fullName || 'N/A'}</h3>
                              <p className="text-gray-400 font-bold text-xs mt-1 uppercase tracking-widest">
                                 {selectedShop.role?.name === 'FARMER' ? 'Nông dân' : 'Chủ cửa hàng'} · ID: #{selectedShop.id}
                              </p>
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
                                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CHỦ SHOP</p>
                                 <p className="font-bold text-gray-900 mt-1 text-sm">{selectedShop.fullName || 'N/A'}</p>
                              </div>
                              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">SỐ ĐIỆN THOẠI</p>
                                 <p className="font-bold text-gray-900 mt-1 text-sm">{selectedShop.phoneNumber || 'N/A'}</p>
                              </div>
                           </div>
                           <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mt-3">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">EMAIL</p>
                              <p className="font-bold text-gray-900 mt-1 text-sm truncate" title={selectedShop.email}>{selectedShop.email || 'N/A'}</p>
                           </div>
                           <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mt-3">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ĐỊA CHỈ</p>
                              <p className="font-bold text-gray-900 mt-1 text-sm">{selectedShop.address || 'Chưa cung cấp'}</p>
                           </div>
                        </div>

                        <div>
                           <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                              <Store className="size-3.5" /> Thông tin cửa hàng
                           </h4>
                           <div className="grid grid-cols-2 gap-3">
                              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ĐÁNH GIÁ TB</p>
                                 <p className="font-bold text-gray-900 mt-1 text-sm flex items-center gap-1">
                                    <Star className="size-3.5 text-yellow-500 fill-yellow-500" />
                                    {selectedShop.ratingAverage?.toFixed(1) ?? 'Chưa có'}
                                 </p>
                              </div>
                              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">TÀI KHOẢN NGÂN HÀNG</p>
                                 <p className="font-bold text-gray-900 mt-1 text-sm">{selectedShop.bankAccount || 'Chưa cung cấp'}</p>
                              </div>
                           </div>
                           {selectedShop.description && (
                              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mt-3">
                                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">MÔ TẢ CỬA HÀNG</p>
                                 <p className="font-medium text-gray-700 mt-1 text-sm leading-relaxed">{selectedShop.description}</p>
                              </div>
                           )}
                        </div>

                        {selectedShop.achievement && (
                           <div>
                              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                 <span className="material-symbols-outlined text-[14px]">folder_open</span> Giấy tờ / Chứng nhận
                              </h4>
                              <a href={selectedShop.achievement} target="_blank" rel="noopener noreferrer" className="block">
                                 <div className="h-36 w-full bg-gray-100 rounded-2xl border border-gray-200 overflow-hidden relative group">
                                    <img src={selectedShop.achievement} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Giấy tờ" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                       <span className="text-white font-bold bg-black/50 px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5">
                                          <span className="material-symbols-outlined text-sm">open_in_new</span> Phóng to
                                       </span>
                                    </div>
                                 </div>
                              </a>
                           </div>
                        )}
                     </div>

                     {/* Footer */}
                     <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                        <button
                           onClick={closeModal}
                           className="px-6 py-3 bg-white border border-gray-200 text-gray-700 text-xs font-black rounded-2xl uppercase tracking-widest hover:bg-gray-50 transition-all"
                        >
                           Đóng lại
                        </button>
                        {selectedShop.status === 'ACTIVE' ? (
                           <button
                              onClick={() => { handleDeactivate(selectedShop.id); closeModal(); }}
                              className="px-8 py-3 bg-red-500 text-white text-xs font-black rounded-2xl uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                           >
                              Khóa tạm thời
                           </button>
                        ) : (
                           <button
                              onClick={() => { handleActivate(selectedShop.id); closeModal(); }}
                              className="px-8 py-3 bg-blue-600 text-white text-xs font-black rounded-2xl uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                           >
                              Mở khóa
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

export default ShopMonitoring;
