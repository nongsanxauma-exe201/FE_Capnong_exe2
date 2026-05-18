import { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { walletService, WalletResponse, WithdrawRequestResponse } from '../../services';
import { globalShowAlert } from '../../contexts/PopupContext';

const Wallet: React.FC = () => {
   const [wallet, setWallet] = useState<WalletResponse | null>(null);
   const [withdrawRequests, setWithdrawRequests] = useState<WithdrawRequestResponse[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);

   // Withdraw Modal State
   const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
   const [withdrawAmount, setWithdrawAmount] = useState('');
   const [withdrawReason, setWithdrawReason] = useState('');
   const [bankName, setBankName] = useState('');
   const [bankAccount, setBankAccount] = useState('');
   const [bankHolder, setBankHolder] = useState('');
   const [isSubmitting, setIsSubmitting] = useState(false);

   // Banks list (static)
   const bankOptions = [
      'Vietcombank', 'BIDV', 'VietinBank', 'Agribank', 'Techcombank', 'ACB', 'Sacombank', 'MB Bank', 'VPBank', 'TPBank', 'SHB', 'HDBank', 'VIB', 'OCB', 'SeABank', 'Eximbank', 'MSB', 'Nam A Bank', 'Bac A Bank', 'ABBank', 'PVcomBank', 'LPBank', 'KienlongBank', 'VietBank', 'BaoViet Bank', 'Saigonbank', 'Woori Bank', 'CIMB'
   ];

   useEffect(() => {
      const fetchData = async () => {
         try {
            setIsLoading(true);
            const [walletRes, withdrawRes] = await Promise.all([
               walletService.getMyWallet(),
               walletService.getMyWithdrawRequests()
            ]);

            if (walletRes.result) setWallet(walletRes.result);
            if (withdrawRes.result) setWithdrawRequests(withdrawRes.result);
         } catch (err) {
            console.error('Failed to fetch wallet data:', err);
            setError('Không thể tải thông tin ví. Vui lòng thử lại sau.');
         } finally {
            setIsLoading(false);
         }
      };

      fetchData();
   }, []);

     // Load bank info from localStorage if present
     useEffect(() => {
        try {
           const userStr = localStorage.getItem('user_info');
           if (userStr) {
              const user = JSON.parse(userStr);
              if (user) {
                 if (user.bankAccount) setBankAccount(user.bankAccount);
                 if (user.bankAccountHolder) setBankHolder(user.bankAccountHolder);
                 if (user.bankName) setBankName(user.bankName);
              }
           }
        } catch (e) {
           console.warn('Failed to parse user_info from localStorage', e);
        }
     }, []);

     const openWithdrawModal = () => {
        try {
           const userStr = localStorage.getItem('user_info');
           if (userStr) {
              const user = JSON.parse(userStr);
              setBankAccount(user.bankAccount || '');
              setBankHolder(user.bankAccountHolder || '');
              setBankName(user.bankName || '');
           }
        } catch (e) {
           /* ignore */
        }
        setIsWithdrawModalOpen(true);
     };

   const handleWithdrawSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const amountNum = Number(withdrawAmount);
      if (!amountNum || amountNum <= 0) {
         globalShowAlert('Vui lòng nhập số tiền hợp lệ', 'Lỗi', 'warning');
         return;
      }
      if (wallet && amountNum > wallet.totalBalance) {
         globalShowAlert('Số tiền rút vượt quá số dư khả dụng', 'Lỗi', 'warning');
         return;
      }

      setIsSubmitting(true);
      try {
         const res = await walletService.createWithdrawRequest({
            amount: amountNum,
            reason: withdrawReason,
            bankName: bankName,
            bankAccountNumber: bankAccount,
            bankAccountHolder: bankHolder,
         });

         if (res.result) {
            globalShowAlert('Đã gửi yêu cầu rút tiền thành công!', 'Thành công', 'success');
            setIsWithdrawModalOpen(false);
            setWithdrawAmount('');
            setWithdrawReason('');
            // Reload requests
            const withdrawRes = await walletService.getMyWithdrawRequests();
            if (withdrawRes.result) setWithdrawRequests(withdrawRes.result);
            // Save bank info to localStorage user_info for future prefill
            try {
               const existingStr = localStorage.getItem('user_info');
               const existing = existingStr ? JSON.parse(existingStr) : {};
               const updated = {
                  ...existing,
                  bankAccount: bankAccount || existing.bankAccount,
                  bankAccountHolder: bankHolder || existing.bankAccountHolder,
                  bankName: bankName || existing.bankName,
               };
               localStorage.setItem('user_info', JSON.stringify(updated));
            } catch (e) {
               console.warn('Failed to save user_info', e);
            }
         }
      } catch (err: any) {
         globalShowAlert(err?.data?.message || 'Có lỗi xảy ra khi tạo yêu cầu rút tiền', 'Lỗi', 'error');
      } finally {
         setIsSubmitting(false);
      }
   };

   const getStatusBadge = (status: string) => {
      switch (status) {
         case 'SUCCESS':
            return (
               <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                  <span className="size-1.5 rounded-full bg-green-500"></span>
                  Thành công
               </span>
            );
         case 'PENDING':
            return (
               <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                  <span className="size-1.5 rounded-full bg-amber-500"></span>
                  Chờ duyệt
               </span>
            );
         default:
            return (
               <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                  <span className="size-1.5 rounded-full bg-gray-500"></span>
                  {status}
               </span>
            );
      }
   };

   if (isLoading) {
      return (
         <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
            <Loader2 className="size-10 text-primary animate-spin" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Đang tải dữ liệu tài chính...</p>
         </div>
      );
   }

   return (
      <div className="flex flex-col gap-6 p-6 lg:p-10 max-w-6xl mx-auto w-full animate-in fade-in duration-500">
         {/* Header */}
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
               <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ví của tôi</h1>
               <p className="text-slate-500 text-sm">Theo dõi doanh thu và quản lý các yêu cầu rút tiền của bạn</p>
            </div>
            <button
               id="tour-wallet-withdraw-btn"
               onClick={openWithdrawModal}
               className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary/20"
            >
               <span className="material-symbols-outlined text-lg">payments</span>
               <span>Yêu cầu rút tiền</span>
            </button>
         </div>

         {error && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3 text-red-600 font-semibold text-sm">
               <AlertCircle className="size-5" />
               {error}
            </div>
         )}

         {/* Revenue Metrics */}
         <div id="tour-wallet-cards" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Total Revenue Card */}
            <div className="relative overflow-hidden group rounded-2xl p-8 bg-white border border-slate-200 shadow-sm transition-all hover:shadow-md">
               <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-8xl">trending_up</span>
               </div>
               <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                     <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined">analytics</span>
                     </div>
                     <p className="text-slate-500 font-semibold text-sm uppercase tracking-wider">Tổng doanh thu</p>
                  </div>
                  <div className="flex items-baseline gap-3">
                     <h3 className="text-4xl font-extrabold text-slate-900">
                        {(wallet?.totalRevenueAllTime || 0).toLocaleString('vi-VN')}đ
                     </h3>
                     <span className="flex items-center text-success text-sm font-bold bg-success/10 px-2 py-0.5 rounded-full">
                        <span className="material-symbols-outlined text-xs">arrow_upward</span> 12%
                     </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400 italic">Cập nhật lúc {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} hôm nay</p>
               </div>
            </div>

            {/* Withdrawn Card */}
            <div className="relative overflow-hidden group rounded-2xl p-8 bg-white border border-slate-200 shadow-sm transition-all hover:shadow-md">
               <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-8xl">account_balance</span>
               </div>
               <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                     <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined">output</span>
                     </div>
                     <p className="text-slate-500 font-semibold text-sm uppercase tracking-wider">Đã rút tiền</p>
                  </div>
                  <div className="flex items-baseline gap-3">
                     <h3 className="text-4xl font-extrabold text-slate-900">
                        {(wallet?.totalWithdrawn || 0).toLocaleString('vi-VN')}đ
                     </h3>
                     <span className="flex items-center text-success text-sm font-bold bg-success/10 px-2 py-0.5 rounded-full">
                        <span className="material-symbols-outlined text-xs">check</span> 5%
                     </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400 italic">Tổng {withdrawRequests.filter(r => r.status === 'SUCCESS').length} giao dịch thành công</p>
               </div>
            </div>
         </div>

         {/* Recent Requests Table */}
         <div id="tour-wallet-history" className="space-y-4">
            <div className="flex items-center justify-between">
               <h2 className="text-xl font-bold text-slate-900">Yêu cầu rút tiền gần đây</h2>
               <button className="text-primary text-sm font-bold hover:underline">Xem tất cả</button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="bg-slate-50">
                           <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Mã giao dịch</th>
                           <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Ngày yêu cầu</th>
                           <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Số tiền</th>
                           <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Trạng thái</th>
                           <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 text-right">Hành động</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {withdrawRequests.length === 0 ? (
                           <tr>
                              <td colSpan={5} className="px-6 py-20 text-center">
                                 <div className="flex flex-col items-center gap-4">
                                    <span className="material-symbols-outlined text-6xl text-slate-200">receipt_long</span>
                                    <p className="text-slate-400 font-semibold">Chưa có yêu cầu rút tiền nào.</p>
                                 </div>
                              </td>
                           </tr>
                        ) : (
                           withdrawRequests.slice(0, 5).map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                 <td className="px-6 py-5 font-mono text-sm text-slate-600">#WD-{item.id}</td>
                                 <td className="px-6 py-5 text-sm text-slate-600">
                                    {(item as any).processedAt ? new Date((item as any).processedAt).toLocaleDateString('vi-VN') : 'N/A'}
                                 </td>
                                 <td className="px-6 py-5 text-sm font-bold text-slate-900">
                                    {item.amount.toLocaleString('vi-VN')}đ
                                 </td>
                                 <td className="px-6 py-5">{getStatusBadge(item.status)}</td>
                                 <td className="px-6 py-5 text-right">
                                    <button className="text-slate-400 hover:text-primary transition-colors">
                                       <span className="material-symbols-outlined">visibility</span>
                                    </button>
                                 </td>
                              </tr>
                           ))
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>

         {/* Withdrawal History List */}
         <div className="space-y-4">
            <div className="flex items-center justify-between">
               <h2 className="text-xl font-bold text-slate-900">Lịch sử rút tiền</h2>
               <div className="flex gap-2">
                  <button className="px-3 py-1 text-xs font-bold rounded-lg border border-slate-200 text-slate-500">Tháng này</button>
                  <button className="px-3 py-1 text-xs font-bold rounded-lg border border-primary text-primary bg-primary/10">Tất cả</button>
               </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
               {withdrawRequests.filter(r => r.status === 'SUCCESS').length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
                     <span className="material-symbols-outlined text-5xl text-slate-200">history</span>
                     <p className="text-slate-400 font-semibold mt-3">Chưa có lịch sử rút tiền.</p>
                  </div>
               ) : (
                  withdrawRequests
                     .filter(r => r.status === 'SUCCESS')
                     .slice(0, 3)
                     .map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                           <div className="flex items-center gap-4">
                              <div className="size-10 rounded-full bg-success/10 text-success flex items-center justify-center">
                                 <span className="material-symbols-outlined">account_balance</span>
                              </div>
                              <div>
                                 <p className="text-sm font-bold text-slate-900">
                                    {item.bankName ? `Rút tiền về ${item.bankName}` : 'Rút tiền'}
                                 </p>
                                 <p className="text-xs text-slate-500">
                                    Giao dịch hoàn tất • {item.processedAt ? new Date(item.processedAt).toLocaleDateString('vi-VN') : 'N/A'}
                                 </p>
                              </div>
                           </div>
                           <p className="text-sm font-bold text-slate-900">- {item.amount.toLocaleString('vi-VN')}đ</p>
                        </div>
                     ))
               )}
            </div>
         </div>

         {/* Withdraw Request Modal */}
         {isWithdrawModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
                  <button
                     onClick={() => setIsWithdrawModalOpen(false)}
                     className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors"
                  >
                     <span className="material-symbols-outlined">close</span>
                  </button>

                  <div className="mb-6">
                     <h3 className="text-2xl font-bold text-slate-900 mb-1">Tạo Yêu Cầu Rút Tiền</h3>
                     <p className="text-sm text-slate-500">Số dư khả dụng: <span className="font-bold text-primary">{(wallet?.totalBalance || 0).toLocaleString('vi-VN')}đ</span></p>
                  </div>

                  <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                     <div>
                        <label className="text-xs font-bold text-slate-700 block mb-2">Số tiền cần rút (VNĐ) *</label>
                        <input
                           type="number"
                           value={withdrawAmount}
                           onChange={(e) => setWithdrawAmount(e.target.value)}
                           className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold"
                           placeholder="Nhập số tiền..."
                           required
                        />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-700 block mb-2">Lý do rút tiền</label>
                        <input
                           type="text"
                           value={withdrawReason}
                           onChange={(e) => setWithdrawReason(e.target.value)}
                           className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                           placeholder="Ví dụ: Rút tiền thu nhập tháng 10"
                        />
                     </div>
                     <div className="pt-4 border-t border-slate-100">
                        <p className="text-xs font-bold text-slate-500 mb-4">Thông tin nhận tiền (Tùy chọn)</p>
                        <div className="space-y-3">
                           <select
                              value={bankName}
                              onChange={(e) => setBankName(e.target.value)}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                           >
                              <option value="">Chọn ngân hàng (hoặc để trống)</option>
                              {bankOptions.map((b) => (
                                 <option key={b} value={b}>{b}</option>
                              ))}
                           </select>
                           <input
                              type="text"
                              value={bankAccount}
                              onChange={(e) => setBankAccount(e.target.value)}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                              placeholder="Số tài khoản"
                           />
                           <input
                              type="text"
                              value={bankHolder}
                              onChange={(e) => setBankHolder(e.target.value)}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm uppercase"
                              placeholder="Tên chủ tài khoản"
                           />
                        </div>
                     </div>

                     <div className="pt-6">
                        <button
                           type="submit"
                           disabled={isSubmitting}
                           className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                           {isSubmitting ? 'Đang xử lý...' : 'Xác nhận rút tiền'}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}
      </div>
   );
};

// Add fix: Export default
export default Wallet;
