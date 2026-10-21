/**
 * jobService.js
 *
 * Real-time job scraping and retrieval service powered by JobSpy.
 * Supports multi-platform scraping: LinkedIn, Indeed, Glassdoor, ZipRecruiter, Google, Naukri, Bayt, etc.
 *
 * Workflow:
 *   Controller → jobService.searchJobs()
 *     → Runs jobspy_scraper.py
 *     → JobSpy scrapes boards concurrently & outputs CSV
 *     → CSV is parsed via csv-parse/sync into Standard Job JSON
 *     → Jobs are cached in MongoDB
 *     → Returns Standard Job JSON[]
 */

const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const { spawn } = require('child_process')
const { parse } = require('csv-parse/sync')
const Job = require('../../models/Job')

const SCRAPER_PATH = path.join(__dirname, 'jobspy_scraper.py')
const CACHE_DIR = path.join(__dirname, 'cache')

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
}

/**
 * Finds an available Python binary on the system.
 */
const getPythonCommand = () => {
  return process.env.PYTHON_PATH || 'python'
}

/**
 * Parses location string into structured parts.
 */
const parseLocation = (rawLocation, isRemoteStr) => {
  const isRemote =
    String(isRemoteStr).toLowerCase() === 'true' ||
    String(rawLocation).toLowerCase().includes('remote')

  const clean = (rawLocation || '').trim()
  if (!clean) {
    return { city: '', state: '', country: '', remote: isRemote, raw: '' }
  }

  const parts = clean.split(',').map((p) => p.trim()).filter(Boolean)
  let city = ''
  let state = ''
  let country = ''

  if (parts.length === 1) {
    city = parts[0]
  } else if (parts.length === 2) {
    city = parts[0]
    state = parts[1]
  } else if (parts.length >= 3) {
    city = parts[0]
    state = parts[1]
    country = parts.slice(2).join(', ')
  }

  return {
    city,
    state,
    country,
    remote: isRemote,
    raw: clean,
  }
}

/**
 * Formats skills list from string or array.
 */
const parseSkills = (rawSkills) => {
  if (!rawSkills) return []
  if (Array.isArray(rawSkills)) return rawSkills
  return String(rawSkills)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Normalizes one CSV row into Standard Job JSON.
 */
const convertCsvRowToJob = (row) => {
  const fallbackId = crypto
    .createHash('md5')
    .update(`${row.site || 'job'}-${row.title || ''}-${row.company || ''}-${row.job_url || ''}`)
    .digest('hex')
    .slice(0, 16)

  const externalId = row.id?.trim() || fallbackId
  const loc = parseLocation(row.location, row.is_remote)

  const minSalary = row.min_amount ? parseFloat(row.min_amount) : null
  const maxSalary = row.max_amount ? parseFloat(row.max_amount) : null

  return {
    externalId,
    source: (row.site || 'jobspy').toLowerCase(),
    title: row.title?.trim() || 'Untitled Position',
    company: {
      name: row.company?.trim() || 'Company Not Specified',
      logo: row.company_logo?.trim() || '',
    },
    location: loc,
    employmentType: row.job_type?.trim() || '',
    description: row.description?.trim() || '',
    applyUrl: row.job_url_direct?.trim() || row.job_url?.trim() || '',
    postedAt: row.date_posted?.trim() || '',
    salary: {
      min: isNaN(minSalary) ? null : minSalary,
      max: isNaN(maxSalary) ? null : maxSalary,
      currency: row.currency?.trim() || '',
      interval: row.interval?.trim() || '',
    },
    skills: parseSkills(row.skills),
    jobLevel: row.job_level?.trim() || '',
  }
}

/**
 * Executes the Python scraper and returns the CSV output path.
 */
const runPythonScraper = (options) => {
  return new Promise((resolve, reject) => {
    const {
      query,
      location = '',
      sites = 'linkedin,indeed',
      resultsWanted = 15,
      isRemote = false,
      countryIndeed = 'usa',
      jobType = '',
      hoursOld = '',
    } = options

    const uniqueId = crypto.randomBytes(8).toString('hex')
    const csvFileName = `jobs_${Date.now()}_${uniqueId}.csv`
    const outputCsvPath = path.join(CACHE_DIR, csvFileName)

    const args = [
      SCRAPER_PATH,
      '--search-term', query,
      '--output-csv', outputCsvPath,
      '--results-wanted', String(resultsWanted),
    ]

    if (location) args.push('--location', location)
    if (sites) args.push('--sites', Array.isArray(sites) ? sites.join(',') : sites)
    if (isRemote) args.push('--is-remote')
    if (countryIndeed) args.push('--country-indeed', countryIndeed)
    if (jobType) args.push('--job-type', jobType)
    if (hoursOld) args.push('--hours-old', String(hoursOld))

    const pythonBin = getPythonCommand()
    const pyProcess = spawn(pythonBin, args, { timeout: 60000 })

    let stdoutData = ''
    let stderrData = ''

    pyProcess.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString()
    })

    pyProcess.stderr.on('data', (chunk) => {
      stderrData += chunk.toString()
    })

    pyProcess.on('close', (code) => {
      if (code !== 0 && !fs.existsSync(outputCsvPath)) {
        console.error('JobSpy process error (code', code, '):', stderrData)
        return reject(new Error(stderrData || `Scraper exited with code ${code}`))
      }
      resolve({ outputCsvPath, stdout: stdoutData })
    })

    pyProcess.on('error', (err) => {
      reject(new Error(`Failed to start python scraper: ${err.message}`))
    })
  })
}

