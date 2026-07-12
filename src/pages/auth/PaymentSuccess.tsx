import React, { useEffect, useRef, useState } from 'react';
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
  const [orderSummaries, setOrderSummaries] = useState<OrderResponse[]>([]);
  const [paidOrderIds, setPaidOrderIds] = useState<number[]>([]);

  const urlParams = new URLSearchParams(window.location.search);
  const orderCode = urlParams.get('orderCode');
  const orderIdParam = urlParams.get('orderId');
  const payosStatus = urlParams.get('status');
  const paymentLinkId = urlParams.get('id'); // PayOS payment link id trên return URL
  const payosCode = urlParams.get('code');

  const resolvedRef = useRef(false);
  const confirmingRef = useRef(false);

  useEffect(() => {
    clearPendingPayOSPayment();
    clearRestoredPayOSCart();
    sessionStorage.removeItem('payOSExternalCheckoutActive');
    sessionStorage.removeItem('payOSBrowserBackReloaded');

    let pollInterval: ReturnType<typeof setInterval> | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let pollCount = 0;
    // PayOS verify phía BE có thể 20–60s (IPv4/retry) — chờ đủ lâu
    const MAX_POLLS = 45; // 45 * 2s = 90s
    let countdownTimer: ReturnType<typeof setInterval> | undefined;

    const markResolved = () => {
      resolvedRef.current = true;
      if (pollInterval) clearInterval(pollInterval);
      if (timeoutId) clearTimeout(timeoutId);
    };

    const loadPaidOrders = async (orderIds: number[]) => {
      setPaidOrderIds(orderIds);
      if (orderIds.length === 0) return;
      try {
        const results = await Promise.all(orderIds.map((id) => orderService.getOrderById(id)));
        const summaries = results
          .map((res) => res.result)
          .filter((v): v is OrderResponse => Boolean(v));
        setOrderSummaries(summaries);
      } catch (error) {
        console.error('Failed to load order rescue summary:', error);
      }
    };

    const startCountdown = () => {
      if (countdownTimer) clearInterval(countdownTimer);
      countdownTimer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownTimer) clearInterval(countdownTimer);
            navigate('/');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    const onSuccess = (ids: number[]) => {
      if (resolvedRef.current) return;
      markResolved();
      if (ids.length > 0) void loadPaidOrders(ids);
      setPaymentStatus('success');
      startCountdown();
    };

    /** BE tự hỏi PayOS API — không tin status=PAID trên URL. */
    const confirmOrder = async () => {
      if (!orderCode || confirmingRef.current || resolvedRef.current) return;
      confirmingRef.current = true;
      try {
        await paymentService.confirmPaymentByOrderCode(orderCode, paymentLinkId);
        // Confirm OK → poll lại ngay để cập nhật UI
        const res = await paymentService.getById(orderCode);
        if (res.result?.status === 'SUCCESS') {
          const ids = res.result.orderIds?.length
            ? res.result.orderIds
            : (res.result.orderId ? [res.result.orderId] : []);
          onSuccess(ids);
        }
      } catch (confirmError: any) {
        console.error('Error confirming payment status:', confirmError);
        if (confirmError?.status === 401) {
          markResolved();
          setPaymentStatus('failed');
          setErrorMsg('Phiên đã hết hạn, vui lòng đăng nhập lại để tiếp tục.');
        }
        // 5014/5015 → tiếp tục poll
      } finally {
        confirmingRef.current = false;
      }
    };

    const checkStatus = async () => {
      if (resolvedRef.current || !orderCode) return;

      try {
        const res = await paymentService.getById(orderCode);
        if (res.result?.status === 'SUCCESS') {
          const ids = res.result.orderIds?.length
            ? res.result.orderIds
            : (res.result.orderId ? [res.result.orderId] : []);
          onSuccess(ids);
          return;
        }
        if (res.result?.status === 'FAILED') {
          markResolved();
          setPaymentStatus('failed');
          setErrorMsg('Thanh toán thất bại hoặc đã bị hủy.');
          return;
        }
        // PENDING: định kỳ nhờ BE verify PayOS (không chồng request)
        if (!confirmingRef.current && (pollCount === 0 || pollCount % 4 === 0)) {
          void confirmOrder();
        }
      } catch (error) {
        console.error('Failed to check payment status:', error);
        if (!confirmingRef.current) void confirmOrder();
      }

      pollCount++;
      if (pollCount >= MAX_POLLS && !resolvedRef.current && !confirmingRef.current) {
        markResolved();
        setPaymentStatus('timeout');
        setErrorMsg('Chưa nhận được xác nhận từ hệ thống. Nếu đã chuyển khoản, bấm Kiểm tra lại hoặc xem Đơn hàng.');
      }
    };

    if (payosStatus === 'CANCELLED') {
      navigate('/payment/cancel' + window.location.search);
      return;
    }

    // Không tin ?orderId= trên URL — chỉ success khi đơn đã PAID trên BE
    if (!orderCode && orderIdParam) {
      const orderId = Number(orderIdParam);
      if (!Number.isNaN(orderId)) {
        void (async () => {
          try {
            const res = await orderService.getOrderById(orderId);
            if (res.result?.status === 'PAID') {
              onSuccess([orderId]);
            } else {
              setPaymentStatus('timeout');
              setErrorMsg('Chưa xác nhận được thanh toán. Vui lòng kiểm tra lại đơn hàng.');
            }
          } catch {
            setPaymentStatus('failed');
            setErrorMsg('Không tìm thấy thông tin đơn hàng.');
          }
        })();
      } else {
        setPaymentStatus('failed');
        setErrorMsg('Không tìm thấy thông tin đơn hàng.');
      }
      return;
    }

    if (!orderCode) {
      setPaymentStatus('failed');
      setErrorMsg('Không tìm thấy mã thanh toán (orderCode).');
      return;
    }

    // Bắt đầu verify ngay + poll
    void confirmOrder();
    void checkStatus();
    pollInterval = setInterval(checkStatus, 2000);

    timeoutId = setTimeout(() => {
      if (!resolvedRef.current && !confirmingRef.current) {
        markResolved();
        setPaymentStatus('timeout');
        setErrorMsg('Chưa nhận được xác nhận từ hệ thống. Nếu đã chuyển khoản, bấm Kiểm tra lại hoặc xem Đơn hàng.');
      }
    }, MAX_POLLS * 2000 + 15_000); // thêm buffer khi confirm đang chạy lâu

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (timeoutId) clearTimeout(timeoutId);
      if (countdownTimer) clearInterval(countdownTimer);
    };
  }, [orderCode, orderIdParam, navigate, payosStatus, paymentLinkId]);

  const handleGoToMyOrders = () => {
    navigate('/my-orders');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleRetryCheck = () => {
    window.location.reload();
  };

  const rescuedWeight = orderSummaries.reduce((sum, order) => sum + Number(order.rescuedWeight ?? 0), 0);
  const rewardPoints = orderSummaries.reduce((sum, order) => sum + Number(order.rewardPoints ?? 0), 0);
  const rewardApplied = orderSummaries.some((order) => Boolean(order.rewardApplied));
  const formatKg = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
  const hintFromPayOS =
    payosCode === '00' || payosStatus === 'PAID'
      ? 'PayOS đã báo thanh toán thành công. Hệ thống đang xác nhận đơn hàng — vui lòng đợi thêm.'
      : 'Chúng tôi đang kiểm tra trạng thái thanh toán từ PayOS. Vui lòng không đóng trình duyệt.';

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
              <p className="text-sm text-gray-500 font-medium mb-8 leading-relaxed">
                {hintFromPayOS}
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

              {(paidOrderIds.length > 0 || orderCode) && (
                <div className="w-full p-6 bg-gray-50 rounded-3xl mb-8">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                    Mã đơn hàng
                  </p>
                  {paidOrderIds.length > 1 ? (
                    <div className="flex flex-wrap gap-2 justify-center">
                      {paidOrderIds.map((id) => (
                        <span key={id} className="text-base font-black text-primary">#{id}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xl font-black text-primary">#{paidOrderIds[0] ?? orderCode}</p>
                  )}
                </div>
              )}

              {orderSummaries.length > 0 && rescuedWeight > 0 && (
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
                      : `${formatKg(rewardPoints)} điểm dự kiến, sẽ cộng khi đơn hoàn tất`}
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
