# Implementation Plan: Resume++ Phase 3 — Full JWT Authentication

## Overview

Implement end-to-end JWT authentication across the Express backend and React frontend. Work flows in six waves: backend foundation (User model, JWT utility, auth middleware) → backend routes (controller + router) → backend checkpoint → frontend foundation (axios instance, AuthContext, ProtectedRoute) → frontend wiring (App.jsx, AuthLayout, Login, Register) → final verification.

Language: **JavaScript** (Node.js / Express backend, React 18 frontend).

---

## Tasks

- [x] 1. Create User Mongoose model (`server/models/User.js`)
  - Define `name` (String, required, trim), `email` (String, required, unique, lowercase, trim), `password` (String, required, `select: false`), `createdAt` (Date, default: `Date.now`) fields
  - Add pre-save hook: `if (!this.isModified('password')) return next()` then `bcrypt.genSalt(10)` → `bcrypt.hash`
  - Add instance method `matchPassword(enteredPassword)` returning `bcrypt.compare(enteredPassword, this.password)`
  - Export as `mongoose.model('User', UserSchema)`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 2. Create JWT utility (`server/utils/jwt.js`)
  - Export `generateToken(userId)` that calls `jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' })` and returns the token string
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3. Create auth middleware (`server/middleware/auth.js`)
  - Export `protect` async function
  - Extract token from `req.headers.authorization` if it starts with `'Bearer '`
  - If no token: `return res.status(401).json({ success: false, message: 'Not authorized, no token' })`
  - Use `jwt.verify(token, process.env.JWT_SECRET)` in a try/catch
  - On success: set `req.user = { id: decoded.id }` and call `next()`
  - On catch: `return res.status(401).json({ success: false, message: 'Not authorized, token failed' })`
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Create auth controller (`server/controllers/authController.js`)
  - [x] 4.1 Implement `register` handler
    - Destructure `{ name, email, password }` from `req.body`
    - Validate: name required, email matches regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, password length >= 6 — return 400 with appropriate message for each failure
    - Check existing user with `User.findOne({ email })` — return 400 `'Email already registered'` if found
    - Create user: `User.create({ name, email, password })` (pre-save hook hashes password)
    - Return `res.status(201).json({ success: true, token: generateToken(user._id), user: { _id: user._id, name: user.name, email: user.email } })`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  - [x] 4.2 Implement `login` handler
    - Validate email format and password presence — return 400 with appropriate messages
    - Find user: `User.findOne({ email }).select('+password')` — if not found, return 401 `'Invalid credentials'`
    - Call `user.matchPassword(password)` — if false, return 401 `'Invalid credentials'`
    - Return `res.status(200).json({ success: true, token: generateToken(user._id), user: { _id: user._id, name: user.name, email: user.email } })`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  - [x] 4.3 Implement `logout` handler
    - Return `res.status(200).json({ success: true, message: 'Logged out' })`
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 4.4 Implement `getMe` handler
    - Find user: `User.findById(req.user.id)` (no `+password` needed — `select: false` keeps it out)
    - If not found: return 404 `{ success: false, message: 'User not found' }`
    - Return `res.status(200).json({ success: true, user })`
    - _Requirements: 7.1, 7.2, 7.3_

- [ ] 5. Create auth router and wire into server.js
  - [x] 5.1 Create `server/routes/auth.js`
    - Import `express.Router()`, import `{ register, login, logout, getMe }` from authController, import `{ protect }` from middleware/auth
    - Register routes: `router.post('/register', register)`, `router.post('/login', login)`, `router.post('/logout', logout)`, `router.get('/me', protect, getMe)`
    - Export router
    - _Requirements: 4.1, 5.1, 6.1, 7.1, 8.1_
  - [x] 5.2 Update `server/server.js`
    - Add `const authRouter = require('./routes/auth')`
    - Add `app.use('/api/auth', authRouter)` after the existing middleware lines and before `connectDB().then(...)`
    - _Requirements: 8.1, 8.2_

