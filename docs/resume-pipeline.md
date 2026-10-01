# Resume System — Complete Pipeline Documentation

> This document traces every single operation in the resume system:
> **Creation (manual form)**, **Upload & Parsing**, **Preview**, **Download (PDF)**, and **AI Optimization**.
> For every step: which file triggers it, which file handles it, what function is called, where it is defined.

---

## Table of Contents

1. [The Three Types of Resume Data](#1-the-three-types-of-resume-data)
2. [Standard Resume JSON Schema](#2-standard-resume-json-schema)
3. [Manual Resume Creation](#3-manual-resume-creation)
4. [Resume Upload & AI Parsing](#4-resume-upload--ai-parsing)
5. [Fetching & Displaying Resume Data](#5-fetching--displaying-resume-data)
6. [Resume Preview (In-Browser)](#6-resume-preview-in-browser)
7. [PDF Download](#7-pdf-download)
8. [AI Resume Optimization](#8-ai-resume-optimization)
9. [Optimized Resume Preview & Download](#9-optimized-resume-preview--download)
10. [Complete File Map](#10-complete-file-map)

---

## 1. The Three Types of Resume Data

Before diving into code, understand these three distinct concepts:

```
┌─────────────────────────────────────────────────────────┐
│  ORIGINAL RESUME                                        │
│  • Stored in MongoDB: resumes collection                │
│  • One per user (enforced by unique index)             │
│  • NEVER modified by AI                                │
│  • Created via: manual form OR file upload + AI parse  │
└────────────────────────────┬────────────────────────────┘
                             │ used as input
┌────────────────────────────▼────────────────────────────┐
│  OPTIMIZED RESUME                                       │
│  • Stored in MongoDB: optimizedResumes collection       │
│  • Many per user (one per optimization)                │
│  • IS the AI output — a new document every time       │
│  • Contains resumeData (full JSON) + jobTitle + JD    │
└────────────────────────────┬────────────────────────────┘
                             │ both rendered by
┌────────────────────────────▼────────────────────────────┐
│  PDF FILE                                               │
│  • Generated CLIENT-SIDE in the browser                │
│  • NEVER stored on server                              │
│  • Same template used for both original + optimized   │
│  • Deterministic: same JSON = same PDF every time     │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Standard Resume JSON Schema

Every resume (original and optimized) follows this exact shape throughout the entire system:

```json
{
  "personalInfo": {
    "name":     "Mayuresh Patil",
    "email":    "mayuresh@example.com",
    "phone":    "+91 9876543210",
    "location": "Mumbai, India",
    "linkedin": "https://linkedin.com/in/mayuresh",
    "github":   "https://github.com/mayuresh"
  },
  "summary":  "Full-stack developer with 2 years of experience...",
  "education": [
    { "school": "MIT", "degree": "B.Tech", "field": "CS",
      "startYear": "2020", "endYear": "2024", "grade": "8.5" }
  ],
  "skills":   ["React", "Node.js", "MongoDB"],
  "experience": [
    { "company": "TechCorp", "title": "Developer",
      "location": "Remote", "startDate": "Jan 2024",
      "endDate": "", "current": true, "description": "Built web apps." }
  ],
  "projects": [
    { "name": "Resume++", "description": "AI resume optimizer",
      "techStack": "MERN", "link": "github.com/me/resume" }
  ],
  "certifications": [
    { "name": "AWS SAA", "issuer": "Amazon", "year": "2024" }
  ],
  "achievements": [
    { "title": "Hackathon Winner", "description": "1st place 2023" }
  ]
}
```

**This schema is used everywhere:**
- Stored in MongoDB (`resumes` and `optimizedResumes` collections)
- Sent to/from the AI service
- Passed to the PDF template for rendering
- Used in the preview components

---

## 3. Manual Resume Creation

### What Happens When User Fills the Form and Clicks "Save Resume"

#### Step 1 — User Opens the Page

**File:** `client/src/App.jsx`
```jsx
<Route path="/resume/create" element={<CreateResume />} />
```
React Router renders `<CreateResume />` when user navigates to `/resume/create`.

---

#### Step 2 — Page Loads, Checks for Existing Resume

**File:** `client/src/pages/CreateResume.jsx`
**Function:** `useEffect` (anonymous, runs on mount)

```jsx
useEffect(() => {
  const load = async () => {
    try {
      const data = await getResume()   // ← calls resumeService.js
      if (data) {
        setForm({ ...data })           // pre-fill the form
        setIsEdit(true)                // switch to "edit" mode
      }
    } catch {
      // 404 = no resume yet, start fresh
    } finally {
      setLoading(false)
    }
  }
  load()
}, [])
```

**Called function:** `getResume()`
**Defined in:** `client/src/services/resumeService.js`
```js
export const getResume = async () => {
  const { data } = await api.get('/resume')
  return data.data
}
```

**API call goes to:** `GET /api/resume`
**Received by:** `server/routes/resume.js`
```js
router.get('/', protect, getResume)
```

**Handled by:** `server/controllers/resumeController.js` → `getResume` function
```js
const getResume = async (req, res) => {
  const resume = await Resume.findOne({ user: req.user.id })
  if (!resume) return res.status(404).json(...)
  return res.status(200).json({ success: true, data: resume })
}
```

**Database query on:** `server/models/Resume.js` (Mongoose model)

---

#### Step 3 — User Fills the Form

**File:** `client/src/pages/CreateResume.jsx`

The form has 8 tabs. Each tab manages its own section of the `form` state object.

State management:
```jsx
const [form, setForm] = useState(defaultResume())
// defaultResume() returns the empty Standard Resume JSON structure

// Helper for personalInfo fields:
const setPI = (field, val) =>
  setForm(f => ({ ...f, personalInfo: { ...f.personalInfo, [field]: val } }))

// Helper for array sections (education, experience, etc.):
const setArr = (key, idx, field, val) =>
  setForm(f => ({
    ...f,
    [key]: f[key].map((item, i) => i === idx ? { ...item, [field]: val } : item)
  }))

// Helper for skills (tag-style input):
const handleSkillKey = (e) => {
  if (e.key === 'Enter' && skillInput.trim()) {
    setForm(f => ({ ...f, skills: [...f.skills, skillInput.trim()] }))
    setSkillInput('')
  }
}
```

**What `setForm(f => ...)` does:**
React state updates are immutable. You can't do `form.personalInfo.name = "John"`. You must create a new object: `setForm(f => ({ ...f, personalInfo: { ...f.personalInfo, name: "John" } }))`.

---

#### Step 4 — User Clicks "Save Resume"

**File:** `client/src/pages/CreateResume.jsx`
**Function:** `handleSubmit`

```jsx
const handleSubmit = async (e) => {
  e.preventDefault()

  // Client-side validation
  if (!form.personalInfo.name.trim()) {
    setError('Full name is required')
    setActiveTab(0)
    return
  }

  setSaving(true)
  try {
    if (isEdit) {
      await updateResume(form)    // ← PUT /api/resume
      setSuccess('Resume updated!')
    } else {
      await createResume(form)    // ← POST /api/resume
      setSuccess('Resume created!')
      setIsEdit(true)
    }
    setTimeout(() => navigate('/resume'), 1500)  // redirect to My Resume
  } catch (err) {
    setError(err?.response?.data?.message || 'Failed to save')
  } finally {
    setSaving(false)
  }
}
```

---

#### Step 5 — API Call for Creating

**Called function:** `createResume(form)`
**Defined in:** `client/src/services/resumeService.js`
```js
export const createResume = async (body) => {
  const { data } = await api.post('/resume', body)
  return data.data
}
```

**`api`** is the axios instance defined in `client/src/services/api.js`:
```js
const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
```
The interceptor automatically adds `Authorization: Bearer <jwt>` to every request.

---

#### Step 6 — Request Reaches the Server

**Route:** `POST /api/resume`
**File:** `server/routes/resume.js`
```js
router.post('/', protect, createResume)
```

Two things happen before the controller:
1. `protect` middleware verifies the JWT and sets `req.user.id`
2. Then `createResume` controller runs

---

#### Step 7 — protect Middleware Runs

**File:** `server/middleware/auth.js`
**Function:** `protect`

```js
const protect = async (req, res, next) => {
  let token
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1]
  }
  if (!token) return res.status(401).json({ success: false, message: 'No token' })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = { id: decoded.id }  // ← attaches user ID to every request
    next()
  } catch {
    return res.status(401).json({ success: false, message: 'Token failed' })
  }
}
```

**`jwt.verify`** is from the `jsonwebtoken` package.
**`process.env.JWT_SECRET`** comes from `.env`.

---

#### Step 8 — Controller Creates the Resume

**File:** `server/controllers/resumeController.js`
**Function:** `createResume`

```js
const createResume = async (req, res) => {
  const userId = req.user.id  // set by protect middleware

  // Check if user already has a resume (enforce one-per-user rule)
  const existing = await Resume.findOne({ user: userId })
  if (existing) return res.status(400).json({
    success: false, message: 'Already have a resume. Use PUT to update.'
  })

  // Validate name
  if (!req.body.personalInfo?.name?.trim()) {
    return res.status(400).json({ success: false, message: 'Name required' })
  }

  // Create the document in MongoDB
  const resume = await Resume.create({
    user:           userId,
    personalInfo:   req.body.personalInfo,
    summary:        req.body.summary,
    education:      req.body.education,
    skills:         req.body.skills,
    experience:     req.body.experience,
    projects:       req.body.projects,
    certifications: req.body.certifications,
    achievements:   req.body.achievements,
  })

  return res.status(201).json({ success: true, data: resume })
}
```

**`Resume`** is the Mongoose model imported from `server/models/Resume.js`.

---

#### Step 9 — Mongoose Saves to MongoDB

**File:** `server/models/Resume.js`

```js
const ResumeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,  // ← enforces ONE resume per user at database level
  },
  personalInfo: { name: String, email: String, ... },
  summary:      String,
  education:    [mongoose.Schema.Types.Mixed],
  skills:       [mongoose.Schema.Types.Mixed],
  experience:   [mongoose.Schema.Types.Mixed],
  // etc.
}, { timestamps: true })  // adds createdAt and updatedAt automatically
```

**`Mixed`** type in Mongoose means "any shape" — each education/experience/project object can have different fields without strict schema constraints.

---

#### Step 10 — Response Returns and UI Updates

Server sends: `{ success: true, data: { _id, user, personalInfo, summary, ... } }`

Back in `CreateResume.jsx`:
- `setSuccess('Resume created!')` — shows green success message
- `setTimeout(() => navigate('/resume'), 1500)` — redirects to My Resume page after 1.5 seconds

---

## 4. Resume Upload & AI Parsing

### What Happens When User Uploads a PDF/DOCX

#### Step 1 — User Switches to Upload Mode

**File:** `client/src/pages/CreateResume.jsx`

```jsx
const [mode, setMode] = useState('manual') // 'manual' or 'upload'
```

Clicking "Upload PDF / DOCX" sets `mode = 'upload'`, which shows the upload UI.

---

#### Step 2 — User Drops or Selects a File

**File:** `client/src/pages/CreateResume.jsx`

```jsx
const fileRef = useRef(null)  // reference to hidden <input type="file">

const handleDrop = (e) => {
  e.preventDefault()
  const f = e.dataTransfer.files?.[0]
  if (f) setFile(f)
}

const handleFileChange = (e) => {
  const f = e.target.files?.[0]
  if (f) setFile(f)
}
```

The drop zone has `onDrop={handleDrop}` and `onDragOver`. The hidden `<input ref={fileRef}>` is clicked programmatically when the user clicks the drop zone.

---

#### Step 3 — User Clicks "Parse & Import Resume"

**File:** `client/src/pages/CreateResume.jsx`
**Function:** `handleUploadSubmit`

```jsx
const handleUploadSubmit = async () => {
  // Client-side validation before sending
  if (!file) { setUploadError('Please select a file'); return }

  const allowed = ['application/pdf', 'application/vnd.openxmlformats...']
  if (!allowed.includes(file.type)) {
    setUploadError('Only PDF and DOCX files supported')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    setUploadError('File must be under 5 MB')
    return
  }

  setUploading(true)

  // Build FormData (required for file uploads — not regular JSON)
  const formData = new FormData()
  formData.append('resume', file)  // 'resume' = field name multer expects

  try {
    const { data } = await api.post('/resume/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    setUploadSuccess('Resume parsed and saved!')
    setTimeout(() => navigate('/resume/create'), 2000)  // reload with parsed data
  } catch (err) {
    setUploadError(err?.response?.data?.message || 'Upload failed')
  } finally {
    setUploading(false)
  }
}
```

**`FormData`** is the browser's built-in way to send files via HTTP. You can't send a file as JSON — it must be `multipart/form-data`.

---

#### Step 4 — Request Reaches the Server

**Route:** `POST /api/resume/upload`
**File:** `server/routes/resume.js`
```js
router.post('/upload', protect, upload.single('resume'), uploadResume)
```

Three things run in order:
1. `protect` — verify JWT, set `req.user.id`
2. `upload.single('resume')` — multer processes the file
3. `uploadResume` — controller

---

#### Step 5 — Multer Processes the File

**File:** `server/middleware/upload.js`

```js
const multer = require('multer')

const upload = multer({
  storage: multer.memoryStorage(),  // file goes to RAM, not disk
  limits: { fileSize: 5 * 1024 * 1024 },  // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = new Set(['application/pdf', 'application/vnd.openxmlformats...'])
    if (allowed.has(file.mimetype)) cb(null, true)   // accept
    else cb(new Error('Only PDF and DOCX files'))    // reject
  }
})
```

After multer runs, `req.file` contains:
```js
{
  fieldname:    'resume',
  originalname: 'my_resume.pdf',
  mimetype:     'application/pdf',
  buffer:       <Buffer 25 50 44 46...>,  // raw file bytes in RAM
  size:         52314
}
```

`memoryStorage()` means the file NEVER touches the server's hard disk — it lives in RAM for the duration of the request and is garbage collected after.

---

#### Step 6 — Upload Controller Runs

**File:** `server/controllers/resumeUploadController.js`
**Function:** `uploadResume`

```js
const uploadResume = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' })

  const { buffer, mimetype, originalname } = req.file

  // Step A: Extract text
  let rawText
  try {
    rawText = await extractText(buffer, mimetype)  // ← calls textExtractor.js
  } catch (extractErr) {
    return res.status(422).json({ message: extractErr.message })
  }

  // Step B: Parse with AI
  let parsedData
  try {
    parsedData = await parseResumeText(rawText)    // ← calls aiService.js
  } catch (aiErr) {
    return res.status(422).json({ message: 'AI could not parse resume' })
  }

  // Step C: Save to MongoDB (create or update)
  const userId = req.user.id
  const existing = await Resume.findOne({ user: userId })

  const resume = existing
    ? await Resume.findOneAndUpdate({ user: userId }, parsedData, { new: true })
    : await Resume.create({ user: userId, ...parsedData })

  return res.status(200).json({ success: true, data: resume })
}
```

---

#### Step 7 — Text Extraction

**Called from:** `resumeUploadController.js`
**Function:** `extractText(buffer, mimetype)`
**Defined in:** `server/services/resume/textExtractor.js`

```js
const pdfParse = require('pdf-parse')
const mammoth  = require('mammoth')

const extractText = async (buffer, mimetype) => {
  if (mimetype === 'application/pdf') {
    const result = await pdfParse(buffer)
    const text = result.text?.trim()
    if (!text || text.length < 50) throw new Error('PDF appears empty or scanned')
    return text
  }

  if (mimetype === 'application/vnd.openxmlformats...') {
    const result = await mammoth.extractRawText({ buffer })
    const text = result.value?.trim()
    if (!text || text.length < 50) throw new Error('DOCX appears empty')
    return text
  }

  throw new Error('Unsupported file type')
}
```

**`pdf-parse`** reads the PDF's text layer (not images) and returns a string.
**`mammoth`** reads DOCX (Word) files by parsing the underlying XML.

---

#### Step 8 — AI Parsing

**Called from:** `resumeUploadController.js`
**Function:** `parseResumeText(rawText)`
**Defined in:** `server/services/ai/aiService.js`

```js
const parseResumeText = async (rawText) => {
  const model  = process.env.AI_MODEL || 'gemini-3.6-flash'
  const apiKey = process.env.AI_API_KEY
  const url    = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const prompt = buildParsePrompt(rawText)

  const { data } = await axios.post(url, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3 }
  })

  const text   = data.candidates[0].content.parts[0].text
  const parsed = extractJSON(text)   // strip markdown fences if present
  validateResumeJSON(parsed)         // check all required fields exist

  return parsed  // Standard Resume JSON
}
```

**`buildParsePrompt(rawText)`** creates this instruction for Gemini:
```
"You are a resume parser. Extract information from this text.
RULES: Only extract what's explicitly stated. No invented info.
Return ONLY valid JSON with this exact schema: {...}"
```

**`extractJSON(text)`** handles Gemini sometimes wrapping output in markdown:
```js
const extractJSON = (text) => {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenceMatch ? fenceMatch[1].trim() : text.trim()
  return JSON.parse(raw)
}
```

**`validateResumeJSON(parsed)`** checks the output is correct:
```js
const validateResumeJSON = (data) => {
  const required = ['personalInfo','summary','education','skills','experience','projects','certifications','achievements']
  for (const key of required) {
    if (!(key in data)) throw new Error(`Missing field: ${key}`)
  }
  if (!Array.isArray(data.skills)) throw new Error('skills must be array')
  // etc.
}
```

If validation fails, it throws — the controller catches it and returns 422. Bad AI output is never saved.

---

## 5. Fetching & Displaying Resume Data

### When "My Resume" Page Loads

**Route:** `/resume`
**File:** `client/src/App.jsx` → renders `<MyResume />`

**File:** `client/src/pages/MyResume.jsx`
**Function:** `useEffect` (runs on mount)

```jsx
useEffect(() => {
  const load = async () => {
    try {
      const [resumeData, optData] = await Promise.allSettled([
        getResume(),              // ← GET /api/resume
        getOptimizedResumes(),    // ← GET /api/optimized-resumes
      ])

      if (resumeData.status === 'fulfilled') setResume(resumeData.value)
      if (optData.status === 'fulfilled')    setOptimized(optData.value?.data || [])
    } finally {
      setLoading(false)
    }
  }
  load()
}, [])
```

**`Promise.allSettled`** runs both calls at the same time (parallel). If one fails (e.g., no resume yet), the other still succeeds. Unlike `Promise.all` which fails if ANY promise fails.

Both functions are in `client/src/services/resumeService.js`:
```js
export const getResume           = async () => { const { data } = await api.get('/resume');              return data.data }
export const getOptimizedResumes = async () => { const { data } = await api.get('/optimized-resumes'); return data }
```

---

## 6. Resume Preview (In-Browser)

### When User Clicks "Preview" in My Resume

**File:** `client/src/pages/MyResume.jsx`

```jsx
const [previewOpen, setPreviewOpen] = useState(false)

// Button click:
<Button onClick={() => setPreviewOpen(o => !o)}>
  {previewOpen ? 'Close Preview' : '👁 Preview'}
</Button>

// Conditional render:
{previewOpen && (
  <div style={{ height: '800px' }}>
    <PDFViewer width="100%" height="100%" showToolbar={false}>
      <ResumeDocument resume={resume} />
    </PDFViewer>
  </div>
)}
```

**`PDFViewer`** is imported from `@react-pdf/renderer`.
**`ResumeDocument`** is the PDF template.

---

### How the PDF Template Works

**File:** `client/src/components/ResumeTemplate.jsx`
**Export:** `ResumeDocument` (named export)

```jsx
import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer'

// Styles — like CSS but for PDF
const s = StyleSheet.create({
  page:  { fontFamily: 'Helvetica', fontSize: 10, padding: 40, backgroundColor: '#ffffff' },
  name:  { fontSize: 22, fontFamily: 'Helvetica-Bold' },
  sectionTitle: { fontSize: 10, color: '#5b21b6', borderBottomWidth: 0.8, ... },
  skillPill:    { backgroundColor: '#f3f0ff', borderRadius: 10, ... },
  // ...
})

export function ResumeDocument({ resume }) {
  const p = resume?.personalInfo || {}

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <Text style={s.name}>{p.name}</Text>
        <View style={s.contactRow}>
          {p.email    && <Text style={s.contactItem}>{p.email}</Text>}
          {p.linkedin && <Link src={p.linkedin}>LinkedIn</Link>}
        </View>

        {/* Summary */}
        {resume.summary && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>SUMMARY</Text>
            <Text>{resume.summary}</Text>
          </View>
        )}

        {/* Skills */}
        {resume.skills?.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>SKILLS</Text>
            <View style={s.skillsRow}>
              {resume.skills.map((skill, i) => (
                <Text key={i} style={s.skillPill}>{skill}</Text>
              ))}
            </View>
          </View>
        )}

        {/* Experience, Education, Projects, etc. */}
        ...

      </Page>
    </Document>
  )
}
```

**Key concepts:**
- `Document` wraps everything — like `<html>`
- `Page` is a single A4 page
- `View` is like `<div>` — a container
- `Text` is like `<p>` — displays text
- `Link` is a clickable hyperlink in the PDF
- `StyleSheet.create({})` is like a CSS module but for PDF

**@react-pdf/renderer renders in a Web Worker** — heavy computation happens in a background thread so the UI doesn't freeze.

---

## 7. PDF Download

### When User Clicks "Download PDF"

**File:** `client/src/pages/MyResume.jsx`

```jsx
import ResumeDownloadButton from '../components/ResumeDownloadButton'

