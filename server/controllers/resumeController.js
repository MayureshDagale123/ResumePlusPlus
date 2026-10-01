const Resume = require('../models/Resume')

// ─────────────────────────────────────────────────────────────────
// @desc    Create the user's original resume
// @route   POST /api/resume
// @access  Protected
// ─────────────────────────────────────────────────────────────────
const createResume = async (req, res) => {
  try {
    const userId = req.user.id

    // Enforce one original resume per user
    const existing = await Resume.findOne({ user: userId })
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You already have an original resume. Use PUT /api/resume to update it.',
      })
    }

    const {
      personalInfo, summary, education, skills,
      experience, projects, certifications, achievements,
    } = req.body

    // personalInfo.name is required
    if (!personalInfo?.name?.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required in Personal Info.' })
    }

    const resume = await Resume.create({
      user: userId,
      personalInfo: personalInfo || {},
      summary:        summary        || '',
      education:      education      || [],
      skills:         skills         || [],
      experience:     experience     || [],
      projects:       projects       || [],
      certifications: certifications || [],
      achievements:   achievements   || [],
    })

    return res.status(201).json({ success: true, data: resume })
  } catch (err) {
    console.error('Create resume error:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────
// @desc    Get the user's original resume
// @route   GET /api/resume
// @access  Protected
// ─────────────────────────────────────────────────────────────────
const getResume = async (req, res) => {
  try {
    const resume = await Resume.findOne({ user: req.user.id })
    if (!resume) {
      return res.status(404).json({ success: false, message: 'No resume found. Create one first.' })
    }
    return res.status(200).json({ success: true, data: resume })
  } catch (err) {
    console.error('Get resume error:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────
// @desc    Update the user's original resume
// @route   PUT /api/resume
// @access  Protected
// ─────────────────────────────────────────────────────────────────
const updateResume = async (req, res) => {
  try {
    const userId = req.user.id
    const existing = await Resume.findOne({ user: userId })
    if (!existing) {
      return res.status(404).json({ success: false, message: 'No resume found. Create one first.' })
    }

    const {
      personalInfo, summary, education, skills,
      experience, projects, certifications, achievements,
    } = req.body

    if (!personalInfo?.name?.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required in Personal Info.' })
    }

    const resume = await Resume.findOneAndUpdate(
      { user: userId },
      {
        personalInfo: personalInfo || {},
        summary:        summary        || '',
        education:      education      || [],
        skills:         skills         || [],
        experience:     experience     || [],
        projects:       projects       || [],
        certifications: certifications || [],
        achievements:   achievements   || [],
      },
      { new: true }
    )

    return res.status(200).json({ success: true, data: resume })
  } catch (err) {
    console.error('Update resume error:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────
// @desc    Delete the user's original resume
// @route   DELETE /api/resume
// @access  Protected
// ─────────────────────────────────────────────────────────────────
const deleteResume = async (req, res) => {
  try {
    const resume = await Resume.findOneAndDelete({ user: req.user.id })
    if (!resume) {
      return res.status(404).json({ success: false, message: 'No resume found.' })
    }
    return res.status(200).json({ success: true, message: 'Resume deleted.' })
  } catch (err) {
    console.error('Delete resume error:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = { createResume, getResume, updateResume, deleteResume }
