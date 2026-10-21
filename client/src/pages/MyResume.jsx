import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PDFViewer } from '@react-pdf/renderer'
import { useAuth } from '../context/AuthContext'
import {
  getResume, deleteResume,
  getOptimizedResumes, deleteOptimizedResume,
} from '../services/resumeService'
import { ResumeDocument } from '../components/ResumeTemplate'
import ResumeDownloadButton from '../components/ResumeDownloadButton'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { calculateAtsScore, getScoreColor } from '../utils/atsScorer'

export default function MyResume() {
  const navigate = useNavigate()
  const { user }  = useAuth()

  const [resume, setResume]               = useState(null)
  const [optimized, setOptimized]         = useState([])
  const [loading, setLoading]             = useState(true)
  const [deleting, setDeleting]           = useState(false)
  const [deletingOptId, setDeletingOptId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [previewOpen, setPreviewOpen]     = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [resumeData, optData] = await Promise.allSettled([
          getResume(),
          getOptimizedResumes(),
        ])
        if (resumeData.status === 'fulfilled') setResume(resumeData.value)
        if (optData.status === 'fulfilled')    setOptimized(optData.value?.data || [])
      } finally { setLoading(false) }
    }
    load()
  }, [])

  const handleDeleteResume = async () => {
    setDeleting(true)
    try {
      await deleteResume()
      setResume(null)
      setConfirmDelete(false)
      setPreviewOpen(false)
    } catch { } finally { setDeleting(false) }
  }

  const handleDeleteOptimized = async (id) => {
    setDeletingOptId(id)
    try {
      await deleteOptimizedResume(id)
      setOptimized(prev => prev.filter(r => r._id !== id))
    } catch { } finally { setDeletingOptId(null) }
  }

  // Calculate real ATS score for Master Resume
  const masterAts = useMemo(() => {
    return resume ? calculateAtsScore(resume) : null
  }, [resume])

  const masterColors = masterAts ? getScoreColor(masterAts.score) : null

  const downloadName = user?.name
    ? `${user.name.replace(/\s+/g, '_')}_resume`
    : 'my_resume'

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          My Resume Hub
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1 text-xs sm:text-sm">
          Track real ATS scores, manage your master resume, and download job-tailored AI versions.
        </p>
      </div>

      {/* ── Master Original Resume ──────────────────────────────────────── */}
      <div className="mb-10 sm:mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>📄 Master Resume</span>
            <span className="text-[11px] font-normal text-gray-500 dark:text-gray-400">(Your baseline resume)</span>
          </h2>

          {/* Real Score Badge */}
          {masterAts && (
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-full border shadow-sm ${masterColors.badge}`}>
                {masterAts.score >= 90 ? '✓' : masterAts.score >= 70 ? '⚡' : '⚠️'} ATS Score: {masterAts.score}/100 • {masterColors.label}
              </span>
            </div>
          )}
        </div>

        {!resume ? (
          <Card className="text-center py-10 sm:py-12 flex flex-col items-center gap-4">
            <span className="text-4xl">📝</span>
            <p className="text-gray-600 dark:text-gray-400 text-sm">You haven't built your original resume yet.</p>
            <Button variant="filled" onClick={() => navigate('/resume/create')}>
              Create ATS Resume Now
            </Button>
          </Card>
        ) : (
          <Card className="shadow-sm border border-gray-200/80 dark:border-gray-800">
            {/* Action bar — mobile friendly flex */}
            <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800 items-center">
              <Button
                variant="outline"
                className="text-xs sm:text-sm py-2 px-3 flex-1 sm:flex-initial"
                onClick={() => setPreviewOpen(o => !o)}
              >
                {previewOpen ? '✕ Hide Preview' : '👁 Full PDF Preview'}
              </Button>
              <Button
                variant="outline"
                className="text-xs sm:text-sm py-2 px-3 flex-1 sm:flex-initial"
                onClick={() => navigate('/resume/create')}
              >
                ✏️ Edit & ATS Checker
              </Button>
              <Button
                variant="outline"
                className="text-xs sm:text-sm py-2 px-3 border-violet-500/50 text-violet-600 dark:text-violet-400 flex-1 sm:flex-initial"
                onClick={() => navigate('/optimizer')}
              >
                ⚡ Tailor with AI
              </Button>
              <ResumeDownloadButton
                resume={resume}
                filename={downloadName}
                label="⬇ Download PDF"
                variant="filled"
                className="text-xs sm:text-sm py-2 px-4 w-full sm:w-auto"
              />

              {!confirmDelete ? (
                <Button
                  variant="ghost"
                  className="text-xs sm:text-sm py-2 text-gray-500 hover:text-red-500 sm:ml-auto w-full sm:w-auto mt-1 sm:mt-0"
                  onClick={() => setConfirmDelete(true)}
                >
                  🗑 Delete
                </Button>
              ) : (
                <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto mt-2 sm:mt-0 justify-end">
                  <span className="text-xs text-red-500 font-semibold">Delete resume?</span>
                  <Button
                    variant="ghost"
                    className="text-xs py-1.5 text-red-500 hover:bg-red-50"
                    disabled={deleting}
                    onClick={handleDeleteResume}
                  >
                    {deleting ? 'Deleting…' : 'Yes, Delete'}
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-xs py-1.5"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            {/* ATS Score Progress Bar & Breakdown */}
            {masterAts && (
              <div className="mb-5 p-3.5 sm:p-4 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200/80 dark:border-gray-800">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                      Real ATS Score:
                    </span>
                    <span className={`text-base font-extrabold ${masterColors.text}`}>
                      {masterAts.score}/100
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                      ({masterAts.grade})
                    </span>
                  </div>
                  {masterAts.score < 90 && (
                    <button
                      onClick={() => navigate('/resume/create')}
                      className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-semibold"
                    >
                      Boost to 90+ →
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${masterColors.bar}`}
                    style={{ width: `${masterAts.score}%` }}
                  />
                </div>

                {/* Section Score Breakdown Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
                  <div className="bg-white dark:bg-black/40 p-2 rounded-lg border border-gray-200/60 dark:border-gray-800">
                    <div className="text-[10px] text-gray-500 uppercase font-semibold">Contact</div>
                    <div className="font-bold text-gray-900 dark:text-white mt-0.5">
                      {masterAts.breakdown.contact.score}/20
                    </div>
                  </div>
                  <div className="bg-white dark:bg-black/40 p-2 rounded-lg border border-gray-200/60 dark:border-gray-800">
                    <div className="text-[10px] text-gray-500 uppercase font-semibold">Summary</div>
                    <div className="font-bold text-gray-900 dark:text-white mt-0.5">
                      {masterAts.breakdown.summary.score}/15
                    </div>
                  </div>
                  <div className="bg-white dark:bg-black/40 p-2 rounded-lg border border-gray-200/60 dark:border-gray-800">
                    <div className="text-[10px] text-gray-500 uppercase font-semibold">Skills</div>
                    <div className="font-bold text-gray-900 dark:text-white mt-0.5">
                      {masterAts.breakdown.skills.score}/20
                    </div>
                  </div>
                  <div className="bg-white dark:bg-black/40 p-2 rounded-lg border border-gray-200/60 dark:border-gray-800">
                    <div className="text-[10px] text-gray-500 uppercase font-semibold">Experience</div>
                    <div className="font-bold text-gray-900 dark:text-white mt-0.5">
                      {masterAts.breakdown.experience.score}/25
                    </div>
                  </div>
                  <div className="bg-white dark:bg-black/40 p-2 rounded-lg border border-gray-200/60 dark:border-gray-800">
                    <div className="text-[10px] text-gray-500 uppercase font-semibold">Projects</div>
                    <div className="font-bold text-gray-900 dark:text-white mt-0.5">
                      {masterAts.breakdown.projects.score}/10
                    </div>
                  </div>
                  <div className="bg-white dark:bg-black/40 p-2 rounded-lg border border-gray-200/60 dark:border-gray-800">
                    <div className="text-[10px] text-gray-500 uppercase font-semibold">Education</div>
                    <div className="font-bold text-gray-900 dark:text-white mt-0.5">
                      {masterAts.breakdown.education.score}/10
                    </div>
                  </div>
                </div>

                {masterAts.suggestions.length > 0 && masterAts.score < 90 && (
                  <div className="mt-3 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 flex items-start gap-1.5">
                    <span>💡</span>
                    <span><strong>Quick Tip:</strong> {masterAts.suggestions[0]}</span>
                  </div>
                )}
              </div>
            )}

            {resume.personalInfo?.headline && (
              <p className="text-violet-600 dark:text-violet-300 text-sm font-bold mb-3">
                {resume.personalInfo.headline}
              </p>
            )}

            {/* Quick Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 text-sm">
              {[
                { label: 'Skills Added',   val: resume.skills?.length        || 0 },
                { label: 'Experience',     val: resume.experience?.length    || 0 },
                { label: 'Key Projects',   val: resume.projects?.length      || 0 },
                { label: 'Education',      val: resume.education?.length     || 0 },
              ].map(({ label, val }) => (
                <div key={label} className="text-center bg-gray-50 dark:bg-gray-800/40 rounded-xl py-2.5 sm:py-3 border border-gray-100 dark:border-gray-800">
                  <div className="text-xl sm:text-2xl font-black text-violet-600 dark:text-violet-400">{val}</div>
                  <div className="text-gray-500 dark:text-gray-400 text-[11px] sm:text-xs mt-0.5 font-medium">{label}</div>
                </div>
              ))}
            </div>

            <p className="text-gray-400 text-xs">
              Last updated: {new Date(resume.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            {/* PDF Preview Modal / Embedded Viewer */}
            {previewOpen && (
              <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-800 animate-in fade-in">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">
                    Linear single-column layout formatted for Workday, Greenhouse & Taleo ATS.
                  </p>
                  <ResumeDownloadButton
                    resume={resume}
                    filename={downloadName}
                    label="Download PDF"
                    variant="outline"
                    className="text-xs py-1 px-3"
                  />
                </div>
                <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg h-[450px] sm:h-[700px]">
                  <PDFViewer width="100%" height="100%" showToolbar={false}>
                    <ResumeDocument resume={resume} />
                  </PDFViewer>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* ── Optimized Resumes ─────────────────────────────────────── */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>🤖 AI-Optimized Resumes</span>
            {optimized.length > 0 && (
              <span className="text-xs bg-violet-500/10 dark:bg-violet-600/20 text-violet-700 dark:text-violet-400 border border-violet-500/30 px-2.5 py-0.5 rounded-full font-bold">
                {optimized.length}
              </span>
            )}
          </h2>
          {resume && (
            <Button variant="outline" className="text-xs py-2 font-semibold w-full sm:w-auto" onClick={() => navigate('/optimizer')}>
              + New Optimization
            </Button>
          )}
        </div>

        {optimized.length === 0 ? (
          <Card className="text-center py-10">
            <span className="text-3xl mb-2 block">⚡</span>
            <p className="text-gray-900 dark:text-white font-bold text-base mb-1">No tailored resumes yet.</p>
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-4 max-w-md mx-auto">
              Match your resume against any job description with Gemini AI to score 90+ on applicant tracking systems.
            </p>
            {resume && (
              <Button variant="filled" onClick={() => navigate('/optimizer')}>
                Optimize Resume Now
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {optimized.map((opt) => {
              // Calculate real score for each optimized resume against its target job
              const optAts = calculateAtsScore(opt.resumeData, {
                jobDescription: opt.jobDescription,
                jobTitle: opt.jobTitle,
              })
              // Priority: computed job match score if available, else saved valid score
              let score = 88
              if (optAts && optAts.score > 0) {
                score = optAts.score
              } else if (opt.atsScore && opt.atsScore > 0 && opt.atsScore <= 100) {
                score = opt.atsScore
              }
              const scoreColors = getScoreColor(score)

              return (
                <Card
                  key={opt._id}
                  className="flex flex-col gap-3 hover:border-violet-500/40 hover:shadow-md transition-all border border-gray-200/80 dark:border-gray-800"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-gray-900 dark:text-white font-bold text-sm leading-snug truncate">
                        {opt.jobTitle || 'Optimized Resume'}
                      </h3>
                      <p className="text-gray-500 text-xs mt-0.5 font-medium">
                        Tailored {new Date(opt.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    </div>

                    {/* Real ATS Score Badge for this optimized resume */}
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-md border shrink-0 ${scoreColors.badge}`}>
                      {score >= 90 ? '✓' : '⚡'} {score}/100 ATS
                    </span>
                  </div>

                  {/* Highlights */}
                  {opt.resumeData?.personalInfo?.headline && (
                    <p className="text-xs text-violet-600 dark:text-violet-300 font-medium truncate">
                      🎯 {opt.resumeData.personalInfo.headline}
                    </p>
                  )}

                  {/* Quick stats row */}
                  <div className="flex items-center gap-2 sm:gap-3 text-[11px] text-gray-500 dark:text-gray-400 pt-1 flex-wrap">
                    <span>{opt.resumeData?.skills?.length || 0} Skills</span>
                    <span>•</span>
                    <span>{opt.resumeData?.experience?.length || 0} Roles</span>
                    {optAts.keywordMatchRate > 0 && (
                      <>
                        <span>•</span>
                        <span className="font-semibold text-violet-600 dark:text-violet-400">
                          {optAts.keywordMatchRate}% Keyword Match
                        </span>
                      </>
                    )}
                    <span className="ml-auto font-semibold text-emerald-600 dark:text-emerald-400">
                      {score >= 90 ? '✓ ATS 90+' : 'ATS Tailored'}
                    </span>
                  </div>

                  <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100 dark:border-gray-800">
                    <Button
                      variant="filled"
                      className="flex-1 text-xs py-2 font-semibold"
                      onClick={() => navigate(`/resume/optimized/${opt._id}`)}
                    >
                      Preview & Download PDF
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-xs py-2 px-3 text-gray-500 hover:text-red-500 font-semibold"
                      disabled={deletingOptId === opt._id}
                      onClick={() => handleDeleteOptimized(opt._id)}
                    >
                      {deletingOptId === opt._id ? '…' : '🗑'}
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
