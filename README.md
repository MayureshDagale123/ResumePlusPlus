# Resume++

> Find relevant jobs and optimize your resume for them using AI.

## Project Overview

Resume++ is a MERN web application that helps users find real jobs, build or upload a resume, and receive an AI-optimized, ATS-friendly version tailored to a specific job description.

**Core flow:** Register → Find Jobs → Save Jobs → Create/Upload Resume → Optimize Resume with AI → Preview & Download PDF

## Tech Stack

**Frontend**
- React 18 + Vite
- React Router DOM
- Tailwind CSS
- Axios

**Backend**
- Node.js + Express
- MongoDB + Mongoose
- JWT (JSON Web Tokens)
- bcryptjs
- dotenv + CORS

**Integrations**
- Google OAuth 2.0
- AI LLM API (configurable via env vars)
- External Job Search API (adapter pattern)

## Project Structure

```
resume-plus-plus/
├── client/                  # React + Vite frontend
│   ├── public/              # Static assets (logo, favicon)
│   └── src/
│       ├── components/      # Reusable UI components
│       ├── pages/           # Page-level components
│       ├── layouts/         # Layout wrappers
│       ├── hooks/           # Custom React hooks
│       ├── services/        # Axios API call modules
│       ├── context/         # React Context providers
│       └── utils/           # Client-side utilities
├── server/                  # Node.js + Express backend
│   ├── config/              # Database connection
│   ├── controllers/         # Route handler functions
│   ├── routes/              # Express Router files
│   ├── models/              # Mongoose schemas
│   ├── middleware/          # Auth, error, validation middleware
│   ├── services/            # Business logic services
│   │   ├── jobs/            # Job API adapter/normalizer
│   │   ├── ai/              # AI LLM integration
│   │   ├── resume/          # Resume text extraction
│   │   └── pdf/             # PDF generation
│   └── utils/               # Server-side utilities
├── docs/                    # Project documentation
├── Logo/                    # Source logo asset
├── .env.example             # Environment variable template
├── .gitignore
├── package.json             # Root monorepo scripts
└── README.md
```

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd resume-plus-plus
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```

3. **Copy the environment variable template**
   ```bash
   cp .env.example .env
   ```

4. **Fill in your environment variables**
   Open `.env` and replace all placeholder values with your real credentials. See the [Environment Variables](#environment-variables) section for details.

5. **Start the development servers**
   ```bash
   npm run dev
   ```
   - Frontend: [http://localhost:5173](http://localhost:5173)
   - Backend: [http://localhost:5000](http://localhost:5000)

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

| Variable | Description |
|---|---|
| `PORT` | Express server port (default: 5000) |
| `MONGODB_URI` | MongoDB connection string (Atlas recommended) |
| `JWT_SECRET` | Secret key for signing JWTs (use a long random string) |
| `CLIENT_URL` | Frontend URL for CORS (default: http://localhost:5173) |
| `AI_API_KEY` | API key for the AI LLM provider |
| `AI_MODEL` | AI model name/identifier |
| `JOB_API_KEY` | API key for the external job search API |
| `JOB_API_BASE_URL` | Base URL for the job search API |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret |
| `GOOGLE_CALLBACK_URL` | Google OAuth callback URL |

> ⚠️ **Never commit your real `.env` file.** It is listed in `.gitignore` and must never be pushed to version control.

## Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `npm run dev` | Starts both client and server concurrently in development mode |
| `dev:client` | `npm run dev:client` | Starts only the Vite frontend dev server on port 5173 |
| `dev:server` | `npm run dev:server` | Starts only the Express backend with nodemon on port 5000 |
| `build` | `npm run build` | Runs the Vite production build for the client |
| `install:all` | `npm run install:all` | Installs dependencies in root, client, and server |

## Features

- 🔐 **Authentication** — Register, login, logout with JWT. Google OAuth support.
- 🔍 **Job Search** — Search real jobs by keyword and location via external Job API.
- 💾 **Save Jobs** — Save interesting jobs to your personal list.
- 📄 **Create Resume** — Build your resume via a multi-section form.
- 📤 **Upload Resume** — Upload a PDF/DOCX; AI parses it into structured JSON.
- 🤖 **AI Optimization** — Send your resume + job description to AI; receive a tailored, ATS-friendly version.
- 👁️ **Preview** — Preview your resume in a clean template before downloading.
- 📥 **PDF Download** — Download your optimized resume as a PDF.

## License

MIT
