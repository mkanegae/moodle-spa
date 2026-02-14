
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const app = express();
const PORT = process.env.PORT || 3001;

// Load Swagger documentation
const swaggerDocument = YAML.load('./swagger.yaml');

// Environment variables
const MOODLE_URL = process.env.MOODLE_URL || 'http://localhost';
const API_SERVER_URL = process.env.API_SERVER_URL || 'http://localhost:8001';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-production';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Moodle Service Account credentials
const MOODLE_SERVICE_USERNAME = process.env.MOODLE_SERVICE_USERNAME;
const MOODLE_SERVICE_PASSWORD = process.env.MOODLE_SERVICE_PASSWORD;
const MOODLE_SERVICE_NAME = process.env.MOODLE_SERVICE_NAME || 'moodle_mobile_app';

// Global service account token (used for all Moodle API calls)
let serviceAccountToken = null;

// Environment validation
function validateEnvironment() {
  console.log('=== Environment Validation ===');

  const required = [
    'MOODLE_URL',
    'API_SERVER_URL',
    'MOODLE_SERVICE_USERNAME',
    'MOODLE_SERVICE_PASSWORD',
    'SESSION_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // SESSION_SECRETがデフォルト値でないかチェック
  if (NODE_ENV === 'production' && process.env.SESSION_SECRET === 'change-me-in-production') {
    console.error('❌ SESSION_SECRET must be changed in production');
    throw new Error('SESSION_SECRET must be changed in production environment');
  }

  console.log('✅ All required environment variables are set');
  console.log('   MOODLE_URL:', MOODLE_URL);
  console.log('   API_SERVER_URL:', API_SERVER_URL);
  console.log('   MOODLE_SERVICE_USERNAME:', MOODLE_SERVICE_USERNAME);
  console.log('   MOODLE_SERVICE_NAME:', MOODLE_SERVICE_NAME);
  console.log('   NODE_ENV:', NODE_ENV);
}

// Validate environment on startup
validateEnvironment();

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
// Trust all proxies (nginx, CloudFront, etc.)
app.set('trust proxy', true);

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
    secure: 'auto', // Automatically detect HTTPS based on trust proxy
    sameSite: NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-origin in HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  proxy: true // Required when trust proxy is enabled
};

app.use(session(sessionConfig));

