import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
  TextField,
  Box,
  InputAdornment,
} from '@mui/material';
import {
  Logout,
  Search,
  Add,
  Dashboard,
  School,
  Create
} from '@mui/icons-material';
import Grid from '@mui/material/Grid';
import { bffAPI } from '../services/bffApi';
import { Course } from '../types/course';
import { LoadingState, ErrorState, CourseCard } from './shared';

interface CoursesPageProps {
  onLogout: () => void;
  onNavigateToContentRegistration: () => void;
  onNavigateToContentList: () => void;
  onNavigateToModernCreator: () => void;
}

const CoursesPage: React.FC<CoursesPageProps> = ({ onLogout, onNavigateToContentRegistration, onNavigateToContentList, onNavigateToModernCreator }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filterCourses = useCallback(() => {
    // coursesが配列でない場合の安全な処理
    if (!Array.isArray(courses)) {
      setFilteredCourses([]);
      return;
    }

    if (!searchQuery.trim()) {
      setFilteredCourses(courses);
      return;
    }

    const filtered = courses.filter(course =>
      course?.fullname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course?.shortname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course?.categoryname?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredCourses(filtered);
  }, [courses, searchQuery]);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    filterCourses();
  }, [courses, searchQuery, filterCourses]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);

      // BFF API経由で認証済みのリクエストを送信（セッションCookieで認証）
      console.log('Fetching courses via BFF API...');
      const coursesData = await bffAPI.getCourses();

      console.log('Received courses data:', coursesData);
      console.log('Available course IDs:', coursesData.map(c => c.id));

      // データが配列であることを確認
      if (Array.isArray(coursesData)) {
        setCourses(coursesData);
        console.log('Successfully set courses:', coursesData.length);
      } else {
        console.warn('Expected array but received:', coursesData);
        setCourses([]);
        setError('Invalid data format received from server');
      }
    } catch (err: any) {
      console.error('Error fetching courses:', err);

      // エラーの種類に応じてメッセージを変更
      if (err.response?.status === 401) {
        setError('Authentication failed. Please login again.');
      } else if (err.response?.status === 403) {
        setError('Permission denied. You may not have access to courses.');
      } else if (err.code === 'NETWORK_ERROR' || !err.response) {
        setError('Network error. Please check your connection.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to fetch courses');
      }

      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  // Removed: Using shared utilities instead

  if (loading) {
    return <LoadingState message="Loading courses..." fullHeight />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={fetchCourses} />;
  }

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <School sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            My Courses
          </Typography>
          <Button
            color="inherit"
            startIcon={<Dashboard />}
            onClick={onNavigateToContentList}
            sx={{ mr: 1 }}
          >
            Manage Content
          </Button>
          <Button
            color="inherit"
            startIcon={<Create />}
            onClick={onNavigateToModernCreator}
            sx={{ mr: 1 }}
          >
            Create Course
          </Button>
          <Button
            color="inherit"
            startIcon={<Add />}
            onClick={onNavigateToContentRegistration}
            sx={{ mr: 1 }}
          >
            Classic Creator
          </Button>
          <Button color="inherit" startIcon={<Logout />} onClick={onLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />
          <Typography variant="body2" color="text.secondary">
            {filteredCourses?.length || 0} of {courses?.length || 0} courses
          </Typography>
        </Box>

        {(filteredCourses?.length || 0) === 0 ? (
          <Box textAlign="center" py={8}>
            <Typography variant="h6" color="text.secondary">
              {searchQuery ? 'No courses match your search.' : 'No courses found.'}
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {(filteredCourses || []).map((course) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={course.id}>
                <CourseCard
                  course={course}
                  variant="default"
                  showAction
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
};

export default CoursesPage;