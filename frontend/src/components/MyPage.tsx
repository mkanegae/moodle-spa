import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, PlayCircle, FileText, HelpCircle, Mail, ChevronRight, BookOpen, Heart, Flag } from 'lucide-react';
import { Profile } from '../types/api';
import {
  Course,
  BadgeProgress,
  MonthlyGoal,
  CareerGoal,
} from '../types/mypage';
import {
  fetchUserProfile,
  fetchResumeCourse,
  fetchUserCourses,
  fetchBadgeProgress,
  fetchMonthlyGoal,
  fetchCareerGoal,
} from '../services/mypageApi';
import { useAuth } from '../contexts/AuthContext';
import { AppHeader } from './shared';

function MyPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // State management
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [badgeProgress, setBadgeProgress] = useState<BadgeProgress | null>(null);
  const [monthlyGoal, setMonthlyGoal] = useState<MonthlyGoal | null>(null);
  const [careerGoal, setCareerGoal] = useState<CareerGoal | null>(null);
  const [resumableCourse, setResumableCourse] = useState<Course | null>(null);
  const [activeCourses, setActiveCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初期表示時のデータ取得
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        console.log('No user found, redirecting to login');
        navigate('/login');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        console.log('Loading MyPage data for user:', user.userid);

        const [profile, badge, goal, career, resumeCourse, userCourses] = await Promise.all([
          fetchUserProfile(user.userid),
          fetchBadgeProgress(user.userid),
          fetchMonthlyGoal(user.userid),
          fetchCareerGoal(user.userid),
          fetchResumeCourse(user.userid),
          fetchUserCourses(user.userid)
        ]);

        setUserProfile(profile);
        setBadgeProgress(badge);
        setMonthlyGoal(goal);
        setCareerGoal(career);
        setResumableCourse(resumeCourse);
        setActiveCourses(userCourses);
      } catch (err) {
        console.error('Failed to load MyPage data:', err);
        setError('データの読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, navigate]);

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E86D78] mx-auto mb-4"></div>
          <p className="text-[#7E6E68]">読み込み中...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !userProfile || !careerGoal) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#7E6E68]">{error || 'データの読み込みに失敗しました'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-[#E86D78] hover:bg-[#d45c6a] text-white px-6 py-2 rounded-xl font-bold"
            style={{ fontFamily: 'Noto Sans JP, sans-serif' }}
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  // 最終アクセス時間をフォーマット（分・時間・日のいずれか1つで表示）
  const formatLastAccess = (date?: Date | string) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (minutes < 1) return '1分前';
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    return `${days}日前`;
  };

  return (
    <div className="min-h-screen bg-[#FAF8F4] flex flex-col">
      <AppHeader
        userName={userProfile.nick_name || '未設定'}
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

        {/* Main Content */}
        <main className="relative max-w-[1100px] mx-auto px-4 sm:px-6 py-8">
          {/* Profile Card - Full Width */}
          <div
            className="bg-white rounded-[32px] shadow-sm p-6 sm:p-8 mb-6 relative overflow-hidden"
          >
            {/* Decorative circles */}
            <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-[#FFF5F0] opacity-60" />
            <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-[#E8F5E9] opacity-60" />

            <div className="relative flex items-start gap-5 sm:gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-[90px] h-[90px] rounded-full overflow-hidden bg-[#F0EAE6] p-[2px]">
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.nick_name || '未設定')}&background=F0EAE6&color=CDC6C6&size=90`}
                    alt={userProfile.nick_name || '未設定'}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-[#4B3A33]" style={{ fontFamily: 'Noto Sans JP, sans-serif' }}>
                    {userProfile.nick_name || '未設定'}
                  </h2>
                  <button
                    onClick={() => navigate('/profile')}
                    className="px-3 py-1 text-xs text-[#7E6E68] bg-[#FAF8F4] rounded-full hover:bg-[#F0EAE6] flex items-center gap-1.5 transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                    編集
                  </button>
                </div>

                {/* My Goal */}
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#FA9161] mb-1.5">
                  <span className="w-[18px] h-[18px] rounded-full bg-[#FA9161] flex items-center justify-center">
                    <Flag className="w-2.5 h-2.5 text-white" />
                  </span>
                  <Flag className="w-3.5 h-3.5 text-[#FA9161]" />
                  <span>My Goal</span>
                </div>
                <p className="text-lg text-[#4B3A33]" style={{ fontFamily: 'Noto Sans JP, sans-serif' }}>
                  {careerGoal.goal}
                </p>
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Resume Course Card */}
              {resumableCourse && (
                <div className="bg-white rounded-[32px] shadow-sm overflow-hidden">
                  <div className="flex flex-col sm:flex-row">
                    {/* Left Content */}
                    <div className="flex-1 p-6 sm:p-8">
                      <div className="inline-block px-4 py-1.5 bg-[#FFEAE1] text-[#E86D78] text-sm font-semibold rounded-full mb-4" style={{ fontFamily: 'Hiragino Kaku Gothic ProN, sans-serif' }}>
                        前回のつづき
                      </div>

                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-[3px] h-7 bg-[#4B3A33] rounded-full mt-0.5 flex-shrink-0"></div>
                        <h3 className="text-2xl font-semibold text-[#4B3A33]" style={{ fontFamily: 'Hiragino Kaku Gothic ProN, sans-serif' }}>
                          {resumableCourse.title}
                        </h3>
                      </div>

                      {resumableCourse.currentLesson && (
                        <div className="inline-block px-3 py-1.5 bg-[#FFF5D6] rounded-lg mb-5">
                          <span className="text-sm font-medium text-[#7E6E68]" style={{ fontFamily: 'Noto Sans JP, sans-serif' }}>
                            {resumableCourse.currentLesson}
                          </span>
                        </div>
                      )}

                      <div className="mb-5">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-xs text-[#7E6E68]" style={{ fontFamily: 'Noto Sans JP, sans-serif' }}>進捗率</span>
                          <span className="text-base font-semibold text-[#E86D78]">{resumableCourse.progress || 0}%</span>
                        </div>
                        <div className="h-2 bg-[#EFEFEF] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${resumableCourse.progress || 0}%`,
                              background: 'linear-gradient(90deg, #FA9161, #E86D78)',
                            }}
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => navigate(`/courses/${resumableCourse.id}`)}
                        className="w-full bg-[#E86D78] hover:bg-[#d45c6a] text-white font-bold rounded-xl px-6 py-3 flex items-center justify-center gap-2 transition-colors"
                        style={{ fontFamily: 'Noto Sans JP, sans-serif' }}
                      >
                        学習を再開する
                        <PlayCircle className="w-[18px] h-[18px]" />
                      </button>
                    </div>

                    {/* Right: Course Icon/Image */}
                    <div className="hidden sm:flex items-center justify-center w-[240px] bg-[#FAF8F4] rounded-[28px] m-4">
                      <div className="w-28 h-28 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <span className="text-5xl">🎨</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Active Courses Section */}
              {activeCourses.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-[#7E6E68]" style={{ fontFamily: 'Noto Sans JP, sans-serif' }}>
                      学習中のコース
                    </h3>
                    <button
                      onClick={() => navigate('/courses')}
                      className="text-xs font-medium text-[#7E6E68] bg-white hover:bg-gray-50 flex items-center gap-1 border border-gray-200 rounded-full px-4 py-1.5 shadow-sm transition-colors"
                      style={{ fontFamily: 'Noto Sans JP, sans-serif' }}
                    >
                      すべて見る
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeCourses.slice(0, 4).map((course) => (
                      <div
                        key={course.id}
                        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => navigate(`/courses/${course.id}`)}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-[#FFF5D6] flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-5 h-5 text-[#FA9161]" />
                          </div>
                          <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                            <div />
                            <span className="text-[10px] text-[#7E6E68] bg-[#FAFAFA] rounded-full px-2.5 py-1 flex-shrink-0 border border-gray-100">
                              {formatLastAccess(course.lastAccessDate)}
                            </span>
                          </div>
                        </div>

                        <h4 className="text-sm font-bold text-[#4B3A33] mb-3 line-clamp-2" style={{ fontFamily: 'Noto Sans JP, sans-serif' }}>
                          {course.title}
                        </h4>

                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 bg-[#EFEFEF] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#FA9161] rounded-full transition-all"
                              style={{ width: `${course.progress || 0}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-[#FA9161] min-w-[28px] text-right">{course.progress || 0}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Right Sidebar */}
            <aside>
              {/* Support Menu */}
              <div className="bg-white rounded-3xl shadow-sm p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Heart className="w-5 h-5 text-[#E86D78]" />
                  <h3 className="text-base font-bold text-[#7E6E68]" style={{ fontFamily: 'Noto Sans JP, sans-serif' }}>
                    サポートメニュー
                  </h3>
                </div>

                <div className="space-y-1">
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-base text-[#7E6E68] hover:bg-[#FAF8F4] rounded-xl transition-colors" style={{ fontFamily: 'Noto Sans JP, sans-serif' }}>
                    <FileText className="w-[18px] h-[18px] text-[#7E6E68]" />
                    <span>利用マニュアル</span>
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-base text-[#7E6E68] hover:bg-[#FAF8F4] rounded-xl transition-colors" style={{ fontFamily: 'Noto Sans JP, sans-serif' }}>
                    <HelpCircle className="w-[18px] h-[18px] text-[#7E6E68]" />
                    <span>よくある質問</span>
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-base text-[#7E6E68] hover:bg-[#FAF8F4] rounded-xl transition-colors" style={{ fontFamily: 'Noto Sans JP, sans-serif' }}>
                    <Mail className="w-[18px] h-[18px] text-[#7E6E68]" />
                    <span>運営へのお問い合わせ</span>
                  </button>
                </div>
              </div>
            </aside>
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

export default MyPage;
