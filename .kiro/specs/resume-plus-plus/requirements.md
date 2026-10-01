# Requirements Document

## Introduction

Resume++ is a MERN web application where users can find real jobs, build or upload a resume, and receive an AI-optimized, ATS-friendly version tailored to a specific job description. Phase 1 covers the complete project bootstrapping: folder structure, package configuration, frontend (React + Vite + Tailwind), backend (Express + Node.js), environment variable template, README skeleton, and a docs folder with an architecture overview.

The logo asset is located at `Logo/WhatsApp Image 2026-09-23 at 16.44.13.jpeg` relative to the workspace root and must be copied into the client's public assets during setup.

---

## Glossary

- **Workspace_Root**: The top-level project directory `resume-plus-plus/`
- **Client**: The React + Vite frontend application located at `client/`
- **Server**: The Node.js + Express backend application located at `server/`
- **Monorepo_Scripts**: npm scripts defined in the root `package.json` that coordinate both Client and Server
- **Env_Template**: The `.env.example` file listing all required environment variables with placeholder values
- **Docs_Folder**: The `docs/` directory containing Markdown documentation files
- **Architecture_Doc**: `docs/architecture.md`, the high-level system architecture overview
- **Logo_Asset**: The application logo image at `Logo/WhatsApp Image 2026-09-23 at 16.44.13.jpeg`
- **Tailwind_Config**: The Tailwind CSS configuration file `client/tailwind.config.js`
- **Vite_Config**: The Vite configuration file `client/vite.config.js`
- **Dev_Server**: The local development process; Client runs on port 5173, Server runs on port 5000

---

## Requirements

### Requirement 1: Project Folder Structure

**User Story:** As a developer, I want a well-defined monorepo folder structure, so that all team members share a consistent layout and onboarding is fast.

#### Acceptance Criteria

1. THE Workspace_Root SHALL contain the following top-level entries: `client/`, `server/`, `docs/`, `Logo/`, `.env.example`, `README.md`, `package.json`, and `.gitignore`.
2. THE `client/` directory SHALL contain `src/` with subdirectories: `components/`, `pages/`, `layouts/`, `hooks/`, `services/`, `context/`, `utils/`, and the files `App.jsx` and `main.jsx`.
3. THE `server/` directory SHALL contain subdirectories: `controllers/`, `routes/`, `models/`, `middleware/`, `services/`, `utils/`, `config/`, and the entry file `server.js`.
4. THE `server/services/` directory SHALL contain subdirectories: `jobs/`, `ai/`, `resume/`, and `pdf/`.
5. THE `docs/` directory SHALL contain the following Markdown files: `architecture.md`, `workflow.md`, `database.md`, `api.md`, `ai.md`, `resume-pipeline.md`, `job-api.md`, `authentication.md`, `security.md`, and `development-notes.md`.
6. WHEN the folder structure is created, THE Workspace_Root SHALL contain a `.gitignore` file that excludes `node_modules/`, `.env`, `dist/`, and `*.log` entries.

---

### Requirement 2: Root package.json and Monorepo Scripts

**User Story:** As a developer, I want a root `package.json` with workspace scripts, so that I can start, build, and install both Client and Server with a single command.

#### Acceptance Criteria

1. THE Workspace_Root `package.json` SHALL declare a `"name"` field with value `"resume-plus-plus"` and a `"version"` field.
2. THE Workspace_Root `package.json` SHALL contain a `"scripts"` object with at minimum the following keys: `"dev"`, `"dev:client"`, `"dev:server"`, `"build"`, `"install:all"`.
3. WHEN `"dev"` script is executed, THE Monorepo_Scripts SHALL concurrently start both the Client Dev_Server and the Server Dev_Server.
4. WHEN `"install:all"` script is executed, THE Monorepo_Scripts SHALL install dependencies in Workspace_Root, `client/`, and `server/` sequentially.
5. WHEN `"build"` script is executed, THE Monorepo_Scripts SHALL run the Vite production build inside `client/`.
6. THE Workspace_Root `package.json` SHALL list `"concurrently"` as a development dependency to enable parallel script execution.

---

### Requirement 3: Client Initialization (React + Vite + Tailwind CSS)

**User Story:** As a developer, I want the client bootstrapped with React, Vite, and Tailwind CSS, so that I can start building UI components immediately with the correct toolchain.

#### Acceptance Criteria

1. THE Client SHALL be initialized using Vite with the React template, producing a valid `client/package.json` with `"react"` and `"react-dom"` as dependencies and `"vite"` as a dev dependency.
2. THE Client `package.json` SHALL include `"scripts"` with at minimum `"dev"`, `"build"`, and `"preview"` keys.
3. THE Vite_Config SHALL configure the Dev_Server to run on port `5173` and set up a proxy so that requests to `/api` are forwarded to `http://localhost:5000`.
4. THE Client SHALL have Tailwind CSS installed and configured, with `tailwindcss`, `postcss`, and `autoprefixer` listed as dev dependencies in `client/package.json`.
5. THE Tailwind_Config SHALL set the `content` array to include `"./index.html"` and `"./src/**/*.{js,jsx,ts,tsx}"` so that all source files are scanned for class names.
6. THE Client `src/index.css` (or equivalent global stylesheet) SHALL include the three Tailwind directives: `@tailwind base;`, `@tailwind components;`, and `@tailwind utilities;`.
7. WHEN the Client Dev_Server starts, THE Client SHALL render a visible root `<App />` component in the browser without errors.
8. THE Client SHALL install the following additional dependencies: `react-router-dom`, `axios`.
9. THE Client `client/public/` directory SHALL contain the Logo_Asset copied from `Logo/WhatsApp Image 2026-09-23 at 16.44.13.jpeg` and renamed to `logo.jpeg`.

