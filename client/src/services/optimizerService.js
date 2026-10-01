import api from './api'

/**
 * Optimize the authenticated user's original resume for a job description.
 * @param {string} jobDescription - The full job description text
 * @param {string} jobTitle       - Human-readable label (e.g. "Senior React Developer")
 * @param {string} savedJobId     - Optional: _id of the SavedJob document
 * @returns {Promise<object>} The saved OptimizedResume document
 */
export const optimizeResume = async (jobDescription, jobTitle = '', savedJobId = null) => {
  const { data } = await api.post('/optimizer', { jobDescription, jobTitle, savedJobId })
  return data.data
}
