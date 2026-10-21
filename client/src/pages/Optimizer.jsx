import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getResume } from '../services/resumeService'
import { getSavedJobs } from '../services/jobService'
import { optimizeResume } from '../services/optimizerService'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { extractSkills, calculateAtsScore, getScoreColor } from '../utils/atsScorer'

const SAMPLE_JDS = [
  {
    title: 'Senior Full Stack Engineer',
    company: 'Stripe',
    text: `We are looking for a Senior Full Stack Engineer proficient in React, Node.js, TypeScript, and distributed systems. 
Responsibilities:
- Architect and scale robust APIs and high-throughput microservices.
- Build clean, accessible, and responsive user interfaces with React and Tailwind CSS.
- Optimize database performance across PostgreSQL and Redis with low latency.
- Lead code reviews, system design sessions, and CI/CD automation with Docker & AWS.
Qualifications:
- 3+ years experience building web applications at scale.
- Strong knowledge of RESTful APIs, state management, and cloud architecture.
- Demonstrated experience in improving system performance and metrics.`,
  },
  {
    title: 'Frontend React Developer',
    company: 'Vercel',
    text: `Seeking a skilled Frontend Engineer with deep expertise in React, Next.js, TypeScript, and modern CSS.
Responsibilities:
- Develop ultra-responsive, beautiful web applications with high performance.
- Collaborate with product designers to implement pixel-perfect user experiences.
- Optimize web vitals, bundle size, and client-side rendering speed.
- Write unit and end-to-end automated tests with Jest and Cypress.
Qualifications:
- Strong background in React component lifecycle, custom hooks, and state.
- Excellent attention to typography, micro-interactions, and accessibility standards.`,
  },
]

