const OptimizedResume = require('../models/OptimizedResume')

// ─────────────────────────────────────────────────────────────────
// @desc    Get all optimized resumes for the authenticated user
// @route   GET /api/optimized-resumes
// @access  Protected
// ─────────────────────────────────────────────────────────────────
const getOptimizedResumes = async (req, res) => {
  try {
    const resumes = await OptimizedResume.find({ user: req.user.id })
      .select('-resumeData -jobDescription') // lightweight list view
      .sort({ createdAt: -1 })

    return res.status(200).json({ success: true, count: resumes.length, data: resumes })
  } catch (err) {
    console.error('Get optimized resumes error:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────
// @desc    Get a single optimized resume by ID
// @route   GET /api/optimized-resumes/:id
// @access  Protected
// ─────────────────────────────────────────────────────────────────
const getOptimizedResumeById = async (req, res) => {
  try {
    const resume = await OptimizedResume.findOne({
      _id: req.params.id,
      user: req.user.id,
    })
    if (!resume) {
      return res.status(404).json({ success: false, message: 'Optimized resume not found' })
    }
    return res.status(200).json({ success: true, data: resume })
  } catch (err) {
    console.error('Get optimized resume by ID error:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────
// @desc    Delete a single optimized resume
// @route   DELETE /api/optimized-resumes/:id
// @access  Protected
// ─────────────────────────────────────────────────────────────────
const deleteOptimizedResume = async (req, res) => {
  try {
    const resume = await OptimizedResume.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    })
    if (!resume) {
      return res.status(404).json({ success: false, message: 'Optimized resume not found' })
    }
    return res.status(200).json({ success: true, message: 'Optimized resume deleted' })
  } catch (err) {
    console.error('Delete optimized resume error:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = { getOptimizedResumes, getOptimizedResumeById, deleteOptimizedResume }
