import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSavedJobs, unsaveJob } from '../services/jobService'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

export default function SavedJobs() {
  const navigate = useNavigate()
  const [jobs, setJobs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [removingId, setRemovingId] = useState(null)

  useEffect(() => {
    const fetchSaved = async () => {
      try {
        const data = await getSavedJobs()
        setJobs(data)
      } catch {
        setError('Could not load saved jobs. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    fetchSaved()
  }, [])

  const handleRemove = async (externalId) => {
    setRemovingId(externalId)
    try {
      await unsaveJob(externalId)
      setJobs((prev) => prev.filter((j) => j.jobData.externalId !== externalId))
    } catch {
      // silently ignore
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-white mb-2">Saved Jobs</h1>
      <p className="text-gray-400 mb-8">Jobs you've saved for later review.</p>

      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && jobs.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          No saved jobs yet.{' '}
          <button
            onClick={() => navigate('/jobs')}
            className="text-violet-400 hover:text-violet-300 underline"
          >
            Find Jobs
          </button>
        </div>
      )}

      {!loading && jobs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {jobs.map(({ _id, jobData }) => (
            <Card key={_id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-white font-semibold text-base leading-snug truncate">
                    {jobData.title}
                  </h2>
                  <p className="text-gray-400 text-sm mt-0.5">{jobData.company?.name}</p>
                </div>
                {jobData.company?.logo && (
                  <img
                    src={jobData.company.logo}
                    alt={jobData.company.name}
                    className="w-10 h-10 rounded object-contain bg-gray-800 shrink-0"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                )}
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {jobData.location?.city && (
                  <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded">
                    📍 {[jobData.location.city, jobData.location.state, jobData.location.country].filter(Boolean).join(', ')}
                  </span>
                )}
                {jobData.location?.remote && (
                  <span className="bg-violet-900/30 text-violet-400 border border-violet-500/30 px-2 py-1 rounded">
                    Remote
                  </span>
                )}
                {jobData.employmentType && (
                  <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded">
                    {jobData.employmentType}
                  </span>
                )}
              </div>

              <p className="text-gray-400 text-sm line-clamp-2 flex-1">
                {jobData.description?.slice(0, 180)}…
              </p>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="filled"
                  className="flex-1 py-2 text-sm"
                  onClick={() => navigate(`/job/${jobData.externalId}`, { state: { job: jobData } })}
                >
                  View Job
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 py-2 text-sm hover:text-red-400"
                  onClick={() => handleRemove(jobData.externalId)}
                  disabled={removingId === jobData.externalId}
                >
                  {removingId === jobData.externalId ? 'Removing…' : 'Remove'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
