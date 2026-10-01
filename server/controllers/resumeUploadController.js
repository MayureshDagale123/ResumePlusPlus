/**
 * resumeUploadController.js
 *
 * Handles PDF/DOCX resume upload → text extraction → AI parse → save.
 *
 * Pipeline:
 *   1. Validate file exists and is within size/type limits (multer handles this)
 *   2. Extract raw text from the buffer (pdf-parse or mammoth)
 *   3. Send raw text to Gemini AI for structured parsing
 *   4. Validate AI output (done inside aiService)
 *   5. If user already has a resume: update it
 *      If not: create new one
 *   6. Return the saved resume
 */

const Resume         = require('../models/Resume')
const { extractText } = require('../services/resume/textExtractor')
const { parseResumeText } = require('../services/ai/aiService')

// ─────────────────────────────────────────────────────────────────
// @desc    Upload and parse a resume file (PDF or DOCX)
// @route   POST /api/resume/upload
// @access  Protected
// ─────────────────────────────────────────────────────────────────
const uploadResume = async (req, res) => {
  try {
    // 1. Check file was provided
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded. Please select a PDF or DOCX file.' })
    }

    const { buffer, mimetype, originalname, size } = req.file
    console.log(`Resume upload: ${originalname} (${(size / 1024).toFixed(1)} KB, ${mimetype})`)

    // 2. Extract text
    let rawText
    try {
      rawText = await extractText(buffer, mimetype)
    } catch (extractErr) {
      return res.status(422).json({ success: false, message: extractErr.message })
    }

    console.log(`Extracted ${rawText.length} characters from resume`)

    // 3. Parse with Gemini AI
    let parsedData
    try {
      parsedData = await parseResumeText(rawText)
    } catch (aiErr) {
      console.error('AI parse error:', aiErr.message)
      return res.status(422).json({
        success: false,
        message: 'AI could not parse the resume. Please try a different file or create your resume manually.',
      })
    }

    // 4. Save or update the original resume
    const userId = req.user.id
    const existing = await Resume.findOne({ user: userId })

    let resume
    if (existing) {
      // Update existing — preserve the critical rule: NEVER a new optimized resume creates a new original
      resume = await Resume.findOneAndUpdate(
        { user: userId },
        {
          personalInfo:   parsedData.personalInfo   || {},
          summary:        parsedData.summary        || '',
          education:      parsedData.education      || [],
          skills:         parsedData.skills         || [],
          experience:     parsedData.experience     || [],
          projects:       parsedData.projects       || [],
          certifications: parsedData.certifications || [],
          achievements:   parsedData.achievements   || [],
        },
        { new: true }
      )
    } else {
      resume = await Resume.create({
        user:           userId,
        personalInfo:   parsedData.personalInfo   || {},
        summary:        parsedData.summary        || '',
        education:      parsedData.education      || [],
        skills:         parsedData.skills         || [],
        experience:     parsedData.experience     || [],
        projects:       parsedData.projects       || [],
        certifications: parsedData.certifications || [],
        achievements:   parsedData.achievements   || [],
      })
    }

    return res.status(200).json({
      success: true,
      message: existing ? 'Resume updated from uploaded file.' : 'Resume created from uploaded file.',
      data:    resume,
    })
  } catch (err) {
    console.error('Upload resume error:', err)
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' })
  }
}

module.exports = { uploadResume }
