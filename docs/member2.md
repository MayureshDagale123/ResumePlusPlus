# Member 2: Resume Data Pipeline, Gemini AI Engine & Enterprise ATS Scoring

> **Interview Guide & Technical Architecture Portfolio**  
> **Role:** AI & Data Pipeline Engineer (Backend)  
> **Responsibilities:** Resume File Ingestion, Buffer Text Extraction, Google Gemini AI Prompts & Validation, Resume Optimization Engine, Enterprise ATS Scoring System, and Resume Persistence.

---

## 1. Executive Summary & 30-Second Interview Pitch

### 30-Second Elevator Pitch
> *"In Resume++, I built the AI-powered resume intelligence pipeline and the enterprise ATS scoring engine. I designed an in-memory document parsing pipeline using Multer, `pdf-parse`, and `mammoth` to ingest PDF and Word documents without saving files to disk. I integrated Google's Gemini 2.5 Flash model via REST to parse unstructured resumes into a standardized JSON schema and optimize existing resumes against target job descriptions using Google's XYZ formula without hallucinating facts. Additionally, I architected our proprietary 100-point ATS scoring engine that benchmarks resumes against real enterprise filters (Workday, Greenhouse, Taleo) based on keyword matching, measurable metrics, action verbs, and section completeness, ensuring candidates receive authentic, actionable scores."*

---

## 2. Technical Stack & Dependencies

| Category | Technology / Package | Purpose in Project |
|---|---|---|
| **AI Integration** | Google Gemini REST API (`gemini-2.5-flash`) | Low-latency LLM for resume parsing and job-tailored rewriting |
| **HTTP Client** | `axios` | REST communication with Google Generative Language API |
| **File Ingestion** | `multer` (`memoryStorage`) | Secure multipart/form-data upload handling directly into RAM |
| **PDF Text Extraction** | `pdf-parse` | In-memory text extraction from PDF binary streams |
| **DOCX Text Extraction**| `mammoth` | Raw text extraction from OpenXML Word documents |
| **Database & Models** | MongoDB & Mongoose | Schemas for Master Resumes and AI-Optimized Resumes |
| **ATS Scoring Engine** | Custom JS Algorithm (`atsScorer.js`) | 100-point multi-factor ATS evaluation engine |

---

## 3. High-Level Architecture & Data Flows

### A. Resume Upload & Ingestion Pipeline
```
[User: PDF / DOCX file upload]
              │
              ▼
   [POST /api/resume/upload]
              │
              ▼
   [Multer Middleware (upload.js)]
   (Checks MIME type, enforces 5 MB limit, writes buffer to RAM)
              │
              ▼
   [textExtractor.js]
   ├─► If PDF: pdf-parse(buffer) ──► Raw UTF-8 Text
   └─► If DOCX: mammoth(buffer)   ──► Raw UTF-8 Text
              │
              ▼
   [aiService.parseResumeText]
   (Gemini 2.5 Flash with structured schema extraction prompt)
              │
              ▼
   [extractJSON & validateResumeJSON]
   (Strips markdown fences, validates 8 required schema keys)
              │
              ▼
   [Resume Model (Upsert)]
   (Updates existing Master Resume or creates new one)
              │
              ▼
   [Response: Standard Resume JSON]
```

### B. AI Resume Optimization & ATS Scoring Pipeline
```
[Client: POST /api/optimizer]
(Payload: { jobDescription: string, jobTitle?: string, savedJobId?: string })
              │
              ▼
[Fetch Master Resume from MongoDB]
              │
              ▼
[aiService.optimizeResume]
(Prompts Gemini with: Original Resume JSON + Target Job Description)
- Enforces strict ATS 90+ rules
- Re-writes bullets using Action Verbs + Google XYZ formula
- ZERO first-person pronouns
- Injects target job keywords while preserving candidate facts
              │
              ▼
[Defensive Contact Info Merge]
(Guarantees candidate's genuine phone, email, links are never wiped)
              │
              ▼
[atsScorer.calculateAtsScore(optimizedData, { jobDescription })]
(Calculates real match score across 6 categories out of 100)
              │
              ▼
[OptimizedResume.create({ atsScore, resumeData, jobDescription })]
(Saves distinct optimized version without overwriting Master Resume)
              │
              ▼
[Client Response: { data, atsScore, breakdown, isAtsReady }]
```

---

## 4. Deep Dive into Files Owned

