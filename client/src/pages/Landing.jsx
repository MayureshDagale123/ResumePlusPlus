import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

const HOW_IT_WORKS = [
  { step: 1, title: 'Find Jobs', desc: 'Search thousands of listings tailored to your profile.' },
  { step: 2, title: 'Save & Review', desc: 'Bookmark jobs and compare them side-by-side.' },
  { step: 3, title: 'Create/Upload Resume', desc: 'Build a resume from scratch or upload an existing one.' },
  { step: 4, title: 'Optimize with AI', desc: 'Let AI tailor your resume to each job description.' },
]

const FEATURES = [
  { icon: '🔍', title: 'Job Search', desc: 'Find relevant listings from multiple sources in one place.' },
  { icon: '📄', title: 'Resume Builder', desc: 'Create professional resumes with easy-to-use templates.' },
  { icon: '🤖', title: 'AI Optimization', desc: 'Automatically tailor your resume for each job you apply to.' },
  { icon: '📥', title: 'PDF Download', desc: 'Export your polished resume as a clean, ATS-friendly PDF.' },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="bg-white dark:bg-black text-gray-900 dark:text-white transition-colors duration-200">
      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 py-20 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-violet-500/10 dark:bg-violet-600/15 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 text-xs font-semibold mb-6">
          <span>✨</span> Multi-Platform Job Spy & AI Resume Tailoring (90+ ATS Score)
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white leading-tight max-w-3xl">
          Find relevant jobs and{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-500 dark:from-violet-400 dark:to-indigo-300">
            optimize your resume
          </span>{' '}
          for them using AI.
        </h1>
        <p className="mt-6 text-gray-600 dark:text-gray-400 text-lg max-w-xl">
          Resume++ searches across LinkedIn, Indeed, Glassdoor, and ZipRecruiter in real-time, builds ATS-optimized resumes with 90+ score guidelines, and tailors your resume for every job.
        </p>
        <div className="mt-10 flex gap-4 flex-wrap justify-center">
          <Button
            variant="filled"
            className="px-8 py-3.5 text-base shadow-[0_0_25px_rgba(139,92,246,0.35)]"
            onClick={() => navigate('/jobs')}
          >
            🔍 Find Jobs
          </Button>
          <Button
            variant="outline"
            className="px-8 py-3.5 text-base"
            onClick={() => navigate('/resume/create')}
          >
            ⚡ Create 90+ ATS Resume
          </Button>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────── */}
      <section className="py-20 bg-gray-50 dark:bg-[#0a0a0a] border-y border-gray-200 dark:border-gray-800/60">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <div key={step} className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-600/20 border border-violet-300 dark:border-violet-500/30 flex items-center justify-center text-violet-700 dark:text-violet-400 font-bold text-lg">
                  {step}
                </div>
                <h3 className="text-gray-900 dark:text-white font-semibold">{title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Core Features ─────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">Core Features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ icon, title, desc }) => (
              <Card
                key={title}
                className="hover:border-violet-500/50 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] transition-all duration-300"
              >
                <div className="text-3xl mb-3">{icon}</div>
                <h3 className="text-gray-900 dark:text-white font-semibold mb-2">{title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section className="py-24 bg-gray-50 dark:bg-[#0a0a0a] border-t border-gray-200 dark:border-gray-800/60">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Ready to land your dream job?</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">Join thousands of job seekers using Resume++ to get hired faster with 90+ ATS resumes.</p>
          <Button
            variant="filled"
            className="px-10 py-3.5 text-base shadow-[0_0_30px_rgba(139,92,246,0.4)]"
            onClick={() => navigate('/register')}
          >
            Get Started Free
          </Button>
        </div>
      </section>
    </div>
  )
}
