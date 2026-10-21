# Member 1: Core Platform, Authentication, Security & Real-Time Job Scraping Engine

> **Interview Guide & Technical Architecture Portfolio**  
> **Role:** Backend Platform Engineer  
> **Responsibilities:** Server Architecture, Auth & Security, Database Modeling, Multi-Platform Job Scraping & Aggregation Engine.

---

## 1. Executive Summary & 30-Second Interview Pitch

### 30-Second Elevator Pitch
> *"In Resume++, I built the foundational backend platform, security infrastructure, and real-time job scraping engine. I designed a hybrid authentication system supporting both standard email/password with Bcrypt and Google OAuth 2.0 via Passport with stateless JWTs. On the data side, I engineered an inter-process scraping engine integrating Python's JobSpy with Node.js, streaming live listings from LinkedIn, Indeed, and Glassdoor, normalizing them into a unified schema, and caching them in MongoDB with automated fallback mechanisms. To ensure enterprise-grade security, I implemented tiered rate limiting, NoSQL injection sanitization, Helmet HTTP protection, and strict CORS controls."*

---

## 2. Technical Stack & Dependencies

| Category | Technology / Package | Purpose in Project |
|---|---|---|
| **Runtime & Framework** | Node.js (v18+) & Express.js | High-performance RESTful API server |
| **Database & ODM** | MongoDB & Mongoose (v8+) | NoSQL document storage, schemas, validation & indexes |
| **Authentication** | `jsonwebtoken` (JWT) | Stateless token authorization (7-day validity) |
| **OAuth 2.0** | `passport`, `passport-google-oauth20` | Third-party Google sign-in handshake |
| **Password Security** | `bcryptjs` | Salted password hashing (10 salt rounds) |
| **Security & Hardening**| `helmet`, `express-mongo-sanitize`, `express-rate-limit`, `cors` | HTTP headers, NoSQL injection defense, IP brute-force protection, CORS |
| **Inter-Process / Scraper**| `child_process` (`spawn`), `python-jobspy`, `pandas` | Asynchronous Python process execution & multi-platform web scraping |
| **Data Parsing** | `csv-parse/sync`, `crypto` | CSV stream parsing into JSON & MD5 fallback ID generation |

---

## 3. High-Level Architecture & Data Flows

### A. Authentication & Authorization Flow
```
[Client (React)] 
      │
      ├─► POST /api/auth/register ──► Hash with Bcrypt (10 rounds) ──► Save User in Mongo ──► Issue JWT
      │
      ├─► POST /api/auth/login ─────► Fetch User (+password) ──► Bcrypt.compare() ──► Issue JWT
      │
      ├─► GET /api/auth/google ─────► Passport redirect ──► Google Consent Screen
      │                                                              │
      │   (Google Callback /api/auth/google/callback) ◄──────────────┘
      │        │
      │        └─► Find or Create User ──► Issue JWT ──► Redirect: /auth/callback?token=JWT
      │
      └─► Protected Request ────────► Header: "Authorization: Bearer <token>"
                                             │
                                             ▼
                                  [protect Middleware]
                                             │
                                  jwt.verify(token, SECRET)
                                             │
                                     req.user = { id }
                                             │
                                             ▼
                                     [Controller Logic]
```

### B. Multi-Platform Job Scraping & Caching Pipeline
```
[Client: GET /api/jobs?query=react&location=NYC&isRemote=true]
                             │
                             ▼
               [jobController.searchJobsHandler]
                             │
                             ▼
                 [jobService.searchJobs]
                             │
                             ▼
         [child_process.spawn('python', args)]
                             │
                             ▼
                  [jobspy_scraper.py]
      (Scrapes LinkedIn, Indeed, Glassdoor via JobSpy concurrently)
                             │
                             ▼
              Writes results to temporary CSV file
                             │
                             ▼
           Node.js parses CSV using `csv-parse/sync`
                             │
                             ▼
           Converts each row to Standard Job JSON
                             │
           ┌─────────────────┴──────────────────┐
           │                                    │
           ▼                                    ▼
 Asynchronous Mongo Upsert              Return JSON to Client
  (Job.updateOne with upsert)             (Response 200 OK)
           │
           ▼
  Unlink temp CSV file (finally)
```

---

## 4. Deep Dive into Files Owned

