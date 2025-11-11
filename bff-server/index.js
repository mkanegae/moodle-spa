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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration (memory-based for simplicity)
const sessionConfig = {
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'sessionId',
  cookie: {
    httpOnly: true,
    secure: NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};

app.use(session(sessionConfig));

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
  if (!req.session || !req.session.moodleToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
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
    const { username, password, service = 'moodle_mobile_app' } = req.body;

    console.log('Login attempt:', { username, service });

    // Call Moodle login API
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    formData.append('service', service);

    const response = await axios.post(`${MOODLE_URL}/login/token.php`, formData, {
      headers: formData.getHeaders()
    });

    if (response.data.error) {
      return res.status(401).json({ error: response.data.error });
    }

    const { token } = response.data;

    // Get user info
    const userInfo = await callMoodleAPI(token, 'core_webservice_get_site_info');

    // Save to session (server-side only)
    req.session.moodleToken = token;
    req.session.userId = userInfo.userid;
    req.session.username = userInfo.username;
    req.session.fullname = userInfo.fullname;

    console.log('Login successful:', { userId: userInfo.userid, username: userInfo.username });

    // Return user info (but NOT the token)
    res.json({
      success: true,
      userId: userInfo.userid,
      username: userInfo.username,
      fullname: userInfo.fullname
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(401).json({
      error: error.response?.data?.error || 'Login failed'
    });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
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

    const response = await axios.post(`${AI_API_URL}/api/summarize`, {
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
    const response = await axios.get(`${AI_API_URL}/api/courses/${courseId}/modules`);
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
    console.log(`AI API URL: ${AI_API_URL}`);
  });
}

module.exports = app;