---

### Requirement 4: Server Initialization (Node.js + Express)

**User Story:** As a developer, I want the server bootstrapped with Express and essential middleware, so that I can begin implementing API endpoints immediately.

#### Acceptance Criteria

1. THE Server `server/package.json` SHALL declare `"express"`, `"mongoose"`, `"dotenv"`, `"cors"`, `"bcryptjs"`, `"jsonwebtoken"` as production dependencies.
2. THE Server `server/package.json` SHALL declare `"nodemon"` as a dev dependency and include a `"scripts"` object with `"dev"` (using nodemon) and `"start"` (using node) keys.
3. THE Server entry file `server/server.js` SHALL initialize an Express application, apply `cors` middleware, apply `express.json()` middleware, and listen on the port defined by the `PORT` environment variable, defaulting to `5000`.
4. WHEN the Server starts without a `.env` file, THE Server SHALL load defaults from `process.env` and start without crashing, logging a startup message that includes the active port.
5. THE Server `server/config/` directory SHALL contain a `db.js` file that exports a `connectDB` function using Mongoose to connect to the URI in `process.env.MONGODB_URI`.
6. IF the MongoDB connection fails during startup, THEN THE Server SHALL log a descriptive error message and exit the process with a non-zero code.
7. THE Server `server/server.js` SHALL call `connectDB` before starting the HTTP listener.
8. THE Server SHALL configure CORS to allow requests from `http://localhost:5173` during development, controllable via a `CLIENT_URL` environment variable.

---

### Requirement 5: Environment Variable Template (.env.example)

**User Story:** As a developer, I want a `.env.example` file listing every required environment variable, so that any developer can set up their local environment without guessing what values are needed.

#### Acceptance Criteria

1. THE Env_Template SHALL be located at `Workspace_Root/.env.example`.
2. THE Env_Template SHALL include placeholder entries for: `PORT`, `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, `AI_API_KEY`, `AI_MODEL`, `JOB_API_KEY`, `JOB_API_BASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALLBACK_URL`.
3. THE Env_Template SHALL use clearly descriptive placeholder values (e.g., `your_mongodb_connection_string_here`) rather than empty strings or real credentials.
4. THE Env_Template SHALL include inline comments explaining the purpose of each variable group (Auth, Database, AI, Job API, Google OAuth).
5. THE `.gitignore` SHALL list `.env` so that no real `.env` file is ever committed to version control.
6. WHEN a developer copies `.env.example` to `.env` and fills in real values, THE Server SHALL load those values on startup via `dotenv`.
7. IF any required environment variable (`PORT`, `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`) is missing or empty after startup, THEN THE Server SHALL log a descriptive error message identifying the missing variable and exit the process with a non-zero code.

---

### Requirement 6: README.md Skeleton

**User Story:** As a developer or visitor, I want a README.md that provides a project overview and setup instructions, so that I can understand and run the project quickly.

#### Acceptance Criteria

1. THE `README.md` SHALL be located at `Workspace_Root/README.md`.
2. THE `README.md` SHALL include the following sections as Markdown headings: `# Resume++`, `## Project Overview`, `## Tech Stack`, `## Project Structure`, `## Getting Started`, `## Environment Variables`, `## Scripts`, `## Features`, and `## License`.
3. THE `## Getting Started` section SHALL contain numbered steps covering: cloning the repository, running `npm run install:all`, copying `.env.example` to `.env`, filling in environment variables, and running `npm run dev`.
4. THE `## Tech Stack` section SHALL list: React, Vite, Tailwind CSS, Node.js, Express, MongoDB, Mongoose, JWT, Google OAuth, and the AI LLM API.
5. THE `## Scripts` section SHALL document each script in the root `package.json` with a one-line description of its purpose.
6. THE `## Environment Variables` section SHALL reference `.env.example` and state that real credentials must never be committed.

---

### Requirement 7: Docs Folder and architecture.md Skeleton

**User Story:** As a developer, I want a pre-populated docs folder with skeleton Markdown files, so that documentation can be progressively filled in without having to create files later.

#### Acceptance Criteria

1. THE Docs_Folder SHALL contain all ten Markdown files listed in Requirement 1.5.
2. WHEN a docs Markdown file is first created, THE file SHALL contain at minimum a level-1 heading matching its filename topic and a `## Overview` section with a placeholder sentence.
3. THE Architecture_Doc (`docs/architecture.md`) SHALL include the following sections: `# Architecture`, `## Overview`, `## System Diagram`, `## Frontend`, `## Backend`, `## Database`, `## AI Integration`, `## Job API Integration`, `## Authentication Flow`, and `## Security`.
4. THE Architecture_Doc `## System Diagram` section SHALL include a Mermaid diagram block showing the high-level request flow: Browser → React Client → Express Server → (MongoDB, AI Service, Job API).
5. THE Architecture_Doc `## Frontend` section SHALL list the key technologies: React, Vite, Tailwind CSS, React Router, Axios.
6. THE Architecture_Doc `## Backend` section SHALL list the key technologies: Node.js, Express, Mongoose, JWT, bcryptjs, dotenv, CORS.
7. THE Architecture_Doc `## AI Integration` section SHALL state that the AI provider is configurable via `AI_API_KEY` and `AI_MODEL` environment variables and that keys are never exposed to the browser.
8. THE Architecture_Doc `## Job API Integration` section SHALL state that job API calls are proxied through the Express server via an adapter/service layer so that `JOB_API_KEY` is never exposed to the browser.
