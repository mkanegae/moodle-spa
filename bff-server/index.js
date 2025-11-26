require('dotenv').config();

const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
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
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
console.log('CORS allowed origins:', allowedOrigins);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('CORS: Allowed origin:', origin);
      callback(null, true);
    } else {
      console.log('CORS: Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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
    secure: true, // HTTPS required
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
  console.log('requireAuth check:', {
    path: req.path,
    method: req.method,
    hasSession: !!req.session,
    sessionId: req.session?.id,
    hasMoodleToken: !!req.session?.moodleToken,
    userId: req.session?.userId,
    username: req.session?.username,
    cookies: req.headers.cookie,
    origin: req.headers.origin
  });

  if (!req.session || !req.session.moodleToken) {
    console.log('AUTH FAILED - No session or token', {
      hasSession: !!req.session,
      sessionKeys: req.session ? Object.keys(req.session) : [],
      moodleToken: req.session?.moodleToken ? 'exists' : 'missing'
    });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('AUTH SUCCESS - User authenticated:', {
    userId: req.session.userId,
    username: req.session.username
  });

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

    console.log('Login successful:', {
      userId: userInfo.userid,
      username: userInfo.username,
      sessionId: req.session.id,
      sessionSaved: !!req.session.moodleToken
    });

    console.log('Session cookie will be set:', {
      cookieName: 'sessionId',
      secure: sessionConfig.cookie.secure,
      sameSite: sessionConfig.cookie.sameSite,
      httpOnly: sessionConfig.cookie.httpOnly
    });

    // Explicitly save session before sending response
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Failed to save session' });
      }

      console.log('Session saved successfully');

      // Return user info (but NOT the token)
      res.json({
        success: true,
        userId: userInfo.userid,
        username: userInfo.username,
        fullname: userInfo.fullname
      });
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

// Create categories
app.post('/api/moodle/categories', requireAuth, async (req, res) => {
  try {
    const categoriesData = Array.isArray(req.body) ? req.body : [req.body];

    const params = {};
    categoriesData.forEach((categoryData, index) => {
      params[`categories[${index}][name]`] = categoryData.name;
      params[`categories[${index}][parent]`] = categoryData.parent || 0;

      if (categoryData.idnumber) {
        params[`categories[${index}][idnumber]`] = categoryData.idnumber;
      }
      if (categoryData.description) {
        params[`categories[${index}][description]`] = categoryData.description;
      }
      if (categoryData.visible !== undefined) {
        params[`categories[${index}][visible]`] = categoryData.visible;
      }
    });

    const result = await callMoodleAPI(
      req.session.moodleToken,
      'core_course_create_categories',
      params
    );

    res.json(Array.isArray(result) ? result : [result]);
  } catch (error) {
    console.error('Category creation error:', error);
    res.status(500).json({
      error: error.message,
      details: error.response?.data || error
    });
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
  // SSL certificate paths
  const sslKeyPath = path.join(__dirname, '../ssl/key.pem');
  const sslCertPath = path.join(__dirname, '../ssl/cert.pem');

  // Check if SSL certificates exist
  if (fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
    const httpsOptions = {
      key: fs.readFileSync(sslKeyPath),
      cert: fs.readFileSync(sslCertPath)
    };

    https.createServer(httpsOptions, app).listen(PORT, () => {
      console.log(`BFF Server running on HTTPS port ${PORT}`);
      console.log(`Environment: ${NODE_ENV}`);
      console.log(`Moodle URL: ${MOODLE_URL}`);
      console.log(`API Server URL: ${API_SERVER_URL}`);
    });
  } else {
    console.warn('SSL certificates not found, falling back to HTTP');
    app.listen(PORT, () => {
      console.log(`BFF Server running on HTTP port ${PORT}`);
      console.log(`Environment: ${NODE_ENV}`);
      console.log(`Moodle URL: ${MOODLE_URL}`);
      console.log(`API Server URL: ${API_SERVER_URL}`);
    });
  }
}

module.exports = app;
