import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronRight } from 'lucide-react';
import { bffClient } from '../services/bffClient';
import { Course } from '../types/course';
import { AppHeader } from './shared';
import { useAuth } from '../contexts/AuthContext';

function CoursesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const coursesData = await bffClient.getCourses();
      if (Array.isArray(coursesData)) {
        setCourses(coursesData);
      } else {
        setCourses([]);
        setError('データ形式が不正です');
      }
    } catch (err: any) {
      console.error('Error fetching courses:', err);
      if (err.response?.status === 401) {
        setError('認証に失敗しました。再ログインしてください。');
      } else if (err.response?.status === 403) {
        setError('コースへのアクセス権がありません。');
      } else {
        setError(err.message || 'コースの取得に失敗しました');
      }
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const formatLastAccess = (timestamp?: number) => {
    if (!timestamp) return '';
    const d = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);

    if (hours < 1) return '最終: たった今';
    if (hours < 24) return `最終: ${hours}時間前`;
    if (days < 7) return `最終: ${days}日前`;
    return `最終: ${weeks}週間前`;
  };

  // Loading state
  if (loading) {
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
  if (error) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#7E6E68] mb-4">{error}</p>
          <button
            onClick={fetchCourses}
            className="bg-[#E86D78] hover:bg-[#d45c6a] text-white font-bold px-6 py-2 rounded-xl transition-colors"
            style={{ fontFamily: 'Noto Sans JP, sans-serif' }}
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F4] flex flex-col">
      <AppHeader userName={user?.username || 'User'} />

      {/* Background with gradient circles */}
      <div className="relative flex-1">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute w-[1152px] h-[1152px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, rgba(232,109,120,0.3) 0%, transparent 70%)', top: '-200px', left: '-300px' }}
          />
          <div
            className="absolute w-[1152px] h-[1152px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, rgba(250,145,97,0.3) 0%, transparent 70%)', top: '-100px', right: '-400px' }}
          />
          <div
            className="absolute w-[1152px] h-[1152px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, rgba(255,234,225,0.5) 0%, transparent 70%)', bottom: '-300px', left: '50%' }}
          />
        </div>

        {/* Decorative blurred circles */}
        <div className="absolute right-[5%] top-[30%] w-48 h-48 rounded-full bg-[#E8F5E9] blur-[60px] opacity-40 pointer-events-none" />
        <div className="absolute left-[3%] bottom-[10%] w-64 h-64 rounded-full bg-[#E86D78] blur-[80px] opacity-10 pointer-events-none" />

        {/* Main Content */}
        <main className="relative max-w-[850px] mx-auto px-4 sm:px-6 py-8">
          {/* Back Button */}
          <button
            onClick={() => navigate('/mypage')}
            className="w-10 h-10 rounded-full bg-[#FAF8F4] hover:bg-[#F0EAE6] border border-[#FAF8F4] flex items-center justify-center transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5 text-[#5D5555]" />
          </button>

          {/* Section Title */}
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-6 h-6 text-[#7E6E68]">
              <BookOpen className="w-6 h-6" />
            </div>
            <h2
              className="text-2xl font-bold text-[#7E6E68]"
              style={{ fontFamily: 'Noto Sans JP, sans-serif' }}
            >
              学習中のコース
            </h2>
          </div>

          {/* Course List */}
          {courses.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[#7E6E68]" style={{ fontFamily: 'Noto Sans JP, sans-serif' }}>
                コースが見つかりませんでした。
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="bg-white rounded-3xl shadow-sm p-5 sm:p-6 flex items-start gap-3 sm:gap-4 hover:shadow-md transition-shadow"
                  style={{ borderRadius: '24px' }}
                >
                  {/* Course Icon */}
                  <div className="w-[52px] h-[52px] rounded-xl bg-[#FFF5D6] flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-7 h-7 text-[#FA9161]" />
                  </div>

                  {/* Course Info */}
                  <div className="flex-1 min-w-0">
                    {/* Title + Last Access */}
                    <div className="flex items-start gap-3 mb-1">
                      <h3
                        className="text-xl font-bold text-[#4B3A33] truncate"
                        style={{ fontFamily: 'Noto Sans JP, sans-serif' }}
                      >
                        {course.displayname || course.fullname}
                      </h3>
                      {course.lastaccess > 0 && (
                        <span className="text-[10px] text-[#7E6E68] bg-[#FAFAFA] border border-[#F0EAE6] rounded-full px-2.5 py-1 flex-shrink-0 whitespace-nowrap">
                          {formatLastAccess(course.lastaccess)}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {course.summary && (
                      <p
                        className="text-[10px] font-bold text-[#7E6E68] mb-2 line-clamp-1"
                        style={{ fontFamily: 'Noto Sans JP, sans-serif' }}
                        dangerouslySetInnerHTML={{ __html: course.summary.replace(/<[^>]*>/g, '').slice(0, 80) }}
                      />
                    )}

                    {/* Progress + Button Row */}
                    <div className="flex items-center gap-3">
                      {/* Progress Bar */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="h-2.5 flex-1 bg-[#EFEFEF] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#FA9161] rounded-full transition-all"
                            style={{ width: `${course.progress ?? 0}%` }}
                          />
                        </div>
                        <span
                          className="text-sm font-bold text-[#FA9161] min-w-[36px] text-right"
                          style={{ fontFamily: 'Noto Sans JP, sans-serif' }}
                        >
                          {Math.round(course.progress ?? 0)}%
                        </span>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => navigate(`/course/${course.id}/start`)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#FFF8F5] border border-[#FA9161] rounded-3xl text-sm text-[#FA9161] hover:bg-[#FFF0EA] transition-colors flex-shrink-0"
                        style={{ fontFamily: 'Noto Sans JP, sans-serif' }}
                      >
                        <span className="text-xs font-medium">学習ページへ</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-[#7E6E68] h-10 flex items-center justify-center">
        <span className="text-[11.4px] font-bold text-white" style={{ fontFamily: 'Noto Sans JP, sans-serif', letterSpacing: '0.6px' }}>
          2024 &copy; WEBCOACH
        </span>
      </footer>
    </div>
  );
}

export default CoursesPage;
