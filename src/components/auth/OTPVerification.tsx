import React, { useState, useEffect } from 'react';
import { Mail, ArrowRight, RefreshCw } from 'lucide-react';
import { otpService } from '../../services';

interface OTPVerificationProps {
  email: string;
  onVerified: () => void;
  onBack: () => void;
}

const OTPVerification: React.FC<OTPVerificationProps> = ({ email, onVerified, onBack }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  // Auto-send OTP on mount removed to prevent double sending. The parent component should send the OTP before mounting this component.
  // The 'Gửi lại mã OTP' button will still use handleSendOtp.

  const handleSendOtp = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await otpService.sendOtp(email);
      setSuccess('Mã OTP đã được gửi đến email của bạn!');
      setCountdown(60);
      setCanResend(false);
    } catch (err: any) {
      console.error('Send OTP error:', err);
      setError(err?.data?.message || 'Không thể gửi OTP. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');

    if (otpCode.length !== 6) {
      setError('Vui lòng nhập đầy đủ 6 số');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await otpService.verifyOtp(email, otpCode);

      if (response.result?.verified) {
        setSuccess('Xác thực thành công!');
        setTimeout(() => {
          onVerified();
        }, 1000);
      }
    } catch (err: any) {
      console.error('Verify OTP error:', err);
      setError(err?.data?.message || 'Mã OTP không đúng. Vui lòng thử lại.');
      setOtp(['', '', '', '', '', '']);
      document.getElementById('otp-0')?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf8] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="size-16 bg-green-50 rounded-full flex items-center justify-center">
            <Mail className="size-8 text-[#5c8d5e]" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-gray-900 mb-2">Xác thực Email</h2>
          <p className="text-gray-500 text-sm">
            Chúng tôi đã gửi mã OTP đến
          </p>
          <p className="text-[#5c8d5e] font-bold text-sm">{email}</p>
          <p className="mt-3 text-xs font-semibold text-amber-600 leading-relaxed">
            Nếu chưa thấy email, bạn hãy kiểm tra thêm mục Spam/Thư rác hoặc Quảng cáo trong Gmail nhé.
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-xs text-red-600 font-semibold text-center">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-xs text-green-600 font-semibold text-center">{success}</p>
          </div>
        )}

        {/* OTP Input */}
        <div className="flex gap-2 justify-center mb-6">
          {otp.map((digit, index) => (
            <input
              key={index}
              id={`otp-${index}`}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={isLoading}
              className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-[#5c8d5e] focus:ring-4 focus:ring-[#5c8d5e]/10 outline-none transition-all disabled:bg-gray-50"
            />
          ))}
        </div>

        {/* Resend */}
        <div className="text-center mb-6">
          {canResend ? (
            <button
              onClick={handleSendOtp}
              disabled={isLoading}
              className="text-[#5c8d5e] font-bold text-sm hover:underline flex items-center gap-2 justify-center mx-auto disabled:opacity-50"
            >
              <RefreshCw className="size-4" />
              Gửi lại mã OTP
            </button>
          ) : (
            <p className="text-gray-400 text-sm">
              Gửi lại mã sau <span className="font-bold text-gray-600">{countdown}s</span>
            </p>
          )}
        </div>

        {/* Verify Button */}
        <button
          onClick={handleVerify}
          disabled={isLoading || otp.join('').length !== 6}
          className="w-full py-4 bg-[#5c8d5e] text-white font-black text-sm rounded-2xl hover:bg-[#4a724b] transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? 'ĐANG XÁC THỰC...' : 'XÁC THỰC'}
          <ArrowRight className="size-4" />
        </button>

        {/* Back Button */}
        <button
          onClick={onBack}
          disabled={isLoading}
          className="w-full mt-4 py-3 text-gray-500 font-bold text-sm hover:text-gray-700 transition-all disabled:opacity-50"
        >
          Quay lại
        </button>
      </div>
    </div>
  );
};

export default OTPVerification;
