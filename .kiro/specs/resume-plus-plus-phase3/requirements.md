# Requirements Document

## Introduction

Phase 3 of Resume++ implements end-to-end JWT-based user authentication. This phase connects the existing form shells (Login, Register) to a real backend, introduces a User model with secure password hashing, creates protected API routes, and adds an AuthContext to the React frontend so all protected pages require a valid session. No OAuth is included — JWT tokens are stored in localStorage for simplicity, with a documented path to HttpOnly cookies in a future phase.

## Glossary

- **Server**: The Express.js backend running on port 5000.
- **Client**: The React/Vite frontend running on port 5173.
- **AuthController**: The module containing register, login, logout, and getMe handler functions.
- **Protect**: The Express middleware that validates a Bearer JWT on incoming requests.
- **AuthContext**: The React context that holds user state and exposes auth functions to the component tree.
- **ProtectedRoute**: A React component that guards authenticated routes, redirecting unauthenticated users to `/login`.
- **JWT**: JSON Web Token — a signed, stateless credential issued by the Server and stored in the Client's localStorage.
- **User**: A registered application user with name, email, hashed password, and creation timestamp.
- **Token**: A JWT string returned on successful register or login, used to authenticate subsequent requests.
- **API**: The set of HTTP endpoints exposed by the Server under the `/api` prefix.

---

## Requirements

### Requirement 1: User Model

**User Story:** As a developer, I want a Mongoose User model, so that user data is validated and passwords are stored securely.

#### Acceptance Criteria

1. THE User model SHALL define a `name` field of type String that is required and trimmed.
2. THE User model SHALL define an `email` field of type String that is required, unique, lowercased, and trimmed.
3. THE User model SHALL define a `password` field of type String that is required.
4. THE User model SHALL define a `createdAt` field of type Date with a default value of `Date.now`.
5. WHEN a User document is saved and the `password` field has been modified, THE User model SHALL hash the password using bcryptjs with 10 salt rounds before persisting it.
6. THE User model SHALL expose a `matchPassword(enteredPassword)` instance method that returns a Promise resolving to `true` when `enteredPassword` matches the stored hash and `false` otherwise.
7. WHEN a Mongoose query selects a User document, THE User model SHALL NOT return the `password` field by default unless explicitly requested with `.select('+password')`.

---

### Requirement 2: JWT Utility

**User Story:** As a developer, I want a reusable JWT helper, so that token generation logic is not duplicated across controllers.

#### Acceptance Criteria

1. THE JWT Utility SHALL export a `generateToken(userId)` function.
2. WHEN `generateToken(userId)` is called, THE JWT Utility SHALL sign a JWT containing the `userId` as payload using `process.env.JWT_SECRET`.
3. WHEN `generateToken(userId)` is called, THE JWT Utility SHALL set the token expiry to `'7d'`.
4. WHEN `generateToken(userId)` is called, THE JWT Utility SHALL return the signed JWT string.

---

### Requirement 3: Auth Middleware

**User Story:** As a developer, I want a `protect` middleware, so that only authenticated users can access protected API routes.

#### Acceptance Criteria

1. WHEN a request arrives with an `Authorization` header containing a valid `Bearer <token>`, THE Protect middleware SHALL verify the token using `process.env.JWT_SECRET`.
2. WHEN the token is valid, THE Protect middleware SHALL attach `req.user` as an object containing the decoded `id` field and call `next()`.
3. WHEN no `Authorization` header is present, THE Protect middleware SHALL respond with HTTP 401 and JSON body `{ "success": false, "message": "Not authorized, no token" }`.
4. WHEN the `Authorization` header is present but the token is invalid or expired, THE Protect middleware SHALL respond with HTTP 401 and JSON body `{ "success": false, "message": "Not authorized, token failed" }`.

---

### Requirement 4: Register Endpoint

**User Story:** As a new user, I want to register with name, email, and password, so that I can create an account and receive a JWT.

#### Acceptance Criteria

1. THE Server SHALL expose a `POST /api/auth/register` endpoint.
2. WHEN `name`, `email`, and `password` are all provided and valid, THE AuthController SHALL create a new User document, generate a JWT, and respond with HTTP 201 and JSON body `{ "success": true, "token": "<jwt>", "user": { "_id": "...", "name": "...", "email": "..." } }`.
3. WHEN the `name` field is missing or empty, THE AuthController SHALL respond with HTTP 400 and JSON body `{ "success": false, "message": "Name is required" }`.
4. WHEN the `email` field is missing or not a valid email format, THE AuthController SHALL respond with HTTP 400 and JSON body `{ "success": false, "message": "Valid email is required" }`.
5. WHEN the `password` field is fewer than 6 characters, THE AuthController SHALL respond with HTTP 400 and JSON body `{ "success": false, "message": "Password must be at least 6 characters" }`.
6. WHEN the provided `email` already exists in the database, THE AuthController SHALL respond with HTTP 400 and JSON body `{ "success": false, "message": "Email already registered" }`.
7. THE AuthController SHALL NOT include the `password` field in any success response.