### 1. `server/middleware/upload.js` (Memory-Safe File Upload Guard)
* **What it does:** Configures Multer to handle incoming resume file uploads securely in memory.
* **Key Implementations:**
  - **`memoryStorage()`:** Keeps files as temporary `Buffer` instances in RAM; no files are ever written to the server's disk, eliminating storage bloat, race conditions, and disk clutter.
  - **MIME Type Whitelist (`Set` lookup in $O(1)$):**
    - `application/pdf`
    - `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (.docx)
    - `application/msword` (.doc)
  - **File Size Limit:** Caps uploads strictly at 5 MB (`limits: { fileSize: 5 * 1024 * 1024 }`), preventing server memory starvation.
  - Handled gracefully in `server.js` with HTTP 413 (Payload Too Large) response.

### 2. `server/services/resume/textExtractor.js` (Binary Buffer Text Extractor)
* **What it does:** Converts binary file buffers into clean UTF-8 text strings without saving files to disk.
* **Key Implementations:**
  - **PDF Extraction (`pdf-parse`):** Reads text layers from digital PDFs. Checks `if (!text || text.length < 50)` to catch scanned image PDFs and alert the user that text-based documents are required.
  - **DOCX Extraction (`mammoth`):** Uses `mammoth.extractRawText({ buffer })` to parse the underlying XML structure of Word files into plain text.
  - **Unified Facade (`extractText`):** Automatically routes to the right parser based on `mimetype`.

### 3. `server/services/ai/aiService.js` (Gemini AI Engine & Prompt Engineering)
* **What it does:** Interfaces with Google Gemini 2.5 Flash API via REST (`axios`) with deterministic configuration, strict system prompts, and robust JSON extraction.
* **Why REST over SDK?** Using direct HTTPS endpoints (`https://generativelanguage.googleapis.com/v1beta/models/...`) ensures rock-solid stability across SDK breaking changes and avoids SDK initialization overhead.
* **Deterministic Generation Config:**
  ```javascript
  generationConfig: {
    temperature: 0.3,       // Low temperature prevents creative hallucinations & enforces strict adherence
    maxOutputTokens: 8192,
  }
  ```
* **Prompt Engineering Strategies:**
  - **Zero First-Person Pronouns:** Explicit rule banning *"I"*, *"me"*, *"my"*, *"we"*, or *"our"*. ATS resumes require authoritative third-person voice.
  - **Google's XYZ Formula:** Mandates *"Accomplished [X], measured by [Y], by doing [Z]"* with real metrics (e.g. *"reduced latency by 42%"*, *"scaled to 150k DAU"*).
  - **Action Verb Enforcement:** Mandates high-impact past-tense verbs (Engineered, Architected, Spearheaded, Optimized).
  - **Fact Preservation Rule:** Prohibits the AI from fabricating companies, colleges, or degrees not in the original resume.
* **JSON Cleaning & Defense:**
  - `extractJSON(text)`: Uses regex `/```(?:json)?\s*([\s\S]*?)```/` to safely strip markdown code fences that LLMs often wrap around JSON.
  - `validateResumeJSON(data)`: Validates that all 8 required schema keys exist and match their expected types (`personalInfo` as Object, `summary` as String, and 6 Array fields).

### 4. `server/utils/atsScorer.js` (Enterprise ATS Scoring Engine)
* **What it does:** Evaluates resumes against enterprise ATS criteria (Workday, Greenhouse, Taleo) out of 100 total points.
* **Supports Two Distinct Modes:**
  1. **General ATS Readiness (Master Resume):** Assesses structural completeness, action verb density, measurable metrics, and industry tech stack.
  2. **Job Match Score (Optimized Resume):** Cross-analyzes the resume against the target `jobDescription`, calculating keyword frequency and overlap.
* **Point Allocation Breakdown (100 Pts Total):**
  - **Contact & Header (20 pts):** Full name, email format, valid phone, professional headline, LinkedIn, location.
  - **Professional Summary (15 pts):** Word count range (40–100 words), zero first-person pronouns, job-relevant keywords.
  - **Core Skills (20 pts):** Presence of 8–20 technical/core skills and overlap with target job keywords.
  - **Work Experience (25 pts):** Action verb ratio, quantifiable metric detection (`%`, `$`, numbers, multipliers `X`), bullet count.
  - **Projects (10 pts):** Project names, tech stack tags, outcome descriptions.
  - **Education & Credentials (10 pts):** Degree, school name, graduation year.
* **ATS Score Tiers:**
  - **90–100:** `Top Tier` (Green) – Highly competitive, passes enterprise filters.
  - **75–89:** `Strong` (Violet) – Solid formatting, minor keyword additions recommended.
  - **60–74:** `Average` (Yellow) – Missing metrics or keywords; needs polish.
  - **0–59:** `Needs Work` (Red) – Missing critical sections or quantifiable impact.

