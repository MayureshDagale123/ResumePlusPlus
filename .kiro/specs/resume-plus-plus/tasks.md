# Implementation Plan: Resume++ Phase 1 — Project Setup

## Overview

Bootstrap the complete Resume++ monorepo scaffold: folder structure, root workspace scripts, React + Vite + Tailwind client, Express + Mongoose server, environment variable template, README, and docs skeletons. No application logic is implemented in this phase — only the reproducible project foundation.

## Tasks

- [x] 1. Create root workspace scaffold
  - Create all top-level directories: `client/`, `server/`, `docs/`, `Logo/` (already exists)
  - Create root `package.json` with `"name": "resume-plus-plus"`, `"version": "1.0.0"`, and `"private": true`
  - Add `"concurrently"` as a dev dependency entry in root `package.json`
  - Add scripts: `"dev"`, `"dev:client"`, `"dev:server"`, `"build"`, `"install:all"` (use concurrently for `dev`)
  - Create `.gitignore` excluding `node_modules/`, `.env`, `dist/`, `*.log`
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 1.6_

- [x] 2. Initialize the React + Vite client
  - Run `npm create vite@latest client -- --template react` (or write `client/package.json` manually with react, react-dom, vite entries)
  - Add `react-router-dom` and `axios` to `client/package.json` dependencies
  - Install Tailwind CSS: add `tailwindcss`, `postcss`, `autoprefixer` to `client/package.json` devDependencies
  - Create `client/postcss.config.js` with tailwindcss and autoprefixer plugins
  - Create `client/tailwind.config.js` with content paths `["./index.html", "./src/**/*.{js,jsx,ts,tsx}"]` and an empty `theme.extend`
  - Add the three `@tailwind` directives to `client/src/index.css`
  - Create `client/vite.config.js` setting `server.port = 5173` and a proxy entry forwarding `/api` to `http://localhost:5000`
  - Create `client/src/main.jsx` mounting `<App />` into `#root`
  - Create `client/src/App.jsx` as a minimal functional component returning a placeholder heading
  - Copy `Logo/WhatsApp Image 2026-09-23 at 16.44.13.jpeg` to `client/public/logo.jpeg`
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [ ]* 2.1 Smoke-test the client
    - Verify `client/public/logo.jpeg` exists and is non-zero bytes
    - Verify `client/tailwind.config.js` content array includes both required glob patterns
    - Verify `client/src/index.css` contains all three `@tailwind` directives
    - Verify `client/vite.config.js` sets port 5173 and proxies `/api`
    - _Requirements: 3.3, 3.5, 3.6, 3.9_

- [x] 3. Create client source directory structure
  - Create empty index files (or `.gitkeep` files) in each required subdirectory so they are tracked by git:
    `src/components/`, `src/pages/`, `src/layouts/`, `src/hooks/`, `src/services/`, `src/context/`, `src/utils/`
  - _Requirements: 1.2_

- [x] 4. Initialize the Express + Mongoose server
  - Create `server/package.json` with production dependencies: `express`, `mongoose`, `dotenv`, `cors`, `bcryptjs`, `jsonwebtoken`
  - Add `nodemon` as a dev dependency
  - Add scripts: `"dev": "nodemon server.js"`, `"start": "node server.js"`
  - Create `server/config/db.js` exporting a `connectDB` async function that calls `mongoose.connect(process.env.MONGODB_URI)`, logs success on connection, and on failure logs the error and calls `process.exit(1)`
  - Create `server/server.js` that:
    1. Calls `require('dotenv').config()`
    2. Validates that `MONGODB_URI` and `JWT_SECRET` are set; if not, logs the missing variable names and exits with code 1
    3. Imports and initialises Express (`const app = express()`)
    4. Applies `cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' })`
    5. Applies `express.json()`
    6. Registers a health-check route `GET /api/health` returning `{ status: 'ok' }`
    7. Calls `connectDB()`
    8. Starts `app.listen(process.env.PORT || 5000, ...)` and logs the active port
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [ ]* 4.1 Smoke-test the server configuration
    - Verify `server/package.json` contains all six required production dependencies
    - Verify `server/config/db.js` exports a `connectDB` function
    - Verify `server/server.js` calls `dotenv.config()`, validates env vars, applies cors and express.json(), and listens on PORT
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.7_

- [x] 5. Create server directory structure stubs
  - Create placeholder files (`.gitkeep` or empty `index.js`) in each required subdirectory so they are tracked by git:
    `controllers/`, `routes/`, `models/`, `middleware/`, `services/jobs/`, `services/ai/`, `services/resume/`, `services/pdf/`, `utils/`
  - _Requirements: 1.3, 1.4_

