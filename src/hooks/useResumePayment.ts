import { useState } from 'react';
import type { ResumePaymentOptionsResponse } from '../services/payment.service';
import { handleResumePaymentClick } from '../utils/resumePayOSPayment';

type ResumeErrorHandler = (message: string) => void;

export function useResumePayment(onError?: ResumeErrorHandler) {
  const [resumeOptions, setResumeOptions] = useState<ResumePaymentOptionsResponse | null>(null);
  const [resuming, setResuming] = useState(false);

  const openResumePayment = async (orderId: number) => {
    setResuming(true);
    try {
      await handleResumePaymentClick(orderId, setResumeOptions);
    } catch (e: any) {
      const message = e?.data?.message ?? e?.message ?? 'Không thể tiếp tục thanh toán.';
      onError?.(message);
    } finally {
      setResuming(false);
    }
  };

  const closeResumePayment = () => setResumeOptions(null);

  return {
    openResumePayment,
    resuming,
    resumeOptions,
    closeResumePayment,
  };
}