<ResumeDownloadButton
  resume={resume}
  filename={downloadName}   // e.g., "Mayuresh_Patil_resume"
  label="⬇ Download PDF"
  variant="filled"
/>
```

---

**File:** `client/src/components/ResumeDownloadButton.jsx`

```jsx
import { PDFDownloadLink } from '@react-pdf/renderer'
import { ResumeDocument } from './ResumeTemplate'
import Button from './ui/Button'

export default function ResumeDownloadButton({ resume, filename, label, variant, className }) {
  // Sanitize filename — remove special characters
  const safeFilename = filename.replace(/[^a-zA-Z0-9_\-]/g, '_')

  return (
    <PDFDownloadLink
      document={<ResumeDocument resume={resume} />}  // PDF template with data
      fileName={`${safeFilename}.pdf`}               // download filename
      style={{ textDecoration: 'none' }}
    >
      {({ loading }) => (
        <Button variant={variant} className={className} disabled={loading}>
          {loading ? '⏳ Generating PDF…' : label}
        </Button>
      )}
    </PDFDownloadLink>
  )
}
```

**`PDFDownloadLink`** is from `@react-pdf/renderer`. It:
1. Renders the `<ResumeDocument resume={resume} />` to PDF bytes (in a Web Worker)
2. Creates a blob URL
3. When the user clicks, triggers a browser file download

The `{({ loading }) => ...}` pattern is a "render prop" — `PDFDownloadLink` calls this function with the current state. While the PDF is being generated, `loading = true` and the button shows "Generating...".

**The entire PDF is generated in the browser — no server involved.**

---

## 8. AI Resume Optimization

### Full Pipeline: User Clicks "Optimize Your Resume"

#### Step 1 — User Opens the Optimizer Page

**Route:** `/optimizer`
**File:** `client/src/App.jsx` → renders `<Optimizer />`

**Special case:** If navigated from Job Details "Optimize Resume" button:
```jsx
// In JobDetails.jsx:
navigate('/optimizer', {
  state: { jobDescription: job.description, jobTitle: job.title }
})
```

The Optimizer page reads this:
```jsx
// In Optimizer.jsx:
const routerState = useLocation().state
useEffect(() => {
  if (routerState?.jobDescription) {
    setJobDescription(routerState.jobDescription)  // pre-fills the textarea
    setJobTitle(routerState.jobTitle)
  }
}, [])
```

---

#### Step 2 — Page Loads Data

**File:** `client/src/pages/Optimizer.jsx`

```jsx
useEffect(() => {
  const init = async () => {
    // Load original resume (to show status)
    try {
      const r = await getResume()   // ← GET /api/resume → resumeService.js
      setResume(r)
    } catch { setResume(null) }

    // Load saved jobs (for the dropdown)
    try {
      const jobs = await getSavedJobs()   // ← GET /api/jobs/saved → jobService.js
      setSavedJobs(jobs)
    } catch { setSavedJobs([]) }
  }
  init()
}, [])
```

---

#### Step 3 — User Submits the Form

**File:** `client/src/pages/Optimizer.jsx`
**Function:** `handleSubmit`

```jsx
const handleSubmit = async (e) => {
  e.preventDefault()

  // Validation
  if (!jobDescription.trim()) { setError('Job description required'); return }
  if (jobDescription.trim().length < 50) { setError('JD too short'); return }

  setOptimizing(true)

  try {
    const result = await optimizeResume(
      jobDescription.trim(),
      jobTitle.trim() || 'Optimized Resume',
      selectedJob?._id || null
    )
    setResultId(result._id)
    setSuccess(true)   // shows success screen with preview/download buttons
  } catch (err) {
    setError(err?.response?.data?.message || 'Optimization failed')
  } finally {
    setOptimizing(false)
  }
}
```

---

#### Step 4 — Client Makes API Call

**Called function:** `optimizeResume(jobDescription, jobTitle, savedJobId)`
**Defined in:** `client/src/services/optimizerService.js`

```js
export const optimizeResume = async (jobDescription, jobTitle = '', savedJobId = null) => {
  const { data } = await api.post('/optimizer', {
    jobDescription,
    jobTitle,
    savedJobId
  })
  return data.data
}
```

**`api`** automatically adds the JWT header (via the interceptor in `api.js`).

---

#### Step 5 — Request Reaches the Server

**Route:** `POST /api/optimizer`
**File:** `server/routes/optimizer.js`
```js
router.post('/', protect, optimizeResumeHandler)
```

`protect` runs first → verifies JWT → sets `req.user.id`

**Rate limiter also runs first** (defined in `server/server.js`):
```js
app.use('/api/optimizer', aiLimiter, optimizerRouter)
// aiLimiter: 30 requests per hour per IP
```

---

#### Step 6 — Optimizer Controller

**File:** `server/controllers/optimizerController.js`
**Function:** `optimizeResumeHandler`

```js
const optimizeResumeHandler = async (req, res) => {
  const userId = req.user.id
  const { jobDescription, jobTitle, savedJobId } = req.body

  // 1. Validate input
  if (!jobDescription?.trim()) return res.status(400).json({ message: 'JD required' })
  if (jobDescription.trim().length < 50) return res.status(400).json({ message: 'JD too short' })

  // 2. Fetch the user's ORIGINAL resume from MongoDB
  const originalResume = await Resume.findOne({ user: userId })
  if (!originalResume) return res.status(404).json({ message: 'No resume found' })

  // 3. Build Standard Resume JSON for the AI
  const resumeJSON = {
    personalInfo:   originalResume.personalInfo,
    summary:        originalResume.summary,
    education:      originalResume.education,
    skills:         originalResume.skills,
    experience:     originalResume.experience,
    projects:       originalResume.projects,
    certifications: originalResume.certifications,
    achievements:   originalResume.achievements,
  }

  // 4. Call Gemini AI
  const optimizedData = await optimizeResume(resumeJSON, jobDescription.trim())
  // ↑ defined in server/services/ai/aiService.js

  // 5. Save as NEW OptimizedResume document (original is NEVER touched)
  const saved = await OptimizedResume.create({
    user:           userId,
    originalResume: originalResume._id,  // reference to original
    savedJob:       savedJobId || null,
    jobTitle:       jobTitle?.trim() || 'Optimized Resume',
    resumeData:     optimizedData,        // ← the AI's output
    jobDescription: jobDescription.trim(),
  })

  return res.status(201).json({ success: true, data: saved })
}
```

---

#### Step 7 — AI Service Calls Gemini

**Called from:** `optimizerController.js`
**Function:** `optimizeResume(resumeJSON, jobDescription)`
**Defined in:** `server/services/ai/aiService.js`

```js
const optimizeResume = async (resumeJSON, jobDescription) => {
  const model  = process.env.AI_MODEL || 'gemini-3.6-flash'
  const apiKey = process.env.AI_API_KEY
  const url    = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const prompt = buildOptimizePrompt(resumeJSON, jobDescription)

  const { data } = await axios.post(url, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 8192 }
  })

  const text   = data.candidates[0].content.parts[0].text
  const parsed = extractJSON(text)    // strip markdown fences
  validateResumeJSON(parsed)          // validate all fields

  return parsed  // Standard Resume JSON (optimized version)
}
```

**`buildOptimizePrompt(resumeJSON, jobDescription)`** creates this for Gemini:
```
"You are an ATS resume optimizer.

