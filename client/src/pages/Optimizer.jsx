import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getResume } from '../services/resumeService'
import { getSavedJobs } from '../services/jobService'
import { optimizeResume } from '../services/optimizerService'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

export default function Optimizer() {
  const navigate = useNavigate()
  const location = useLocation()

  // State: resume status
  const [resume, setResume]       = useState(null)
  const [resumeLoading, setResumeLoading] = useState(true)

  // State: saved jobs for dropdown
  const [savedJobs, setSavedJobs] = useState([])

  // State: form inputs
  const [mode, setMode]             = useState('paste')    // 'paste' | 'saved'
  const [selectedJob, setSelectedJob] = useState(null)     // SavedJob document
  const [jobDescription, setJobDescription] = useState('') // pasted JD text
  const [jobTitle, setJobTitle]     = useState('')          // label for the result

  // State: submission
  const [optimizing, setOptimizing] = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState(false)
  const [resultId, setResultId]     = useState(null)

  // Pre-populate from JobDetails "Optimize Resume" button
  useEffect(() => {
    if (location.state?.jobDescription) {
      setJobDescription(location.state.jobDescription)
      setJobTitle(location.state.jobTitle || '')
      setMode('paste')
    }
  }, [location.state])

  // Load resume status and saved jobs on mount
  useEffect(() => {
    const init = async () => {
      try {
        const r = await getResume()
        setResume(r)
      } catch {
        setResume(null)
      } finally {
        setResumeLoading(false)
      }

      try {
        const jobs = await getSavedJobs()
        setSavedJobs(jobs)
      } catch {
        setSavedJobs([])
      }
    }
    init()
  }, [])

  // When a saved job is selected, populate the JD textarea
  const handleJobSelect = (e) => {
    const id = e.target.value
    if (!id) { setSelectedJob(null); setJobDescription(''); setJobTitle(''); return }
    const job = savedJobs.find(j => j._id === id)
    if (job) {
      setSelectedJob(job)
      setJobDescription(job.jobData?.description || '')
      setJobTitle(job.jobData?.title || '')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!jobDescription.trim()) { setError('Please provide a job description.'); return }
    if (jobDescription.trim().length < 50) {
      setError('Job description is too short — paste the full listing for best results.')
      return
    }

    setError('')
    setOptimizing(true)

    try {
      const result = await optimizeResume(
        jobDescription.trim(),
        jobTitle.trim() || 'Optimized Resume',
        selectedJob?._id || null,
      )
      setResultId(result._id)
      setSuccess(true)
    } catch (err) {
      setError(err?.response?.data?.message || 'Optimization failed. Please try again.')
    } finally {
      setOptimizing(false)
    }
  }

  const inputClass =
    'bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-violet-500 transition-colors w-full text-sm'

  // ── Loading state ────────────────────────────────────────────
  if (resumeLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Success state ────────────────────────────────────────────
  if (success) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-white mb-3">Resume Optimized!</h1>
        <p className="text-gray-400 text-sm mb-8">
          Your AI-optimized resume has been saved. Preview it or start a new optimization.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="filled" className="px-8 py-3"
            onClick={() => navigate(`/resume/optimized/${resultId}`)}>
            Preview Optimized Resume
          </Button>
          <Button variant="outline" className="px-8 py-3"
            onClick={() => { setSuccess(false); setJobDescription(''); setJobTitle(''); setSelectedJob(null) }}>
            Optimize Again
          </Button>
          <Button variant="ghost" className="px-8 py-3"
            onClick={() => navigate('/resume')}>
            My Resume
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Resume Optimizer</h1>
        <p className="text-gray-400 mt-1 text-sm">
          AI will tailor your original resume for the job description — without changing your facts.
        </p>
      </div>

      {/* No resume warning */}
      {!resume && (
        <Card className="mb-6 border-yellow-500/30 bg-yellow-900/10">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="text-yellow-400 font-medium text-sm">No original resume found</p>
              <p className="text-gray-400 text-sm mt-0.5">
                You need to create your resume before optimizing it.
              </p>
              <Button variant="outline" className="mt-3 text-sm py-2"
                onClick={() => navigate('/resume/create')}>
                Create Resume
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Original resume status badge */}
      {resume && (
        <div className="flex items-center gap-2 mb-6 text-sm">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
          <span className="text-gray-400">
            Using: <span className="text-white font-medium">{resume.personalInfo?.name || 'Your Resume'}</span>
            <span className="text-gray-600 ml-1">(original — will not be modified)</span>
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Mode tabs */}
        <div className="flex gap-2 mb-6">
          <button type="button"
            onClick={() => { setMode('paste'); setSelectedJob(null) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'paste'
                ? 'bg-violet-600/20 text-violet-400 border border-violet-500/40'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800 border border-transparent'
            }`}>
            📋 Paste Job Description
          </button>
          <button type="button"
            onClick={() => setMode('saved')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'saved'
                ? 'bg-violet-600/20 text-violet-400 border border-violet-500/40'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800 border border-transparent'
            }`}>
            💾 Select Saved Job {savedJobs.length > 0 && `(${savedJobs.length})`}
          </button>
        </div>

        <Card className="mb-5">
          {/* Saved job selector */}
          {mode === 'saved' && (
            <div className="mb-5">
              <label className="text-xs text-gray-400 mb-2 block">Select a Saved Job</label>
              {savedJobs.length === 0 ? (
                <div className="text-gray-500 text-sm">
                  No saved jobs yet.{' '}
                  <button type="button" onClick={() => navigate('/jobs')}
                    className="text-violet-400 hover:text-violet-300 underline">
                    Find Jobs
                  </button>
                </div>
              ) : (
                <select
                  className={`${inputClass} bg-gray-900`}
                  onChange={handleJobSelect}
                  defaultValue="">
                  <option value="">— Choose a saved job —</option>
                  {savedJobs.map(j => (
                    <option key={j._id} value={j._id}>
                      {j.jobData?.title} {j.jobData?.company?.name ? `· ${j.jobData.company.name}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Job title label */}
          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-1.5 block">
              Job Title / Label <span className="text-gray-600">(used to name the result)</span>
            </label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Senior React Developer at Google"
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
            />
          </div>

          {/* Job description */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">
              Job Description *
              {jobDescription.length > 0 && (
                <span className="text-gray-600 ml-2">{jobDescription.length} chars</span>
              )}
            </label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={12}
              placeholder="Paste the full job description here…&#10;&#10;Include requirements, responsibilities, and any keywords you want the AI to consider."
              value={jobDescription}
              onChange={e => { setError(''); setJobDescription(e.target.value) }}
              required
            />
          </div>
        </Card>

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Info box */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-lg px-4 py-3 text-xs text-gray-500 mb-6">
          <p>
            🤖 <span className="text-gray-400 font-medium">What AI will do:</span>{' '}
            Reword descriptions for impact, align keywords, improve summary phrasing, reorder skills by relevance.
          </p>
          <p className="mt-1">
            🛡️ <span className="text-gray-400 font-medium">What AI will NOT do:</span>{' '}
            Add skills, experience, or achievements you don't have. Your original resume stays untouched.
          </p>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          variant="filled"
          className={`w-full py-4 text-base font-semibold shadow-[0_0_20px_rgba(139,92,246,0.3)] ${
            optimizing ? 'opacity-70 cursor-not-allowed' : ''
          }`}
          disabled={!resume || optimizing}>
          {optimizing ? (
            <span className="flex items-center justify-center gap-3">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Optimizing with Gemini AI…
            </span>
          ) : (
            '⚡ Optimize Your Resume'
          )}
        </Button>

        {optimizing && (
          <p className="text-center text-gray-500 text-xs mt-3">
            This usually takes 10–20 seconds…
          </p>
        )}
      </form>
    </div>
  )
}
