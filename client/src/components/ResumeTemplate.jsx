/**
 * ResumeTemplate.jsx
 *
 * Highly ATS-optimized resume rendered with @react-pdf/renderer.
 * Designed to score 90+ across enterprise ATS parsers (Workday, Greenhouse, Taleo, Lever)
 * while providing world-class typography and visual hierarchy for human recruiters.
 */

import React from 'react'
import {
  Document, Page, Text, View, StyleSheet, Link,
} from '@react-pdf/renderer'

// ── Design Tokens & Styles ─────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily:      'Helvetica',
    fontSize:        9.5,
    color:           '#1e293b',
    backgroundColor: '#ffffff',
    paddingTop:      32,
    paddingBottom:   36,
    paddingLeft:     40,
    paddingRight:    40,
    lineHeight:      1.4,
  },
  header: {
    marginBottom:    12,
    borderBottomWidth: 1.2,
    borderBottomColor: '#0f172a',
    paddingBottom:   10,
  },
  name: {
    fontSize:        22,
    fontFamily:      'Helvetica-Bold',
    color:           '#0f172a',
    lineHeight:      1.25,
    marginBottom:    6,
    paddingBottom:   1,
    letterSpacing:   -0.2,
  },
  headline: {
    fontSize:        11,
    fontFamily:      'Helvetica-Bold',
    color:           '#4338ca',
    lineHeight:      1.3,
    marginBottom:    6,
    marginTop:       1,
    letterSpacing:   0.2,
  },
  contactRow: {
    flexDirection:   'row',
    flexWrap:        'wrap',
    alignItems:      'center',
    marginTop:       2,
  },
  contactItem: {
    fontSize:        8.5,
    color:           '#475569',
    lineHeight:      1.3,
    marginRight:     5,
  },
  contactSep: {
    fontSize:        8.5,
    color:           '#94a3b8',
    lineHeight:      1.3,
    marginRight:     5,
  },
  link: {
    fontSize:        8.5,
    color:           '#4338ca',
    textDecoration:  'none',
    lineHeight:      1.3,
    marginRight:     5,
  },
  section: {
    marginBottom:    9,
  },
  sectionTitle: {
    fontSize:        9.5,
    fontFamily:      'Helvetica-Bold',
    color:           '#0f172a',
    textTransform:   'uppercase',
    letterSpacing:   1.0,
    borderBottomWidth: 0.75,
    borderBottomColor: '#cbd5e1',
    paddingBottom:   2,
    marginBottom:    5,
  },
  summaryText: {
    fontSize:        9,
    color:           '#334155',
    lineHeight:      1.45,
    textAlign:       'justify',
  },
  skillsRow: {
    flexDirection:   'row',
    flexWrap:        'wrap',
  },
  skillPill: {
    backgroundColor: '#f1f5f9',
    color:           '#0f172a',
    fontSize:        8.5,
    fontFamily:      'Helvetica-Bold',
    paddingTop:      2,
    paddingBottom:   2,
    paddingLeft:     6,
    paddingRight:     6,
    borderRadius:    3,
    marginRight:     4,
    marginBottom:    3.5,
    borderWidth:     0.5,
    borderColor:     '#e2e8f0',
  },
  entry: {
    marginBottom:    7,
  },
  entryHeader: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'flex-start',
  },
  entryTitle: {
    fontSize:        9.5,
    fontFamily:      'Helvetica-Bold',
    color:           '#0f172a',
    flex:            1,
  },
  entryDate: {
    fontSize:        8.5,
    fontFamily:      'Helvetica-Bold',
    color:           '#475569',
    marginLeft:      8,
  },
  entrySub: {
    fontSize:        8.5,
    color:           '#64748b',
    marginTop:       1,
  },
  bulletList: {
    marginTop:       2.5,
  },
  bulletItem: {
    flexDirection:   'row',
    marginBottom:    2,
    paddingLeft:     2,
  },
  bulletGlyph: {
    fontSize:        8.5,
    color:           '#4338ca',
    marginRight:     5,
    width:           6,
  },
  bulletText: {
    fontSize:        9,
    color:           '#334155',
    flex:            1,
    lineHeight:      1.35,
  },
})

