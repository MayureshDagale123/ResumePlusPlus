const express = require('express')
const router  = express.Router()
const { optimizeResumeHandler } = require('../controllers/optimizerController')
const { protect } = require('../middleware/auth')

router.post('/', protect, optimizeResumeHandler)  // POST /api/optimizer

module.exports = router