- [x] 6. Backend checkpoint — verify server starts and routes are registered
  - Confirm `server/server.js` imports auth router and mounts it at `/api/auth`
  - Confirm all five new server files exist: `models/User.js`, `utils/jwt.js`, `middleware/auth.js`, `controllers/authController.js`, `routes/auth.js`
  - Confirm no syntax errors by reviewing require/export chains
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Create axios API instance (`client/src/services/api.js`)
  - Create the file (remove the `.gitkeep` if needed)
  - `import axios from 'axios'`
  - `const api = axios.create({ baseURL: '/api' })`
  - Add request interceptor: read `localStorage.getItem('token')`, if present set `config.headers.Authorization = \`Bearer \${token}\``; return config
  - `export default api`
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 8. Create AuthContext (`client/src/context/AuthContext.jsx`)
  - Create the file (remove the `.gitkeep` if needed)
  - `import { createContext, useContext, useState, useEffect } from 'react'` and `import api from '../services/api'`
  - Declare `AuthContext = createContext(null)`
  - In `AuthProvider`: state `user` (null), `token` (from localStorage), `loading` (true)
  - `useEffect` on mount: if no token → `setLoading(false)`; else call `api.get('/auth/me')` → setUser on success; on catch clear token and localStorage then setUser(null); always `setLoading(false)` in finally
  - `register(name, email, password)`: `api.post('/auth/register', ...)` → `localStorage.setItem('token', data.token)` → `setToken` → `setUser` → return data
  - `login(email, password)`: same pattern with `/auth/login`
  - `logout()`: `setUser(null)`, `setToken(null)`, `localStorage.removeItem('token')`
  - Provide `{ user, token, loading, isAuthenticated: !!user, register, login, logout }` via context value
  - Export `AuthProvider` and `useAuth` hook
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10_

- [x] 9. Create ProtectedRoute component (`client/src/components/ProtectedRoute.jsx`)
  - `import { Navigate, Outlet } from 'react-router-dom'`
  - `import { useAuth } from '../context/AuthContext'`
  - `import AuthLayout from '../layouts/AuthLayout'`
  - If `loading`: render a centered full-screen spinner div (use the violet spin animation matching the existing style: `w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin`)
  - If `!isAuthenticated`: return `<Navigate to="/login" replace />`
  - Otherwise: return `<AuthLayout />` (AuthLayout renders `<Outlet />` internally, which will render the matched child route)
  - _Requirements: 11.1, 11.2, 11.3_

- [x] 10. Update `client/src/App.jsx` — AuthProvider + ProtectedRoute
  - Add imports: `import { AuthProvider } from './context/AuthContext'` and `import ProtectedRoute from './components/ProtectedRoute'`
  - Wrap the entire JSX return (including `<BrowserRouter>`) in `<AuthProvider>...</AuthProvider>`
  - Replace `<Route element={<AuthLayout />}>` (the protected wrapper) with `<Route element={<ProtectedRoute />}>`
  - Remove the `AuthLayout` import if it is no longer used directly in App.jsx (it is now imported in ProtectedRoute.jsx)
  - Verify all seven protected child routes (`/dashboard`, `/jobs`, `/jobs/saved`, `/job/:id`, `/resume/create`, `/resume`, `/optimizer`) remain nested under the ProtectedRoute wrapper
  - _Requirements: 12.1, 12.2, 12.3_

