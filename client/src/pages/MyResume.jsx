import { useEffect, useState } from 'react'
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

  // Sanitized filename for download
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
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-white mb-2">My Resume</h1>
      <p className="text-gray-400 mb-8 text-sm">Your original resume and all AI-optimized versions.</p>

      {/* ── Original Resume ──────────────────────────────────────── */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            📄 Original Resume
            <span className="text-xs font-normal text-gray-500 ml-1">(never modified by AI)</span>
          </h2>
        </div>

        {!resume ? (
          <Card className="text-center py-10 flex flex-col items-center gap-4">
            <p className="text-gray-500 text-sm">You haven't created your resume yet.</p>
            <Button variant="filled" onClick={() => navigate('/resume/create')}>Create Resume</Button>
          </Card>
        ) : (
          <Card>
            {/* Action bar */}
            <div className="flex flex-wrap gap-2 mb-5 pb-4 border-b border-gray-800">
              <Button variant="outline" className="text-sm py-2"
                onClick={() => setPreviewOpen(o => !o)}>
                {previewOpen ? 'Close Preview' : '👁 Preview'}
              </Button>
              <Button variant="outline" className="text-sm py-2"
                onClick={() => navigate('/resume/create')}>
                ✏️ Edit
              </Button>
              <Button variant="outline" className="text-sm py-2"
                onClick={() => navigate('/optimizer')}>
                ⚡ Optimize
              </Button>
              <ResumeDownloadButton
                resume={resume}
                filename={downloadName}
                label="⬇ Download PDF"
                variant="filled"
                className="text-sm py-2"
              />
              {!confirmDelete ? (
                <Button variant="outline" className="text-sm py-2 text-gray-600 hover:text-red-400 ml-auto"
                  onClick={() => setConfirmDelete(true)}>
                  🗑 Delete
                </Button>
              ) : (
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-xs text-red-400">Delete resume?</span>
                  <Button variant="ghost" className="text-xs py-1.5 text-red-400 hover:text-red-300"
                    disabled={deleting} onClick={handleDeleteResume}>
                    {deleting ? 'Deleting…' : 'Yes'}
                  </Button>
                  <Button variant="ghost" className="text-xs py-1.5"
                    onClick={() => setConfirmDelete(false)}>Cancel</Button>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 text-sm">
              {[
                { label: 'Skills',         val: resume.skills?.length        || 0 },
                { label: 'Experience',     val: resume.experience?.length    || 0 },
                { label: 'Projects',       val: resume.projects?.length      || 0 },
                { label: 'Certifications', val: resume.certifications?.length || 0 },
              ].map(({ label, val }) => (
                <div key={label} className="text-center bg-gray-800/50 rounded-lg py-3">
                  <div className="text-2xl font-bold text-violet-400">{val}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            <p className="text-gray-500 text-xs">
              Last updated: {new Date(resume.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            {/* PDF Preview */}
            {previewOpen && (
              <div className="mt-5 pt-5 border-t border-gray-800">
                <p className="text-gray-400 text-xs mb-3">
                  Real ATS-formatted resume preview — this is exactly what will be downloaded as PDF.
                </p>
                <div className="rounded-xl overflow-hidden border border-gray-700" style={{ height: '800px' }}>
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            🤖 Optimized Resumes
            {optimized.length > 0 && (
              <span className="text-xs bg-violet-600/20 text-violet-400 border border-violet-500/30 px-2 py-0.5 rounded-full">
                {optimized.length}
              </span>
            )}
          </h2>
          {resume && (
            <Button variant="outline" className="text-sm py-2" onClick={() => navigate('/optimizer')}>
              + New Optimization
            </Button>
          )}
        </div>

        {optimized.length === 0 ? (
          <Card className="text-center py-10">
            <p className="text-gray-500 text-sm mb-1">No optimized resumes yet.</p>
            <p className="text-gray-600 text-xs mb-4">Use the Resume Optimizer to tailor your resume for a specific job.</p>
            {resume && <Button variant="filled" onClick={() => navigate('/optimizer')}>Optimize Resume</Button>}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {optimized.map((opt) => (
              <Card key={opt._id} className="flex flex-col gap-3 hover:border-violet-500/40 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-white font-semibold text-sm leading-snug">
                      {opt.jobTitle || 'Optimized Resume'}
                    </h3>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {new Date(opt.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <span className="text-xs bg-violet-600/20 text-violet-400 border border-violet-500/30 px-2 py-0.5 rounded-full shrink-0">
                    Optimized
                  </span>
                </div>
                <div className="flex gap-2 mt-auto pt-2">
                  <Button variant="filled" className="flex-1 text-sm py-2"
                    onClick={() => navigate(`/resume/optimized/${opt._id}`)}>
                    Preview &amp; Download
                  </Button>
                  <Button variant="ghost" className="text-sm py-2 text-gray-600 hover:text-red-400"
                    disabled={deletingOptId === opt._id}
                    onClick={() => handleDeleteOptimized(opt._id)}>
                    {deletingOptId === opt._id ? '…' : '🗑'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
