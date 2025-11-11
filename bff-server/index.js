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
const AI_API_URL = process.env.API_SERVER_URL || 'http://localhost:8001';
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