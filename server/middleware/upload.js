/**
 * upload.js
 *
 * Multer middleware for resume file uploads.
 * Files are kept in memory (no disk writes) — the buffer is passed
 * directly to the text extractor and then discarded.
 *
 * Allowed: PDF (.pdf), DOCX (.docx), DOC (.doc)
 * Max size: 5 MB
 */

const multer = require('multer')

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
])

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Only PDF and DOCX/DOC files are allowed.'), false)
  }
}

const upload = multer({
  storage,
  limits:     { fileSize: MAX_FILE_SIZE },
  fileFilter,
})

module.exports = upload