STRICT RULES:
1. MAY: reword, improve phrasing, align keywords, reorder skills
2. MUST NOT: invent skills, add experience, create projects that don't exist
3. Preserve all company names, dates, degrees exactly
4. Return ONLY valid JSON — no markdown, no explanation

ORIGINAL RESUME JSON:
{ "personalInfo": {...}, "skills": [...], ... }

JOB DESCRIPTION:
We are looking for a React developer with Node.js experience..."
```

The AI's output is then validated and saved.

---

#### Step 8 — OptimizedResume Saved to MongoDB

**Model:** `server/models/OptimizedResume.js`

```js
const OptimizedResumeSchema = new mongoose.Schema({
  user:           { type: ObjectId, ref: 'User', required: true },
  originalResume: { type: ObjectId, ref: 'Resume', required: true },
  savedJob:       { type: ObjectId, ref: 'SavedJob', default: null },
  jobTitle:       String,
  resumeData: {     // ← full optimized resume, embedded
    personalInfo: { name: String, email: String, ... },
    summary: String,
    education: [Mixed],
    skills: [Mixed],
    experience: [Mixed],
    // etc.
  },
  jobDescription: String,  // stored for reference
}, { timestamps: true })

// Index: per-user, sorted newest first
OptimizedResumeSchema.index({ user: 1, createdAt: -1 })
```

**Why embed `resumeData` instead of referencing?** The optimized resume data is stored inside the document itself. This means:
- One database query to get everything (no joins)
- PDF can be generated from a single document
- No risk of data loss if original resume is deleted

---

## 9. Optimized Resume Preview & Download

### User Navigates to Optimized Resume

**File:** `client/src/pages/MyResume.jsx`
```jsx
<Button onClick={() => navigate(`/resume/optimized/${opt._id}`)}>
  Preview & Download
