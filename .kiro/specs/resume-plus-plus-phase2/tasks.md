# Implementation Plan: Resume++ Phase 2 — Frontend Layout & Theme

## Overview

Build the complete visual shell of the Resume++ React app in five waves. All code is static (no API calls). Each wave builds on the previous. The implementation language is **JavaScript (JSX)** using React 18, Vite 5, React Router DOM v6, and Tailwind CSS v3.

---

## Tasks

- [x] 1. Extend Tailwind config and update global CSS
  - [x] 1.1 Update `client/tailwind.config.js` — add `theme.extend.colors.primary` with `400`, `500`, `600` keys mapped to violet hex values (`#a78bfa`, `#8b5cf6`, `#7c3aed`)
    - _Requirements: 10.1_
  - [x] 1.2 Replace `client/src/index.css` content — add `:root` CSS custom properties (`--bg-base`, `--bg-surface`, `--bg-card`, `--bg-elevated`), `box-sizing: border-box` reset, `html { scroll-behavior: smooth }`, `body` background `#000000` and color `#f3f4f6`, system font stack with `-webkit-font-smoothing: antialiased`, and custom scrollbar styles (`::-webkit-scrollbar`, track `#1a1a1a`, thumb `#7c3aed`, hover `#8b5cf6`; Firefox `scrollbar-width: thin; scrollbar-color: #7c3aed #1a1a1a`)
    - Keep all three `@tailwind` directives at the top
    - _Requirements: 10.2, 10.3, 10.4, 10.5_

- [x] 2. Create reusable UI components
  - [x] 2.1 Create `client/src/components/ui/Button.jsx`
    - Accept `variant` prop (`'filled'` | `'outline'` | `'ghost'`), defaulting to `'filled'`
    - `filled`: `bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors duration-200`
    - `outline`: `border border-violet-500 text-violet-400 hover:bg-violet-500/10 font-medium transition-colors duration-200`
    - `ghost`: `text-gray-400 hover:text-white hover:bg-gray-800 font-medium transition-colors duration-200`
    - Base classes on the `<button>`: `px-5 py-2.5 rounded-lg text-sm`
    - Forward `className`, `onClick`, `type`, `disabled`, `children` via `...props`
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  - [x] 2.2 Create `client/src/components/ui/Card.jsx`
    - Render a `<div>` with base classes `bg-gray-900 border border-gray-800 rounded-xl p-6`
    - Forward `className` (merged after base) and `children` via `...props`
    - _Requirements: 11.6, 11.7, 11.8_
  - [ ]* 2.3 Write unit tests for Button and Card
    - Test that each Button variant renders with the correct distinguishing class (`bg-violet-600` for filled, `border-violet-500` for outline, `hover:bg-gray-800` for ghost)
    - Test that Card renders children and merges the `className` prop
    - _Requirements: 11.1–11.8_

- [x] 3. Create CursorSpotlight and AppLoader components
  - [x] 3.1 Create `client/src/components/CursorSpotlight.jsx`
    - Render a `<div>` with `className="pointer-events-none fixed inset-0 z-30"` and an inline `style` setting `background` to `radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(139, 92, 246, 0.08), transparent 80%)`
    - Use `useRef` to get a direct DOM reference to the div (avoids React re-renders on every mousemove)
    - In `useEffect`, check `if ('ontouchstart' in window) return` before attaching any listener
    - Attach a `mousemove` listener on `document` that calls `el.style.setProperty('--mouse-x', e.clientX + 'px')` and `el.style.setProperty('--mouse-y', e.clientY + 'px')` where `el` is the ref's current node
    - Return a cleanup that removes the listener
    - Add `data-testid="cursor-spotlight"` to the div for testability
    - At render time, if `'ontouchstart' in window`, return `null`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  - [ ]* 3.2 Write property test for CursorSpotlight coordinate tracking
    - **Property 1: CursorSpotlight tracks arbitrary mouse coordinates**
    - Use `@fast-check/vitest` (install as devDependency: `npm install -D @fast-check/vitest fast-check`)
    - Generate arbitrary `(x, y)` integer pairs in `[0, 3840]` × `[0, 2160]`
    - For each pair, render `<CursorSpotlight />`, fire a `mousemove` event with `{ clientX: x, clientY: y }` on `document`, then assert `el.style.getPropertyValue('--mouse-x') === x + 'px'` and `--mouse-y === y + 'px'`
    - Minimum 100 iterations
    - Tag comment: `// Feature: resume-plus-plus-phase2, Property 1: CursorSpotlight tracks arbitrary mouse coordinates`
    - **Validates: Requirements 9.2, 9.3**
  - [ ]* 3.3 Write unit test for CursorSpotlight touch-device suppression
    - Temporarily set `window.ontouchstart = () => {}`, render component, assert it returns `null` / no DOM node is present
    - _Requirements: 9.5_
  - [x] 3.4 Create `client/src/components/AppLoader.jsx`
    - Render a `<div className="fixed inset-0 bg-black flex items-center justify-center z-50">` containing:
      - A `<span className="text-3xl font-bold text-violet-500 animate-pulse">Resume++</span>`
      - A `<div className="w-10 h-10 rounded-full border-2 border-gray-800 border-t-violet-500 animate-spin" />`
    - No props required
    - _Requirements: 8.1, 8.4, 8.5_
  - [ ]* 3.5 Write unit tests for AppLoader
    - Assert that the component renders "Resume++" text and a spinning element
    - Assert the container has `position: fixed` covering the viewport
    - _Requirements: 8.1, 8.4_

