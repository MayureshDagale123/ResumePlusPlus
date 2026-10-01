# Design Document — Resume++ Phase 2: Frontend Layout & Theme

## Overview

Phase 2 builds the complete visual shell of the Resume++ React application. The goal is a fully routed, consistently themed, and visually polished frontend with no backend dependency. Every page is reachable, every layout is functional, and the design system is fully defined. Authentication enforcement and real data fetching are deferred to Phase 3.

The tech stack for this phase:
- **React 18** + **Vite 5**
- **React Router DOM v6** (already installed)
- **Tailwind CSS v3** (already installed)
- **No new npm dependencies** — everything is built from existing installs

---

## Architecture

```
client/src/
├── App.jsx                        ← Router root, AppLoader, CursorSpotlight
├── index.css                      ← Tailwind directives + CSS custom props + scrollbar
├── components/
│   ├── AppLoader.jsx              ← Full-screen branded loader (1.5s)
│   ├── CursorSpotlight.jsx        ← Mouse-tracking violet glow overlay
│   └── ui/
│       ├── Button.jsx             ← Reusable button (filled | outline | ghost)
│       └── Card.jsx               ← Reusable dark card wrapper
├── layouts/
│   ├── PublicLayout.jsx           ← Navbar + Outlet + Footer (for public pages)
│   └── AuthLayout.jsx             ← Top bar with nav tabs + Outlet (for protected pages)
└── pages/
    ├── Landing.jsx                ← Full 6-section landing page
    ├── Register.jsx               ← Form shell
    ├── Login.jsx                  ← Form shell
    ├── Dashboard.jsx              ← Static shell
    ├── FindJobs.jsx               ← Static shell
    ├── SavedJobs.jsx              ← Static shell
    ├── JobDetails.jsx             ← Static shell (shows :id param)
    ├── CreateResume.jsx           ← Static shell
    ├── MyResume.jsx               ← Static shell
    ├── Optimizer.jsx              ← Static shell
    └── NotFound.jsx               ← 404 page
```

**Data flow for Phase 2:** All data is static/hardcoded. No `useEffect` fetches, no axios calls, no context providers for auth state. The routing tree is defined once in `App.jsx` and all navigation uses React Router's `<Link>` and `useNavigate`.

---

## Components and Interfaces

### App.jsx

The root component. Responsibilities:
1. Wrap everything in `<BrowserRouter>`
2. Mount `<CursorSpotlight />` once (outside the route tree, inside BrowserRouter)
3. Manage `loading` state (boolean, starts `true`)
4. Render `<AppLoader />` when `loading === true`
5. Render `<Routes>` when `loading === false`

```jsx
// App.jsx structure
function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <BrowserRouter>
      <CursorSpotlight />
      {loading ? (
        <AppLoader />
      ) : (
        <Routes>
          {/* Public routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
          </Route>
          {/* Protected routes */}
          <Route element={<AuthLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/jobs" element={<FindJobs />} />
            <Route path="/jobs/saved" element={<SavedJobs />} />
            <Route path="/job/:id" element={<JobDetails />} />
            <Route path="/resume/create" element={<CreateResume />} />
            <Route path="/resume" element={<MyResume />} />
            <Route path="/optimizer" element={<Optimizer />} />
          </Route>
          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}
```

### AppLoader Component

File: `client/src/components/AppLoader.jsx`

Full-screen overlay, rendered while `loading === true` in App. Uses a CSS keyframe animation for a pulsing violet ring or spinner. No JS animation loop.

```jsx
// AppLoader.jsx
export default function AppLoader() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        {/* Pulsing logo text */}
        <span className="text-3xl font-bold text-violet-500 animate-pulse">
          Resume++
        </span>
        {/* Violet spinner ring */}
        <div className="w-10 h-10 rounded-full border-2 border-gray-800 border-t-violet-500 animate-spin" />
      </div>
    </div>
  );
}
```

Tailwind classes used:
- `fixed inset-0` — covers viewport
- `bg-black` — black background
- `animate-pulse` — CSS pulse keyframe (built into Tailwind)
- `animate-spin` — CSS spin keyframe (built into Tailwind)
- `border-t-violet-500` — violet top border creates spinner arc

