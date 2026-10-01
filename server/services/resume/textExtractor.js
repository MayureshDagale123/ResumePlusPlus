/**
 * textExtractor.js
 *
 * Extracts raw text from PDF and DOCX file buffers.
 * Uses pdf-parse for PDFs and mammoth for DOCX files.
 * No OCR — only works with text-based (not scanned) documents.
 */

const pdfParse = require('pdf-parse')
const mammoth  = require('mammoth')

/**
 * Extracts text from a PDF buffer.
 * @param {Buffer} buffer
 * @returns {Promise<string>} Extracted text
 */
const extractFromPdf = async (buffer) => {
  const result = await pdfParse(buffer)
  const text   = result.text?.trim()
  if (!text || text.length < 50) {
    throw new Error('PDF appears to be empty or scanned. Only text-based PDFs are supported.')
  }
  return text
}

/**
 * Extracts text from a DOCX buffer.
 * @param {Buffer} buffer
 * @returns {Promise<string>} Extracted text
 */
const extractFromDocx = async (buffer) => {
  const result = await mammoth.extractRawText({ buffer })
  const text   = result.value?.trim()
  if (!text || text.length < 50) {
    throw new Error('DOCX appears to be empty. Please check the file.')
  }
  return text
}

/**
 * Extracts text from a file buffer based on MIME type.
 * @param {Buffer} buffer
 * @param {string} mimetype - e.g. 'application/pdf' or 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
 * @returns {Promise<string>} Extracted raw text
 */
const extractText = async (buffer, mimetype) => {
  if (mimetype === 'application/pdf') {
    return extractFromPdf(buffer)
  }
  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimetype === 'application/msword'
  ) {
    return extractFromDocx(buffer)
  }
  throw new Error('Unsupported file type. Please upload a PDF or DOCX file.')
}

module.exports = { extractText }
