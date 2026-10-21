/**
 * atsScorer.js
 * Comprehensive ATS Scoring Engine for standard resumes & job-tailored optimizations.
 * Evaluates resumes against enterprise ATS criteria (Workday, Greenhouse, Taleo, Lever) out of 100 points.
 *
 * Supports two modes:
 * 1. General ATS Readiness (when no jobDescription is provided, e.g. for Master Resume)
 * 2. Target Job ATS Match (when jobDescription is provided, e.g. for AI-Optimized Resume)
 */

export const ACTION_VERBS = [
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

export const KNOWN_TECH_KEYWORDS = [
  'React', 'Next.js', 'Vue', 'Angular', 'Svelte', 'TypeScript', 'JavaScript', 'Node.js',
  'Express', 'FastAPI', 'Django', 'Flask', 'Python', 'Java', 'Spring Boot', 'Go', 'Golang',
  'Rust', 'C++', 'C#', '.NET', 'PHP', 'Ruby', 'Rails', 'PostgreSQL', 'MongoDB', 'MySQL',
  'Redis', 'Elasticsearch', 'DynamoDB', 'Kafka', 'RabbitMQ', 'GraphQL', 'REST', 'RESTful APIs',
  'Microservices', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'CI/CD', 'Terraform',
  'Linux', 'Git', 'GitHub', 'Tailwind', 'Tailwind CSS', 'Redux', 'System Design', 'TDD',
  'Unit Testing', 'Jest', 'Cypress', 'Playwright', 'Agile', 'Scrum', 'Performance Optimization',
  'Security', 'Authentication', 'OAuth', 'JWT', 'Scalability', 'High Availability',
]

/**
 * Normalizes skills from strings or object structures into a flat string array.
 */
export const extractSkills = (skills) => {
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

/**
 * Extracts distinct technical and domain keywords from a job description.
 */
export function extractKeywordsFromJd(jobDescription) {
  if (!jobDescription || typeof jobDescription !== 'string') return []

  const found = new Set()
  const jdText = jobDescription

  // 1. Match known tech terms
  KNOWN_TECH_KEYWORDS.forEach((kw) => {
    const escaped = kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
    const re = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i')
    if (re.test(jdText)) {
      found.add(kw)
    }
  })

  // 2. Extract capitalized technical words/phrases (e.g. "CloudWatch", "Serverless", "BigQuery")
  const words = jdText.match(/\b[A-Z][a-zA-Z0-9\.\+#]{2,18}\b/g) || []
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

/**
 * Calculates ATS score (0-100) with detailed section breakdown and actionable hints.
 *
 * @param {object} resume - Resume standard JSON
 * @param {object} [options] - Optional parameters: { jobDescription, jobTitle }
 */
export function calculateAtsScore(resume, options = {}) {
  if (!resume) {
    return {
      score: 0,
      isAtsReady: false,
      grade: 'Incomplete',
      breakdown: {
        contact: { score: 0, max: 20, passed: false },
        summary: { score: 0, max: 15, passed: false },
        skills: { score: 0, max: 20, passed: false, count: 0 },
        experience: { score: 0, max: 25, passed: false },
        projects: { score: 0, max: 10, passed: false },
        education: { score: 0, max: 10, passed: false },
      },
      checklist: [],
      suggestions: ['Add contact info and complete your resume sections.'],
    }
  }

  const p = resume.personalInfo || {}
  const summary = String(resume.summary || '').trim()
  const skillsList = extractSkills(resume.skills)
  const experienceList = Array.isArray(resume.experience) ? resume.experience : []
  const projectsList = Array.isArray(resume.projects) ? resume.projects : []
  const educationList = Array.isArray(resume.education) ? resume.education : []

  // Check if job description is provided (AI-optimized resume context)
  const targetJd = options.jobDescription?.trim() || ''
  const targetJobTitle = options.jobTitle?.trim() || ''
  const isJobTailored = Boolean(targetJd.length >= 50)

  // ── Bullet Point Analysis (used in both modes) ────────────────────
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
      // Measurable impact: numbers, %, $, scale, throughput, latency
      const hasMetric = /\b\d+(\.\d+)?%?|\$|reduced|increased|improved|scaled|latency|throughput|optimized/i.test(bullet)
      if (hasMetric) bulletsWithMetrics++

      // Action verbs at start of bullet (within first 2 words)
      const firstWords = bullet.split(/\s+/).slice(0, 2).join(' ')
      const hasVerb = ACTION_VERBS.some((v) => new RegExp(`^${v}\\b`, 'i').test(firstWords))
      if (hasVerb) bulletsWithActionVerbs++
    })
  })

  const metricRatio = totalBullets > 0 ? (bulletsWithMetrics / totalBullets) : 0
  const verbRatio   = totalBullets > 0 ? (bulletsWithActionVerbs / totalBullets) : 0

  // ═════════════════════════════════════════════════════════════════
  // MODE A: JOB-TAILORED ATS SCORE (For AI-Optimized Resumes)
  // ═════════════════════════════════════════════════════════════════
  if (isJobTailored) {
    const jdKeywords = extractKeywordsFromJd(targetJd)

    // Full searchable text of the resume
    const fullResumeText = [
      ...skillsList,
      summary,
      p.headline || '',
      ...experienceList.map((e) => `${e.title || ''} ${e.company || ''} ${Array.isArray(e.description) ? e.description.join(' ') : e.description || ''}`),
      ...projectsList.map((pj) => `${pj.name || ''} ${pj.techStack || ''} ${pj.description || ''}`),
    ].join(' ').toLowerCase()

    // Match keywords against resume
    const matchedKeywords = jdKeywords.filter((kw) => {
      const escaped = kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
      const re = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i')
      return re.test(fullResumeText)
    })
    const missingKeywords = jdKeywords.filter((kw) => !matchedKeywords.includes(kw))
    const keywordMatchRate = jdKeywords.length > 0 ? (matchedKeywords.length / jdKeywords.length) : 0.85

    // 1. Keyword & Competency Alignment (35 pts max)
    // Realistic ATS match is between 70% and 94%, never automatic 100%
    const keywordScore = Math.min(35, Math.round(keywordMatchRate * 35))

    // 2. Target Job Title & Headline Relevance (10 pts max)
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

    // 3. Experience Impact & Google XYZ Metrics (25 pts max)
    let expScore = 0
    if (experienceList.length > 0) {
      expScore += 7 // baseline
      // Metric density (up to 10 pts)
      const metricPts = Math.min(10, Math.round((metricRatio / 0.70) * 10))
      // Action verb ratio (up to 8 pts)
      const verbPts   = Math.min(8, Math.round((verbRatio / 0.80) * 8))
      expScore += metricPts + verbPts
    }

    // 4. Skills Depth & Alignment (15 pts max)
    let skillsScore = 0
    if (skillsList.length >= 12) skillsScore = 14
    else if (skillsList.length >= 8) skillsScore = 11
    else if (skillsList.length >= 4) skillsScore = 7
    else if (skillsList.length > 0) skillsScore = 4
    if (matchedKeywords.length >= 6) skillsScore = Math.min(15, skillsScore + 1)

    // 5. Professional Summary (8 pts max)
    const summaryWords = summary ? summary.split(/\s+/).filter(Boolean).length : 0
    const usesFirstPerson = /\b(I|me|my|we|our)\b/i.test(summary)
    let summaryScore = 0
    if (summaryWords >= 35 && summaryWords <= 90) summaryScore = 7
    else if (summaryWords >= 20 && summaryWords <= 130) summaryScore = 5
    else if (summaryWords > 0) summaryScore = 3
    if (!usesFirstPerson && summaryWords >= 25) summaryScore += 1
    if (usesFirstPerson) summaryScore = Math.max(1, summaryScore - 3)

    // 6. Education, Projects & Contact (7 pts max)
    let baseScore = 0
    if (p.name?.trim() && p.email?.trim()) baseScore += 2
    if (p.phone?.trim() && p.location?.trim()) baseScore += 1
    if (educationList.length > 0) baseScore += 2
    if (projectsList.length > 0) baseScore += 2

    const finalScore = Math.min(96, Math.max(0, keywordScore + titleScore + expScore + skillsScore + summaryScore + baseScore))

    let grade = 'Incomplete'
    if (finalScore >= 90) grade = '90+ ATS Ready'
    else if (finalScore >= 75) grade = 'Strong Match'
    else if (finalScore >= 55) grade = 'Moderate Match'
    else grade = 'Needs Work'

    const checklist = [
      {
        section: 'Keywords',
        label: `Job Keyword Match (${matchedKeywords.length} of ${jdKeywords.length} terms)`,
        score: keywordScore,
        max: 35,
        passed: keywordMatchRate >= 0.75,
        hint: missingKeywords.length > 0
          ? `Missing target keywords: ${missingKeywords.slice(0, 5).join(', ')}`
          : 'High keyword alignment with target job listing.',
      },
      {
        section: 'Headline',
        label: 'Job Title Alignment & Role Positioning',
        score: titleScore,
        max: 10,
        passed: titleScore >= 8,
        hint: p.headline ? `Headline: "${p.headline}"` : 'Add target job headline.',
      },
      {
        section: 'Experience',
        label: `Quantified Metrics & Action Verbs (${bulletsWithMetrics}/${totalBullets || 0} bullets)`,
        score: expScore,
        max: 25,
        passed: metricRatio >= 0.60 && verbRatio >= 0.70,
        hint: `${Math.round(metricRatio * 100)}% bullets have metrics • ${Math.round(verbRatio * 100)}% use strong action verbs.`,
      },
      {
        section: 'Skills',
        label: `Technical Skills Breadth (${skillsList.length} skills)`,
        score: skillsScore,
        max: 15,
        passed: skillsList.length >= 10,
        hint: `${skillsList.length} total skills listed for ATS indexing.`,
      },
      {
        section: 'Summary',
        label: `Professional Summary (${summaryWords} words)`,
        score: summaryScore,
        max: 8,
        passed: summaryWords >= 35 && !usesFirstPerson,
        hint: usesFirstPerson ? 'Remove first-person pronouns ("I", "my").' : 'Concise 3rd-person summary.',
      },
      {
        section: 'Credentials',
        label: 'Education & Contact Verification',
        score: baseScore,
        max: 7,
        passed: baseScore >= 6,
        hint: 'Contact details and educational qualifications complete.',
      },
    ]

    const suggestions = []
    if (missingKeywords.length > 0) {
      suggestions.push(`Consider adding these missing keywords if you have experience with them: ${missingKeywords.slice(0, 4).join(', ')}.`)
    }
    if (metricRatio < 0.65) {
      suggestions.push('Add more quantifiable results (%, numbers, scale) to experience bullet points.')
    }

    return {
      score: finalScore,
      isAtsReady: finalScore >= 90,
      grade,
      matchedKeywords,
      missingKeywords,
      keywordMatchRate: Math.round(keywordMatchRate * 100),
      breakdown: {
        contact: { score: Math.round(titleScore * 1.5 + baseScore), max: 20, passed: titleScore >= 8 },
        summary: { score: Math.round(summaryScore * 1.8), max: 15, passed: summaryScore >= 6 },
        skills: { score: Math.round(keywordScore * 0.4 + skillsScore), max: 20, passed: skillsScore >= 12, count: skillsList.length },
        experience: { score: expScore, max: 25, passed: expScore >= 20 },
        projects: { score: projectsList.length >= 2 ? 10 : projectsList.length === 1 ? 6 : 0, max: 10, passed: projectsList.length >= 1 },
        education: { score: educationList.length > 0 ? 10 : 0, max: 10, passed: educationList.length > 0 },
      },
      checklist,
      suggestions,
    }
  }

  // ═════════════════════════════════════════════════════════════════
  // MODE B: GENERAL ATS READINESS (For Master Baseline Resume)
  // ═════════════════════════════════════════════════════════════════
  let score = 0
  const checklist = []
  const suggestions = []

  // 1. Contact & Headline (20 pts max)
  const hasName = Boolean(p.name?.trim())
  const hasHeadline = Boolean(p.headline?.trim())
  const hasEmail = Boolean(p.email?.trim() && p.email.includes('@') && p.email.includes('.'))
  const hasPhone = Boolean(p.phone?.trim() && p.phone.trim().length >= 7)
  const hasLocation = Boolean(p.location?.trim())
  const hasLinkedIn = Boolean(p.linkedin?.trim())
  const hasGithub = Boolean(p.github?.trim())

  let contactScore = 0
  if (hasName) contactScore += 5
  if (hasHeadline) contactScore += 5
  if (hasEmail) contactScore += 4
  if (hasPhone) contactScore += 2
  if (hasLocation) contactScore += 2
  if (hasLinkedIn && hasGithub) contactScore += 2
  else if (hasLinkedIn || hasGithub) contactScore += 1
  score += contactScore

  const contactPassed = hasName && hasHeadline && hasEmail
  checklist.push({
    tabIndex: 0,
    section: 'Contact Info',
    label: 'Target Job Headline & Contact Information',
    score: contactScore,
    max: 20,
    passed: contactPassed,
    hint: !hasHeadline
      ? 'Add a target professional headline (e.g. Full-Stack Engineer) to match ATS job titles.'
      : !hasEmail
      ? 'Provide a valid email address for recruiter communication.'
      : 'Contact info and professional headline completed.',
  })
  if (!hasHeadline) suggestions.push('Add a target professional headline matching your target role.')

  // 2. Professional Summary (15 pts max)
  const summaryWords = summary ? summary.split(/\s+/).filter(Boolean).length : 0
  const usesFirstPerson = /\b(I|me|my|we|our)\b/i.test(summary)

  let summaryScore = 0
  if (summaryWords >= 40 && summaryWords <= 90) summaryScore += 10
  else if (summaryWords >= 25 && summaryWords <= 130) summaryScore += 7
  else if (summaryWords > 0) summaryScore += 4

  if (summaryWords >= 20 && !usesFirstPerson) summaryScore += 5
  else if (!usesFirstPerson) summaryScore += 2
  score += summaryScore

  const summaryPassed = summaryWords >= 35 && !usesFirstPerson
  checklist.push({
    tabIndex: 1,
    section: 'Summary',
    label: 'Professional Summary Quality (40–90 words)',
    score: summaryScore,
    max: 15,
    passed: summaryPassed,
    hint: usesFirstPerson
      ? 'ATS best practice: Remove 1st-person pronouns ("I", "my") — write in active professional voice.'
      : summaryWords < 35
      ? 'Expand summary to at least 40 impactful words highlighting your technical expertise.'
      : 'Summary is well-crafted for ATS parsing.',
  })
  if (usesFirstPerson) suggestions.push('Rewrite summary in third-person without "I", "me", or "my".')

  // 3. Technical & Core Skills (20 pts max)
  const skillsCount = skillsList.length
  let skillsScore = 0
  if (skillsCount >= 12) skillsScore = 20
  else if (skillsCount >= 9) skillsScore = 16
  else if (skillsCount >= 6) skillsScore = 12
  else if (skillsCount >= 3) skillsScore = 7
  else if (skillsCount > 0) skillsScore = 3
  score += skillsScore

  const skillsPassed = skillsCount >= 10
  checklist.push({
    tabIndex: 2,
    section: 'Skills',
    label: 'Core & Technical Skills (10–18 keywords)',
    score: skillsScore,
    max: 20,
    passed: skillsPassed,
    hint: skillsCount < 10
      ? `Currently ${skillsCount} skills. Add at least ${10 - skillsCount} more skills to boost keyword density.`
      : `${skillsCount} skills added for high ATS keyword coverage.`,
  })
  if (skillsCount < 10) suggestions.push(`Add ${10 - skillsCount} more technical skills to increase keyword coverage.`)

  // 4. Work Experience & Quantifiable Results (25 pts max)
  let expScore = 0
  if (experienceList.length > 0) {
    expScore += 8 // base points for having work experience
    // Metric density: up to 9 pts
    const metricPts = Math.min(9, Math.round((metricRatio / 0.65) * 9))
    // Action verb ratio: up to 8 pts
    const verbPts   = Math.min(8, Math.round((verbRatio / 0.75) * 8))
    expScore += metricPts + verbPts
  }
  score += expScore

  const expPassed = experienceList.length > 0 && metricRatio >= 0.50 && verbRatio >= 0.60
  checklist.push({
    tabIndex: 3,
    section: 'Experience',
    label: 'Experience with Action Verbs & Quantifiable Results',
    score: expScore,
    max: 25,
    passed: expPassed,
    hint: experienceList.length === 0
      ? 'Add your work experience or internships.'
      : metricRatio < 0.50
      ? `Only ${bulletsWithMetrics} of ${totalBullets} bullets have numbers/metrics. Quantify achievements for 90+ score.`
      : 'Experience uses high-impact action verbs and quantified achievements.',
  })
  if (experienceList.length > 0 && metricRatio < 0.50) {
    suggestions.push('Add percentages, latency improvements, or scale metrics to more bullet points.')
  }

  // 5. Key Projects (10 pts max)
  let projScore = 0
  const validProjects = projectsList.filter((pj) => pj.name?.trim())
  const projectsWithStack = validProjects.filter((pj) => pj.techStack?.trim())
  if (validProjects.length >= 2 && projectsWithStack.length >= 2) projScore = 10
  else if (validProjects.length >= 2) projScore = 8
  else if (validProjects.length === 1 && projectsWithStack.length >= 1) projScore = 6
  else if (validProjects.length === 1) projScore = 4
  score += projScore

  checklist.push({
    tabIndex: 4,
    section: 'Projects',
    label: 'Key Projects with Tech Stacks',
    score: projScore,
    max: 10,
    passed: validProjects.length >= 2 && projectsWithStack.length >= 1,
    hint: validProjects.length === 0
      ? 'Add at least 1-2 projects highlighting tech stack keywords.'
      : 'Projects showcase practical application.',
  })
  if (validProjects.length < 2) suggestions.push('Add 1-2 key projects highlighting technologies used.')

  // 6. Education Details (10 pts max)
  const hasEducation = educationList.some((e) => e.school?.trim() && (e.degree?.trim() || e.field?.trim()))
  let eduScore = 0
  if (hasEducation) eduScore = 10
  score += eduScore

  checklist.push({
    tabIndex: 5,
    section: 'Education',
    label: 'Education & Degree Details',
    score: eduScore,
    max: 10,
    passed: hasEducation,
    hint: !hasEducation ? 'Add your degree and university/institution.' : 'Education details complete.',
  })
  if (!hasEducation) suggestions.push('Add your degree and university/college under Education.')

  const finalScore = Math.min(97, Math.max(0, score))

  let grade = 'Incomplete'
  if (finalScore >= 90) grade = '90+ ATS Ready'
  else if (finalScore >= 75) grade = 'Strong Match'
  else if (finalScore >= 50) grade = 'Moderate'
  else grade = 'Needs Work'

  return {
    score: finalScore,
    isAtsReady: finalScore >= 90,
    grade,
    breakdown: {
      contact: { score: contactScore, max: 20, passed: contactPassed },
      summary: { score: summaryScore, max: 15, passed: summaryPassed },
      skills: { score: skillsScore, max: 20, passed: skillsPassed, count: skillsCount },
      experience: { score: expScore, max: 25, passed: expPassed },
      projects: { score: projScore, max: 10, passed: validProjects.length >= 1, count: validProjects.length },
      education: { score: eduScore, max: 10, passed: hasEducation },
    },
    checklist,
    suggestions,
  }
}

/**
 * Returns color classes for ATS score display.
 */
export function getScoreColor(score) {
  if (score >= 90) {
    return {
      text: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      border: 'border-emerald-500/30',
      bar: 'bg-emerald-500',
      badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      label: 'ATS 90+ Ready',
    }
  }
  if (score >= 70) {
    return {
      text: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      border: 'border-amber-500/30',
      bar: 'bg-amber-500',
      badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
      label: 'Good Match',
    }
  }
  return {
    text: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-500/10 dark:bg-rose-500/20',
    border: 'border-rose-500/30',
    bar: 'bg-rose-500',
    badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
    label: 'Needs ATS Improvement',
  }
}
