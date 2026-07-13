import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bike, User, Phone, Mail, Lock, MapPin, CreditCard, FileText, Camera, ArrowRight, ArrowLeft, CheckCircle2, Shield } from 'lucide-react';
// OTP tạm tắt: X
import { shipperService, authService } from '../../services';
// OTP tạm tắt
// import { otpService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { AppRole, KYCStatus } from '../../types';

interface ShipperRegisterProps {
  onBack: () => void;
}

const ShipperRegister: React.FC<ShipperRegisterProps> = ({ onBack }) => {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === AppRole.ADMIN) navigate('/admin');
      else if (user.role === AppRole.FARMER) {
        if (user.kycStatus === KYCStatus.PENDING) navigate('/kyc');
        else navigate('/farmer');
      }
      else if (user.role === AppRole.SHIPPER) {
        if (user.kycStatus === KYCStatus.PENDING) navigate('/kyc');
        else navigate('/shipper');
      }
      else navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '', phone: '', email: '', password: '', confirmPassword: '',
    address: '', city: '', vehicleType: 'motorbike',
    licensePlate: '', driverLicense: '', bankName: '', bankAccount: '', bankAccountName: '',
  });

  const [uploadedFiles, setUploadedFiles] = useState({
    driverLicense: null as File | null,
    portrait: null as File | null,
    vehicleDoc: null as File | null,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OTP tạm tắt
  // const [showOtpModal, setShowOtpModal] = useState(false);
  // const [otpCode, setOtpCode] = useState('');
  // const [otpError, setOtpError] = useState<string | null>(null);
  // const [isVerifying, setIsVerifying] = useState(false);

  const handleFileUpload = (field: keyof typeof uploadedFiles, file: File) => {
    setUploadedFiles({ ...uploadedFiles, [field]: file });
  };

  const validateStep = (currentStep: number): boolean => {
    setError(null);

    switch (currentStep) {
      case 1:
        if (!formData.fullName || !formData.phone || !formData.email || !formData.password || !formData.confirmPassword || !formData.city || !formData.address) {
          setError('Vui lòng điền đầy đủ thông tin');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Mật khẩu xác nhận không khớp');
          return false;
        }
        if (formData.password.length < 8) {
          setError('Mật khẩu phải có ít nhất 8 ký tự');
          return false;
        }
        break;
      case 2:
        if (!formData.licensePlate || !formData.driverLicense) {
          setError('Vui lòng điền đầy đủ thông tin phương tiện');
          return false;
        }
        break;
      case 3:
        if (!uploadedFiles.driverLicense || !uploadedFiles.portrait) {
          setError('Vui lòng tải lên đầy đủ giấy tờ');
          return false;
        }
        break;
      case 4:
        if (!formData.bankName || !formData.bankAccount || !formData.bankAccountName) {
          setError('Vui lòng điền đầy đủ thông tin thanh toán');
          return false;
        }
        break;
    }
    return true;
  };

  // OTP tạm tắt — đăng ký trực tiếp
  const handleCompleteRegister = async () => {
    if (!validateStep(4)) return;
    await performRegistration();
  };

  /* OTP tạm tắt
  const handleSendOtp = async () => {
    if (!validateStep(4)) return;
    setIsLoading(true);
    setError(null);
    try {
      await otpService.sendOtp(formData.email);
      setShowOtpModal(true);
    } catch (err: any) {
      console.error('Send OTP failed:', err);
      setError(err?.data?.message || 'Không thể gửi mã xác thực. Vui lòng kiểm tra email và thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 6) {
      setOtpError('Mã OTP không hợp lệ');
      return;
    }

    setIsVerifying(true);
    setOtpError(null);
    try {
      await otpService.verifyOtp(formData.email, otpCode);
      await performRegistration();
    } catch (err: any) {
      console.error('Verify OTP failed:', err);
      setOtpError(err?.data?.message || 'Mã xác thực không đúng hoặc đã hết hạn.');
    } finally {
      setIsVerifying(false);
    }
  };
  */

  const performRegistration = async () => {
    setIsLoading(true);
    try {
      const description = `Loại xe: ${formData.vehicleType === 'motorbike' ? 'Xe máy' : 'Ô tô'}. Thành phố: ${formData.city}.`;

      const registerData = {
        fullName: formData.fullName,
        phoneNumber: formData.phone,
        email: formData.email,
        password: formData.password,
        address: formData.address,
        license: formData.driverLicense,
        vehicleNumber: formData.licensePlate,
        bankName: formData.bankName,
        bankAccount: formData.bankAccount,
        bankAccountHolder: formData.bankAccountName,
        description: description,
      };

      const response = await shipperService.register(registerData, uploadedFiles);

      if (response.result) {
        // setShowOtpModal(false); // OTP tạm tắt
        // Sau khi đăng ký thành công, tự động đăng nhập để lấy token
        let loginResponse;
        try {
          loginResponse = await authService.login({
            email: formData.email,
            password: formData.password
          });
        } catch (loginErr) {
          console.error("Auto-login failed:", loginErr);
        }

        if (loginResponse?.result?.token) {
          login(AppRole.SHIPPER);
          navigate('/kyc');
        } else {
          // If login fails (e.g. pending approval), but registration was successful
          navigate('/kyc', {
            state: {
              pendingUser: {
                name: formData.fullName,
                email: formData.email,
                role: AppRole.SHIPPER,
                phone: formData.phone,
                address: formData.address,
                bankAccount: formData.bankAccount,
                avatar: uploadedFiles.portrait ? URL.createObjectURL(uploadedFiles.portrait) : null,
                achievement: uploadedFiles.driverLicense ? uploadedFiles.driverLicense.name : null
              }
            }
          });
        }
      }
    } catch (err: any) {
      console.error('Shipper registration failed:', err);
      // setShowOtpModal(false); // OTP tạm tắt
      setError(err?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const steps = [
    { number: 1, title: 'Cá nhân', icon: User },
    { number: 2, title: 'Phương tiện', icon: Bike },
    { number: 3, title: 'Giấy tờ', icon: FileText },
    { number: 4, title: 'Thanh toán', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e8f5e9] via-[#f1f8f4] to-[#e0f2f1] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-green-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-[900px] bg-white rounded-[40px] shadow-2xl overflow-hidden flex border animate-in fade-in duration-700 relative z-10">

        {/* Left Sidebar */}
        <div className="w-[240px] bg-gradient-to-br from-[#1a4d2e] to-[#2d6b3f] p-6 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <button onClick={onBack} className="flex items-center gap-2 text-white/70 hover:text-white mb-8 transition-colors font-bold text-xs uppercase">
              <ArrowLeft className="size-4" /> Quay lại
            </button>

            <div className="size-12 bg-white rounded-xl flex items-center justify-center text-primary mb-4 shadow-xl">
              <Bike className="size-6" />
            </div>

            <h1 className="text-2xl font-black font-display leading-tight mb-1 uppercase">ĐĂNG KÝ</h1>
            <h2 className="text-xl font-black text-white/50 font-display mb-3">SHIPPER</h2>

            <p className="text-[13px] text-white/90 font-medium leading-relaxed mb-6">
              Trở thành đối tác vận chuyển và kiếm thu nhập linh hoạt.
            </p>

            <div className="space-y-2">
              {steps.map((s) => (
                <div key={s.number} className="flex items-center gap-2.5">
                  <div className={`size-8 rounded-lg flex items-center justify-center font-black text-xs transition-all ${step === s.number ? 'bg-white text-primary shadow-lg' :
                    step > s.number ? 'bg-primary/30 text-white' : 'bg-white/10 text-white/50'
                    }`}>
                    {step > s.number ? <CheckCircle2 className="size-4" /> : s.number}
                  </div>
                  <p className={`text-xs font-bold uppercase ${step === s.number ? 'text-white' : 'text-white/50'}`}>
                    {s.title}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/20 mt-8">
            <p className="text-xs italic font-medium">💰 Thu nhập TB: <span className="font-black">8-12tr/tháng</span></p>
          </div>
          <div className="absolute -bottom-20 -right-20 size-64 bg-white/5 rounded-full blur-3xl" />
        </div>

        {/* Right Form */}
        <div className="flex-1 p-7 bg-white overflow-y-auto max-h-[90vh] custom-scrollbar">
          <div className="max-w-[480px] mx-auto">
            {/* Progress */}
            <div className="mb-5">
              <div className="flex gap-2 mb-2.5">
                {steps.map((s) => (
                  <div key={s.number} className={`flex-1 h-1.5 rounded-full transition-all ${step >= s.number ? 'bg-primary' : 'bg-gray-100'}`} />
                ))}
              </div>
              <p className="text-[11px] font-bold text-gray-400">Bước {step} / {steps.length}</p>
            </div>

            {/* Step 1 */}
            {step === 1 && (
              <div className="space-y-2.5">
                <div className="mb-3">
                  <h3 className="text-lg font-black text-gray-900 mb-0.5 uppercase">Thông tin cá nhân</h3>
                  <p className="text-[13px] text-gray-500">Điền đầy đủ thông tin chính xác</p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-2xl">
                    <p className="text-sm text-red-600 font-semibold">{error}</p>
                  </div>
                )}

                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-300" />
                  <input type="text" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Họ và tên" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-[15px]"
                    required disabled={isLoading} />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-300" />
                    <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Số điện thoại" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-[15px]"
                      required disabled={isLoading} />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-300" />
                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Email" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-[15px]"
                      required disabled={isLoading} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-300" />
                    <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Mật khẩu" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-[15px]"
                      required disabled={isLoading} />
                  </div>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-300" />
                    <input type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Xác nhận MK" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-[15px]"
                      required disabled={isLoading} />
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_2fr] gap-2.5">
                  <select value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm cursor-pointer"
                    required disabled={isLoading}>
                    <option value="">Tỉnh/TP</option>
                    <option value="hcm">HCM</option>
                    <option value="hn">Hà Nội</option>
                    <option value="dn">Đà Nẵng</option>
                  </select>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-300" />
                    <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Địa chỉ chi tiết" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-[15px]"
                      required disabled={isLoading} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="space-y-3">
                <div className="mb-4">
                  <h3 className="text-xl font-black text-gray-900 mb-1 uppercase">Phương tiện</h3>
                  <p className="text-sm text-gray-500">Thông tin xe vận chuyển</p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-2xl">
                    <p className="text-sm text-red-600 font-semibold">{error}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-bold text-gray-600 uppercase mb-3 block">Loại xe</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[{ value: 'motorbike', label: 'Xe máy', icon: '🏍️' }, { value: 'car', label: 'Ô tô', icon: '🚗' }].map((type) => (
                      <button key={type.value} onClick={() => setFormData({ ...formData, vehicleType: type.value })} type="button"
                        disabled={isLoading}
                        className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${formData.vehicleType === type.value ? 'border-primary bg-primary/5 shadow-lg' : 'border-gray-200 hover:border-gray-300'}`}>
                        <span className="text-3xl">{type.icon}</span>
                        <span className="text-base font-bold">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="relative">
                  <Bike className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-300" />
                  <input type="text" value={formData.licensePlate} onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                    placeholder="Biển số xe" className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-base uppercase"
                    required disabled={isLoading} />
                </div>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-300" />
                  <input type="text" value={formData.driverLicense} onChange={(e) => setFormData({ ...formData, driverLicense: e.target.value })}
                    placeholder="Số bằng lái xe" className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-base"
                    required disabled={isLoading} />
                </div>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="space-y-2.5">
                <div className="mb-3">
                  <h3 className="text-xl font-black text-gray-900 mb-1 uppercase">Giấy tờ</h3>
                  <p className="text-sm text-gray-500">Tải lên ảnh rõ ràng</p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-2xl mb-2">
                    <p className="text-sm text-red-600 font-semibold">{error}</p>
                  </div>
                )}

                {([
                  { field: 'driverLicense' as const, label: 'Bằng lái xe / CCCD *' },
                  { field: 'portrait' as const, label: 'Ảnh chân dung *' },
                  { field: 'vehicleDoc' as const, label: 'Giấy tờ xe (tùy chọn)' },
                ]).map(({ field, label }) => (
                    <div key={field}>
                      <input type="file" id={field} accept="image/*" onChange={(e) => e.target.files && handleFileUpload(field, e.target.files[0])} className="hidden" disabled={isLoading} />
                      <label htmlFor={field} className={`block p-3.5 rounded-2xl border-2 border-dashed cursor-pointer flex items-center gap-3 transition-all ${uploadedFiles[field] ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {uploadedFiles[field] ? <CheckCircle2 className="size-5 text-primary" /> : <Camera className="size-5 text-gray-300" />}
                        <span className="text-sm font-bold text-gray-700">{label}</span>
                        {uploadedFiles[field] && <span className="text-sm text-primary ml-auto font-bold">✓ Đã tải</span>}
                      </label>
                    </div>
                ))}
                <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3 mt-3">
                  <Shield className="size-5 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800 leading-relaxed">Thông tin được mã hóa và bảo mật, chỉ dùng để xác thực danh tính.</p>
                </div>
              </div>
            )}

            {/* Step 4 */}
            {step === 4 && (
              <div className="space-y-3">
                <div className="mb-4">
                  <h3 className="text-xl font-black text-gray-900 mb-1 uppercase">Thanh toán</h3>
                  <p className="text-sm text-gray-500">Nhận thu nhập từ giao hàng</p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-2xl">
                    <p className="text-sm text-red-600 font-semibold">{error}</p>
                  </div>
                )}

                <select value={formData.bankName} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-base cursor-pointer"
                  required disabled={isLoading}>
                  <option value="">Chọn ngân hàng</option>
                  <option value="Vietcombank">Vietcombank</option>
                  <option value="BIDV">BIDV</option>
                  <option value="VietinBank">VietinBank</option>
                  <option value="Agribank">Agribank</option>
                  <option value="Techcombank">Techcombank</option>
                  <option value="ACB">ACB</option>
                  <option value="Sacombank">Sacombank</option>
                  <option value="MB Bank">MB Bank</option>
                  <option value="VPBank">VPBank</option>
                  <option value="TPBank">TPBank</option>
                  <option value="SHB">SHB</option>
                  <option value="HDBank">HDBank</option>
                  <option value="VIB">VIB</option>
                  <option value="OCB">OCB</option>
                </select>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-300" />
                  <input type="text" value={formData.bankAccount} onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                    placeholder="Số tài khoản" className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-base"
                    required disabled={isLoading} />
                </div>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-300" />
                  <input type="text" value={formData.bankAccountName} onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                    placeholder="Tên chủ tài khoản" className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-base uppercase"
                    required disabled={isLoading} />
                </div>
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 mt-4">
                  <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-base">
                    <CheckCircle2 className="size-5 text-primary" /> Hoàn tất đăng ký!
                  </h4>
                  <p className="text-sm text-gray-600 leading-relaxed">Hồ sơ của bạn sẽ được xem xét và duyệt trong vòng 24-48 giờ. Chúng tôi sẽ thông báo kết quả qua email và SMS.</p>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              {step > 1 && (
                <button onClick={() => setStep(step - 1)} type="button"
                  disabled={isLoading}
                  className="px-6 py-3.5 bg-gray-100 text-gray-600 rounded-2xl font-bold text-base hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  Quay lại
                </button>
              )}
              <button onClick={() => step < 4 ? handleNext() : handleCompleteRegister()} type="button"
                disabled={isLoading}
                className="flex-1 py-3.5 bg-primary text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang xử lý...
                  </div>
                ) : step < 4 ? (
                  <>Tiếp tục <ArrowRight className="size-5" /></>
                ) : (
                  <>Hoàn tất đăng ký <CheckCircle2 className="size-5" /></>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* OTP Verification Modal — tạm tắt. Bỏ comment + import Shield,X + state OTP + đổi nút về handleSendOtp để bật lại
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl relative translate-y-0 animate-in slide-in-from-bottom-4 duration-300">
            <button
              onClick={() => setShowOtpModal(false)}
              disabled={isVerifying}
              className="absolute top-6 right-6 size-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors disabled:opacity-50"
            >
              <X className="size-4" />
            </button>

            <div className="text-center mb-8">
              <div className="mx-auto size-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                <Shield className="size-8" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">Xác thực Email</h3>
              <p className="text-sm text-gray-500">
                Nhập mã 6 số được gửi đến <br />
                <strong className="text-gray-900 block mt-1">{formData.email}</strong>
              </p>
              <p className="mt-3 text-xs font-semibold text-amber-600 leading-relaxed">
                Nếu chưa thấy email, hãy kiểm tra thêm mục Spam/Thư rác hoặc Quảng cáo trong Gmail nhé.
              </p>
            </div>

            {otpError && (
              <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl text-center">
                <p className="text-sm text-red-600 font-bold">{otpError}</p>
              </div>
            )}

            <input
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full text-center text-4xl tracking-[0.5em] font-black py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-primary focus:bg-white outline-none transition-colors mb-6 placeholder:text-gray-300 placeholder:font-medium"
              disabled={isVerifying}
            />

            <button
              onClick={handleVerifyOtp}
              disabled={isVerifying || otpCode.length < 6}
              className="w-full py-4 bg-primary text-white rounded-2xl font-black tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-primary-dark shadow-xl shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifying ? (
                <>
                  <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang xác thực...
                </>
              ) : (
                'Xác nhận'
              )}
            </button>

            <div className="mt-6 text-center">
              <button
                onClick={handleSendOtp}
                className="text-sm font-bold text-gray-500 hover:text-primary transition-colors underline underline-offset-4 disabled:opacity-50"
                disabled={isVerifying || isLoading}
              >
                Gửi lại mã OTP
              </button>
            </div>
          </div>
        </div>
      )}
      */}
    </div>
  );
};

export default ShipperRegister;