</Button>
```

**Route:** `/resume/optimized/:id`
**File:** `client/src/App.jsx`
```jsx
<Route path="/resume/optimized/:id" element={<OptimizedResumePreview />} />
```

---

**File:** `client/src/pages/OptimizedResumePreview.jsx`

```jsx
const { id } = useParams()

useEffect(() => {
  getOptimizedResumeById(id)    // ← GET /api/optimized-resumes/:id
    .then(setResume)
    .catch(() => setError('Could not load resume'))
    .finally(() => setLoading(false))
}, [id])
```

**Called function:** `getOptimizedResumeById(id)`
**Defined in:** `client/src/services/resumeService.js`
```js
export const getOptimizedResumeById = async (id) => {
  const { data } = await api.get(`/optimized-resumes/${id}`)
  return data.data
}
```

**Server route:** `GET /api/optimized-resumes/:id`
**File:** `server/routes/optimizedResume.js`
```js
router.get('/:id', protect, getOptimizedResumeById)
```

**Controller:** `server/controllers/optimizedResumeController.js`
```js
const getOptimizedResumeById = async (req, res) => {
  const resume = await OptimizedResume.findOne({
    _id:  req.params.id,
    user: req.user.id,      // ← only return if it belongs to THIS user
  })
  if (!resume) return res.status(404).json({ message: 'Not found' })
  return res.status(200).json({ success: true, data: resume })
}
```

---

### Rendering the Preview

**File:** `client/src/pages/OptimizedResumePreview.jsx`

```jsx
const r = resume.resumeData || {}  // the optimized JSON