- [x] 4. Checkpoint — ensure components build without errors
  - Ensure all tests pass, ask the user if questions arise.
  - Run `npm run build` inside `client/` to confirm no compile errors before proceeding to layouts

- [ ] 5. Create PublicLayout and AuthLayout
  - [x] 5.1 Create `client/src/layouts/PublicLayout.jsx`
    - Import `Link`, `Outlet` from `react-router-dom` and `Button` from `../components/ui/Button`
    - Render a wrapping `<div className="min-h-screen bg-black flex flex-col">`
    - **Navbar** (fixed): `<nav className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-md border-b border-gray-800">` — inner div `max-w-7xl mx-auto px-6 h-16 flex items-center justify-between` — logo (`<Link to="/">` wrapping `<img src="/logo.jpeg" className="h-8 w-auto" />`) on left — Login (outline Button) + Register (filled Button) links on right
    - **Main**: `<main className="flex-1 pt-16"><Outlet /></main>` — `pt-16` compensates for fixed navbar
    - **Footer**: `<footer className="bg-black border-t border-gray-800 py-8">` — centered logo, tagline text, and `© {new Date().getFullYear()} Resume++. All rights reserved.`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - [x] 5.2 Create `client/src/layouts/AuthLayout.jsx`
    - Import `Link`, `Outlet`, `useLocation` from `react-router-dom`
    - Define `NAV_TABS` array: `[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Find Jobs', path: '/jobs' }, { label: 'Saved Jobs', path: '/jobs/saved' }, { label: 'Create Resume', path: '/resume/create' }, { label: 'My Resume', path: '/resume' }, { label: 'Resume Optimizer', path: '/optimizer' }]`
    - `isActive(path)` helper: `pathname === path || pathname.startsWith(path + '/')`
    - Render a `<header className="fixed top-0 left-0 right-0 z-40 bg-[#0a0a0a] border-b border-gray-800">`  — inner `max-w-7xl mx-auto px-6 h-16 flex items-center justify-between`
    - Logo (`<Link to="/dashboard">`) on left
    - `<nav className="flex items-center gap-1">` in center — map `NAV_TABS` to `<Link>` elements with active class `text-violet-400 bg-violet-500/10` vs inactive `text-gray-400 hover:text-white hover:bg-gray-800`; base classes: `px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150`
    - Profile stub on right: `<div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-sm font-bold text-violet-400">U</div>` + `<span className="text-sm hidden md:block">User</span>`
    - Page content: `<main className="flex-1 pt-16 overflow-y-auto"><Outlet /></main>`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - [ ]* 5.3 Write unit tests for PublicLayout
    - Assert navbar renders logo img, Login link (`href="/login"`), Register link (`href="/register"`)
    - Assert footer renders copyright text
    - _Requirements: 2.1, 2.2_
  - [ ]* 5.4 Write unit tests for AuthLayout
    - For each of the 6 nav tabs, render AuthLayout with that route active (via MemoryRouter) and assert the tab gets the `bg-violet-500/10` class; assert other tabs do not
    - _Requirements: 3.2, 3.3_

