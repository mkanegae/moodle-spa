import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Play } from 'lucide-react';
import { bffClient } from '../services/bffClient';
import { Course } from '../types/course';
import { AppHeader } from './shared';
import { useAuth } from '../contexts/AuthContext';

function CourseStartPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  const fetchCourse = async () => {
    try {
      setLoading(true);
      const coursesData = await bffClient.getCourses();
      if (Array.isArray(coursesData)) {
        const found = coursesData.find((c: Course) => c.id === parseInt(courseId || '0', 10));
        setCourse(found || null);
      }
    } catch (err) {
      console.error('Error fetching course:', err);
    } finally {
      setLoading(false);
    }
  };

  const progress = Math.round(course?.progress ?? 0);
  const hasStarted = progress > 0;

  // Course emoji based on category or name
  const getCourseEmoji = (name: string) => {
    if (name.includes('デザイン') || name.includes('Design')) return '🎨';
    if (name.includes('プログラミング') || name.includes('開発')) return '💻';
    if (name.includes('マーケティング')) return '📊';
    if (name.includes('ビジネス')) return '💼';
    if (name.includes('英語') || name.includes('語学')) return '🌍';
    return '📚';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E86D78] mx-auto mb-4" />
          <p className="text-[#7E6E68]">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#7E6E68] mb-4">コースが見つかりませんでした</p>
          <button
            onClick={() => navigate('/courses')}
            className="bg-[#E86D78] hover:bg-[#d45c6a] text-white font-bold px-6 py-2 rounded-xl transition-colors"
            style={{ fontFamily: 'Noto Sans JP, sans-serif' }}
          >
            コース一覧に戻る
          </button>
        </div>
      </div>
    );
  }

  const courseName = course.displayname || course.fullname;
  const emoji = getCourseEmoji(courseName);

  return (
    <div className="min-h-screen bg-[#FAF8F4] flex flex-col">
      <AppHeader userName={user?.username || 'User'} />

      {/* Background decorative circles */}
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

        {/* Main Content */}
        <main className="relative max-w-[850px] mx-auto px-4 sm:px-6 py-8">
          {/* Back Button */}
          <button
            onClick={() => navigate('/courses')}
            className="w-10 h-10 rounded-full bg-[#FAF8F4] hover:bg-[#F0EAE6] border border-[#FAF8F4] flex items-center justify-center transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5 text-[#5D5555]" />
          </button>

          {/* Course Card */}
          <div
            className="bg-white rounded-[32px] border border-[#FFEAE1] shadow-sm p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-8"
          >
            {/* Left: Course Info */}
            <div className="flex-1 flex flex-col gap-5 min-w-0">
              {/* Badge */}
              <div>
                <span
                  className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold"
                  style={{
                    background: '#FFEAE1',
                    color: '#E86D78',
                    fontFamily: 'Noto Sans JP, sans-serif',
                  }}
                >
                  {hasStarted ? '前回のつづき' : 'コースを始める'}
                </span>
              </div>

              {/* Course Title with accent line */}
              <div className="flex items-center gap-3">
                <div className="w-[3px] h-8 rounded-full bg-[#E86D78] flex-shrink-0" />
                <h1
                  className="text-2xl font-semibold text-[#4B3A33] truncate"
                  style={{ fontFamily: 'Noto Sans JP, sans-serif' }}
                >
                  {courseName}
                </h1>
              </div>

              {/* Current Lesson Tag */}
              <div
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium text-[#7E6E68] self-start"
                style={{
                  background: '#FFF5D6',
                  border: '1px solid #FFD454',
                  fontFamily: 'Noto Sans JP, sans-serif',
                }}
              >
                {hasStarted ? `Lesson ${Math.ceil(progress / 10)}：次のレッスン` : 'Lesson 1：はじめに'}
              </div>

              {/* Progress Section */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs text-[#7E6E68]"
                    style={{ fontFamily: 'Noto Sans JP, sans-serif' }}
                  >
                    進捗率
                  </span>
                  <span
                    className="text-base font-semibold text-[#E86D78]"
                    style={{ fontFamily: 'Noto Sans JP, sans-serif' }}
                  >
                    {progress}%
                  </span>
                </div>
                <div className="h-2 bg-[#EFEFEF] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${progress}%`,
                      background: 'linear-gradient(to right, #FA9262, #E86D78)',
                    }}
                  />
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={() => navigate(`/course/${course.id}`)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-base transition-colors hover:opacity-90"
                style={{
                  background: '#E86D78',
                  fontFamily: 'Noto Sans JP, sans-serif',
                }}
              >
                <span>{hasStarted ? '学習を再開する' : '学習を開始する'}</span>
                <Play className="w-[18px] h-[18px] fill-white" />
              </button>
            </div>

            {/* Right: Decorative Illustration */}
            <div className="w-[240px] h-[240px] rounded-[28px] bg-[#FAF8F4] flex items-center justify-center flex-shrink-0">
              <div className="w-[112px] h-[112px] rounded-full bg-white border border-[#FFF0F2] flex items-center justify-center shadow-sm">
                <span className="text-5xl">{emoji}</span>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-[#7E6E68] h-10 flex items-center justify-center">
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

export default CourseStartPage;
