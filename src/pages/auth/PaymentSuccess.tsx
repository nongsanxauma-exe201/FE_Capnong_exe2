import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, Loader2, Package, ArrowRight, RefreshCw, Sprout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { orderService, paymentService } from '../../services';
import type { OrderResponse } from '../../services/order.service';
import { clearPendingPayOSPayment, clearRestoredPayOSCart } from '../../utils/pendingPayOSPayment';

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);
  const [paymentStatus, setPaymentStatus] = useState<'verifying' | 'success' | 'failed' | 'timeout'>('verifying');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [orderSummary, setOrderSummary] = useState<OrderResponse | null>(null);

  // Get params from URL
  const urlParams = new URLSearchParams(window.location.search);
  const orderCode = urlParams.get('orderCode'); // This is actually the paymentId from BE
  const orderIdParam = urlParams.get('orderId');
  const payosStatus = urlParams.get('status');

  useEffect(() => {
    clearPendingPayOSPayment();
    clearRestoredPayOSCart();
    sessionStorage.removeItem('payOSExternalCheckoutActive');
    sessionStorage.removeItem('payOSBrowserBackReloaded');

    let pollInterval: NodeJS.Timeout;
    let timeoutId: NodeJS.Timeout;
    let pollCount = 0;
    const MAX_POLLS = 15; // 15 * 2s = 30 seconds max

    const loadOrderSummary = async (orderId: number) => {
      try {
        const orderRes = await orderService.getOrderById(orderId);
        if (orderRes.result) {
          setOrderSummary(orderRes.result);
        }
      } catch (error) {
        console.error('Failed to load order rescue summary:', error);
      }
    };

    const confirmOrder = async () => {
      if (!orderCode) return;
      try {
        // Vì BE endpoint mới dùng orderCode string
        await paymentService.confirmPaymentByOrderCode(orderCode);
        console.log('Payment confirmed successfully.');
      } catch (confirmError: any) {
        console.error('Error confirming payment status:', confirmError);

        if (confirmError?.status === 401) {
          setPaymentStatus('failed');
          setErrorMsg('Phiên đã hết hạn, vui lòng đăng nhập lại để tiếp tục.');
          return;
        }

        // Nếu lỗi không phải 401, để continue polling và hiển thị trạng thái phù hợp.
      }
    };

    const checkStatus = async () => {
      if (!orderCode) {
        setPaymentStatus('failed');
        setErrorMsg('Không tìm thấy thông tin đơn hàng.');
        return;
      }

      try {
        const res = await paymentService.getById(orderCode);
        if (res.result) {
          if (res.result.status === 'SUCCESS') {
            if (res.result.orderId) {
              void loadOrderSummary(res.result.orderId);
            }
            setPaymentStatus('success');
            clearInterval(pollInterval);
            clearTimeout(timeoutId);
            startCountdown();
          } else if (res.result.status === 'FAILED') {
            setPaymentStatus('failed');
            setErrorMsg('Thanh toán thất bại hoặc đã bị hủy.');
            clearInterval(pollInterval);
            clearTimeout(timeoutId);
          }
          // If PENDING, keep polling
        }
      } catch (error) {
        console.error('Failed to check payment status:', error);
      }

      pollCount++;
      if (pollCount >= MAX_POLLS) {
        setPaymentStatus('timeout');
        clearInterval(pollInterval);
      }
    };

    const startCountdown = () => {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate('/');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    if (payosStatus === 'CANCELLED') {
      navigate('/payment/cancel' + window.location.search);
      return;
    }

    if (orderIdParam) {
      const orderId = Number(orderIdParam);
      if (!Number.isNaN(orderId)) {
        setPaymentStatus('success');
        void loadOrderSummary(orderId);
        startCountdown();
        return;
      }
    }

    // Confirm payment via API (backup when webhook chưa gọi kịp)
    confirmOrder();

    // Start polling
    checkStatus();
    pollInterval = setInterval(checkStatus, 2000);

    // Safety timeout
    timeoutId = setTimeout(() => {
      setPaymentStatus('timeout');
      clearInterval(pollInterval);
    }, MAX_POLLS * 2000 + 1000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeoutId);
    };
  }, [orderCode, orderIdParam, navigate, payosStatus]);

  const handleGoToMyOrders = () => {
    navigate('/my-orders');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleRetryCheck = () => {
    window.location.reload();
  };

  const rescuedWeight = Number(orderSummary?.rescuedWeight ?? 0);
  const rewardPoints = Number(orderSummary?.rewardPoints ?? 0);
  const rewardApplied = Boolean(orderSummary?.rewardApplied);
  const formatKg = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 2 });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4 py-20">
      <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="p-12 flex flex-col items-center text-center">
          {paymentStatus === 'verifying' && (
            <>
              <div className="size-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                <Loader2 className="size-12 text-blue-500 animate-spin" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 mb-3">Đang xác thực...</h1>
              <p className="text-sm text-gray-500 font-medium mb-8">
                Chúng tôi đang kiểm tra trạng thái thanh toán từ PayOS.
                Vui lòng không đóng trình duyệt.
              </p>
            </>
          )}

          {paymentStatus === 'success' && (
            <>
              <div className="size-24 bg-green-50 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-700">
                <div className="size-20 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="size-12 text-green-600" />
                </div>
              </div>
              <h1 className="text-3xl font-black text-gray-900 mb-3 font-display">
                Thanh toán thành công!
              </h1>
              <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">
                Đơn hàng của bạn đã được xác nhận.
                Chúng tôi sẽ xử lý đơn hàng trong thời gian sớm nhất.
              </p>

              {(orderSummary?.id || orderCode) && (
                <div className="w-full p-6 bg-gray-50 rounded-3xl mb-8">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                    Mã đơn hàng
                  </p>
                  <p className="text-xl font-black text-primary">
                    #{orderSummary?.id ?? orderCode}
                  </p>
                </div>
              )}

              {orderSummary && rescuedWeight > 0 && (
                <div className="w-full p-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-3xl mb-8 text-left">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                      <Sprout className="size-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest">Giải cứu nông sản</p>
                      <p className="text-lg font-black text-gray-900">{formatKg(rescuedWeight)} kg</p>
                    </div>
                  </div>
                  <p className="text-sm text-green-800 font-bold leading-relaxed">
                    Cảm ơn bạn đã mua hàng! Với đơn hàng này, bạn đã góp phần giải cứu {formatKg(rescuedWeight)} kg nông sản, giúp nông dân giảm lãng phí.
                  </p>
                  <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/80 px-4 py-3 text-sm font-black text-amber-600">
                    <Award className="size-5" />
                    {rewardApplied
                      ? `+${formatKg(rewardPoints)} điểm tích lũy`
                      : `${formatKg(rewardPoints)} điểm dự kiến, sẽ cộng khi đơn hoàn tất`
                    }
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 text-sm text-gray-500 font-bold mb-8">
                <Loader2 className="size-4 animate-spin" />
                <span>Tự động chuyển sau {countdown} giây...</span>
              </div>
            </>
          )}

          {(paymentStatus === 'failed' || paymentStatus === 'timeout') && (
            <>
              <div className="size-24 bg-red-50 rounded-full flex items-center justify-center mb-6">
                <div className="size-20 bg-red-100 rounded-full flex items-center justify-center">
                  <Package className="size-12 text-red-600" />
                </div>
              </div>
              <h1 className="text-2xl font-black text-gray-900 mb-3">
                {paymentStatus === 'timeout' ? 'Hết thời gian chờ' : 'Có lỗi xảy ra'}
              </h1>
              <p className="text-sm text-gray-500 font-medium mb-8">
                {errorMsg || 'Không thể xác thực trạng thái thanh toán ngay lúc này.'}
              </p>

              <button
                onClick={handleRetryCheck}
                className="w-full py-4 bg-primary text-white font-black rounded-2xl flex items-center justify-center gap-2 mb-3 shadow-lg shadow-primary/20"
              >
                <RefreshCw className="size-5" />
                Kiểm tra lại
              </button>
            </>
          )}

          {/* Actions */}
          <div className="w-full space-y-3">
            {paymentStatus !== 'verifying' && (
              <button
                onClick={handleGoToMyOrders}
                className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all"
              >
                <Package className="size-5" />
                Xem đơn hàng của tôi
              </button>
            )}

            <button
              onClick={handleGoHome}
              className="w-full py-4 bg-gray-50 hover:bg-gray-100 text-gray-500 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all"
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

export default PaymentSuccess;