// Session event logging
app.use((req, res, next) => {
  // リクエスト受信時のCookie情報
  console.log('=== Cookie & Session Details ===');
  console.log('Protocol:', req.protocol);
  console.log('Secure:', req.secure);
  console.log('X-Forwarded-Proto:', req.headers['x-forwarded-proto'] || 'Not set');
  console.log('X-Forwarded-Host:', req.headers['x-forwarded-host'] || 'Not set');
  console.log('Origin:', req.headers.origin || 'Not set');
  console.log('Cookie Header:', req.headers.cookie || 'No Cookie');
  console.log('Session ID:', req.sessionID || 'No Session ID');
  console.log('Session exists:', !!req.session);

  if (req.session) {
    console.log('Session data:', {
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

// Security audit logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  // リクエスト開始時の情報
  const auditLog = {
    timestamp: new Date().toISOString(),
    requestId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.session?.userId || null,
    username: req.session?.username || null,
    params: req.params,
    query: req.query
  };

  // レスポンス完了時の情報
  res.on('finish', () => {
    const duration = Date.now() - start;
    auditLog.status = res.statusCode;
    auditLog.duration = `${duration}ms`;

    // APIリクエストのみログ出力（静的ファイルは除外）
    if (req.path.startsWith('/api/')) {
      console.log('[AUDIT]', JSON.stringify(auditLog));

      // エラーレスポンスや認可失敗は警告レベルで出力
      if (res.statusCode >= 400) {
        console.warn('[AUDIT-ALERT]', JSON.stringify({
          ...auditLog,
          level: res.statusCode === 401 ? 'AUTHENTICATION_FAILED' :
                 res.statusCode === 403 ? 'AUTHORIZATION_FAILED' :
                 res.statusCode >= 500 ? 'SERVER_ERROR' : 'CLIENT_ERROR'
        }));
      }
    }
  });

  next();
});

// Authentication middleware
const requireAuth = (req, res, next) => {
  console.log('=== Authentication Check ===');
  console.log('Path:', req.path);
  console.log('Has session:', !!req.session);
  console.log('Has userId:', !!req.session?.userId);

  if (!req.session || !req.session.userId) {
    console.log('Authentication FAILED - Returning 401');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('Authentication SUCCESS');
  next();
};

// Authorization middleware - リソースオーナーシップの確認
const requireOwnership = (req, res, next) => {
  const requestedUserId = req.params.userid || req.body.userid || req.query.userid;
  const sessionUserId = req.session.userId;

  console.log('=== Authorization Check ===');
  console.log('Requested userId:', requestedUserId);
  console.log('Session userId:', sessionUserId);

  // useridパラメータがある場合、セッションのuserIdと一致するかチェック
  if (requestedUserId) {
    const requestedUserIdInt = parseInt(requestedUserId);

    if (requestedUserIdInt !== sessionUserId) {
      console.warn(`[SECURITY ALERT] Authorization FAILED - User ${sessionUserId} (${req.session.username}) attempted to access user ${requestedUserIdInt}'s data`);
      console.warn(`[SECURITY ALERT] Path: ${req.method} ${req.path}`);
      console.warn(`[SECURITY ALERT] IP: ${req.ip}`);

      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only access your own data'
      });
    }
  }

  console.log('Authorization SUCCESS');
  next();
};

/**
 * Calculate course progress from activity completion status
 * @param {number} courseid - Course ID
 * @param {number} userid - User ID
 * @returns {Promise<number>} Progress percentage (0-100)
 */
async function calculateCourseProgress(courseid, userid) {
  try {
    // Get activity completion status for this course
    const completionStatus = await callMoodleAPI(
      'core_completion_get_activities_completion_status',
      {
        courseid: courseid,
        userid: userid
      }
    );

    // Calculate progress from activities
    let progress = 0;
    if (completionStatus && completionStatus.statuses && Array.isArray(completionStatus.statuses)) {
      const statuses = completionStatus.statuses;
      const totalActivities = statuses.length;

      if (totalActivities > 0) {
        const completedActivities = statuses.filter(
          activity => activity.state === 1 || activity.state === 2 // 1=completed, 2=completed with pass
        ).length;
        progress = Math.round((completedActivities / totalActivities) * 100);
      }
    }

    return progress;
  } catch (error) {
    console.error(`Error calculating progress for course ${courseid}:`, error.message);
    return 0;
  }
}

// File upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

// ==================== ROUTES ====================

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Moodle BFF API Documentation'
}));

// Health check - 詳細版
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Moodle BFF',
    environment: NODE_ENV,
    checks: {
      serviceAccountToken: !!serviceAccountToken,
      moodle: { status: 'unknown' },
      apiServer: { status: 'unknown' }
    }
  };

  // Moodle接続確認
  try {
    await callMoodleAPI('core_webservice_get_site_info');
    health.checks.moodle = { status: 'ok' };
  } catch (error) {
    health.status = 'degraded';
    health.checks.moodle = {
      status: 'error',
      message: error.message
    };
  }

  // API Server接続確認
  try {
    await axios.get(`${API_SERVER_URL}/health`, { timeout: 3000 });
    health.checks.apiServer = { status: 'ok' };
  } catch (error) {
    health.checks.apiServer = {
      status: 'error',
      message: error.message
    };
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// シンプル版ヘルスチェック（ロードバランサー用）
app.get('/api/health', (req, res) => {
  const isHealthy = !!serviceAccountToken;
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'error',
    timestamp: new Date().toISOString()
  });
});

// ==================== AUTH ROUTES ====================

