import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, CreditCard, ChevronRight, Lock, Loader2, ShieldCheck, Wallet, ChevronLeft, AlertCircle, Package, X, Gift, Truck } from 'lucide-react';
import { orderService, paymentService, authService, cartService, CartResponse, CartItemResponse, voucherService, VoucherUserResponse } from '../../services';
import { httpClient } from '../../services/http.client';
import { groupCartItemsByShop, buildCheckoutBatchPayload } from '../../utils/cartShopGroups';
import {
   clearPendingPayOSPayment,
   hardReloadCartPage,
   resolvePayOSOrderCode,
   savePendingPayOSPayment,
   saveRestoredPayOSCart,
   getPendingPayOSPayment,
} from '../../utils/pendingPayOSPayment';
import { globalShowAlert, globalShowConfirm } from '../../contexts/PopupContext';

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
   onComplete: (orderId: number, orderIds?: number[]) => void;
   onBack: () => void;
}

const getQuantityKg = (item: CartItemResponse) => Number(item.quantityKg ?? item.quantity ?? 0);
const getPricePerKg = (item: CartItemResponse) => Number(item.salePrice ?? item.pricePerKg ?? item.price ?? 0);
const getItemTotal = (item: CartItemResponse) => Number(item.itemTotal ?? getPricePerKg(item) * getQuantityKg(item));
const formatKg = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 2 });

