import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2 } from 'lucide-react';
import { ProfileFormData } from '../types/profile';
import bffClient from '../services/bffClient';
import { useAuth } from '../contexts/AuthContext';
import { AppHeader } from './shared';

function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<ProfileFormData>({
    nickName: '',
    goal: '',
    careerGoal: '',
    workStyleGoal: '',
    avatar_url: ''
  });

  useEffect(() => {
    if (user?.userid) {
      loadProfileData(user.userid);
    } else {
      navigate('/login');
    }
  }, [user, navigate]);

  // Toast auto-dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const loadProfileData = async (currentUserId: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const profileData = await bffClient.getUserProfile(currentUserId);

      setFormData({
        nickName: profileData.nick_name || '',
        goal: profileData.goal || '',
        careerGoal: profileData.target_job || '',
        workStyleGoal: profileData.ideal_work_style || '',
        avatar_url: '',
      });
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      setError(err.message || 'プロフィールの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.userid) {
      setError('ユーザーIDが取得できていません');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setToastMessage(null);

      const profileData = {
        nick_name: formData.nickName || null,
        goal: formData.goal || null,
      };

      await bffClient.updateUserProfile(user.userid, profileData);
      setToastMessage('プロフィールを保存しました！');
      await loadProfileData(user.userid);
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      setError(err.message || 'プロフィールの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const avatarSrc = formData.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.nickName || 'User')}&background=F0EAE6&color=CDC6C6&size=90`;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E86D78] mx-auto mb-4"></div>
          <p className="text-[#7E6E68]">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F4] flex flex-col">
      {/* Toast Message */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg z-50 transition-all">
          {toastMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg z-50">
          {error}
        </div>
      )}

      {/* Header */}
      <AppHeader
        userName={formData.nickName}
        avatarUrl={formData.avatar_url}
      />

      {/* Background with gradient circles */}
      <div className="relative flex-1">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute w-[1152px] h-[1152px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, rgba(225,112,121,0.3) 0%, transparent 70%)', top: '-200px', left: '-300px' }}
          />
          <div
            className="absolute w-[1152px] h-[1152px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, rgba(253,234,226,0.5) 0%, transparent 70%)', top: '-100px', right: '-400px' }}
          />
          <div
            className="absolute w-[1152px] h-[1152px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, rgba(242,147,103,0.3) 0%, transparent 70%)', bottom: '-300px', left: '50%' }}
          />
        </div>

        {/* Main Content - Centered Card */}
        <main className="relative flex items-start justify-center py-12 px-4">
          <div className="w-full max-w-[450px] bg-white rounded-3xl shadow-sm p-10" style={{ borderRadius: '24px' }}>
            {/* Back Button + Title */}
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={() => navigate('/mypage')}
                className="w-10 h-10 rounded-full bg-[#FAF8F4] hover:bg-[#F0EAE6] flex items-center justify-center transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5 text-[#7E6E68]" />
              </button>
              <h2
                className="text-2xl font-bold text-[#7E6E68]"
                style={{ fontFamily: 'Noto Sans JP, sans-serif' }}
              >
                プロフィール編集
              </h2>
            </div>

            {/* Avatar Section */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-[90px] h-[90px] rounded-full overflow-hidden bg-[#F0EAE6] p-[2px] flex-shrink-0">
                <img
                  src={avatarSrc}
                  alt={formData.nickName || 'Profile'}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#9CA3AF] bg-white border border-[#F0EAE6] rounded-full hover:bg-gray-50 transition-colors">
                <Edit2 className="w-3 h-3" />
                <span style={{ fontFamily: 'Hiragino Kaku Gothic ProN, sans-serif' }}>編集</span>
              </button>
            </div>

            {/* Name Field */}
            <div className="mb-5">
              <label
                className="block text-[13px] font-bold text-[#7E6E68] mb-2"
                style={{ fontFamily: 'Noto Sans JP, sans-serif' }}
              >
                名前
              </label>
              <input
                type="text"
                value={formData.nickName}
                onChange={(e) => setFormData(prev => ({ ...prev, nickName: e.target.value }))}
                className="w-full px-4 py-3 bg-[#FAF8F4] border border-[#CEC3BB] rounded-xl text-sm text-[#7E6E68] focus:outline-none focus:ring-2 focus:ring-[#E86D78] focus:border-transparent"
                style={{ fontFamily: 'Noto Sans CJK JP, Noto Sans JP, sans-serif' }}
                placeholder="名前を入力"
              />
            </div>

            {/* My Goal Field */}
            <div className="mb-8">
              <label
                className="block text-[13px] font-medium text-[#7E6E68] mb-2"
                style={{ fontFamily: 'Noto Sans JP, sans-serif' }}
              >
                My Goal
              </label>
              <textarea
                value={formData.goal}
                onChange={(e) => setFormData(prev => ({ ...prev, goal: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 bg-[#FAF8F4] border border-[#CEC3BB] rounded-xl text-sm text-[#7E6E68] resize-none focus:outline-none focus:ring-2 focus:ring-[#E86D78] focus:border-transparent"
                style={{ fontFamily: 'Noto Sans CJK JP, Noto Sans JP, sans-serif' }}
                placeholder="目標を入力"
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3.5 bg-[#E86D78] hover:bg-[#d45c6a] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-base rounded-xl transition-colors"
              style={{ fontFamily: 'Noto Sans JP, sans-serif' }}
            >
              {saving ? '保存中...' : '変更する'}
            </button>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-[#7E6E68] h-10 flex items-center justify-center">
        <span className="text-[11.4px] font-bold text-white" style={{ fontFamily: 'Noto Sans JP, sans-serif' }}>
          2024 &copy; WEBCOACH
        </span>
      </footer>
    </div>
  );
}

export default ProfilePage;