### 5. `server/models/Resume.js` (Master Resume Schema)
* **What it does:** Stores the user's single authoritative baseline resume.
* **Key Details:**
  - Linked to `user: { type: ObjectId, ref: 'User', unique: true }` — enforces exactly **one Master Resume per user**.
  - Structured sub-schemas for `personalInfo`, `summary`, `education`, `skills`, `experience`, `projects`, `certifications`, and `achievements`.

### 6. `server/models/OptimizedResume.js` (AI-Tailored Resume Schema)
* **What it does:** Stores versioned, job-tailored resumes generated by Gemini AI.
* **Key Details:**
  - One user can have **multiple** optimized resumes tailored to different job applications.
  - Fields: `user`, `originalResume` (reference), `savedJob` (optional link to bookmarked job), `jobTitle`, `resumeData` (the full optimized JSON snapshot), `jobDescription`, `atsScore`.
  - Storing `resumeData` and `jobDescription` directly ensures historical fidelity: even if the user later edits their master resume, previous job-tailored applications are never altered.

### 7. `server/controllers/resumeController.js` (Master Resume CRUD)
* **Endpoints:**
  - `createResume`: Validates required `personalInfo.name`, ensures only one master resume exists per user (`find({ user })`), saves document.
  - `getResume`: Retrieves current user's master resume.
  - `updateResume`: Atomic update using `findOneAndUpdate({ user })`.
  - `deleteResume`: Removes master resume using `findOneAndDelete({ user })`.

### 8. `server/controllers/resumeUploadController.js` (Upload & Parse Coordinator)
* **Endpoint:** `POST /api/resume/upload`
* **Flow:**
  1. Validates `req.file` exists.
  2. Calls `textExtractor.extractText(buffer, mimetype)`.
  3. Sends raw text to `aiService.parseResumeText(rawText)`.
  4. Upserts Master Resume: if user already has one, updates it; if not, creates a new one.
  5. Returns structured resume to client with appropriate success messages.

### 9. `server/controllers/optimizerController.js` (AI Optimization Coordinator)
* **Endpoint:** `POST /api/optimizer`
* **Flow:**
  1. Validates `jobDescription` (minimum 50 characters).
  2. Fetches user's Master Resume.
  3. Executes `aiService.optimizeResume(resumeJSON, jobDescription)`.
  4. **Defensive Contact Info Recovery:** Merges original contact information to prevent LLM blanking.
  5. Calculates authentic ATS match score with `calculateAtsScore`.
  6. Creates a new `OptimizedResume` document with the calculated score.
  7. Returns the saved resume along with category breakdowns and ATS readiness flags.

### 10. `server/controllers/optimizedResumeController.js` (Optimized Versions Manager)
* **Endpoints:**
  - `getOptimizedResumes`: Returns all tailored resumes for the user, dynamically calculating and saving realistic ATS scores if missing.
  - `getOptimizedResumeById`: Fetches single tailored resume by MongoDB ID.
  - `deleteOptimizedResume`: Deletes tailored resume.

---

