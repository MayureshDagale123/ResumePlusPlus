/**
 * atsScorer.js (server)
 * Authoritative ATS scoring logic for resumes in Resume++.
 */

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
  'Orchestrated',
  'Refactored',
  'Enhanced',
  'Integrated',
  'Streamlined',
  'Led',
  'Built',
  'Resolved',
  'Pioneered',
  'Delivered',
  'Constructed',
  'Mentored',
  'Launched',
]

const KNOWN_TECH_KEYWORDS = [
  'React', 'Next.js', 'Vue', 'Angular', 'Svelte', 'TypeScript', 'JavaScript', 'Node.js',
  'Express', 'FastAPI', 'Django', 'Flask', 'Python', 'Java', 'Spring Boot', 'Go', 'Golang',
  'Rust', 'C++', 'C#', '.NET', 'PHP', 'Ruby', 'Rails', 'PostgreSQL', 'MongoDB', 'MySQL',
  'Redis', 'Elasticsearch', 'DynamoDB', 'Kafka', 'RabbitMQ', 'GraphQL', 'REST', 'RESTful APIs',
  'Microservices', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'CI/CD', 'Terraform',
  'Linux', 'Git', 'GitHub', 'Tailwind', 'Tailwind CSS', 'Redux', 'System Design', 'TDD',
  'Unit Testing', 'Jest', 'Cypress', 'Playwright', 'Agile', 'Scrum', 'Performance Optimization',
  'Security', 'Authentication', 'OAuth', 'JWT', 'Scalability', 'High Availability',
]

const extractSkills = (skills) => {
  if (!Array.isArray(skills)) return []
  return skills
    .flatMap((s) => {
      if (!s) return []
      if (typeof s === 'string') return [s.trim()]
      if (Array.isArray(s.items)) {
        return s.items
          .map((item) => (typeof item === 'string' ? item.trim() : item?.name?.trim()))
          .filter(Boolean)
      }
      if (s.name) return [String(s.name).trim()]
      if (s.skill) return [String(s.skill).trim()]
      return []
    })
    .filter(Boolean)
}