// PDF preview embedded in page:
<PDFViewer width="100%" height="900px" showToolbar={false}>
  <ResumeDocument resume={r} />
</PDFViewer>

// Download button:
<ResumeDownloadButton
  resume={r}
  filename={`${r.personalInfo?.name}_${resume.jobTitle}`}
  label="⬇ Download PDF"
/>
```

Both use the **same** `ResumeDocument` template — original and optimized resumes look identical in format; only the content differs.

---

## 10. Complete File Map

```
MANUAL RESUME CREATION
──────────────────────────────────────────────────────────────
UI Entry:           client/src/pages/CreateResume.jsx
                      → handleSubmit()
Client API call:    client/src/services/resumeService.js
                      → createResume(form) / updateResume(form)
HTTP Request:       POST /api/resume  or  PUT /api/resume
Route definition:   server/routes/resume.js
Auth middleware:    server/middleware/auth.js → protect()
Controller:         server/controllers/resumeController.js
                      → createResume() / updateResume()
Database model:     server/models/Resume.js
Storage:            MongoDB: resumes collection


RESUME UPLOAD + AI PARSE
──────────────────────────────────────────────────────────────
UI Entry:           client/src/pages/CreateResume.jsx
                      → handleUploadSubmit()
Client API call:    api.post('/resume/upload', formData)
HTTP Request:       POST /api/resume/upload (multipart/form-data)
Route definition:   server/routes/resume.js
File middleware:    server/middleware/upload.js → multer (memory)
Controller:         server/controllers/resumeUploadController.js
                      → uploadResume()
