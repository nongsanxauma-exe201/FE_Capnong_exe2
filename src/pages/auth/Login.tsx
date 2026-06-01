import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppRole, KYCStatus } from '../../types';
import { authService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
const BE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
interface LoginProps {
  onGoToRegister: () => void;
  onForgotPassword?: () => void;
}

const Login: React.FC<LoginProps> = ({ onGoToRegister, onForgotPassword }) => {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setIsAuthenticated } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.login({ email, password });
      if (response.result?.token) {
        setIsAuthenticated(true);
        // useEffect will handle redirection based on roles
      } else {
        setError('Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.status === 401) {
        setError('Email hoặc mật khẩu không chính xác');
      } else {
        setError(err.data?.message || 'Có lỗi xảy ra khi đăng nhập. Vui lòng thử lại sau.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
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
      else if (user.role === AppRole.STAFF) navigate('/staff');
      else navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  const handleGoogleLogin = () => {
    const backendOAuthUrl = `${BE_URL}/oauth2/authorization/google?role=BUYER`;
    window.location.href = backendOAuthUrl;
  };

  return (
    <div 
      // Ép chiều cao cố định để không bị scroll tràn màn hình (trừ đi header/footer khoảng 140px)
      className="flex h-[calc(100vh-140px)] w-full bg-cover bg-center bg-no-repeat overflow-hidden"
      style={{ backgroundImage: `url('https://i.pinimg.com/1200x/c3/da/77/c3da772a3c4f7442e2d54509e97131ee.jpg')` }}
    >
      {/* Overlay làm mờ nhẹ nền */}
      <div className="flex w-full bg-black/20 backdrop-blur-[2px]">
        
        {/* Left Side: Brand Panel - Thu nhỏ padding p-10 */}
        <div className="hidden lg:flex flex-1 p-10 flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-2xl">
              <span className="material-symbols-outlined text-white text-xl font-bold">eco</span>
            </div>
            <span className="text-2xl font-black text-white tracking-tighter drop-shadow-md">Xấu Mã</span>
          </div>

          <div className="max-w-md mb-10">
            {/* Thu nhỏ size chữ text-4xl thay vì 6xl */}
            <h2 className="text-4xl font-black text-white mb-4 leading-[1.1] drop-shadow-xl">
              Ngon lành, <br />
              <span className="text-secondary italic">tử tế</span> & <br />
              tiết kiệm.
            </h2>
            <p className="text-white/90 text-lg font-medium leading-relaxed max-w-sm">
              Giải cứu nông sản "kém sắc" nhưng vẹn nguyên dinh dưỡng cùng nông dân Việt.
            </p>
          </div>
        </div>

        {/* Right Side: Login Form Box */}
        <div className="flex-1 flex items-center justify-center p-4">
          {/* Thu nhỏ Form max-w-400px và padding p-8 */}
          <div className="w-full max-w-[400px] bg-white/95 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl transition-all">
            
            {/* Header Form - Giảm margin mb-6 */}
            <div className="mb-6 text-center">
              <h1 className="text-3xl font-black text-slate-800 mb-1 tracking-tight">Chào mừng!</h1>
              <p className="text-slate-500 text-sm font-medium">Đăng nhập để tiếp tục cùng Xấu Mã</p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded-r-xl">
                  <p className="text-xs text-red-700 font-bold">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg group-focus-within:text-primary transition-colors">mail</span>
                  <input
                    className="w-full pl-11 pr-5 py-3 rounded-xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-bold text-slate-700 placeholder:text-slate-400 text-sm"
                    placeholder="Email của bạn"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg group-focus-within:text-primary transition-colors">lock</span>
                  <input
                    className="w-full pl-11 pr-11 py-3 rounded-xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-bold text-slate-700 placeholder:text-slate-400 text-sm"
                    placeholder="Mật khẩu"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">{showPassword ? "visibility_off" : "visibility"}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-bold">
                <label className="flex items-center gap-2 cursor-pointer text-slate-500 hover:text-slate-700 transition-colors">
                  <input className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" type="checkbox" />
                  Ghi nhớ tôi
                </label>
                <button type="button" onClick={onForgotPassword} className="text-primary hover:text-primary-dark underline-offset-4 hover:underline">
                  Quên mật khẩu?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-primary text-white font-black rounded-xl hover:bg-primary-dark hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg shadow-primary/25 disabled:opacity-50 uppercase text-sm tracking-wider"
              >
                {isLoading ? 'Đang xử lý...' : 'Đăng nhập ngay'}
              </button>
            </form>

            {/* Divider - Thu nhỏ margin my-5 */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <span className="relative px-3 bg-white mx-auto block w-fit text-[10px] font-black text-slate-400 uppercase tracking-widest">Hoặc</span>
            </div>

            {/* Social Login - Nút Google nhỏ gọn ở giữa */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="flex items-center justify-center gap-2 px-6 py-2 bg-white border-2 border-slate-100 rounded-xl hover:border-primary/30 hover:bg-slate-50 transition-all font-bold text-slate-600 shadow-sm text-xs"
              >
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-4 h-4" alt="Google" />
                <span>Google</span>
              </button>
            </div>

            {/* Footer - Thu nhỏ margin mt-6 */}
            <p className="mt-6 text-center font-bold text-slate-500 text-sm">
              Mới biết đến Xấu Mã?{' '}
              <button onClick={onGoToRegister} className="text-primary hover:text-primary-dark underline-offset-4 hover:underline">
                Đăng ký ngay
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;