### 1. `server/server.js` (Server Foundation & Security Perimeter)
* **What it does:** Boots the HTTP server, connects to MongoDB, mounts routes, and enforces multi-layered defense.
* **Key Implementations:**
  - **Environment Pre-flight Check:** Validates mandatory variables (`MONGODB_URI`, `JWT_SECRET`) on startup; exits immediately (`process.exit(1)`) if missing.
  - **HTTP Header Security (`helmet`):** Secures headers against XSS, MIME-sniffing, clickjacking.
  - **CORS Protection:** Configured with specific `origin` whitelist (`CLIENT_URL`), `credentials: true`, and strict HTTP verb allowance (`GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`).
  - **Payload Size Limits:** `express.json({ limit: '1mb' })` and `express.urlencoded({ limit: '1mb' })` protect memory against large payload flood attacks.
  - **NoSQL Injection Sanitization (`mongoSanitize`):** Strips malicious `$` and `.` operators from incoming request bodies, queries, and params.
  - **Tiered Rate Limiting:**
    - `authLimiter`: 20 requests per 15 minutes per IP (guards against brute-force login/register attacks).
    - `aiLimiter`: 30 requests per hour per IP (protects Gemini AI quotas).
    - `generalLimiter`: 200 requests per 15 minutes per IP (governs search and listing traffic).

### 2. `server/config/db.js` (Database Connection)
* **What it does:** Manages the Mongoose connection lifecycle to MongoDB Atlas / local MongoDB.
* **Key Implementation:**
  ```javascript
  const connectDB = async () => {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI);
      console.log(`MongoDB connected: ${conn.connection.host}`);
    } catch (error) {
      console.error(`MongoDB connection error: ${error.message}`);
      process.exit(1);
    }
  };
  ```
* **Interview Point:** Explain why `process.exit(1)` is used: without a database connection, a data-driven service cannot function; failing fast prevents unpredictable runtime states.

### 3. `server/config/passport.js` (Google OAuth 2.0 Strategy)
* **What it does:** Manages the Google OAuth 2.0 handshake via `passport-google-oauth20`.
* **Key Implementations:**
  - Extracts the verified email from `profile.emails[0].value`.
  - Searches for an existing user by email:
    - If user exists: logs them in directly.
    - If new user: creates an account with `displayName`, `googleId: profile.id`, and a random hashed password placeholder (since Google users authenticate via OAuth tokens, not passwords).
  - Configures `passport.serializeUser` and `deserializeUser`.

### 4. `server/middleware/auth.js` (JWT Authentication Guard)
* **What it does:** Protects private endpoints by intercepting requests, validating the Bearer token, and decoding the user ID.
* **Key Implementation:**
  ```javascript
  const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: decoded.id };
      next();
    } catch {
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  };
  ```

### 5. `server/models/User.js` (User Identity Model)
* **What it does:** Defines user schema with secure password hashing and verification methods.
* **Key Implementations:**
  - **`password` field protection:** Marked with `select: false` so user queries (`User.find()`) never return password hashes by default.
  - **Pre-save Mongoose Hook:** Automatically hashes plain passwords using `bcrypt.genSalt(10)` only when the password field is modified:
    ```javascript
    UserSchema.pre('save', async function (next) {
      if (!this.isModified('password')) return next();
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      next();
    });
    ```
  - **Custom Instance Method:** `user.matchPassword(enteredPassword)` executes `bcrypt.compare()` for constant-time hash verification.

### 6. `server/models/Job.js` & `server/models/SavedJob.js` (Job Data Architecture)
* **`Job.js`:**
  - Caches scraped listings in a standardized schema: `externalId`, `source`, `title`, `company`, `location`, `employmentType`, `description`, `applyUrl`, `postedAt`, `salary`, `skills`, `jobLevel`.
  - **Compound Unique Index:** `JobSchema.index({ externalId: 1, source: 1 }, { unique: true })` ensures deduplication and $O(\log n)$ lookup speed.
* **`SavedJob.js`:**
  - Implements a **denormalized embedding pattern**: Stores user reference and embeds a complete snapshot of `jobData`.
  - **Why denormalization?** Even if external job boards take down the listing or scrape results expire, the user's saved job board remains 100% accessible and readable.
  - **Unique Index:** `SavedJobSchema.index({ user: 1, 'jobData.externalId': 1 }, { unique: true })` prevents users from bookmarking the same job twice.