- [x] 6. Checkpoint — Verify both dev servers start cleanly
  - Ensure all tests pass, ask the user if questions arise.
  - Manual verification: run `npm run install:all` from workspace root, then `npm run dev` — confirm both servers start without errors and `http://localhost:5173` renders the App component.
  - _Requirements: 2.3, 3.7, 4.3_

- [x] 7. Create the environment variable template
  - Create `Workspace_Root/.env.example` with placeholder entries for all 11 variables:
    `PORT`, `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, `AI_API_KEY`, `AI_MODEL`, `JOB_API_KEY`, `JOB_API_BASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
  - Use descriptive placeholder values (e.g., `your_mongodb_connection_string_here`), never empty strings
  - Add inline comment headers grouping the variables: `# Server`, `# Database`, `# Auth`, `# AI`, `# Job API`, `# Google OAuth`
  - Confirm `.gitignore` includes `.env`
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 7.1 Verify env template content
    - Read `.env.example` and assert all 11 variable names are present
    - Assert no value is an empty string
    - Assert comment lines are present for each variable group
    - _Requirements: 5.2, 5.3, 5.4_

- [x] 8. Write the README.md skeleton
  - Create `Workspace_Root/README.md` with all nine required sections as Markdown headings:
    `# Resume++`, `## Project Overview`, `## Tech Stack`, `## Project Structure`, `## Getting Started`, `## Environment Variables`, `## Scripts`, `## Features`, `## License`
  - `## Tech Stack`: list React, Vite, Tailwind CSS, Node.js, Express, MongoDB, Mongoose, JWT, Google OAuth, AI LLM API
  - `## Getting Started`: numbered steps — clone repo, run `npm run install:all`, copy `.env.example` to `.env`, fill in env vars, run `npm run dev`
  - `## Scripts`: document each root script (`dev`, `dev:client`, `dev:server`, `build`, `install:all`) with a one-line description
  - `## Environment Variables`: reference `.env.example` and state that real credentials must never be committed
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 9. Create docs folder skeleton files
  - Create all ten Markdown files in `docs/` with minimum content (h1 heading + `## Overview` placeholder):
    `architecture.md`, `workflow.md`, `database.md`, `api.md`, `ai.md`, `resume-pipeline.md`, `job-api.md`, `authentication.md`, `security.md`, `development-notes.md`
  - Expand `docs/architecture.md` with the full required sections:
    `# Architecture`, `## Overview`, `## System Diagram`, `## Frontend`, `## Backend`, `## Database`, `## AI Integration`, `## Job API Integration`, `## Authentication Flow`, `## Security`
  - Add a Mermaid diagram block in `## System Diagram` showing: Browser → React Client → Express Server → (MongoDB, AI Service, Job API)
  - `## Frontend`: list React, Vite, Tailwind CSS, React Router, Axios
  - `## Backend`: list Node.js, Express, Mongoose, JWT, bcryptjs, dotenv, CORS
  - `## AI Integration`: state that provider is configurable via `AI_API_KEY` and `AI_MODEL` env vars and keys are never exposed to the browser
  - `## Job API Integration`: state that job API calls are proxied through Express via an adapter/service layer so `JOB_API_KEY` is never exposed to the browser
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

- [x] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Confirm workspace root structure matches Requirement 1 exactly
  - Confirm `npm run dev` starts both servers concurrently with no errors
  - Confirm `http://localhost:5173/logo.jpeg` serves the logo image
  - Confirm `http://localhost:5173/api/health` returns `{ "status": "ok" }` via Vite proxy

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP start
- All tasks are scaffolding only — no business logic, authentication flows, or database schemas are implemented here
- Phase 2 will add authentication (register/login/Google OAuth) building on this foundation
- The `client/public/logo.jpeg` copy in task 2 is the canonical asset path for all Phase 2+ UI work
- Property-based testing is not applicable to this phase; the smoke/example checks in optional sub-tasks are sufficient

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["1"]
    },
    {
      "wave": 2,
      "tasks": ["2", "4"],
      "note": "Client and server init can run in parallel"
    },
    {
      "wave": 3,
      "tasks": ["3", "5"],
      "note": "Directory stubs depend on their respective parent init"
    },
    {
      "wave": 4,
      "tasks": ["6"],
      "note": "Checkpoint: both servers must start cleanly"
    },
    {
      "wave": 5,
      "tasks": ["7", "8", "9"],
      "note": "Env template, README, and docs can be created in parallel"
    },
    {
      "wave": 6,
      "tasks": ["10"],
      "note": "Final checkpoint after all artifacts are in place"
    }
  ]
}
```