Text extraction:    server/services/resume/textExtractor.js
                      → extractText(buffer, mimetype)
                        → pdf-parse (for PDF)
                        → mammoth (for DOCX)
AI parsing:         server/services/ai/aiService.js
                      → parseResumeText(rawText)
                        → Gemini API (REST)
                        → extractJSON() + validateResumeJSON()
Storage:            MongoDB: resumes collection (create or update)


FETCH RESUME
──────────────────────────────────────────────────────────────
UI Entry:           client/src/pages/MyResume.jsx  or
                    client/src/pages/CreateResume.jsx (on mount)
Client API call:    client/src/services/resumeService.js → getResume()
HTTP Request:       GET /api/resume
Route:              server/routes/resume.js
Controller:         server/controllers/resumeController.js → getResume()
Database:           Resume.findOne({ user: req.user.id })


RESUME PREVIEW (IN-BROWSER)
──────────────────────────────────────────────────────────────
UI Entry:           client/src/pages/MyResume.jsx → "Preview" button
PDF component:      client/src/components/ResumeTemplate.jsx
                      → ResumeDocument({ resume })
Viewer:             @react-pdf/renderer → <PDFViewer>
Rendering:          Happens in browser Web Worker (no server)


PDF DOWNLOAD
──────────────────────────────────────────────────────────────
UI Entry:           client/src/pages/MyResume.jsx  or
                    client/src/pages/OptimizedResumePreview.jsx