---

### Requirement 5: Login Endpoint

**User Story:** As a returning user, I want to log in with email and password, so that I receive a JWT to access protected features.

#### Acceptance Criteria

1. THE Server SHALL expose a `POST /api/auth/login` endpoint.
2. WHEN a valid `email` and `password` are provided and match a User record, THE AuthController SHALL generate a JWT and respond with HTTP 200 and JSON body `{ "success": true, "token": "<jwt>", "user": { "_id": "...", "name": "...", "email": "..." } }`.
3. WHEN the `email` field is missing or not a valid email format, THE AuthController SHALL respond with HTTP 400 and JSON body `{ "success": false, "message": "Valid email is required" }`.
4. WHEN the `password` field is missing or empty, THE AuthController SHALL respond with HTTP 400 and JSON body `{ "success": false, "message": "Password is required" }`.
5. WHEN no User record exists for the provided `email`, THE AuthController SHALL respond with HTTP 401 and JSON body `{ "success": false, "message": "Invalid credentials" }`.
6. WHEN the User record exists but `password` does not match the stored hash, THE AuthController SHALL respond with HTTP 401 and JSON body `{ "success": false, "message": "Invalid credentials" }`.
7. THE AuthController SHALL NOT include the `password` field in any success response.

---

### Requirement 6: Logout Endpoint

**User Story:** As an authenticated user, I want a logout endpoint, so that the client has a clear API contract for ending a session.

#### Acceptance Criteria

1. THE Server SHALL expose a `POST /api/auth/logout` endpoint.
2. WHEN `POST /api/auth/logout` is called, THE AuthController SHALL respond with HTTP 200 and JSON body `{ "success": true, "message": "Logged out" }`.
3. THE logout endpoint SHALL NOT require authentication (JWT tokens are stateless; token removal is handled client-side).

---

### Requirement 7: Get Current User Endpoint

**User Story:** As an authenticated user, I want a `GET /api/auth/me` endpoint, so that the frontend can rehydrate user state after a page refresh.

#### Acceptance Criteria

1. THE Server SHALL expose a `GET /api/auth/me` endpoint protected by the Protect middleware.
2. WHEN a valid Bearer token is provided, THE AuthController SHALL look up the User by `req.user.id`, exclude the `password` field, and respond with HTTP 200 and JSON body `{ "success": true, "user": { "_id": "...", "name": "...", "email": "..." } }`.
3. WHEN the user associated with the token no longer exists in the database, THE AuthController SHALL respond with HTTP 404 and JSON body `{ "success": false, "message": "User not found" }`.

---

### Requirement 8: Auth Router and Server Wiring

**User Story:** As a developer, I want the auth routes mounted in server.js, so that all `/api/auth/*` requests are handled by the auth router.

#### Acceptance Criteria

1. THE Server SHALL mount the auth router at `/api/auth` using `app.use('/api/auth', authRouter)`.
2. THE Server SHALL import and register the auth router after all middleware is applied and before the server starts listening.

---

### Requirement 9: Axios API Instance

**User Story:** As a frontend developer, I want a configured axios instance, so that all API calls automatically attach the Authorization header when a token is present.

#### Acceptance Criteria

1. THE Client SHALL export an axios instance configured with `baseURL: '/api'`.
2. WHEN a token exists in `localStorage` under the key `'token'`, THE axios instance's request interceptor SHALL attach an `Authorization: Bearer <token>` header to every outgoing request.
3. WHEN no token exists in `localStorage`, THE axios instance SHALL send requests without an Authorization header.

---

### Requirement 10: AuthContext

**User Story:** As a frontend developer, I want an AuthContext, so that authentication state and functions are accessible throughout the component tree without prop drilling.

#### Acceptance Criteria

