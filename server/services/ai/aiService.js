/**
 * aiService.js
 *
 * Communicates with Google Gemini API via REST (not the SDK),
 * which is more stable across API versions.
 *
 * Two operations:
 *   1. optimizeResume(resumeJSON, jobDescription) → Optimized Resume JSON
 *   2. parseResumeText(rawText) → Structured Resume JSON (Phase 11 — upload)
 *
 * AI Rules (enforced via prompt):
 *   MAY:  reword descriptions, align keywords, improve summary, reorder skills,
 *         use ATS-friendly phrasing
 *   MUST NOT: invent skills, experience, projects, certifications, education,
 *              achievements, or change any facts
 */

const axios = require('axios')

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

/**
 * Calls Gemini with a given prompt text and returns the response text.
 */
const callGemini = async (promptText) => {
  const model  = process.env.AI_MODEL || 'gemini-2.5-flash'
  const apiKey = process.env.AI_API_KEY

  const url  = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`
  const body = {
    contents: [{ parts: [{ text: promptText }] }],
    generationConfig: {
      temperature:     0.3,   // lower = more deterministic
      maxOutputTokens: 8192,
    },
  }

  const { data } = await axios.post(url, body, { timeout: 60000 })
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini returned an empty response')
  return text
}

/**
 * Safely parses JSON from Gemini response.
 * Gemini sometimes wraps output in ```json ... ``` markdown fences.
 */
const extractJSON = (text) => {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenceMatch ? fenceMatch[1].trim() : text.trim()
  return JSON.parse(raw)
}

/**
 * Validates that the AI output has the correct Resume JSON shape.
 * Throws if any required top-level key is missing or has wrong type.
 */
const validateResumeJSON = (data) => {
  const required = [
    'personalInfo', 'summary', 'education',
    'skills', 'experience', 'projects',
    'certifications', 'achievements',
  ]
  for (const key of required) {
    if (!(key in data)) throw new Error(`Missing required field: ${key}`)
  }
  if (typeof data.personalInfo !== 'object') throw new Error('personalInfo must be an object')
  if (typeof data.summary !== 'string')       throw new Error('summary must be a string')
  if (!Array.isArray(data.education))         throw new Error('education must be an array')
  if (!Array.isArray(data.skills))            throw new Error('skills must be an array')
  if (!Array.isArray(data.experience))        throw new Error('experience must be an array')
  if (!Array.isArray(data.projects))          throw new Error('projects must be an array')
  if (!Array.isArray(data.certifications))    throw new Error('certifications must be an array')
  if (!Array.isArray(data.achievements))      throw new Error('achievements must be an array')
}

// ─────────────────────────────────────────────────────────────────
// 1. Resume Optimization
// ─────────────────────────────────────────────────────────────────

const buildOptimizePrompt = (resumeJSON, jobDescription) => `
You are an expert ATS resume optimizer. Your task is to optimize the given resume for the provided job description.

STRICT RULES:
1. You MAY reword bullet points, improve phrasing, align keywords, reorder skills by relevance, and improve the summary.
2. You MUST NOT invent new skills, experience, projects, certifications, education, or achievements not in the original resume.
3. If the job description asks for a skill not in the original resume, do NOT add it.
4. Preserve all factual information (company names, dates, degrees, etc.) exactly.
5. Make the language more impactful and ATS-friendly.
6. Return ONLY a valid JSON object — no markdown fences, no explanation, no extra text.

ORIGINAL RESUME (JSON):
${JSON.stringify(resumeJSON, null, 2)}

JOB DESCRIPTION:
${jobDescription}

Return the optimized resume as a single valid JSON object with exactly these keys:
{"personalInfo":{"name":"","email":"","phone":"","location":"","linkedin":"","github":""},"summary":"","education":[],"skills":[],"experience":[],"projects":[],"certifications":[],"achievements":[]}
`

/**
 * Optimizes a resume JSON for a given job description using Gemini.
 * @param {object} resumeJSON     - The user's original Standard Resume JSON
 * @param {string} jobDescription - The job description text
 * @returns {Promise<object>} Validated optimized Standard Resume JSON
 */
const optimizeResume = async (resumeJSON, jobDescription) => {
  const prompt = buildOptimizePrompt(resumeJSON, jobDescription)
  const text   = await callGemini(prompt)
  const parsed = extractJSON(text)
  validateResumeJSON(parsed)
  return parsed
}

// ─────────────────────────────────────────────────────────────────
// 2. Resume Parsing (for Phase 11 — PDF/DOCX upload)
// ─────────────────────────────────────────────────────────────────

const buildParsePrompt = (rawText) => `
You are a resume parser. Extract structured information from the following resume text.

STRICT RULES:
1. Extract ONLY information explicitly present in the text.
2. Do NOT invent or infer information not clearly stated.
3. For missing fields, use "" for text fields and [] for arrays.
4. Return ONLY a valid JSON object — no markdown fences, no explanation.

RESUME TEXT:
${rawText}

Return a JSON object with exactly these keys:
{"personalInfo":{"name":"","email":"","phone":"","location":"","linkedin":"","github":""},"summary":"","education":[{"school":"","degree":"","field":"","startYear":"","endYear":"","grade":""}],"skills":[],"experience":[{"company":"","title":"","location":"","startDate":"","endDate":"","current":false,"description":""}],"projects":[{"name":"","description":"","techStack":"","link":""}],"certifications":[{"name":"","issuer":"","year":""}],"achievements":[{"title":"","description":""}]}
`

/**
 * Parses raw resume text into Standard Resume JSON using Gemini.
 * @param {string} rawText - Extracted text from a PDF or DOCX file
 * @returns {Promise<object>} Validated Standard Resume JSON
 */
const parseResumeText = async (rawText) => {
  const prompt = buildParsePrompt(rawText)
  const text   = await callGemini(prompt)
  const parsed = extractJSON(text)
  validateResumeJSON(parsed)
  return parsed
}

module.exports = { optimizeResume, parseResumeText }