// Login - ユーザー認証のみを行う（Moodle APIアクセスはサービスアカウントを使用）
app.post('/api/login', async (req, res) => {
  try {
    console.log('=== Raw Request Debug ===');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Raw Body:', JSON.stringify(req.body));
    console.log('Body type:', typeof req.body);

    const { username, password, service = 'moodle_mobile_app' } = req.body;

    console.log('Login attempt:', { username, service, passwordLength: password?.length });

    // ユーザー認証のため、一時的にユーザーのトークンを取得
    // Use URLSearchParams for application/x-www-form-urlencoded
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    params.append('service', service);

    console.log('Sending request to:', `${MOODLE_URL}/login/token.php`);
    console.log('Login params:', { username, password: password?.substring(0, 3) + '***', service });

    const response = await axios.post(`${MOODLE_URL}/login/token.php`, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('Moodle response status:', response.status);
    console.log('Moodle response data:', JSON.stringify(response.data));

    if (response.data.error) {
      console.log('Moodle login error:', response.data.error);
      return res.status(401).json({ error: response.data.error });
    }

    // 認証成功 - サービスアカウントトークンを使用してユーザー情報を取得
    let userInfo;

    try {
      if (!serviceAccountToken) {
        console.error('Service account token not available');
        return res.status(500).json({ error: 'Service configuration error' });
      }

      // サービスアカウントトークンでユーザー情報を取得
      const result = await callMoodleAPI('core_user_get_users_by_field', {
        field: 'username',
        'values[0]': username
      });

      console.log('[DEBUG] User lookup result:', JSON.stringify(result, null, 2));

      if (!result || result.length === 0) {
        console.error('User not found:', username);
        return res.status(401).json({ error: 'User not found' });
      }

      const userData = result[0];
      userInfo = {
        id: userData.id,
        username: userData.username,
        fullname: userData.fullname,
        email: userData.email
      };

      console.log('[DEBUG] userInfo:', JSON.stringify(userInfo, null, 2));
      console.log('User info retrieved:', { userid: userInfo.id, username: userInfo.username });
    } catch (error) {
      console.error('Failed to get user info:', error.message);
      return res.status(500).json({ error: 'Failed to retrieve user information' });
    }

    // セッションにユーザー情報のみを保存（トークンは保存しない）
    req.session.username = username;
    req.session.userId = userInfo.id;

    console.log('=== Session Created on Login ===');
    console.log('Login successful:', { username, userId: userInfo.id });
    console.log('Session ID:', req.sessionID);
    console.log('Saving session explicitly...');

    // Explicitly save session before responding
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Failed to save session' });
      }

      console.log('Session saved successfully');

      // Return user info
      res.json({
        success: true,
        username: username,
        userId: userInfo.id,
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
    const userInfo = await callMoodleAPI('core_webservice_get_site_info');
    res.json(userInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Alias for backward compatibility (without /api prefix)
app.get('/user/info', requireAuth, async (req, res) => {
  try {
    const userInfo = await callMoodleAPI('core_webservice_get_site_info');
    res.json(userInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== MOODLE API ROUTES ====================

// Get all courses
app.get('/api/moodle/courses', requireAuth, async (req, res) => {
  try {
    const courses = await callMoodleAPI('core_course_get_courses');
    res.json(Array.isArray(courses) ? courses : []);
  } catch (error) {
    console.error('Get all courses error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get enrolled courses by user ID (with progress)
app.get('/api/moodle/courses/:userid', requireAuth, requireOwnership, async (req, res) => {
  try {
    const { userid } = req.params;
    const userIdInt = parseInt(userid, 10);

    // Get enrolled courses
    const courses = await callMoodleAPI(
      'core_enrol_get_users_courses',
      {
        userid: userIdInt
      }
    );

    if (!Array.isArray(courses) || courses.length === 0) {
      return res.json([]);
    }

    // Calculate progress for each course using shared function
    const coursesWithProgress = await Promise.all(
      courses.map(async (course) => {
        const progress = await calculateCourseProgress(course.id, userIdInt);
        return {
          ...course,
          progress
        };
      })
    );

    res.json(coursesWithProgress);
  } catch (error) {
    console.error('Get enrolled courses error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Search courses
app.get('/api/moodle/courses/search', requireAuth, async (req, res) => {
  try {
    const { q } = req.query;
    const result = await callMoodleAPI(
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
    const categories = await callMoodleAPI('core_course_get_categories');
    res.json(Array.isArray(categories) ? categories : categories.categories || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get course contents
app.get('/api/moodle/courses/:courseid/contents', requireAuth, async (req, res) => {
  try {
    const { courseid } = req.params;
    const contents = await callMoodleAPI('core_course_get_contents', { courseid });
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

    const result = await callMoodleAPI('core_course_create_activities', params);
    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload file
app.post('/api/moodle/files/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!serviceAccountToken) {
      return res.status(500).json({ error: 'Service account token not available' });
    }

    const file = req.file;
    const { courseid } = req.body;

    const formData = new FormData();
    formData.append('wstoken', serviceAccountToken);
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
    const result = await callMoodleAPI(wsfunction, params);
    res.json(result);
  } catch (error) {
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
    const result = await callMoodleAPI('core_badges_get_badges', {});
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
app.get('/api/moodle/user-badges/:userid', requireAuth, requireOwnership, async (req, res) => {
  try {
    const { userid } = req.params;

    const result = await callMoodleAPI(
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
app.get('/api/webcoach/profile/:userid', requireAuth, requireOwnership, async (req, res) => {
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
 * POST /api/webcoach/profile/:userid
 * プロフィール情報を更新
 */
app.post('/api/webcoach/profile/:userid', requireAuth, requireOwnership, async (req, res) => {
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
 * POST /api/webcoach/updateprofile/:userid
 * プロフィール情報を更新
 */
app.post('/api/webcoach/updateprofile/:userid', requireAuth, requireOwnership, async (req, res) => {
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
 * GET /api/webcoach/resumecourse/:userid
 * コース再開情報を取得（進捗率付き）
 */
app.get('/api/webcoach/resumecourse/:userid', requireAuth, requireOwnership, async (req, res) => {
  try {
    const { userid } = req.params;
    const { limit } = req.query;
    const userIdInt = parseInt(userid, 10);

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

    const resumeCourses = response.data;

    // Add progress calculation for each course
    if (Array.isArray(resumeCourses) && resumeCourses.length > 0) {
      const coursesWithProgress = await Promise.all(
        resumeCourses.map(async (course) => {
          const progress = await calculateCourseProgress(course.courseid, userIdInt);
          return {
            ...course,
            progress
          };
        })
      );

      return res.json(coursesWithProgress);
    }

    res.json(resumeCourses);
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
 * POST /api/webcoach/resumecourse/:userid
 * コース再開情報を更新
 */
app.post('/api/webcoach/resumecourse/:userid', requireAuth, requireOwnership, async (req, res) => {
  try {
    const { userid } = req.params;
    const resumeCourseData = req.body;

    const response = await axios.post(
      `${API_SERVER_URL}/api/resumecourse/${userid}`,
      resumeCourseData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('[WebCoach UpdateResumeCourse] Error:', error.message);

    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }

    res.status(500).json({
      error: 'Failed to update resume course',
      detail: error.message
    });
  }
});

/**
 * GET /api/webcoach/recomendbadge/:userid
 * おすすめバッジを取得
 */
app.get('/api/webcoach/recomendbadge/:userid', requireAuth, requireOwnership, async (req, res) => {
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

/**
 * GET /api/moodle/course-image
 * コース画像プロキシ
 * Moodleの画像URLを受け取り、画像をフェッチしてブラウザに返す
 */
app.get('/api/moodle/course-image', async (req, res) => {
  try {
    // 複数のパラメータ名をサポート: imageUrl, url, path
    const imageUrl = req.query.imageUrl || req.query.url || req.query.path;

    if (!imageUrl) {
      return res.status(400).json({
        error: 'Bad Request',
        detail: 'imageUrl, url, or path query parameter is required'
      });
    }

    console.log(`[Course Image Proxy] Fetching image: ${imageUrl}`);

    // URLが相対パスの場合は絶対URLに変換
    let fullUrl = imageUrl;
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      fullUrl = `${MOODLE_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
    }

    // トークンをクエリパラメータに追加
    const urlObj = new URL(fullUrl);
    if (serviceAccountToken) {
      urlObj.searchParams.append('token', serviceAccountToken);
    }

    // Moodleサーバーから画像を取得
    const response = await axios.get(urlObj.toString(), {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Moodle-BFF/1.0'
      }
    });

    // Content-Typeをレスポンスから取得（デフォルトはimage/png）
    const contentType = response.headers['content-type'] || 'image/png';

    // 画像データをBase64エンコードして返す（フロントで表示しやすい形式）
    const base64Image = Buffer.from(response.data, 'binary').toString('base64');
    const dataUrl = `data:${contentType};base64,${base64Image}`;

    res.json({
      success: true,
      imageUrl: dataUrl,
      contentType: contentType,
      size: response.data.length
    });

    console.log(`[Course Image Proxy] Success: ${contentType}, ${response.data.length} bytes`);
  } catch (error) {
    console.error('[Course Image Proxy] Error:', error.message);

    if (error.response) {
      return res.status(error.response.status).json({
        error: 'Failed to fetch image from Moodle',
        detail: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to fetch course image',
      detail: error.message
    });
  }
});

// ==================== HELPER FUNCTIONS ====================

/**
 * サービスアカウントのトークンを取得
 * サーバー起動時および定期的にトークンをリフレッシュ
 */
async function getServiceAccountToken() {
  if (!MOODLE_SERVICE_USERNAME || !MOODLE_SERVICE_PASSWORD) {
    console.error('Service account credentials not configured');
    throw new Error('Service account credentials not configured. Set MOODLE_SERVICE_USERNAME and MOODLE_SERVICE_PASSWORD');
  }

  try {
    console.log(`Authenticating service account: ${MOODLE_SERVICE_USERNAME}`);

    const params = new URLSearchParams();
    params.append('username', MOODLE_SERVICE_USERNAME);
    params.append('password', MOODLE_SERVICE_PASSWORD);
    params.append('service', MOODLE_SERVICE_NAME);

    const response = await axios.post(`${MOODLE_URL}/login/token.php`, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (response.data.error) {
      throw new Error(response.data.error);
    }

    serviceAccountToken = response.data.token;
    console.log('Service account token obtained successfully');

    return serviceAccountToken;
  } catch (error) {
    console.error('Failed to get service account token:', error.message);
    throw error;
  }
}

/**
 * トークンをリフレッシュ（12時間ごと）
 */
function startTokenRefresh() {
  const REFRESH_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours

  setInterval(async () => {
    try {
      console.log('Refreshing service account token...');
      await getServiceAccountToken();
      console.log('Service account token refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh service account token:', error.message);
    }
  }, REFRESH_INTERVAL);
}

async function callMoodleAPI(wsfunction, params = {}) {
  if (!serviceAccountToken) {
    throw new Error('Service account token not available. Server may still be initializing.');
  }

  console.log(`[DEBUG] callMoodleAPI: ${wsfunction}`, params);

  const formData = new FormData();
  formData.append('wstoken', serviceAccountToken);
  formData.append('wsfunction', wsfunction);
  formData.append('moodlewsrestformat', 'json');

  Object.keys(params).forEach(key => {
    console.log(`[DEBUG] Appending param: ${key} = ${params[key]} (type: ${typeof params[key]})`);
    formData.append(key, params[key]);
  });

  try {
    const response = await axios.post(`${MOODLE_URL}/webservice/rest/server.php`, formData, {
      headers: formData.getHeaders(),
      timeout: 30000
    });

    if (response.data?.exception) {
      console.error(`API Call Failed: ${wsfunction}`, JSON.stringify(response.data, null, 2));
      throw new Error(response.data.message || response.data.errorcode);
    }

    return response.data;
  } catch (error) {
    console.error(`Moodle API error (${wsfunction}):`, error.message);
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
  // サーバー起動時にサービスアカウントでログイン
  getServiceAccountToken()
    .then(() => {
      // トークンリフレッシュを開始
      startTokenRefresh();

      app.listen(PORT, () => {
        console.log(`BFF Server running on port ${PORT}`);
        console.log(`Environment: ${NODE_ENV}`);
        console.log(`Moodle URL: ${MOODLE_URL}`);
        console.log(`API Server URL: ${API_SERVER_URL}`);
        console.log(`Service Account: ${MOODLE_SERVICE_USERNAME}`);
        console.log(`Authentication mode: Service Account`);
      });
    })
    .catch((error) => {
      console.error('Failed to initialize service account:', error.message);
      console.error('Server will not start without service account credentials.');
      process.exit(1);
    });
}

module.exports = app;