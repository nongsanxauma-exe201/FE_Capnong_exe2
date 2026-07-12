import React, { useState, useEffect } from 'react';
import { Gavel, Clock, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { returnService, ReturnRequestResponse, ReturnStatus } from '../../services/return.service';
import { globalShowAlert } from '../../contexts/PopupContext';

const FarmerDisputes: React.FC = () => {
  const [requests, setRequests] = useState<ReturnRequestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ReturnRequestResponse | null>(null);
  const [shopResponse, setShopResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await returnService.getShopReturns();
      if (res.result) {
        setRequests(res.result);
        if (res.result.length > 0 && !selectedRequest) {
          setSelectedRequest(res.result[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch returns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleShopAction = async (accept: boolean) => {
    if (!selectedRequest) return;
    if (!accept && !shopResponse.trim()) {
       globalShowAlert('Vui lòng nhập lý do từ chối', 'Nhắc nhở', 'warning');
       return;
    }

    try {
      setSubmitting(true);
      const res = await returnService.shopAction(selectedRequest.id, {
        accept,
        response: shopResponse,
      });

      if (res.result) {
        globalShowAlert(accept ? 'Đã phê duyệt hoàn tiền!' : 'Đã từ chối trả hàng', 'Thành công', 'success');
        setShopResponse('');
        fetchRequests();
        if (requests.length <= 1) setSelectedRequest(null);
      }
    } catch (err) {
      console.error('Action failed:', err);
      globalShowAlert('Thao tác thất bại', 'Lỗi', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full animate-in fade-in duration-500 overflow-hidden bg-white p-8">
      <div className="max-w-[1280px] mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* List */}
        <div className="bg-gray-50/50 rounded-[40px] border border-gray-100 p-6 flex flex-col h-[calc(100vh-100px)]">
           <div className="mb-6">
              <h4 className="text-xl font-black text-gray-900 uppercase">Yêu cầu trả hàng</h4>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Sản phẩm bị lỗi hoặc không đạt chất lượng</p>
           </div>

           <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>
              ) : requests.length === 0 ? (
                <div className="text-center py-20 text-gray-400 font-bold">Chưa có yêu cầu nào</div>
              ) : requests.map(req => (
                <div 
                  key={req.id}
                  onClick={() => setSelectedRequest(req)}
                  className={`p-5 rounded-3xl border transition-all cursor-pointer ${selectedRequest?.id === req.id ? 'border-primary bg-white shadow-xl shadow-primary/5 scale-[1.02]' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                >
                   <div className="flex justify-between mb-2">
                      <span className="text-[10px] font-black text-primary uppercase">#{req.id}</span>
                      <span className={`text-[10px] font-black uppercase ${req.status === 'PENDING' ? 'text-orange-500' : req.status === 'SHOP_APPROVED' ? 'text-blue-500' : 'text-gray-400'}`}>
                        {req.status === 'SHOP_APPROVED' ? 'CHỜ ADMIN' : req.status === 'PENDING' ? 'MỚI' : req.status === 'REJECTED' ? 'ĐÃ TỪ CHỐI' : req.status === 'COMPLETED' ? 'ĐÃ XONG' : req.status === 'REFUND_PENDING' ? 'ĐANG HOÀN TIỀN' : 'MỚI'}
                      </span>
                   </div>
                   <h5 className="font-black text-gray-900 text-sm line-clamp-1">{req.productName || 'Sản phẩm lỗi'}</h5>
                   <p className="text-xs text-gray-500 mt-2 line-clamp-2 italic">"{req.reason || 'Không có lý do'}"</p>
                </div>
              ))}
           </div>
        </div>

        {/* Details */}
        <div className="md:col-span-2 space-y-8 h-[calc(100vh-100px)] overflow-y-auto pr-2 custom-scrollbar">
           {selectedRequest ? (
             <div className="space-y-8 animate-in slide-in-from-right-10 duration-500">
               {/* Evidence Section */}
               <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
                  <div className="px-8 py-4 bg-gray-900 text-white flex justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest">Bằng chứng từ người mua</span>
                      <span className="text-[10px] font-bold text-gray-400">{new Date(selectedRequest.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex-1 bg-black flex items-center justify-center p-4">
                      {selectedRequest.evidence ? (
                        <img src={selectedRequest.evidence.split(';')[0]} className="max-h-[500px] object-contain" />
                      ) : (
                        <span className="text-gray-500">Không có hình ảnh</span>
                      )}
                  </div>
               </div>

               {/* Info & Action */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm space-y-6">
                      <h5 className="text-sm font-black text-gray-900 uppercase tracking-tight">Chi tiết sản phẩm</h5>
                      <div className="space-y-4">
                          <div className="flex justify-between py-3 border-b border-gray-50">
                             <span className="text-xs text-gray-400 font-bold uppercase">Tên sản phẩm</span>
                             <span className="text-sm font-black text-gray-900">{selectedRequest.productName}</span>
                          </div>
                          <div className="flex justify-between py-3 border-b border-gray-50">
                             <span className="text-xs text-gray-400 font-bold uppercase">Số lượng</span>
                             <span className="text-sm font-black text-gray-900">{selectedRequest.quantity}</span>
                          </div>
                          <div className="flex justify-between py-3 border-b border-gray-50">
                             <span className="text-xs text-gray-400 font-bold uppercase">Số tiền hoàn</span>
                             <span className="text-sm font-black text-primary uppercase">{selectedRequest.refundAmount.toLocaleString()}đ</span>
                          </div>
                      </div>
                      <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100">
                          <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-2">Lý do hoàn trả (Buyer)</p>
                          <p className="text-sm text-orange-800 font-medium italic">"{selectedRequest.reason}"</p>
                      </div>
                  </div>

                  <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm flex flex-col">
                      <h5 className="text-sm font-black text-gray-900 uppercase tracking-tight mb-6">Phản hồi của Shop</h5>
                      <textarea 
                        value={shopResponse}
                        onChange={(e) => setShopResponse(e.target.value)}
                        placeholder="Nhập lý do nếu bạn từ chối yêu cầu này..."
                        className="w-full h-32 p-5 bg-gray-50 border border-gray-100 rounded-3xl text-sm font-medium outline-none focus:border-primary transition-all resize-none mb-6"
                      />
                      
                      {selectedRequest.status === 'SHOP_APPROVED' ? (
                          <div className="p-6 bg-blue-50 border border-blue-100 rounded-3xl text-center">
                              <Clock className="size-8 text-blue-500 mx-auto mb-3 animate-pulse" />
                              <p className="text-sm font-black text-blue-900 uppercase">Đã gửi yêu cầu hoàn tiền</p>
                              <p className="text-[10px] text-blue-500 font-bold mt-1">Đang chờ Admin phê duyệt và chuyển khoản</p>
                          </div>
                      ) : (
                        <div className="mt-auto flex flex-col gap-3">
                            <button 
                              onClick={() => handleShopAction(true)}
                              disabled={submitting || selectedRequest.status !== 'PENDING'}
                              className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                            >
                               CHẤP NHẬN HOÀN TIỀN
                            </button>
                            <button 
                               onClick={() => handleShopAction(false)}
                               disabled={submitting || selectedRequest.status !== 'PENDING'}
                               className="w-full py-4 bg-red-50 text-red-500 font-black rounded-2xl border border-red-100 hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                               TỪ CHỐI
                            </button>
                        </div>
                      )}
                      <p className="text-[10px] text-gray-400 font-medium italic text-center mt-4">
                        * Nếu bạn từ chối, người mua có thể khiếu nại lên Admin để giải quyết tranh chấp.
                      </p>
                  </div>
               </div>
             </div>
           ) : (
             <div className="h-full flex items-center justify-center">
                <div className="text-center">
                   <Gavel className="size-20 text-gray-100 mx-auto mb-6" />
                   <p className="text-lg font-black text-gray-300 uppercase tracking-widest">Chọn yêu cầu để xem chi tiết</p>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default FarmerDisputes;
