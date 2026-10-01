# Design Document: Resume++ Phase 3 — Full JWT Authentication

## Overview

Phase 3 wires up end-to-end JWT authentication for Resume++. The backend gains a Mongoose User model, a JWT utility, an auth middleware, and four endpoints (register, login, logout, /me). The frontend gains an axios instance, an AuthContext, a ProtectedRoute, and fully wired Login/Register pages. The design follows a stateless JWT pattern: the server issues a signed token on login/register; the client stores it in localStorage and attaches it as a Bearer token on every subsequent request.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (React + Vite, port 5173)                              │
│                                                                  │
│  AuthProvider (AuthContext.jsx)                                  │
│    ├── user: { _id, name, email } | null                        │
│    ├── token: string | null  ←→  localStorage['token']          │
│    └── loading: boolean                                         │
│                                                                  │
│  ProtectedRoute.jsx                                             │
│    ├── loading? → spinner                                       │
│    ├── !isAuthenticated? → <Navigate to="/login" />             │
│    └── authenticated? → <Outlet /> (renders AuthLayout)         │
│                                                                  │
│  services/api.js (axios instance, baseURL: '/api')              │
│    └── request interceptor → Authorization: Bearer <token>      │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTP (Vite proxy /api → :5000)
┌─────────────────────────────▼───────────────────────────────────┐
│  Express Server (server.js, port 5000)                          │
│                                                                  │
│  POST /api/auth/register  ──► authController.register           │
│  POST /api/auth/login     ──► authController.login              │
│  POST /api/auth/logout    ──► authController.logout             │
│  GET  /api/auth/me        ──► protect ──► authController.getMe  │
└─────────────────────────────┬───────────────────────────────────┘
                              │ Mongoose
┌─────────────────────────────▼───────────────────────────────────┐
│  MongoDB Atlas                                                   │
│  Collection: users  { name, email, password(hash), createdAt }  │
└─────────────────────────────────────────────────────────────────┘
```

### Full Data Flow

```
REGISTER / LOGIN:
  Browser → POST /api/auth/login { email, password }
          → authController.login
          → User.findOne({ email }).select('+password')
          → bcrypt.compare(entered, hash)          ← matchPassword()
          → generateToken(user._id)
          → { success: true, token, user: {_id, name, email} }
  Browser ← stores token in localStorage
  Browser ← sets AuthContext user + token state

AUTHENTICATED REQUEST:
  Browser → GET /api/auth/me
          → Authorization: Bearer <token>  (injected by axios interceptor)
          → protect middleware
          → jwt.verify(token, JWT_SECRET)  → { id: userId }
          → req.user = { id: userId }
          → authController.getMe
          → User.findById(req.user.id).select('-password')
          → { success: true, user: { _id, name, email } }

REHYDRATION ON REFRESH:
  AuthProvider mounts
  → token in localStorage?
  → api.get('/auth/me')
  → success → setUser, setToken, setLoading(false)
  → 401/error → clearToken, setUser(null), setLoading(false)

LOGOUT:
  logout() called
  → setUser(null), setToken(null)
  → localStorage.removeItem('token')
  → AuthLayout navigates to /login
```

---

## Components and Interfaces

### Backend

#### `server/utils/jwt.js`
```js
const jwt = require('jsonwebtoken')