- [x] 6. Create all page shell components
  - [x] 6.1 Create `client/src/pages/Register.jsx`
    - Centered layout: `<div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-6 py-12">`
    - Card wrapper containing: heading "Create your account", a `<form onSubmit={(e) => e.preventDefault()}>` with three inputs (Full name / text, Email / email, Password / password) and a filled Button ("Create Account", `type="submit"`, `className="w-full py-3 mt-2"`)
    - Input class: `bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-violet-500 transition-colors w-full`
    - Below form: paragraph with `<Link to="/login" className="text-violet-400 hover:text-violet-300">Sign in</Link>`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [x] 6.2 Create `client/src/pages/Login.jsx`
    - Same layout as Register but with two inputs (Email / email, Password / password) and submit Button labeled "Sign In"
    - Link below form pointing to `/register` with text "Create an account"
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - [x] 6.3 Create `client/src/pages/Dashboard.jsx`, `FindJobs.jsx`, `SavedJobs.jsx`, `CreateResume.jsx`, `MyResume.jsx`, `Optimizer.jsx`
    - Each follows: `<div className="max-w-7xl mx-auto px-6 py-10">` containing `<h1 className="text-3xl font-bold text-white mb-2">[Page Name]</h1>` + `<p className="text-gray-400">[Page] content will appear here.</p>`
    - Use the appropriate heading per page: "Dashboard", "Find Jobs", "Saved Jobs", "Create Resume", "My Resume", "Resume Optimizer"
    - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.6, 7.7, 7.8, 7.9_
  - [x] 6.4 Create `client/src/pages/JobDetails.jsx`
    - Import `useParams` from `react-router-dom`
    - `const { id } = useParams()`
    - Render: heading "Job Details", then `<p className="text-gray-500 text-sm mb-6">Job ID: <span className="text-violet-400">{id}</span></p>`, then placeholder paragraph
    - _Requirements: 7.4_
  - [x] 6.5 Create `client/src/pages/NotFound.jsx`
    - Import `useNavigate` from `react-router-dom` and `Button`
    - Render: `<div className="min-h-screen bg-black flex flex-col items-center justify-center text-center px-6">` containing `<h1 className="text-8xl font-bold text-violet-500 mb-4">404</h1>`, `<h2 className="text-2xl font-bold text-white mb-3">Page not found</h2>`, a gray-400 description paragraph, and a filled Button labeled "Back to Home" that calls `navigate('/')`
    - _Requirements: 12.1, 12.2, 12.3_
  - [ ]* 6.6 Write property test for JobDetails route param display
    - **Property 2: JobDetails displays arbitrary route parameter values**
    - Use `@fast-check/vitest`; generate non-empty strings (length 1–50, trimmed non-empty) as job IDs
    - For each ID, render JobDetails inside a MemoryRouter at `/job/${id}`, assert `screen.getByText(id)` is in the document
    - Minimum 100 iterations
    - Tag comment: `// Feature: resume-plus-plus-phase2, Property 2: JobDetails displays arbitrary route parameter values`
    - **Validates: Requirements 7.4**
  - [ ]* 6.7 Write example tests for Register and Login shells
    - Assert Register renders name, email, password inputs and "Create Account" button
    - Assert Login renders email and password inputs and "Sign In" button
    - Assert Register page has link to `/login`; Login page has link to `/register`
    - _Requirements: 5.1, 5.2, 6.1, 6.2_

- [x] 7. Build the full Landing page
  - [x] 7.1 Create `client/src/pages/Landing.jsx` — Hero section
    - Import `useNavigate` from `react-router-dom` and `Button`, `Card` from components
    - Define `HOW_IT_WORKS` and `FEATURES` arrays at the top of the file (see design doc for content)
    - **Hero**: `<section className="min-h-screen flex flex-col items-center justify-center text-center px-6 py-20">` containing:
      - `<h1 className="text-5xl md:text-6xl font-bold text-white leading-tight max-w-3xl">` with "Find relevant jobs and " then `<span className="text-violet-400">optimize your resume</span>` then " for them using AI."
      - Subtext paragraph `className="mt-6 text-gray-400 text-lg max-w-xl"`
      - CTA button row: filled Button ("Find Jobs", `className="px-8 py-3 text-base shadow-[0_0_20px_rgba(139,92,246,0.3)]"`, `onClick={() => navigate('/jobs')}`) and outline Button ("Create Resume", `className="px-8 py-3 text-base"`, `onClick={() => navigate('/resume/create')}`)
    - _Requirements: 4.1, 4.6, 4.7, 4.8, 4.9_
  - [x] 7.2 Add "How it works" section to Landing.jsx
    - `<section className="py-20 bg-[#0a0a0a]">` — `max-w-5xl mx-auto px-6`
    - `<h2 className="text-3xl font-bold text-center text-white mb-12">How it works</h2>`
    - Grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8`
    - Each step: `flex flex-col items-center text-center gap-3` — step number in `w-12 h-12 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 font-bold text-lg` circle — white `font-semibold` title — gray-400 `text-sm` description
    - _Requirements: 4.2_
  - [x] 7.3 Add "Core Features" section to Landing.jsx
    - `<section className="py-20">` — `max-w-5xl mx-auto px-6`
    - `<h2 className="text-3xl font-bold text-center text-white mb-12">Core Features</h2>`
    - Grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6`
    - Each feature uses `<Card className="hover:border-violet-500/50 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] transition-all duration-300">` — emoji icon `text-3xl mb-3`, white `font-semibold` title `mb-2`, gray-400 `text-sm` description
    - _Requirements: 4.3_
  - [x] 7.4 Add CTA section to Landing.jsx
    - `<section className="py-24 bg-[#0a0a0a]">` — `max-w-2xl mx-auto px-6 text-center`
    - `<h2 className="text-4xl font-bold text-white mb-4">Ready to land your dream job?</h2>`
    - Gray-400 subtext paragraph
    - Filled Button labeled "Get Started Free" with `className="px-10 py-3 text-base shadow-[0_0_30px_rgba(139,92,246,0.4)]"` and `onClick={() => navigate('/register')}`
    - _Requirements: 4.4_
  - [ ]* 7.5 Write unit tests for Landing page sections
    - Assert Hero heading text is present
    - Assert "How it works" section renders 4 step items
    - Assert "Core Features" section renders 4 cards (by feature title)
    - Assert CTA section renders the "Ready to land your dream job?" heading
    - Assert "Find Jobs" button navigates to `/jobs` and "Create Resume" button navigates to `/resume/create`
    - _Requirements: 4.1–4.7_

