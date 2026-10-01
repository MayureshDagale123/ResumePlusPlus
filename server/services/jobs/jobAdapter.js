/**
 * jobAdapter.js
 *
 * Converts raw Open Web Ninja LinkedIn Jobs API response into the app's
 * Standard Job JSON.
 *
 * Why this exists:
 *   The external API can change field names, add/remove properties, or be
 *   replaced entirely. Isolating the conversion here means the rest of the app
 *   (controllers, frontend) only ever sees the stable Standard Job JSON.
 *   To add another Job API later, create a new adapter file — nothing else changes.
 *
 * API reference: https://api.openwebninja.com/realtime-linkedin-data/search
 * Response envelope: { status, request_id, parameters, data: [ ...jobs ] }
 *
 * Standard Job JSON shape:
 * {
 *   externalId:     string,
 *   source:         'openwebninja',
 *   title:          string,
 *   company:        { name, logo },
 *   location:       { city, state, country, remote },
 *   employmentType: string,
 *   description:    string,
 *   applyUrl:       string,
 *   postedAt:       string,   // ISO datetime string
 *   salary:         { min, max, currency }
 * }
 */

/**
 * Normalizes a single raw Open Web Ninja job object into Standard Job JSON.
 * @param {object} raw - One item from the API `data` array
 * @returns {object} Standard Job JSON
 */
const adaptOWNJob = (raw) => ({
  externalId:     raw.job_id    || raw.job_uid || '',
  source:         'openwebninja',
  title:          raw.job_title || '',
  company: {
    name: raw.employer_name || '',
    logo: raw.employer_logo || '',
  },
  location: {
    city:    raw.job_city    || '',
    state:   raw.job_state   || '',
    country: raw.job_country || '',
    remote:  raw.job_is_remote === true,
  },
  employmentType: raw.job_employment_type || '',
  description:    raw.job_description     || '',
  applyUrl:       raw.job_apply_link      || '',
  postedAt:       raw.job_posted_at_datetime_utc || raw.job_posted_at || '',
  salary: {
    min:      raw.job_min_salary      ?? null,
    max:      raw.job_max_salary      ?? null,
    currency: raw.job_salary_currency || '',
  },
})

/**
 * Normalizes an array of raw jobs.
 * @param {object[]} rawJobs
 * @returns {object[]} Array of Standard Job JSON objects
 */
const adaptOWNJobs = (rawJobs) => {
  if (!Array.isArray(rawJobs)) return []
  return rawJobs.map(adaptOWNJob)
}

module.exports = { adaptOWNJob, adaptOWNJobs }
