import React, { useEffect, useState } from 'react';
import { XCircle, Loader2, Package, ArrowRight, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cartService, paymentService } from '../../services';
import { clearPendingPayOSPayment, saveRestoredPayOSCart } from '../../utils/pendingPayOSPayment';

const PaymentCancel: React.FC = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Get params from URL
  const urlParams = new URLSearchParams(window.location.search);
  const orderCode = urlParams.get('orderCode');

  useEffect(() => {
    const cancelPayment = async () => {
      if (!orderCode) return;
      try {
        setIsCancelling(true);
        setCancelError(null);
        await paymentService.cancelPaymentByOrderCode(orderCode);
        try {
          const restoredCart = await cartService.getCart();
          saveRestoredPayOSCart(restoredCart.result, { orderCode: null, orderId: null });
        } catch (cartError) {
          console.warn('Failed to fetch restored cart after PayOS cancel', cartError);
        }
        clearPendingPayOSPayment();
        sessionStorage.removeItem('payOSExternalCheckoutActive');
        sessionStorage.removeItem('payOSBrowserBackReloaded');
        window.dispatchEvent(new Event('cart-updated'));
      } catch (error: any) {
        setCancelError(error?.data?.message || 'Không thể cập nhật trạng thái hủy thanh toán.');
      } finally {
        setIsCancelling(false);
      }
    };

    cancelPayment();
  }, [orderCode]);

  useEffect(() => {
    // Countdown to redirect
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // navigate('/'); // Autoredirect might be annoying if they want to read the orderCode
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleGoToMyOrders = () => {
    navigate('/my-orders');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4 py-20">
      <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="p-12 flex flex-col items-center text-center">
          {/* Cancel Icon */}
          <div className="size-24 bg-red-50 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-700">
            <div className="size-20 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="size-12 text-red-600" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-black text-gray-900 mb-3 font-display">
            Thanh toán đã hủy
          </h1>

          {/* Description */}
          <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">
            Bạn đã hủy thanh toán qua PayOS. Đơn hàng của bạn đã được lưu lại với trạng thái "Chờ thanh toán".
            Bạn có thể thử thanh toán lại trong mục "Đơn hàng của tôi".
          </p>

          {/* Order Info */}
          {orderCode && (
            <div className="w-full p-6 bg-gray-50 rounded-3xl mb-6">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                Mã đơn hàng/thanh toán
              </p>
              <p className="text-xl font-black text-gray-900">
                #{orderCode}
              </p>
            </div>
          )}

          {/* Warning */}
          <div className="w-full p-4 bg-yellow-50 border border-yellow-100 rounded-2xl mb-8 flex items-start gap-3">
            <AlertTriangle className="size-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-800 font-medium text-left">
              Lưu ý: Đơn hàng sẽ tự động hủy nếu không được thanh toán trong vòng 24h.
            </p>
          </div>

          {isCancelling && (
            <div className="w-full mb-4 rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3 flex items-center gap-2">
              <Loader2 className="size-4 text-blue-600 animate-spin" />
              <p className="text-xs font-bold text-blue-700">Đang cập nhật trạng thái hủy thanh toán...</p>
            </div>
          )}

          {cancelError && (
            <div className="w-full mb-4 rounded-2xl bg-red-50 border border-red-100 px-4 py-3">
              <p className="text-xs font-bold text-red-600">{cancelError}</p>
            </div>
          )}

          {/* Actions */}
          <div className="w-full space-y-3">
            <button
              onClick={handleGoToMyOrders}
              className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20"
            >
              <Package className="size-5" />
              Tới đơn hàng của tôi
            </button>

            <button
              onClick={handleGoHome}
              className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all"
            >
              Quay lại trang chủ
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;
