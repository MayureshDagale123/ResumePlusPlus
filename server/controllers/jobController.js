const { searchJobs, getJobById } = require('../services/jobs/jobService')
const Job = require('../models/Job')
const SavedJob = require('../models/SavedJob')

// ─────────────────────────────────────────────────────────────────
// @desc    Search jobs via JobSpy multi-platform scraper
// @route   GET /api/jobs?query=react&location=NYC&sites=linkedin,indeed&isRemote=true&country=usa
// @access  Public
// ─────────────────────────────────────────────────────────────────
const searchJobsHandler = async (req, res) => {
  try {
    const {
      query = '',
      location = '',
      sites = '',
      isRemote = '',
      jobType = '',
      country = '',
      resultsWanted = 15,
      hoursOld = '',
    } = req.query

    if (!query.trim()) {
      return res.status(400).json({ success: false, message: 'Search query is required' })
    }

    const jobs = await searchJobs({
      query: query.trim(),
      location: location.trim(),
      sites: sites ? sites.trim() : 'linkedin,indeed',
      isRemote: isRemote === 'true' || isRemote === true,
      jobType: jobType.trim(),
      countryIndeed: country.trim() || 'usa',
      resultsWanted: parseInt(resultsWanted, 10) || 15,
      hoursOld: hoursOld ? parseInt(hoursOld, 10) : undefined,
    })

    return res.status(200).json({ success: true, count: jobs.length, data: jobs })
  } catch (err) {
    console.error('Job search error:', err.message)
    return res.status(502).json({
      success: false,
      message: 'Job scraping service temporarily unavailable. Please try again.',
    })
  }
}

// ─────────────────────────────────────────────────────────────────
// @desc    Get job details by external ID
// @route   GET /api/jobs/:id
// @access  Public
// ─────────────────────────────────────────────────────────────────
const getJobHandler = async (req, res) => {
  try {
    const { id } = req.params

    // 1. Check Job cache collection
    let job = await Job.findOne({ externalId: id })
    if (job) return res.status(200).json({ success: true, data: job })

    // 2. Check SavedJob collection — job data is embedded there
    const savedJob = await SavedJob.findOne({ 'jobData.externalId': id })
    if (savedJob) return res.status(200).json({ success: true, data: savedJob.jobData })

    return res.status(404).json({
      success: false,
      message: 'Job not found in cache. Please navigate to this job from search results.',
    })
  } catch (err) {
    console.error('Get job error:', err.message)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────
// @desc    Save a job for the authenticated user
// @route   POST /api/jobs/:id/save
// @access  Protected
// ─────────────────────────────────────────────────────────────────
const saveJobHandler = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    // Get the job data (from cache or request body)
    let jobData = req.body.jobData

    if (!jobData) {
      const cached = await Job.findOne({ externalId: id })
      if (cached) {
        jobData = cached.toObject()
      } else {
        const fetched = await getJobById(id)
        if (!fetched) {
          return res.status(404).json({ success: false, message: 'Job not found' })
        }
        jobData = fetched
      }
    }

    // Check if already saved
    const existing = await SavedJob.findOne({ user: userId, 'jobData.externalId': id })
    if (existing) {
      return res.status(400).json({ success: false, message: 'Job already saved' })
    }

    const savedJob = await SavedJob.create({ user: userId, jobData })

    return res.status(201).json({ success: true, data: savedJob })
  } catch (err) {
    console.error('Save job error:', err.message)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────
// @desc    Remove a saved job
// @route   DELETE /api/jobs/:id/save
// @access  Protected
// ─────────────────────────────────────────────────────────────────
const unsaveJobHandler = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const savedJob = await SavedJob.findOneAndDelete({ user: userId, 'jobData.externalId': id })
    if (!savedJob) {
      return res.status(404).json({ success: false, message: 'Saved job not found' })
    }

    return res.status(200).json({ success: true, message: 'Job removed from saved list' })
  } catch (err) {
    console.error('Unsave job error:', err.message)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────
// @desc    Get all saved jobs for the authenticated user
// @route   GET /api/jobs/saved
// @access  Protected
// ─────────────────────────────────────────────────────────────────
const getSavedJobsHandler = async (req, res) => {
  try {
    const savedJobs = await SavedJob.find({ user: req.user.id }).sort({ createdAt: -1 })
    return res.status(200).json({ success: true, count: savedJobs.length, data: savedJobs })
  } catch (err) {
    console.error('Get saved jobs error:', err.message)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = {
  searchJobsHandler,
  getJobHandler,
  saveJobHandler,
  unsaveJobHandler,
  getSavedJobsHandler,
}
