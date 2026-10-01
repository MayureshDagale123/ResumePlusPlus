/**
 * jobService.js
 *
 * Handles all communication with the Open Web Ninja LinkedIn Jobs API.
 * The API key is loaded from process.env.JOB_API_KEY — NEVER sent to the browser.
 *
 * API docs: https://api.openwebninja.com/realtime-linkedin-data/search
 *
 * Flow:
 *   Controller → jobService.searchJobs() → OWN API → adaptOWNJobs() → Standard Job JSON[]
 */

const axios = require('axios')
const { adaptOWNJobs, adaptOWNJob } = require('./jobAdapter')

const JOB_API_BASE_URL = process.env.JOB_API_BASE_URL || 'https://api.openwebninja.com'
const JOB_API_KEY      = process.env.JOB_API_KEY      || ''

// Axios instance pre-configured for Open Web Ninja
const jobApiClient = axios.create({
  baseURL: JOB_API_BASE_URL,
  headers: {
    'X-API-Key': JOB_API_KEY,
  },
  timeout: 15000,
})

/**
 * Search for jobs using the Open Web Ninja LinkedIn Jobs API.
 *
 * @param {string} query    - keyword search (e.g. "react developer")
 * @param {string} location - location string appended to query (e.g. "New York")
 * @param {number} page     - page number (default 1; API uses offset via `start`)
 * @returns {Promise<object[]>} Array of Standard Job JSON objects
 */
const searchJobs = async (query, location = '', page = 1) => {
  const searchQuery = location ? `${query} in ${location}` : query
  const start       = (page - 1) * 10  // 10 results per page

  const response = await jobApiClient.get('/realtime-linkedin-data/search', {
    params: {
      query: searchQuery,
      start,
    },
  })

  const rawJobs = response.data?.data || []
  return adaptOWNJobs(rawJobs)
}

/**
 * Find a single cached job by its externalId.
 * The Open Web Ninja API does not have a single-job endpoint, so we look in
 * our MongoDB cache first. If not cached, returns null (caller handles this).
 *
 * @param {string} jobId - externalId (job_id from the API)
 * @returns {Promise<object|null>}
 */
const getJobById = async (jobId) => {
  // The API has no single-job lookup — we rely on the MongoDB cache
  // (populated when jobs are searched or saved).
  // If a direct lookup is ever needed, search by ID is an option via:
  //   await jobApiClient.get('/realtime-linkedin-data/search', { params: { query: jobId } })
  // For now return null to let the controller handle the fallback.
  return null
}

module.exports = { searchJobs, getJobById }
