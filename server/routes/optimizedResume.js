const express = require('express')
const router  = express.Router()
const { getOptimizedResumes, getOptimizedResumeById, deleteOptimizedResume } = require('../controllers/optimizedResumeController')
const { protect } = require('../middleware/auth')

router.get('/',    protect, getOptimizedResumes)       // GET    /api/optimized-resumes
router.get('/:id', protect, getOptimizedResumeById)    // GET    /api/optimized-resumes/:id
router.delete('/:id', protect, deleteOptimizedResume)  // DELETE /api/optimized-resumes/:id

module.exports = router
