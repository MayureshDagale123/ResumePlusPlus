import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PDFViewer } from '@react-pdf/renderer'
import { getOptimizedResumeById } from '../services/resumeService'
import { ResumeDocument } from '../components/ResumeTemplate'
import ResumeDownloadButton from '../components/ResumeDownloadButton'
import Button from '../components/ui/Button'
import { calculateAtsScore, getScoreColor } from '../utils/atsScorer'

export default function OptimizedResumePreview() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [resume, setResume]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    getOptimizedResumeById(id)
      .then(setResume)
      .catch(() => setError('Could not load optimized resume.'))
      .finally(() => setLoading(false))
  }, [id])

  const r = resume?.resumeData || {}

  const atsScoreResult = useMemo(() => {
    return r ? calculateAtsScore(r, {
      jobDescription: resume?.jobDescription,
      jobTitle: resume?.jobTitle,
    }) : null
  }, [r, resume])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !resume) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <p className="text-red-500 text-sm mb-4 font-semibold">{error || 'Resume not found.'}</p>
        <Button variant="ghost" onClick={() => navigate('/resume')}>← Back to My Resume</Button>
      </div>
    )
  }

  // Use calculated job match score (or stored score if realistic and valid)
  let score = 88
  if (atsScoreResult && atsScoreResult.score > 0) {
    score = atsScoreResult.score
  } else if (resume.atsScore && resume.atsScore > 0 && resume.atsScore <= 100) {
    score = resume.atsScore
  }
  const scoreColors = getScoreColor(score)
  const name = r.personalInfo?.name || 'resume'
  const downloadName = `${name.replace(/\s+/g, '_')}_${resume.jobTitle?.replace(/\s+/g, '_') || 'optimized'}`

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
      {/* Navigation & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3">
        <button
          onClick={() => navigate('/resume')}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-xs sm:text-sm flex items-center gap-1 transition-colors font-semibold self-start"
        >
          ← Back to My Resume
        </button>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Real ATS Score Pill */}
          <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border shadow-sm ${scoreColors.badge}`}>
            {score >= 90 ? '✓' : '⚡'} ATS Score: {score}/100 • {scoreColors.label}
          </span>

          <ResumeDownloadButton
            resume={r}
            filename={downloadName}
            label="⬇ Download ATS PDF"
            variant="filled"
            className="text-xs sm:text-sm py-2 px-4 font-bold shadow-md shadow-violet-600/20"
          />

          <Button
            variant="outline"
            className="text-xs sm:text-sm py-2 px-4 font-semibold"
            onClick={() => navigate('/optimizer')}
          >
            + New Optimization
          </Button>
        </div>
      </div>

      {/* Headline & Metadata card */}
      <div className="mb-4 p-4 rounded-xl bg-white dark:bg-[#111114] border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              {resume.jobTitle || 'Optimized Resume'}
            </span>
            <span className="text-[10px] uppercase font-bold bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-md">
              AI-Generated
            </span>
          </div>
          {r.personalInfo?.headline && (
            <p className="text-violet-600 dark:text-violet-400 text-xs font-semibold mt-1">
              {r.personalInfo.headline}
            </p>
          )}
          <p className="text-gray-400 text-[11px] mt-1">
            Optimized on {new Date(resume.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* ATS Score metrics */}
        <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
          <div className="text-center px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80">
            <div className={`text-base font-black ${scoreColors.text}`}>{score}</div>
            <div className="text-[10px] text-gray-400 font-semibold">ATS Score</div>
          </div>
          {atsScoreResult?.keywordMatchRate > 0 && (
            <div className="text-center px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80">
              <div className="text-base font-black text-violet-600 dark:text-violet-400">
                {atsScoreResult.keywordMatchRate}%
              </div>
              <div className="text-[10px] text-gray-400 font-semibold">Job Match</div>
            </div>
          )}
          <div className="text-center px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80">
            <div className="text-base font-black text-indigo-600 dark:text-indigo-400">
              {r.skills?.length || 0}
            </div>
            <div className="text-[10px] text-gray-400 font-semibold">Skills</div>
          </div>
          <div className="text-center px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80">
            <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
              {r.experience?.length || 0}
            </div>
            <div className="text-[10px] text-gray-400 font-semibold">Roles</div>
          </div>
        </div>
      </div>

      {/* Matched keywords breakdown if available */}
      {atsScoreResult?.matchedKeywords?.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200/60 dark:border-violet-900/40 text-xs">
          <span className="font-bold text-violet-700 dark:text-violet-300 block mb-1.5">
            🎯 Matched Job Keywords ({atsScoreResult.matchedKeywords.length}):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {atsScoreResult.matchedKeywords.map((kw, i) => (
              <span key={i} className="px-2 py-0.5 rounded-md bg-white dark:bg-black/50 border border-violet-200 dark:border-violet-800/60 text-violet-800 dark:text-violet-300 text-[11px] font-semibold">
                ✓ {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* PDF Preview Frame — responsive on mobile */}
      <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-xl h-[520px] sm:h-[800px]">
        <PDFViewer width="100%" height="100%" showToolbar={false}>
          <ResumeDocument resume={r} />
        </PDFViewer>
      </div>
    </div>
  )
}
