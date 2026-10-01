require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// ── Validate required environment variables ───────────────────────
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const express           = require('express');
const cors              = require('cors');
const helmet            = require('helmet');
const rateLimit         = require('express-rate-limit');
const mongoSanitize     = require('express-mongo-sanitize');
const passport          = require('./config/passport');
const connectDB         = require('./config/db');

const app = express();

// ── Security: HTTP headers ────────────────────────────────────────
// Helmet sets secure HTTP headers (XSS protection, no sniff, etc.)
app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled — frontend handles it

// ── Security: CORS ────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Security: Request body parsing with size limits ───────────────
app.use(express.json({ limit: '1mb' }));           // Prevent huge JSON payloads
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Security: MongoDB injection sanitization ──────────────────────
// Strips $ and . from req.body, req.params, req.query to prevent NoSQL injection
app.use(mongoSanitize());

// ── Security: Rate limiting ───────────────────────────────────────
// Auth routes: stricter limit to prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      20,              // 20 requests per window per IP
  message:  { success: false, message: 'Too many requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders:   false,
})

// AI optimizer: generous limit (AI calls are slow anyway)
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max:      30,              // 30 optimization requests per hour per IP
  message:  { success: false, message: 'Optimization limit reached. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders:   false,
})

// General API: loose limit to prevent abuse
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      200,
  message:  { success: false, message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders:   false,
})

// ── Passport (Google OAuth) ───────────────────────────────────────
app.use(passport.initialize());

// ── Routes ────────────────────────────────────────────────────────
const authRouter            = require('./routes/auth');
const googleAuthRouter      = require('./routes/googleAuth');
const jobsRouter            = require('./routes/jobs');
const resumeRouter          = require('./routes/resume');
const optimizedResumeRouter = require('./routes/optimizedResume');
const optimizerRouter       = require('./routes/optimizer');

app.use('/api/auth',              authLimiter, authRouter);
app.use('/api/auth',              authLimiter, googleAuthRouter);
app.use('/api/jobs',              generalLimiter, jobsRouter);
app.use('/api/resume',            generalLimiter, resumeRouter);
app.use('/api/optimized-resumes', generalLimiter, optimizedResumeRouter);
app.use('/api/optimizer',         aiLimiter, optimizerRouter);

// ── Health check ─────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ── Global error handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'File too large. Maximum size is 5 MB.' })
  }
  // Multer file type error (from fileFilter)
  if (err.message?.includes('Only PDF')) {
    return res.status(400).json({ success: false, message: err.message })
  }
  console.error('Unhandled error:', err.message)
  res.status(500).json({ success: false, message: 'Internal server error' })
})

// ── Start server ──────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
});