### CursorSpotlight Component

File: `client/src/components/CursorSpotlight.jsx`

Tracks mouse position and renders a radial gradient overlay. Must be performant — updates only CSS custom properties, no React re-renders on mousemove.

```jsx
// CursorSpotlight.jsx
import { useEffect, useRef } from 'react';

export default function CursorSpotlight() {
  const spotlightRef = useRef(null);

  useEffect(() => {
    // Don't attach on touch devices
    if ('ontouchstart' in window) return;

    const el = spotlightRef.current;
    if (!el) return;

    const handleMouseMove = (e) => {
      el.style.setProperty('--mouse-x', `${e.clientX}px`);
      el.style.setProperty('--mouse-y', `${e.clientY}px`);
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Don't render on touch devices
  if ('ontouchstart' in window) return null;

  return (
    <div
      ref={spotlightRef}
      className="pointer-events-none fixed inset-0 z-30"
      style={{
        background: `radial-gradient(
          600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
          rgba(139, 92, 246, 0.08),
          transparent 80%
        )`,
      }}
    />
  );
}
```

Key design decisions:
- Uses `useRef` to get a direct DOM reference — avoids React state updates on every mousemove
- `--mouse-x` / `--mouse-y` CSS custom properties are mutated directly on the element
- Initial values default to `50% 50%` so the gradient is centered before any mouse event
- `pointer-events: none` ensures the overlay never intercepts clicks
- `z-index: 30` — above page content but below modals (which would use z-50+)

### Button Component

File: `client/src/components/ui/Button.jsx`

```jsx
// Button.jsx
const variants = {
  filled: 'bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors duration-200',
  outline: 'border border-violet-500 text-violet-400 hover:bg-violet-500/10 font-medium transition-colors duration-200',
  ghost: 'text-gray-400 hover:text-white hover:bg-gray-800 font-medium transition-colors duration-200',
};

export default function Button({
  variant = 'filled',
  className = '',
  children,
  ...props
}) {
  return (
    <button
      className={`px-5 py-2.5 rounded-lg text-sm ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

### Card Component

File: `client/src/components/ui/Card.jsx`

```jsx
// Card.jsx
export default function Card({ className = '', children, ...props }) {
  return (
    <div
      className={`bg-gray-900 border border-gray-800 rounded-xl p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
```

---

## Layouts

### PublicLayout

File: `client/src/layouts/PublicLayout.jsx`

Uses React Router's `<Outlet />` for nested route content.

```jsx
// PublicLayout.jsx
import { Link, Outlet } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-white">
            <img src="/logo.jpeg" alt="Resume++" className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="outline" className="text-sm">Login</Button>
            </Link>
            <Link to="/register">
              <Button variant="filled" className="text-sm">Register</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Page content — padded for fixed navbar height */}
      <main className="flex-1 pt-16">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-black border-t border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-2 text-center">
          <span className="text-lg font-bold text-white">Resume++</span>
          <p className="text-gray-400 text-sm">Find relevant jobs and optimize your resume with AI.</p>
          <p className="text-gray-600 text-xs">© {new Date().getFullYear()} Resume++. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
```

Key classes:
- `bg-black/80 backdrop-blur-md` — frosted-glass navbar
- `fixed top-0` + `pt-16` on main — navbar doesn't overlap content
- `border-b border-gray-800` — subtle navbar bottom divider

### AuthLayout

File: `client/src/layouts/AuthLayout.jsx`

Uses `useLocation()` to determine which tab is active.

```jsx
// AuthLayout.jsx
import { Link, Outlet, useLocation } from 'react-router-dom';

const NAV_TABS = [
  { label: 'Dashboard',         path: '/dashboard' },
  { label: 'Find Jobs',         path: '/jobs' },
  { label: 'Saved Jobs',        path: '/jobs/saved' },
  { label: 'Create Resume',     path: '/resume/create' },
  { label: 'My Resume',         path: '/resume' },
  { label: 'Resume Optimizer',  path: '/optimizer' },
];

