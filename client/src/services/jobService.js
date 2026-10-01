/**
 * jobService.js (client-side)
 *
 * All job-related API calls from the frontend.
 * Uses the central axios instance so the JOB_API_KEY never touches the browser.
 *
 * Flow: React component → jobService → /api/jobs (Express) → JSearch API
 */

import api from './api'

/**
 * Search jobs by keyword and optional location.
 * @param {string} query
 * @param {string} location
 * @param {number} page
 * @returns {Promise<object[]>} Array of Standard Job JSON objects
 */
export const searchJobs = async (query, location = '', page = 1) => {
  const { data } = await api.get('/jobs', { params: { query, location, page } })
  return data.data   // array of Standard Job JSON
}

/**
 * Get details for a single job by its external ID.
 * @param {string} id - externalId
 * @returns {Promise<object>} Standard Job JSON
 */
export const getJob = async (id) => {
  const { data } = await api.get(`/jobs/${id}`)
  return data.data
}

/**
 * Save a job for the authenticated user.
 * @param {string} id       - externalId
 * @param {object} jobData  - Standard Job JSON (avoids a second API call on the server)
 * @returns {Promise<object>} Saved job document
 */
export const saveJob = async (id, jobData) => {
  const { data } = await api.post(`/jobs/${id}/save`, { jobData })
  return data.data
}

/**
 * Remove a saved job.
 * @param {string} id - externalId
 */
export const unsaveJob = async (id) => {
  await api.delete(`/jobs/${id}/save`)
}

/**
 * Get all saved jobs for the authenticated user.
 * @returns {Promise<object[]>} Array of SavedJob documents (each contains jobData)
 */
export const getSavedJobs = async () => {
  const { data } = await api.get('/jobs/saved')
  return data.data
}
