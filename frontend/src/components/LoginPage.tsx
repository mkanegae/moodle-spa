import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginCredentials } from '../types/auth';
import { useAuth } from '../contexts/AuthContext';
import { useAuthStore } from '../store/authStore';

interface LoginPageProps {
  onLoginSuccess?: (token: string) => void;
}

function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: '',
    service: 'moodle_mobile_app'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const zustandLogin = useAuthStore((state) => state.login);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await authLogin(credentials.username, credentials.password);
      zustandLogin('bff-authenticated');

      if (onLoginSuccess) {
        onLoginSuccess('bff-authenticated');
      }

      navigate('/mypage');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F4] flex flex-col">
      {/* Background with gradient circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div
          className="absolute w-[1152px] h-[1152px] rounded-full blur-[400px]"
          style={{ background: '#E17079', top: '-288px', left: '-288px' }}
        />
        <div
          className="absolute w-[1152px] h-[1152px] rounded-full blur-[400px]"
          style={{ background: '#FDEAE2', top: '-288px', right: '-288px' }}
        />
        <div
          className="absolute w-[1152px] h-[1152px] rounded-full blur-[400px]"
          style={{ background: '#F29367', top: '160px', left: '144px' }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 relative">
        <div
          className="w-full max-w-[448px] bg-white/95 backdrop-blur-[10px] rounded-3xl shadow-sm px-10 py-[60px]"
          style={{ borderRadius: '24px' }}
        >
          {/* Logo & Title */}
          <div className="flex flex-col items-center mb-10">
            <div className="mb-4">
              <img
                src="/logo_WEBCOACH.png"
                alt="WEBCOACH"
                className="h-16 w-auto object-contain"
              />
            </div>
            <div className="text-center">
              <p
                className="text-[28px] font-bold text-[#7E6E68] mb-3.5"
                style={{ fontFamily: 'Noto Sans JP, sans-serif' }}
              >
                学習システム
              </p>
              <p
                className="text-sm font-medium text-[#7E6E68]"
                style={{ fontFamily: 'Noto Sans JP, sans-serif' }}
              >
                未来の自分を、いま作る。
              </p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label
                className="block text-[13px] font-bold text-[#5D5555] mb-1.5"
                style={{ fontFamily: 'Noto Sans JP, sans-serif' }}
              >
                メールアドレス
              </label>
              <input
                type="text"
                name="username"
                value={credentials.username}
                onChange={handleInputChange}
                autoComplete="username"
                autoFocus
                required
                placeholder="user@example.com"
                className="w-full h-12 px-4 bg-[#FAF8F4] border border-[#CEC3BB] rounded-xl text-sm text-[#7E6E68] placeholder:text-[#7E6E68]/40 focus:outline-none focus:ring-2 focus:ring-[#E86D78] focus:border-transparent transition-colors"
                style={{ fontFamily: 'Noto Sans JP, sans-serif' }}
              />
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  className="text-[13px] font-bold text-[#5D5555]"
                  style={{ fontFamily: 'Noto Sans JP, sans-serif' }}
                >
                  パスワード
                </label>
                <button
                  type="button"
                  onClick={() => navigate('/password-reset')}
                  className="text-[10px] text-[#E86D78]/50 hover:text-[#E86D78]/80 transition-colors"
                >
                  パスワードお忘れですか？
                </button>
              </div>
              <input
                type="password"
                name="password"
                value={credentials.password}
                onChange={handleInputChange}
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="w-full h-12 px-4 bg-[#FAF8F4] border border-[#CEC3BB] rounded-xl text-sm text-[#7E6E68] placeholder:text-[#7E6E68]/40 focus:outline-none focus:ring-2 focus:ring-[#E86D78] focus:border-transparent transition-colors"
                style={{ fontFamily: 'Noto Sans JP, sans-serif' }}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[52px] bg-[#E86D78] hover:bg-[#d45c6a] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-base rounded-xl transition-colors"
              style={{
                fontFamily: 'Noto Sans JP, sans-serif',
                boxShadow: '0 4px 6px -4px rgba(232,109,120,0.3), 0 10px 15px -3px rgba(232,109,120,0.3)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ログイン中...
                </span>
              ) : (
                'ログイン'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative bg-[#7E6E68] h-10 flex items-center justify-center">
        <span
          className="text-[11.4px] font-bold text-white"
          style={{ fontFamily: 'Noto Sans JP, sans-serif', letterSpacing: '0.6px' }}
        >
          2024 &copy; WEBCOACH
        </span>
      </footer>
    </div>
  );
}

export default LoginPage;
