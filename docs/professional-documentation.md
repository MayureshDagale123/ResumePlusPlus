# Resume++ — Professional System Documentation

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Folder Structure](#4-folder-structure)
5. [Database Design](#5-database-design)
6. [API Reference](#6-api-reference)
7. [Authentication System](#7-authentication-system)
8. [Job API Integration](#8-job-api-integration)
9. [Resume System](#9-resume-system)
10. [AI Integration](#10-ai-integration)
11. [PDF Generation](#11-pdf-generation)
12. [Security Implementation](#12-security-implementation)
13. [Environment Configuration](#13-environment-configuration)
14. [Deployment Considerations](#14-deployment-considerations)
15. [Known Limitations & Future Scope](#15-known-limitations--future-scope)

---

## 1. Project Overview

**Resume++** is a full-stack MERN web application that enables users to:
- Search real LinkedIn job listings via the Open Web Ninja API
- Save jobs and view full job details
- Create an original resume via a multi-section form or by uploading a PDF/DOCX
- Optimize the original resume for a specific job description using Google Gemini AI
- Preview and download the optimized resume as an ATS-friendly PDF

**Core Principle:** The user's original resume is immutable. Every AI optimization creates a new, separate document — the original is never modified.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser (React SPA — port 5173)                        │
│  ┌────────────────┐  ┌──────────────────────────────┐  │
│  │  AuthContext   │  │  @react-pdf/renderer (client) │  │
│  │  (JWT state)   │  │  PDF generated in browser     │  │
│  └────────────────┘  └──────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP via Vite proxy /api → :5000
┌──────────────────────▼──────────────────────────────────┐
│  Express Server (Node.js — port 5000)                   │
│  ┌───────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  /api/auth│ │/api/jobs │ │/api/     │ │/api/     │  │
│  │  /google  │ │          │ │resume    │ │optimizer │  │
│  └───────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌─────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │ Passport│  │  express-rate-   │  │    helmet     │  │
│  │ (OAuth) │  │  limit + mongo   │  │  (HTTP heads) │  │
│  │         │  │  sanitize        │  │               │  │
│  └─────────┘  └──────────────────┘  └───────────────┘  │
└──────────────────────┬──────────────────────────────────┘
           ┌───────────┼───────────────┐
           ▼           ▼               ▼
    ┌────────────┐ ┌──────────┐ ┌──────────────┐
    │ MongoDB    │ │ Gemini   │ │ Open Web     │
    │ Atlas      │ │ AI API   │ │ Ninja Jobs   │
    └────────────┘ └──────────┘ └──────────────┘
```

### Request Flow

```
User Action → React Component → Axios (with JWT header)
           → Vite Proxy → Express Route
           → Auth Middleware (verify JWT)
           → Controller → Service/Model
           → MongoDB / External API
           → JSON Response → React State → UI Update
```

---

## 3. Technology Stack

### Frontend
| Package | Version | Purpose |
|---|---|---|
| React | 18.3.1 | UI library |
| Vite | 5.4.8 | Build tool + dev server |
| React Router DOM | 6.26.2 | Client-side routing |
| Tailwind CSS | 3.4.13 | Utility-first CSS |
| Axios | 1.7.7 | HTTP client |
| @react-pdf/renderer | 4.x | Client-side PDF generation |

### Backend
| Package | Version | Purpose |
|---|---|---|
| Express | 4.21.1 | Web framework |
| Mongoose | 8.7.2 | MongoDB ODM |
| bcryptjs | 2.4.3 | Password hashing |
| jsonwebtoken | 9.0.2 | JWT signing/verification |
| passport | 0.7.0 | OAuth middleware |
| passport-google-oauth20 | 2.0.0 | Google OAuth 2.0 strategy |
| multer | 2.x | File upload handling |
| pdf-parse | 1.1.1 | PDF text extraction |
| mammoth | 1.8.0 | DOCX text extraction |
| helmet | 8.0.0 | HTTP security headers |
| express-rate-limit | 7.4.1 | Rate limiting |
| express-mongo-sanitize | 2.2.0 | NoSQL injection prevention |
| axios | 1.7.7 | External API calls (server-side) |

---

## 4. Folder Structure

```
resume-plus-plus/
├── client/                          # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   ├── Button.jsx       # Reusable button (filled/outline/ghost)
│   │   │   │   └── Card.jsx         # Dark card wrapper
│   │   │   ├── AppLoader.jsx        # Initial 1.5s loading screen
│   │   │   ├── CursorSpotlight.jsx  # Mouse-tracking violet glow
│   │   │   ├── ProtectedRoute.jsx   # Auth guard for protected pages
│   │   │   ├── ResumeTemplate.jsx   # PDF document definition
│   │   │   └── ResumeDownloadButton.jsx  # PDF download trigger
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # Global auth state (user, token, loading)
│   │   ├── layouts/
│   │   │   ├── PublicLayout.jsx     # Navbar + footer for public pages
│   │   │   └── AuthLayout.jsx       # Top bar + nav tabs for authenticated pages
│   │   ├── pages/                   # One file per route
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx / Register.jsx
│   │   │   ├── GoogleCallback.jsx   # OAuth token handler
│   │   │   ├── Dashboard.jsx
│   │   │   ├── FindJobs.jsx
│   │   │   ├── SavedJobs.jsx
│   │   │   ├── JobDetails.jsx
│   │   │   ├── CreateResume.jsx     # Multi-section form + upload
│   │   │   ├── MyResume.jsx         # Preview + download
│   │   │   ├── OptimizedResumePreview.jsx
│   │   │   └── Optimizer.jsx        # AI optimizer UI
│   │   ├── services/
│   │   │   ├── api.js               # Axios instance with JWT interceptor
│   │   │   ├── jobService.js        # Job API calls
│   │   │   ├── resumeService.js     # Resume API calls
│   │   │   └── optimizerService.js  # Optimizer API call
│   │   ├── App.jsx                  # Router + AuthProvider + AppLoader
│   │   ├── main.jsx                 # React DOM mount
│   │   └── index.css                # Tailwind + global styles
│   ├── vite.config.js               # Port 5173 + /api proxy
│   └── tailwind.config.js
│
├── server/                          # Node.js + Express backend
│   ├── config/
│   │   ├── db.js                    # Mongoose connection
│   │   └── passport.js              # Google OAuth strategy
│   ├── controllers/                 # Route handlers (thin layer)
│   │   ├── authController.js
│   │   ├── jobController.js
│   │   ├── resumeController.js
│   │   ├── resumeUploadController.js
│   │   ├── optimizerController.js
│   │   └── optimizedResumeController.js
│   ├── middleware/
│   │   ├── auth.js                  # JWT verification → req.user
│   │   └── upload.js                # Multer config (memory storage, 5MB)
│   ├── models/                      # Mongoose schemas
│   │   ├── User.js
│   │   ├── Job.js
│   │   ├── SavedJob.js
│   │   ├── Resume.js
│   │   └── OptimizedResume.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── googleAuth.js
│   │   ├── jobs.js
│   │   ├── resume.js
│   │   ├── optimizedResume.js
│   │   └── optimizer.js
│   ├── services/
│   │   ├── jobs/
│   │   │   ├── jobAdapter.js        # Raw API → Standard Job JSON
│   │   │   └── jobService.js        # Open Web Ninja API calls
│   │   ├── ai/
│   │   │   └── aiService.js         # Gemini API calls + validation
│   │   └── resume/
│   │       └── textExtractor.js     # PDF/DOCX text extraction
│   ├── utils/
│   │   └── jwt.js                   # generateToken helper
│   └── server.js                    # App entry — middleware + routes
│
├── docs/                            # Documentation
├── .env                             # Real credentials (not committed)
├── .env.example                     # Template
└── package.json                     # Monorepo scripts
```

---

## 5. Database Design

### Collections

#### `users`
```js
{
  _id:       ObjectId,
  name:      String (required, trimmed),
  email:     String (required, unique, lowercase),
  password:  String (bcrypt hash, select: false),
  googleId:  String (null for email/password users),
  createdAt: Date
}
```

#### `jobs` (cache)
```js
{
  _id:            ObjectId,
  externalId:     String,     // API's job ID
  source:         String,     // 'openwebninja'
  title:          String,
  company:        { name, logo },
  location:       { city, state, country, remote },
  employmentType: String,
  description:    String,
  applyUrl:       String,
  postedAt:       String,
  salary:         { min, max, currency },
  // Unique index: (externalId, source)
}
```

#### `savedJobs`
```js
{
  _id:     ObjectId,
  user:    ObjectId (ref: User),
  jobData: { ...full Standard Job JSON embedded },
  // Unique index: (user, jobData.externalId)
  // Embedded design: survives external API downtime
}
```

#### `resumes` (one per user)
```js
{
  _id:            ObjectId,
  user:           ObjectId (ref: User, unique),
  personalInfo:   { name, email, phone, location, linkedin, github },
  summary:        String,
  education:      [Mixed],
  skills:         [Mixed],
  experience:     [Mixed],
  projects:       [Mixed],
  certifications: [Mixed],
  achievements:   [Mixed],
  createdAt, updatedAt
}
```

#### `optimizedResumes` (many per user)
```js
{
  _id:            ObjectId,
  user:           ObjectId (ref: User),
  originalResume: ObjectId (ref: Resume),
  savedJob:       ObjectId (ref: SavedJob, nullable),
  jobTitle:       String,
  resumeData:     { ...full Standard Resume JSON },
  jobDescription: String,
  createdAt, updatedAt
}
```

### ER Diagram (text)
```
User 1 ──── 1 Resume
User 1 ──── N OptimizedResume
User 1 ──── N SavedJob
Resume 1 ──── N OptimizedResume
SavedJob N ──── 1 OptimizedResume (optional)
```

### Embedding vs Referencing Decisions

| Collection | Decision | Reason |
|---|---|---|
| `savedJobs.jobData` | **Embedded** | Jobs must display even when external API is down |
| `optimizedResumes.resumeData` | **Embedded** | Complete resume data needed for PDF generation without joins |
| `resume.user` | **Referenced** | One-to-one — efficient with unique index |
| `optimizedResumes.originalResume` | **Referenced** | Audit trail — know which original was used |

---

## 6. API Reference

### Authentication

| Method | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/api/auth/register` | No | `{name, email, password}` | `{success, token, user}` |
| POST | `/api/auth/login` | No | `{email, password}` | `{success, token, user}` |
| POST | `/api/auth/logout` | No | — | `{success, message}` |
| GET | `/api/auth/me` | JWT | — | `{success, user}` |
| GET | `/api/auth/google` | No | — | Redirect to Google |
| GET | `/api/auth/google/callback` | No | — | Redirect with `?token=` |

### Jobs

| Method | Endpoint | Auth | Query/Body | Response |
|---|---|---|---|---|
| GET | `/api/jobs` | No | `?query=&location=&page=` | `{success, count, data:[]}` |
| GET | `/api/jobs/:id` | No | — | `{success, data:{job}}` |
| POST | `/api/jobs/:id/save` | JWT | `{jobData}` | `{success, data:{savedJob}}` |
| DELETE | `/api/jobs/:id/save` | JWT | — | `{success, message}` |
| GET | `/api/jobs/saved` | JWT | — | `{success, count, data:[]}` |

### Resume

| Method | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/api/resume` | JWT | `{Standard Resume JSON}` | `{success, data:{resume}}` |
| GET | `/api/resume` | JWT | — | `{success, data:{resume}}` |
| PUT | `/api/resume` | JWT | `{Standard Resume JSON}` | `{success, data:{resume}}` |
| DELETE | `/api/resume` | JWT | — | `{success, message}` |
| POST | `/api/resume/upload` | JWT | `multipart: resume file` | `{success, data:{resume}}` |

### Optimizer & Optimized Resumes

| Method | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/api/optimizer` | JWT | `{jobDescription, jobTitle?, savedJobId?}` | `{success, data:{optimizedResume}}` |
| GET | `/api/optimized-resumes` | JWT | — | `{success, count, data:[]}` |
| GET | `/api/optimized-resumes/:id` | JWT | — | `{success, data:{optimizedResume}}` |
| DELETE | `/api/optimized-resumes/:id` | JWT | — | `{success, message}` |

### Standard Response Format
```json
// Success
{ "success": true, "data": {...} }

// Error
{ "success": false, "message": "Human-readable error" }
```

---

## 7. Authentication System

### JWT Flow
```
1. User submits credentials
2. Server validates → bcrypt.compare(password, hash)
3. Server signs JWT: jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' })
4. Token returned to client
5. Client stores in localStorage
6. Every request: Authorization: Bearer <token>
7. protect middleware: jwt.verify(token, JWT_SECRET) → req.user = { id }
8. Route handler uses req.user.id to scope data
```

### Google OAuth Flow
```
1. User clicks "Continue with Google"
2. Browser navigates to /api/auth/google
3. Passport redirects to Google consent screen
4. Google redirects to /api/auth/google/callback?code=...
5. Passport exchanges code for profile
6. Strategy: find user by email OR create new user
7. generateToken(user._id) → redirect to /auth/callback?token=<jwt>
8. Client /auth/callback page: localStorage.setItem('token') → navigate('/dashboard')
```

### Password Security
- Passwords hashed with bcrypt, `saltRounds=10`
- Pre-save hook: only re-hashes when `password` field is modified
- `select: false` on password field — never returned in queries unless explicitly requested with `.select('+password')`
- Google OAuth users have a random placeholder password — they can never "log in with password"

---

## 8. Job API Integration

### Adapter Pattern
```
Open Web Ninja API (raw) → jobAdapter.js → Standard Job JSON → Frontend
```

The adapter (`server/services/jobs/jobAdapter.js`) maps raw API fields to our internal schema. This means:
- Frontend never sees API-specific field names like `job_employment_type`
- Switching to a different job API only requires a new adapter — no frontend changes
- Standard Job JSON is documented and stable

### Job Detail Lookup Strategy
1. Check `jobs` collection (MongoDB cache)
2. Check `savedJobs` collection (embedded `jobData`)
3. Return 404 (Open Web Ninja has no single-job endpoint)

Jobs are passed via React Router state when navigating from search/saved lists — so `GET /api/jobs/:id` is only called as a fallback for direct URL access.

---

## 9. Resume System

### Three Separate Concepts
| Concept | Where stored | Mutable by AI? |
|---|---|---|
| Original Resume | `resumes` collection | Never |
| Optimized Resume | `optimizedResumes` collection | It IS the AI output |
| PDF | Generated client-side | Not stored |

### Upload Pipeline
```
1. User selects PDF or DOCX (max 5MB)
2. Multer reads file into memory (no disk write)
3. pdf-parse (PDF) or mammoth (DOCX) extracts raw text
4. Gemini AI receives raw text → returns Standard Resume JSON
5. AI output validated (all required keys present, correct types)
6. Saved as original resume (or updates existing)
```

### Standard Resume JSON Schema
```json
{
  "personalInfo": { "name", "email", "phone", "location", "linkedin", "github" },
  "summary": "string",
  "education": [{ "school", "degree", "field", "startYear", "endYear", "grade" }],
  "skills": ["string"],
  "experience": [{ "company", "title", "location", "startDate", "endDate", "current", "description" }],
  "projects": [{ "name", "description", "techStack", "link" }],
  "certifications": [{ "name", "issuer", "year" }],
  "achievements": [{ "title", "description" }]
}
```

---

## 10. AI Integration

### Model
- Provider: Google Gemini API
- Model: `gemini-3.6-flash` (configurable via `AI_MODEL` env var)
- Protocol: REST (direct axios calls to `generativelanguage.googleapis.com`)

### Optimization Rules (enforced via prompt)
**AI MAY:** Reword, improve phrasing, align keywords, reorder skills, ATS-friendly language  
**AI MUST NOT:** Invent skills, add experience, create projects, fabricate certifications

### Output Validation
After every AI response:
1. Extract JSON (strip markdown fences if present)
2. Parse JSON
3. Validate all 8 required top-level keys exist
4. Validate correct types (object, string, arrays)
5. Reject and return 422 if invalid

---

## 11. PDF Generation

PDF is generated **client-side** using `@react-pdf/renderer`. No PDF is ever stored on the server.

### Template (`ResumeTemplate.jsx`)
- A4 page, Helvetica font
- Violet section headings with bottom border
- Violet skill pills
- Deterministic: same JSON always produces the same PDF

### Download Flow
```
User clicks "Download PDF"
→ PDFDownloadLink triggers @react-pdf/renderer
→ PDF rendered in browser (Web Worker)
→ Browser triggers file download
→ Filename: {name}_{jobTitle}.pdf
```

---

## 12. Security Implementation

### Layers of Security

| Layer | Implementation | Protects Against |
|---|---|---|
| Password hashing | bcrypt (saltRounds=10) | Credential database breach |
| JWT authentication | `jsonwebtoken`, 7-day expiry | Unauthorized access |
| HTTP security headers | `helmet` | XSS, clickjacking, MIME sniffing |
| Rate limiting — auth | 20 req/15min | Brute force attacks |
| Rate limiting — AI | 30 req/hour | API cost abuse |
| Rate limiting — general | 200 req/15min | DDoS, scraping |
| NoSQL sanitization | `express-mongo-sanitize` | MongoDB injection |
| Body size limit | `1mb` | Large payload attacks |
| File validation | MIME type + size check | Malicious file uploads |
| CORS restriction | Whitelist `CLIENT_URL` only | Cross-origin attacks |
| Secret management | `.env` + `.gitignore` | Key exposure |

### What's Never Exposed to Browser
- `JWT_SECRET`
- `AI_API_KEY` (Gemini)
- `JOB_API_KEY` (Open Web Ninja)
- `GOOGLE_CLIENT_SECRET`
- `MONGODB_URI`

---

## 13. Environment Configuration

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `PORT` | No | 5000 | Express server port |
| `MONGODB_URI` | **Yes** | — | MongoDB Atlas connection string |
| `JWT_SECRET` | **Yes** | — | JWT signing key (min 32 chars recommended) |
| `CLIENT_URL` | No | http://localhost:5173 | CORS + OAuth redirect base URL |
| `AI_API_KEY` | Yes (for AI) | — | Google Gemini API key |
| `AI_MODEL` | No | gemini-3.6-flash | Gemini model name |
| `JOB_API_KEY` | Yes (for jobs) | — | Open Web Ninja API key |
| `JOB_API_BASE_URL` | No | https://api.openwebninja.com | Job API base URL |
| `GOOGLE_CLIENT_ID` | Yes (for OAuth) | — | Google OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | Yes (for OAuth) | — | Google OAuth 2.0 client secret |
| `GOOGLE_CALLBACK_URL` | No | http://localhost:5000/api/auth/google/callback | OAuth redirect URI |

---

## 14. Deployment Considerations

### Production Changes Required
1. Set `NODE_ENV=production`
2. Replace `CLIENT_URL` with actual domain
3. Update `GOOGLE_CALLBACK_URL` to production URL
4. Add production domain to Google OAuth authorized origins
5. Use HTTPS (required by Google OAuth)
6. Serve React build via Express static or CDN
7. Use a process manager (PM2) for the Node server
8. Set `JWT_SECRET` to a cryptographically random 64-character string

### Frontend Build
```bash
cd client && npm run build
# Outputs to client/dist/
# Serve with Express: app.use(express.static(path.join(__dirname, '../client/dist')))
```

---

## 15. Known Limitations & Future Scope

### Current Limitations
- JWT stored in `localStorage` (XSS-vulnerable; should migrate to HttpOnly cookies)
- Open Web Ninja has no single-job endpoint (job details require router state)
- PDF generation is client-side only (large resumes may be slow on low-end devices)
- No email verification on registration
- No password reset flow

### Future Scope (not in current MVP)
- **Phase 15+:** Cover letter generation
- **Phase 15+:** Multiple job API sources
- **Phase 15+:** Browser extension for one-click job application
- **Phase 15+:** Admin panel and analytics
- **Phase 15+:** Resume version history
- **Phase 15+:** Collaborative resume editing
- **Phase 15+:** HttpOnly cookie authentication
- **Phase 15+:** Email verification + password reset