- [x] 11. Update `client/src/layouts/AuthLayout.jsx` — real user name and logout
  - Add imports: `import { useNavigate } from 'react-router-dom'` and `import { useAuth } from '../context/AuthContext'`
  - Inside the component: `const { user, logout } = useAuth()` and `const navigate = useNavigate()`
  - Derive `initial = user?.name?.[0]?.toUpperCase() ?? 'U'`
  - Derive `displayName = user?.name?.split(' ')[0] ?? 'User'`
  - Replace the hardcoded `'U'` avatar initial with `{initial}`
  - Replace the hardcoded `'User'` span text with `{displayName}`
  - Add a `handleLogout` function: `logout(); navigate('/login')`
  - Add a logout `<button>` next to the name span with `onClick={handleLogout}` — style with `text-xs text-gray-500 hover:text-red-400 transition-colors ml-1` and label `Logout`
  - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [x] 12. Wire `client/src/pages/Login.jsx` to AuthContext
  - Add imports: `import { useState } from 'react'`, `import { useNavigate } from 'react-router-dom'`, `import { useAuth } from '../context/AuthContext'`
  - Inside component: `const { login } = useAuth()`, `const navigate = useNavigate()`
  - Add controlled state: `const [email, setEmail] = useState('')`, `const [password, setPassword] = useState('')`, `const [error, setError] = useState('')`, `const [submitting, setSubmitting] = useState(false)`
  - Wire inputs: `value={email} onChange={(e) => { setError(''); setEmail(e.target.value) }}` (clearing error on change), same for password
  - Implement `handleSubmit`: `e.preventDefault()`, `setError('')`, `setSubmitting(true)`, try `await login(email, password)` then `navigate('/dashboard')`, catch `setError(err?.response?.data?.message || 'Login failed. Please try again.')`, finally `setSubmitting(false)`
  - Update the `<Button>`: `disabled={submitting}` and show `'Signing in...'` text when submitting, `'Sign In'` otherwise
  - Add error display below the form: `{error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}`
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

- [x] 13. Wire `client/src/pages/Register.jsx` to AuthContext
  - Add imports: `import { useState } from 'react'`, `import { useNavigate } from 'react-router-dom'`, `import { useAuth } from '../context/AuthContext'`
  - Inside component: `const { register } = useAuth()`, `const navigate = useNavigate()`
  - Add controlled state: `name`, `email`, `password` (all useState('')), `error` (''), `submitting` (false)
  - Wire all three inputs with `value` + `onChange` (clear error on change)
  - Implement `handleSubmit`: `e.preventDefault()`, `setError('')`, `setSubmitting(true)`, try `await register(name, email, password)` then `navigate('/dashboard')`, catch `setError(err?.response?.data?.message || 'Registration failed. Please try again.')`, finally `setSubmitting(false)`
  - Update the `<Button>`: `disabled={submitting}` and text `'Creating account...'` when submitting, `'Create Account'` otherwise
  - Add error display below the form: `{error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}`
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

- [x] 14. Final checkpoint — build check and full verification
  - Confirm all new files exist:
    - `server/models/User.js`
    - `server/utils/jwt.js`
    - `server/middleware/auth.js`
    - `server/controllers/authController.js`
    - `server/routes/auth.js`
    - `client/src/context/AuthContext.jsx`
    - `client/src/services/api.js`
    - `client/src/components/ProtectedRoute.jsx`
  - Confirm `server/server.js` contains `app.use('/api/auth', authRouter)`
  - Confirm `client/src/App.jsx` wraps with `<AuthProvider>` and uses `<ProtectedRoute />`
  - Run `npm run build` in the `client/` directory and confirm zero build errors
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP (none in this plan — all tasks are core implementation)
- The Vite dev server proxy (`/api` → `http://localhost:5000`) is already configured in `vite.config.js` — no changes needed
- JWT is stored in `localStorage` for simplicity; a future phase should migrate to HttpOnly cookies
- `bcryptjs` and `jsonwebtoken` are already installed in `server/package.json`
- `axios` is already installed in `client/package.json`
- All protected routes in App.jsx use `<ProtectedRoute />` as the layout wrapper — ProtectedRoute renders AuthLayout which renders `<Outlet />`

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["1", "2", "3"],
      "description": "Backend foundation — User model, JWT utility, auth middleware (parallel)"
    },
    {
      "wave": 2,
      "tasks": ["4", "5"],
      "description": "Backend routes — auth controller and router wired into server.js"
    },
    {
      "wave": 3,
      "tasks": ["6"],
      "description": "Backend checkpoint — verify all server files exist and compile"
    },
    {
      "wave": 4,
      "tasks": ["7", "8", "9"],
      "description": "Frontend foundation — axios instance, AuthContext, ProtectedRoute (parallel)"
    },
    {
      "wave": 5,
      "tasks": ["10", "11", "12", "13"],
      "description": "Frontend wiring — App.jsx, AuthLayout, Login, Register pages"
    },
    {
      "wave": 6,
      "tasks": ["14"],
      "description": "Final verification — build check and file existence verification"
    }
  ]
}
```
