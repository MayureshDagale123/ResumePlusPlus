/**
 * jobService.js (client-side)
 *
 * Job API requests from frontend to Express backend.
 * Integrates with JobSpy multi-platform scraping service.
 */

import api from './api'

/**
 * Search jobs with multi-platform filter support.
 *
 * @param {object|string} params - Search options object or query string
 * @param {string} [location]    - Optional location if query string passed
 * @returns {Promise<object[]>} Array of Standard Job JSON objects
 */
export const searchJobs = async (params, location = '') => {
  let requestParams = {}

  if (typeof params === 'string') {
    requestParams = { query: params, location }
  } else if (params && typeof params === 'object') {
    requestParams = { ...params }
  }

  // Format array of sites into comma-separated string if provided
  if (Array.isArray(requestParams.sites)) {
    requestParams.sites = requestParams.sites.join(',')
  }

  const { data } = await api.get('/jobs', { params: requestParams })
  return data.data || []
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
 * @param {object} jobData  - Standard Job JSON
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
 * @returns {Promise<object[]>} Array of SavedJob documents
 */
export const getSavedJobs = async () => {
  const { data } = await api.get('/jobs/saved')
  return data.data || []
}
