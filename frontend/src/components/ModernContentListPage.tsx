import React, { useState, useEffect } from 'react';
import { Container, Box, CircularProgress, Alert, IconButton } from '@mui/material';
import { Home } from '@mui/icons-material';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { bffAPI } from '../services/bffApi';
import { Course } from '../types/course';
import WebCoachHeader from './WebCoachHeader';
import ModernCourseCard from './ModernCourseCard';
import ModernLearningStats from './ModernLearningStats';

interface ModernContentListPageProps {
  onBack: () => void;
  onCourseSelect: (course: Course) => void;
}

const ModernContentListPage: React.FC<ModernContentListPageProps> = ({ onBack, onCourseSelect }) => {
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
      const coursesData = await bffAPI.getCourses();

      // ダミーの進捗データを追加（実際のアプリでは実データを使用）
      const coursesWithProgress = coursesData.map((course, index) => ({
        ...course,
        progress: Math.floor(Math.random() * 100),
        instructor: course.categoryname || 'インストラクター未設定',
        lastAccessed: index === 0 ? '2日前' : index === 1 ? '5日前' : '1週間前',
      }));

      setCourses(coursesWithProgress);
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError('コースの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const completedCourses = courses.filter(c => c.progress === 100);
  const inProgressCourses = courses.filter(c => c.progress > 0 && c.progress < 100);
  const totalCourses = courses.length;

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress size={60} />
      </Container>
    );
  }

  if (error && !courses.length) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <WebCoachHeader showButtons={false} />

      {/* Header */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #e0e0e0', py: 2 }}>
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={onBack} sx={{ color: '#333' }}>
              <Home />
            </IconButton>
            <h1 className="text-2xl font-semibold text-gray-900">マイラーニング</h1>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 6 }}>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-8 bg-white border border-gray-200">
            <TabsTrigger value="all">すべてのコース</TabsTrigger>
            <TabsTrigger value="inprogress">進行中</TabsTrigger>
            <TabsTrigger value="completed">完了済み</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {/* Learning Stats Section */}
            <ModernLearningStats
              totalCourses={totalCourses}
              completedCourses={completedCourses.length}
              inProgressCourses={inProgressCourses.length}
            />

            {/* Course List */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">マイコース</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 w-full">
                {courses.map((course) => (
                  <ModernCourseCard
                    key={course.id}
                    course={course}
                    onClick={() => onCourseSelect(course)}
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="inprogress" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">進行中のコース</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 w-full">
                {inProgressCourses.map((course) => (
                  <ModernCourseCard
                    key={course.id}
                    course={course}
                    onClick={() => onCourseSelect(course)}
                  />
                ))}
              </div>
              {inProgressCourses.length === 0 && (
                <Box className="text-center py-12">
                  <p className="text-gray-500">進行中のコースはありません</p>
                </Box>
              )}
            </div>
          </TabsContent>

          <TabsContent value="completed">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">完了したコース</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 w-full">
                {completedCourses.map((course) => (
                  <ModernCourseCard
                    key={course.id}
                    course={course}
                    onClick={() => onCourseSelect(course)}
                  />
                ))}
              </div>
              {completedCourses.length === 0 && (
                <Box className="text-center py-12">
                  <p className="text-gray-500">完了したコースはありません</p>
                </Box>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Container>
    </Box>
  );
};

export default ModernContentListPage;