/**
 * Signs a JWT with the given userId as payload.
 * @param {string} userId - MongoDB ObjectId as string
 * @returns {string} signed JWT, expires in 7 days
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

module.exports = { generateToken }
```

#### `server/middleware/auth.js`
```js
const jwt = require('jsonwebtoken')
const User = require('../models/User')

const protect = async (req, res, next) => {
  let token
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1]
  }
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' })
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = { id: decoded.id }
    next()
  } catch {
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' })
  }
}

module.exports = { protect }
```

#### `server/models/User.js`
```js
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const UserSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:  { type: String, required: true, select: false },
  createdAt: { type: Date, default: Date.now },
})

// Pre-save hook: hash password only when modified
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

// Instance method: compare plaintext to stored hash
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password)
}

module.exports = mongoose.model('User', UserSchema)
```

#### `server/controllers/authController.js`

Four exported async functions:

| Function | Route | Auth | Response shape |
|---|---|---|---|
| `register` | POST /api/auth/register | Public | 201 `{ success, token, user }` |
| `login` | POST /api/auth/login | Public | 200 `{ success, token, user }` |
| `logout` | POST /api/auth/logout | Public | 200 `{ success, message }` |
| `getMe` | GET /api/auth/me | Protected | 200 `{ success, user }` |

Input validation in each handler:
- `name`: required, non-empty after trim
- `email`: required, matches `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- `password`: required, length >= 6

All error responses: `{ success: false, message: "<reason>" }`

All success responses never include the `password` field.

#### `server/routes/auth.js`
```js
const express = require('express')
const router = express.Router()
const { register, login, logout, getMe } = require('../controllers/authController')
const { protect } = require('../middleware/auth')

router.post('/register', register)
router.post('/login',    login)
router.post('/logout',   logout)
router.get('/me',        protect, getMe)

module.exports = router
```

#### `server/server.js` — addition
```js
const authRouter = require('./routes/auth')
// ...after existing middleware, before connectDB:
app.use('/api/auth', authRouter)
```

---

### Frontend

#### `client/src/services/api.js`
```js
import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api
```

#### `client/src/context/AuthContext.jsx`
```jsx
import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [token, setToken]     = useState(localStorage.getItem('token') || null)
  const [loading, setLoading] = useState(true)

  // Rehydrate on mount
  useEffect(() => {
    const rehydrate = async () => {
      if (!token) { setLoading(false); return }
      try {
        const { data } = await api.get('/auth/me')
        setUser(data.user)
      } catch {
        setUser(null)
        setToken(null)
        localStorage.removeItem('token')
      } finally {
        setLoading(false)
      }
    }
    rehydrate()
  }, []) // intentionally run once on mount

  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password })
    localStorage.setItem('token', data.token)
    setToken(data.token)
    setUser(data.user)
    return data
  }

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', data.token)
    setToken(data.token)
    setUser(data.user)
    return data
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
  }

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      isAuthenticated: !!user,
      register, login, logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

#### `client/src/components/ProtectedRoute.jsx`
```jsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../layouts/AuthLayout'

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <AuthLayout />
}
```

> **Note:** ProtectedRoute renders `<AuthLayout />` directly (which internally renders `<Outlet />`). In App.jsx the protected child routes are nested under `<Route element={<ProtectedRoute />}>`.

#### `client/src/App.jsx` — updated protected route section
```jsx
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

// Wrap BrowserRouter in AuthProvider:
return (
  <AuthProvider>
    <BrowserRouter>
      ...
      <Routes>
        {/* Public routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
        </Route>

        {/* Protected routes — ProtectedRoute handles auth check + renders AuthLayout */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/jobs" element={<FindJobs />} />
          <Route path="/jobs/saved" element={<SavedJobs />} />
          <Route path="/job/:id" element={<JobDetails />} />
          <Route path="/resume/create" element={<CreateResume />} />
          <Route path="/resume" element={<MyResume />} />
          <Route path="/optimizer" element={<Optimizer />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
)
```

#### `client/src/layouts/AuthLayout.jsx` — updated profile section
```jsx
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AuthLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initial = user?.name?.[0]?.toUpperCase() ?? 'U'
  const displayName = user?.name?.split(' ')[0] ?? 'User'

  // Profile section replaces the hardcoded stub:
  return (
    <div className="flex items-center gap-2 text-gray-400 shrink-0">
      <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-sm font-bold text-violet-400">
        {initial}
      </div>
      <span className="text-sm hidden md:block">{displayName}</span>
      <button
        onClick={handleLogout}
        className="text-xs text-gray-500 hover:text-red-400 transition-colors ml-1"
      >
        Logout
      </button>
    </div>
  )
}
```

#### `client/src/pages/Login.jsx` — wired version
```jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    // form with controlled inputs, error display, and loading button state
  )
}
```

#### `client/src/pages/Register.jsx` — wired version
Same pattern as Login but calls `register(name, email, password)` and includes the name field.

---

## Data Models

### User (MongoDB / Mongoose)

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `_id` | ObjectId | Auto | MongoDB default |
| `name` | String | required, trimmed | |
| `email` | String | required, unique, lowercase, trimmed | |
| `password` | String | required, `select: false` | Stored as bcrypt hash |
| `createdAt` | Date | default: `Date.now` | |

### JWT Payload

```json
{ "id": "<MongoDB ObjectId string>", "iat": <timestamp>, "exp": <timestamp> }
```

### API Response Shapes

**Success (register/login):**
```json
{ "success": true, "token": "<jwt>", "user": { "_id": "...", "name": "...", "email": "..." } }
```

**Success (getMe):**
```json
{ "success": true, "user": { "_id": "...", "name": "...", "email": "..." } }
```

**Success (logout):**
```json
{ "success": true, "message": "Logged out" }
```

**Error:**
```json
{ "success": false, "message": "<human-readable reason>" }
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Password hashing — plaintext never stored

*For any* valid plaintext password string, after a User document is saved to the database, the stored `password` field SHALL be a valid bcrypt hash and SHALL NOT equal the original plaintext string.

**Validates: Requirements 1.5**

---

### Property 2: matchPassword round-trip

*For any* plaintext password string, after creating a User with that password, calling `user.matchPassword(samePlaintext)` SHALL return `true`, and calling `user.matchPassword(differentString)` SHALL return `false`.

**Validates: Requirements 1.6**

---

### Property 3: generateToken preserves userId in payload

*For any* userId string (MongoDB ObjectId format), the JWT produced by `generateToken(userId)` SHALL decode (using the same JWT_SECRET) to a payload where `decoded.id === userId`.

**Validates: Requirements 2.2**

---

### Property 4: protect middleware — valid tokens set req.user

*For any* valid userId, a JWT generated with `generateToken(userId)` and presented as `Authorization: Bearer <token>` SHALL cause the protect middleware to set `req.user.id === userId` and call `next()`.

**Validates: Requirements 3.1, 3.2**

---

### Property 5: Register response never contains password

