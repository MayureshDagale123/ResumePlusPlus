import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { getJob, saveJob } from '../services/jobService'
import Button from '../components/ui/Button'

export default function JobDetails() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const routerState  = useLocation().state // job data passed from search/saved list

  const [job, setJob]       = useState(routerState?.job || null)
  const [loading, setLoading] = useState(!routerState?.job) // skip loading if we have state
  const [error, setError]   = useState('')
  const [saved, setSaved]   = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // If job was passed via router state, use it directly — no API call needed
    if (routerState?.job) {
      setJob(routerState.job)
      setLoading(false)
      return
    }

    // Otherwise fetch from server (handles cached jobs and saved jobs)
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
  }, [id])

  const handleSave = async () => {
    if (saved) return
    setSaving(true)
    try {
      await saveJob(job.externalId, job)
      setSaved(true)
    } catch (err) {
      if (err?.response?.status === 400) setSaved(true) // already saved
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
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm mb-4">
          {error || 'Job not found.'}
        </div>
        <Button variant="ghost" onClick={() => navigate(-1)}>← Back</Button>
      </div>
    )
  }

  const locationStr = [job.location?.city, job.location?.state, job.location?.country]
    .filter(Boolean).join(', ')

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <button onClick={() => navigate(-1)}
        className="text-gray-400 hover:text-white text-sm mb-6 flex items-center gap-1 transition-colors">
        ← Back
      </button>

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        {job.company?.logo && (
          <img src={job.company.logo} alt={job.company.name}
            className="w-14 h-14 rounded-lg object-contain bg-gray-900 border border-gray-800 p-1 shrink-0"
            onError={(e) => { e.target.style.display = 'none' }} />
        )}
        <div>
          <h1 className="text-2xl font-bold text-white leading-snug">{job.title}</h1>
          <p className="text-gray-400 mt-1">{job.company?.name}</p>
        </div>
      </div>

      {/* Meta pills */}
      <div className="flex flex-wrap gap-2 text-xs mb-6">
        {locationStr && (
          <span className="bg-gray-800 text-gray-300 px-3 py-1.5 rounded-full">📍 {locationStr}</span>
        )}
        {job.location?.remote && (
          <span className="bg-violet-900/30 text-violet-400 border border-violet-500/30 px-3 py-1.5 rounded-full">Remote</span>
        )}
        {job.employmentType && (
          <span className="bg-gray-800 text-gray-300 px-3 py-1.5 rounded-full">{job.employmentType}</span>
        )}
        {(job.salary?.min || job.salary?.max) && (
          <span className="bg-gray-800 text-gray-300 px-3 py-1.5 rounded-full">
            💰 {job.salary.currency} {job.salary.min?.toLocaleString()} – {job.salary.max?.toLocaleString()}
          </span>
        )}
        {job.postedAt && (
          <span className="text-gray-500 px-1 self-center">
            Posted {new Date(job.postedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        {job.applyUrl && (
          <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="filled" className="px-6 py-2.5">Apply Now ↗</Button>
          </a>
        )}
        <Button variant={saved ? 'ghost' : 'outline'} className="px-6 py-2.5"
          onClick={handleSave} disabled={saving || saved}>
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Job'}
        </Button>
        <Button variant="outline" className="px-6 py-2.5" onClick={handleOptimize}>
          Optimize Resume
        </Button>
      </div>

      {/* Full description */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-white font-semibold text-lg mb-4">Job Description</h2>
        <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
          {job.description}
        </div>
      </div>
    </div>
  )
}