- [x] 8. Wire up App.jsx — router, AppLoader, CursorSpotlight
  - [x] 8.1 Rewrite `client/src/App.jsx` with full routing setup
    - Import: `useState`, `useEffect` from react; `BrowserRouter`, `Routes`, `Route` from react-router-dom; `CursorSpotlight`, `AppLoader`; `PublicLayout`, `AuthLayout`; all page components
    - `const [loading, setLoading] = useState(true)`
    - `useEffect(() => { const t = setTimeout(() => setLoading(false), 1500); return () => clearTimeout(t); }, [])`
    - Return: `<BrowserRouter>` → `<CursorSpotlight />` → conditional: if loading → `<AppLoader />`, else → `<Routes>`:
      - `<Route element={<PublicLayout />}>` wrapping `/`, `/register`, `/login`
      - `<Route element={<AuthLayout />}>` wrapping `/dashboard`, `/jobs`, `/jobs/saved`, `/job/:id`, `/resume/create`, `/resume`, `/optimizer`
      - `<Route path="*" element={<NotFound />} />`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 8.1, 8.2, 8.3, 9.7_
  - [ ]* 8.2 Write integration tests for App routing
    - Using MemoryRouter + Routes mirror in a test helper, assert each of the 10 routes renders the correct page component's heading text
    - Assert `<Route path="*">` renders the NotFound 404 heading for an unknown URL
    - _Requirements: 1.1–1.5, 12.4_
  - [ ]* 8.3 Write unit tests for AppLoader timing in App
    - Using `vi.useFakeTimers()`, render `<App />` and assert `AppLoader` is present before 1500ms and absent after advancing timers by 1500ms
    - Assert routing content (`<Routes>`) renders after the loader disappears
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 9. Final checkpoint — full verification
  - Ensure all tests pass, ask the user if questions arise.
  - Confirm `npm run build` inside `client/` completes with zero errors and zero warnings
  - Manually verify (or via integration test) that all 10 routes render without white-screen errors
  - Confirm CursorSpotlight violet glow follows the mouse on desktop
  - Confirm AppLoader shows on refresh then transitions to Landing page after ~1.5s
  - Confirm AuthLayout nav tabs highlight the active route correctly
  - Confirm the violet scrollbar appears on scrollable pages

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster initial build. Core functionality does not depend on them.
- Each task references specific requirements from `requirements.md` for full traceability.
- All Tailwind classes are written inline — no `@apply` directives needed.
- The `logo.jpeg` is served from `/public/logo.jpeg` and referenced as `src="/logo.jpeg"` (Vite serves the `public/` folder at root).
- The `CursorSpotlight` uses `useRef` + direct DOM style mutation for performance — never calls `setState` on mousemove.
- Property tests require `@fast-check/vitest` and `fast-check` devDependencies. Install with: `npm install -D @fast-check/vitest fast-check vitest @testing-library/react @testing-library/jest-dom jsdom` inside the `client/` directory.
- Vitest configuration will need to be added to `vite.config.js` (add `test: { environment: 'jsdom', setupFiles: ['./src/setupTests.js'] }`) and a `setupTests.js` importing `@testing-library/jest-dom/vitest` will be needed.