### 7. `server/controllers/authController.js` (Auth Business Logic)
* **Endpoints Handled:**
  - `register`: Validates name, RFC-compliant email regex, and minimum 6-character password; checks for duplicate accounts; creates user; returns JWT token.
  - `login`: Uses `.select('+password')` to explicitly retrieve the hash; calls `user.matchPassword()`; returns JWT token.
  - `logout`: Returns a clean success response advising the client to wipe local storage.
  - `getMe`: Uses `req.user.id` to return the authenticated user document.

### 8. `server/controllers/jobController.js` (Job Management Logic)
* **Endpoints Handled:**
  - `searchJobsHandler`: Extracts query, location, sites, isRemote, jobType, country; invokes `jobService.searchJobs()`; handles fallback and timeouts.
  - `getJobHandler`: Two-tier lookup: first checks the `Job` cache collection; if not found, checks the `SavedJob` collection.
  - `saveJobHandler`: Saves job snapshot into user's `SavedJob` collection.
  - `unsaveJobHandler`: Removes job from saved list via `findOneAndDelete`.
  - `getSavedJobsHandler`: Retrieves all saved jobs for `req.user.id` sorted by `createdAt: -1`.

### 9. `server/services/jobs/jobService.js` (Inter-Process Bridge & Cache Coordinator)
* **What it does:** Orchestrates Python JobSpy execution, parses output CSV, transforms records, and handles fallback search.
* **Key Implementations:**
  - **Subprocess Spawning:** Uses `child_process.spawn(pythonBin, args, { timeout: 60000 })` with a 60-second execution cap to avoid zombie processes.
  - **CSV Stream Ingestion:** Ingests CSV using `csv-parse/sync` with `skip_empty_lines: true` and `relax_column_count: true`.
  - **Normalization (`convertCsvRowToJob`):** Generates fallback MD5 hashes (`crypto.createHash('md5')`) if an external board lacks a unique job ID.
  - **Asynchronous Upsert:** Caches jobs into MongoDB asynchronously in the background (`Job.updateOne({ externalId }, { $set: job }, { upsert: true })`) so the HTTP response returns to the client without blocking.
  - **Graceful Degradation / Fallback:** If scraping fails or network is blocked, searches previously cached jobs in MongoDB using Regex matching on `title` and `description`.
  - **Cleanup:** Unlinks temporary CSV files in a `finally` block to prevent disk clutter.

### 10. `server/services/jobs/jobspy_scraper.py` (Python Scraping Engine)
* **What it does:** Uses `python-jobspy` to scrape job postings concurrently across LinkedIn, Indeed, Glassdoor, ZipRecruiter, and Google Jobs.
* **Key Implementations:**
  - Command-line argument parsing (`argparse`) for search term, location, country, job type, remote toggle, and hours old.
  - Handles anti-scraping and site errors gracefully: outputs an empty CSV rather than terminating abruptly with unhandled exceptions.
  - Outputs a standardized CSV format with consistent column headers.

### 11. `server/utils/jwt.js` (Token Generator)
* **What it does:** Generates cryptographically signed JWT tokens with 7-day expiration:
  ```javascript
  const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
  };
  ```

---

## 5. API Endpoints Reference

| Method | Endpoint | Access | Rate Limit | Purpose |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | Public | 20 req / 15m | Register new user with email & password |
| `POST` | `/api/auth/login` | Public | 20 req / 15m | Authenticate user & return JWT |
| `POST` | `/api/auth/logout` | Public | 20 req / 15m | Logout user |
| `GET` | `/api/auth/me` | Protected | 20 req / 15m | Get current authenticated user profile |
| `GET` | `/api/auth/google` | Public | 20 req / 15m | Initiate Google OAuth 2.0 flow |
| `GET` | `/api/auth/google/callback`| Public | 20 req / 15m | Google OAuth callback handler |
| `GET` | `/api/jobs` | Public | 200 req / 15m | Real-time multi-platform job search |
| `GET` | `/api/jobs/:id` | Public | 200 req / 15m | Get detailed cached job data |
| `POST` | `/api/jobs/:id/save` | Protected | 200 req / 15m | Bookmark / save job for current user |
| `DELETE`| `/api/jobs/:id/save` | Protected | 200 req / 15m | Remove job from saved list |
| `GET` | `/api/jobs/saved` | Protected | 200 req / 15m | Retrieve all bookmarked jobs for user |

---

## 6. Top 15 Technical Interview Questions & High-Impact Answers