// ── Helpers ────────────────────────────────────────────────────────
const safe = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : null)

const range = (a, b, cur) => {
  const sa = safe(a), sb = cur ? 'Present' : safe(b)
  if (sa && sb) return `${sa} – ${sb}`
  return sa || sb || null
}

/**
 * Normalizes any skill item to a display string
 */
const normalizeSkill = (s) => {
  if (!s) return null
  if (typeof s === 'string') return s.trim()
  if (s.name) return String(s.name).trim()
  if (s.skill) return String(s.skill).trim()
  if (Array.isArray(s.items)) return s.items.join(', ')
  return null
}

/**
 * Splits multiline or array descriptions into structured ATS bullet items.
 */
const renderBulletPoints = (text) => {
  if (!text) return null
  const rawLines = Array.isArray(text) ? text : String(text).split('\n')

  const lines = rawLines
    .map((l) => (typeof l === 'string' ? l : l?.text || ''))
    .map((l) => l.trim().replace(/^[•\-*▸\d\.\)]\s*/, '').trim())
    .filter(Boolean)

  if (lines.length === 0) return null

  return (
    <View style={s.bulletList}>
      {lines.map((line, idx) => (
        <View key={idx} style={s.bulletItem}>
          <Text style={s.bulletGlyph}>•</Text>
          <Text style={s.bulletText}>{line}</Text>
        </View>
      ))}
    </View>
  )
}

// ── Section Wrapper ────────────────────────────────────────────────
const Section = ({ title, children }) => (
  <View style={s.section}>
    <Text style={s.sectionTitle}>{title}</Text>
    {children}
  </View>
)

