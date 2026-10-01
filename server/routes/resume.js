const express = require('express')
const router  = express.Router()
const { createResume, getResume, updateResume, deleteResume } = require('../controllers/resumeController')
const { uploadResume } = require('../controllers/resumeUploadController')
const { protect } = require('../middleware/auth')
const upload   = require('../middleware/upload')

router.post('/',        protect,                     createResume)   // POST   /api/resume
router.get('/',         protect,                     getResume)      // GET    /api/resume
router.put('/',         protect,                     updateResume)   // PUT    /api/resume
router.delete('/',      protect,                     deleteResume)   // DELETE /api/resume
router.post('/upload',  protect, upload.single('resume'), uploadResume) // POST /api/resume/upload

module.exports = router
