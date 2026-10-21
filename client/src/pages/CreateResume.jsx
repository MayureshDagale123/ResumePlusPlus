import { useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PDFViewer } from '@react-pdf/renderer'
import { getResume, createResume, updateResume } from '../services/resumeService'
import { ResumeDocument } from '../components/ResumeTemplate'
import api from '../services/api'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { calculateAtsScore } from '../utils/atsScorer'

// ── Reusable input / textarea styles with full light/dark support ──────────
const inp =
  'bg-white dark:bg-[#121216] border border-gray-300 dark:border-gray-700/80 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all w-full text-sm'
const ta = `${inp} resize-none leading-relaxed`

function SectionHeader({ title, subtitle, badge }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-2 flex-wrap">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          {title}
          {badge && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-violet-500/10 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-500/30">
              {badge}
            </span>
          )}
        </h2>
        {subtitle && <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">{subtitle}</p>}
      </div>
    </div>
  )
}

function AddBtn({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-semibold flex items-center gap-1.5 transition-colors py-1.5 px-3.5 rounded-xl bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20"
    >
      <span>+</span>
      <span>{label}</span>
    </button>
  )
}

function RemoveBtn({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-auto shrink-0 font-medium"
    >
      Remove
    </button>
  )
}

function EmptySection({ label, onAdd }) {
  return (
    <div className="border border-dashed border-gray-300 dark:border-gray-800 rounded-2xl px-5 py-6 text-gray-500 dark:text-gray-400 text-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left bg-gray-50 dark:bg-[#101014]/50">
      <span>No {label} added yet. Adding this boosts your ATS score!</span>
      <button
        type="button"
        onClick={onAdd}
        className="text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 text-xs font-bold py-1.5 px-3.5 rounded-xl bg-violet-500/10 border border-violet-500/30 transition-colors"
      >
        + Add {label}
      </button>
    </div>
  )
}

const TABS = [
  'Personal Info',
  'Summary',
  'Skills',
  'Experience',
  'Projects',
  'Education',
  'Certifications',
  'Achievements',
]

const ACTION_VERBS = [
  'Architected',
  'Engineered',
  'Spearheaded',
  'Optimized',
  'Implemented',
  'Scaled',
  'Reduced',
  'Accelerated',
  'Automated',
  'Designed',
  'Deployed',
  'Developed',
]

const SKILL_PRESETS = [
  { category: 'Frontend', skills: ['React', 'TypeScript', 'JavaScript', 'Next.js', 'Tailwind CSS', 'Redux', 'HTML5', 'CSS3'] },
  { category: 'Backend', skills: ['Node.js', 'Express', 'Python', 'Django', 'FastAPI', 'Java', 'Spring Boot', 'REST APIs'] },
  { category: 'Database & Cloud', skills: ['PostgreSQL', 'MongoDB', 'Redis', 'MySQL', 'AWS', 'Docker', 'Kubernetes', 'CI/CD'] },
  { category: 'Core & Methods', skills: ['System Design', 'Microservices', 'Git', 'Agile/Scrum', 'Unit Testing', 'GraphQL'] },
]

const emptyEducation     = () => ({ school: '', degree: '', field: '', startYear: '', endYear: '', grade: '' })
const emptyExperience    = () => ({ company: '', title: '', location: '', startDate: '', endDate: '', current: false, description: '' })
const emptyProject       = () => ({ name: '', description: '', techStack: '', link: '' })
const emptyCertification = () => ({ name: '', issuer: '', year: '' })
const emptyAchievement   = () => ({ title: '', description: '' })
const defaultResume      = () => ({
  personalInfo:   { name: '', headline: '', email: '', phone: '', location: '', linkedin: '', github: '' },
  summary: '', education: [], skills: [], experience: [], projects: [], certifications: [], achievements: [],
})

