const Resume           = require('../models/Resume')
const OptimizedResume  = require('../models/OptimizedResume')
const { optimizeResume } = require('../services/ai/aiService')

// ─────────────────────────────────────────────────────────────────
// @desc    Optimize the authenticated user's original resume
// @route   POST /api/optimizer
// @access  Protected
//
// Body: { jobDescription: string, jobTitle?: string, savedJobId?: string }
//
// Flow:
//   1. Fetch user's original resume from DB
//   2. Validate jobDescription is provided
//   3. Call Gemini AI with resume JSON + job description
//   4. Validate AI output (done inside aiService)
//   5. Save as a new OptimizedResume document
//   6. Return the saved optimized resume
// ─────────────────────────────────────────────────────────────────
const optimizeResumeHandler = async (req, res) => {
  try {
    const userId = req.user.id
    const { jobDescription, jobTitle, savedJobId } = req.body

    // 1. Validate input
    if (!jobDescription || !jobDescription.trim()) {
      return res.status(400).json({ success: false, message: 'Job description is required' })
    }
    if (jobDescription.trim().length < 50) {
      return res.status(400).json({ success: false, message: 'Job description is too short (minimum 50 characters)' })
    }

    // 2. Fetch original resume
    const originalResume = await Resume.findOne({ user: userId })
    if (!originalResume) {
      return res.status(404).json({
        success: false,
        message: 'No original resume found. Please create your resume first.',
      })
    }

    // 3. Build the Standard Resume JSON to send to AI
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

    // 4. Call Gemini AI — aiService validates and throws on invalid output
    const optimizedData = await optimizeResume(resumeJSON, jobDescription.trim())

    // 5. Save as a new OptimizedResume (never overwrites the original)
    const label = jobTitle?.trim() || 'Optimized Resume'

    const saved = await OptimizedResume.create({
      user:           userId,
      originalResume: originalResume._id,
      savedJob:       savedJobId || null,
      jobTitle:       label,
      resumeData:     optimizedData,
      jobDescription: jobDescription.trim(),
    })

    return res.status(201).json({ success: true, data: saved })
  } catch (err) {
    console.error('Optimizer error:', err.message)

    // Distinguish AI parse failure from server errors
    if (
      err.message?.includes('Missing required field') ||
      err.message?.includes('must be') ||
      err.message?.includes('JSON')
    ) {
      return res.status(422).json({
        success: false,
        message: 'AI returned an invalid response. Please try again.',
      })
    }

    return res.status(500).json({ success: false, message: 'Server error. Please try again.' })
  }
}

module.exports = { optimizeResumeHandler }