### Q1: "Can you explain your overall backend architecture and responsibilities?"
**Answer:**  
*"I designed a modular, service-oriented Express.js backend with MongoDB. My responsibilities centered on platform reliability, authentication, and job discovery. I implemented a secure authentication system supporting local accounts and Google OAuth with JWT tokens. For job discovery, I built an inter-process bridge connecting Node.js to a Python scraping service powered by JobSpy, allowing real-time aggregated search across LinkedIn, Indeed, and Glassdoor, backed by an intelligent MongoDB caching and fallback layer."*

---

### Q2: "Why did you choose JWT over traditional server-side session cookies?"
**Answer:**  
*"JWTs are stateless. With server sessions, every authenticated request requires either querying a session database (like Redis) or maintaining server memory, which creates bottlenecks when scaling horizontally. With JWT, identity and claims are cryptographically signed inside the token payload itself. The server verifies the token signature using our secret key in $O(1)$ CPU time without database lookups, making it ideal for our decoupled React SPA architecture."*

---

### Q3: "How does Google OAuth 2.0 work under the hood in your system?"
**Answer:**  
*"When the user clicks 'Continue with Google', the client hits `/api/auth/google`. Passport redirects the user to Google's consent screen. Once the user approves, Google redirects back to `/api/auth/google/callback` with an authorization code. Passport exchanges that code for the user's profile and verified email. In our callback strategy, we query MongoDB for an existing user with that email. If found, we authenticate them; if not, we automatically provision a new user document. Finally, we sign a JWT and redirect the browser to the frontend with the token in query parameters, which our React callback handler stores."*

---

### Q4: "Why is the password field set to `select: false` in the Mongoose User schema?"
**Answer:**  
*"Defense in depth. If a developer runs `User.find()` or `User.findById()` to return user profile data or populate author fields, the password hash could accidentally leak into the HTTP response. By setting `select: false`, Mongoose excludes the password hash from all query results by default. Only in our specific login function do we explicitly request it using `.select('+password')` for password verification."*

---

### Q5: "How do you protect passwords against rainbow table and brute-force attacks?"
**Answer:**  
*"We use `bcryptjs` with 10 salt rounds in a Mongoose pre-save hook. A unique random cryptographic salt is generated for each password before hashing. This ensures two users with identical passwords will have completely different hashes, neutralizing pre-computed rainbow table attacks. Furthermore, Bcrypt is intentionally CPU-intensive (key stretching), making brute-force dictionary attacks computationally prohibitive."*

---

### Q6: "How do you defend the API against NoSQL injection attacks?"
**Answer:**  
*"Attackers can submit objects like `{\"email\": {\"$gt\": \"\"}}` instead of strings to bypass authentication. We implemented `express-mongo-sanitize` middleware globally in `server.js`. It recursively inspects `req.body`, `req.query`, and `req.params`, automatically stripping any keys containing MongoDB query operators like `$` or `.` before controllers ever process the data."*

---

### Q7: "Why did you use tiered rate limiting instead of a single global limit?"
**Answer:**  
*"Different endpoints have completely different risk profiles:
1. **Authentication endpoints (`/api/auth/*`):** Highly vulnerable to credential stuffing and brute force. We restrict them strictly to 20 requests per 15 minutes.
2. **AI endpoints (`/api/optimizer/*`):** Consumes LLM token quotas and is computationally expensive. We cap it at 30 requests per hour.
3. **General browsing & search (`/api/jobs/*`):** Requires higher throughput for pagination and browsing, so we allow 200 requests per 15 minutes.
A single global rate limiter would either be too loose for login security or too strict for regular browsing."*

---

### Q8: "Why did you use a Python scraper instead of pure Node.js scraping libraries like Cheerio or Puppeteer?"
**Answer:**  
*"Job boards like LinkedIn and Indeed have aggressive anti-bot protections, rate limits, and dynamic structures that break standard Cheerio or Puppeteer scripts quickly. The Python `jobspy` library is a battle-tested, actively maintained package with built-in header rotation, multi-board concurrent scraping, and structured field extraction across major portals. Leveraging Python for scraping while using Node.js for high-concurrency API serving gave us the best of both ecosystems."*

---

