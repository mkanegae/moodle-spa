import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Button,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  School as SchoolIcon,
  TrendingUp as TrendingUpIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  Lightbulb as LightbulbIcon,
  Schedule as ScheduleIcon,
  ArrowForward as ArrowForwardIcon,
  Map as MapIcon,
  QuestionAnswer as QuestionAnswerIcon,
} from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import WebCoachHeader from './WebCoachHeader';

interface HomePageProps {
  onLogout: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onLogout }) => {
  const navigate = useNavigate();

  // ロードマップ全体の進捗データ
  const overallProgress = 48;
  const courseData = [
    { name: '完了', value: 0, color: '#22c55e' },
    { name: '進行中', value: 3, color: '#f97316' },
    { name: '未着手', value: 0, color: '#94a3b8' },
  ];

  // 各コースの詳細進捗
  const courseProgress = [
    { name: 'Excel XLOOKUP講座', progress: 45, color: '#3b82f6' },
    { name: 'React完全ガイド', progress: 72, color: '#8b5cf6' },
    { name: 'Python機械学習入門', progress: 28, color: '#06b6d4' },
  ];

  // 次のタスク
  const nextTasks = [
    {
      id: 1,
      title: 'XLOOKUP演習',
      timeRemaining: '残り20分',
      courseId: 1,
    },
    {
      id: 2,
      title: 'Figmaモックアップ提出',
      deadline: '期限: 明日',
      courseId: 2,
    },
  ];

  // 最近の学習
  const recentLearning = [
    {
      id: 1,
      title: 'Excel XLOOKUP講座',
      lastAccessed: '2日前',
      progress: 45,
    },
    {
      id: 2,
      title: 'React Hooks基礎',
      lastAccessed: '5日前',
      progress: 72,
    },
  ];

  const handleCourseClick = (courseId: number) => {
    navigate(`/course/${courseId}`);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <WebCoachHeader
        onLogout={onLogout}
        onNavigateToCareerPath={() => navigate('/career-path/web-designer')}
        onNavigateToSkill={() => navigate('/skill/1')}
      />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Welcome Message */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            borderRadius: 2,
            p: 3,
            mb: 3,
            color: 'white',
          }}
        >
          <Typography variant="h4" gutterBottom>
            ようこそ、○○さん！
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            今日も学習を続けましょう
          </Typography>
        </Box>

        {/* Progress Summary */}
        <Card sx={{ mb: 3 }}>
          <CardHeader
            avatar={<TrendingUpIcon color="primary" fontSize="small" />}
            title="進捗サマリー"
            titleTypographyProps={{ variant: 'h6' }}
          />
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Overall Progress */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MapIcon color="primary" />
                    <Typography variant="subtitle1">ロードマップ全体の進捗</Typography>
                  </Box>
                  <Typography variant="h4">{overallProgress}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={overallProgress} sx={{ height: 10, borderRadius: 5 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  全3コース中、平均進捗率 {overallProgress}%
                </Typography>
              </Box>

              {/* Pie Chart */}
              <Box sx={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={courseData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {courseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </div>

            {/* Course Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#eff6ff', borderRadius: 2 }}>
                <SchoolIcon sx={{ fontSize: 40, color: '#3b82f6', mb: 1 }} />
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  登録中
                </Typography>
                <Typography variant="h4">3コース</Typography>
              </Box>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f0fdf4', borderRadius: 2 }}>
                <CheckCircleIcon sx={{ fontSize: 40, color: '#22c55e', mb: 1 }} />
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  完了
                </Typography>
                <Typography variant="h4">0コース</Typography>
              </Box>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#fff7ed', borderRadius: 2 }}>
                <PlayArrowIcon sx={{ fontSize: 40, color: '#f97316', mb: 1 }} />
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  進行中
                </Typography>
                <Typography variant="h4">3コース</Typography>
              </Box>
            </div>

            {/* Individual Course Progress */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                各コースの進捗
              </Typography>
              {courseProgress.map((course, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">{course.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {course.progress}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={course.progress}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: course.color,
                      },
                    }}
                  />
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>

        {/* Next Tasks */}
        <Card sx={{ mb: 3 }}>
          <CardHeader
            avatar={<ScheduleIcon color="primary" fontSize="small" />}
            title="次のタスク"
            titleTypographyProps={{ variant: 'h6' }}
          />
          <CardContent>
            {nextTasks.map((task) => (
              <Box
                key={task.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                  mb: 2,
                  '&:last-child': { mb: 0 },
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" gutterBottom>
                    {task.title}
                  </Typography>
                  <Chip
                    icon={<ScheduleIcon />}
                    label={task.timeRemaining || task.deadline}
                    size="small"
                    variant="outlined"
                  />
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => handleCourseClick(task.courseId)}
                >
                  開始
                </Button>
              </Box>
            ))}
          </CardContent>
        </Card>

        {/* AI Suggestions */}
        <Card
          sx={{
            mb: 3,
            borderColor: '#3b82f6',
            bgcolor: '#eff6ff',
          }}
        >
          <CardHeader
            avatar={<LightbulbIcon sx={{ color: '#3b82f6', fontSize: 'small' }} />}
            title="AIからの提案"
            titleTypographyProps={{ variant: 'h6' }}
          />
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Typography variant="h3">💡</Typography>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body1" gutterBottom>
                  不足スキル: <strong>CSS Grid</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  推薦コース: レスポンシブデザイン完全ガイド
                </Typography>
                <Button variant="outlined" size="small">
                  詳細を見る
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Recent Learning */}
        <Card sx={{ mb: 3 }}>
          <CardHeader
            avatar={<ScheduleIcon color="primary" fontSize="small" />}
            title="最近の学習"
            titleTypographyProps={{ variant: 'h6' }}
          />
          <CardContent>
            {recentLearning.map((item) => (
              <Box
                key={item.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                  mb: 2,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'grey.100' },
                  '&:last-child': { mb: 0 },
                }}
                onClick={() => handleCourseClick(item.id)}
              >
                <SchoolIcon color="action" />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1">{item.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.lastAccessed}
                  </Typography>
                </Box>
                <Chip label={`${item.progress}%`} variant="outlined" />
              </Box>
            ))}
          </CardContent>
        </Card>

        {/* Quick Access */}
        <Card>
          <CardHeader
            title="クイックアクセス"
            titleTypographyProps={{ variant: 'h6' }}
          />
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Button
                variant="outlined"
                fullWidth
                sx={{
                  height: 100,
                  flexDirection: 'column',
                  gap: 1,
                }}
                onClick={() => navigate('/my-learning')}
              >
                <SchoolIcon fontSize="large" />
                <Typography variant="caption">マイラーニング</Typography>
              </Button>
              <Button
                variant="outlined"
                fullWidth
                sx={{
                  height: 100,
                  flexDirection: 'column',
                  gap: 1,
                }}
                onClick={() => navigate('/career-path/web-designer')}
              >
                <MapIcon fontSize="large" />
                <Typography variant="caption">ロードマップ</Typography>
              </Button>
              <Button
                variant="outlined"
                fullWidth
                sx={{
                  height: 100,
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                <QuestionAnswerIcon fontSize="large" />
                <Typography variant="caption">メンターに相談</Typography>
              </Button>
              <Button
                variant="outlined"
                fullWidth
                sx={{
                  height: 100,
                  flexDirection: 'column',
                  gap: 1,
                }}
                onClick={() => navigate('/career-path/web-designer')}
              >
                <TrendingUpIcon fontSize="large" />
                <Typography variant="caption">キャリアパス</Typography>
              </Button>
            </div>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default HomePage;
