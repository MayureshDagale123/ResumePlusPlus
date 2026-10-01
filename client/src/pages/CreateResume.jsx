import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getResume, createResume, updateResume } from '../services/resumeService'
import api from '../services/api'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

// ── Reusable input / textarea styles ──────────────────────────────
const inp = 'bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-500 focus:outline-none focus:border-violet-500 transition-colors w-full text-sm'
const ta  = `${inp} resize-none`

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {subtitle && <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>}
    </div>
  )
}
function AddBtn({ onClick, label }) {
  return (
    <button type="button" onClick={onClick}
      className="mt-3 text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors">
      + {label}
    </button>
  )
}
function RemoveBtn({ onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="text-xs text-gray-600 hover:text-red-400 transition-colors ml-auto shrink-0">
      Remove
    </button>
  )
}
function EmptySection({ label, onAdd }) {
  return (
    <div className="border border-dashed border-gray-700 rounded-lg px-5 py-4 text-gray-600 text-sm flex items-center justify-between">
      <span>No {label} added yet</span>
      <button type="button" onClick={onAdd} className="text-violet-400 hover:text-violet-300 text-xs">+ Add</button>
    </div>
  )
}

const TABS = ['Personal Info','Summary','Education','Skills','Experience','Projects','Certifications','Achievements']
const emptyEducation     = () => ({ school: '', degree: '', field: '', startYear: '', endYear: '', grade: '' })
const emptyExperience    = () => ({ company: '', title: '', location: '', startDate: '', endDate: '', current: false, description: '' })
const emptyProject       = () => ({ name: '', description: '', techStack: '', link: '' })
const emptyCertification = () => ({ name: '', issuer: '', year: '' })
const emptyAchievement   = () => ({ title: '', description: '' })
const defaultResume      = () => ({
  personalInfo:   { name: '', email: '', phone: '', location: '', linkedin: '', github: '' },
  summary: '', education: [], skills: [], experience: [], projects: [], certifications: [], achievements: [],
})