export default function AuthLayout() {
  const { pathname } = useLocation();

  const isActive = (path) => {
    // Exact match, or prefix match for nested routes
    return pathname === path || pathname.startsWith(path + '/');
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#0a0a0a] border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/dashboard" className="shrink-0">
            <img src="/logo.jpeg" alt="Resume++" className="h-8 w-auto" />
          </Link>

          {/* Nav tabs */}
          <nav className="flex items-center gap-1">
            {NAV_TABS.map((tab) => (
              <Link
                key={tab.path}
                to={tab.path}
                className={`
                  px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150
                  ${isActive(tab.path)
                    ? 'text-violet-400 bg-violet-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }
                `}
              >
                {tab.label}
              </Link>
            ))}
          </nav>

          {/* Profile stub */}
          <div className="flex items-center gap-2 text-gray-400">
            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-sm font-bold text-violet-400">
              U
            </div>
            <span className="text-sm hidden md:block">User</span>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 pt-16 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
```

Active tab styling: `text-violet-400 bg-violet-500/10` — violet text with a very subtle violet-tinted background. No underline approach is used to keep it clean.

---

## Data Models

Phase 2 has no data models — all content is hardcoded. The only dynamic value is the `:id` route parameter in `JobDetails.jsx`, read via `useParams()`.

For reference, the Landing page hardcodes these data shapes:

```js
// Hardcoded in Landing.jsx — no import needed
const HOW_IT_WORKS = [
  { step: 1, title: 'Find Jobs',              desc: 'Search thousands of listings tailored to your profile.' },
  { step: 2, title: 'Save & Review',          desc: 'Bookmark jobs and compare them side-by-side.' },
  { step: 3, title: 'Create/Upload Resume',   desc: 'Build a resume from scratch or upload an existing one.' },
  { step: 4, title: 'Optimize with AI',       desc: 'Let AI tailor your resume to each job description.' },
];

const FEATURES = [
  { icon: '🔍', title: 'Job Search',      desc: 'Find relevant listings from multiple sources in one place.' },
  { icon: '📄', title: 'Resume Builder', desc: 'Create professional resumes with easy-to-use templates.' },
  { icon: '🤖', title: 'AI Optimization', desc: 'Automatically tailor your resume for each job you apply to.' },
  { icon: '📥', title: 'PDF Download',   desc: 'Export your polished resume as a clean, ATS-friendly PDF.' },
];
```

---

## Pages

### Landing.jsx (Full Content)

Six sections in order:

**Section 1: Hero**
```jsx
<section className="min-h-screen flex flex-col items-center justify-center text-center px-6 py-20">
  <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight max-w-3xl">
    Find relevant jobs and{' '}
    <span className="text-violet-400">optimize your resume</span>{' '}
    for them using AI.
  </h1>
  <p className="mt-6 text-gray-400 text-lg max-w-xl">
    Resume++ helps you discover jobs, build a standout resume, and tailor it automatically — all in one place.
  </p>
  <div className="mt-10 flex gap-4 flex-wrap justify-center">
    <Button variant="filled" className="px-8 py-3 text-base shadow-[0_0_20px_rgba(139,92,246,0.3)]"
      onClick={() => navigate('/jobs')}>
      Find Jobs
    </Button>
    <Button variant="outline" className="px-8 py-3 text-base"
      onClick={() => navigate('/resume/create')}>
      Create Resume
    </Button>
  </div>
</section>
```

**Section 2: How it works**
```jsx
<section className="py-20 bg-[#0a0a0a]">
  <div className="max-w-5xl mx-auto px-6">
    <h2 className="text-3xl font-bold text-center text-white mb-12">How it works</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
      {HOW_IT_WORKS.map(({ step, title, desc }) => (
        <div key={step} className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-violet-600/20 border border-violet-500/30
                          flex items-center justify-center text-violet-400 font-bold text-lg">
            {step}
          </div>
          <h3 className="text-white font-semibold">{title}</h3>
          <p className="text-gray-400 text-sm">{desc}</p>
        </div>
      ))}
    </div>
  </div>
</section>
```

**Section 3: Core Features**
```jsx
<section className="py-20">
  <div className="max-w-5xl mx-auto px-6">
    <h2 className="text-3xl font-bold text-center text-white mb-12">Core Features</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {FEATURES.map(({ icon, title, desc }) => (
        <Card key={title} className="hover:border-violet-500/50 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]
                                     transition-all duration-300">
          <div className="text-3xl mb-3">{icon}</div>
          <h3 className="text-white font-semibold mb-2">{title}</h3>
          <p className="text-gray-400 text-sm">{desc}</p>
        </Card>
      ))}
    </div>
  </div>
</section>
```

**Section 4: CTA Section**
```jsx
<section className="py-24 bg-[#0a0a0a]">
  <div className="max-w-2xl mx-auto px-6 text-center">
    <h2 className="text-4xl font-bold text-white mb-4">Ready to land your dream job?</h2>
    <p className="text-gray-400 mb-8">Join thousands of job seekers using Resume++ to get hired faster.</p>
    <Button variant="filled" className="px-10 py-3 text-base shadow-[0_0_30px_rgba(139,92,246,0.4)]"
      onClick={() => navigate('/register')}>
      Get Started Free
    </Button>
  </div>
</section>
```

**Section 5: Footer** — rendered by `PublicLayout`, not inside `Landing.jsx` itself.

### Register.jsx and Login.jsx (Form Shells)

Both use a centered card layout on the dark background:

```jsx
// Register.jsx
<div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-6 py-12">
  <Card className="w-full max-w-md">
    <h1 className="text-2xl font-bold text-white mb-6">Create your account</h1>
    <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
      <input placeholder="Full name"  type="text"     className={inputClass} />
      <input placeholder="Email"      type="email"    className={inputClass} />
      <input placeholder="Password"  type="password" className={inputClass} />
      <Button type="submit" variant="filled" className="w-full py-3 mt-2">
        Create Account
      </Button>
    </form>
    <p className="mt-4 text-center text-gray-400 text-sm">
      Already have an account?{' '}
      <Link to="/login" className="text-violet-400 hover:text-violet-300">Sign in</Link>
    </p>
  </Card>
</div>
```

Input base class: `inputClass = "bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-violet-500 transition-colors"`

### Protected Page Shells

Each shell follows this minimal pattern:
```jsx
// Example: Dashboard.jsx
export default function Dashboard() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
      <p className="text-gray-400">Your dashboard content will appear here.</p>
    </div>
  );
}
```

`JobDetails.jsx` additionally reads the route param:
```jsx
import { useParams } from 'react-router-dom';

