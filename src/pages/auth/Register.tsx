import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppRole, KYCStatus } from '../../types/index';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';
import { authService } from '../../services';
// OTP tạm tắt
// import { otpService } from '../../services';
// import OTPVerification from '../../components/auth/OTPVerification';

interface RegisterProps {
  onGoToLogin: () => void;
  onGoToShipperRegister?: () => void;
}

// Reusable compact input component
const InputField = ({
  icon, type = 'text', placeholder, value, onChange, required = false, disabled = false,
}: {
  icon: string; type?: string; placeholder: string; value: string;
  onChange: (v: string) => void; required?: boolean; disabled?: boolean;
}) => (
  <div className="relative group">
    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-350 group-focus-within:text-primary transition-colors text-xl z-10 pointer-events-none select-none">
      {icon}
    </span>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      required={required}
      disabled={disabled}
      className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-cream bg-white focus:ring-0 focus:border-primary transition-all outline-none font-semibold text-slate-700 placeholder:text-slate-300 text-sm"
    />
  </div>
);

const Register: React.FC<RegisterProps> = ({ onGoToLogin, onGoToShipperRegister }) => {
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

  const [selectedRole, setSelectedRole] = useState<AppRole>(AppRole.FARMER);
  const [agreed, setAgreed] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // OTP tạm tắt
  // const [showOtpVerification, setShowOtpVerification] = useState(false);
  // const [pendingRegistration, setPendingRegistration] = useState<any>(null);
  const [farmerStep, setFarmerStep] = useState<1 | 2>(1);
  const BE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
  const handleGoogleLogin = () => {
    // Determine the role to send to the backend
    // Similar to Login.tsx logic
    let roleParam = selectedRole === AppRole.FARMER ? 'SHOP_OWNER' : selectedRole;
    
    // Construct the backend URL for OAuth2
    const backendOAuthUrl = `${BE_URL}/oauth2/authorization/google?role=${roleParam}&prompt=select_account`;
    window.location.href = backendOAuthUrl;
  };

  const handleFacebookLogin = () => {
    let roleParam = selectedRole === AppRole.FARMER ? 'SHOP_OWNER' : selectedRole;
    const backendOAuthUrl = `${BE_URL}/oauth2/authorization/facebook?role=${roleParam}`;
    window.location.href = backendOAuthUrl;
  };

  // Shop Owner specific fields
  const [shopName, setShopName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [achievementFile, setAchievementFile] = useState<File | null>(null);

  /* OTP tạm tắt — bỏ comment khối này (+ state showOtpVerification/pendingRegistration) để bật lại
  if (showOtpVerification) {
    return (
      <OTPVerification
        email={email}
        onVerified={async () => {
          if (pendingRegistration) {
            setIsLoading(true);
            try {
              const response = await authService.register(
                pendingRegistration.data,
                pendingRegistration.logoFile,
                pendingRegistration.achievementFile
              );
              if (response.result) {
                let loginResponse;
                try {
                  loginResponse = await authService.login({
                    email: email,
                    password: password
                  });
                } catch (loginErr) {
                  console.error("Auto-login failed:", loginErr);
                }

                if (loginResponse?.result?.token) {
                  setSuccess('Đăng ký thành công! Đang chuyển hướng...');
                  login(selectedRole);
                  setTimeout(() => {
                    if (selectedRole === AppRole.FARMER || selectedRole === AppRole.SHIPPER) navigate('/kyc');
                    else navigate('/');
                  }, 1500);
                } else {
                  if (selectedRole === AppRole.FARMER || selectedRole === AppRole.SHIPPER) {
                    setSuccess('Đăng ký thành công! Hồ sơ của bạn đang được chờ duyệt.');
                    setTimeout(() => {
                      navigate('/kyc', {
                        state: {
                          pendingUser: {
                            name: fullName,
                            email: email,
                            role: selectedRole,
                            phone: phone,
                            shopName: shopName,
                            address: address,
                            bankAccount: bankAccount,
                            description: description,
                            avatar: logoFile ? URL.createObjectURL(logoFile) : null,
                            achievement: achievementFile ? achievementFile.name : null
                          }
                        }
                      });
                    }, 1500);
                  } else {
                    setError('Đăng ký thành công nhưng không thể đăng nhập tự động. Vui lòng đăng nhập thủ công.');
                    setTimeout(() => onGoToLogin(), 2000);
                  }
                }
              }
            } catch (err: any) {
              setError(err?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
              setShowOtpVerification(false);
            } finally {
              setIsLoading(false);
            }
          }
        }}
        onBack={() => { setShowOtpVerification(false); setPendingRegistration(null); }}
      />
    );
  }
  */

  const completeRegistration = async (registrationData: any) => {
    setIsLoading(true);
    try {
      const response = await authService.register(
        registrationData,
        logoFile || undefined,
        achievementFile || undefined
      );
      if (response.result) {
        let loginResponse;
        try {
          loginResponse = await authService.login({
            email: email,
            password: password
          });
        } catch (loginErr) {
          console.error("Auto-login failed:", loginErr);
        }

        if (loginResponse?.result?.token) {
          setSuccess('Đăng ký thành công! Đang chuyển hướng...');
          login(selectedRole);
          setTimeout(() => {
            if (selectedRole === AppRole.FARMER || selectedRole === AppRole.SHIPPER) navigate('/kyc');
            else navigate('/');
          }, 1500);
        } else {
          if (selectedRole === AppRole.FARMER || selectedRole === AppRole.SHIPPER) {
            setSuccess('Đăng ký thành công! Hồ sơ của bạn đang được chờ duyệt.');
            setTimeout(() => {
              navigate('/kyc', {
                state: {
                  pendingUser: {
                    name: fullName,
                    email: email,
                    role: selectedRole,
                    phone: phone,
                    shopName: shopName,
                    address: address,
                    bankAccount: bankAccount,
                    description: description,
                    avatar: logoFile ? URL.createObjectURL(logoFile) : null,
                    achievement: achievementFile ? achievementFile.name : null
                  }
                }
              });
            }, 1500);
          } else {
            setError('Đăng ký thành công nhưng không thể đăng nhập tự động. Vui lòng đăng nhập thủ công.');
            setTimeout(() => onGoToLogin(), 2000);
          }
        }
      }
    } catch (err: any) {
      setError(err?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Common validations for Step 1
    if (!fullName || !email || !phone || !password || !confirmPassword) {
      setError('Vui lòng điền đầy đủ thông tin'); return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp'); return;
    }
    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự'); return;
    }

    if (selectedRole === AppRole.FARMER) {
      if (farmerStep === 1) {
        setFarmerStep(2);
        return; // Advance to step 2 instead of submitting
      } else {
        // Validation for step 2
        if (!shopName || !address || !bankName || !bankAccount || !bankAccountHolder) {
          setError('Vui lòng điền đầy đủ trường bắt buộc của cửa hàng'); return;
        }
        if (!agreed) {
          setError('Vui lòng đồng ý với điều khoản'); return;
        }
      }
    } else {
      // Buyer validation
      if (!agreed) {
        setError('Vui lòng đồng ý với điều khoản'); return;
      }
    }

    const roleMap: Record<AppRole, string> = {
      [AppRole.BUYER]: 'BUYER',
      [AppRole.FARMER]: 'SHOP_OWNER',
      [AppRole.SHIPPER]: 'SHIPPER',
      [AppRole.ADMIN]: 'ADMIN',
      [AppRole.STAFF]: 'STAFF',
    };

    const registrationData: any = {
      email, password, fullName, phoneNumber: phone, roleName: roleMap[selectedRole],
    };
    if (selectedRole === AppRole.FARMER) {
      registrationData.shopName = shopName;
      registrationData.address = address;
      registrationData.description = description;
      registrationData.bankName = bankName;
      registrationData.bankAccount = bankAccount;
      registrationData.bankAccountHolder = bankAccountHolder;
    }

    // OTP tạm tắt — để bật lại: comment completeRegistration bên dưới, bỏ comment 3 dòng này
    // setPendingRegistration({ data: registrationData, logoFile, achievementFile });
    // await otpService.sendOtp(email);
    // setShowOtpVerification(true);
    await completeRegistration(registrationData);
  };

  const isFarmer = selectedRole === AppRole.FARMER;

  return (
    <div 
      className="flex h-screen w-full bg-cover bg-center bg-no-repeat font-sans"
    >
      {/* ── LEFT ── Brand image panel */}
      <div className="hidden lg:flex lg:w-1/2 relative h-full shrink-0">
        <div className="absolute inset-0 bg-black/15 z-10" />
        <img
          alt="Nông sản tươi sạch"
          className="absolute inset-0 w-full h-full object-cover"
          src="/login.jpg"
        />
  <div className="absolute inset-0 z-20 p-10 flex flex-col justify-between">
          {/* Top bar */}
          <div className="flex items-center gap-3">
            <button
              onClick={onGoToLogin}
              className="group flex items-center justify-center w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl text-white hover:bg-white/30 transition-all shadow-lg"
              title="Quay lại"
            >
              <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-white text-xl">eco</span>
            </div>
            <span className="display-font text-xl font-bold text-white drop-shadow-md">Xấu Mã</span>
          </div>
          {/* Bottom tagline */}
          <div className="max-w-sm">
            <h2 className="display-font text-4xl font-extrabold text-white mb-4 leading-tight drop-shadow-lg">
              Ngon lành, <br />
              <span className="text-secondary italic">tử tế</span> & <br />
              tiết kiệm.
            </h2>
            <p className="text-white/85 text-base font-medium drop-shadow-sm leading-relaxed">
              Đồng hành cùng nông dân Việt Nam giải cứu nông sản &ldquo;kém sắc&rdquo; nhưng vẹn nguyên dinh dưỡng.
            </p>
          </div>
        </div>
      </div>

      {/* ── RIGHT ── Registration form */}
      <div className="w-full lg:w-1/2  overflow-y-auto custom-scrollbar bg-background-light flex flex-col">
<div className="w-full max-w-[460px] mx-auto mb-auto mt-4 px-8 pt-2 pb-10 flex-shrink-0">
          {/* Header */}
          <div className="mb-4">
            <h1 className="display-font text-4xl font-extrabold text-primary tracking-tight">Đăng ký</h1>
            <p className="text-slate-500 text-sm font-medium mt-0.5">Bắt đầu hành trình của bạn trên Xấu Mã.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">

            {/* ── Role selector ── */}
            <div className="grid grid-cols-2 gap-2.5 relative z-10 transition-transform duration-500" style={{ transform: isFarmer && farmerStep === 2 ? 'translateY(-15px) opacity(0)' : 'none', opacity: isFarmer && farmerStep === 2 ? 0 : 1, pointerEvents: isFarmer && farmerStep === 2 ? 'none' : 'auto', height: isFarmer && farmerStep === 2 ? 0 : 'auto', marginBottom: isFarmer && farmerStep === 2 ? 0 : '0.75rem' }}>
              {[
                { role: AppRole.BUYER, icon: 'person', label: 'Người mua' },
                { role: AppRole.FARMER, icon: 'storefront', label: 'Người bán' },
              ].map(item => (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => { setSelectedRole(item.role); setFarmerStep(1); }}
                  className={`h-11 py-2 rounded-xl border-2 flex items-center justify-center gap-2 transition-all font-bold text-sm ${selectedRole === item.role
                    ? 'border-primary bg-primary/10 text-primary shadow-sm'
                    : 'border-cream bg-white text-slate-400 hover:border-primary/30'
                    }`}
                >
                  <span className="material-symbols-outlined text-lg">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>

            {/* ── Error / Success ── */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl overflow-hidden">
                <p className="text-xs text-red-600 font-semibold break-words whitespace-pre-wrap">{error}</p>
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl overflow-hidden">
                <p className="text-xs text-green-600 font-semibold break-words whitespace-pre-wrap">{success}</p>
              </div>
            )}

            {/* MULTI-STEP SLIDER WRAPPER */}
            <div className="overflow-hidden relative w-full">
              <div
                className="flex transition-transform duration-500 ease-in-out items-start"
                style={{
                  width: isFarmer ? '200%' : '100%',
                  transform: isFarmer && farmerStep === 2 ? 'translateX(-50%)' : 'translateX(0%)'
                }}
              >

                {/* ── PART 1: Basic Info ── */}
                <div className="w-full shrink-0 px-1" style={{ width: isFarmer ? '50%' : '100%' }}>
                  <div className="space-y-2.5">
                    <InputField icon="badge" placeholder="Họ và tên" value={fullName} onChange={setFullName} required disabled={isLoading} />
                    <div className="grid grid-cols-2 gap-3">
                      <InputField icon="mail" type="email" placeholder="Email" value={email} onChange={setEmail} required disabled={isLoading} />
                      <InputField icon="call" placeholder="Số điện thoại" value={phone} onChange={setPhone} required disabled={isLoading} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <InputField icon="lock" type="password" placeholder="Mật khẩu" value={password} onChange={setPassword} required disabled={isLoading} />
                      <InputField icon="verified_user" type="password" placeholder="Xác nhận MK" value={confirmPassword} onChange={setConfirmPassword} required disabled={isLoading} />
                    </div>
                  </div>

                  {/* ── Social login (All roles) ── */}
                  {onGoToShipperRegister && (
                    <div className="space-y-2 mt-4">
                      <div className="relative flex items-center gap-3">
                        <div className="h-px bg-cream flex-1" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hoặc đăng ký với</span>
                        <div className="h-px bg-cream flex-1" />
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <button type="button" onClick={handleGoogleLogin} className="flex items-center justify-center gap-2 py-2.5 bg-white border-2 border-cream rounded-xl hover:bg-cream/30 transition-all font-bold text-slate-600 text-sm">
                          <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-4 h-4" /> Google
                        </button>
                        <button type="button" onClick={handleFacebookLogin} className="flex items-center justify-center gap-2 py-2.5 bg-white border-2 border-cream rounded-xl hover:bg-cream/30 transition-all font-bold text-slate-600 text-sm">
                          Facebook
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Buttons Step 1 ── */}
                  <div className="space-y-3 pt-4 w-full">
                    {!isFarmer && (
                      <label className="flex items-center gap-3 cursor-pointer mb-2.5">
                        <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="w-5 h-5 rounded border-cream text-primary focus:ring-primary/20 cursor-pointer" />
                        <span className="text-sm font-bold text-slate-500">Tôi đồng ý với <a href="#" className="text-primary hover:underline">Điều khoản</a> &amp; <a href="#" className="text-primary hover:underline">Bảo mật</a></span>
                      </label>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading || (!isFarmer && !agreed)}
                      className="w-full py-3.5 bg-primary text-white font-extrabold rounded-xl hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl shadow-primary/20 text-base tracking-wide flex items-center justify-center gap-2"
                    >
                      {isFarmer ? (
                        <>THÔNG TIN CỬA HÀNG <span className="material-symbols-outlined text-[20px]">arrow_forward</span></>
                      ) : isLoading ? 'ĐANG TẠO...' : 'TẠO TÀI KHOẢN'}
                    </button>

                    {/* ── Shipper CTA Banner ── */}
                    {onGoToShipperRegister && (
                      <button
                        type="button"
                        onClick={onGoToShipperRegister}
                        className="mt-1.5 w-full group flex items-center gap-3.5 rounded-xl border-2 border-cream bg-white px-3.5 py-2.5 hover:border-primary/30 hover:bg-primary/5 transition-all hover:scale-[1.005] active:scale-[0.99] shadow-sm text-left"
                      >
                        {/* Icon */}
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-primary/10 transition-colors">
                          <span className="material-symbols-outlined text-slate-500 group-hover:text-primary transition-colors text-lg">two_wheeler</span>
                        </div>
                        {/* Text */}
                        <div className="flex-1">
                          <p className="text-[13px] font-extrabold text-slate-700 leading-tight">Trở thành Shipper của Xấu Mã</p>
                          <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Thu nhập 8 – 15 triệu/tháng · Chủ động</p>
                        </div>
                        {/* Arrow */}
                        <span className="material-symbols-outlined text-slate-300 group-hover:text-primary text-lg group-hover:translate-x-1 transition-all shrink-0">arrow_forward</span>
                      </button>
                    )}

                    {/* Footer link in Step 1 */}
                    <p className="mt-3 text-center text-sm font-bold text-slate-500">
                      Đã có tài khoản?{' '}
                      <button type="button" onClick={onGoToLogin} className="text-primary font-black hover:underline">
                        Đăng nhập
                      </button>
                    </p>
                  </div>
                </div>

                {/* ── PART 2: Shop Info (FARMER only) ── */}
                {isFarmer && (
                  <div className="w-1/2 shrink-0 px-1 opacity-100 transition-opacity">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-xs">storefront</span>
                          Thông tin cửa hàng
                        </p>
                        <button type="button" onClick={() => setFarmerStep(1)} className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">edit</span> Sửa hồ sơ
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <InputField icon="storefront" placeholder="Tên shop *" value={shopName} onChange={setShopName} required={isFarmer && farmerStep === 2} disabled={isLoading} />
                        <select
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          required={isFarmer && farmerStep === 2}
                          disabled={isLoading}
                          className="w-full px-3 py-3 rounded-xl border-2 border-cream bg-white focus:ring-0 focus:border-primary outline-none font-semibold text-slate-700 text-sm cursor-pointer"
                        >
                          <option value="">Ngân hàng *</option>
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
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <InputField icon="account_balance_wallet" placeholder="Số TK NH *" value={bankAccount} onChange={setBankAccount} required={isFarmer && farmerStep === 2} disabled={isLoading} />
                        <InputField icon="badge" placeholder="Chủ tài khoản *" value={bankAccountHolder} onChange={setBankAccountHolder} required={isFarmer && farmerStep === 2} disabled={isLoading} />
                      </div>

                      <div className="relative group">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-350 group-focus-within:text-primary transition-colors text-lg z-10 pointer-events-none">location_on</span>
                        <input type="text" placeholder="Địa chỉ chi tiết (điểm lấy hàng) *" value={address} onChange={e => setAddress(e.target.value)} required={isFarmer && farmerStep === 2} disabled={isLoading} className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-cream bg-white focus:ring-0 focus:border-primary transition-all outline-none font-semibold text-slate-700 placeholder:text-slate-300 text-sm" />
                      </div>

                      <div className="relative group">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-350 group-focus-within:text-primary transition-colors text-lg z-10 pointer-events-none">description</span>
                        <input type="text" placeholder="Mô tả về nông trại (tùy chọn)" value={description} onChange={e => setDescription(e.target.value)} disabled={isLoading} className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-cream bg-white focus:ring-0 focus:border-primary transition-all outline-none font-semibold text-slate-700 placeholder:text-slate-300 text-sm" />
                      </div>

                      {/* File Uploads */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <input type="file" id="logoUpload" accept="image/*" onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 30 * 1024 * 1024) {
                                setError('Ảnh Logo không được vượt quá 30MB');
                                e.target.value = '';
                                setLogoFile(null);
                                return;
                              }
                              setError(null);
                              setLogoFile(file);
                            }
                          }} className="hidden" disabled={isLoading} />
                          <label htmlFor="logoUpload" className={`block p-2 rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-1 transition-all h-full min-h-[64px] ${logoFile ? 'border-primary bg-primary/5' : 'border-cream hover:border-primary/50 hover:bg-slate-50'} ${isLoading ? 'opacity-50' : ''}`}>
                            <span className={`material-symbols-outlined text-lg ${logoFile ? 'text-primary' : 'text-slate-400'}`}>{logoFile ? 'check_circle' : 'add_photo_alternate'}</span>
                            <span className="text-[9px] font-bold text-slate-500 text-center leading-tight">{logoFile ? 'Đã tải Logo' : 'Ảnh đại diện'}</span>
                          </label>
                        </div>
                        <div>
                          <input type="file" id="achievementUpload" accept="image/*, application/pdf" onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 30 * 1024 * 1024) {
                                setError('File chứng chỉ không được vượt quá 30MB');
                                e.target.value = '';
                                setAchievementFile(null);
                                return;
                              }
                              setError(null);
                              setAchievementFile(file);
                            }
                          }} className="hidden" disabled={isLoading} />
                          <label htmlFor="achievementUpload" className={`block p-2 rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-1 transition-all h-full min-h-[64px] ${achievementFile ? 'border-primary bg-primary/5' : 'border-cream hover:border-primary/50 hover:bg-slate-50'} ${isLoading ? 'opacity-50' : ''}`}>
                            <span className={`material-symbols-outlined text-lg ${achievementFile ? 'text-primary' : 'text-slate-400'}`}>{achievementFile ? 'check_circle' : 'workspace_premium'}</span>
                            <span className="text-[9px] font-bold text-slate-500 text-center leading-tight px-1">{achievementFile ? 'Đã tải chứng chỉ' : 'Chứng chỉ VietGAP'}</span>
                          </label>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-2.5 bg-orange-50 border-2 border-orange-100 rounded-xl">
                        <span className="material-symbols-outlined text-orange-500 text-lg shrink-0">info</span>
                        <p className="text-[11px] text-orange-800 font-bold">Duyệt nhanh hơn với chứng chỉ</p>
                      </div>

                      {/* ── Buttons Step 2 ── */}
                      <div className="space-y-2.5 pt-2.5 flex flex-col">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="w-5 h-5 rounded border-cream text-primary focus:ring-primary/20 cursor-pointer" />
                          <span className="text-sm font-bold text-slate-500">Tôi đồng ý với <a href="#" className="text-primary hover:underline">Điều khoản</a> &amp; <a href="#" className="text-primary hover:underline">Bảo mật</a></span>
                        </label>
                        <div className="flex gap-2.5 w-full">
                          <button type="button" onClick={() => setFarmerStep(1)} className="px-4 py-3.5 bg-white border-2 border-cream text-slate-500 font-extrabold rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center">
                            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                          </button>
                          <button type="submit" disabled={!agreed || isLoading} className="flex-1 py-3.5 bg-primary text-white font-extrabold rounded-xl hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl shadow-primary/20 text-base tracking-wide flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isLoading ? 'ĐANG TẠO...' : <>TẠO TÀI KHOẢN <span className="material-symbols-outlined text-[20px]">check_circle</span></>}
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;