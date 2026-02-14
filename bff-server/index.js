
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;

// Environment variables
const MOODLE_URL = process.env.MOODLE_URL || 'http://localhost';
const API_SERVER_URL = process.env.API_SERVER_URL || 'http://localhost:8001';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-production';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // CloudFrontで管理
  crossOriginEmbedderPolicy: false
}));

// CORS設定（CloudFrontからのみ許可）
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Trust proxy - required for secure cookies behind reverse proxy
app.set('trust proxy', 1);

app.use(express.json({
  verify: (req, res, buf, encoding) => {
    if (buf && buf.length) {
      const rawBody = buf.toString(encoding || 'utf8');
      console.log('=== RAW BODY RECEIVED ===');
      console.log('Method:', req.method);
      console.log('Path:', req.path);
      console.log('Content-Type:', req.headers['content-type']);
      console.log('Raw Body String:', rawBody);
      console.log('Raw Body Length:', rawBody.length);
      console.log('Raw Body Bytes:', Array.from(buf).slice(0, 100));
    }
  }
}));
app.use(express.urlencoded({ extended: true }));

// Session configuration (memory-based for simplicity)
const sessionConfig = {
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'sessionId',
  cookie: {
    httpOnly: true, // Prevent client-side access for security
    secure: NODE_ENV === 'production', // HTTPS only in production
    sameSite: NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-origin in HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};

app.use(session(sessionConfig));

// Session event logging
app.use((req, res, next) => {
  // リクエスト受信時のCookie情報
  console.log('=== Cookie & Session Details ===');
  console.log('Cookie Header:', req.headers.cookie || 'No Cookie');
  console.log('Session ID:', req.sessionID || 'No Session ID');
  console.log('Session exists:', !!req.session);

  if (req.session) {
    console.log('Session data:', {
      hasToken: !!req.session.moodleToken,
      userId: req.session.userId,
      username: req.session.username,
      cookie: {
        originalMaxAge: req.session.cookie.originalMaxAge,
        expires: req.session.cookie.expires,
        httpOnly: req.session.cookie.httpOnly,
        secure: req.session.cookie.secure,
        sameSite: req.session.cookie.sameSite
      }
    });
  }

  // レスポンス送信時のSet-Cookie情報
  const originalSetHeader = res.setHeader;
  res.setHeader = function(name, value) {
    if (name.toLowerCase() === 'set-cookie') {
      console.log('=== Set-Cookie Header ===');
      console.log('Setting Cookie:', value);
    }
    return originalSetHeader.apply(this, arguments);
  };

  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: req.session.userId || 'anonymous'
    });
  });
  next();
});

// Authentication middleware
const requireAuth = (req, res, next) => {
  console.log('=== Authentication Check ===');
  console.log('Path:', req.path);
  console.log('Has session:', !!req.session);
  console.log('Has moodleToken:', !!req.session?.moodleToken);

  if (!req.session || !req.session.moodleToken) {
    console.log('Authentication FAILED - Returning 401');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('Authentication SUCCESS');
  next();
};

// File upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

// ==================== ROUTES ====================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Moodle BFF',
    environment: NODE_ENV
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Moodle BFF',
    environment: NODE_ENV
  });
});

// ==================== AUTH ROUTES ====================

// Login
app.post('/api/login', async (req, res) => {
  try {
    console.log('=== Raw Request Debug ===');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Raw Body:', JSON.stringify(req.body));
    console.log('Body type:', typeof req.body);

    const { username, password, service = 'moodle_mobile_app' } = req.body;

    console.log('Login attempt:', { username, service, passwordLength: password?.length });
    console.log('Password value:', password);

    // Call Moodle login API
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    formData.append('service', service);

    console.log('Sending request to:', `${MOODLE_URL}/login/token.php`);
    const response = await axios.post(`${MOODLE_URL}/login/token.php`, formData, {
      headers: formData.getHeaders()
    });

    console.log('Moodle response status:', response.status);
    console.log('Moodle response data:', response.data);

    if (response.data.error) {
      return res.status(401).json({ error: response.data.error });
    }

    const { token } = response.data;

    // Get user info to save userid in session
    let userInfo;
    try {
      userInfo = await callMoodleAPI(token, 'core_webservice_get_site_info');
      console.log('User info retrieved:', { userid: userInfo.userid, username: userInfo.username });
    } catch (error) {
      console.error('Failed to get user info:', error.message);
      return res.status(500).json({ error: 'Failed to retrieve user information' });
    }

    // Save to session (server-side only)
    req.session.moodleToken = token;
    req.session.username = username;
    req.session.userId = userInfo.userid;

    console.log('=== Session Created on Login ===');
    console.log('Login successful:', { username, userId: userInfo.userid });
    console.log('Session ID:', req.sessionID);
    console.log('Saving session explicitly...');

    // Explicitly save session before responding
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Failed to save session' });
      }

      console.log('Session saved successfully');

      // Return user info (but NOT the token)
      res.json({
        success: true,
        username: username,
        userId: userInfo.userid,
        message: 'ログインに成功しました'
      });
    });
  } catch (error) {
    console.error('Login error:', error.message);
    console.error('Error response status:', error.response?.status);
    console.error('Error response data:', error.response?.data);
    res.status(401).json({
      error: error.response?.data?.error || 'Login failed'
    });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  const sessionId = req.sessionID;
  const username = req.session?.username;

  console.log('=== Session Destroy on Logout ===');
  console.log('Destroying session:', { sessionId, username });

  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }

    console.log('Session destroyed successfully');
    console.log('Clearing Cookie: sessionId');
    res.clearCookie('sessionId');
    res.json({ success: true });
  });
});

