# Resume++ — Learning Documentation for Beginners

> This document explains every concept in the project in simple terms.
> Written specifically for someone learning MERN stack for the first time.
> For each concept: **What is it? Why do we need it? How does it work? Real-world example.**

---

## Table of Contents

1. [What is MERN Stack?](#1-what-is-mern-stack)
2. [How the Two Servers Work Together](#2-how-the-two-servers-work-together)
3. [The .env File — Why Secrets Must Be Hidden](#3-the-env-file--why-secrets-must-be-hidden)
4. [MongoDB and Mongoose — The Database Layer](#4-mongodb-and-mongoose--the-database-layer)
5. [Express — The Backend Server](#5-express--the-backend-server)
6. [React — The Frontend](#6-react--the-frontend)
7. [Authentication Deep Dive — JWT and bcrypt](#7-authentication-deep-dive--jwt-and-bcrypt)
8. [Google OAuth — Login with Google](#8-google-oauth--login-with-google)
9. [Axios and the API Service Layer](#9-axios-and-the-api-service-layer)
10. [React Context — Global State Management](#10-react-context--global-state-management)
11. [Protected Routes — Guarding Pages](#11-protected-routes--guarding-pages)
12. [The Adapter Pattern — Job API Normalization](#12-the-adapter-pattern--job-api-normalization)
13. [File Upload — Multer, PDF-Parse, Mammoth](#13-file-upload--multer-pdf-parse-mammoth)
14. [AI Integration — Google Gemini](#14-ai-integration--google-gemini)
15. [PDF Generation — @react-pdf/renderer](#15-pdf-generation--react-pdfrenderer)
16. [Security — Why Each Layer Exists](#16-security--why-each-layer-exists)
17. [SessionStorage vs LocalStorage](#17-sessionstorage-vs-localstorage)
18. [The Monorepo Structure — Why Two package.json Files?](#18-the-monorepo-structure--why-two-packagejson-files)
19. [How Tailwind CSS Works](#19-how-tailwind-css-works)
20. [What Happens When You Run npm run dev](#20-what-happens-when-you-run-npm-run-dev)

---

## 1. What is MERN Stack?

**MERN** stands for four technologies that together make a complete web application:

| Letter | Technology | What it does |
|---|---|---|
| M | **MongoDB** | Stores your data (users, jobs, resumes) |
| E | **Express** | Handles incoming requests from the browser |
| R | **React** | Shows the UI in the browser |
| N | **Node.js** | Runs JavaScript on the server (not just browser) |

**Real-world analogy:**
- MongoDB = a filing cabinet (stores data)
- Express = a receptionist (receives requests, routes them)
- React = the visual interface a customer sees
- Node.js = the building the receptionist works in

**In Resume++:**
```
User types in browser (React)
→ clicks "Search Jobs"
→ React sends request to Express (Node.js)
→ Express asks MongoDB for data / calls external API
→ Express sends result back
→ React shows it to the user
```

---

## 2. How the Two Servers Work Together

When you run `npm run dev`, TWO servers start at the same time:

```
Client (Vite dev server) → http://localhost:5173
Server (Express)         → http://localhost:5000
```

**Problem:** The browser's JavaScript can only talk to the server it came from (same-origin policy). If React is on port 5173 and Express is on 5000, the browser will block the request.

**Solution:** Vite's proxy. In `vite.config.js`:
```js
proxy: {
  '/api': {
    target: 'http://localhost:5000',
    changeOrigin: true,
  }
}
```

**What this means:** Any request from React that starts with `/api` is secretly forwarded to port 5000. The browser thinks it's talking to port 5173, but Vite is forwarding it.

```
React → fetch('/api/jobs') → Vite sees /api → forwards to localhost:5000/api/jobs
                                              ↑ Express handles it here
```

**Why this matters:** The API key (like `JOB_API_KEY`) is only on the Express server. The browser never sees it. This keeps it secret.

---

## 3. The .env File — Why Secrets Must Be Hidden

**What is a .env file?**
A plain text file containing sensitive configuration values like API keys, database passwords, and JWT secrets.

```env
MONGODB_URI=mongodb+srv://user:password@cluster.net/
JWT_SECRET=my_super_secret_key
AI_API_KEY=AIzaSy...
```

**Why can't we just hardcode these in the code?**

If you write `const apiKey = "AIzaSy..."` directly in your JavaScript file:
- Anyone who views your GitHub repo sees the key
- Anyone can use your key → you pay the bill
- Google/OpenAI will ban your account

**The .gitignore file is the protector:**
```
# .gitignore
.env          ← This line tells git to NEVER include .env in commits
node_modules/
```

**How Node.js reads .env:**
```js
require('dotenv').config() // reads .env file
console.log(process.env.JWT_SECRET) // now available as a variable
```

**Why `dotenv` needs a path in this project:**
```js
// In server/server.js:
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
```
The server runs from the `server/` folder. `dotenv` by default looks for `.env` in the current folder. Since our `.env` is in the project root (one level up), we need to tell it where to look using `path.join(__dirname, '../.env')`.

- `__dirname` = the folder where the current file is (`server/`)
- `'../.env'` = go up one level, find `.env`

---

## 4. MongoDB and Mongoose — The Database Layer

### What is MongoDB?
A database that stores data as JSON-like documents (called "documents") instead of rows in a table. Perfect for JavaScript apps because you're already working with JavaScript objects.

**SQL (traditional database):**
```sql
users table: | id | name | email | password |
             | 1  | John | j@... | hash...  |
```

**MongoDB:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "John",
  "email": "john@example.com",
  "password": "hashed..."
}
```

### What is Mongoose?
A library that sits between your Node.js code and MongoDB. It adds:
1. **Schema validation** — enforces what fields a document can have
2. **Methods** — lets you add custom functions to documents
3. **Hooks** — run code automatically before/after save, find, etc.

### Example: User Model Explained

```js
// server/models/User.js

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,  // This field MUST be present
    trim: true,      // Remove leading/trailing spaces automatically
  },
  email: {
    type: String,
    required: true,
    unique: true,    // No two users can have the same email
    lowercase: true, // Always store in lowercase (john@... not John@...)
  },
  password: {
    type: String,
    select: false,   // NEVER return password in query results unless asked
  },
})
```

**`select: false` is crucial for security.** When you do:
```js
const user = await User.findById(id) // password is NOT included
const user = await User.findById(id).select('+password') // password IS included
```
This prevents accidentally sending the password hash to the browser.

### Pre-save Hook — Password Hashing

```js
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next() // skip if password not changed
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})
```

**What this does:** Every time a user document is saved AND the password field was modified, automatically hash it before storing. You never have to remember to hash it manually.

**Why `this.isModified('password')`?** If you update a user's name, you don't want to re-hash the already-hashed password. This check skips hashing if the password didn't change.

### Instance Method

```js
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password)
}
```

This adds a `matchPassword` function to every User document. You call it like:
```js
const user = await User.findOne({ email }).select('+password')
const isMatch = await user.matchPassword('entered_password')
// Returns true or false
```

---

## 5. Express — The Backend Server

**What is Express?**
A minimal framework for Node.js that makes it easy to:
- Define routes (URL patterns)
- Apply middleware (functions that run before route handlers)
- Send responses

### Basic Structure

```js
const express = require('express')
const app = express()           // create the app

app.use(express.json())         // middleware: parse JSON bodies

app.get('/api/health', (req, res) => {  // define a route
  res.json({ status: 'ok' })   // send response
})

app.listen(5000, () => console.log('Server on port 5000'))
```

### What is Middleware?

Middleware is a function that runs between the request arriving and the response being sent. Think of it as a pipeline.

```
Request → middleware1 → middleware2 → route handler → Response
```

In Resume++:
```
Request arrives
→ helmet()          (adds security headers)
→ cors()            (checks if origin is allowed)
→ express.json()    (parses JSON body)
→ mongoSanitize()   (removes $ and . from data)
→ rateLimit()       (checks if too many requests)
→ protect()         (verifies JWT token) [only on protected routes]
→ controller        (your actual business logic)
→ Response sent
```

### Routes vs Controllers

**Routes** define WHICH URL triggers WHAT function:
```js
// server/routes/auth.js
router.post('/register', register)  // POST /api/auth/register → register function
router.get('/me', protect, getMe)   // GET /api/auth/me → protect first, then getMe
```

**Controllers** contain the actual logic:
```js
// server/controllers/authController.js
const register = async (req, res) => {
  const { name, email, password } = req.body  // get data from request
  // validate, create user, generate token...
  res.json({ success: true, token, user })    // send response
}
```

**Why separate them?** Keeps code organized. Routes are a map. Controllers are the destination.

### req and res — What Are They?

`req` (request) contains everything about what the client sent:
- `req.body` — JSON body (POST/PUT data)
- `req.params` — URL params like `:id` in `/api/jobs/:id`
- `req.query` — query params like `?query=react` in the URL
- `req.headers` — headers including `Authorization: Bearer <token>`
- `req.user` — set by our `protect` middleware after JWT verification

`res` (response) is what you send back:
- `res.json({})` — send JSON response
- `res.status(404).json({})` — with HTTP status code
- `res.redirect(url)` — redirect browser to another URL

---

## 6. React — The Frontend

### What is React?

A JavaScript library for building user interfaces. Instead of manipulating HTML directly, you write components that React renders to the DOM.

**Key concepts:**

**Component** = a reusable piece of UI, written as a function:
```jsx
function Button({ variant, children, onClick }) {
  return (
    <button className={`px-4 py-2 ${variant === 'filled' ? 'bg-violet-600' : 'border'}`}
            onClick={onClick}>
      {children}
    </button>
  )
}
```

**State** = data that, when changed, causes the component to re-render:
```jsx
const [jobs, setJobs] = useState([])  // jobs starts empty
// when setJobs is called with new data, React re-renders the component
```

**Effect** = code that runs after the component renders (for API calls, subscriptions, etc.):
```jsx
useEffect(() => {
  fetchJobs() // this runs after the component appears on screen
}, [])        // [] means "run only once when component first appears"
```

### How React Router Works

React Router is used instead of traditional page navigation. There's only ONE HTML page (`index.html`). JavaScript changes what's shown based on the URL.

```jsx
<Routes>
  <Route path="/" element={<Landing />} />
  <Route path="/jobs" element={<FindJobs />} />
  <Route path="/job/:id" element={<JobDetails />} />  // :id is a dynamic param
</Routes>
```

When you go to `/job/abc123`, React Router:
1. Matches the pattern `/job/:id`
2. Renders `<JobDetails />`
3. Sets `id = "abc123"` (accessible via `useParams()`)

No page reload happens. Only the content changes. This is called a **Single Page Application (SPA)**.

---

## 7. Authentication Deep Dive — JWT and bcrypt

### The Problem: How Does the Server Know Who You Are?

HTTP is stateless — each request is independent. The server doesn't remember you between requests.

**Solution 1: Sessions** — Server stores "user is logged in" in memory. Problem: doesn't scale, uses RAM.

**Solution 2: JWT (JSON Web Token)** — Server gives you a "pass" (token). You show it on every request. Server verifies the pass without storing anything.

### What is a JWT?

A JWT looks like this:
```
eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjUwN2YifQ.K8F9...
```

It has 3 parts separated by dots:
1. **Header** — algorithm used (base64 encoded)
2. **Payload** — the data (user ID) (base64 encoded)
3. **Signature** — a cryptographic hash of header+payload+secret

**Why can't someone fake a JWT?**
The signature is created using a secret key (`JWT_SECRET`) that only the server knows. If someone modifies the payload (e.g., changes the user ID), the signature becomes invalid. The server detects this and rejects the token.

### How We Generate a JWT

```js
// server/utils/jwt.js
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },          // payload — what we store in the token
    process.env.JWT_SECRET,  // secret — only server knows this
    { expiresIn: '7d' }      // token expires in 7 days
  )
}
```

### How We Verify a JWT (the protect middleware)

```js
// server/middleware/auth.js
const protect = async (req, res, next) => {
  // 1. Get token from header
  const token = req.headers.authorization?.split(' ')[1] // "Bearer abc123" → "abc123"

  // 2. Verify it
  const decoded = jwt.verify(token, process.env.JWT_SECRET)
  // If token was tampered with or expired, this throws an error

  // 3. Attach user info to request
  req.user = { id: decoded.id }

  // 4. Continue to the actual route handler
  next()
}
```

If someone sends a fake or expired token, `jwt.verify` throws an error, we catch it and return 401 Unauthorized.

### What is bcrypt?

Passwords must NEVER be stored as plain text. If your database is hacked, attackers shouldn't be able to read the passwords.

**bcrypt** is a hashing function that:
1. Takes a password string
2. Adds a random "salt" (extra random characters)
3. Runs it through a slow hashing algorithm many times
4. Produces a fixed-length string that looks like: `$2b$10$N9...`

**saltRounds=10** means bcrypt runs the algorithm 2^10 = 1024 times. This makes brute force attacks very slow.

```js
// Hashing:
const salt = await bcrypt.genSalt(10)
const hash = await bcrypt.hash('mypassword123', salt)
// hash = "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"

// Comparing:
const isMatch = await bcrypt.compare('mypassword123', hash)
// true

const isMatch2 = await bcrypt.compare('wrongpassword', hash)
// false
```

You can NEVER reverse a bcrypt hash back to the original password. That's the point.

---

## 8. Google OAuth — Login with Google

### What is OAuth 2.0?

OAuth is a protocol that lets you log into one website using another website's account. "Login with Google" is OAuth.

**The dance:**
```
1. User clicks "Continue with Google" on your site
2. Your site redirects them to Google's login page
3. User logs in on Google and approves sharing their profile
4. Google redirects back to your site with a special CODE
5. Your server exchanges the CODE for an ACCESS TOKEN
6. Your server uses the access token to fetch the user's profile (name, email)
7. You create a user in your database with their Google profile data
8. You generate your own JWT and log them in
```

**Why Passport.js?**
Passport handles steps 4-6 automatically. You just write step 7 (what to do with the profile).

```js
// server/config/passport.js
passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  process.env.GOOGLE_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
  // This function is called with the user's Google profile
  const email = profile.emails[0].value
  
  let user = await User.findOne({ email })
  if (!user) {
    user = await User.create({ name: profile.displayName, email })
  }
  
  done(null, user) // passport attaches user to req.user
}))
```

**The Client-side Callback page (`GoogleCallback.jsx`):**
After Google OAuth succeeds, the server redirects to:
```
http://localhost:5173/auth/callback?token=eyJ...
```
The `GoogleCallback` page reads the token from the URL, stores it in localStorage, and redirects to the dashboard. This is needed because OAuth redirects go to a URL — you can't directly set state in React via a redirect.

---

## 9. Axios and the API Service Layer

### What is Axios?

Axios is a library for making HTTP requests from JavaScript. It's cleaner than the built-in `fetch` API.

```js
// Without axios (native fetch):
const response = await fetch('/api/jobs', {
  headers: { 'Authorization': `Bearer ${token}` }
})
const data = await response.json()

// With axios:
const { data } = await axios.get('/api/jobs', {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

### The Axios Instance (api.js)

```js
// client/src/services/api.js
import axios from 'axios'

const api = axios.create({ baseURL: '/api' })  // all calls start with /api

// REQUEST INTERCEPTOR — runs before every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`  // attach JWT automatically
  }
  return config
})

export default api
```

**Why an interceptor?** Instead of adding the token to every single API call manually, we add it once here. Every call made through `api` automatically includes the token.

### The Service Layer

We don't call `api.get(...)` directly in components. We have service files:

```js
// client/src/services/jobService.js
export const searchJobs = async (query, location) => {
  const { data } = await api.get('/jobs', { params: { query, location } })
  return data.data
}
```

**Why this pattern?**
- Components just call `searchJobs('react', 'NY')` — they don't know the URL
- If the API URL changes, you change it in one place
- Easy to test
- Clean component code

---

## 10. React Context — Global State Management

### The Problem: Prop Drilling

Imagine you have user data in `App.jsx` and need it in `AuthLayout.jsx` → `Dashboard.jsx`. You'd have to pass it as props through every level. This is called "prop drilling" and gets messy.

### The Solution: React Context

Context is like a global variable that any component can read without passing props.

```js
// client/src/context/AuthContext.jsx

// Step 1: Create the context
const AuthContext = createContext(null)

// Step 2: Create the Provider (wraps the whole app)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  // Rehydrate on refresh — if token in localStorage, fetch user from server
  useEffect(() => {
    if (!token) { setLoading(false); return }
    api.get('/auth/me')
       .then(({ data }) => setUser(data.user))
       .catch(() => { setUser(null); localStorage.removeItem('token') })
       .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', data.token)
    setToken(data.token)
    setUser(data.user)
  }

  const logout = () => {
    setUser(null); setToken(null); localStorage.removeItem('token')
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// Step 3: Hook to use the context
export const useAuth = () => useContext(AuthContext)
```

**How to use it anywhere:**
```jsx
function Dashboard() {
  const { user } = useAuth()  // no prop needed — reads from context
  return <h1>Welcome {user.name}</h1>
}
```

**Why `loading: true` initially?**
On page refresh, the component mounts and immediately checks if a token exists in localStorage. During this check, we don't know if the user is authenticated yet. `loading: true` prevents the ProtectedRoute from redirecting to login before the check completes.

---

## 11. Protected Routes — Guarding Pages

Some pages (Dashboard, Jobs, Resume) should only be accessible to logged-in users. If not logged in, redirect to `/login`.

```jsx
// client/src/components/ProtectedRoute.jsx
export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />  // wait for auth check to complete
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />  // redirect to login
  }

  return <AuthLayout />  // show the page
}
```

**In App.jsx:**
```jsx
<Route element={<ProtectedRoute />}>
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/jobs" element={<FindJobs />} />
  // ... all protected pages
</Route>
```

**How `<Outlet />` works:**
`<AuthLayout />` contains `<Outlet />`. When a child route matches (like `/dashboard`), React Router renders `<Dashboard />` in place of the `<Outlet />`. So the layout wraps the page content.

---

## 12. The Adapter Pattern — Job API Normalization

### The Problem

The Open Web Ninja API returns data like this:
```json
{
  "job_id": "bGlua2VkaW...",
  "job_title": "React Developer",
  "employer_name": "Google",
  "job_employment_type": "Full-time"
}
```

If our frontend used `job.job_title` and `job.employer_name`, and we later switched to a different job API (with different field names), we'd need to update every component that shows jobs.

### The Solution: An Adapter

The adapter converts the raw API response into our "Standard Job JSON" — a format we control:

```js
// server/services/jobs/jobAdapter.js
const adaptOWNJob = (raw) => ({
  externalId:     raw.job_id,           // ← mapped from job_id
  title:          raw.job_title,        // ← mapped from job_title
  company: {
    name: raw.employer_name,            // ← nested structure
    logo: raw.employer_logo,
  },
  employmentType: raw.job_employment_type,
  // etc.
})
```

**Now the frontend only uses:**
```jsx
<h2>{job.title}</h2>
<p>{job.company.name}</p>
```

If you ever switch the job API, you only change `jobAdapter.js`. The frontend doesn't need to change at all.

**Real-world analogy:** An electrical adapter lets you plug a US device into a European outlet. The device (frontend) doesn't need to change — only the adapter does.

---

## 13. File Upload — Multer, PDF-Parse, Mammoth

### Multer — Handling File Uploads

When a user uploads a file, the browser sends it as `multipart/form-data`. Multer is a Node.js middleware that handles this format.

```js
// server/middleware/upload.js
const multer = require('multer')

const upload = multer({
  storage: multer.memoryStorage(),  // keep file in RAM, not disk
  limits: { fileSize: 5 * 1024 * 1024 },  // 5 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true)  // accept
    else cb(new Error('Only PDFs allowed'))                   // reject
  }
})
```

`memoryStorage()` means the file is kept in `req.file.buffer` — never written to the server's disk. This is safer and simpler for our use case.

### PDF-Parse — Reading PDF Text

```js
const pdfParse = require('pdf-parse')
const result = await pdfParse(buffer)  // buffer = file contents
const text = result.text  // extracted text as a string
```

This only works for **text-based PDFs** (ones you can select text in). For scanned PDFs (images of paper), you'd need OCR — not implemented in this project.

### Mammoth — Reading DOCX Text

```js
const mammoth = require('mammoth')
const result = await mammoth.extractRawText({ buffer })
const text = result.value  // extracted text
```

Mammoth handles Microsoft Word's DOCX format (which is actually a ZIP file containing XML).

### The Upload Pipeline

```
User uploads file → Multer reads into memory → textExtractor.js:
  if PDF → pdf-parse → raw text
  if DOCX → mammoth → raw text
→ aiService.parseResumeText(rawText) → Gemini AI → JSON
→ validate JSON → save to MongoDB
```

---

## 14. AI Integration — Google Gemini

### How We Call Gemini

Instead of using the SDK (which had version issues), we call the REST API directly:

```js
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`

const body = {
  contents: [{ parts: [{ text: promptText }] }],
  generationConfig: { temperature: 0.3 }  // lower = more predictable
}

const { data } = await axios.post(url, body)
const text = data.candidates[0].content.parts[0].text
```

### Why temperature: 0.3?

Temperature controls how creative/random the AI is:
- `0.0` = very deterministic (same input → same output)
- `1.0` = very creative/unpredictable

For resume optimization, we want consistency — `0.3` gives slightly creative rewording but not wildly different results each time.

### Why We Validate AI Output

AI models can fail. They might:
- Return markdown instead of pure JSON
- Miss a field
- Return an array where we expect a string

```js
const validateResumeJSON = (data) => {
  const required = ['personalInfo', 'summary', 'education', 'skills', ...]
  for (const key of required) {
    if (!(key in data)) throw new Error(`Missing field: ${key}`)
  }
  if (!Array.isArray(data.skills)) throw new Error('skills must be an array')
}
```

If validation fails, we return a 422 error to the user rather than saving invalid data to the database.

### Extracting JSON from AI Response

Gemini sometimes wraps JSON in markdown code fences:
```
```json
{ "name": "John" }
```
```

We handle this:
```js
const extractJSON = (text) => {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenceMatch ? fenceMatch[1].trim() : text.trim()
  return JSON.parse(raw)
}
```

---

## 15. PDF Generation — @react-pdf/renderer

### What is @react-pdf/renderer?

A React library that lets you define PDF documents using React components. Instead of rendering to the browser DOM, it renders to a PDF file.

```jsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { backgroundColor: '#ffffff', padding: 40 },
  name: { fontSize: 22, fontFamily: 'Helvetica-Bold' }
})

function ResumeDocument({ resume }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{resume.personalInfo.name}</Text>
      </Page>
    </Document>
  )
}
```

### Why Client-Side PDF?

We generate PDFs entirely in the browser — no server needed. This means:
- No PDF files stored on the server
- Instant download after generation
- Server doesn't need PDF generation libraries

### PDFViewer vs PDFDownloadLink

```jsx
// Show PDF embedded in the page:
<PDFViewer width="100%" height="800px">
  <ResumeDocument resume={data} />
</PDFViewer>

// Download as file:
<PDFDownloadLink document={<ResumeDocument resume={data} />} fileName="resume.pdf">
  {({ loading }) => loading ? 'Generating...' : 'Download PDF'}
</PDFDownloadLink>
```

---

## 16. Security — Why Each Layer Exists

### 1. Password Hashing (bcrypt)

**Without it:** If database is breached, attacker sees: `password: "mypass123"` — they can immediately log in.

**With it:** Attacker sees: `password: "$2b$10$N9..."` — this hash is useless without the original password, and reversing it would take billions of years.

### 2. JWT (Stateless Auth)

**Without it:** Every request, server must query the database to check if session is valid — slow and doesn't scale.

**With JWT:** Server just verifies the cryptographic signature — no database query needed.

### 3. Rate Limiting

**Without it:** Someone could try millions of password combinations using a script (brute force attack).

**With it:** After 20 auth attempts in 15 minutes from one IP, they get `429 Too Many Requests`.

### 4. Helmet (HTTP Headers)

Helmet adds headers like:
- `X-Content-Type-Options: nosniff` — browser won't guess file types
- `X-Frame-Options: DENY` — can't embed your site in an iframe (prevents clickjacking)
- `X-XSS-Protection: 1; mode=block` — browser blocks reflected XSS attacks

### 5. MongoDB Sanitization (express-mongo-sanitize)

**Without it:** Attacker sends:
```json
{ "email": { "$gt": "" }, "password": "anything" }
```
MongoDB's `$gt` operator means "greater than empty string" — matches ALL users → attacker logs in as any user.

**With it:** `express-mongo-sanitize` removes `$` and `.` from request data before it reaches the database.

### 6. CORS (Cross-Origin Resource Sharing)

**Without it:** Any website (even `evil.com`) could make requests to your API using a logged-in user's credentials.

**With it:** Only `CLIENT_URL` (your frontend) is allowed to call the API.

### 7. .env + .gitignore

**Without it:** API keys committed to GitHub → bots scan GitHub → your keys are stolen in minutes.

**With it:** `.env` is listed in `.gitignore` → never committed → stays on your machine only.

### 8. `select: false` on Password

**Without it:** Every user query returns the password hash — risk of accidentally sending it to the browser.

**With it:** Password is excluded from all queries by default. Only when you explicitly `.select('+password')` is it included.

### 9. File Validation (Multer)

**Without it:** User uploads a `.exe` or `.php` disguised as a PDF → potential remote code execution.

**With it:** We check `file.mimetype` (what the OS says the file is) AND limit size to 5MB. Non-PDF/DOCX files are rejected immediately.

---

## 17. SessionStorage vs LocalStorage

Both store data in the browser, but they have different lifetimes:

| Feature | localStorage | sessionStorage |
|---|---|---|
| Persists after browser close? | Yes | No |
| Persists after tab close? | Yes | No |
| Shared between tabs? | Yes | No |
| Cleared programmatically? | Yes | Yes |

**In Resume++:**
- **JWT token** → `localStorage` (you want to stay logged in across browser restarts)
- **Find Jobs search results** → `sessionStorage` (temporary — cleared when you close the tab)

```js
// localStorage — persists until explicitly cleared
localStorage.setItem('token', jwt)
localStorage.getItem('token')
localStorage.removeItem('token')

// sessionStorage — clears when tab closes
sessionStorage.setItem('findjobs_state', JSON.stringify(state))
sessionStorage.getItem('findjobs_state')
```

**Why sessionStorage for job results?**
Job listings change over time. You don't want to see stale results from 3 days ago. But within the same browsing session, restoring your search when you navigate away and back is a good UX feature.

---

## 18. The Monorepo Structure — Why Two package.json Files?

```
resume-plus-plus/
├── package.json        ← Root: only concurrently + monorepo scripts
├── client/
│   └── package.json   ← Client: React, Vite, Tailwind, etc.
└── server/
    └── package.json   ← Server: Express, Mongoose, etc.
```

**Why not one package.json?**
- Client and server have different environments. Client code runs in the browser (no `fs`, `path`). Server code runs in Node.js.
- Keeping them separate means: `npm run build` in `client/` only builds the frontend. You can deploy them independently.
- If a security vulnerability is found in a server library, it doesn't affect the client bundle.

**The root `package.json` only has:**
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:client\" \"npm run dev:server\"",
    "install:all": "npm install && cd client && npm install && cd ../server && npm install"
  },
  "devDependencies": { "concurrently": "^8.2.2" }
}
```

`concurrently` runs multiple npm scripts at the same time — starts both Vite and nodemon with one command.

---

## 19. How Tailwind CSS Works

Tailwind is a "utility-first" CSS framework. Instead of writing:
```css
.my-button {
  background-color: #7c3aed;
  padding: 8px 16px;
  border-radius: 8px;
}
```

You write classes directly in JSX:
```jsx
<button className="bg-violet-600 px-4 py-2 rounded-lg">Click me</button>
```

**How does Tailwind know which classes to include?**
The `content` array in `tailwind.config.js`:
```js
content: ['./index.html', './src/**/*.{js,jsx}']
```
Tailwind scans all these files, finds every class name used, and only includes those in the final CSS. Unused classes are removed — keeping the CSS bundle tiny.

**The three directives in index.css:**
```css
@tailwind base;       /* Resets browser default styles */
@tailwind components; /* Any custom component classes */
@tailwind utilities;  /* All utility classes like bg-violet-600 */
```

**Custom colors in tailwind.config.js:**
```js
theme: {
  extend: {
    colors: {
      primary: { 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed' }
    }
  }
}
```
This adds `text-primary-500`, `bg-primary-600`, etc. as valid Tailwind classes.

---

## 20. What Happens When You Run npm run dev

Let's trace the full startup sequence:

```
1. npm run dev (in project root)

2. concurrently starts two processes:
   a. "cd client && npm run dev" → Vite dev server starts on :5173
   b. "cd server && npm run dev" → nodemon starts server.js on :5000

3. server.js runs:
   a. dotenv.config() — loads .env variables
   b. Validates MONGODB_URI and JWT_SECRET exist
   c. Creates Express app
   d. Applies middleware (helmet, cors, json, mongoSanitize, rateLimit, passport)
   e. Registers all routes
   f. connectDB() — connects to MongoDB Atlas
   g. app.listen(5000) — server starts accepting requests

4. Vite starts:
   a. Reads vite.config.js
   b. Starts dev server on port 5173
   c. Configures /api proxy to localhost:5000

5. Browser opens localhost:5173

6. Vite serves index.html → browser loads it

7. main.jsx runs:
   <App /> is rendered inside <StrictMode>

8. App.jsx:
   a. Sets loading = true
   b. setTimeout(() => setLoading(false), 1500) — AppLoader shows for 1.5s
   c. AuthProvider mounts → checks localStorage for token
   d. If token found → calls GET /api/auth/me → sets user state
   e. Routes are registered

9. User navigates to /dashboard:
   a. React Router matches /dashboard
   b. ProtectedRoute checks isAuthenticated
   c. If not logged in → redirect to /login
   d. If logged in → AuthLayout renders → Dashboard renders inside <Outlet />

10. Dashboard makes API calls:
    a. getSavedJobs() → api.get('/jobs/saved')
    b. Axios interceptor adds Authorization: Bearer <token>
    c. Vite proxy forwards /api/jobs/saved → localhost:5000/api/jobs/saved
    d. Express routes to getSavedJobsHandler
    e. protect middleware verifies JWT → req.user = { id: userId }
    f. MongoDB query: SavedJob.find({ user: req.user.id })
    g. Results returned as JSON
    h. React updates state → Dashboard re-renders with data
```

---

## Quick Reference: Common Errors and What They Mean

| Error | Cause | Fix |
|---|---|---|
| `EADDRINUSE: port 5000` | Another process using port 5000 | `taskkill /F /PID <pid>` |
| `MongoServerError: bad auth` | Wrong MongoDB password in .env | Fix MONGODB_URI |
| `jwt malformed` | Token is corrupted or invalid | Clear localStorage and login again |
| `Cannot read properties of null` | Trying to use data before it loads | Add loading check or optional chaining `data?.field` |
| `CORS error` | Server not allowing your origin | Check CLIENT_URL in .env |
| `404 on /api/...` | Server needs restart to load new routes | Ctrl+C → npm run dev |
| `PDF appears scanned` | PDF is an image, no text layer | User needs to upload text-based PDF |

---

## What I Learned Building This Project

### Backend
- **Mongoose schemas** define the shape of your data — like TypeScript but for databases
- **Middleware** is a pipeline — each function either modifies `req`/`res` and calls `next()`, or ends the chain with a response
- **JWT** is stateless — no sessions, no database lookups per request
- **bcrypt** is intentionally slow — that's the security feature
- **Adapter patterns** decouple external APIs from your app's internal logic
- **Rate limiting** protects against both brute force attacks and API cost abuse

### Frontend
- **React state** is the single source of truth — UI is just a reflection of state
- **Context** solves prop drilling — share data globally without passing through every component
- **useEffect** with empty deps `[]` runs once after mount — perfect for API calls on page load
- **Axios interceptors** are middleware for HTTP requests — add auth headers once, not everywhere
- **sessionStorage** is perfect for temporary state that should reset when the browser closes

### Architecture
- **Proxy** is how development servers talk to each other without CORS issues
- **Adapters** make external dependencies swappable
- **Separate packages** (client/server) keep concerns separated
- **Environment variables** keep secrets out of code
- **Validation at every layer** — client AND server — means bugs are caught early

---

*Documentation written for Resume++ — A MERN Stack learning project*
*Last updated: September 2026*
