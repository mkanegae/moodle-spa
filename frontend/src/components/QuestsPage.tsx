import React, { useEffect, useState } from 'react';
import { Bell, Search, ChevronRight, Clock, Users, Star } from 'lucide-react';
import { CoursesPageData, CourseCard } from '../types/courses';
import { fetchCoursesData } from '../mocks/coursesData';
import { CourseImage } from './shared/CourseImage';

interface QuestsPageProps {
  userName?: string;
}

function QuestsPage({ userName = '未来のあなた' }: QuestsPageProps) {
  const [data, setData] = useState<CoursesPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    loadCoursesData();
  }, [selectedCategory, searchQuery]);

  const loadCoursesData = async () => {
    try {
      setLoading(true);
      const coursesData = await fetchCoursesData(selectedCategory, searchQuery);
      setData(coursesData);
    } catch (error) {
      console.error('Failed to load courses data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F3A7A7] mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">データの読み込みに失敗しました</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-[1920px] mx-auto px-8 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#F3A7A7]" style={{ fontFamily: 'Noto Serif JP, serif' }}>
            WEBCOACH
          </h1>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-gray-100 rounded-md">
              <Bell className="w-5 h-5 text-gray-400" />
            </button>
            <div className="w-8 h-8 rounded-full border-2 border-[#F3A7A7] overflow-hidden">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=F3A7A7&color=fff`}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto px-8 py-12">
        {/* Page Title */}
        <div className="text-center mb-8">
          <p className="text-sm text-gray-400 mb-2" style={{ fontFamily: 'Noto Sans JP, sans-serif' }}>
            1920w default
          </p>
          <h2
            className="text-4xl font-bold text-gray-800 mb-3"
            style={{ fontFamily: 'Noto Sans JP, sans-serif', letterSpacing: '0.05em' }}
          >
            COURSES
          </h2>
          <p className="text-sm text-gray-600" style={{ fontFamily: 'Noto Sans JP, sans-serif' }}>
            理想の教育を実現させる大人の学びプラットフォーム
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="キーワードで探す（例：デザイン AI, Instagram...）"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#F3A7A7] focus:border-transparent"
              style={{ fontFamily: 'Noto Sans JP, sans-serif' }}
            />
          </form>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center justify-center gap-3 mb-12">
          {data.categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryChange(category.id)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === category.id
                  ? 'bg-[#F3A7A7] text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
              style={{ fontFamily: 'Noto Sans JP, sans-serif' }}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Recommended Roadmaps Section */}
        {data.recommendedRoadmaps.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-[#F3A7A7] rounded-full"></div>
                <h3 className="text-xl font-bold text-gray-800" style={{ fontFamily: 'Noto Sans JP, sans-serif' }}>
                  おすすめのロードマップ
                </h3>
              </div>
              <button className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600">
                すべて見る
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.recommendedRoadmaps.map((course) => (
                <QuestCardComponent key={course.id} course={course} />
              ))}
            </div>
          </section>
        )}

        {/* Skill & Tool Courses Section */}
        {data.skillCourses.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-[#F3A7A7] rounded-full"></div>
                <h3 className="text-xl font-bold text-gray-800" style={{ fontFamily: 'Noto Sans JP, sans-serif' }}>
                  スキル・ツール別教材
                </h3>
              </div>
              <button className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600">
                すべて見る
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-6" style={{ fontFamily: 'Noto Sans JP, sans-serif' }}>
              Photoshopで学ぶなど、内容をピンポイントで学べます。
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {data.skillCourses.map((course) => (
                <QuestCardComponent key={course.id} course={course} compact />
              ))}
            </div>
          </section>
        )}

        {/* Single Skill Courses Section */}
        {data.singleCourses.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-yellow-400 rounded-full"></div>
                <h3 className="text-xl font-bold text-gray-800" style={{ fontFamily: 'Noto Sans JP, sans-serif' }}>
                  サクッと学べる単発スキル
                </h3>
              </div>
              <button className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600">
                すべて見る
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-6" style={{ fontFamily: 'Noto Sans JP, sans-serif' }}>
              単発で学べるコンテンツを集めました。
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {data.singleCourses.map((course) => (
                <QuestCardComponent key={course.id} course={course} compact />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {data.recommendedRoadmaps.length === 0 &&
          data.skillCourses.length === 0 &&
          data.singleCourses.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-500 mb-4" style={{ fontFamily: 'Noto Sans JP, sans-serif' }}>
                該当するコースが見つかりませんでした
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                  setSearchInput('');
                }}
                className="text-[#F3A7A7] hover:text-[#F38B8B] font-medium"
              >
                フィルターをリセット
              </button>
            </div>
          )}
      </main>
    </div>
  );
};

// Quest Card Component
interface QuestCardComponentProps {
  course: CourseCard;
  compact?: boolean;
}

function QuestCardComponent({ course, compact = false }: QuestCardComponentProps) {
  return (
    <div className="bg-white rounded-xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
      {/* Thumbnail */}
      <div className={`${compact ? 'h-24' : 'h-36'} relative`}>
        <CourseImage
          imageUrl={course.thumbnailUrl}
          alt={course.title}
          fallbackText={course.thumbnailText || course.title}
          fallbackColor={course.thumbnailColor || '#E5E7EB'}
          className={`w-full ${compact ? 'h-24' : 'h-36'}`}
          fallbackTextSize={compact ? 'sm' : 'md'}
        />
        {course.isFree && (
          <div className="absolute top-3 right-3 bg-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full">
            無料
          </div>
        )}
        {course.isNew && (
          <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
            NEW
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`${compact ? 'p-4' : 'p-6'}`}>
        {/* Category Badge */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-xs font-medium px-2 py-1 rounded"
            style={{
              backgroundColor: course.thumbnailColor ? `${course.thumbnailColor}20` : '#F3F4F6',
              color: course.thumbnailColor || '#6B7280',
            }}
          >
            {course.category}
          </span>
          {course.type === 'roadmap' && (
            <span className="text-xs text-gray-500">ロードマップ</span>
          )}
        </div>

        {/* Title */}
        <h4
          className={`${compact ? 'text-sm' : 'text-base'} font-bold text-gray-800 mb-2 line-clamp-2`}
          style={{ fontFamily: 'Noto Sans JP, sans-serif' }}
        >
          {course.subtitle}
        </h4>

        {/* Description */}
        {!compact && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2" style={{ fontFamily: 'Noto Sans JP, sans-serif' }}>
            {course.description}
          </p>
        )}

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {course.duration && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{course.duration}</span>
            </div>
          )}
          {course.enrolledCount && (
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{course.enrolledCount.toLocaleString()}</span>
            </div>
          )}
          {course.rating && (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span>{course.rating}</span>
            </div>
          )}
        </div>

        {/* Progress Bar (if user has started) */}
        {course.progress !== undefined && course.progress > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">進捗</span>
              <span className="text-xs font-medium text-gray-700">{course.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full"
                style={{
                  width: `${course.progress}%`,
                  backgroundColor: course.thumbnailColor || '#F3A7A7',
                }}
              ></div>
            </div>
          </div>
        )}

        {/* Course Button */}
        <button
          className="w-full mt-4 py-2 border border-[#F3A7A7] text-[#F3A7A7] rounded-full text-sm font-medium hover:bg-pink-50 transition-colors group-hover:bg-[#F3A7A7] group-hover:text-white"
          style={{ fontFamily: 'Noto Sans JP, sans-serif' }}
        >
          {course.progress !== undefined && course.progress > 0 ? '続きから学ぶ' : 'コースを見る'}
        </button>
      </div>
    </div>
  );
};

export default QuestsPage;