/**
 * Search jobs using JobSpy scraper and converts CSV to internal Standard Job JSON.
 *
 * @param {object} params
 * @param {string} params.query          - job title or keywords
 * @param {string} [params.location]     - location string
 * @param {string|string[]} [params.sites] - job boards (linkedin, indeed, glassdoor, etc.)
 * @param {boolean} [params.isRemote]    - filter for remote jobs
 * @param {string} [params.jobType]     - fulltime, contract, parttime, internship
 * @param {string} [params.country]     - country for indeed (e.g. usa, india, uk)
 * @param {number} [params.resultsWanted]- jobs wanted (default 15)
 * @returns {Promise<object[]>} Array of Standard Job JSON objects
 */
const searchJobs = async (params) => {
  // Support both legacy signature searchJobs(query, location) and object params
  let options = {}
  if (typeof params === 'string') {
    options = { query: params, location: arguments[1] || '' }
  } else {
    options = params || {}
  }

  const { query = '' } = options
  if (!query.trim()) return []

  let csvPath = null
  try {
    const scrapeResult = await runPythonScraper(options)
    csvPath = scrapeResult.outputCsvPath

    if (!fs.existsSync(csvPath)) {
      throw new Error('CSV output file was not generated')
    }

    const csvContent = fs.readFileSync(csvPath, 'utf8')
    if (!csvContent || csvContent.trim() === '') {
      return []
    }

    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
      trim: true,
    })

    const standardJobs = records.map(convertCsvRowToJob)

    // Cache scraped jobs asynchronously in MongoDB so detail lookups succeed
    if (standardJobs.length > 0) {
      Promise.all(
        standardJobs.map((j) =>
          Job.updateOne(
            { externalId: j.externalId },
            { $set: j },
            { upsert: true }
          ).catch((e) => console.warn('Cache write warning:', e.message))
        )
      ).catch(() => {})
    }

    return standardJobs
  } catch (err) {
    console.error('JobSpy scrape failed:', err.message)

    // Fallback: search cached MongoDB jobs matching title or description
    try {
      const regex = new RegExp(query.trim().split(' ').join('|'), 'i')
      const cached = await Job.find({
        $or: [{ title: regex }, { description: regex }],
      })
        .sort({ updatedAt: -1 })
        .limit(options.resultsWanted || 15)

      if (cached && cached.length > 0) {
        return cached.map((c) => c.toObject())
      }
    } catch {
      // ignore fallback error
    }

    throw err
  } finally {
    // Clean up temporary CSV file
    if (csvPath && fs.existsSync(csvPath)) {
      try {
        fs.unlinkSync(csvPath)
      } catch {
        // ignore deletion errors
      }
    }
  }
}

/**
 * Find a single cached job by its externalId.
 * @param {string} jobId - externalId
 * @returns {Promise<object|null>}
 */
const getJobById = async (jobId) => {
  if (!jobId) return null
  const job = await Job.findOne({ externalId: jobId })
  return job ? job.toObject() : null
}

module.exports = {
  searchJobs,
  getJobById,
  convertCsvRowToJob,
}