Download component: client/src/components/ResumeDownloadButton.jsx
PDF template:       client/src/components/ResumeTemplate.jsx → ResumeDocument
Renderer:           @react-pdf/renderer → <PDFDownloadLink>
Output:             Browser downloads {name}_resume.pdf
Server involvement: NONE — entirely client-side


AI RESUME OPTIMIZATION
──────────────────────────────────────────────────────────────
UI Entry:           client/src/pages/Optimizer.jsx → handleSubmit()
Client API call:    client/src/services/optimizerService.js
                      → optimizeResume(jobDescription, jobTitle, savedJobId)
HTTP Request:       POST /api/optimizer
Route:              server/routes/optimizer.js
Rate limiter:       express-rate-limit (30/hour) in server/server.js
Controller:         server/controllers/optimizerController.js
                      → optimizeResumeHandler()
Fetch original:     Resume.findOne({ user: userId })  [from resumes collection]
AI call:            server/services/ai/aiService.js → optimizeResume()
                      → buildOptimizePrompt() → Gemini REST API
                      → extractJSON() + validateResumeJSON()
Storage:            OptimizedResume.create({...})
Database model:     server/models/OptimizedResume.js


OPTIMIZED RESUME PREVIEW + DOWNLOAD
──────────────────────────────────────────────────────────────
UI Entry:           client/src/pages/MyResume.jsx → "Preview & Download"
Navigation:         navigate('/resume/optimized/:id')
Page:               client/src/pages/OptimizedResumePreview.jsx
Client API call:    client/src/services/resumeService.js
                      → getOptimizedResumeById(id)