function extractKeywordsFromJd(jobDescription) {
  if (!jobDescription || typeof jobDescription !== 'string') return []

  const found = new Set()
  KNOWN_TECH_KEYWORDS.forEach((kw) => {
    const escaped = kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
    const re = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i')
    if (re.test(jobDescription)) {
      found.add(kw)
    }
  })

  const words = jobDescription.match(/\b[A-Z][a-zA-Z0-9\.\+#]{2,18}\b/g) || []
  const stopWords = new Set([
    'The', 'This', 'That', 'With', 'From', 'Have', 'Will', 'Your', 'Must', 'Work',
    'Team', 'Years', 'Role', 'Lead', 'Join', 'Help', 'Build', 'Best', 'High', 'Fast',
    'Open', 'Good', 'Plus', 'Strong', 'About', 'Looking', 'Seeking', 'Company', 'Position',
    'Degree', 'Bachelor', 'Master', 'Equal', 'Opportunity', 'Employer', 'Apply', 'Please',
    'Requirements', 'Qualifications', 'Responsibilities', 'Experience', 'Job', 'Title',
  ])

  words.forEach((w) => {
    if (!stopWords.has(w) && w.length >= 3) {
      found.add(w)
    }
  })

  return Array.from(found).slice(0, 24)
}

function calculateAtsScore(resume, options = {}) {
  if (!resume) {
    return {
      score: 0,
      isAtsReady: false,
      grade: 'Incomplete',
      breakdown: {},
    }
  }

  const p = resume.personalInfo || {}
  const summary = String(resume.summary || '').trim()
  const skillsList = extractSkills(resume.skills)
  const experienceList = Array.isArray(resume.experience) ? resume.experience : []
  const projectsList = Array.isArray(resume.projects) ? resume.projects : []
  const educationList = Array.isArray(resume.education) ? resume.education : []

  const targetJd = options.jobDescription?.trim() || ''
  const targetJobTitle = options.jobTitle?.trim() || ''
  const isJobTailored = Boolean(targetJd.length >= 50)

  // Bullet point metrics
  let totalBullets = 0
  let bulletsWithMetrics = 0
  let bulletsWithActionVerbs = 0

  experienceList.forEach((exp) => {
    const raw = Array.isArray(exp.description)
      ? exp.description
      : String(exp.description || '').split('\n')

    const bullets = raw
      .map((b) => (typeof b === 'string' ? b : b?.text || '').trim().replace(/^[•\-*▸\d\.\)]\s*/, '').trim())
      .filter(Boolean)

    totalBullets += bullets.length

    bullets.forEach((bullet) => {
      const hasMetric = /\b\d+(\.\d+)?%?|\$|reduced|increased|improved|scaled|latency|throughput|optimized/i.test(bullet)
      if (hasMetric) bulletsWithMetrics++

      const firstWords = bullet.split(/\s+/).slice(0, 2).join(' ')
      const hasVerb = ACTION_VERBS.some((v) => new RegExp(`^${v}\\b`, 'i').test(firstWords))
      if (hasVerb) bulletsWithActionVerbs++
    })
  })

  const metricRatio = totalBullets > 0 ? (bulletsWithMetrics / totalBullets) : 0
  const verbRatio   = totalBullets > 0 ? (bulletsWithActionVerbs / totalBullets) : 0

  if (isJobTailored) {
    const jdKeywords = extractKeywordsFromJd(targetJd)

    const fullResumeText = [
      ...skillsList,
      summary,
      p.headline || '',
      ...experienceList.map((e) => `${e.title || ''} ${e.company || ''} ${Array.isArray(e.description) ? e.description.join(' ') : e.description || ''}`),
      ...projectsList.map((pj) => `${pj.name || ''} ${pj.techStack || ''} ${pj.description || ''}`),
    ].join(' ').toLowerCase()

    const matchedKeywords = jdKeywords.filter((kw) => {
      const escaped = kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
      const re = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i')
      return re.test(fullResumeText)
    })
    const keywordMatchRate = jdKeywords.length > 0 ? (matchedKeywords.length / jdKeywords.length) : 0.85

    // 1. Keyword Alignment (35 pts)
    const keywordScore = Math.min(35, Math.round(keywordMatchRate * 35))

    // 2. Title Relevance (10 pts)
    let titleScore = 0
    if (p.headline?.trim()) {
      titleScore = 6
      if (targetJobTitle) {
        const titleTokens = targetJobTitle.toLowerCase().split(/\s+/).filter((w) => w.length > 3 && !['senior', 'lead', 'with', 'engineer', 'developer', 'manager'].includes(w))
        const headlineLower = p.headline.toLowerCase()
        const matchedTokens = titleTokens.filter((t) => headlineLower.includes(t))
        if (matchedTokens.length > 0) titleScore += 3
        if (headlineLower.includes('engineer') || headlineLower.includes('developer') || headlineLower.includes('architect')) titleScore += 1
      } else {
        titleScore = 9
      }
    }

    // 3. Experience Impact & Metrics (25 pts)
    let expScore = 0
    if (experienceList.length > 0) {
      expScore += 7
      const metricPts = Math.min(10, Math.round((metricRatio / 0.70) * 10))
      const verbPts   = Math.min(8, Math.round((verbRatio / 0.80) * 8))
      expScore += metricPts + verbPts
    }

    // 4. Skills Depth (15 pts)
    let skillsScore = 0
    if (skillsList.length >= 12) skillsScore = 14
    else if (skillsList.length >= 8) skillsScore = 11
    else if (skillsList.length >= 4) skillsScore = 7
    else if (skillsList.length > 0) skillsScore = 4
    if (matchedKeywords.length >= 6) skillsScore = Math.min(15, skillsScore + 1)

    // 5. Professional Summary (8 pts)
    const summaryWords = summary ? summary.split(/\s+/).filter(Boolean).length : 0
    const usesFirstPerson = /\b(I|me|my|we|our)\b/i.test(summary)
    let summaryScore = 0
    if (summaryWords >= 35 && summaryWords <= 90) summaryScore = 7
    else if (summaryWords >= 20 && summaryWords <= 130) summaryScore = 5
    else if (summaryWords > 0) summaryScore = 3
    if (!usesFirstPerson && summaryWords >= 25) summaryScore += 1
    if (usesFirstPerson) summaryScore = Math.max(1, summaryScore - 3)

    // 6. Base Credentials (7 pts)
    let baseScore = 0
    if (p.name?.trim() && p.email?.trim()) baseScore += 2
    if (p.phone?.trim() && p.location?.trim()) baseScore += 1
    if (educationList.length > 0) baseScore += 2
    if (projectsList.length > 0) baseScore += 2

    const finalScore = Math.min(96, Math.max(0, keywordScore + titleScore + expScore + skillsScore + summaryScore + baseScore))

    return {
      score: finalScore,
      isAtsReady: finalScore >= 90,
      keywordMatchRate: Math.round(keywordMatchRate * 100),
      matchedKeywordsCount: matchedKeywords.length,
      totalKeywordsCount: jdKeywords.length,
      breakdown: {
        keywords: keywordScore,
        title: titleScore,
        experience: expScore,
        skills: skillsScore,
        summary: summaryScore,
        credentials: baseScore,
      },
    }
  }

  // General ATS mode
  let score = 0
  if (p.name?.trim()) score += 5
  if (p.headline?.trim()) score += 5
  if (p.email?.trim() && p.email.includes('@')) score += 4
  if (p.phone?.trim() && p.phone.trim().length >= 7) score += 2
  if (p.location?.trim()) score += 2
  if (p.linkedin?.trim() && p.github?.trim()) score += 2
  else if (p.linkedin?.trim() || p.github?.trim()) score += 1

  const summaryWords = summary ? summary.split(/\s+/).filter(Boolean).length : 0
  const usesFirstPerson = /\b(I|me|my|we|our)\b/i.test(summary)
  if (summaryWords >= 40 && summaryWords <= 90) score += 10
  else if (summaryWords >= 25 && summaryWords <= 130) score += 7
  else if (summaryWords > 0) score += 4
  if (!usesFirstPerson && summaryWords >= 20) score += 5

  if (skillsList.length >= 12) score += 20
  else if (skillsList.length >= 9) score += 16
  else if (skillsList.length >= 6) score += 12
  else if (skillsList.length >= 3) score += 7
  else if (skillsList.length > 0) score += 3

  if (experienceList.length > 0) {
    score += 8
    score += Math.min(9, Math.round((metricRatio / 0.65) * 9))
    score += Math.min(8, Math.round((verbRatio / 0.75) * 8))
  }

  const validProjects = projectsList.filter((pj) => pj.name?.trim())
  const projectsWithStack = validProjects.filter((pj) => pj.techStack?.trim())
  if (validProjects.length >= 2 && projectsWithStack.length >= 2) score += 10
  else if (validProjects.length >= 2) score += 8
  else if (validProjects.length === 1) score += 5

  if (educationList.some((e) => e.school?.trim() && (e.degree?.trim() || e.field?.trim()))) {
    score += 10
  }

  const finalScore = Math.min(97, Math.max(0, score))

  return {
    score: finalScore,
    isAtsReady: finalScore >= 90,
  }
}

module.exports = { calculateAtsScore, extractSkills, extractKeywordsFromJd, ACTION_VERBS }