const Checkout: React.FC<CheckoutProps> = ({ onComplete, onBack }) => {
   const location = useLocation();
   const navigate = useNavigate();
   const { selectedKeys } = (location.state as { selectedKeys?: string[] }) || {};
   const isPlanMode = new URLSearchParams(location.search).get('mode') === 'plan';

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
   const [isReturningToCart, setIsReturningToCart] = useState(false);

   // ✅ Phí ship động
   const [shippingFeesByShop, setShippingFeesByShop] = useState<Record<number, number>>({});
   const [loadingFee, setLoadingFee] = useState(false);
   const [selectedVoucherByShop, setSelectedVoucherByShop] = useState<Record<number, VoucherUserResponse | null>>({});
   const [vouchersByShop, setVouchersByShop] = useState<Record<number, VoucherUserResponse[]>>({});
   const [loadingVouchersByShop, setLoadingVouchersByShop] = useState<Record<number, boolean>>({});
   const [selectedBatchVoucher, setSelectedBatchVoucher] = useState<VoucherUserResponse | null>(null);
   const [batchVouchers, setBatchVouchers] = useState<VoucherUserResponse[]>([]);
   const [loadingBatchVouchers, setLoadingBatchVouchers] = useState(false);

   // Debounce timer cho address input
   const [addressTimer, setAddressTimer] = useState<NodeJS.Timeout | null>(null);

   // Gợi ý địa chỉ
   const [suggestions, setSuggestions] = useState<{ placeId: string; description: string }[]>([]);
   const [showSuggestions, setShowSuggestions] = useState(false);
   const [suggestTimer, setSuggestTimer] = useState<NodeJS.Timeout | null>(null);
   const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

   // Plan mode: intercept browser back button
   useEffect(() => {
      if (!isPlanMode) return;
      window.history.pushState(null, '', window.location.href);
      let isHandling = false;
      const handlePopstate = async () => {
         if (isHandling) return;
         isHandling = true;
         window.history.pushState(null, '', window.location.href);
         const confirmed = await globalShowConfirm(
            'Nếu rời khỏi trang, các combo trong thực đơn sẽ không được giữ lại. Bạn sẽ cần vào lại trang "Lên kế hoạch" và bấm "Mua tất cả" để thanh toán lại.',
            'Rời khỏi trang thanh toán?'
         );
         if (confirmed) {
            sessionStorage.removeItem('planCheckoutData');
            window.removeEventListener('popstate', handlePopstate);
            navigate('/meal-plan');
         }
         isHandling = false;
      };
      window.addEventListener('popstate', handlePopstate);
      return () => window.removeEventListener('popstate', handlePopstate);
   }, [isPlanMode, navigate]);

   const handlePlanBack = async () => {
      const confirmed = await globalShowConfirm(
         'Nếu rời khỏi trang, các combo trong thực đơn sẽ không được giữ lại. Bạn sẽ cần vào lại trang "Lên kế hoạch" và bấm "Mua tất cả" để thanh toán lại.',
         'Rời khỏi trang thanh toán?'
      );
      if (!confirmed) return;
      sessionStorage.removeItem('planCheckoutData');
      navigate('/meal-plan');
   };

   const returnToCartAfterPayOSRollback = useCallback(async () => {
      setIsReturningToCart(true);
      hardReloadCartPage();
   }, []);

   useEffect(() => {
      const fetchData = async () => {
         try {
            setLoading(true);
            setError(null);

            if (isPlanMode) {
               // Plan checkout: load items from sessionStorage (does NOT touch regular cart)
               const userRes = await authService.getMyInfo();
               if (userRes.result) {
                  setRecipientName(userRes.result.fullName || '');
                  setRecipientPhone(userRes.result.phoneNumber || '');
                  setRecipientAddress(userRes.result.address || '');
               }

               const stored = sessionStorage.getItem('planCheckoutData');
               if (!stored) {
                  setError('Không tìm thấy dữ liệu thực đơn. Vui lòng quay lại trang Lên kế hoạch và bấm "Mua tất cả" lại.');
                  return;
               }

               const planData = JSON.parse(stored);
               const checkoutCart = { items: planData.items || [], totalAmount: planData.totalAmount || 0 };
               setCartData(checkoutCart as CartResponse);

               if (checkoutCart.items.length === 0) {
                  setError('Thực đơn không có combo nào để thanh toán.');
               }
            } else {
               // Normal cart checkout
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

                  const filteredTotalAmount = items.reduce((sum, item) => sum + getItemTotal(item), 0);
                  const checkoutCart = { ...cartRes.result, items, totalAmount: filteredTotalAmount };
                  setCartData(checkoutCart);

                  if (items.length > 0) {
                     saveRestoredPayOSCart(checkoutCart);
                  }

                  if (items.length === 0) {
                     setError('Không có sản phẩm nào được chọn để thanh toán!');
                  }
               } else {
                  setError('Không thể tải giỏ hàng.');
               }
            }
         } catch (error: any) {
            console.error('Failed to fetch checkout data', error);
            setError('Có lỗi xảy ra khi tải dữ liệu.');
         } finally {
            setLoading(false);
         }
      };
      fetchData();
   }, [isPlanMode, selectedKeys]);

   // ✅ Tính phí ship khi địa chỉ thay đổi (debounce 800ms)
   const fetchShippingFee = useCallback(async (address: string, sId: number, placeId: string | null = null) => {
      if (!address.trim() || address.trim().length < 10) return 15000;
      try {
         let url = `/orders/shipping-fee?shippingAddress=${encodeURIComponent(address)}&shopId=${sId}`;
         if (placeId) url += `&placeId=${encodeURIComponent(placeId)}`;
         const res = await httpClient.get<number>(url);
         return res.result != null ? res.result : 15000;
      } catch (e) {
         console.warn('[Checkout] Không tính được phí ship shop', sId);
         return 15000;
      }
   }, []);

   const fetchAllShippingFees = useCallback(async (address: string, placeId: string | null = null) => {
      const groups = groupCartItemsByShop(cartData?.items ?? []);
      if (!groups.length || !address.trim() || address.trim().length < 10) return;
      try {
         setLoadingFee(true);
         const fees: Record<number, number> = {};
         await Promise.all(groups.map(async (g) => {
            fees[g.shopOwnerId] = await fetchShippingFee(address, g.shopOwnerId, placeId);
         }));
         setShippingFeesByShop(fees);
      } finally {
         setLoadingFee(false);
      }
   }, [cartData?.items, fetchShippingFee]);

   useEffect(() => {
      if (!cartData?.items?.length || !recipientAddress) return;

      if (addressTimer) clearTimeout(addressTimer);
      const timer = setTimeout(() => {
         void fetchAllShippingFees(recipientAddress);
      }, 800);
      setAddressTimer(timer);

      return () => clearTimeout(timer);
   }, [recipientAddress, cartData?.items]);

   useEffect(() => {
      if (cartData?.items?.length && recipientAddress && recipientAddress.length >= 10) {
         void fetchAllShippingFees(recipientAddress);
      }
   }, [cartData?.items]);

   const isWelcomeVoucher = (voucherItem: VoucherUserResponse | null) =>
      voucherItem?.voucherResponse?.voucherType === 'WELCOME';

   const calculateVoucherDiscount = (voucherItem: VoucherUserResponse | null, amount: number, currentShippingFee = 0) => {
      const voucher = voucherItem?.voucherResponse;
      if (!voucher) return 0;
      if (amount < Number(voucher.minOrderValue ?? 0)) return 0;
      if (isWelcomeVoucher(voucherItem)) {
         return Math.min(currentShippingFee, Number(voucher.maxDiscount ?? currentShippingFee));
      }
      const rawDiscount = amount * (Number(voucher.discountValue ?? 0) / 100);
      return Math.min(rawDiscount, Number(voucher.maxDiscount ?? rawDiscount));
   };

   const getVoucherOfferLines = (vItem: VoucherUserResponse | null) => {
      const v = vItem?.voucherResponse;
      if (!v) return { main: '', sub: '' };
      const minOrder = `Đơn từ ${Number(v.minOrderValue ?? 0).toLocaleString('vi-VN')}đ`;
      const maxDiscount = v.maxDiscount != null && Number(v.maxDiscount) > 0
         ? Number(v.maxDiscount).toLocaleString('vi-VN')
         : null;
      if (isWelcomeVoucher(vItem)) {
         return {
            main: maxDiscount ? `Miễn phí vận chuyển · tối đa ${maxDiscount}đ` : 'Miễn phí vận chuyển toàn bộ',
            sub: minOrder,
         };
      }
      return {
         main: maxDiscount ? `Giảm ${v.discountValue}% · tối đa ${maxDiscount}đ` : `Giảm ${v.discountValue}%`,
         sub: minOrder,
      };
   };

   const getVoucherItemKey = (item: VoucherUserResponse | null) =>
      item?.voucherUserId || item?.voucherResponse?.voucherCode || '';

   const isSameVoucherItem = (a: VoucherUserResponse | null, b: VoucherUserResponse | null) => {
      if (!a || !b) return false;
      if (a.voucherUserId && b.voucherUserId && a.voucherUserId === b.voucherUserId) return true;
      return Boolean(a.voucherResponse?.voucherCode && a.voucherResponse.voucherCode === b.voucherResponse?.voucherCode);
   };

   const getVoucherApplications = (items: VoucherUserResponse[], amount: number, currentShippingFee: number) => {
      let remainingAmount = amount;
      let remainingShippingFee = currentShippingFee;
      return items.map((item) => {
         const discount = calculateVoucherDiscount(item, remainingAmount, remainingShippingFee);
         if (isWelcomeVoucher(item)) {
            remainingShippingFee = Math.max(0, remainingShippingFee - discount);
         } else {
            remainingAmount = Math.max(0, remainingAmount - discount);
         }
         return { item, discount, remainingAmount };
      });
   };

   const shopGroups = useMemo(() => groupCartItemsByShop(cartData?.items ?? []), [cartData?.items]);
   const isMultiShop = shopGroups.length > 1;

   const getShopSubtotal = (items: CartItemResponse[]) =>
      items.reduce((sum, item) => sum + getItemTotal(item), 0);

   const shopSummaries = useMemo(() => shopGroups.map((group) => {
      const subtotal = getShopSubtotal(group.items);
      const shopShipping = shippingFeesByShop[group.shopOwnerId] ?? 15000;
      const selectedVoucher = selectedVoucherByShop[group.shopOwnerId] ?? null;
      const productDiscount = selectedVoucher
         ? calculateVoucherDiscount(selectedVoucher, subtotal, 0)
         : 0;
      const afterProduct = Math.max(0, subtotal - productDiscount);
      return {
         ...group,
         subtotal,
         shippingFee: shopShipping,
         selectedVoucher,
         productDiscount,
         shippingDiscount: 0,
         total: afterProduct + shopShipping,
      };
   }), [shopGroups, shippingFeesByShop, selectedVoucherByShop]);

   const batchProductSubtotal = shopSummaries.reduce(
      (s, g) => s + Math.max(0, g.subtotal - g.productDiscount), 0,
   );
   const batchShippingTotal = shopSummaries.reduce((s, g) => s + g.shippingFee, 0);
   const batchProductDiscount = selectedBatchVoucher && !isWelcomeVoucher(selectedBatchVoucher)
      ? calculateVoucherDiscount(selectedBatchVoucher, batchProductSubtotal, 0)
      : 0;
   const batchShippingDiscount = selectedBatchVoucher && isWelcomeVoucher(selectedBatchVoucher)
      ? calculateVoucherDiscount(selectedBatchVoucher, batchProductSubtotal, batchShippingTotal)
      : 0;

   const shippingFee = shopSummaries.reduce((s, g) => s + g.shippingFee, 0);
   const productVoucherDiscount = shopSummaries.reduce((s, g) => s + g.productDiscount, 0);
   const shippingVoucherDiscount = batchShippingDiscount;
   const shopTotalBeforeBatch = shopSummaries.reduce((s, g) => s + g.total, 0);
   const totalAmount = Math.max(0, shopTotalBeforeBatch - batchProductDiscount - batchShippingDiscount);

   useEffect(() => {
      if (!shopGroups.length) return;

      shopGroups.forEach(async (group) => {
         const subtotal = getShopSubtotal(group.items);
         const selected = selectedVoucherByShop[group.shopOwnerId];
         const productDisc = selected
            ? calculateVoucherDiscount(selected, subtotal, 0)
            : 0;
         const amount = Math.max(0, subtotal - productDisc);
         if (amount <= 0) {
            setVouchersByShop((prev) => ({ ...prev, [group.shopOwnerId]: [] }));
            return;
         }

         setLoadingVouchersByShop((prev) => ({ ...prev, [group.shopOwnerId]: true }));
         try {
            const response = await voucherService.getVouchersForOrder(group.shopOwnerId, amount, 0, 20);
            const list = (response.result?.content || []).filter((item) => item.voucherResponse);
            setVouchersByShop((prev) => ({ ...prev, [group.shopOwnerId]: list }));
         } catch {
            setVouchersByShop((prev) => ({ ...prev, [group.shopOwnerId]: [] }));
         } finally {
            setLoadingVouchersByShop((prev) => ({ ...prev, [group.shopOwnerId]: false }));
         }
      });
   }, [shopGroups, selectedVoucherByShop]);

   useEffect(() => {
      const fetchBatchVouchers = async () => {
         if (batchProductSubtotal <= 0) {
            setBatchVouchers([]);
            return;
         }
         setLoadingBatchVouchers(true);
         try {
            const response = await voucherService.getVouchersForBatch(
               batchProductSubtotal, batchShippingTotal, 0, 20,
            );
            const list = (response.result?.content || []).filter((item) => item.voucherResponse);
            setBatchVouchers(list);
         } catch {
            setBatchVouchers([]);
         } finally {
            setLoadingBatchVouchers(false);
         }
      };
      void fetchBatchVouchers();
   }, [batchProductSubtotal, batchShippingTotal]);

   const setShopVoucher = (shopOwnerId: number, voucher: VoucherUserResponse | null) => {
      setSelectedVoucherByShop((prev) => ({ ...prev, [shopOwnerId]: voucher }));
   };

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
      void fetchAllShippingFees(s.description, s.placeId);
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

      const acceptedRefundPolicy = await globalShowConfirm(
         'Hoàn tiền 100% ngay lập tức nếu phát hiện nông sản bị dập nát, hư hỏng khi giao hàng.',
         'Cam kết hoàn tiền'
      );
      if (!acceptedRefundPolicy) return;

      try {
         setIsProcessing(true);
         setError(null);

         saveRestoredPayOSCart(cartData);

         const groups = groupCartItemsByShop(cartData.items);
         const batchRes = await orderService.checkoutBatch(
            buildCheckoutBatchPayload(groups, {
               recipientName,
               recipientPhone,
               shippingAddress: recipientAddress,
               note,
               paymentMethod,
            }, selectedVoucherByShop, selectedBatchVoucher),
         );

         if (batchRes.result) {
            const orderIds = batchRes.result.orderIds ?? batchRes.result.orders?.map((o) => o.id) ?? [];
            const orderId = orderIds[0];
            window.dispatchEvent(new Event('cart-updated'));

            if (paymentMethod === 'PAYOS') {
               if (batchRes.result.checkoutUrl) {
                  saveRestoredPayOSCart(cartData, {
                     orderCode: batchRes.result.payosOrderCode ?? null,
                     orderId,
                  });
                  savePendingPayOSPayment(
                    {
                      checkoutUrl: batchRes.result.checkoutUrl,
                      payosOrderCode: batchRes.result.payosOrderCode,
                      qrCodeUrl: batchRes.result.qrCodeUrl,
                    } as any,
                    orderId ?? 0,
                    { batchId: batchRes.result.batchId, orderIds },
                  );
                  window.location.href = batchRes.result.checkoutUrl;
                  return;
               }
               if (batchRes.result.qrCodeUrl) {
                  setQrCodeUrl(batchRes.result.qrCodeUrl);
                  setCheckoutUrl(batchRes.result.checkoutUrl || null);
                  setShowQRCode(true);
                  setIsProcessing(false);
                  return;
               }
            }

            clearPendingPayOSPayment();
            if (isPlanMode) sessionStorage.removeItem('planCheckoutData');
            if (orderId) {
               if (orderIds.length > 1) {
                  globalShowAlert(`Đã tạo ${orderIds.length} đơn hàng: ${orderIds.map((id) => `#${id}`).join(', ')}`, 'Đặt hàng thành công', 'success');
               }
               onComplete(orderId, orderIds);
            }
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
                  {isReturningToCart ? 'Đang quay lại giỏ hàng...' : 'Đang tải...'}
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
                  onClick={isPlanMode ? () => { sessionStorage.removeItem('planCheckoutData'); navigate('/meal-plan'); } : () => void returnToCartAfterPayOSRollback()}
                  className="w-full py-3 bg-primary text-white font-black rounded-2xl"
               >
                  {isPlanMode ? 'Quay lại trang Lên kế hoạch' : isReturningToCart ? 'Đang quay lại...' : 'Quay lại giỏ hàng'}
               </button>
            </div>
         </div>
      );
   }

   const subtotalAmount = shopSummaries.reduce((s, g) => s + g.subtotal, 0);

   const multiShopNote = isMultiShop
      ? `Sẽ tạo ${shopGroups.length} đơn hàng riêng — voucher shop và phí ship theo từng nhà vườn; voucher sàn áp dụng cho toàn bộ đơn`
      : null;

   return (
      <div className="min-h-screen bg-gray-50 pb-20">
         <div className="bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <button onClick={isPlanMode ? handlePlanBack : onBack} disabled={isProcessing} className="size-9 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-all disabled:opacity-50">
                     <ChevronLeft className="size-5" />
                  </button>
                  <div>
                     <h1 className="text-lg font-black text-gray-900 uppercase">Thanh Toán {isPlanMode && <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">Thực đơn</span>}</h1>
                     <p className="text-[10px] text-gray-500 font-bold">{isPlanMode ? 'Thanh toán combo thực đơn — giỏ hàng không bị ảnh hưởng' : 'Bước cuối cùng để hoàn tất đơn hàng'}</p>
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
                                 Phí ship ước tính ({shopGroups.length} shop): {shippingFee.toLocaleString('vi-VN')}đ
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

               {/* Right - Summary per shop */}
               <div className="lg:col-span-1">
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                     <h3 className="text-sm font-black text-gray-900 uppercase mb-2">Xác nhận đơn hàng</h3>
                   

                     <div className="space-y-5 mb-4">
                        {shopSummaries.map((shop, shopIdx) => {
                           const shopVouchers = vouchersByShop[shop.shopOwnerId] ?? [];
                           const loadingShopVouchers = loadingVouchersByShop[shop.shopOwnerId];
                           return (
                              <div key={shop.shopOwnerId} className="rounded-2xl border-2 border-gray-100 overflow-hidden">
                                 <div className="bg-primary/5 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                                    <div>
                                       <p className="text-[10px] font-black text-primary uppercase tracking-widest">
                                          {isMultiShop ? `Đơn ${shopIdx + 1}` : 'Nhà vườn'}
                                       </p>
                                       <p className="text-sm font-black text-gray-900">{shop.shopName}</p>
                                    </div>
                                    <p className="text-sm font-black text-primary">{shop.total.toLocaleString('vi-VN')}đ</p>
                                 </div>

                                 <div className="p-4 space-y-3 max-h-[140px] overflow-y-auto">
                                    {shop.items.map((item, idx) => (
                                       <div key={idx} className="flex justify-between items-start gap-2 text-xs">
                                          <div className="flex-1 min-w-0">
                                             <p className="font-bold text-gray-900 truncate">{item.productName}</p>
                                             <p className="text-gray-500">{formatKg(getQuantityKg(item))} kg</p>
                                          </div>
                                          <span className="font-black text-gray-900 shrink-0">{getItemTotal(item).toLocaleString('vi-VN')}đ</span>
                                       </div>
                                    ))}
                                 </div>

                                 <div className="px-4 pb-4 border-t border-gray-50 pt-3">
                                    <div className="flex items-center justify-between mb-2">
                                       <span className="text-[10px] font-black uppercase text-gray-500 flex items-center gap-1">
                                          <Gift className="size-3 text-primary" /> Voucher shop
                                       </span>
                                       {shop.selectedVoucher && (
                                          <button type="button" onClick={() => setShopVoucher(shop.shopOwnerId, null)}
                                             className="text-[10px] font-black text-red-500">Bỏ</button>
                                       )}
                                    </div>
                                    {shop.selectedVoucher && (
                                       <div className="mb-2 rounded-xl border border-primary bg-primary/5 p-2">
                                          <p className="text-[10px] font-black text-primary">{shop.selectedVoucher.voucherResponse?.voucherCode}</p>
                                          <p className="text-[10px] text-gray-600 font-bold mt-0.5">
                                             {getVoucherOfferLines(shop.selectedVoucher).main}
                                          </p>
                                          <p className="text-xs font-black text-gray-800 mt-1">
                                             -{shop.productDiscount.toLocaleString('vi-VN')}đ
                                          </p>
                                       </div>
                                    )}
                                    {loadingShopVouchers ? (
                                       <p className="text-[10px] text-gray-400 font-bold">Đang tải voucher...</p>
                                    ) : shopVouchers.length === 0 ? (
                                       <p className="text-[10px] text-gray-400 font-bold">Không có voucher phù hợp.</p>
                                    ) : (
                                       <div className="space-y-1.5 max-h-28 overflow-y-auto">
                                          {shopVouchers.map((vItem) => {
                                             const v = vItem.voucherResponse!;
                                             const offer = getVoucherOfferLines(vItem);
                                             const disc = calculateVoucherDiscount(
                                                vItem, shop.subtotal,
                                                shippingFeesByShop[shop.shopOwnerId] ?? 15000,
                                             );
                                             const isSelected = isSameVoucherItem(shop.selectedVoucher, vItem);
                                             return (
                                                <button key={getVoucherItemKey(vItem)} type="button"
                                                   onClick={() => setShopVoucher(shop.shopOwnerId, isSelected ? null : vItem)}
                                                   className={`w-full text-left rounded-lg border p-2 transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/30'}`}>
                                                   <div className="flex justify-between gap-2">
                                                      <div>
                                                         <p className="text-[9px] font-black text-primary uppercase">{v.voucherCode}</p>
                                                         <p className="text-[10px] text-gray-700 font-bold">{offer.main}</p>
                                                         <p className="text-[10px] text-gray-500">{offer.sub}</p>
                                                      </div>
                                                      <span className="text-xs font-black text-primary shrink-0">-{disc.toLocaleString('vi-VN')}đ</span>
                                                   </div>
                                                </button>
                                             );
                                          })}
                                       </div>
                                    )}
                                 </div>

                                 <div className="px-4 pb-4 space-y-1 text-xs border-t border-gray-50 pt-3">
                                    <div className="flex justify-between"><span className="text-gray-500">Tiền hàng</span><span className="font-bold">{shop.subtotal.toLocaleString('vi-VN')}đ</span></div>
                                    {shop.productDiscount > 0 && (
                                       <div className="flex justify-between"><span className="text-gray-500">Giảm voucher</span><span className="font-bold text-primary">-{shop.productDiscount.toLocaleString('vi-VN')}đ</span></div>
                                    )}
                                    <div className="flex justify-between"><span className="text-gray-500">Phí ship</span><span className="font-bold">{shop.shippingFee.toLocaleString('vi-VN')}đ</span></div>
                                 </div>
                              </div>
                           );
                        })}
                     </div>

                     <div className="rounded-2xl border-2 border-blue-100 bg-blue-50/40 p-4 mb-4">
                        <div className="flex items-center justify-between mb-2">
                           <span className="text-[10px] font-black uppercase text-blue-700 flex items-center gap-1">
                              <Gift className="size-3" /> Voucher sàn (toàn đơn)
                           </span>
                           {selectedBatchVoucher && (
                              <button type="button" onClick={() => setSelectedBatchVoucher(null)}
                                 className="text-[10px] font-black text-red-500">Bỏ</button>
                           )}
                        </div>
                        {selectedBatchVoucher && (
                           <div className="mb-2 rounded-xl border border-blue-400 bg-white p-2">
                              <p className="text-[10px] font-black text-blue-700">{selectedBatchVoucher.voucherResponse?.voucherCode}</p>
                              <p className="text-[10px] text-gray-600 font-bold mt-0.5">
                                 {getVoucherOfferLines(selectedBatchVoucher).main}
                              </p>
                              <p className="text-xs font-black text-gray-800 mt-1">
                                 -{(batchProductDiscount + batchShippingDiscount).toLocaleString('vi-VN')}đ
                              </p>
                           </div>
                        )}
                        {loadingBatchVouchers ? (
                           <p className="text-[10px] text-gray-400 font-bold">Đang tải voucher sàn...</p>
                        ) : batchVouchers.length === 0 ? (
                           <p className="text-[10px] text-gray-400 font-bold">Không có voucher sàn phù hợp.</p>
                        ) : (
                           <div className="space-y-1.5 max-h-32 overflow-y-auto">
                              {batchVouchers.map((vItem) => {
                                 const v = vItem.voucherResponse!;
                                 const offer = getVoucherOfferLines(vItem);
                                 const disc = isWelcomeVoucher(vItem)
                                    ? calculateVoucherDiscount(vItem, batchProductSubtotal, batchShippingTotal)
                                    : calculateVoucherDiscount(vItem, batchProductSubtotal, 0);
                                 const isSelected = isSameVoucherItem(selectedBatchVoucher, vItem);
                                 return (
                                    <button key={getVoucherItemKey(vItem)} type="button"
                                       onClick={() => setSelectedBatchVoucher(isSelected ? null : vItem)}
                                       className={`w-full text-left rounded-lg border p-2 transition-all bg-white ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                                       <div className="flex justify-between gap-2">
                                          <div>
                                             <p className="text-[9px] font-black text-blue-700 uppercase">{v.voucherCode}</p>
                                             <p className="text-[10px] text-gray-700 font-bold">{offer.main}</p>
                                             <p className="text-[10px] text-gray-500">{offer.sub}</p>
                                          </div>
                                          <span className="text-xs font-black text-blue-700 shrink-0">-{disc.toLocaleString('vi-VN')}đ</span>
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
                           <span className="font-bold text-gray-900">{subtotalAmount.toLocaleString('vi-VN')}đ</span>
                        </div>
                        {productVoucherDiscount > 0 && (
                           <div className="flex justify-between text-xs">
                              <span className="text-gray-600 font-medium">Giảm voucher shop</span>
                              <span className="font-bold text-primary">-{productVoucherDiscount.toLocaleString('vi-VN')}đ</span>
                           </div>
                        )}
                        {batchProductDiscount > 0 && (
                           <div className="flex justify-between text-xs">
                              <span className="text-gray-600 font-medium">Giảm voucher sàn</span>
                              <span className="font-bold text-blue-600">-{batchProductDiscount.toLocaleString('vi-VN')}đ</span>
                           </div>
                        )}
                        <div className="flex justify-between text-xs items-center">
                           <span className="text-gray-600 font-medium flex items-center gap-1">
                              Phí vận chuyển ({shopSummaries.length} shop)
                              {loadingFee && <Loader2 className="size-3 animate-spin text-primary" />}
                           </span>
                           <span className={`font-bold ${loadingFee ? 'text-gray-400' : 'text-gray-900'}`}>
                              {shippingFee.toLocaleString('vi-VN')}đ
                           </span>
                        </div>
                        {shippingVoucherDiscount > 0 && (
                           <div className="flex justify-between text-xs">
                              <span className="text-gray-600 font-medium">Voucher miễn phí vận chuyển</span>
                              <span className="font-bold text-primary">-{shippingVoucherDiscount.toLocaleString('vi-VN')}đ</span>
                           </div>
                        )}
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
                              : <><Lock className="size-5" /> {isMultiShop ? `Đặt ${shopSummaries.length} đơn` : 'Xác nhận thanh toán'}</>
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