import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { MapPin, CreditCard, ChevronRight, Lock, Loader2, ShieldCheck, Wallet, ChevronLeft, AlertCircle, Package, X, Gift, Truck } from 'lucide-react';
import { orderService, paymentService, authService, cartService, CartResponse, voucherService, VoucherUserResponse } from '../../services';
import { httpClient } from '../../services/http.client';
import {
   clearPendingPayOSPayment,
   hardReloadCartPage,
   ensurePendingPayOSRolledBack,
   hasPendingPayOSRollback,
   resolvePayOSOrderCode,
   savePendingPayOSPayment,
   saveRestoredPayOSCart,
   getPendingPayOSPayment,
} from '../../utils/pendingPayOSPayment';
import { globalShowAlert } from '../../contexts/PopupContext';

// ✅ Extend CartResponse để có shopOwnerId (BE đã thêm field này)
type CartItemWithShop = {
   productId?: number;
   mysteryBoxId?: number;
   buildComboId?: number;
   productName: string;
   quantity: number;
   price: number;
   salePrice?: number;
   discountPercent?: number;
   imageUrl?: string;
   shopName?: string;
   itemType?: string;
   shopOwnerId?: number;
};

interface CheckoutProps {
   onComplete: (orderId: number) => void;
   onBack: () => void;
}