// ── Document Component ─────────────────────────────────────────────
export function ResumeDocument({ resume }) {
  const p = resume?.personalInfo || {}

  // Safe normalized skills array
  const rawSkills = Array.isArray(resume?.skills) ? resume.skills : []
  const skills = rawSkills.map(normalizeSkill).filter(Boolean)

  // Safe contact items list
  const contactItems = []
  if (safe(p.email))    contactItems.push({ type: 'text', text: p.email })
  if (safe(p.phone))    contactItems.push({ type: 'text', text: p.phone })
  if (safe(p.location)) contactItems.push({ type: 'text', text: p.location })
  if (safe(p.linkedin)) contactItems.push({ type: 'link', text: 'LinkedIn', url: p.linkedin })
  if (safe(p.github))   contactItems.push({ type: 'link', text: 'Portfolio / GitHub', url: p.github })

  return (
    <Document title={`${safe(p.name) || 'Resume'} - ATS Formatted`} author={safe(p.name) || 'Resume++'}>
      <Page size="A4" style={s.page}>

        {/* ── Header ──────────────────────────────────────────── */}
        <View style={s.header}>
          <Text style={s.name}>{safe(p.name) || 'Candidate Name'}</Text>
          {safe(p.headline) && (
            <Text style={s.headline}>{p.headline}</Text>
          )}

          {contactItems.length > 0 && (
            <View style={s.contactRow}>
              {contactItems.map((item, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <Text style={s.contactSep}>•</Text>}
                  {item.type === 'link' ? (
                    <Link
                      src={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                      style={s.link}
                    >
                      {item.text}
                    </Link>
                  ) : (
                    <Text style={s.contactItem}>{item.text}</Text>
                  )}
                </React.Fragment>
              ))}
            </View>
          )}
        </View>

        {/* ── Professional Summary ────────────────────────────── */}
        {safe(resume?.summary) && (
          <Section title="Professional Summary">
            <Text style={s.summaryText}>{resume.summary}</Text>
          </Section>
        )}

        {/* ── Technical Skills ───────────────────────────────── */}
        {skills.length > 0 && (
          <Section title="Technical & Core Competencies">
            <View style={s.skillsRow}>
              {skills.map((skill, i) => (
                <Text key={i} style={s.skillPill}>{skill}</Text>
              ))}
            </View>
          </Section>
        )}

        {/* ── Work Experience ─────────────────────────────────── */}
        {resume?.experience?.length > 0 && (
          <Section title="Professional Experience">
            {resume.experience.map((exp, i) => (
              <View key={i} style={s.entry}>
                <View style={s.entryHeader}>
                  <Text style={s.entryTitle}>
                    {[safe(exp.title), safe(exp.company)].filter(Boolean).join(' · ')}
                  </Text>
                  {range(exp.startDate, exp.endDate, exp.current) && (
                    <Text style={s.entryDate}>{range(exp.startDate, exp.endDate, exp.current)}</Text>
                  )}
                </View>
                {safe(exp.location) && <Text style={s.entrySub}>{exp.location}</Text>}
                {renderBulletPoints(exp.description)}
              </View>
            ))}
          </Section>
        )}

        {/* ── Key Projects ─────────────────────────────────────── */}
        {resume?.projects?.length > 0 && (
          <Section title="Key Projects">
            {resume.projects.map((proj, i) => (
              <View key={i} style={s.entry}>
                <View style={s.entryHeader}>
                  <Text style={s.entryTitle}>{safe(proj.name) || 'Project'}</Text>
                  {safe(proj.techStack) && (
                    <Text style={s.entryDate}>{proj.techStack}</Text>
                  )}
                </View>
                {safe(proj.link) && (
                  <Link
                    src={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`}
                    style={s.link}
                  >
                    {proj.link}
                  </Link>
                )}
                {renderBulletPoints(proj.description)}
              </View>
            ))}
          </Section>
        )}

        {/* ── Education ────────────────────────────────────────── */}
        {resume?.education?.length > 0 && (
          <Section title="Education">
            {resume.education.map((edu, i) => (
              <View key={i} style={s.entry}>
                <View style={s.entryHeader}>
                  <Text style={s.entryTitle}>
                    {[safe(edu.degree), safe(edu.field)].filter(Boolean).join(' in ') || safe(edu.school) || 'Degree'}
                  </Text>
                  {range(edu.startYear, edu.endYear) && (
                    <Text style={s.entryDate}>{range(edu.startYear, edu.endYear)}</Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  {safe(edu.school) && <Text style={s.entrySub}>{edu.school}</Text>}
                  {safe(edu.grade) && <Text style={s.entrySub}>GPA / Grade: {edu.grade}</Text>}
                </View>
              </View>
            ))}
          </Section>
        )}

        {/* ── Certifications ───────────────────────────────────── */}
        {resume?.certifications?.length > 0 && (
          <Section title="Certifications & Credentials">
            {resume.certifications.map((cert, i) => (
              <View key={i} style={s.bulletItem}>
                <Text style={s.bulletGlyph}>•</Text>
                <Text style={s.bulletText}>
                  {[safe(cert.name), safe(cert.issuer) && `— ${cert.issuer}`, safe(cert.year) && `(${cert.year})`]
                    .filter(Boolean).join(' ')}
                </Text>
              </View>
            ))}
          </Section>
        )}

        {/* ── Honors & Achievements ────────────────────────────── */}
        {resume?.achievements?.length > 0 && (
          <Section title="Honors & Achievements">
            {resume.achievements.map((ach, i) => (
              <View key={i} style={s.bulletItem}>
                <Text style={s.bulletGlyph}>•</Text>
                <Text style={s.bulletText}>
                  {[safe(ach.title), safe(ach.description) && `— ${ach.description}`].filter(Boolean).join(' ')}
                </Text>
              </View>
            ))}
          </Section>
        )}

      </Page>
    </Document>
  )
}
export default ResumeDocument
