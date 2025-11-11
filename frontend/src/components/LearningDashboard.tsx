import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Box,
  TextField,
  MenuItem,
  Select,
  FormControl,
} from '@mui/material';
import {
  Search,
} from '@mui/icons-material';
import { dashboardAPI } from '../services/dashboardApi';
import { DashboardData, CourseProgress, FilterOptions } from '../types/dashboard';
import { useAuthStore } from '../store/authStore';
import WebCoachHeader from './WebCoachHeader';
import { LoadingState, ErrorState, CourseCard } from './shared';

interface LearningDashboardProps {
  onLogout: () => void;
}

const LearningDashboard: React.FC<LearningDashboardProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuthStore();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    courseType: 'all',
    parentCategory: 'all',
    completionStatus: 'all'
  });
  const [sortBy, setSortBy] = useState<string>('recent');

  useEffect(() => {
    // トークンが利用可能な場合のみデータをロード
    if (token && isAuthenticated) {
      loadDashboardData();
    }
  }, [token, isAuthenticated]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dashboardAPI.getDashboardData();
      console.log('Dashboard data loaded:', data);
      console.log('Parent categories count:', data.parentCategories.length);
      data.parentCategories.forEach((pc, idx) => {
        console.log(`Parent category ${idx}:`, pc.parentCategory.name, 'Categories:', pc.categories.length);
        pc.categories.forEach((cat, cidx) => {
          console.log(`  Category ${cidx}:`, cat.name, 'Courses:', cat.courses.length);
        });
      });
      setDashboardData(data);
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      setError(error.message || 'ダッシュボードデータの読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = useCallback((field: keyof FilterOptions, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  }, []);

  const getFilteredCourses = useCallback((courses: CourseProgress[]): CourseProgress[] => {
    return courses.filter(course => {
      // 検索クエリフィルタ
      if (filters.searchQuery && !course.fullname.toLowerCase().includes(filters.searchQuery.toLowerCase())) {
        return false;
      }

      // コース種別フィルタ
      if (filters.courseType !== 'all' && course.type !== filters.courseType) {
        return false;
      }

      // 完了ステータスフィルタ
      if (filters.completionStatus !== 'all') {
        if (filters.completionStatus === 'completed' && !course.isCompleted) return false;
        if (filters.completionStatus === 'in_progress' && (course.isCompleted || course.progressPercentage === 0)) return false;
        if (filters.completionStatus === 'not_started' && course.progressPercentage > 0) return false;
      }

      return true;
    });
  }, [filters]);

  // useMemoでフィルタリング処理を最適化（hooksの順序を保つため早期returnの前に配置）
  const filteredCourses = useMemo(() => {
    if (!dashboardData) return [];
    return dashboardData.parentCategories.flatMap(parentCat =>
      parentCat.categories.flatMap(category =>
        getFilteredCourses(category.courses)
      )
    );
  }, [dashboardData, getFilteredCourses]);

  // Removed inline CourseCard - using shared component instead

  if (loading) {
    return <LoadingState fullHeight />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={loadDashboardData} />;
  }

  if (!dashboardData) {
    return <ErrorState error="ダッシュボードデータがありません。" severity="info" />;
  }

  return (
    <Box sx={{ flexGrow: 1, backgroundColor: '#f7f9fa', minHeight: '100vh' }}>
      <WebCoachHeader onLogout={onLogout} />

      {/* My Learning ナビゲーション */}
      <Box
        sx={{
          bgcolor: '#fafafa',
          borderBottom: '1px solid #e0e0e0',
          py: 1.5,
        }}
      >
        <Box sx={{ px: { xs: 2, sm: 3, md: 4, lg: 6 } }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1, color: 'text.primary' }}>
            My learning
          </Typography>
          <Box sx={{ borderBottom: 1, borderColor: '#e0e0e0' }}>
            <Button
              sx={{
                color: 'text.primary',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                px: 2,
                py: 0.5,
                borderBottom: '2px solid',
                borderColor: 'primary.main',
                borderRadius: 0,
                textTransform: 'none',
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.04)',
                },
              }}
            >
              All courses
            </Button>
          </Box>
        </Box>
      </Box>

      <Box sx={{ px: { xs: 2, sm: 3, md: 4, lg: 6 }, mt: 3, mb: 4 }}>

        {/* フィルタ - Udemyスタイル */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* 左側: フィルターボタン */}
            <Box sx={{ display: 'flex', gap: 2, flexGrow: 1, flexWrap: 'wrap' }}>
              <Typography variant="subtitle2" sx={{ alignSelf: 'center', color: 'text.secondary', minWidth: 80 }}>
                並び替え
              </Typography>

              <FormControl variant="outlined" size="small" sx={{ minWidth: 180 }}>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  displayEmpty
                  sx={{ backgroundColor: 'white' }}
                >
                  <MenuItem value="recent">最近のアクセス順</MenuItem>
                  <MenuItem value="title">タイトル順</MenuItem>
                  <MenuItem value="progress">進捗順</MenuItem>
                </Select>
              </FormControl>

              <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
                <Select
                  value={filters.parentCategory}
                  onChange={(e) => handleFilterChange('parentCategory', e.target.value)}
                  displayEmpty
                  sx={{ backgroundColor: 'white' }}
                >
                  <MenuItem value="all">カテゴリー</MenuItem>
                  {dashboardData?.parentCategories.map(cat => (
                    <MenuItem key={cat.parentCategory.id} value={cat.parentCategory.id}>
                      {cat.parentCategory.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
                <Select
                  value={filters.completionStatus}
                  onChange={(e) => handleFilterChange('completionStatus', e.target.value)}
                  displayEmpty
                  sx={{ backgroundColor: 'white' }}
                >
                  <MenuItem value="all">受講完了率</MenuItem>
                  <MenuItem value="completed">完了</MenuItem>
                  <MenuItem value="in_progress">進行中</MenuItem>
                  <MenuItem value="not_started">未開始</MenuItem>
                </Select>
              </FormControl>

              <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={filters.courseType}
                  onChange={(e) => handleFilterChange('courseType', e.target.value)}
                  displayEmpty
                  sx={{ backgroundColor: 'white' }}
                >
                  <MenuItem value="all">講師</MenuItem>
                  <MenuItem value="required">必修コース</MenuItem>
                  <MenuItem value="advanced">発展コース</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="text"
                onClick={() => {
                  setFilters({
                    searchQuery: '',
                    courseType: 'all',
                    parentCategory: 'all',
                    completionStatus: 'all'
                  });
                  setSortBy('recent');
                }}
                sx={{ textTransform: 'none', color: 'text.secondary' }}
              >
                リセット
              </Button>
            </Box>

            {/* 右側: 検索ボックス */}
            <TextField
              placeholder="マイコースを検索"
              value={filters.searchQuery}
              onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
              size="small"
              sx={{
                minWidth: 280,
                backgroundColor: 'white',
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1,
                }
              }}
              slotProps={{
                input: {
                  startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />,
                }
              }}
            />
        </Box>

        {/* コースカード */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 w-full">
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={{
                  ...course,
                  progress: course.progressPercentage,
                }}
                variant="modern"
                showProgress
                onClick={() => navigate(`/course/${course.id}`)}
              />
            ))}
        </div>
      </Box>
    </Box>
  );
};

export default LearningDashboard;
