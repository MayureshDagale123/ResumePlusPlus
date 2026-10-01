import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PDFViewer } from '@react-pdf/renderer'
import { getOptimizedResumeById } from '../services/resumeService'
import { ResumeDocument } from '../components/ResumeTemplate'
import ResumeDownloadButton from '../components/ResumeDownloadButton'
import Button from '../components/ui/Button'

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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !resume) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <p className="text-red-400 text-sm mb-4">{error || 'Resume not found.'}</p>
        <Button variant="ghost" onClick={() => navigate('/resume')}>← Back to My Resume</Button>
      </div>
    )
  }

  const r = resume.resumeData || {}
  const name = r.personalInfo?.name || 'resume'
  const downloadName = `${name.replace(/\s+/g, '_')}_${resume.jobTitle?.replace(/\s+/g, '_') || 'optimized'}`

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <button onClick={() => navigate('/resume')}
          className="text-gray-400 hover:text-white text-sm flex items-center gap-1 transition-colors">
          ← Back to My Resume
        </button>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs bg-violet-600/20 text-violet-400 border border-violet-500/30 px-3 py-1.5 rounded-full">
            {resume.jobTitle || 'Optimized Resume'}
          </span>
          <ResumeDownloadButton
            resume={r}
            filename={downloadName}
            label="⬇ Download PDF"
            variant="filled"
            className="text-sm py-2 px-5"
          />
          <Button variant="outline" className="text-sm py-2 px-5"
            onClick={() => navigate('/optimizer')}>
            + New Optimization
          </Button>
        </div>
      </div>

      <p className="text-gray-500 text-xs mb-4">
        ATS-formatted resume — exactly what will be in the downloaded PDF.
        Optimized on {new Date(resume.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}.
      </p>

      {/* PDF Preview */}
      <div className="rounded-xl overflow-hidden border border-gray-700" style={{ height: '900px' }}>
        <PDFViewer width="100%" height="100%" showToolbar={false}>
          <ResumeDocument resume={r} />
        </PDFViewer>
      </div>
    </div>
  )
}