export default function CreateResume() {
  const navigate   = useNavigate()
  const fileRef    = useRef(null)

  // Mode: 'manual' or 'upload'
  const [mode, setMode]     = useState('manual')

  // Form state
  const [activeTab, setActiveTab]   = useState(0)
  const [form, setForm]             = useState(defaultResume())
  const [skillInput, setSkillInput] = useState('')
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [isEdit, setIsEdit]         = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState('')

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
            personalInfo:   data.personalInfo   || defaultResume().personalInfo,
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
      } catch { /* 404 = no resume yet */ }
      finally { setLoading(false) }
    }
    load()
  }, [])

  // ── Form helpers ──────────────────────────────────────────────
  const setPI  = (field, val) => setForm(f => ({ ...f, personalInfo: { ...f.personalInfo, [field]: val } }))
  const setArr = (key, idx, field, val) => setForm(f => ({
    ...f, [key]: f[key].map((item, i) => i === idx ? { ...item, [field]: val } : item),
  }))
  const addItem    = (key, empty) => setForm(f => ({ ...f, [key]: [...f[key], empty()] }))
  const removeItem = (key, idx)   => setForm(f => ({ ...f, [key]: f[key].filter((_, i) => i !== idx) }))

  const handleSkillKey = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && skillInput.trim()) {
      e.preventDefault()
      const s = skillInput.trim().replace(/,$/, '')
      if (s && !form.skills.includes(s)) setForm(f => ({ ...f, skills: [...f.skills, s] }))
      setSkillInput('')
    }
  }
  const removeSkill = (s) => setForm(f => ({ ...f, skills: f.skills.filter(x => x !== s) }))

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
      if (isEdit) { await updateResume(form); setSuccess('Resume updated!') }
      else        { await createResume(form); setSuccess('Resume created!'); setIsEdit(true) }
      setTimeout(() => { setSuccess(''); navigate('/resume') }, 1500)
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save. Please try again.')
    } finally { setSaving(false) }
  }

  // ── File upload ───────────────────────────────────────────────
  const handleFileChange = (e) => {
    const f = e.target.files?.[0]
    if (f) { setFile(f); setUploadError(''); setUploadSuccess('') }
  }
  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) { setFile(f); setUploadError(''); setUploadSuccess('') }
  }
  const handleUploadSubmit = async () => {
    if (!file) { setUploadError('Please select a file.'); return }
    const allowed = ['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword']
    if (!allowed.includes(file.type)) { setUploadError('Only PDF and DOCX files are supported.'); return }
    if (file.size > 5 * 1024 * 1024)  { setUploadError('File must be under 5 MB.'); return }

    setUploadError(''); setUploading(true)
    const formData = new FormData()
    formData.append('resume', file)
    try {
      const { data } = await api.post('/resume/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setUploadSuccess('Resume parsed and saved! Redirecting…')
      setTimeout(() => navigate('/resume/create'), 2000) // reload form with parsed data
    } catch (err) {
      setUploadError(err?.response?.data?.message || 'Upload failed. Please try again.')
    } finally { setUploading(false) }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">
          {isEdit ? 'Edit Resume' : 'Create Resume'}
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Fill in each section manually, or upload an existing PDF/DOCX for AI to parse.
        </p>
      </div>

      {/* Mode switcher */}
      <div className="flex gap-2 mb-8">
        <button type="button" onClick={() => setMode('manual')}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
            mode === 'manual'
              ? 'bg-violet-600/20 text-violet-400 border-violet-500/40'
              : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800 border-transparent'
          }`}>
          ✏️ Fill Manually
        </button>
        <button type="button" onClick={() => setMode('upload')}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
            mode === 'upload'
              ? 'bg-violet-600/20 text-violet-400 border-violet-500/40'
              : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800 border-transparent'
          }`}>
          📤 Upload PDF / DOCX
        </button>
      </div>

      {/* ── UPLOAD MODE ────────────────────────────────────────── */}
      {mode === 'upload' && (
        <Card className="space-y-5">
          <SectionHeader
            title="Upload Your Resume"
            subtitle="AI will extract your information and populate the form. You can edit it after."
          />

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
              dragOver
                ? 'border-violet-500 bg-violet-500/10'
                : file
                ? 'border-green-500/50 bg-green-900/10'
                : 'border-gray-700 hover:border-violet-500/50 hover:bg-gray-900/50'
            }`}>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={handleFileChange}
            />
            {file ? (
              <div>
                <p className="text-2xl mb-2">📄</p>
                <p className="text-white font-medium text-sm">{file.name}</p>
                <p className="text-gray-500 text-xs mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null) }}
                  className="mt-2 text-xs text-gray-600 hover:text-red-400 transition-colors">
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <p className="text-4xl mb-3">☁️</p>
                <p className="text-gray-300 text-sm font-medium">Drag & drop or click to upload</p>
                <p className="text-gray-600 text-xs mt-1">PDF or DOCX • Max 5 MB</p>
              </div>
            )}
          </div>

          {/* Upload errors / success */}
          {uploadError && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
              {uploadError}
            </div>
          )}
          {uploadSuccess && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg px-4 py-3 text-green-400 text-sm">
              {uploadSuccess}
            </div>
          )}

          {/* AI info */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-lg px-4 py-3 text-xs text-gray-500">
            <p>🤖 <span className="text-gray-400">Gemini AI</span> will extract your name, experience, skills, education, and more from the document.</p>
            <p className="mt-1">📝 After parsing, you can review and edit the extracted data in the manual form before saving.</p>
            <p className="mt-1">⚠️ Only <span className="text-gray-400">text-based PDFs</span> are supported. Scanned image PDFs won't work.</p>
          </div>

          {/* Upload button */}
          <Button
            type="button"
            variant="filled"
            className={`w-full py-3 text-sm font-semibold ${uploading ? 'opacity-70 cursor-not-allowed' : ''}`}
            disabled={!file || uploading}
            onClick={handleUploadSubmit}>
            {uploading ? (
              <span className="flex items-center justify-center gap-3">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Extracting & parsing with AI…
              </span>
            ) : 'Parse & Import Resume'}
          </Button>
          {uploading && (
            <p className="text-center text-gray-500 text-xs">
              This usually takes 15–30 seconds depending on resume length…
            </p>
          )}
        </Card>
      )}

      {/* ── MANUAL MODE ────────────────────────────────────────── */}
      {mode === 'manual' && (
        <>
          {/* Tab bar */}
          <div className="flex gap-1 flex-wrap mb-8 border-b border-gray-800 pb-2">
            {TABS.map((tab, i) => (
              <button key={tab} type="button" onClick={() => setActiveTab(i)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === i
                    ? 'text-violet-400 bg-violet-500/10'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                }`}>
                {tab}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {/* 0. Personal Info */}
            {activeTab === 0 && (
              <Card>
                <SectionHeader title="Personal Information" subtitle="Required: Full name" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="text-xs text-gray-400 mb-1 block">Full Name *</label>
                    <input className={inp} placeholder="e.g. Mayuresh Patil" value={form.personalInfo.name}
                      onChange={e => setPI('name', e.target.value)} required /></div>
                  <div><label className="text-xs text-gray-400 mb-1 block">Email</label>
                    <input className={inp} type="email" placeholder="you@example.com" value={form.personalInfo.email}
                      onChange={e => setPI('email', e.target.value)} /></div>
                  <div><label className="text-xs text-gray-400 mb-1 block">Phone</label>
                    <input className={inp} placeholder="+91 9876543210" value={form.personalInfo.phone}
                      onChange={e => setPI('phone', e.target.value)} /></div>
                  <div><label className="text-xs text-gray-400 mb-1 block">Location</label>
                    <input className={inp} placeholder="Mumbai, India" value={form.personalInfo.location}
                      onChange={e => setPI('location', e.target.value)} /></div>
                  <div><label className="text-xs text-gray-400 mb-1 block">LinkedIn URL</label>
                    <input className={inp} placeholder="https://linkedin.com/in/yourprofile" value={form.personalInfo.linkedin}
                      onChange={e => setPI('linkedin', e.target.value)} /></div>
                  <div><label className="text-xs text-gray-400 mb-1 block">GitHub URL</label>
                    <input className={inp} placeholder="https://github.com/yourusername" value={form.personalInfo.github}
                      onChange={e => setPI('github', e.target.value)} /></div>
                </div>
              </Card>
            )}

            {/* 1. Summary */}
            {activeTab === 1 && (
              <Card>
                <SectionHeader title="Professional Summary" subtitle="A short 2-4 sentence overview." />
                <textarea className={ta} rows={6} placeholder="e.g. Full-stack developer with 3 years of experience..."
                  value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} />
                <p className="text-xs text-gray-600 mt-2">{form.summary.length} characters</p>
              </Card>
            )}

            {/* 2. Education */}
            {activeTab === 2 && (
              <Card>
                <SectionHeader title="Education" subtitle="Add your degrees, diplomas, or courses." />
                {form.education.length === 0
                  ? <EmptySection label="education" onAdd={() => addItem('education', emptyEducation)} />
                  : form.education.map((edu, i) => (
                    <div key={i} className="border border-gray-800 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-400 font-medium">Entry {i + 1}</span>
                        <RemoveBtn onClick={() => removeItem('education', i)} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[['school','School / University','MIT'],['degree','Degree','B.Tech'],['field','Field of Study','Computer Science'],['grade','Grade / GPA','3.8 / 4.0'],['startYear','Start Year','2020'],['endYear','End Year','2024']].map(([f,l,p]) => (
                          <div key={f}><label className="text-xs text-gray-500 mb-1 block">{l}</label>
                            <input className={inp} placeholder={p} value={edu[f]}
                              onChange={e => setArr('education', i, f, e.target.value)} /></div>
                        ))}
                      </div>
                    </div>
                  ))}
                <AddBtn onClick={() => addItem('education', emptyEducation)} label="Add Education" />
              </Card>
            )}

            {/* 3. Skills */}
            {activeTab === 3 && (
              <Card>
                <SectionHeader title="Skills" subtitle="Type a skill and press Enter or comma to add it." />
                <div className="flex flex-wrap gap-2 mb-3 min-h-[2rem]">
                  {form.skills.map(s => (
                    <span key={s} className="flex items-center gap-1 bg-violet-600/20 border border-violet-500/30 text-violet-300 px-3 py-1 rounded-full text-sm">
                      {s}
                      <button type="button" onClick={() => removeSkill(s)}
                        className="text-violet-400 hover:text-red-400 transition-colors ml-1 leading-none">×</button>
                    </span>
                  ))}
                </div>
                <input className={inp} placeholder="e.g. React, Node.js, MongoDB... press Enter to add"
                  value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={handleSkillKey} />
                <p className="text-xs text-gray-600 mt-2">{form.skills.length} skills added</p>
              </Card>
            )}

            {/* 4. Experience */}
            {activeTab === 4 && (
              <Card>
                <SectionHeader title="Work Experience" subtitle="Add your work history, internships, or freelance projects." />
                {form.experience.length === 0
                  ? <EmptySection label="experience" onAdd={() => addItem('experience', emptyExperience)} />
                  : form.experience.map((exp, i) => (
                    <div key={i} className="border border-gray-800 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-400 font-medium">Job {i + 1}</span>
                        <RemoveBtn onClick={() => removeItem('experience', i)} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <div><label className="text-xs text-gray-500 mb-1 block">Company</label>
                          <input className={inp} placeholder="Google" value={exp.company}
                            onChange={e => setArr('experience', i, 'company', e.target.value)} /></div>
                        <div><label className="text-xs text-gray-500 mb-1 block">Job Title</label>
                          <input className={inp} placeholder="Software Engineer" value={exp.title}
                            onChange={e => setArr('experience', i, 'title', e.target.value)} /></div>
                        <div><label className="text-xs text-gray-500 mb-1 block">Location</label>
                          <input className={inp} placeholder="Remote / New York" value={exp.location}
                            onChange={e => setArr('experience', i, 'location', e.target.value)} /></div>
                        <div className="flex gap-2">
                          <div className="flex-1"><label className="text-xs text-gray-500 mb-1 block">Start</label>
                            <input className={inp} placeholder="Jan 2022" value={exp.startDate}
                              onChange={e => setArr('experience', i, 'startDate', e.target.value)} /></div>
                          <div className="flex-1"><label className="text-xs text-gray-500 mb-1 block">End</label>
                            <input className={inp} placeholder={exp.current ? 'Present' : 'Dec 2023'}
                              disabled={exp.current} value={exp.current ? 'Present' : exp.endDate}
                              onChange={e => setArr('experience', i, 'endDate', e.target.value)} /></div>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-gray-400 mb-3 cursor-pointer">
                        <input type="checkbox" checked={exp.current} className="accent-violet-500"
                          onChange={e => setArr('experience', i, 'current', e.target.checked)} />
                        Currently working here
                      </label>
                      <div><label className="text-xs text-gray-500 mb-1 block">Description</label>
                        <textarea className={ta} rows={4}
                          placeholder="• Built a React dashboard that reduced load time by 40%&#10;• Led a team of 3 engineers..."
                          value={exp.description} onChange={e => setArr('experience', i, 'description', e.target.value)} /></div>
                    </div>
                  ))}
                <AddBtn onClick={() => addItem('experience', emptyExperience)} label="Add Experience" />
              </Card>
            )}

            {/* 5. Projects */}
            {activeTab === 5 && (
              <Card>
                <SectionHeader title="Projects" subtitle="Personal, academic, or professional projects." />
                {form.projects.length === 0
                  ? <EmptySection label="projects" onAdd={() => addItem('projects', emptyProject)} />
                  : form.projects.map((proj, i) => (
                    <div key={i} className="border border-gray-800 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-400 font-medium">Project {i + 1}</span>
                        <RemoveBtn onClick={() => removeItem('projects', i)} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <div><label className="text-xs text-gray-500 mb-1 block">Project Name</label>
                          <input className={inp} placeholder="Resume++" value={proj.name}
                            onChange={e => setArr('projects', i, 'name', e.target.value)} /></div>
                        <div><label className="text-xs text-gray-500 mb-1 block">Tech Stack</label>
                          <input className={inp} placeholder="React, Node.js" value={proj.techStack}
                            onChange={e => setArr('projects', i, 'techStack', e.target.value)} /></div>
                        <div className="sm:col-span-2"><label className="text-xs text-gray-500 mb-1 block">Link (optional)</label>
                          <input className={inp} placeholder="https://github.com/you/project" value={proj.link}
                            onChange={e => setArr('projects', i, 'link', e.target.value)} /></div>
                      </div>
                      <div><label className="text-xs text-gray-500 mb-1 block">Description</label>
                        <textarea className={ta} rows={3} placeholder="What does this project do?"
                          value={proj.description} onChange={e => setArr('projects', i, 'description', e.target.value)} /></div>
                    </div>
                  ))}
                <AddBtn onClick={() => addItem('projects', emptyProject)} label="Add Project" />
              </Card>
            )}

            {/* 6. Certifications */}
            {activeTab === 6 && (
              <Card>
                <SectionHeader title="Certifications" subtitle="Courses, licenses, or certifications you've earned." />
                {form.certifications.length === 0
                  ? <EmptySection label="certifications" onAdd={() => addItem('certifications', emptyCertification)} />
                  : form.certifications.map((cert, i) => (
                    <div key={i} className="border border-gray-800 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-400 font-medium">Certification {i + 1}</span>
                        <RemoveBtn onClick={() => removeItem('certifications', i)} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2"><label className="text-xs text-gray-500 mb-1 block">Name</label>
                          <input className={inp} placeholder="AWS Solutions Architect" value={cert.name}
                            onChange={e => setArr('certifications', i, 'name', e.target.value)} /></div>
                        <div><label className="text-xs text-gray-500 mb-1 block">Year</label>
                          <input className={inp} placeholder="2024" value={cert.year}
                            onChange={e => setArr('certifications', i, 'year', e.target.value)} /></div>
                        <div className="sm:col-span-3"><label className="text-xs text-gray-500 mb-1 block">Issuer</label>
                          <input className={inp} placeholder="Amazon Web Services" value={cert.issuer}
                            onChange={e => setArr('certifications', i, 'issuer', e.target.value)} /></div>
                      </div>
                    </div>
                  ))}
                <AddBtn onClick={() => addItem('certifications', emptyCertification)} label="Add Certification" />
              </Card>
            )}

            {/* 7. Achievements */}
            {activeTab === 7 && (
              <Card>
                <SectionHeader title="Achievements" subtitle="Awards, honours, competitions, or notable accomplishments." />
                {form.achievements.length === 0
                  ? <EmptySection label="achievements" onAdd={() => addItem('achievements', emptyAchievement)} />
                  : form.achievements.map((ach, i) => (
                    <div key={i} className="border border-gray-800 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-400 font-medium">Achievement {i + 1}</span>
                        <RemoveBtn onClick={() => removeItem('achievements', i)} />
                      </div>
                      <div className="grid gap-3">
                        <div><label className="text-xs text-gray-500 mb-1 block">Title</label>
                          <input className={inp} placeholder="1st Place — National Hackathon 2023" value={ach.title}
                            onChange={e => setArr('achievements', i, 'title', e.target.value)} /></div>
                        <div><label className="text-xs text-gray-500 mb-1 block">Description (optional)</label>
                          <textarea className={ta} rows={2} placeholder="Brief context..."
                            value={ach.description} onChange={e => setArr('achievements', i, 'description', e.target.value)} /></div>
                      </div>
                    </div>
                  ))}
                <AddBtn onClick={() => addItem('achievements', emptyAchievement)} label="Add Achievement" />
              </Card>
            )}

            {/* Footer */}
            {error   && <p className="text-red-400 text-sm mt-4">{error}</p>}
            {success && <p className="text-green-400 text-sm mt-4">{success}</p>}

            <div className="flex items-center justify-between mt-6 gap-3 flex-wrap">
              <div className="flex gap-2">
                {activeTab > 0 && (
                  <Button type="button" variant="ghost" onClick={() => setActiveTab(t => t - 1)}>← Previous</Button>
                )}
                {activeTab < TABS.length - 1 && (
                  <Button type="button" variant="outline" onClick={() => setActiveTab(t => t + 1)}>Next →</Button>
                )}
              </div>
              <Button type="submit" variant="filled" className="px-8 py-2.5" disabled={saving}>
                {saving ? 'Saving…' : isEdit ? 'Update Resume' : 'Save Resume'}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}
