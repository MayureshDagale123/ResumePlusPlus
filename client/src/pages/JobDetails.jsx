import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { getJob, saveJob } from '../services/jobService'
import Button from '../components/ui/Button'

export default function JobDetails() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const routerState  = useLocation().state // job data passed from search/saved list

  const [job, setJob]         = useState(routerState?.job || null)
  const [loading, setLoading] = useState(!routerState?.job) // skip loading if we have state
  const [error, setError]     = useState('')
  const [saved, setSaved]     = useState(false)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    if (routerState?.job) {
      setJob(routerState.job)
      setLoading(false)
      return
    }

    const fetchJob = async () => {
      try {
        const data = await getJob(id)
        setJob(data)
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load job details.')
      } finally {
        setLoading(false)
      }
    }
    fetchJob()
  }, [id, routerState])

  const handleSave = async () => {
    if (saved) return
    setSaving(true)
    try {
      await saveJob(job.externalId, job)
      setSaved(true)
    } catch (err) {
      if (err?.response?.status === 400) setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  const handleOptimize = () => {
    navigate('/optimizer', { state: { jobDescription: job.description, jobTitle: job.title } })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 text-red-600 dark:text-red-400 text-sm mb-4 font-medium">
          {error || 'Job not found.'}
        </div>
        <Button variant="ghost" onClick={() => navigate(-1)}>← Back</Button>
      </div>
    )
  }

  const locationStr =
    [job.location?.city, job.location?.state, job.location?.country]
      .filter(Boolean)
      .join(', ') || job.location?.raw || ''

  const displayDate = job.postedAt
    ? isNaN(Date.parse(job.postedAt))
      ? job.postedAt
      : new Date(job.postedAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
    : ''

  const salaryDisplay =
    (job.salary?.min || job.salary?.max)
      ? `${job.salary.currency || '$'}${job.salary.min ? job.salary.min.toLocaleString() : ''}${
          job.salary.min && job.salary.max ? ' – ' : ''
        }${job.salary.max ? `${job.salary.currency || '$'}${job.salary.max.toLocaleString()}` : ''}${
          job.salary.interval ? ` / ${job.salary.interval}` : ''
        }`
      : null

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <button
        onClick={() => navigate(-1)}
        className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm mb-6 flex items-center gap-1 transition-colors font-semibold"
      >
        ← Back to Jobs
      </button>

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        {job.company?.logo ? (
          <img
            src={job.company.logo}
            alt={job.company.name}
            className="w-16 h-16 rounded-2xl object-contain bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-1.5 shadow-sm shrink-0"
            onError={(e) => { e.target.style.display = 'none' }}
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-violet-50 dark:bg-gray-900 border border-violet-200 dark:border-gray-800 flex items-center justify-center text-2xl text-violet-600 dark:text-violet-400 font-bold shrink-0">
            {job.company?.name?.[0]?.toUpperCase() || 'J'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {job.source && (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20">
                {job.source}
              </span>
            )}
            {job.jobLevel && (
              <span className="text-[10px] text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded font-medium">
                {job.jobLevel}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white leading-tight">
            {job.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 font-semibold text-base mt-1">{job.company?.name}</p>
        </div>
      </div>

      {/* Meta pills */}
      <div className="flex flex-wrap gap-2 text-xs mb-6">
        {locationStr && (
          <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-xl font-medium">
            📍 {locationStr}
          </span>
        )}
        {job.location?.remote && (
          <span className="bg-violet-500/10 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border border-violet-500/30 px-3 py-1.5 rounded-xl font-bold">
            Remote
          </span>
        )}
        {job.employmentType && (
          <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-xl font-medium">
            {job.employmentType}
          </span>
        )}
        {salaryDisplay && (
          <span className="bg-emerald-500/10 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-bold">
            💰 {salaryDisplay}
          </span>
        )}
        {displayDate && (
          <span className="text-gray-500 px-1 self-center text-xs">
            Posted {displayDate}
          </span>
        )}
      </div>

      {/* Skills tags */}
      {job.skills && job.skills.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs uppercase text-gray-500 dark:text-gray-400 font-bold mb-2 tracking-wider">
            Key Skills Mentioned
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {job.skills.map((skill, idx) => (
              <span key={idx} className="bg-gray-100 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700/60 px-3 py-1 rounded-lg text-xs font-medium">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        {job.applyUrl && (
          <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="filled" className="px-6 py-2.5 font-bold shadow-md shadow-violet-600/20">
              Apply Now ↗
            </Button>
          </a>
        )}
        <Button
          variant={saved ? 'ghost' : 'outline'}
          className="px-6 py-2.5 font-semibold"
          onClick={handleSave}
          disabled={saving || saved}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Job'}
        </Button>
        <Button
          variant="outline"
          className="px-6 py-2.5 font-semibold"
          onClick={handleOptimize}
        >
          ⚡ Optimize Resume for this Job
        </Button>
      </div>

      {/* Full description */}
      <div className="bg-white dark:bg-[#0f0f13] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 sm:p-8 shadow-sm dark:shadow-md transition-colors">
        <h2 className="text-gray-900 dark:text-white font-bold text-lg mb-4">Job Description</h2>
        <div className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-line">
          {job.description}
        </div>
      </div>
    </div>
  )
}