1. THE AuthContext SHALL maintain `user` state (object or null), `token` state (string or null), and `loading` state (boolean).
2. WHEN the AuthProvider mounts and a token is present in `localStorage`, THE AuthContext SHALL call `GET /api/auth/me` to rehydrate `user` state.
3. WHEN the `GET /api/auth/me` call returns HTTP 401 or fails, THE AuthContext SHALL clear `token` from state and `localStorage` and set `user` to null.
4. WHEN the `GET /api/auth/me` call completes (success or failure), THE AuthContext SHALL set `loading` to `false`.
5. WHEN no token is present in `localStorage` on mount, THE AuthContext SHALL set `loading` to `false` immediately without making an API call.
6. THE AuthContext SHALL expose a `register(name, email, password)` function that calls `POST /api/auth/register`, stores the returned token in `localStorage` and state, sets `user` state, and returns the response data.
7. THE AuthContext SHALL expose a `login(email, password)` function that calls `POST /api/auth/login`, stores the returned token in `localStorage` and state, sets `user` state, and returns the response data.
8. THE AuthContext SHALL expose a `logout()` function that clears `user` and `token` state and removes the token from `localStorage`.
9. THE AuthContext SHALL expose an `isAuthenticated` boolean derived from `!!user`.
10. IF an API call from `register` or `login` fails, THE AuthContext SHALL propagate the error so the calling component can display it.

---

### Requirement 11: ProtectedRoute Component

**User Story:** As a developer, I want a ProtectedRoute component, so that unauthenticated users are redirected to the login page when they try to access protected pages.

#### Acceptance Criteria

1. WHILE `loading` is `true` in AuthContext, THE ProtectedRoute SHALL render a full-screen loading spinner.
2. WHEN `loading` is `false` and `isAuthenticated` is `false`, THE ProtectedRoute SHALL redirect the user to `/login` using `<Navigate to="/login" replace />`.
3. WHEN `loading` is `false` and `isAuthenticated` is `true`, THE ProtectedRoute SHALL render `<Outlet />` so child routes are displayed inside AuthLayout.

---

### Requirement 12: App.jsx Integration

**User Story:** As a developer, I want App.jsx updated to use AuthProvider and ProtectedRoute, so that auth state is available app-wide and protected routes enforce authentication.

#### Acceptance Criteria

1. THE App SHALL wrap the entire `<BrowserRouter>` tree in `<AuthProvider>`.
2. THE App SHALL replace the bare `<Route element={<AuthLayout />}>` wrapper for protected routes with `<Route element={<ProtectedRoute />}>`, where ProtectedRoute renders AuthLayout internally.
3. WHEN ProtectedRoute is used, THE App SHALL ensure AuthLayout is rendered as part of ProtectedRoute's output (not as a separate route wrapper).

---

### Requirement 13: AuthLayout User Display

**User Story:** As an authenticated user, I want to see my real name in the navigation bar, so that I know I am logged in.

#### Acceptance Criteria

1. WHEN the user is authenticated, THE AuthLayout SHALL read `user` from AuthContext and display `user.name` (or the first word of the name) in the profile area.
2. WHEN the user is authenticated, THE AuthLayout SHALL display the first letter of `user.name` as the avatar initial instead of the hardcoded `'U'`.
3. THE AuthLayout SHALL include a logout button or link that calls the `logout()` function from AuthContext when clicked.
4. WHEN the logout function is called from AuthLayout, THE AuthLayout SHALL navigate the user to `/login`.

---

### Requirement 14: Login Page Wiring

**User Story:** As a user, I want the Login form to call the real API, so that I can authenticate and be redirected to my dashboard.

#### Acceptance Criteria

1. THE Login page SHALL maintain controlled state for `email` and `password` input fields.
2. WHEN the form is submitted, THE Login page SHALL call `login(email, password)` from AuthContext.
3. WHILE the API call is in progress, THE Login page SHALL disable the submit button and show a loading indicator within it.
4. WHEN the login call succeeds, THE Login page SHALL navigate the user to `/dashboard`.
5. IF the login call fails, THE Login page SHALL display the error message from the API response below the form.
6. WHEN an error message is displayed and the user modifies an input, THE Login page SHALL clear the error message.

---

### Requirement 15: Register Page Wiring

**User Story:** As a new user, I want the Register form to call the real API, so that I can create an account and be redirected to my dashboard.

#### Acceptance Criteria

1. THE Register page SHALL maintain controlled state for `name`, `email`, and `password` input fields.
2. WHEN the form is submitted, THE Register page SHALL call `register(name, email, password)` from AuthContext.
3. WHILE the API call is in progress, THE Register page SHALL disable the submit button and show a loading indicator within it.
4. WHEN the register call succeeds, THE Register page SHALL navigate the user to `/dashboard`.
5. IF the register call fails, THE Register page SHALL display the error message from the API response below the form.
6. WHEN an error message is displayed and the user modifies an input, THE Register page SHALL clear the error message.