### Q9: "How does Inter-Process Communication (IPC) work between Node.js and Python in your project?"
**Answer:**  
*"We use Node.js's native `child_process.spawn()` method:
1. Node passes search parameters (keywords, location, country, remote status, output path) as CLI arguments to `jobspy_scraper.py`.
2. Python executes the scrape concurrently and writes standardized structured data directly to a timestamped CSV file in `services/jobs/cache/`.
3. Node listens to `stdout`, `stderr`, and the `close` event with a 60-second timeout.
4. When Python completes, Node parses the CSV using `csv-parse/sync`, maps the rows to Standard Job JSON, and unlinks the temporary CSV file in a `finally` block to prevent disk leaks."*

---

### Q10: "What happens if external job boards block the scraper or Python crashes?"
**Answer:**  
*"We implemented a resilient fallback strategy:
1. In `jobspy_scraper.py`, exceptions are caught and an empty CSV with proper column headers is produced rather than abruptly crashing.
2. In `jobService.js`, if the scraper fails or returns an empty result, the `catch` block intercepts the error and executes an indexed regex fallback query in MongoDB against our `Job` cache collection.
3. If previously scraped jobs match the query title or description, they are immediately returned to the user, ensuring zero total outage."*

---

### Q11: "Why did you choose a denormalized schema for `SavedJob` instead of just referencing `Job` ObjectId?"
**Answer:**  
*"Web-scraped job listings are volatile—external posts can expire or be deleted at any time, and cached entries might be pruned. If we only stored an ObjectId reference, a user visiting their 'Saved Jobs' page a month later could see broken cards or 404 errors. By storing an embedded `jobData` snapshot alongside `user: ObjectId`, the user's saved job remains readable permanently."*

---

### Q12: "How did you ensure duplicate jobs are not saved in the database?"
**Answer:**  
*"At the database level, we created compound unique indexes:
- On `JobSchema`: `JobSchema.index({ externalId: 1, source: 1 }, { unique: true })`.
- On `SavedJobSchema`: `SavedJobSchema.index({ user: 1, 'jobData.externalId': 1 }, { unique: true })`.
When caching new search results, we use Mongoose `updateOne` with `{ upsert: true }`, updating existing records or inserting new ones atomically without throwing duplicate key errors."*

---

### Q13: "What CORS policy did you configure and why is `credentials: true` necessary?"
**Answer:**  
*"We configured Express `cors` middleware explicitly with our client origin:
```javascript
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```
`credentials: true` is required so the browser can send and receive authorization headers and secure cookies cross-origin. Setting `origin: '*'` with credentials is prohibited by modern browser security standards."*

---

### Q14: "What was the most difficult bug or challenge you faced and how did you solve it?"
**Answer:**  
*"One major challenge was scraper concurrency and temp file cleanup. When multiple users searched concurrently, writing to a single shared file caused file-lock conflicts and corrupted data. I resolved this by generating unique cryptographically random file names (`jobs_${Date.now()}_${crypto.randomBytes(8).toString('hex')}.csv`) for each scrape request, and wrapping the cleanup logic in a `finally` block so temporary files are always deleted regardless of whether the parsing succeeded or failed."*

---

### Q15: "If the job search traffic scales to 10,000 queries per minute, how would you evolve this system?"
**Answer:**  
*"Currently, scraping is on-demand per request. At 10,000 QPM:
1. **Asynchronous Task Queue:** I would decouple scraping from the request-response cycle using BullMQ with Redis. Search requests would immediately read from a Redis cache or Elasticsearch cluster.
2. **Scheduled Worker Pool:** Background workers would periodically scrape popular job keywords (e.g., 'React Developer', 'Data Engineer') and refresh the cache ahead of time.
3. **Cluster & Load Balancing:** Containerize the Node app with Docker, run multiple stateless replicas behind an NGINX or AWS ALB load balancer, and deploy worker nodes dedicated specifically to Python scraping tasks."*

---

## 7. Member 1 Cheat Sheet for Fast Revision

| What to say when asked about... | Your Instant Answer |
|---|---|
| **Architecture** | "Node.js Express backend with MongoDB, modular controllers, and an asynchronous Python JobSpy bridge." |
| **Authentication** | "Stateless JWT with 7-day expiry + Bcrypt password hashing + Google OAuth 2.0 via Passport." |
| **Security** | "Helmet headers, Mongo sanitization against NoSQL injection, tiered rate limiting, and strict CORS." |
| **Job Engine** | "Child process execution of JobSpy, CSV stream ingestion, fallback MongoDB regex search, and upsert caching." |
| **Data Integrity** | "Compound unique indexes in Mongoose and denormalized embedded snapshots for saved jobs." |
