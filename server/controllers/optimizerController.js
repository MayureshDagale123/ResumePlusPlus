const Resume           = require('../models/Resume')
const OptimizedResume  = require('../models/OptimizedResume')
const { optimizeResume } = require('../services/ai/aiService')
const { calculateAtsScore } = require('../utils/atsScorer')

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
//   5. Calculate real ATS score according to our ATS system
//   6. Save as a new OptimizedResume document with its real ATS score
//   7. Return the saved optimized resume
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

    // 5. Defensive check: restore any contact info AI might have blanked out
    const origPI = originalResume.personalInfo || {}
    optimizedData.personalInfo = {
      name:     optimizedData.personalInfo?.name?.trim()     || origPI.name     || '',
      headline: optimizedData.personalInfo?.headline?.trim() || origPI.headline || '',
      email:    optimizedData.personalInfo?.email?.trim()    || origPI.email    || '',
      phone:    optimizedData.personalInfo?.phone?.trim()    || origPI.phone    || '',
      location: optimizedData.personalInfo?.location?.trim() || origPI.location || '',
      linkedin: optimizedData.personalInfo?.linkedin?.trim() || origPI.linkedin || '',
      github:   optimizedData.personalInfo?.github?.trim()   || origPI.github   || '',
    }

    // 6. Calculate real ATS score according to our system against the target job
    const label = jobTitle?.trim() || 'Optimized Resume'
    const scoreResult = calculateAtsScore(optimizedData, {
      jobDescription: jobDescription.trim(),
      jobTitle: label,
    })

    // 7. Save as a new OptimizedResume (never overwrites the original)
    const saved = await OptimizedResume.create({
      user:           userId,
      originalResume: originalResume._id,
      savedJob:       savedJobId || null,
      jobTitle:       label,
      resumeData:     optimizedData,
      jobDescription: jobDescription.trim(),
      atsScore:       scoreResult.score,
    })

    return res.status(201).json({
      success: true,
      data: saved,
      atsScore: scoreResult.score,
      isAtsReady: scoreResult.isAtsReady,
      breakdown: scoreResult.breakdown,
    })
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