// Get current user info
app.get('/api/user/info', requireAuth, async (req, res) => {
  try {
    const userInfo = await callMoodleAPI(
      req.session.moodleToken,
      'core_webservice_get_site_info'
    );
    res.json(userInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== MOODLE API ROUTES ====================

// Get courses
app.get('/api/moodle/courses', requireAuth, async (req, res) => {
  try {
    const result = await callMoodleAPI(
      req.session.moodleToken,
      'core_course_get_enrolled_courses_by_timeline_classification',
      {
        classification: 'all',
        limit: 0,
        offset: 0
      }
    );
    res.json(result.courses || []);
  } catch (error) {
    console.error('Get courses error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Search courses
app.get('/api/moodle/courses/search', requireAuth, async (req, res) => {
  try {
    const { q } = req.query;
    const result = await callMoodleAPI(
      req.session.moodleToken,
      'core_course_search_courses',
      {
        criterianame: 'search',
        criteriavalue: q
      }
    );
    res.json(result.courses || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get categories
app.get('/api/moodle/categories', requireAuth, async (req, res) => {
  try {
    const categories = await callMoodleAPI(
      req.session.moodleToken,
      'core_course_get_categories'
    );
    res.json(Array.isArray(categories) ? categories : categories.categories || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create course
app.post('/api/moodle/courses', requireAuth, async (req, res) => {
  try {
    const courseData = req.body;

    const params = {
      'courses[0][fullname]': courseData.fullname,
      'courses[0][shortname]': courseData.shortname,
      'courses[0][categoryid]': courseData.categoryid
    };

    if (courseData.summary) params['courses[0][summary]'] = courseData.summary;

    const result = await callMoodleAPI(
      req.session.moodleToken,
      'core_course_create_courses',
      params
    );
    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get course contents
app.get('/api/moodle/courses/:courseid/contents', requireAuth, async (req, res) => {
  try {
    const { courseid } = req.params;
    const contents = await callMoodleAPI(
      req.session.moodleToken,
      'core_course_get_contents',
      { courseid }
    );
    res.json(contents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create activity
app.post('/api/moodle/courses/:courseid/activities', requireAuth, async (req, res) => {
  try {
    const { courseid } = req.params;
    const { modulename, ...activityData } = req.body;

    const params = {
      courseid,
      'activities[0][modulename]': modulename,
      'activities[0][name]': activityData.name,
      'activities[0][section]': activityData.section || 0
    };

    if (activityData.intro) params['activities[0][intro]'] = activityData.intro;

    const result = await callMoodleAPI(
      req.session.moodleToken,
      'core_course_create_activities',
      params
    );
    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload file
app.post('/api/moodle/files/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const { courseid } = req.body;

    const formData = new FormData();
    formData.append('wstoken', req.session.moodleToken);
    formData.append('wsfunction', 'core_files_upload');
    formData.append('moodlewsrestformat', 'json');
    formData.append('contextid', '1');
    formData.append('component', 'user');
    formData.append('filearea', 'draft');
    formData.append('itemid', Date.now().toString());
    formData.append('filepath', '/');
    formData.append('filename', file.originalname);
    formData.append('file', file.buffer, { filename: file.originalname });

    const response = await axios.post(`${MOODLE_URL}/webservice/rest/server.php`, formData, {
      headers: formData.getHeaders()
    });

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generic Moodle API call
app.post('/api/moodle/api', requireAuth, async (req, res) => {
  try {
    const { wsfunction, params } = req.body;
    const result = await callMoodleAPI(req.session.moodleToken, wsfunction, params);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== AI API ROUTES ====================

// AI Summarization
app.post('/api/ai/summarize', requireAuth, async (req, res) => {
  try {
    const { courseId, moduleName, query, maxChunks = 5 } = req.body;

    const response = await axios.post(`${API_SERVER_URL}/api/summarize`, {
      course_id: courseId,
      module_name: moduleName,
      query: query,
      max_chunks: maxChunks
    }, {
      timeout: 60000 // 60 seconds
    });

    res.json(response.data);
  } catch (error) {
    console.error('AI summarization error:', error.message);
    res.status(500).json({
      error: error.response?.data?.detail || 'AI要約の生成に失敗しました'
    });
  }
});

// Get course modules for AI
app.get('/api/ai/courses/:courseId/modules', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const response = await axios.get(`${API_SERVER_URL}/api/courses/${courseId}/modules`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching course modules:', error.message);
    res.json({ modules: [] });
  }
});

// ==================== DASHBOARD ROUTES ====================

// Get dashboard data (aggregated)
app.get('/api/dashboard', requireAuth, async (req, res) => {
  try {
    // Fetch multiple endpoints in parallel
    const [courses, categories] = await Promise.all([
      callMoodleAPI(
        req.session.moodleToken,
        'core_course_get_enrolled_courses_by_timeline_classification',
        { classification: 'all', limit: 0, offset: 0 }
      ),
      callMoodleAPI(req.session.moodleToken, 'core_course_get_categories')
    ]);

    // Transform data
    const dashboardData = {
      courses: courses.courses || [],
      categories: Array.isArray(categories) ? categories : categories.categories || [],
      totalCourses: courses.courses?.length || 0,
      lastUpdated: new Date().toISOString()
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Dashboard error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// Additional Moodle API Endpoints
// ==========================================

/**
 * GET /api/moodle/getcoursebyfield
 * カテゴリなどのフィールドからコースを取得
 */
app.get('/api/moodle/getcoursebyfield', requireAuth, async (req, res) => {
  try {
    const { field, value } = req.query;

    if (!field || !value) {
      return res.status(400).json({
        error: 'Bad Request',
        detail: 'field and value query parameters are required'
      });
    }

    const result = await callMoodleAPI(
      req.session.moodleToken,
      'core_course_get_courses_by_field',
      {
        field: field,
        value: value
      }
    );

    res.json(result);
  } catch (error) {
    console.error('[Moodle GetCourseByField] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/moodle/badges
 * バッジ一覧を取得
 */
app.get('/api/moodle/badges', requireAuth, async (req, res) => {
  try {
    const result = await callMoodleAPI(
      req.session.moodleToken,
      'core_badges_get_badges',
      {}
    );

    res.json(result);
  } catch (error) {
    console.error('[Moodle GetBadges] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/moodle/user-badges/:userid
 * ユーザー獲得バッジを取得
 */
app.get('/api/moodle/user-badges/:userid', requireAuth, async (req, res) => {
  try {
    const { userid } = req.params;

    const result = await callMoodleAPI(
      req.session.moodleToken,
      'core_badges_get_user_badges',
      {
        userid: userid
      }
    );

    res.json(result);
  } catch (error) {
    console.error('[Moodle GetUserBadges] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// WebCoach API Endpoints
// ==========================================

/**
 * GET /api/webcoach/profile/:userid
 * プロフィール情報を取得
 */
app.get('/api/webcoach/profile/:userid', requireAuth, async (req, res) => {
  try {
    const { userid } = req.params;

    const response = await axios.get(
      `${API_SERVER_URL}/api/profile/${userid}`,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('[WebCoach Profile] Error:', error.message);

    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }

    res.status(500).json({
      error: 'Failed to get profile',
      detail: error.message
    });
  }
});

/**
 * POST /api/webcoach/updateprofile/:userid
 * プロフィール情報を更新
 */
app.post('/api/webcoach/updateprofile/:userid', requireAuth, async (req, res) => {
  try {
    const { userid } = req.params;
    const profileData = req.body;

    const response = await axios.post(
      `${API_SERVER_URL}/api/updateprofile/${userid}`,
      profileData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('[WebCoach UpdateProfile] Error:', error.message);

    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }

    res.status(500).json({
      error: 'Failed to update profile',
      detail: error.message
    });
  }
});

/**
 * POST /api/v1/profile/
 * プロフィール情報を保存（v1 API）
 */
app.post('/api/v1/profile/', requireAuth, async (req, res) => {
  try {
    const profileData = req.body;

    const response = await axios.post(
      `${API_SERVER_URL}/api/v1/profile/`,
      profileData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('[Profile Save v1] Error:', error.message);

    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }

    res.status(500).json({
      error: 'Failed to save profile',
      detail: error.message
    });
  }
});

/**
 * GET /api/webcoach/resumecourse/:userid
 * コース再開情報を取得
 */
app.get('/api/webcoach/resumecourse/:userid', requireAuth, async (req, res) => {
  try {
    const { userid } = req.params;
    const { limit } = req.query;

    const response = await axios.get(
      `${API_SERVER_URL}/api/resumecourse/${userid}`,
      {
        params: { limit: limit || 5 },
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('[WebCoach ResumeCourse] Error:', error.message);

    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }

    res.status(500).json({
      error: 'Failed to get resume courses',
      detail: error.message
    });
  }
});

/**
 * GET /api/webcoach/recomendbadge/:userid
 * おすすめバッジを取得
 */
app.get('/api/webcoach/recomendbadge/:userid', requireAuth, async (req, res) => {
  try {
    const { userid } = req.params;

    const response = await axios.get(
      `${API_SERVER_URL}/api/recomendbadge/${userid}`,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('[WebCoach RecommendBadge] Error:', error.message);

    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }

    res.status(500).json({
      error: 'Failed to get recommended badges',
      detail: error.message
    });
  }
});

/**
 * GET /api/webcoach/roadmaps
 * ロードマップ一覧を取得
 */
app.get('/api/webcoach/roadmaps', requireAuth, async (req, res) => {
  try {
    const { category, difficulty, limit, offset } = req.query;

    const response = await axios.get(
      `${API_SERVER_URL}/api/rodmaps`,
      {
        params: {
          category,
          difficulty,
          limit: limit || 20,
          offset: offset || 0
        },
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('[WebCoach Roadmaps] Error:', error.message);

    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }

    res.status(500).json({
      error: 'Failed to get roadmaps',
      detail: error.message
    });
  }
});

/**
 * GET /api/webcoach/roadmap/:roadmapid
 * 特定ロードマップ詳細を取得
 */
app.get('/api/webcoach/roadmap/:roadmapid', requireAuth, async (req, res) => {
  try {
    const { roadmapid } = req.params;

    const response = await axios.get(
      `${API_SERVER_URL}/api/rodmaps/${roadmapid}`,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('[WebCoach Roadmap Detail] Error:', error.message);

    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }

    res.status(500).json({
      error: 'Failed to get roadmap detail',
      detail: error.message
    });
  }
});

/**
 * POST /api/webcoach/ai
 * AIチャット
 */
app.post('/api/webcoach/ai', requireAuth, async (req, res) => {
  try {
    const chatRequest = req.body;

    const response = await axios.post(
      `${API_SERVER_URL}/api/ai`,
      chatRequest,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // AIレスポンスは時間がかかる可能性があるため30秒
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('[WebCoach AI] Error:', error.message);

    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }

    res.status(500).json({
      error: 'Failed to process AI request',
      detail: error.message
    });
  }
});

/**
 * POST /api/webcoach/updatedb
 * WebCoach用のカスタムテーブルを一括更新
 * CSVデータをパースしてFastAPIに転送
 */
app.post('/api/webcoach/updatedb', requireAuth, async (req, res) => {
  try {
    const { data_type, records } = req.body;

    if (!data_type || !records) {
      return res.status(400).json({
        error: 'Bad Request',
        detail: 'data_type and records are required'
      });
    }

    if (!Array.isArray(records)) {
      return res.status(400).json({
        error: 'Bad Request',
        detail: 'records must be an array'
      });
    }

    console.log(`[WebCoach UpdateDB] Type: ${data_type}, Records: ${records.length}`);

    // FastAPIにリクエストを転送
    const response = await axios.post(
      `${API_SERVER_URL}/api/updatedb`,
      {
        data_type: data_type,
        records: records
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60秒タイムアウト（大量データの処理に対応）
      }
    );

    console.log(`[WebCoach UpdateDB] Success: ${response.data.recordsProcessed} processed`);

    res.json(response.data);
  } catch (error) {
    console.error('[WebCoach UpdateDB] Error:', error.message);

    if (error.response) {
      // FastAPIからのエラーレスポンス
      return res.status(error.response.status).json(error.response.data);
    }

    res.status(500).json({
      error: 'Failed to update database',
      detail: error.message
    });
  }
});

// ==================== HELPER FUNCTIONS ====================

async function callMoodleAPI(token, wsfunction, params = {}) {
  const formData = new FormData();
  formData.append('wstoken', token);
  formData.append('wsfunction', wsfunction);
  formData.append('moodlewsrestformat', 'json');

  Object.keys(params).forEach(key => {
    formData.append(key, params[key]);
  });

  try {
    const response = await axios.post(`${MOODLE_URL}/webservice/rest/server.php`, formData, {
      headers: formData.getHeaders(),
      timeout: 30000
    });

    if (response.data?.exception) {
      throw new Error(response.data.message || response.data.errorcode);
    }

    return response.data;
  } catch (error) {
    console.error('Moodle API error:', error.message);
    throw error;
  }
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: NODE_ENV === 'development' ? error.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`BFF Server running on port ${PORT}`);
    console.log(`Environment: ${NODE_ENV}`);
    console.log(`Moodle URL: ${MOODLE_URL}`);
    console.log(`API Server URL: ${API_SERVER_URL}`);
  });
}

module.exports = app;

