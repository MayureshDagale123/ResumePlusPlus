import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getSavedJobs } from '../services/jobService'
import api from '../services/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [savedJobs, setSavedJobs]         = useState([])
  const [resumeExists, setResumeExists]   = useState(false)
  const [optimizedCount, setOptimizedCount] = useState(0)
  const [loading, setLoading]             = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch saved jobs, resume status, and optimized resume count in parallel
        const [savedRes, resumeRes, optimizedRes] = await Promise.allSettled([
          getSavedJobs(),
          api.get('/resume'),
          api.get('/optimized-resumes'),
        ])

        if (savedRes.status === 'fulfilled') setSavedJobs(savedRes.value)
        if (resumeRes.status === 'fulfilled') setResumeExists(!!resumeRes.value?.data?.data)
        if (optimizedRes.status === 'fulfilled') setOptimizedCount(optimizedRes.value?.data?.count || 0)
      } catch {
        // non-critical — show zeros on error
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const firstName = user?.name?.split(' ')[0] || 'there'
  const recentJobs = savedJobs.slice(0, 3)

  // ── Stat card data ─────────────────────────────────────────────
  const stats = [
    {
      label: 'Saved Jobs',
      value: loading ? '—' : savedJobs.length,
      icon: '💾',
      color: 'text-violet-400',
      bg: 'bg-violet-500/10 border-violet-500/20',
      action: () => navigate('/jobs/saved'),
    },
    {
      label: 'Original Resume',
      value: loading ? '—' : resumeExists ? 'Ready' : 'Not created',
      icon: '📄',
      color: resumeExists ? 'text-green-400' : 'text-yellow-400',
      bg: resumeExists
        ? 'bg-green-500/10 border-green-500/20'
        : 'bg-yellow-500/10 border-yellow-500/20',
      action: () => navigate(resumeExists ? '/resume' : '/resume/create'),
    },
    {
      label: 'Optimized Resumes',
      value: loading ? '—' : optimizedCount,
      icon: '🤖',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
      action: () => navigate('/resume'),
    },
  ]

  // ── Quick actions ──────────────────────────────────────────────
  const quickActions = [
    {
      label: 'Find Jobs',
      desc: 'Search real LinkedIn job listings',
      icon: '🔍',
      path: '/jobs',
      variant: 'outline',
    },
    {
      label: 'Create Resume',
      desc: resumeExists ? 'View or edit your resume' : 'Build your original resume',
      icon: '📝',
      path: resumeExists ? '/resume' : '/resume/create',
      variant: 'outline',
    },
    {
      label: 'Optimize Resume',
      desc: 'Tailor your resume with AI',
      icon: '⚡',
      path: '/optimizer',
      variant: 'outline',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">

      {/* ── Welcome ──────────────────────────────────────────── */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white">
          Welcome back, <span className="text-violet-400">{firstName}</span> 👋
        </h1>
        <p className="text-gray-400 mt-1">
          Here's what's happening with your job search.
        </p>
      </div>

      {/* ── Stats row ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {stats.map((s) => (
          <button
            key={s.label}
            onClick={s.action}
            className={`text-left border rounded-xl p-5 transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] ${s.bg}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{s.icon}</span>
              <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
            </div>
            <p className="text-gray-300 text-sm font-medium">{s.label}</p>
          </button>
        ))}
      </div>

      {/* ── Quick actions ─────────────────────────────────────── */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map((a) => (
            <Card
              key={a.label}
              className="flex flex-col gap-3 hover:border-violet-500/50 transition-colors cursor-pointer"
              onClick={() => navigate(a.path)}
            >
              <span className="text-2xl">{a.icon}</span>
              <div>
                <h3 className="text-white font-semibold text-sm">{a.label}</h3>
                <p className="text-gray-500 text-xs mt-0.5">{a.desc}</p>
              </div>
              <Button
                variant={a.variant}
                className="text-xs py-1.5 mt-auto"
                onClick={(e) => { e.stopPropagation(); navigate(a.path) }}
              >
                {a.label}
              </Button>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Recently saved jobs ──────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recently Saved Jobs</h2>
          {savedJobs.length > 3 && (
            <button
              onClick={() => navigate('/jobs/saved')}
              className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              View all ({savedJobs.length}) →
            </button>
          )}
        </div>

        {loading && (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && recentJobs.length === 0 && (
          <Card className="text-center py-10">
            <p className="text-gray-500 text-sm mb-4">No saved jobs yet.</p>
            <Button variant="filled" onClick={() => navigate('/jobs')}>
              Find Jobs
            </Button>
          </Card>
        )}

        {!loading && recentJobs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentJobs.map(({ _id, jobData }) => (
              <Card
                key={_id}
                className="flex flex-col gap-2 hover:border-violet-500/40 transition-colors cursor-pointer"
                onClick={() => navigate(`/job/${jobData.externalId}`)}
              >
                <div className="flex items-start gap-2">
                  {jobData.company?.logo && (
                    <img
                      src={jobData.company.logo}
                      alt={jobData.company.name}
                      className="w-8 h-8 rounded object-contain bg-gray-800 shrink-0 mt-0.5"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  )}
                  <div className="min-w-0">
                    <h3 className="text-white text-sm font-semibold leading-snug line-clamp-2">
                      {jobData.title}
                    </h3>
                    <p className="text-gray-500 text-xs mt-0.5 truncate">
                      {jobData.company?.name}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {jobData.location?.city && (
                    <span className="text-gray-500 truncate">
                      📍 {jobData.location.city}
                      {jobData.location.state ? `, ${jobData.location.state}` : ''}
                    </span>
                  )}
                  {jobData.location?.remote && (
                    <span className="text-violet-400">Remote</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
