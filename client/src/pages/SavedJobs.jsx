import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSavedJobs, unsaveJob } from '../services/jobService'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

export default function SavedJobs() {
  const navigate = useNavigate()
  const [jobs, setJobs]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Saved Jobs
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
          Jobs you've bookmarked for review and AI resume optimization.
        </p>
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 text-red-600 dark:text-red-400 text-sm mb-6 font-medium">
          {error}
        </div>
      )}

      {!loading && !error && jobs.length === 0 && (
        <Card className="text-center py-16">
          <span className="text-4xl mb-3 block">💾</span>
          <p className="text-gray-900 dark:text-white font-bold text-lg mb-1">No saved jobs yet</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">
            Browse live jobs across multiple platforms and save your top matches.
          </p>
          <Button variant="filled" onClick={() => navigate('/jobs')}>
            Search Jobs Now
          </Button>
        </Card>
      )}

      {!loading && jobs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {jobs.map(({ _id, jobData }) => (
            <Card key={_id} className="flex flex-col gap-3.5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {jobData.source && (
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 mb-1 inline-block">
                      {jobData.source}
                    </span>
                  )}
                  <h2 className="text-gray-900 dark:text-white font-bold text-base leading-snug truncate">
                    {jobData.title}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 text-sm font-semibold mt-0.5 truncate">
                    {jobData.company?.name}
                  </p>
                </div>
                {jobData.company?.logo ? (
                  <img
                    src={jobData.company.logo}
                    alt={jobData.company.name}
                    className="w-11 h-11 rounded-xl object-contain bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 p-1 shrink-0"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-gray-800 border border-violet-200 dark:border-gray-700 flex items-center justify-center text-sm font-bold text-violet-600 dark:text-violet-400 shrink-0">
                    {jobData.company?.name?.[0]?.toUpperCase() || 'J'}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {(jobData.location?.city || jobData.location?.raw) && (
                  <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-lg font-medium">
                    📍 {[jobData.location?.city, jobData.location?.state, jobData.location?.country].filter(Boolean).join(', ') || jobData.location?.raw}
                  </span>
                )}
                {jobData.location?.remote && (
                  <span className="bg-violet-500/10 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border border-violet-500/30 px-2.5 py-1 rounded-lg font-semibold">
                    Remote
                  </span>
                )}
                {jobData.employmentType && (
                  <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-lg font-medium">
                    {jobData.employmentType}
                  </span>
                )}
              </div>

              <p className="text-gray-600 dark:text-gray-400 text-xs line-clamp-2 leading-relaxed flex-1">
                {jobData.description}
              </p>

              <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <Button
                  variant="filled"
                  className="flex-1 py-2 text-xs font-semibold"
                  onClick={() => navigate(`/job/${jobData.externalId}`, { state: { job: jobData } })}
                >
                  View Details
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 py-2 text-xs"
                  onClick={() => navigate('/optimizer', { state: { jobDescription: jobData.description, jobTitle: jobData.title } })}
                >
                  ⚡ Optimize
                </Button>
                <Button
                  variant="ghost"
                  className="py-2 px-3 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 font-semibold"
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