export default function CreateResume() {
  const navigate = useNavigate()
  const fileRef  = useRef(null)

  // Mode: 'manual' or 'upload'
  const [mode, setMode] = useState('manual')

  // Form state
  const [activeTab, setActiveTab]   = useState(0)
  const [form, setForm]             = useState(defaultResume())
  const [skillInput, setSkillInput] = useState('')
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [isEdit, setIsEdit]         = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState('')
  const [showLivePreview, setShowLivePreview] = useState(false)

  // Upload state
  const [file, setFile]             = useState(null)
  const [uploading, setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [dragOver, setDragOver]     = useState(false)

  // Load existing resume on mount
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getResume()
        if (data) {
          setForm({
            personalInfo: {
              name:     data.personalInfo?.name     || '',
              headline: data.personalInfo?.headline || '',
              email:    data.personalInfo?.email    || '',
              phone:    data.personalInfo?.phone    || '',
              location: data.personalInfo?.location || '',
              linkedin: data.personalInfo?.linkedin || '',
              github:   data.personalInfo?.github   || '',
            },
            summary:        data.summary        || '',
            education:      data.education      || [],
            skills:         data.skills         || [],
            experience:     data.experience     || [],
            projects:       data.projects       || [],
            certifications: data.certifications || [],
            achievements:   data.achievements   || [],
          })
          setIsEdit(true)
        }
      } catch {
        /* 404 = no resume yet */
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Real-time ATS 90+ Score Calculation ──────────────────────────
  const atsAnalysis = useMemo(() => {
    return calculateAtsScore(form)
  }, [form])

  // ── Form helpers ──────────────────────────────────────────────
  const setPI = (field, val) =>
    setForm(f => ({ ...f, personalInfo: { ...f.personalInfo, [field]: val } }))

  const setArr = (key, idx, field, val) =>
    setForm(f => ({
      ...f,
      [key]: f[key].map((item, i) => (i === idx ? { ...item, [field]: val } : item)),
    }))

  const addItem    = (key, empty) => setForm(f => ({ ...f, [key]: [...f[key], empty()] }))
  const removeItem = (key, idx)   => setForm(f => ({ ...f, [key]: f[key].filter((_, i) => i !== idx) }))

  const moveItem = (key, idx, direction) => {
    setForm((f) => {
      const list = [...f[key]]
      const targetIdx = idx + direction
      if (targetIdx < 0 || targetIdx >= list.length) return f
      const temp = list[idx]
      list[idx] = list[targetIdx]
      list[targetIdx] = temp
      return { ...f, [key]: list }
    })
  }

  const handleSkillKey = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && skillInput.trim()) {
      e.preventDefault()
      const s = skillInput.trim().replace(/,$/, '')
      if (s && !form.skills.includes(s)) setForm(f => ({ ...f, skills: [...f.skills, s] }))
      setSkillInput('')
    }
  }

  const addPresetSkill = (skill) => {
    if (!form.skills.includes(skill)) {
      setForm(f => ({ ...f, skills: [...f.skills, skill] }))
    }
  }

  const removeSkill = (s) => setForm(f => ({ ...f, skills: f.skills.filter(x => x !== s) }))

  const insertActionVerb = (expIdx, verb) => {
    const current = form.experience[expIdx]?.description || ''
    const prefix = current ? (current.endsWith('\n') ? '' : '\n') : ''
    const newText = `${current}${prefix}• ${verb} `
    setArr('experience', expIdx, 'description', newText)
  }

  // ── Manual save ───────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.personalInfo.name.trim()) {
      setError('Full name is required in Personal Info.')
      setActiveTab(0)
      return
    }
    setError('')
    setSaving(true)
    try {
      if (isEdit) {
        await updateResume(form)
        setSuccess('Resume updated successfully!')
      } else {
        await createResume(form)
        setSuccess('Resume created successfully!')
        setIsEdit(true)
      }
      setTimeout(() => {
        setSuccess('')
        navigate('/resume')
      }, 1500)
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── File upload ───────────────────────────────────────────────
  const handleFileChange = (e) => {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      setUploadError('')
      setUploadSuccess('')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) {
      setFile(f)
      setUploadError('')
      setUploadSuccess('')
    }
  }

  const handleUploadSubmit = async () => {
    if (!file) {
      setUploadError('Please select a file.')
      return
    }
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ]
    if (!allowed.includes(file.type)) {
      setUploadError('Only PDF and DOCX files are supported.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File must be under 5 MB.')
      return
    }

    setUploadError('')
    setUploading(true)
    const formData = new FormData()
    formData.append('resume', file)
    try {
      await api.post('/resume/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setUploadSuccess('Resume parsed and saved with AI! Loading into form…')
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (err) {
      setUploadError(err?.response?.data?.message || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const getScoreColor = (sc) => {
    if (sc >= 90) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    if (sc >= 70) return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30'
    return 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30'
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

      {/* Header & ATS Score Banner */}
      <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            {isEdit ? 'Edit Your Resume' : 'Create ATS-Optimized Resume'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
            Formatted to score 90+ across enterprise ATS parsers (Workday, Greenhouse, Taleo).
          </p>
        </div>

        {/* Live ATS Score Card & Preview Toggle */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowLivePreview((p) => !p)}
            className="text-xs py-2 px-3.5 flex items-center gap-1.5"
          >
            <span>{showLivePreview ? '✕ Close Preview' : '👁 Live PDF Preview'}</span>
          </Button>

          <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl border ${getScoreColor(atsAnalysis.score)} shadow-sm`}>
            <div className="text-center">
              <span className="text-2xl font-black">{atsAnalysis.score}</span>
              <span className="text-[10px] opacity-70 block font-bold -mt-1">/ 100</span>
            </div>
            <div className="border-l border-current/20 pl-3">
              <p className="text-xs font-bold uppercase tracking-wider">
                {atsAnalysis.score >= 90 ? '🏆 90+ ATS Ready' : atsAnalysis.score >= 70 ? '⚡ Good Progress' : '📝 ATS Needs Polish'}
              </p>
              <p className="text-[11px] opacity-80 mt-0.5">
                {atsAnalysis.score >= 90 ? 'Top tier ATS compatibility' : 'Follow tips below to reach 90+'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Live PDF Preview Drawer */}
      {showLivePreview && (
        <div className="mb-8 p-4 rounded-2xl bg-white dark:bg-[#0f0f13] border border-gray-200 dark:border-gray-800 shadow-xl animate-in fade-in">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              📄 Live ATS Resume Output Preview
            </span>
            <button
              type="button"
              onClick={() => setShowLivePreview(false)}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-white"
            >
              ✕ Close
            </button>
          </div>
          <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-inner" style={{ height: '600px' }}>
            <PDFViewer width="100%" height="100%" showToolbar={false}>
              <ResumeDocument resume={form} />
            </PDFViewer>
          </div>
        </div>
      )}

      {/* Mode switcher: Manual vs Upload */}
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
            mode === 'manual'
              ? 'bg-violet-500/10 dark:bg-violet-600/20 text-violet-700 dark:text-violet-300 border-violet-500/50 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/60 border-transparent'
          }`}
        >
          ✏️ Fill & Optimize Manually
        </button>
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
            mode === 'upload'
              ? 'bg-violet-500/10 dark:bg-violet-600/20 text-violet-700 dark:text-violet-300 border-violet-500/50 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/60 border-transparent'
          }`}
        >
          📤 Upload PDF / DOCX (AI Import)
        </button>
      </div>

      {/* ── UPLOAD MODE ────────────────────────────────────────── */}
      {mode === 'upload' && (
        <Card className="space-y-5">
          <SectionHeader
            title="Import Resume with AI"
            subtitle="Gemini AI will extract all fields and automatically map them to standard ATS format."
          />

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
              dragOver
                ? 'border-violet-500 bg-violet-500/10'
                : file
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-gray-300 dark:border-gray-800 hover:border-violet-500/50 hover:bg-gray-50 dark:hover:bg-gray-900/40'
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={handleFileChange}
            />
            {file ? (
              <div>
                <p className="text-3xl mb-2">📄</p>
                <p className="text-gray-900 dark:text-white font-semibold text-sm">{file.name}</p>
                <p className="text-gray-500 text-xs mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null) }}
                  className="mt-2 text-xs text-rose-500 hover:underline"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <div>
                <p className="text-4xl mb-3">☁️</p>
                <p className="text-gray-900 dark:text-gray-200 text-sm font-semibold">Drag & drop or click to upload</p>
                <p className="text-gray-500 text-xs mt-1">PDF or DOCX • Max 5 MB</p>
              </div>
            )}
          </div>

          {uploadError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-600 dark:text-red-400 text-sm font-medium">
              {uploadError}
            </div>
          )}
          {uploadSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
              {uploadSuccess}
            </div>
          )}

          <Button
            type="button"
            variant="filled"
            className="w-full py-3 text-sm font-bold shadow-lg shadow-violet-600/20"
            disabled={!file || uploading}
            onClick={handleUploadSubmit}
          >
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Parsing with AI…
              </span>
            ) : (
              'Parse & Populate Resume'
            )}
          </Button>
        </Card>
      )}

      {/* ── MANUAL MODE ────────────────────────────────────────── */}
      {mode === 'manual' && (
        <>
          {/* ATS Checklist Accordion */}
          <div className="bg-white dark:bg-[#121216] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 mb-6 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <span>🎯</span>
                <span>ATS 90+ Score Checklist</span>
              </span>
              <span className="text-xs font-bold text-violet-600 dark:text-violet-400">
                {atsAnalysis.checklist.filter(c => c.passed).length} of {atsAnalysis.checklist.length} Passed
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {atsAnalysis.checklist.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveTab(item.tabIndex)}
                  className={`p-3 rounded-xl border text-xs transition-all cursor-pointer hover:scale-[1.01] ${
                    item.passed
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                      : 'bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-violet-400'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      <span>{item.passed ? '✓' : '○'}</span>
                      <span className={item.passed ? 'text-emerald-900 dark:text-white' : 'text-gray-800 dark:text-gray-300'}>
                        {item.label}
                      </span>
                    </span>
                    <span className="text-[10px] text-violet-500 font-semibold underline">Edit →</span>
                  </div>
                  <p className="text-[11px] opacity-80 mt-1 leading-snug">{item.hint}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tab bar — touch & swipe friendly on mobile */}
          <div className="flex gap-1.5 overflow-x-auto pb-3 mb-6 border-b border-gray-200 dark:border-gray-800 sm:flex-wrap scrollbar-none">
            {TABS.map((tab, i) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(i)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 whitespace-nowrap ${
                  activeTab === i
                    ? 'text-violet-700 dark:text-violet-300 bg-violet-500/10 dark:bg-violet-600/20 border border-violet-500/40 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/60'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>

            {/* 0. Personal Info */}
            {activeTab === 0 && (
              <Card>
                <SectionHeader
                  title="Contact & Target Role"
                  subtitle="ATS algorithms parse contact information first and match target roles directly against job descriptions."
                  badge="Required"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">
                      Full Legal Name *
                    </label>
                    <input
                      className={inp}
                      placeholder="e.g. Alex Johnson"
                      value={form.personalInfo.name}
                      onChange={(e) => setPI('name', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">
                      Target Role / Professional Headline *
                    </label>
                    <input
                      className={inp}
                      placeholder="e.g. Senior Full-Stack Engineer | React & Node.js"
                      value={form.personalInfo.headline}
                      onChange={(e) => setPI('headline', e.target.value)}
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      💡 Tip: Matches target job titles in ATS search filters.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Email Address *</label>
                    <input
                      className={inp}
                      type="email"
                      placeholder="alex.johnson@example.com"
                      value={form.personalInfo.email}
                      onChange={(e) => setPI('email', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Phone Number *</label>
                    <input
                      className={inp}
                      placeholder="+1 (555) 123-4567 or +91 9876543210"
                      value={form.personalInfo.phone}
                      onChange={(e) => setPI('phone', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Location (City, Country) *</label>
                    <input
                      className={inp}
                      placeholder="San Francisco, CA or Mumbai, India"
                      value={form.personalInfo.location}
                      onChange={(e) => setPI('location', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">LinkedIn Profile URL</label>
                    <input
                      className={inp}
                      placeholder="https://linkedin.com/in/username"
                      value={form.personalInfo.linkedin}
                      onChange={(e) => setPI('linkedin', e.target.value)}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">GitHub / Portfolio Website</label>
                    <input
                      className={inp}
                      placeholder="https://github.com/username or https://portfolio.dev"
                      value={form.personalInfo.github}
                      onChange={(e) => setPI('github', e.target.value)}
                    />
                  </div>
                </div>
              </Card>
            )}

            {/* 1. Summary */}
            {activeTab === 1 && (
              <Card>
                <SectionHeader
                  title="Professional Summary"
                  subtitle="A concise 3-4 sentence overview showcasing your domain expertise, core technical stack, and measurable impact."
                  badge="30–100 Words"
                />

                <textarea
                  className={ta}
                  rows={6}
                  placeholder="e.g. Results-driven Full-Stack Engineer with 4+ years of experience designing scalable distributed web architectures. Proven track record of reducing API latency by 45% and architecting microservices that support 500k+ monthly active users. Specialized in React, Node.js, TypeScript, and AWS cloud infrastructure."
                  value={form.summary}
                  onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                />

                <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                  <span>
                    {form.summary.trim() ? form.summary.trim().split(/\s+/).length : 0} words (Target: 30–100 words)
                  </span>
                  {/\b(I|me|my|we)\b/i.test(form.summary) && (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                      ⚠️ Avoid first-person pronouns ("I", "my") for optimal ATS indexing.
                    </span>
                  )}
                </div>
              </Card>
            )}

            {/* 2. Skills */}
            {activeTab === 2 && (
              <Card>
                <SectionHeader
                  title="Technical & Professional Skills"
                  subtitle="ATS keyword algorithms parse skills heavily. Add 10-20 relevant keywords for maximum match percentage."
                  badge="Target: 10+ Skills"
                />

                <div className="flex flex-wrap gap-2 mb-4 min-h-[3rem] p-3.5 bg-gray-50 dark:bg-[#111115] border border-gray-200 dark:border-gray-800 rounded-xl">
                  {form.skills.length === 0 ? (
                    <span className="text-gray-400 text-xs self-center">No skills added yet. Type below or pick presets.</span>
                  ) : (
                    form.skills.map((s) => (
                      <span
                        key={s}
                        className="flex items-center gap-1.5 bg-violet-500/10 dark:bg-violet-600/20 border border-violet-500/40 text-violet-700 dark:text-violet-300 px-3 py-1 rounded-xl text-xs font-semibold shadow-sm"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => removeSkill(s)}
                          className="text-violet-500 hover:text-rose-500 transition-colors ml-1 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  )}
                </div>

                <div className="mb-6">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">
                    Type a skill and press Enter or comma
                  </label>
                  <input
                    className={inp}
                    placeholder="e.g. React, Docker, Python, PostgreSQL, System Design... press Enter"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleSkillKey}
                  />
                </div>

                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    ⚡ Quick-Add In-Demand Skills:
                  </h3>
                  <div className="space-y-3">
                    {SKILL_PRESETS.map((group) => (
                      <div key={group.category} className="bg-gray-50 dark:bg-[#121216] p-3 rounded-xl border border-gray-200 dark:border-gray-800/80">
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-2">{group.category}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {group.skills.map((skill) => {
                            const isAdded = form.skills.includes(skill)
                            return (
                              <button
                                key={skill}
                                type="button"
                                onClick={() => addPresetSkill(skill)}
                                disabled={isAdded}
                                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                                  isAdded
                                    ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-800 cursor-default'
                                    : 'bg-white dark:bg-[#181820] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-300'
                                }`}
                              >
                                {isAdded ? `✓ ${skill}` : `+ ${skill}`}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* 3. Experience */}
            {activeTab === 3 && (
              <Card>
                <SectionHeader
                  title="Work Experience"
                  subtitle="Use the Google XYZ Formula: 'Accomplished [X], measured by [Y], by doing [Z]'. Start each bullet with an Action Verb."
                  badge="Highest ATS Weight (30%)"
                />

                {form.experience.length === 0 ? (
                  <EmptySection label="experience" onAdd={() => addItem('experience', emptyExperience)} />
                ) : (
                  form.experience.map((exp, i) => (
                    <div key={i} className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5 mb-5 bg-gray-50 dark:bg-[#111116]">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-violet-600 dark:text-violet-400 font-bold">Position #{i + 1}</span>
                          <div className="flex items-center gap-1">
                            {i > 0 && (
                              <button
                                type="button"
                                onClick={() => moveItem('experience', i, -1)}
                                className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-violet-600"
                                title="Move Up"
                              >
                                ▲
                              </button>
                            )}
                            {i < form.experience.length - 1 && (
                              <button
                                type="button"
                                onClick={() => moveItem('experience', i, 1)}
                                className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-violet-600"
                                title="Move Down"
                              >
                                ▼
                              </button>
                            )}
                          </div>
                        </div>
                        <RemoveBtn onClick={() => removeItem('experience', i)} />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block font-medium">Company Name *</label>
                          <input
                            className={inp}
                            placeholder="e.g. Stripe or Google"
                            value={exp.company}
                            onChange={(e) => setArr('experience', i, 'company', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block font-medium">Job Title *</label>
                          <input
                            className={inp}
                            placeholder="e.g. Senior Software Engineer"
                            value={exp.title}
                            onChange={(e) => setArr('experience', i, 'title', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block font-medium">Location</label>
                          <input
                            className={inp}
                            placeholder="e.g. Remote or San Francisco, CA"
                            value={exp.location}
                            onChange={(e) => setArr('experience', i, 'location', e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block font-medium">Start Date</label>
                            <input
                              className={inp}
                              placeholder="Jan 2022"
                              value={exp.startDate}
                              onChange={(e) => setArr('experience', i, 'startDate', e.target.value)}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block font-medium">End Date</label>
                            <input
                              className={inp}
                              placeholder={exp.current ? 'Present' : 'Dec 2024'}
                              disabled={exp.current}
                              value={exp.current ? 'Present' : exp.endDate}
                              onChange={(e) => setArr('experience', i, 'endDate', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 mb-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={exp.current}
                          className="accent-violet-600 w-4 h-4 rounded"
                          onChange={(e) => setArr('experience', i, 'current', e.target.checked)}
                        />
                        Currently working in this role
                      </label>

                      {/* Action Verb Toolbar */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                            Bullet Points (Action Verb + Quantified Result + Impact)
                          </label>
                          <span className="text-[11px] text-gray-500">Click verb to insert bullet</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {ACTION_VERBS.map((verb) => (
                            <button
                              key={verb}
                              type="button"
                              onClick={() => insertActionVerb(i, verb)}
                              className="text-[11px] px-2.5 py-1 rounded-lg bg-white dark:bg-[#181820] hover:bg-violet-500/10 text-gray-700 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-300 border border-gray-200 dark:border-gray-800 transition-colors font-medium"
                            >
                              + {verb}
                            </button>
                          ))}
                        </div>
                      </div>

                      <textarea
                        className={ta}
                        rows={5}
                        placeholder="• Architected a real-time analytics microservice using Node.js and Redis, reducing latency by 45%&#10;• Spearheaded migration of monolithic system to AWS ECS, saving $40k annually in cloud infrastructure&#10;• Mentored a team of 4 engineers and improved release velocity by 30% through CI/CD automation"
                        value={exp.description}
                        onChange={(e) => setArr('experience', i, 'description', e.target.value)}
                      />
                    </div>
                  ))
                )}
                <AddBtn onClick={() => addItem('experience', emptyExperience)} label="Add Experience Position" />
              </Card>
            )}

            {/* 4. Projects */}
            {activeTab === 4 && (
              <Card>
                <SectionHeader
                  title="Key Projects"
                  subtitle="Demonstrate hands-on problem solving. Include tech stack keywords and links."
                  badge="Great for Keywords"
                />

                {form.projects.length === 0 ? (
                  <EmptySection label="projects" onAdd={() => addItem('projects', emptyProject)} />
                ) : (
                  form.projects.map((proj, i) => (
                    <div key={i} className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5 mb-4 bg-gray-50 dark:bg-[#111116]">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-violet-600 dark:text-violet-400 font-bold">Project #{i + 1}</span>
                          <div className="flex items-center gap-1">
                            {i > 0 && (
                              <button
                                type="button"
                                onClick={() => moveItem('projects', i, -1)}
                                className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-violet-600"
                              >
                                ▲
                              </button>
                            )}
                            {i < form.projects.length - 1 && (
                              <button
                                type="button"
                                onClick={() => moveItem('projects', i, 1)}
                                className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-violet-600"
                              >
                                ▼
                              </button>
                            )}
                          </div>
                        </div>
                        <RemoveBtn onClick={() => removeItem('projects', i)} />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block font-medium">Project Title *</label>
                          <input
                            className={inp}
                            placeholder="e.g. Distributed Task Scheduler"
                            value={proj.name}
                            onChange={(e) => setArr('projects', i, 'name', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block font-medium">Tech Stack (comma-separated)</label>
                          <input
                            className={inp}
                            placeholder="e.g. React, Go, Docker, Redis"
                            value={proj.techStack}
                            onChange={(e) => setArr('projects', i, 'techStack', e.target.value)}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block font-medium">Repository or Live URL</label>
                          <input
                            className={inp}
                            placeholder="https://github.com/username/project or https://live-demo.com"
                            value={proj.link}
                            onChange={(e) => setArr('projects', i, 'link', e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block font-medium">Project Accomplishments & Metrics</label>
                        <textarea
                          className={ta}
                          rows={3}
                          placeholder="• Built a fault-tolerant job queue processing 10k messages/sec with zero message loss&#10;• Implemented JWT authentication and role-based access control protecting 50+ REST endpoints"
                          value={proj.description}
                          onChange={(e) => setArr('projects', i, 'description', e.target.value)}
                        />
                      </div>
                    </div>
                  ))
                )}
                <AddBtn onClick={() => addItem('projects', emptyProject)} label="Add Project" />
              </Card>
            )}

            {/* 5. Education */}
            {activeTab === 5 && (
              <Card>
                <SectionHeader
                  title="Education"
                  subtitle="Standard degree names (e.g. Bachelor of Science, B.Tech) ensure accurate ATS parsing."
                />

                {form.education.length === 0 ? (
                  <EmptySection label="education" onAdd={() => addItem('education', emptyEducation)} />
                ) : (
                  form.education.map((edu, i) => (
                    <div key={i} className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5 mb-4 bg-gray-50 dark:bg-[#111116]">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-violet-600 dark:text-violet-400 font-bold">Degree #{i + 1}</span>
                        <RemoveBtn onClick={() => removeItem('education', i)} />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block font-medium">Institution / University *</label>
                          <input
                            className={inp}
                            placeholder="e.g. University of California, Berkeley"
                            value={edu.school}
                            onChange={(e) => setArr('education', i, 'school', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block font-medium">Degree *</label>
                          <input
                            className={inp}
                            placeholder="e.g. Bachelor of Science (B.S.)"
                            value={edu.degree}
                            onChange={(e) => setArr('education', i, 'degree', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block font-medium">Field of Study</label>
                          <input
                            className={inp}
                            placeholder="e.g. Computer Science"
                            value={edu.field}
                            onChange={(e) => setArr('education', i, 'field', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block font-medium">GPA or Honors (Optional)</label>
                          <input
                            className={inp}
                            placeholder="e.g. 3.8 / 4.0 or Magna Cum Laude"
                            value={edu.grade}
                            onChange={(e) => setArr('education', i, 'grade', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block font-medium">Start Year</label>
                          <input
                            className={inp}
                            placeholder="2020"
                            value={edu.startYear}
                            onChange={(e) => setArr('education', i, 'startYear', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block font-medium">Graduation Year</label>
                          <input
                            className={inp}
                            placeholder="2024"
                            value={edu.endYear}
                            onChange={(e) => setArr('education', i, 'endYear', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <AddBtn onClick={() => addItem('education', emptyEducation)} label="Add Degree" />
              </Card>
            )}

            {/* 6. Certifications */}
            {activeTab === 6 && (
              <Card>
                <SectionHeader
                  title="Certifications & Licenses"
                  subtitle="Industry credentials like AWS, GCP, CKA, or Cisco boost resume authority."
                />

                {form.certifications.length === 0 ? (
                  <EmptySection label="certifications" onAdd={() => addItem('certifications', emptyCertification)} />
                ) : (
                  form.certifications.map((cert, i) => (
                    <div key={i} className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 mb-4 bg-gray-50 dark:bg-[#111116]">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-violet-600 dark:text-violet-400 font-bold">Certification #{i + 1}</span>
                        <RemoveBtn onClick={() => removeItem('certifications', i)} />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block font-medium">Certification Title *</label>
                          <input
                            className={inp}
                            placeholder="e.g. AWS Certified Solutions Architect - Associate"
                            value={cert.name}
                            onChange={(e) => setArr('certifications', i, 'name', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block font-medium">Year Earned</label>
                          <input
                            className={inp}
                            placeholder="2024"
                            value={cert.year}
                            onChange={(e) => setArr('certifications', i, 'year', e.target.value)}
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block font-medium">Issuing Organization</label>
                          <input
                            className={inp}
                            placeholder="e.g. Amazon Web Services (AWS)"
                            value={cert.issuer}
                            onChange={(e) => setArr('certifications', i, 'issuer', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <AddBtn onClick={() => addItem('certifications', emptyCertification)} label="Add Certification" />
              </Card>
            )}

            {/* 7. Achievements */}
            {activeTab === 7 && (
              <Card>
                <SectionHeader
                  title="Honors & Achievements"
                  subtitle="Competitions, awards, publications, hackathon wins, or patents."
                />

                {form.achievements.length === 0 ? (
                  <EmptySection label="achievements" onAdd={() => addItem('achievements', emptyAchievement)} />
                ) : (
                  form.achievements.map((ach, i) => (
                    <div key={i} className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 mb-4 bg-gray-50 dark:bg-[#111116]">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-violet-600 dark:text-violet-400 font-bold">Honor #{i + 1}</span>
                        <RemoveBtn onClick={() => removeItem('achievements', i)} />
                      </div>

                      <div className="grid gap-3">
                        <div>
                          <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block font-medium">Achievement Title *</label>
                          <input
                            className={inp}
                            placeholder="e.g. 1st Place Winner — Global AI Hackathon (out of 2,400 participants)"
                            value={ach.title}
                            onChange={(e) => setArr('achievements', i, 'title', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block font-medium">Context or Metric</label>
                          <textarea
                            className={ta}
                            rows={2}
                            placeholder="Built an automated code refactoring assistant within 48 hours that received top marks for system latency."
                            value={ach.description}
                            onChange={(e) => setArr('achievements', i, 'description', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <AddBtn onClick={() => addItem('achievements', emptyAchievement)} label="Add Achievement" />
              </Card>
            )}

            {/* Footer with errors, successes, and navigation */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 text-red-600 dark:text-red-400 text-sm mt-5 font-medium">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-4 py-3 text-emerald-600 dark:text-emerald-400 text-sm mt-5 font-medium">
                {success}
              </div>
            )}

            <div className="flex items-center justify-between mt-8 gap-3 flex-wrap">
              <div className="flex gap-2">
                {activeTab > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setActiveTab((t) => t - 1)}
                  >
                    ← Previous Tab
                  </Button>
                )}
                {activeTab < TABS.length - 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab((t) => t + 1)}
                  >
                    Next Tab →
                  </Button>
                )}
              </div>

              <Button
                type="submit"
                variant="filled"
                className="px-8 py-3 font-bold shadow-lg shadow-violet-600/20"
                disabled={saving}
              >
                {saving ? 'Saving…' : isEdit ? 'Update ATS Resume' : 'Save ATS Resume'}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}
