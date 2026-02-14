import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

function PasswordResetPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
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
          className="w-full max-w-[448px] bg-white border border-[#F0EAE6] pt-5 pb-10 px-10"
          style={{ borderRadius: '24px' }}
        >
          {!submitted ? (
            <>
              {/* Back button + Title */}
              <div className="flex items-center gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="p-1 hover:opacity-70 transition-opacity"
                >
                  <ArrowLeft className="w-6 h-6 text-[#9CA3AF]" />
                </button>
                <h1
                  className="text-xl font-light text-[#5D5555]"
                  style={{ fontFamily: 'Hiragino Kaku Gothic ProN, sans-serif' }}
                >
                  パスワードの再設定
                </h1>
              </div>

              {/* Description */}
              <div className="mb-6">
                <p
                  className="text-sm font-light text-[#9CA3AF]"
                  style={{ fontFamily: 'Hiragino Kaku Gothic ProN, sans-serif' }}
                >
                  登録メールアドレスを入力してください。
                </p>
                <p
                  className="text-sm font-light text-[#9CA3AF]"
                  style={{ fontFamily: 'Hiragino Kaku Gothic ProN, sans-serif' }}
                >
                  再設定用URLを送信します。
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Input */}
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  required
                  placeholder="user@example.com"
                  className="w-full h-[46px] px-4 bg-[#FAFAFA] border border-[#F0EAE6] text-sm text-[#7E6E68] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#E8AEB7] focus:border-transparent transition-colors"
                  style={{ borderRadius: '12px', fontFamily: 'Helvetica Neue, sans-serif' }}
                />

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full h-[52px] bg-[#E8AEB7] hover:bg-[#dfa0aa] text-white font-light text-base transition-colors"
                  style={{
                    borderRadius: '12px',
                    fontFamily: 'Hiragino Kaku Gothic ProN, sans-serif',
                  }}
                >
                  送信する
                </button>
              </form>
            </>
          ) : (
            <>
              {/* Back button + Title */}
              <div className="flex items-center gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="p-1 hover:opacity-70 transition-opacity"
                >
                  <ArrowLeft className="w-6 h-6 text-[#9CA3AF]" />
                </button>
                <h1
                  className="text-xl font-light text-[#5D5555]"
                  style={{ fontFamily: 'Hiragino Kaku Gothic ProN, sans-serif' }}
                >
                  パスワードの再設定
                </h1>
              </div>

              <div className="text-center space-y-6">
                <div className="w-16 h-16 mx-auto rounded-full bg-[#FFEAE1] flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#E8AEB7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p
                    className="text-base font-light text-[#5D5555] mb-2"
                    style={{ fontFamily: 'Hiragino Kaku Gothic ProN, sans-serif' }}
                  >
                    メールを送信しました
                  </p>
                  <p
                    className="text-sm font-light text-[#9CA3AF]"
                    style={{ fontFamily: 'Hiragino Kaku Gothic ProN, sans-serif' }}
                  >
                    {email} 宛に再設定用URLを<br />
                    送信しました。
                  </p>
                </div>
              </div>
            </>
          )}
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

export default PasswordResetPage;
