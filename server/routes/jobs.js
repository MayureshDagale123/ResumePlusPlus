const express = require('express')
const router  = express.Router()
const {
  searchJobsHandler,
  getJobHandler,
  saveJobHandler,
  unsaveJobHandler,
  getSavedJobsHandler,
} = require('../controllers/jobController')
const { protect } = require('../middleware/auth')

// IMPORTANT: /saved must be defined BEFORE /:id to avoid Express matching
// "saved" as a job id param
router.get('/saved',    protect, getSavedJobsHandler)   // GET  /api/jobs/saved
router.get('/',                  searchJobsHandler)      // GET  /api/jobs?query=...
router.get('/:id',               getJobHandler)          // GET  /api/jobs/:id
router.post('/:id/save',  protect, saveJobHandler)       // POST /api/jobs/:id/save
router.delete('/:id/save',protect, unsaveJobHandler)     // DELETE /api/jobs/:id/save

module.exports = router