## 5. API Endpoints Reference

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/resume` | Protected | Create initial Master Resume manually |
| `GET` | `/api/resume` | Protected | Fetch current user's Master Resume |
| `PUT` | `/api/resume` | Protected | Update Master Resume |
| `DELETE`| `/api/resume` | Protected | Delete Master Resume |
| `POST` | `/api/resume/upload` | Protected | Upload PDF/DOCX file, parse with AI & save Master Resume |
| `POST` | `/api/optimizer` | Protected | Optimize Master Resume against a job description via Gemini |
| `GET` | `/api/optimized-resumes` | Protected | Get all AI-optimized resume versions for user |
| `GET` | `/api/optimized-resumes/:id` | Protected | Get a specific AI-optimized resume by ID |
| `DELETE`| `/api/optimized-resumes/:id`| Protected | Delete a specific AI-optimized resume |

---

## 6. Top 15 Technical Interview Questions & High-Impact Answers

### Q1: "Walk me through your resume upload pipeline. How does a binary PDF become structured JSON?"
**Answer:**  
*"When a user uploads a resume, Multer intercepts the multipart request into memory as a Node `Buffer`. Our `textExtractor` passes the buffer into `pdf-parse` (or `mammoth` for DOCX), which extracts clean text. We then construct a structured extraction prompt containing strict JSON schema requirements and feed it to Google Gemini 2.5 Flash. The raw response is sanitized with regex to remove markdown fences, validated against our 8 required top-level schema keys, and upserted into MongoDB as the user's Master Resume."*

---

### Q2: "Why did you use in-memory storage (`memoryStorage`) with Multer instead of writing files to disk?"
**Answer:**  
*"Three reasons:
1. **Security & Privacy:** Resumes contain sensitive PII (emails, phone numbers, addresses). Storing files on disk creates data leakage risks and requires complex cleanup routines.
2. **Performance:** Reading and writing from disk introduces I/O latency. Processing directly in RAM via Node `Buffer` instances is significantly faster.
3. **Stateless Architecture:** In a containerized environment (like Docker or AWS ECS), saving files locally to the server makes horizontal scaling difficult unless shared S3 buckets are configured. Since we only need the text for parsing, holding the buffer temporarily in RAM is optimal."*

---

### Q3: "How do you prevent the AI from hallucinating fake experience or fabricating skills?"
**Answer:**  
*"We implement strict prompt constraints:
1. **Explicit Negative Constraints:** The system prompt explicitly commands: *'STRICT FACT PRESERVATION: Do NOT fabricate companies, dates, or degrees not in the original resume. Retain the candidate's genuine skills.'*
2. **Low Temperature:** We set the Gemini temperature to `0.3`. Lower temperature reduces creative variability and forces deterministic adherence to the input data.
3. **Defensive Post-Processing:** In `optimizerController.js`, we defensively merge the candidate's original contact details (`name`, `email`, `phone`, `links`) so even if the AI blanks a field, genuine candidate data is guaranteed."*

---

### Q4: "How does your ATS scoring algorithm calculate scores? Is it just a random number?"
**Answer:**  
*"No, it is a deterministic, 100-point multi-factor mathematical model:
- **Contact Info (20 pts):** Validates email format, phone digits, location, and professional headline.
- **Summary (15 pts):** Word count range (40–100 words), penalty for first-person pronouns (*'I'*, *'me'*, *'my'*), and keyword density.
- **Skills (20 pts):** Analyzes breadth of skills (target 10–20) and calculates the percentage match against keywords extracted from the target job description.
- **Experience (25 pts):** Computes the percentage of bullet points starting with recognized action verbs and containing quantifiable impact metrics (numbers, %, $).
- **Projects & Education (20 pts):** Verifies tech stack tagging and degree information.
The engine returns the total score alongside category breakdowns and specific actionable recommendations."*

---

### Q5: "How does keyword extraction work when matching against a target job description?"
**Answer:**  
*"In `extractKeywordsFromJd`, we maintain a curated list of enterprise technical keywords (e.g., React, TypeScript, Node.js, Docker, Kubernetes, AWS, GraphQL). We run boundary-safe regular expressions `(^|[^a-zA-Z0-9])keyword([^a-zA-Z0-9]|$)` with case-insensitivity to find exact occurrences in the job posting text. Additionally, we extract capitalized domain terms with length constraints. We then calculate the intersection between the candidate's skills and the job's extracted keyword set."*

---

### Q6: "Why did you use Google Gemini 2.5 Flash via REST instead of the official SDK?"
**Answer:**  
*"Google's JavaScript SDKs have undergone rapid changes across `@google/generative-ai` versions with breaking interface changes. Making direct HTTPS requests via `axios` gives us complete control over headers, timeouts, and payload structures. Furthermore, the `gemini-2.5-flash` model delivers sub-second response times and high token limits (8192 output tokens) at low cost, making it ideal for large resume transformations."*

---

### Q7: "What happens if Gemini returns invalid JSON or wraps it in markdown backticks?"
**Answer:**  
*"We built a two-stage parsing defense:
1. `extractJSON(text)` executes a regex match: `text.match(/```(?:json)?\s*([\s\S]*?)```/)`. If markdown fences exist, it extracts only the internal content; otherwise, it trims the raw text.
2. `validateResumeJSON(data)` verifies the shape. If JSON parsing fails or required keys are missing, the controller catches the error and responds with HTTP 422 Unprocessable Entity and an informative message: *'AI returned an invalid response. Please try again.'*, preventing corrupt data from entering MongoDB."*

---

### Q8: "Why does `Resume` have a unique constraint on `user` while `OptimizedResume` does not?"
**Answer:**  
*"This represents our core business rule: **A candidate has exactly ONE Master Resume** (their comprehensive, ground-truth history). However, candidates apply to dozens of different roles. Therefore, `OptimizedResume` allows a 1-to-Many relationship linked to `user` and `originalResume`, storing separate versions tailored to specific job descriptions without ever altering the master baseline."*

---

### Q9: "Why does `OptimizedResume` store a full copy of `resumeData` instead of diffs?"
**Answer:**  
*"Historical immutability. If we only stored diffs or referenced the master resume, any future update the user makes to their master resume would retroactively distort previously submitted, tailored resumes. Storing the full document snapshot ensures that when a candidate views or downloads an optimized resume months later, it reflects the exact state that matched that specific job application."*

---

### Q10: "How do you detect quantifiable metrics in resume bullet points?"
**Answer:**  
*"In `atsScorer.js`, we use regex patterns targeting numeric achievements:
```javascript
const METRIC_REGEX = /(\d+[\d,.]*\s*(%|\+|k|m|b|x|million|billion|users|clients|rps|ms|seconds)?|\$\s*\d+[\d,.]*)/i;
```
This detects percentages (e.g., *'42%'*), multipliers (e.g., *'3x'*), financial figures (e.g., *'$1.2M'*), volume scales (e.g., *'150k users'*), and latency improvements (e.g., *'85ms'*). Bullets matching these patterns receive full credit for quantifiable impact."*

---

### Q11: "Why do you penalize first-person pronouns in the resume summary?"
**Answer:**  
*"Enterprise ATS systems and professional recruiters look for concise, authoritative executive summaries. First-person pronouns like *'I am a passionate developer'*, *'My goal is'*, or *'We built'* waste space and signal amateur resume writing. In our scorer, summaries using third-person voice (e.g., *'Full-stack engineer with 4+ years of experience architecting distributed cloud systems...'*) receive full points, whereas pronoun-heavy summaries are penalized."*

---

### Q12: "How do you handle scanned image PDFs that contain no text layers?"
**Answer:**  
*"Since our system uses `pdf-parse` (a text-layer extractor, not an OCR computer-vision model), scanned images produce an empty text buffer. In `textExtractor.js`, we check `if (!text || text.length < 50)`. If true, we throw a descriptive error: *'PDF appears to be empty or scanned. Only text-based PDFs are supported.'* The upload controller catches this and returns HTTP 422, guiding the user to upload a standard digital document or type their details manually."*

---

### Q13: "What happens if a user submits a 20-character job description to the optimizer?"
**Answer:**  
*"The optimizer controller validates input length before calling the AI:
```javascript
if (!jobDescription || jobDescription.trim().length < 50) {
  return res.status(400).json({ success: false, message: 'Job description is too short (minimum 50 characters)' });
}
```
A meaningful job description requires sufficient context (job responsibilities, qualifications, and tech stack) for keyword extraction and tailoring. Rejecting underspecified inputs preserves API token costs and ensures high-quality AI outputs."*

---

### Q14: "How does your ATS engine handle different formats of skills (e.g., array of strings vs. array of category objects)?"
**Answer:**  
*"We implemented a recursive normalizer `extractSkills(skills)`:
If the candidate passes `['React', 'Node.js']`, it trims and flattens them. If they pass structured categories like `[{ category: 'Frontend', items: ['React', 'CSS'] }]` or `[{ name: 'Docker' }]`, the normalizer maps and extracts them uniformly into a single array of strings before matching against keywords."*

---

### Q15: "How would you scale this AI and ATS pipeline to process 1,000 resumes per minute?"
**Answer:**  
*"1. **Asynchronous Task Queue:** Move the AI optimization and file parsing out of the request/response lifecycle using BullMQ and Redis. When a user uploads a resume, return a `jobId` immediately and process the text in background worker pools.  
2. **Quota Pooling & Rate Limiting:** Gemini API enforces requests-per-minute (RPM) limits. A queue allows us to buffer spikes and execute requests within provider quotas.  
3. **Model Tiering & Caching:** For repetitive job descriptions, cache extracted keywords in Redis so we don't re-parse identical job postings. For simple parsing, use a smaller, faster model (e.g. Gemini Nano or fine-tuned LLaMA), reserving Gemini 2.5 Flash for complex rewrites."*

---

## 7. Member 2 Cheat Sheet for Fast Revision

| What to say when asked about... | Your Instant Answer |
|---|---|
| **Pipeline Architecture** | "In-memory file upload via Multer, buffer text extraction with pdf-parse/mammoth, and Gemini 2.5 Flash for JSON transformation." |
| **Prompt Engineering** | "Low temperature (0.3), Google XYZ formula, action verbs, zero first-person pronouns, and fact preservation." |
| **ATS Scoring** | "100-point multi-factor deterministic algorithm evaluating contact, summary, skills overlap, action verbs, and quantifiable metrics." |
| **Data Safety** | "Files are parsed directly in RAM (never saved to disk), and original contact details are defensively merged to prevent AI blanking." |
| **Data Modeling** | "1-to-1 relationship for Master Resume, 1-to-Many for AI-Optimized Resumes with full document immutability." |
