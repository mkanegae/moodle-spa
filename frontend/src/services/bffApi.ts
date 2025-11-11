import express from 'express';
import cors from 'cors';
import { moodleAPI } from './api';
import { DashboardData } from '../types/dashboard';

const app = express();
const PORT = process.env.BFF_PORT || 4000;

app.use(cors());
app.use(express.json());

// Moodle認証トークンを安全に管理するためのミドルウェア
app.use((req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    moodleAPI.setToken(token);
  }
  next();
});

// ダッシュボードデータ取得エンドポイント
app.get('/api/dashboard', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    moodleAPI.setToken(token);

    // コースと進捗データを取得
    const [courses, categories] = await Promise.all([
      moodleAPI.getCourses(),
      moodleAPI.getCategories()
    ]);

    // 進捗データの変換とキャッシュ
    const dashboardData = await transformToDashboardData(courses, categories);

    res.json(dashboardData);
  } catch (error: any) {
    console.error('Dashboard API error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard data',
      message: error.message
    });
  }
});

// コース完了状況取得エンドポイント
app.get('/api/course/:courseId/completion', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    moodleAPI.setToken(token);
    const courseId = parseInt(req.params.courseId);

    const completion = await moodleAPI.makeRequest('core_completion_get_course_completion_status', {
      courseid: courseId,
      userid: 0
    });

    res.json(completion);
  } catch (error: any) {
    console.error('Course completion API error:', error);
    res.status(500).json({
      error: 'Failed to fetch course completion',
      message: error.message
    });
  }
});

// カテゴリ別コース取得エンドポイント
app.get('/api/categories/:categoryId/courses', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    moodleAPI.setToken(token);
    const categoryId = parseInt(req.params.categoryId);

    const courses = await moodleAPI.makeRequest('core_course_get_courses_by_field', {
      field: 'category',
      value: categoryId
    });

    res.json(courses);
  } catch (error: any) {
    console.error('Category courses API error:', error);
    res.status(500).json({
      error: 'Failed to fetch category courses',
      message: error.message
    });
  }
});

// クオーター別データフィルタリングエンドポイント
app.get('/api/dashboard/quarter/:quarter', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    moodleAPI.setToken(token);
    const quarter = req.params.quarter;

    const dashboardData = await getDashboardData();
    const quarterData = dashboardData.parentCategories.find(q => q.parentCategory.id.toString() === quarter);

    if (!quarterData) {
      return res.status(404).json({ error: 'Quarter not found' });
    }

    res.json(quarterData);
  } catch (error: any) {
    console.error('Quarter data API error:', error);
    res.status(500).json({
      error: 'Failed to fetch quarter data',
      message: error.message
    });
  }
});

// ヘルスチェックエンドポイント
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Moodle Learning Dashboard BFF'
  });
});

async function transformToDashboardData(courses: any[], categories: any[]): Promise<DashboardData> {
  // ダッシュボード用のデータ変換ロジック
  // この関数は dashboardApi.ts の getDashboardData() と同様の処理を行う

  // 実装は dashboardApi.ts と同様
  // (簡略化のため、クライアント側の実装を優先)

  return {
    parentCategories: [],
    totalProgress: {
      totalCourses: courses.length,
      completedCourses: 0,
      averageProgress: 0
    }
  };
}

async function getDashboardData(): Promise<DashboardData> {
  const [courses, categories] = await Promise.all([
    moodleAPI.getCourses(),
    moodleAPI.getCategories()
  ]);

  return transformToDashboardData(courses, categories);
}

// エラーハンドリングミドルウェア
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('BFF Error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`BFF Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}

export default app;