export default function JobDetails() {
  const { id } = useParams();
  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-white mb-2">Job Details</h1>
      <p className="text-gray-500 text-sm mb-6">Job ID: <span className="text-violet-400">{id}</span></p>
      <p className="text-gray-400">Job details for this listing will appear here.</p>
    </div>
  );
}
```

### NotFound.jsx

```jsx
export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center px-6">
      <h1 className="text-8xl font-bold text-violet-500 mb-4">404</h1>
      <h2 className="text-2xl font-bold text-white mb-3">Page not found</h2>
      <p className="text-gray-400 mb-8">The page you're looking for doesn't exist or has been moved.</p>
      <Button variant="filled" onClick={() => navigate('/')}>Back to Home</Button>
    </div>
  );
}
```

---

## Global Theme

### tailwind.config.js

```js
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          400: '#a78bfa',  // violet-400
          500: '#8b5cf6',  // violet-500
          600: '#7c3aed',  // violet-600
        },
      },
    },
  },
  plugins: [],
}
```

Note: All components use `violet-*` Tailwind tokens directly. The `primary` alias is provided for convenience but not required.

### index.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ─── CSS Custom Properties ─────────────────────────────── */
:root {
  --bg-base:     #000000;
  --bg-surface:  #0a0a0a;
  --bg-card:     #111111;
  --bg-elevated: #1a1a1a;
}

/* ─── Base resets ────────────────────────────────────────── */
*, *::before, *::after {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  background-color: #000000;
  color: #f3f4f6;            /* gray-100 */
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
               Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ─── Custom scrollbar ───────────────────────────────────── */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: #1a1a1a;
}
::-webkit-scrollbar-thumb {
  background: #7c3aed;   /* violet-600 */
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #8b5cf6;   /* violet-500 */
}
/* Firefox */
* {
  scrollbar-width: thin;
  scrollbar-color: #7c3aed #1a1a1a;
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Most of Phase 2 consists of fixed UI rendering where example-based tests are more appropriate than property-based tests. However, two genuine universal properties exist across unbounded input spaces:

### Property 1: CursorSpotlight tracks arbitrary mouse coordinates

*For any* pair of (x, y) screen coordinates dispatched via a `mousemove` event, the CursorSpotlight component SHALL reflect those exact coordinates as the gradient center in its inline style (`--mouse-x` = x px, `--mouse-y` = y px).

**Validates: Requirements 9.2, 9.3**

### Property 2: JobDetails displays arbitrary route parameter values

*For any* non-empty string value of the `:id` route parameter, the JobDetails page SHALL render that exact value visibly in its output.

**Validates: Requirements 7.4**

---

## Error Handling

Phase 2 has minimal error handling requirements since there are no API calls:

1. **Missing route params**: `JobDetails` reads `id` from `useParams()`. If somehow accessed without a param, `id` will be `undefined` — the component renders `undefined` which is invisible in JSX. No explicit error state needed for Phase 2.

2. **AppLoader cleanup**: The `setTimeout` in `App.jsx` is cleaned up in the `useEffect` return to prevent state updates on unmounted components.

3. **CursorSpotlight cleanup**: The `mousemove` event listener is removed in the `useEffect` cleanup function.

4. **Form submissions**: Both Register and Login forms call `e.preventDefault()` on submit to prevent unintended page reloads. No error UI is needed in Phase 2.

---

## Testing Strategy

### PBT Applicability Assessment

This feature is primarily a UI layout and routing feature. The vast majority of acceptance criteria are best covered by example-based rendering tests (component renders expected elements) and integration tests (routes resolve to correct components). Only two genuine universal properties exist (see Correctness Properties above).

PBT applies to: Properties 1 and 2 above.
PBT does NOT apply to: All layout, theming, navigation, and static shell criteria.

**Property-based testing library:** [Vitest](https://vitest.dev/) for the test runner + [@fast-check/vitest](https://fast-check.io/) for property-based test generation.

### Unit Tests (Example-Based)

Each component should have a corresponding test verifying:
- Correct heading/text content is rendered
- Navigation links point to the correct routes
- Form fields are present (Register, Login)
- Active tab logic applies correct class for each route (AuthLayout)
- AppLoader disappears after 1500ms (use `vi.useFakeTimers()`)
- CursorSpotlight returns null in touch environments

### Property-Based Tests

**Test for Property 1 — CursorSpotlight coordinate tracking:**
```js
// Using @fast-check/vitest
it.prop([fc.integer({ min: 0, max: 3840 }), fc.integer({ min: 0, max: 2160 })])(
  'CursorSpotlight tracks arbitrary mouse coordinates',
  (x, y) => {
    render(<CursorSpotlight />);
    const el = document.querySelector('[data-testid="cursor-spotlight"]');
    fireEvent.mouseMove(document, { clientX: x, clientY: y });
    expect(el.style.getPropertyValue('--mouse-x')).toBe(`${x}px`);
    expect(el.style.getPropertyValue('--mouse-y')).toBe(`${y}px`);
  }
);
```
Minimum 100 iterations. Tag: **Feature: resume-plus-plus-phase2, Property 1: CursorSpotlight tracks arbitrary mouse coordinates**

**Test for Property 2 — JobDetails route param display:**
```js
it.prop([fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)])(
  'JobDetails displays arbitrary route parameter values',
  (id) => {
    render(
      <MemoryRouter initialEntries={[`/job/${id}`]}>
        <Routes>
          <Route path="/job/:id" element={<JobDetails />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(id)).toBeInTheDocument();
  }
);
```
Minimum 100 iterations. Tag: **Feature: resume-plus-plus-phase2, Property 2: JobDetails displays arbitrary route parameter values**

### Integration Tests

- Verify all 10 routes resolve to the correct components in a full Router render
- Verify PublicLayout wraps public routes and AuthLayout wraps protected routes
- Verify AppLoader → routing transition after 1500ms in the full App component
