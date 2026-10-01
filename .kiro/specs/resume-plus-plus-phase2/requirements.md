# Requirements Document

## Introduction

Phase 2 of Resume++ builds the complete visual shell of the application. This phase covers the React Router routing structure, global Tailwind theme, all page skeletons, two layouts (public and authenticated), a full landing page, an app loader, a cursor spotlight effect, and reusable UI components. No backend API calls are made in this phase — all data is static or hardcoded placeholder content. Authentication enforcement is deferred to Phase 3.

## Glossary

- **App**: The Resume++ React single-page application running in the browser.
- **PublicLayout**: The layout wrapper used by pages accessible without authentication (Landing, Register, Login). Contains a top navbar and footer.
- **AuthLayout**: The layout wrapper used by protected pages (Dashboard and all post-login pages). Contains a persistent top bar with navigation tabs.
- **AppLoader**: A full-screen overlay displayed for 1.5 seconds on initial app mount before the main app content is revealed.
- **CursorSpotlight**: A fixed, pointer-events-none overlay component that renders a radial gradient centered on the mouse cursor position to create an ambient violet glow effect.
- **Landing Page**: The public-facing marketing page at route `/`, containing six defined sections.
- **Page Shell**: A static placeholder page component that renders a heading and brief descriptor but makes no API calls.
- **Button**: A reusable UI component with three visual variants: `filled`, `outline`, and `ghost`.
- **Card**: A reusable UI wrapper component that applies the standard dark card styling.
- **Nav Tab**: A navigation link inside AuthLayout that highlights the active route with a violet underline or background indicator.
- **Violet Scale**: Tailwind CSS violet color tokens — `violet-400` (#a78bfa), `violet-500` (#8b5cf6), `violet-600` (#7c3aed).
- **Glow Effect**: CSS box-shadow `shadow-[0_0_20px_rgba(139,92,246,0.3)]` applied to elements to create a violet ambient glow.

---

## Requirements

### Requirement 1: Routing Structure

**User Story:** As a developer, I want a complete React Router v6 routing structure, so that all application pages are reachable at their defined URLs.

#### Acceptance Criteria

1. THE App SHALL use `BrowserRouter`, `Routes`, and `Route` from react-router-dom v6 to define all application routes.
2. THE App SHALL define public routes (`/`, `/register`, `/login`) wrapped in `PublicLayout`.
3. THE App SHALL define protected routes (`/dashboard`, `/jobs`, `/jobs/saved`, `/job/:id`, `/resume/create`, `/resume`, `/optimizer`) wrapped in `AuthLayout`.
4. THE App SHALL render the `NotFound` page component for any URL that does not match a defined route.
5. WHEN a user navigates to a protected route in Phase 2, THE App SHALL render the route's page component inside `AuthLayout` without enforcing authentication.

---

### Requirement 2: PublicLayout

**User Story:** As a visitor, I want a consistent top navbar and footer on all public pages, so that I can navigate between the landing, login, and register pages.

#### Acceptance Criteria

1. THE PublicLayout SHALL render a top navbar containing the app logo on the left and "Login" and "Register" navigation links on the right.
2. THE PublicLayout SHALL render a footer below the page content containing the logo, a tagline, and a copyright notice.
3. WHEN a user clicks the logo in the navbar, THE PublicLayout SHALL navigate to the `/` route.
4. WHEN a user clicks "Login" in the navbar, THE PublicLayout SHALL navigate to the `/login` route.
5. WHEN a user clicks "Register" in the navbar, THE PublicLayout SHALL navigate to the `/register` route.
6. THE PublicLayout SHALL apply a black (`#000000`) background to the navbar and footer.

---

### Requirement 3: AuthLayout with Navigation Tabs

**User Story:** As an authenticated user, I want a persistent top bar with navigation tabs, so that I can switch between the main application sections from any page.

#### Acceptance Criteria

1. THE AuthLayout SHALL render a top bar containing the app logo on the left, navigation tabs in the center, and a profile icon or name on the right.
2. THE AuthLayout SHALL display the following navigation tabs in order: Dashboard, Find Jobs, Saved Jobs, Create Resume, My Resume, Resume Optimizer.
3. WHEN the current route matches a tab's associated route, THE AuthLayout SHALL apply a violet underline or violet-background highlight to that tab to indicate it is active.
4. WHEN a user clicks a navigation tab, THE AuthLayout SHALL navigate to the tab's associated route.
5. THE AuthLayout SHALL apply a dark background (`#0a0a0a` or `gray-950`) to the top bar with a `gray-800` bottom border.
6. THE AuthLayout SHALL render page content in a scrollable area below the top bar.

---

### Requirement 4: Landing Page

**User Story:** As a visitor, I want a compelling, fully-rendered landing page, so that I understand the product's value and can navigate to register or log in.

#### Acceptance Criteria

1. THE Landing Page SHALL render a Hero section containing a large heading, subtext, and two CTA buttons labeled "Find Jobs" and "Create Resume".
2. THE Landing Page SHALL render a "How it works" section containing four numbered steps: (1) Find Jobs, (2) Save & Review, (3) Create/Upload Resume, (4) Optimize with AI.
3. THE Landing Page SHALL render a "Core Features" section containing four feature cards: Job Search, Resume Builder, AI Optimization, PDF Download.
4. THE Landing Page SHALL render a CTA section containing the heading "Ready to land your dream job?" and a single prominent CTA button.
5. THE Landing Page SHALL render a footer section containing the logo, a tagline, and copyright text.
6. WHEN a visitor clicks "Find Jobs" in the Hero section, THE Landing Page SHALL navigate to the `/jobs` route.
7. WHEN a visitor clicks "Create Resume" in the Hero section, THE Landing Page SHALL navigate to the `/resume/create` route.
8. THE Landing Page SHALL apply the global dark theme — black background, violet primary accents, white and light-gray text.
9. THE Landing Page SHALL NOT make any backend API calls.

---

### Requirement 5: Register Page Form Shell

**User Story:** As a visitor, I want to see a registration form, so that I understand what information is required to create an account.

#### Acceptance Criteria

1. THE Register Page SHALL render a form containing input fields for name, email, and password, and a submit button labeled "Create Account".
2. THE Register Page SHALL render a link to the `/login` route for users who already have an account.
3. THE Register Page SHALL apply the global dark theme with a centered card layout.
4. THE Register Page SHALL NOT submit any data to a backend API.
5. THE Register Page SHALL NOT implement form validation logic in Phase 2.

---

### Requirement 6: Login Page Form Shell

**User Story:** As a returning user, I want to see a login form, so that I understand what credentials are required to access my account.

#### Acceptance Criteria

1. THE Login Page SHALL render a form containing input fields for email and password, and a submit button labeled "Sign In".
2. THE Login Page SHALL render a link to the `/register` route for users who do not yet have an account.
3. THE Login Page SHALL apply the global dark theme with a centered card layout.
4. THE Login Page SHALL NOT submit any data to a backend API.
5. THE Login Page SHALL NOT implement authentication logic in Phase 2.

---

### Requirement 7: Protected Page Shells

**User Story:** As a developer, I want placeholder skeleton components for all protected pages, so that routing and layout wiring can be verified before the pages are fully implemented.

#### Acceptance Criteria

1. THE Dashboard Page SHALL render a static heading "Dashboard" and a placeholder content area.
2. THE FindJobs Page SHALL render a static heading "Find Jobs" and a placeholder content area.
3. THE SavedJobs Page SHALL render a static heading "Saved Jobs" and a placeholder content area.
4. THE JobDetails Page SHALL render a static heading "Job Details" and display the route parameter `:id`.
5. THE CreateResume Page SHALL render a static heading "Create Resume" and a placeholder content area.
6. THE MyResume Page SHALL render a static heading "My Resume" and a placeholder content area.
7. THE Optimizer Page SHALL render a static heading "Resume Optimizer" and a placeholder content area.
8. WHILE rendered inside AuthLayout, each protected page SHALL be visually consistent with the global dark theme.
9. THE protected page shells SHALL NOT make any backend API calls.

---

### Requirement 8: App Loader

**User Story:** As a user opening the app, I want to see a branded loading screen briefly on first mount, so that the app feels polished while initial resources load.

#### Acceptance Criteria

1. WHEN the App component first mounts, THE AppLoader SHALL display a full-screen overlay with a black background and a violet animated spinner or pulsing logo.
2. THE AppLoader SHALL disappear after exactly 1500 milliseconds from mount.
3. AFTER the AppLoader disappears, THE App SHALL render the main routing content without a full page reload.
4. THE AppLoader SHALL use CSS animation (not JavaScript-driven frame loops) for the spinner or pulse effect.
5. THE AppLoader SHALL be implemented as a standalone `AppLoader` component in `client/src/components/AppLoader.jsx`.

---

### Requirement 9: Cursor Spotlight Effect

**User Story:** As a visitor, I want a subtle ambient spotlight effect that follows my cursor, so that the app feels immersive and visually premium.

#### Acceptance Criteria

1. THE CursorSpotlight SHALL render as a fixed `div` with `pointer-events: none` and a high `z-index` covering the full viewport.
2. THE CursorSpotlight SHALL render a radial gradient background starting from `rgba(139,92,246,0.08)` at the cursor position and fading to `transparent`, with a diameter of approximately 600px.
3. WHEN the user moves the mouse, THE CursorSpotlight SHALL update its gradient center to track the cursor position in real time via a `mousemove` event listener on `document`.
4. THE CursorSpotlight SHALL update position using CSS custom properties (`--mouse-x`, `--mouse-y`) or direct inline style mutation — not canvas rendering.
5. IF `'ontouchstart' in window` is true, THEN THE CursorSpotlight SHALL not render or attach any event listeners.
6. THE CursorSpotlight SHALL be implemented as a standalone `CursorSpotlight` component in `client/src/components/CursorSpotlight.jsx`.
7. THE CursorSpotlight SHALL be mounted once in `App.jsx` and persist across all routes.

---

### Requirement 10: Global Theme

**User Story:** As a developer, I want a consistent global theme configured in Tailwind and base CSS, so that all components share the same color palette, typography, and scrollbar style.

#### Acceptance Criteria

1. THE Tailwind config SHALL extend `theme.extend.colors` to define at minimum a `primary` alias mapping to Tailwind's violet scale values (`500`, `600`, `400` keys).
2. THE `index.css` SHALL declare CSS custom properties for the background colors: `--bg-base: #000000`, `--bg-surface: #0a0a0a`, `--bg-card: #111111`, `--bg-elevated: #1a1a1a`.
3. THE `index.css` SHALL apply a custom scrollbar style: thin track with `#1a1a1a` background and `#7c3aed` (violet-600) thumb.
4. THE `index.css` SHALL set the default `body` background to `#000000` and text color to `#f3f4f6` (gray-100).
5. THE `index.css` SHALL set `box-sizing: border-box` globally and define smooth scroll behavior on the `html` element.

---

### Requirement 11: Reusable UI Components

**User Story:** As a developer, I want reusable Button and Card components, so that I can build consistent UI across all pages without repeating Tailwind class strings.

#### Acceptance Criteria

1. THE Button component SHALL accept a `variant` prop with accepted values: `filled` (default), `outline`, `ghost`.
2. WHEN `variant` is `filled`, THE Button SHALL apply a `bg-violet-600 hover:bg-violet-500 text-white` style.
3. WHEN `variant` is `outline`, THE Button SHALL apply a `border border-violet-500 text-violet-400 hover:bg-violet-500/10` style.
4. WHEN `variant` is `ghost`, THE Button SHALL apply a `text-gray-400 hover:text-white hover:bg-gray-800` style.
5. THE Button component SHALL accept and forward `className`, `onClick`, `type`, `disabled`, and `children` props.
6. THE Card component SHALL render a `div` with `bg-gray-900 border border-gray-800 rounded-xl` base classes.
7. THE Card component SHALL accept and forward `className` and `children` props.
8. THE Button and Card components SHALL be located at `client/src/components/ui/Button.jsx` and `client/src/components/ui/Card.jsx` respectively.

---

### Requirement 12: NotFound Page

**User Story:** As a user who navigates to an unknown URL, I want to see a clear 404 error page, so that I understand the page does not exist and can return to the app.

#### Acceptance Criteria

1. THE NotFound Page SHALL render a heading indicating a 404 error and a message stating the page was not found.
2. THE NotFound Page SHALL render a link or button that navigates the user back to the `/` route.
3. THE NotFound Page SHALL apply the global dark theme.
4. THE NotFound Page SHALL be registered as the catch-all route in the router configuration.