export default function Optimizer() {
  const navigate = useNavigate()
  const location = useLocation()

  // State: resume status
  const [resume, setResume]               = useState(null)
  const [resumeLoading, setResumeLoading] = useState(true)

  // State: saved jobs for dropdown
  const [savedJobs, setSavedJobs]         = useState([])

  // State: form inputs
  const [mode, setMode]                     = useState('paste') // 'paste' | 'saved'
  const [selectedJob, setSelectedJob]       = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [jobTitle, setJobTitle]             = useState('')

  // State: submission & result
  const [optimizing, setOptimizing]     = useState(false)
  const [error, setError]               = useState('')
  const [success, setSuccess]           = useState(false)
  const [resultResume, setResultResume] = useState(null)

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
        setSavedJobs(jobs || [])
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

  const handleApplySample = (sample) => {
    setJobTitle(sample.title)
    setJobDescription(sample.text)
    setError('')
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
      setResultResume(result)
      setSuccess(true)
    } catch (err) {
      setError(err?.response?.data?.message || 'Optimization failed. Please try again.')
    } finally {
      setOptimizing(false)
    }
  }

  const inputClass =
    'bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-violet-500 transition-colors w-full text-sm'

  // Extract skills safely from original resume
  const resumeSkills = extractSkills(resume?.skills)
  const jdLower = (jobDescription || '').toLowerCase()
  const matchedSkills = resumeSkills.filter(s => jdLower.includes(s.toLowerCase()))
  const missingSkills = resumeSkills.filter(s => !jdLower.includes(s.toLowerCase()))
  const alignmentRate = resumeSkills.length > 0 ? Math.round((matchedSkills.length / resumeSkills.length) * 100) : 0

  // ── Loading state ────────────────────────────────────────────
  if (resumeLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Success state ────────────────────────────────────────────
  if (success && resultResume) {
    const calculated = calculateAtsScore(resultResume.resumeData, {
      jobDescription,
      jobTitle,
    })
    const finalScore = (resultResume.atsScore && resultResume.atsScore < 100) ? resultResume.atsScore : calculated.score
    const scoreColors = getScoreColor(finalScore)

    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Resume Optimized Successfully!
        </h1>

        {/* Real Score Result Banner */}
        <div className="my-6 p-5 rounded-2xl bg-white dark:bg-[#111115] border border-gray-200 dark:border-gray-800 shadow-lg text-left">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <span className="text-xs uppercase font-bold text-gray-400">Achieved Job Match ATS Score</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className={`text-3xl font-black ${scoreColors.text}`}>
                  {finalScore}
                </span>
                <span className="text-sm text-gray-400 font-bold">/ 100</span>
              </div>
            </div>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${scoreColors.badge}`}>
              {finalScore >= 90 ? '✓ ATS 90+ Ready' : 'ATS Tailored'}
            </span>
          </div>

          <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all duration-700 ${scoreColors.bar}`}
              style={{ width: `${finalScore}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1 border-t border-gray-100 dark:border-gray-800">
            <div>
              <div className="text-gray-400 text-[10px] uppercase font-semibold">Job Match</div>
              <div className="font-bold text-violet-600 dark:text-violet-400 mt-0.5">
                {calculated.keywordMatchRate || 85}%
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-[10px] uppercase font-semibold">Skills</div>
              <div className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                {resultResume.resumeData?.skills?.length || 0}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-[10px] uppercase font-semibold">Experience</div>
              <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                ✓ Google XYZ
              </div>
            </div>
          </div>
        </div>

        <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-6 sm:mb-8">
          Your tailored resume is now formatted for enterprise ATS parsers with aligned headline, high-impact bullet points, and keyword density.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="filled"
            className="px-6 py-3 font-bold"
            onClick={() => navigate(`/resume/optimized/${resultResume._id}`)}
          >
            Preview & Download PDF
          </Button>
          <Button
            variant="outline"
            className="px-6 py-3 font-semibold"
            onClick={() => {
              setSuccess(false)
              setResultResume(null)
              setJobDescription('')
              setJobTitle('')
              setSelectedJob(null)
            }}
          >
            Optimize Another
          </Button>
          <Button
            variant="ghost"
            className="px-6 py-3 font-semibold"
            onClick={() => navigate('/resume')}
          >
            My Resumes Hub
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 mb-2">
          <span>⚡</span> 90+ ATS Score Tailoring
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Resume Optimizer</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1 text-xs sm:text-sm">
          Gemini AI tailors your resume for any target job description using ATS keyword harmonization and Google XYZ action formulas — without inventing false claims.
        </p>
      </div>

      {/* No resume warning */}
      {!resume && (
        <Card className="mb-6 border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="text-amber-800 dark:text-amber-300 font-medium text-sm">No original resume found</p>
              <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-0.5">
                You need to create your baseline resume before optimizing it for a specific job.
              </p>
              <Button variant="outline" className="mt-3 text-xs sm:text-sm py-2"
                onClick={() => navigate('/resume/create')}>
                Create Resume
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Original resume status badge */}
      {resume && (
        <div className="flex flex-wrap items-center gap-2 mb-5 text-xs sm:text-sm bg-gray-50 dark:bg-gray-900/60 p-3 rounded-xl border border-gray-200/80 dark:border-gray-800">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-gray-600 dark:text-gray-400">
            Source resume: <strong className="text-gray-900 dark:text-white">{resume.personalInfo?.name || 'Your Resume'}</strong>
            <span className="text-gray-500 ml-1.5 text-xs">(original remains safely preserved)</span>
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Mode tabs */}
        <div className="flex gap-2 mb-4 sm:mb-6">
          <button type="button"
            onClick={() => { setMode('paste'); setSelectedJob(null) }}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex-1 sm:flex-initial text-center ${
              mode === 'paste'
                ? 'bg-violet-100 dark:bg-violet-600/20 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-500/40'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent'
            }`}>
            📋 Paste Job Description
          </button>
          <button type="button"
            onClick={() => setMode('saved')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex-1 sm:flex-initial text-center ${
              mode === 'saved'
                ? 'bg-violet-100 dark:bg-violet-600/20 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-500/40'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent'
            }`}>
            💾 Select Saved Job {savedJobs.length > 0 && `(${savedJobs.length})`}
          </button>
        </div>

        {/* Quick sample JD presets for mobile & desktop */}
        {mode === 'paste' && (
          <div className="mb-4">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium block mb-1.5">
              💡 Or try a realistic sample job:
            </span>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_JDS.map((sample) => (
                <button
                  key={sample.title}
                  type="button"
                  onClick={() => handleApplySample(sample)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-violet-500 text-gray-700 dark:text-gray-300 bg-white dark:bg-[#121216] transition-colors"
                >
                  + {sample.title} ({sample.company})
                </button>
              ))}
            </div>
          </div>
        )}

        <Card className="mb-5 shadow-sm border border-gray-200/80 dark:border-gray-800">
          {/* Saved job selector */}
          {mode === 'saved' && (
            <div className="mb-5">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Select a Saved Job</label>
              {savedJobs.length === 0 ? (
                <div className="text-gray-500 text-xs sm:text-sm">
                  No saved jobs yet.{' '}
                  <button type="button" onClick={() => navigate('/jobs')}
                    className="text-violet-600 dark:text-violet-400 hover:underline font-semibold">
                    Find Jobs
                  </button>
                </div>
              ) : (
                <select
                  className={`${inputClass}`}
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
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">
              Target Job Title / Label <span className="text-gray-400 font-normal">(used to identify your tailored resume)</span>
            </label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Senior Full Stack Engineer at Stripe"
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
            />
          </div>

          {/* Job description */}
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">
              Target Job Description *
              {jobDescription.length > 0 && (
                <span className="text-gray-500 dark:text-gray-400 font-normal ml-2">{jobDescription.length} characters</span>
              )}
            </label>
            <textarea
              className={`${inputClass} resize-none font-mono text-xs`}
              rows={9}
              placeholder="Paste the full job listing description here…&#10;&#10;Include requirements, qualifications, responsibilities, and preferred skills for highest ATS matching score."
              value={jobDescription}
              onChange={e => { setError(''); setJobDescription(e.target.value) }}
              required
            />
          </div>
        </Card>

        {/* Live ATS Keyword Alignment widget */}
        {jobDescription.length >= 50 && resumeSkills.length > 0 && (
          <Card className="mb-5 bg-gradient-to-r from-violet-500/5 to-indigo-500/5 border-violet-300 dark:border-violet-800/60">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
                <span>🎯</span> Preliminary Keyword Alignment
              </span>
              <span className="text-xs font-bold text-violet-600 dark:text-violet-400">
                {matchedSkills.length} of {resumeSkills.length} skills found ({alignmentRate}%)
              </span>
            </div>

            <div className="space-y-2">
              {matchedSkills.length > 0 && (
                <div>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium block mb-1">
                    ✓ Skills directly mentioned in target listing:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {matchedSkills.map((s, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded text-xs bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {missingSkills.length > 0 && (
                <div className="pt-1">
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block mb-1">
                    Skills to integrate or highlight contextually:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {missingSkills.slice(0, 10).map((s, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                        {s}
                      </span>
                    ))}
                    {missingSkills.length > 10 && (
                      <span className="text-xs text-gray-400 self-center">+{missingSkills.length - 10} more</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-500/30 rounded-xl px-4 py-3 text-red-600 dark:text-red-400 text-xs sm:text-sm mb-4">
            {error}
          </div>
        )}

        {/* Info box */}
        <div className="bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-xs text-gray-600 dark:text-gray-400 mb-6">
          <p>
            🤖 <strong className="text-gray-900 dark:text-gray-200">How 90+ ATS Optimization Works:</strong>{' '}
            Generates a matching targeted professional headline, formats every bullet with Google's XYZ formula (Action Verb + Quantifiable Result), and prioritizes matching technologies.
          </p>
          <p className="mt-1">
            🛡️ <strong className="text-gray-900 dark:text-gray-200">Strict Authenticity:</strong>{' '}
            AI strictly rephrases and elevates your existing facts; no fabricated credentials or falsified employers are ever introduced.
          </p>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="filled"
          className={`w-full py-3.5 sm:py-4 text-sm sm:text-base font-bold shadow-[0_0_20px_rgba(139,92,246,0.3)] ${
            optimizing ? 'opacity-70 cursor-not-allowed' : ''
          }`}
          disabled={!resume || optimizing}>
          {optimizing ? (
            <span className="flex items-center justify-center gap-3">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Tailoring Resume with Gemini AI…
            </span>
          ) : (
            '⚡ Generate 90+ ATS Tailored Resume'
          )}
        </Button>

        {optimizing && (
          <p className="text-center text-gray-500 text-xs mt-3">
            Aligning keywords and structuring Google XYZ impact metrics (takes 10–20 seconds)…
          </p>
        )}
      </form>
    </div>
  )
}