*For any* valid registration payload (non-empty name, valid email, password ≥ 6 chars), the JSON response from `POST /api/auth/register` SHALL NOT contain a `password` field at any nesting level.

**Validates: Requirements 4.2, 4.7**

---

### Property 6: Short passwords are always rejected

*For any* password string of length 0 to 5 (inclusive), `POST /api/auth/register` SHALL respond with HTTP 400 and `{ "success": false }`.

**Validates: Requirements 4.5**

---

### Property 7: Invalid credentials always return 401

*For any* email/password pair where the email does not exist in the database, OR where the email exists but the password does not match, `POST /api/auth/login` SHALL respond with HTTP 401 and `{ "success": false, "message": "Invalid credentials" }`.

**Validates: Requirements 5.5, 5.6**

---

### Property 8: /me response never contains password

*For any* authenticated user, the JSON response from `GET /api/auth/me` SHALL NOT contain a `password` field at any nesting level.

**Validates: Requirements 7.2**

---

### Property 9: axios interceptor attaches token for any token value

*For any* non-empty token string stored in `localStorage['token']`, every request made via the axios `api` instance SHALL have an `Authorization` header equal to `Bearer <token>`.

**Validates: Requirements 9.2**

---

### Property 10: logout clears all auth state

*For any* authenticated AuthContext state (user non-null, token non-null, localStorage has token), calling `logout()` SHALL result in `user === null`, `token === null`, and `localStorage.getItem('token') === null`.

**Validates: Requirements 10.8**

---

### Property 11: login/register token round-trip to localStorage

*For any* successful login or register API response, after the AuthContext function resolves, `localStorage.getItem('token')` SHALL equal the token value returned in the response and SHALL equal the `token` state value in the context.

**Validates: Requirements 10.6, 10.7**

---

## Error Handling

### Backend Error Strategy

All controller functions are wrapped in try/catch. A consistent response shape is maintained:

```js
// Success
res.status(2xx).json({ success: true, ... })

// Validation error
res.status(400).json({ success: false, message: '...' })

// Auth error
res.status(401).json({ success: false, message: '...' })

// Not found
res.status(404).json({ success: false, message: '...' })

// Unexpected server error
res.status(500).json({ success: false, message: 'Server error' })
```

Mongoose `E11000` duplicate key errors (email uniqueness) are caught and translated to a `400 { message: 'Email already registered' }` response.

### Frontend Error Strategy

- `register()` and `login()` in AuthContext let errors propagate (do not swallow).
- Pages catch errors from `useAuth()` functions in their own try/catch and display `err.response?.data?.message` in a visible error element below the form.
- Token-clearing on 401 from `/me` prevents stale token loops.

### Security Notes

- Passwords never appear in API responses — enforced by `select: false` on the schema field and by omitting `password` from all controller response objects.
- JWT is stored in `localStorage` for simplicity in this phase. **Future improvement (Phase N):** Migrate to HttpOnly cookies to prevent XSS token theft. This will require adding a cookie-parser and changing the storage/transmission strategy.
- The protect middleware validates the signature and expiry of the JWT on every protected request.

---

## Testing Strategy

This feature involves a mix of pure logic (JWT signing, bcrypt hashing, middleware validation) and stateful operations (database writes, React context updates).

### Unit Tests (example-based)

- User schema validation — test required fields, unique email, `select: false` on password
- `generateToken` — verify expiry and payload structure
- `protect` middleware with mocked req/res/next — happy path, missing token, invalid token
- AuthContext logout clears state (mock localStorage)
- AuthContext rehydration: success path and 401 error path

### Property-Based Tests

Using **fast-check** (JavaScript) for the backend and frontend logic:

- **Property 1** — Password hashing: generate arbitrary password strings, save user, verify bcrypt hash
- **Property 2** — matchPassword round-trip: for any password, hash then compare returns true; compare with mutation returns false
- **Property 3** — generateToken payload preservation: arbitrary userId strings → decode → verify `id` matches
- **Property 4** — protect middleware: valid token → req.user.id equals original userId
- **Property 5** — Register response shape: arbitrary valid inputs → response has no `password` key
- **Property 6** — Short password rejection: strings of length 0–5 → 400 response
- **Property 7** — Invalid credentials → 401: non-existent email or wrong password always returns 401
- **Property 8** — /me response shape: any authenticated user → no `password` in response
- **Property 9** — Axios interceptor: any token value in localStorage → Authorization header matches
- **Property 10** — Logout idempotence: after logout, auth state is fully cleared regardless of starting state
- **Property 11** — Token round-trip: successful login/register → localStorage token equals context token

Each property test MUST run a minimum of 100 iterations.

Tag format: `// Feature: resume-plus-plus-phase3, Property N: <property title>`

### Integration Tests

- End-to-end register → login → /me flow against a test database
- Duplicate email registration returns 400
- Protected route returns 401 without token

### Not Applicable

Property-based testing is NOT used for:
- Schema structure checks (use unit tests)
- The Mongoose pre-save hook wiring (use unit tests with a real or in-memory MongoDB)
- React component rendering (use snapshot or example-based tests)
