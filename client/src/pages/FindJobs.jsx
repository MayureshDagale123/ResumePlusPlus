import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchJobs, saveJob } from '../services/jobService'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

const SESSION_KEY = 'findjobs_state_v2'

const AVAILABLE_PLATFORMS = [
  { id: 'linkedin',       name: 'LinkedIn',       icon: '💼' },
  { id: 'indeed',         name: 'Indeed',         icon: '🔍' },
  { id: 'glassdoor',      name: 'Glassdoor',      icon: '🏢' },
  { id: 'zip_recruiter',  name: 'ZipRecruiter',   icon: '⚡' },
  { id: 'google',         name: 'Google Jobs',    icon: '🌐' },
  { id: 'naukri',         name: 'Naukri',         icon: '🇮🇳' },
]

const COUNTRIES = [
  { code: 'usa',       name: 'United States' },
  { code: 'india',     name: 'India' },
  { code: 'uk',        name: 'United Kingdom' },
  { code: 'canada',    name: 'Canada' },
  { code: 'australia', name: 'Australia' },
  { code: 'germany',   name: 'Germany' },
]

const JOB_TYPES = [
  { id: '',          label: 'All Types' },
  { id: 'fulltime',   label: 'Full-time' },
  { id: 'contract',   label: 'Contract' },
  { id: 'internship', label: 'Internship' },
  { id: 'parttime',   label: 'Part-time' },
]

const loadSession = () => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

const saveSession = (state) => {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(state)) }
  catch { /* quota exceeded — ignore */ }
}

