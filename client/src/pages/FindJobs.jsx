import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchJobs, saveJob } from '../services/jobService'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

// Persist search results in sessionStorage so navigating away and back
// doesn't wipe the jobs list.
const SESSION_KEY = 'findjobs_state'

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

  // Restore from session on mount so jobs survive tab switches
  const session = loadSession()

  const [query, setQuery]       = useState(session?.query    || '')
  const [location, setLocation] = useState(session?.location || '')
  const [jobs, setJobs]         = useState(session?.jobs     || [])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [searched, setSearched] = useState(session?.searched || false)
  const [savingId, setSavingId] = useState(null)
  const [savedIds, setSavedIds] = useState(new Set(session?.savedIds || []))

  // Persist state to sessionStorage whenever jobs/query/location changes
  useEffect(() => {
    saveSession({ query, location, jobs, searched, savedIds: [...savedIds] })
  }, [query, location, jobs, searched, savedIds])

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    setError('')
    setLoading(true)
    setSearched(true)
    setJobs([])

    try {
      const results = await searchJobs(query.trim(), location.trim())
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

  const inputClass =
    'bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-violet-500 transition-colors'

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-white mb-2">Find Jobs</h1>
      <p className="text-gray-400 mb-8">Search thousands of real job listings.</p>

      {/* Search form */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-10">
        <input
          type="text"
          placeholder="Job title, keyword, or company"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`${inputClass} flex-1`}
          required
        />
        <input
          type="text"
          placeholder="Location (optional)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className={`${inputClass} w-full sm:w-48`}
        />
        <Button type="submit" variant="filled" className="px-8 py-3 whitespace-nowrap" disabled={loading}>
          {loading ? 'Searching…' : 'Search Jobs'}
        </Button>
      </form>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm mb-6">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!loading && searched && jobs.length === 0 && !error && (
        <div className="text-center py-20 text-gray-500">
          No jobs found for <span className="text-gray-300">"{query}"</span>.
          Try a different keyword or location.
        </div>
      )}

      {/* Results */}
      {!loading && jobs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {jobs.map((job) => (
            <Card key={job.externalId} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-white font-semibold text-base leading-snug truncate">{job.title}</h2>
                  <p className="text-gray-400 text-sm mt-0.5">{job.company.name}</p>
                </div>
                {job.company.logo && (
                  <img src={job.company.logo} alt={job.company.name}
                    className="w-10 h-10 rounded object-contain bg-gray-800 shrink-0"
                    onError={(e) => { e.target.style.display = 'none' }} />
                )}
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {job.location.city && (
                  <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded">
                    📍 {[job.location.city, job.location.state, job.location.country].filter(Boolean).join(', ')}
                  </span>
                )}
                {job.location.remote && (
                  <span className="bg-violet-900/30 text-violet-400 border border-violet-500/30 px-2 py-1 rounded">Remote</span>
                )}
                {job.employmentType && (
                  <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded">{job.employmentType}</span>
                )}
                {job.postedAt && (
                  <span className="text-gray-600 px-1">
                    {new Date(job.postedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
              </div>

              <p className="text-gray-400 text-sm line-clamp-2 flex-1">
                {job.description?.slice(0, 180)}…
              </p>

              <div className="flex gap-2 pt-1">
                <Button variant="filled" className="flex-1 py-2 text-sm"
                  onClick={() => navigate(`/job/${job.externalId}`, { state: { job } })}>
                  View Job
                </Button>
                <Button
                  variant={savedIds.has(job.externalId) ? 'ghost' : 'outline'}
                  className="flex-1 py-2 text-sm"
                  onClick={() => handleSave(job)}
                  disabled={savingId === job.externalId || savedIds.has(job.externalId)}>
                  {savingId === job.externalId ? 'Saving…'
                    : savedIds.has(job.externalId) ? '✓ Saved'
                    : 'Save Job'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
