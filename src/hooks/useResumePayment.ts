import { useState, useCallback } from 'react';
import type { ResumePaymentOptionsResponse } from '../services/payment.service';
import { handleResumePaymentClick, type ResumePayMode } from '../utils/resumePayOSPayment';

type ResumeErrorHandler = (message: string) => void;

export function useResumePayment(onError?: ResumeErrorHandler) {
  const [resumeOptions, setResumeOptions] = useState<ResumePaymentOptionsResponse | null>(null);
  const [resuming, setResuming] = useState(false);

  const openResumePayment = useCallback(async (orderId: number, payMode?: ResumePayMode) => {
    setResuming(true);
    try {
      await handleResumePaymentClick(orderId, setResumeOptions, payMode);
    } catch (e: any) {
      const message = e?.data?.message ?? e?.message ?? 'Không thể tiếp tục thanh toán.';
      onError?.(message);
    } finally {
      setResuming(false);
    }
  }, [onError]);

  const closeResumePayment = useCallback(() => setResumeOptions(null), []);

  return {
    openResumePayment,
    resuming,
    resumeOptions,
    closeResumePayment,
  };
}