export default function FindJobs() {
  const navigate = useNavigate()
  const session = loadSession()

  const [query, setQuery]                 = useState(session?.query || '')
  const [location, setLocation]           = useState(session?.location || '')
  const [selectedSites, setSelectedSites] = useState(session?.selectedSites || ['linkedin', 'indeed'])
  const [isRemote, setIsRemote]           = useState(session?.isRemote || false)
  const [country, setCountry]             = useState(session?.country || 'usa')
  const [jobType, setJobType]             = useState(session?.jobType || '')
  const [resultsWanted, setResultsWanted] = useState(session?.resultsWanted || 15)

  const [jobs, setJobs]         = useState(session?.jobs || [])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [searched, setSearched] = useState(session?.searched || false)
  const [savingId, setSavingId] = useState(null)
  const [savedIds, setSavedIds] = useState(new Set(session?.savedIds || []))

  // Persist state to sessionStorage whenever key fields change
  useEffect(() => {
    saveSession({
      query,
      location,
      selectedSites,
      isRemote,
      country,
      jobType,
      resultsWanted,
      jobs,
      searched,
      savedIds: [...savedIds],
    })
  }, [query, location, selectedSites, isRemote, country, jobType, resultsWanted, jobs, searched, savedIds])

  const toggleSite = (siteId) => {
    setSelectedSites((prev) => {
      if (prev.includes(siteId)) {
        if (prev.length === 1) return prev
        return prev.filter((s) => s !== siteId)
      }
      return [...prev, siteId]
    })
  }

  const selectAllSites = () => {
    setSelectedSites(AVAILABLE_PLATFORMS.map((p) => p.id))
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    setError('')
    setLoading(true)
    setSearched(true)
    setJobs([])

    try {
      const results = await searchJobs({
        query: query.trim(),
        location: location.trim(),
        sites: selectedSites,
        isRemote,
        country,
        jobType,
        resultsWanted,
      })
      setJobs(results)
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to fetch jobs. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (job) => {
    if (savedIds.has(job.externalId)) return
    setSavingId(job.externalId)
    try {
      await saveJob(job.externalId, job)
      setSavedIds((prev) => new Set([...prev, job.externalId]))
    } catch (err) {
      if (err?.response?.status === 400) {
        setSavedIds((prev) => new Set([...prev, job.externalId]))
      }
    } finally {
      setSavingId(null)
    }
  }

  const formatSalary = (salary) => {
    if (!salary || (!salary.min && !salary.max)) return null
    const curr = salary.currency || '$'
    const interval = salary.interval ? ` / ${salary.interval}` : ''
    if (salary.min && salary.max) {
      return `${curr}${salary.min.toLocaleString()} – ${curr}${salary.max.toLocaleString()}${interval}`
    }
    if (salary.min) return `From ${curr}${salary.min.toLocaleString()}${interval}`
    if (salary.max) return `Up to ${curr}${salary.max.toLocaleString()}${interval}`
    return null
  }

  const getPlatformBadge = (source) => {
    const s = String(source || '').toLowerCase()
    if (s.includes('linkedin')) return { label: 'LinkedIn', bg: 'bg-blue-500/10 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30' }
    if (s.includes('indeed'))   return { label: 'Indeed', bg: 'bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30' }
    if (s.includes('glassdoor'))return { label: 'Glassdoor', bg: 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' }
    if (s.includes('zip'))      return { label: 'ZipRecruiter', bg: 'bg-green-500/10 dark:bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30' }
    if (s.includes('google'))   return { label: 'Google', bg: 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' }
    if (s.includes('naukri'))   return { label: 'Naukri', bg: 'bg-cyan-500/10 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30' }
    return { label: source || 'Job', bg: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700' }
  }

  const inputClass =
    'bg-gray-50 dark:bg-[#111114] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all text-sm'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Find Real-Time Jobs
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
          Scraped live from top hiring platforms including LinkedIn, Indeed, Glassdoor, ZipRecruiter, and more.
        </p>
      </div>

      {/* Main Search Controls Box */}
      <div className="bg-white dark:bg-[#0f0f13] border border-gray-200 dark:border-gray-800/90 rounded-2xl p-5 sm:p-6 mb-8 shadow-sm dark:shadow-xl transition-colors">
        <form onSubmit={handleSearch} className="space-y-4">

          {/* Keyword + Location + Submit */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-6 relative">
              <span className="absolute left-3.5 top-3.5 text-gray-400 dark:text-gray-500 text-sm">🔍</span>
              <input
                type="text"
                placeholder="Job title, keywords, or company (e.g. React Developer, Data Engineer)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={`${inputClass} w-full pl-10`}
                required
              />
            </div>

            <div className="md:col-span-3 relative">
              <span className="absolute left-3.5 top-3.5 text-gray-400 dark:text-gray-500 text-sm">📍</span>
              <input
                type="text"
                placeholder="Location (city, country or Remote)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={`${inputClass} w-full pl-10`}
              />
            </div>

            <div className="md:col-span-3">
              <Button
                type="submit"
                variant="filled"
                className="w-full h-full py-3 font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Scraping Jobs…</span>
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>Search Jobs</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Platform / Job Board Choice Pills */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Select Platforms to Scrape:
              </span>
              <button
                type="button"
                onClick={selectAllSites}
                className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-semibold transition-colors"
              >
                Select All
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {AVAILABLE_PLATFORMS.map((platform) => {
                const isSelected = selectedSites.includes(platform.id)
                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => toggleSite(platform.id)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-violet-500/10 dark:bg-violet-600/20 text-violet-700 dark:text-violet-300 border-violet-500/50 shadow-sm'
                        : 'bg-gray-100 dark:bg-[#15151a] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    <span>{platform.icon}</span>
                    <span>{platform.name}</span>
                    {isSelected && <span className="text-violet-600 dark:text-violet-400 font-bold">✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Filter Row: Country, Job Type, Remote, Results Count */}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {/* Country */}
            <div>
              <label className="text-gray-600 dark:text-gray-400 block mb-1 font-medium">Region / Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#15151a] border border-gray-200 dark:border-gray-800 rounded-xl px-2.5 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-violet-500"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Job Type */}
            <div>
              <label className="text-gray-600 dark:text-gray-400 block mb-1 font-medium">Job Type</label>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#15151a] border border-gray-200 dark:border-gray-800 rounded-xl px-2.5 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-violet-500"
              >
                {JOB_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Results Wanted */}
            <div>
              <label className="text-gray-600 dark:text-gray-400 block mb-1 font-medium">Max Results</label>
              <select
                value={resultsWanted}
                onChange={(e) => setResultsWanted(Number(e.target.value))}
                className="w-full bg-gray-50 dark:bg-[#15151a] border border-gray-200 dark:border-gray-800 rounded-xl px-2.5 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-violet-500"
              >
                <option value={10}>10 jobs</option>
                <option value={15}>15 jobs</option>
                <option value={25}>25 jobs</option>
                <option value={50}>50 jobs</option>
              </select>
            </div>

            {/* Remote Only Toggle */}
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer bg-gray-50 dark:bg-[#15151a] border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 w-full px-3 py-2 rounded-xl transition-colors select-none">
                <input
                  type="checkbox"
                  checked={isRemote}
                  onChange={(e) => setIsRemote(e.target.checked)}
                  className="accent-violet-600 w-4 h-4 rounded"
                />
                <span className={`font-semibold ${isRemote ? 'text-violet-600 dark:text-violet-300' : 'text-gray-600 dark:text-gray-400'}`}>
                  Remote Only 🏠
                </span>
              </label>
            </div>
          </div>
        </form>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 text-red-600 dark:text-red-400 text-sm mb-6 flex items-center gap-2 font-medium">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Loading animation state */}
      {loading && (
        <div className="text-center py-20">
          <div className="inline-block relative">
            <div className="w-12 h-12 border-3 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-sm">🤖</div>
          </div>
          <p className="text-gray-900 dark:text-white font-bold text-base mt-4">Scraping live job listings…</p>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
            Querying {selectedSites.join(', ')} concurrently. This usually takes 5–15 seconds.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && searched && jobs.length === 0 && !error && (
        <div className="text-center py-20 bg-white dark:bg-[#0f0f13] border border-gray-200 dark:border-gray-800/80 rounded-2xl p-8 shadow-sm">
          <span className="text-4xl mb-3 block">🔎</span>
          <p className="text-gray-900 dark:text-white font-bold text-lg">No jobs found for "{query}"</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 max-w-md mx-auto">
            Try broadening your search keywords, toggling more platforms, or checking the location filter.
          </p>
        </div>
      )}

      {/* Results Section */}
      {!loading && jobs.length > 0 && (
        <div>
          {/* Results Summary Bar */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Found <span className="text-gray-900 dark:text-white font-bold">{jobs.length}</span> live listings
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Sources:</span>
              {[...new Set(jobs.map((j) => j.source))].map((src) => {
                const b = getPlatformBadge(src)
                return (
                  <span
                    key={src}
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${b.bg}`}
                  >
                    {b.label}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {jobs.map((job) => {
              const badge = getPlatformBadge(job.source)
              const salaryFormatted = formatSalary(job.salary)
              const isSaved = savedIds.has(job.externalId)

              return (
                <Card
                  key={job.externalId}
                  className="flex flex-col gap-3.5 hover:border-violet-500/40 transition-all duration-200 hover:shadow-lg"
                >
                  {/* Top: Source Badge & Logo */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border tracking-wide uppercase ${badge.bg}`}>
                          {badge.label}
                        </span>
                        {job.employmentType && (
                          <span className="text-[11px] text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/80 px-2 py-0.5 rounded font-medium">
                            {job.employmentType}
                          </span>
                        )}
                      </div>
                      <h2 className="text-gray-900 dark:text-white font-bold text-base leading-snug truncate">
                        {job.title}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-300 text-sm font-semibold mt-0.5 truncate">
                        {job.company.name}
                      </p>
                    </div>

                    {job.company.logo ? (
                      <img
                        src={job.company.logo}
                        alt={job.company.name}
                        className="w-11 h-11 rounded-xl object-contain bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-1 shrink-0"
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-gray-800 border border-violet-200 dark:border-gray-700/60 flex items-center justify-center text-violet-600 dark:text-violet-400 font-bold text-sm shrink-0">
                        {job.company.name?.[0]?.toUpperCase() || 'J'}
                      </div>
                    )}
                  </div>

                  {/* Badges: Location, Remote, Salary */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {(job.location.city || job.location.raw) && (
                      <span className="bg-gray-100 dark:bg-gray-800/70 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-lg font-medium">
                        📍 {[job.location.city, job.location.state, job.location.country].filter(Boolean).join(', ') || job.location.raw}
                      </span>
                    )}

                    {job.location.remote && (
                      <span className="bg-violet-500/10 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-500/30 px-2.5 py-1 rounded-lg font-semibold">
                        Remote
                      </span>
                    )}

                    {salaryFormatted && (
                      <span className="bg-emerald-500/10 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-semibold">
                        💰 {salaryFormatted}
                      </span>
                    )}

                    {job.postedAt && (
                      <span className="text-gray-400 dark:text-gray-500 self-center text-[11px] ml-auto">
                        Posted {job.postedAt}
                      </span>
                    )}
                  </div>

                  {/* Description preview */}
                  <p className="text-gray-600 dark:text-gray-400 text-xs line-clamp-3 leading-relaxed flex-1">
                    {job.description || 'No description provided.'}
                  </p>

                  {/* Skills tags */}
                  {job.skills && job.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {job.skills.slice(0, 4).map((skill, idx) => (
                        <span key={idx} className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 text-[10px] font-medium px-2 py-0.5 rounded">
                          {skill}
                        </span>
                      ))}
                      {job.skills.length > 4 && (
                        <span className="text-gray-500 text-[10px] self-center">
                          +{job.skills.length - 4} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800/80 flex items-center gap-2 flex-wrap">
                    <Button
                      variant="filled"
                      className="flex-1 py-2 text-xs font-bold"
                      onClick={() => navigate(`/job/${job.externalId}`, { state: { job } })}
                    >
                      View Details
                    </Button>

                    <Button
                      variant={isSaved ? 'ghost' : 'outline'}
                      className="py-2 px-3 text-xs"
                      onClick={() => handleSave(job)}
                      disabled={savingId === job.externalId || isSaved}
                    >
                      {savingId === job.externalId ? 'Saving…' : isSaved ? '✓ Saved' : 'Save'}
                    </Button>

                    <Button
                      variant="outline"
                      className="py-2 px-3 text-xs"
                      onClick={() => navigate('/optimizer', { state: { jobDescription: job.description, jobTitle: job.title } })}
                      title="Optimize your resume for this specific job"
                    >
                      ⚡ Optimize
                    </Button>

                    {job.applyUrl && (
                      <a
                        href={job.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-3 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-colors border border-gray-200 dark:border-gray-700/50 font-medium"
                        title="Apply directly on platform"
                      >
                        Apply ↗
                      </a>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