const Checkout: React.FC<CheckoutProps> = ({ onComplete, onBack }) => {
   const location = useLocation();
   const { selectedKeys } = (location.state as { selectedKeys?: string[] }) || {};

   const [isProcessing, setIsProcessing] = useState(false);
   const [paymentMethod, setPaymentMethod] = useState<'COD' | 'PAYOS'>('PAYOS');
   const [cartData, setCartData] = useState<CartResponse | null>(null);
   const [recipientName, setRecipientName] = useState('');
   const [recipientPhone, setRecipientPhone] = useState('');
   const [recipientAddress, setRecipientAddress] = useState('');
   const [note, setNote] = useState('');
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);

   const [showQRCode, setShowQRCode] = useState(false);
   const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
   const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
   const [isRestoringPayOS, setIsRestoringPayOS] = useState(false);

   // ✅ Phí ship động
   const [shippingFee, setShippingFee] = useState<number>(15000);
   const [loadingFee, setLoadingFee] = useState(false);
   const [shopId, setShopId] = useState<number | null>(null);
   const [orderVouchers, setOrderVouchers] = useState<VoucherUserResponse[]>([]);
   const [selectedVouchers, setSelectedVouchers] = useState<VoucherUserResponse[]>([]);
   const [loadingVouchers, setLoadingVouchers] = useState(false);
   const [voucherError, setVoucherError] = useState<string | null>(null);

   // Debounce timer cho address input
   const [addressTimer, setAddressTimer] = useState<NodeJS.Timeout | null>(null);

   // Gợi ý địa chỉ
   const [suggestions, setSuggestions] = useState<{ placeId: string; description: string }[]>([]);
   const [showSuggestions, setShowSuggestions] = useState(false);
   const [suggestTimer, setSuggestTimer] = useState<NodeJS.Timeout | null>(null);
   const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

   const returnToCartAfterPayOSRollback = useCallback(async () => {
      setIsRestoringPayOS(true);
      if (hasPendingPayOSRollback()) {
         void ensurePendingPayOSRolledBack();
      }
      // Bấm nút là qua /cart ngay; Cart.tsx sẽ gọi window.location.reload() tại đó.
      hardReloadCartPage();
   }, []);

   useEffect(() => {
      const fetchData = async () => {
         try {
            setLoading(true);
            setError(null);

            const [userRes, cartRes] = await Promise.all([
               authService.getMyInfo(),
               cartService.getCart()
            ]);

            if (userRes.result) {
               setRecipientName(userRes.result.fullName || '');
               setRecipientPhone(userRes.result.phoneNumber || '');
               setRecipientAddress(userRes.result.address || '');
            }

            if (cartRes.result) {
               let items = cartRes.result.items || [];

               // ✅ Lọc các sản phẩm đã được chọn từ Giỏ hàng
               if (selectedKeys && selectedKeys.length > 0) {
                  items = items.filter(item => {
                     const type = item.itemType || '';
                     let id: any = null;
                     if (type === 'MYSTERY_BOX') id = item.mysteryBoxId || (item as any).id;
                     else if (type === 'BUILD_COMBO') id = item.buildComboId || (item as any).id || (item as any).comboId;
                     else id = item.productId || (item as any).id;
                     
                     const key = type === 'MYSTERY_BOX' ? `b-${id}` :
                                 type === 'BUILD_COMBO' ? `c-${id}` :
                                 `p-${id}`;
                     return selectedKeys.includes(key);
                  });
               }

               const filteredTotalAmount = items.reduce((sum, item) => sum + ((item.salePrice ?? item.price) * item.quantity), 0);

               const checkoutCart = {
                  ...cartRes.result,
                  items: items,
                  totalAmount: filteredTotalAmount
               };

               setCartData(checkoutCart);

               if (items.length > 0) {
                  saveRestoredPayOSCart(checkoutCart);
               }

               if (items.length === 0) {
                  setError('Không có sản phẩm nào được chọn để thanh toán!');
               } else {
                  // ✅ Lấy shopId từ item đầu tiên trong danh sách đã lọc
                  const firstItem = items[0];
                  if (firstItem.shopOwnerId) {
                     setShopId(firstItem.shopOwnerId);
                  }
               }
            } else {
               setError('Không thể tải giỏ hàng.');
            }
         } catch (error: any) {
            console.error('Failed to fetch checkout data', error);
            setError('Có lỗi xảy ra khi tải dữ liệu.');
         } finally {
            setLoading(false);
         }
      };
      fetchData();
   }, [selectedKeys]);

   // ✅ Tính phí ship khi địa chỉ thay đổi (debounce 800ms)
   const fetchShippingFee = useCallback(async (address: string, sId: number, placeId: string | null = null) => {
      if (!address.trim() || address.trim().length < 10) return;
      try {
         setLoadingFee(true);
         let url = `/orders/shipping-fee?shippingAddress=${encodeURIComponent(address)}&shopId=${sId}`;
         if (placeId) url += `&placeId=${encodeURIComponent(placeId)}`;
         const res = await httpClient.get<number>(url);
         if (res.result != null) {
            setShippingFee(res.result);
         }
      } catch (e) {
         console.warn('[Checkout] Không tính được phí ship, dùng mặc định');
      } finally {
         setLoadingFee(false);
      }
   }, []);

   // Trigger khi address hoặc shopId thay đổi
   useEffect(() => {
      if (!shopId || !recipientAddress) return;

      if (addressTimer) clearTimeout(addressTimer);
      const timer = setTimeout(() => {
         fetchShippingFee(recipientAddress, shopId);
      }, 800); // đợi 800ms sau khi ngừng gõ
      setAddressTimer(timer);

      return () => clearTimeout(timer);
   }, [recipientAddress, shopId]);

   // ✅ Tính fee khi load xong nếu đã có địa chỉ mặc định
   useEffect(() => {
      if (shopId && recipientAddress && recipientAddress.length >= 10) {
         fetchShippingFee(recipientAddress, shopId);
      }
   }, [shopId]);

   const calculateVoucherDiscount = (voucherItem: VoucherUserResponse | null, amount: number) => {
      const voucher = voucherItem?.voucherResponse;
      if (!voucher) return 0;
      if (amount < Number(voucher.minOrderValue ?? 0)) return 0;
      const rawDiscount = amount * (Number(voucher.discountValue ?? 0) / 100);
      return Math.min(rawDiscount, Number(voucher.maxDiscount ?? rawDiscount));
   };

   const getVoucherItemKey = (item: VoucherUserResponse | null) =>
      item?.voucherUserId || item?.voucherResponse?.voucherCode || '';

   const isSameVoucherItem = (a: VoucherUserResponse | null, b: VoucherUserResponse | null) => {
      if (!a || !b) return false;
      if (a.voucherUserId && b.voucherUserId && a.voucherUserId === b.voucherUserId) return true;
      return Boolean(a.voucherResponse?.voucherCode && a.voucherResponse.voucherCode === b.voucherResponse?.voucherCode);
   };

   const getVoucherApplications = (items: VoucherUserResponse[], amount: number) => {
      let remainingAmount = amount;
      return items.map((item) => {
         const discount = calculateVoucherDiscount(item, remainingAmount);
         remainingAmount = Math.max(0, remainingAmount - discount);
         return { item, discount, remainingAmount };
      });
   };

   const selectedVoucherApplications = getVoucherApplications(selectedVouchers, cartData?.totalAmount || 0);
   const voucherDiscount = selectedVoucherApplications.reduce((sum, app) => sum + app.discount, 0);
   const voucherCheckAmount = Math.max(0, (cartData?.totalAmount || 0) - voucherDiscount);

   useEffect(() => {
      const fetchOrderVouchers = async () => {
         const amount = voucherCheckAmount;
         if (!shopId || amount <= 0) {
            setOrderVouchers([]);
            return;
         }

         try {
            setLoadingVouchers(true);
            setVoucherError(null);
            const response = await voucherService.getVouchersForOrder(shopId, amount, 0, 20);
            const list = response.result?.content || [];
            setOrderVouchers(
               list.filter((item) => item.voucherResponse && !selectedVouchers.some((selected) => isSameVoucherItem(selected, item)))
            );
         } catch (err) {
            console.error('Failed to load checkout vouchers', err);
            setOrderVouchers([]);
            setVoucherError('Không tải được voucher khả dụng.');
         } finally {
            setLoadingVouchers(false);
         }
      };

      fetchOrderVouchers();
   }, [shopId, voucherCheckAmount, selectedVouchers]);

   const handleAddressChange = (val: string) => {
      setRecipientAddress(val);
      setSelectedPlaceId(null);
      setShowSuggestions(false);

      if (suggestTimer) clearTimeout(suggestTimer);
      const t = setTimeout(async () => {
         // Goong AutoComplete chỉ hoạt động tốt với short query.
         // Nếu user đã gõ có dấu phẩy (vd "32A Tân Hòa 2, Quận 9, H"),
         // chỉ lấy phần trước dấu phẩy đầu tiên để search → kết quả đúng hơn.
         const commaIdx = val.indexOf(',');
         const searchQuery = commaIdx !== -1 ? val.substring(0, commaIdx).trim() : val.trim();

         if (searchQuery.length >= 4) {
            try {
               const res = await httpClient.get<{ placeId: string; description: string }[]>(
                  `/address/suggestions?input=${encodeURIComponent(searchQuery)}`
               );
               if (res.result && res.result.length > 0) {
                  setSuggestions(res.result);
                  setShowSuggestions(true);
               } else {
                  setSuggestions([]);
               }
            } catch (_) {}
         } else {
            setSuggestions([]);
         }
      }, 400);
      setSuggestTimer(t);
   };

   const handleSelectSuggestion = (s: { placeId: string; description: string }) => {
      setRecipientAddress(s.description);
      setSelectedPlaceId(s.placeId);
      setSuggestions([]);
      setShowSuggestions(false);
      if (shopId) fetchShippingFee(s.description, shopId, s.placeId);
   };

   const validateForm = (): boolean => {
      if (!recipientName.trim()) { globalShowAlert('Vui lòng nhập tên người nhận', 'Lỗi', 'error'); return false; }
      if (!recipientPhone.trim()) { globalShowAlert('Vui lòng nhập số điện thoại', 'Lỗi', 'error'); return false; }
      if (!recipientAddress.trim()) { globalShowAlert('Vui lòng nhập địa chỉ nhận hàng', 'Lỗi', 'error'); return false; }
      return true;
   };

   // When inline QR is shown, notify-pending if user hides the tab (close/switch)
   useEffect(() => {
      if (!showQRCode) return;
      const handleHidden = () => {
         if (document.visibilityState === 'hidden') {
            const pending = getPendingPayOSPayment();
            if (pending?.orderCode) {
               paymentService.notifyPendingPayment(pending.orderCode).catch(() => {});
            }
         }
      };
      document.addEventListener('visibilitychange', handleHidden);
      return () => document.removeEventListener('visibilitychange', handleHidden);
   }, [showQRCode]);

   const handleConfirmPayment = async () => {
      if (!validateForm()) return;
      if (!cartData || !cartData.items || cartData.items.length === 0) {
         globalShowAlert('Giỏ hàng trống!', 'Lỗi', 'error');
         return;
      }

      try {
         setIsProcessing(true);
         setError(null);

         const orderData = {
            recipientName,
            recipientPhone,
            shippingAddress: recipientAddress,
            note,
            paymentMethod,
            voucherUserId: selectedVouchers[0]?.voucherUserId,
            voucherUserIds: selectedVouchers.map((voucher) => voucher.voucherUserId).filter(Boolean),
            items: cartData.items.map(item => {
               if (item.itemType === 'MYSTERY_BOX') {
                  return { mysteryBoxId: item.mysteryBoxId, quantity: item.quantity };
               }
               if (item.itemType === 'BUILD_COMBO') {
                  const comboId = item.buildComboId ?? (item as any).comboId ?? (item as any).id;
                  return { buildComboId: comboId, quantity: item.quantity };
               }
               return { productId: item.productId, quantity: item.quantity };
            })
         };

         // Lưu snapshot trước khi BE xóa giỏ hàng lúc tạo order.
         saveRestoredPayOSCart(cartData);

         const orderRes = await orderService.createOrder(orderData);

         if (orderRes.result) {
            const orderId = orderRes.result.id;
            const amount = orderRes.result.totalAmount;

            window.dispatchEvent(new Event('cart-updated'));

            if (paymentMethod === 'PAYOS') {
               const paymentRes = await paymentService.createPaymentPayOS({
                  orderId, amount, method: 'PAYOS', paymentGateway: 'PAYOS'
               });
               if (paymentRes.result) {
                  if (paymentRes.result.checkoutUrl) {
                     const orderCode = resolvePayOSOrderCode(paymentRes.result);
                     saveRestoredPayOSCart(cartData, { orderCode, orderId });
                     savePendingPayOSPayment(paymentRes.result, orderId);
                     window.location.href = paymentRes.result.checkoutUrl;
                     return;
                  }
                  if (paymentRes.result.qrCodeUrl) {
                     setQrCodeUrl(paymentRes.result.qrCodeUrl);
                     setCheckoutUrl(paymentRes.result.checkoutUrl || null);
                     setShowQRCode(true);
                     setIsProcessing(false);
                     return;
                  }
               }
            }

            clearPendingPayOSPayment();
            onComplete(orderId);
         }

      } catch (error: any) {
         console.error('Checkout failed', error);
         if (error?.data?.message?.includes('MYSTERY_BOX_OUT_OF_STOCK')) {
            setError('Một số túi mù trong giỏ hàng đã hết hàng và đã được xóa. Vui lòng kiểm tra lại giỏ hàng.');
         } else {
            setError(error?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
         }
      } finally {
         setIsProcessing(false);
      }
   };

   if (loading) {
      return (
         <div className="min-h-screen bg-background flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
               <Loader2 className="size-12 animate-spin text-primary" />
               <p className="text-sm font-bold text-gray-600">
                  {isRestoringPayOS ? 'Đang khôi phục giỏ hàng từ phiên PayOS...' : 'Đang tải...'}
               </p>
            </div>
         </div>
      );
   }

   if (error && (!cartData || !cartData.items || cartData.items.length === 0)) {
      return (
         <div className="min-h-screen bg-background flex items-center justify-center p-4 py-20">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 max-w-md text-center">
               <AlertCircle className="size-16 text-red-500 mx-auto mb-4" />
               <h3 className="text-xl font-black text-gray-900 mb-2">Không thể thanh toán</h3>
               <p className="text-gray-600 font-medium mb-6">{error}</p>
               <button
                  onClick={() => void returnToCartAfterPayOSRollback()}
                  className="w-full py-3 bg-primary text-white font-black rounded-2xl"
               >
                  {isRestoringPayOS ? 'Đang khôi phục giỏ hàng...' : 'Quay lại giỏ hàng'}
               </button>
            </div>
         </div>
      );
   }

   const subtotalAmount = cartData?.totalAmount || 0;
   const totalAmount = Math.max(0, subtotalAmount - voucherDiscount) + shippingFee;

   return (
      <div className="min-h-screen bg-gray-50 pb-20">
         <div className="bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <button onClick={onBack} disabled={isProcessing} className="size-9 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-all disabled:opacity-50">
                     <ChevronLeft className="size-5" />
                  </button>
                  <div>
                     <h1 className="text-lg font-black text-gray-900 uppercase">Thanh Toán</h1>
                     <p className="text-[10px] text-gray-500 font-bold">Bước cuối cùng để hoàn tất đơn hàng</p>
                  </div>
               </div>
               <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-primary text-[10px] font-black rounded-full">
                  <ShieldCheck className="size-3" /> BẢO MẬT
               </div>
            </div>
         </div>

         <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

               {/* Left */}
               <div className="lg:col-span-2 space-y-4">
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                     <div className="flex items-center gap-2 mb-4">
                        <MapPin className="size-5 text-primary" />
                        <h3 className="text-sm font-black text-gray-900 uppercase">Thông tin nhận hàng</h3>
                     </div>
                     <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                           <div>
                              <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Tên người nhận *</label>
                              <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Nhập tên" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-primary focus:bg-white transition-all" disabled={isProcessing} />
                           </div>
                           <div>
                              <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Số điện thoại *</label>
                              <input type="tel" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} placeholder="Nhập SĐT" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-primary focus:bg-white transition-all" disabled={isProcessing} />
                           </div>
                        </div>
                        <div className="relative">
                           <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">
                              Địa chỉ nhận hàng *
                              {loadingFee && (
                                 <span className="ml-2 text-primary font-bold normal-case">
                                    <Loader2 className="size-3 inline animate-spin mr-1" />
                                    Đang tính phí ship...
                                 </span>
                              )}
                           </label>
                           <textarea
                              value={recipientAddress}
                              onChange={(e) => handleAddressChange(e.target.value)}
                              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                              placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-primary focus:bg-white transition-all resize-none"
                              rows={2}
                              disabled={isProcessing}
                              autoComplete="off"
                           />
                           {/* Dropdown gợi ý địa chỉ */}
                           {showSuggestions && suggestions.length > 0 && (
                              <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden max-h-52 overflow-y-auto">
                                 {suggestions.slice(0, 5).map((s, i) => (
                                    <li
                                       key={s.placeId ?? i}
                                       onMouseDown={() => handleSelectSuggestion(s)}
                                       className="flex items-start gap-2 px-3 py-2.5 hover:bg-green-50 cursor-pointer border-b border-gray-100 last:border-0"
                                    >
                                       <MapPin className="size-4 text-primary shrink-0 mt-0.5" />
                                       <span className="text-sm text-gray-700 font-medium leading-snug">{s.description}</span>
                                    </li>
                                 ))}
                              </ul>
                           )}
                           {!loadingFee && recipientAddress.length >= 10 && (
                              <div className="mt-2 flex items-center gap-2 text-xs text-primary font-bold">
                                 <Truck className="size-3.5" />
                                 Phí ship ước tính: {shippingFee.toLocaleString('vi-VN')}đ
                              </div>
                           )}
                        </div>
                        <div>
                           <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Ghi chú (tùy chọn)</label>
                           <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: Giao giờ hành chính" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-primary focus:bg-white transition-all" disabled={isProcessing} />
                        </div>
                     </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                     <div className="flex items-center gap-2 mb-4">
                        <CreditCard className="size-5 text-primary" />
                        <h3 className="text-sm font-black text-gray-900 uppercase">Phương thức thanh toán</h3>
                     </div>
                     <div className="space-y-2">
                        {[
                           { id: 'PAYOS', label: 'PayOS (VietQR)', sub: 'Quét mã thanh toán', icon: CreditCard, color: 'blue-500', badge: 'Khuyên dùng' },
                           { id: 'COD', label: 'COD', sub: 'Thanh toán khi nhận hàng', icon: Package, color: 'orange-500' },
                        ].map(({ id, label, sub, icon: Icon, color, badge }) => (
                           <div
                              key={id}
                              onClick={() => !isProcessing && setPaymentMethod(id as any)}
                              className={`p-4 border-2 rounded-xl flex items-center gap-3 cursor-pointer transition-all ${paymentMethod === id ? `border-${color} bg-${color === 'primary' ? 'green' : color.split('-')[0]}-50` : 'border-gray-200 hover:border-gray-300'
                                 } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                           >
                              <div className={`size-10 rounded-lg flex items-center justify-center ${paymentMethod === id ? `bg-${color} text-white` : 'bg-gray-100 text-gray-400'}`}>
                                 <Icon className="size-5" />
                              </div>
                              <div className="flex-1">
                                 <div className="flex items-center gap-2">
                                    <p className="text-sm font-black text-gray-900">{label}</p>
                                    {badge && <span className="px-2 py-0.5 bg-primary text-white text-[8px] font-black rounded uppercase">{badge}</span>}
                                 </div>
                                 <p className="text-[10px] text-gray-500 font-medium">{sub}</p>
                              </div>
                              {paymentMethod === id && (
                                 <div className={`size-5 bg-${color} rounded-full flex items-center justify-center`}>
                                    <div className="size-2 bg-white rounded-full" />
                                 </div>
                              )}
                           </div>
                        ))}
                     </div>
                  </div>
               </div>

               {/* Right - Summary */}
               <div className="lg:col-span-1">
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                     <h3 className="text-sm font-black text-gray-900 uppercase mb-4">Xác nhận đơn hàng</h3>

                     <div className="space-y-3 mb-4 max-h-[200px] overflow-y-auto">
                        {cartData?.items?.map((item, idx) => (
                           <div key={idx} className="flex justify-between items-start gap-2 text-xs">
                              <div className="flex-1 min-w-0">
                                 <div className="flex items-center gap-1 mb-0.5">
                                    {item.itemType === 'MYSTERY_BOX' && <Gift className="size-3 text-primary shrink-0" />}
                                    <p className="font-bold text-gray-900 truncate">{item.productName}</p>
                                 </div>
                                 <p className="text-gray-500 font-medium">SL: {item.quantity}</p>
                              </div>
                              <div className="text-right">
                                 {item.salePrice != null && item.discountPercent ? (
                                   <div>
                                     <span className="text-[9px] font-bold text-red-400 line-through block">{((item.price || 0) * item.quantity).toLocaleString('vi-VN')}đ</span>
                                     <span className="font-black text-primary whitespace-nowrap">{(item.salePrice * item.quantity).toLocaleString('vi-VN')}đ</span>
                                   </div>
                                 ) : (
                                   <span className="font-black text-gray-900 whitespace-nowrap">{((item.price || 0) * item.quantity).toLocaleString('vi-VN')}đ</span>
                                 )}
                              </div>
                           </div>
                        ))}
                     </div>

                     <div className="py-4 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-3">
                           <div className="flex items-center gap-2">
                              <Gift className="size-4 text-primary" />
                              <span className="text-xs font-black uppercase text-gray-900">Voucher</span>
                           </div>
                           {selectedVouchers.length > 0 && (
                              <button
                                 type="button"
                                 onClick={() => setSelectedVouchers([])}
                                 className="text-[10px] font-black text-red-500 hover:text-red-600"
                              >
                                 Bỏ tất cả
                              </button>
                           )}
                        </div>
                        {selectedVoucherApplications.length > 0 && (
                           <div className="mb-3 space-y-2">
                              <p className="text-[10px] font-black uppercase tracking-wider text-primary">Đã áp dụng</p>
                              {selectedVoucherApplications.map(({ item, discount }) => {
                                 const voucher = item.voucherResponse;
                                 if (!voucher) return null;
                                 const voucherKey = getVoucherItemKey(item);
                                 return (
                                    <div key={`selected-${voucherKey}`} className="rounded-xl border-2 border-primary bg-primary/5 p-3">
                                       <div className="flex items-start justify-between gap-2">
                                          <div>
                                             <p className="text-[10px] font-black text-primary uppercase">{voucher.voucherCode}</p>
                                             <p className="mt-0.5 text-xs font-black text-gray-900">
                                                Đã áp dụng -{discount.toLocaleString('vi-VN')}đ
                                             </p>
                                          </div>
                                          <button
                                             type="button"
                                             onClick={() => setSelectedVouchers((prev) => prev.filter((selected) => getVoucherItemKey(selected) !== voucherKey))}
                                             className="text-[10px] font-black text-red-500"
                                          >
                                             Bỏ
                                          </button>
                                       </div>
                                    </div>
                                 );
                              })}
                           </div>
                        )}
                        {loadingVouchers ? (
                           <div className="rounded-xl bg-gray-50 p-3 text-xs font-bold text-gray-400">Đang tải voucher...</div>
                        ) : voucherError ? (
                           <div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600">{voucherError}</div>
                        ) : orderVouchers.length === 0 ? (
                           <div className="rounded-xl bg-gray-50 p-3 text-xs font-bold text-gray-400">Không có voucher phù hợp cho đơn này.</div>
                        ) : (
                           <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                              {selectedVouchers.length > 0 && (
                                 <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Có thể áp dụng thêm</p>
                              )}
                              {orderVouchers.map((item) => {
                                 const voucher = item.voucherResponse;
                                 if (!voucher) return null;
                                 const discount = calculateVoucherDiscount(item, voucherCheckAmount);
                                 const voucherKey = getVoucherItemKey(item);
                                 return (
                                    <button
                                       key={voucherKey}
                                       type="button"
                                       onClick={() => setSelectedVouchers((prev) => prev.some((selected) => isSameVoucherItem(selected, item)) ? prev : [...prev, item])}
                                       className="w-full rounded-xl border border-gray-200 bg-white p-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5"
                                    >
                                       <div className="flex items-start justify-between gap-2">
                                          <div>
                                             <p className="text-[10px] font-black text-primary uppercase">{voucher.voucherCode}</p>
                                             <p className="mt-0.5 text-xs font-black text-gray-900">
                                                Giảm {voucher.discountValue}% tối đa {Number(voucher.maxDiscount).toLocaleString('vi-VN')}đ
                                             </p>
                                             <p className="mt-0.5 text-[10px] font-bold text-gray-400">
                                                Đơn từ {Number(voucher.minOrderValue).toLocaleString('vi-VN')}đ
                                             </p>
                                          </div>
                                          <div className="text-right">
                                             <span className="block text-xs font-black text-primary whitespace-nowrap">
                                                -{discount.toLocaleString('vi-VN')}đ
                                             </span>
                                             <span className="mt-1 inline-block rounded-lg bg-gray-100 px-2 py-1 text-[9px] font-black text-gray-500">
                                                Áp dụng thêm
                                             </span>
                                          </div>
                                       </div>
                                    </button>
                                 );
                              })}
                           </div>
                        )}
                     </div>

                     <div className="space-y-2 py-4 border-t border-gray-100">
                        <div className="flex justify-between text-xs">
                           <span className="text-gray-600 font-medium">Tiền hàng ({cartData?.items?.length || 0})</span>
                           <span className="font-bold text-gray-900">{(cartData?.totalAmount || 0).toLocaleString('vi-VN')}đ</span>
                        </div>
                        {voucherDiscount > 0 && (
                           <div className="flex justify-between text-xs">
                              <span className="text-gray-600 font-medium">Giảm voucher</span>
                              <span className="font-bold text-primary">-{voucherDiscount.toLocaleString('vi-VN')}đ</span>
                           </div>
                        )}
                        {/* ✅ Phí ship động */}
                        <div className="flex justify-between text-xs items-center">
                           <span className="text-gray-600 font-medium flex items-center gap-1">
                              Phí vận chuyển
                              {loadingFee && <Loader2 className="size-3 animate-spin text-primary" />}
                           </span>
                           <span className={`font-bold ${loadingFee ? 'text-gray-400' : 'text-gray-900'}`}>
                              {shippingFee.toLocaleString('vi-VN')}đ
                           </span>
                        </div>
                     </div>

                     <div className="pt-4 border-t border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                           <span className="text-xs font-bold text-gray-600 uppercase">Tổng cộng</span>
                           <span className="text-2xl font-black text-primary">{totalAmount.toLocaleString('vi-VN')}đ</span>
                        </div>

                        {error && (
                           <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
                              <AlertCircle className="size-4 text-red-500 shrink-0 mt-0.5" />
                              <p className="text-[10px] text-red-600 font-bold">{error}</p>
                           </div>
                        )}

                        <button
                           disabled={isProcessing || loadingFee}
                           onClick={handleConfirmPayment}
                           className="w-full py-3 bg-primary text-white font-black rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                           {isProcessing
                              ? <><Loader2 className="size-5 animate-spin" /> Đang xử lý...</>
                              : <><Lock className="size-5" /> Xác nhận thanh toán</>
                           }
                        </button>

                        <p className="text-[9px] text-gray-400 text-center mt-3 font-medium">
                           Bằng cách thanh toán, bạn đồng ý với <span className="text-primary font-bold">Điều khoản</span> của chúng tôi
                        </p>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {showQRCode && qrCodeUrl && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
               <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">
                  <div className="p-6 flex flex-col items-center text-center gap-4">
                     <div className="flex items-center justify-between w-full mb-2">
                        <h3 className="text-lg font-black text-gray-900">Quét mã thanh toán</h3>
                        <button onClick={() => { setShowQRCode(false); setQrCodeUrl(null); setCheckoutUrl(null); }} className="size-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-200">
                           <X className="size-5" />
                        </button>
                     </div>
                     <p className="text-sm text-gray-500 font-medium">Mở app ngân hàng và quét mã QR</p>
                     <div className="w-full aspect-square bg-white border-2 border-gray-100 rounded-2xl p-3">
                        <img src={qrCodeUrl} alt="PayOS QR Code" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/300x300?text=QR+Error'; }} />
                     </div>
                     {checkoutUrl && (
                        <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-xl flex items-center justify-center gap-2 transition-all">
                           <ChevronRight className="size-5" /> Mở trang PayOS
                        </a>
                     )}
                     <p className="text-[10px] text-gray-400 font-medium">Đơn hàng sẽ được xử lý sau khi thanh toán thành công</p>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

export default Checkout;