HTTP Request:       GET /api/optimized-resumes/:id
Route:              server/routes/optimizedResume.js
Controller:         server/controllers/optimizedResumeController.js
                      → getOptimizedResumeById()
Database:           OptimizedResume.findOne({ _id, user: req.user.id })
Preview:            <PDFViewer><ResumeDocument resume={r} /></PDFViewer>
Download:           <ResumeDownloadButton resume={r} ... />
PDF template:       client/src/components/ResumeTemplate.jsx
Renderer:           @react-pdf/renderer (browser Web Worker)


DATA FLOW SUMMARY
──────────────────────────────────────────────────────────────

[Original Resume JSON] ──────────────────────────────► MongoDB resumes
         │                                               collection
         │ (read by optimizer controller)
         ▼
[Resume JSON + Job Description] ──► Gemini AI ──► [Optimized Resume JSON]
                                                           │
                                                           ▼
                                                  MongoDB optimizedResumes
                                                           │
                                                           │ (read by preview page)
                                                           ▼
                                              ResumeDocument (React PDF template)
                                                    │              │
                                                    ▼              ▼
                                              PDFViewer       PDFDownloadLink
                                          (browser preview)  (file download)
```

---

> The original resume is **read-only** from the AI's perspective.
> It flows INTO the optimizer. The optimizer creates a SEPARATE document.
> The PDF template is **shared** — both original and optimized use the same layout.
