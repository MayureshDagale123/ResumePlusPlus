/**
 * ResumeTemplate.jsx
 *
 * ATS-friendly resume rendered with @react-pdf/renderer.
 * Same JSON → same output every time (deterministic).
 * Used for both on-screen preview (PDFViewer) and download (PDFDownloadLink).
 */

import React from 'react'
import {
  Document, Page, Text, View, StyleSheet, Link,
} from '@react-pdf/renderer'

// ── Styles ────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily:      'Helvetica',
    fontSize:        10,
    color:           '#1a1a1a',
    backgroundColor: '#ffffff',
    paddingTop:      36,
    paddingBottom:   40,
    paddingLeft:     44,
    paddingRight:    44,
    lineHeight:      1.45,
  },
  name:   { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#111111', marginBottom: 4 },
  contactRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 3 },
  contactItem: { fontSize: 9, color: '#444444', marginRight: 6 },
  contactSep:  { fontSize: 9, color: '#aaaaaa', marginRight: 6 },
  link:        { fontSize: 9, color: '#5b21b6', textDecoration: 'none', marginRight: 6 },
  header:  { marginBottom: 12 },
  section: { marginBottom: 10 },
  sectionTitle: {
    fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#5b21b6',
    textTransform: 'uppercase', letterSpacing: 1.2,
    borderBottomWidth: 0.8, borderBottomColor: '#7c3aed',
    paddingBottom: 2, marginBottom: 6,
  },
  summaryText: { fontSize: 10, color: '#333333', lineHeight: 1.5 },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  skillPill: {
    backgroundColor: '#f3f0ff', color: '#5b21b6', fontSize: 9,
    paddingTop: 2, paddingBottom: 2, paddingLeft: 7, paddingRight: 7,
    borderRadius: 10, marginRight: 5, marginBottom: 4,
  },
  entry:       { marginBottom: 7 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  entryTitle:  { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111111', flex: 1 },
  entryDate:   { fontSize: 9, color: '#666666', marginLeft: 8 },
  entrySub:    { fontSize: 9, color: '#555555', marginTop: 1 },
  entryDesc:   { fontSize: 9.5, color: '#333333', marginTop: 3, lineHeight: 1.5, marginLeft: 8 },
  listItem:    { flexDirection: 'row', marginBottom: 3 },
  listBullet:  { fontSize: 9, color: '#7c3aed', marginRight: 5, marginTop: 0.5 },
  listText:    { fontSize: 9.5, color: '#333333', flex: 1 },
})

// ── Helpers ───────────────────────────────────────────────────────
const safe  = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : null)
const range = (a, b, cur) => {
  const sa = safe(a), sb = cur ? 'Present' : safe(b)
  if (sa && sb) return `${sa} – ${sb}`
  return sa || sb || null
}

// ── Section wrapper ───────────────────────────────────────────────
const Section = ({ title, children }) => (
  <View style={s.section}>
    <Text style={s.sectionTitle}>{title}</Text>
    {children}
  </View>
)

// ── Document ──────────────────────────────────────────────────────
export function ResumeDocument({ resume }) {
  const p = resume?.personalInfo || {}

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.name}>{safe(p.name) || 'Your Name'}</Text>
          <View style={s.contactRow}>
            {safe(p.email)    && <Text style={s.contactItem}>{p.email}</Text>}
            {safe(p.phone)    && <Text style={s.contactItem}>• {p.phone}</Text>}
            {safe(p.location) && <Text style={s.contactItem}>• {p.location}</Text>}
            {safe(p.linkedin) && <Link src={p.linkedin} style={s.link}>• LinkedIn</Link>}
            {safe(p.github)   && <Link src={p.github}   style={s.link}>• GitHub</Link>}
          </View>
        </View>

        {/* Summary */}
        {safe(resume?.summary) && (
          <Section title="Summary">
            <Text style={s.summaryText}>{resume.summary}</Text>
          </Section>
        )}

        {/* Skills */}
        {resume?.skills?.length > 0 && (
          <Section title="Skills">
            <View style={s.skillsRow}>
              {resume.skills.map((skill, i) => (
                <Text key={i} style={s.skillPill}>{skill}</Text>
              ))}
            </View>
          </Section>
        )}

        {/* Experience */}
        {resume?.experience?.length > 0 && (
          <Section title="Experience">
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
                {safe(exp.location)    && <Text style={s.entrySub}>{exp.location}</Text>}
                {safe(exp.description) && <Text style={s.entryDesc}>{exp.description}</Text>}
              </View>
            ))}
          </Section>
        )}

        {/* Education */}
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
                {safe(edu.school) && <Text style={s.entrySub}>{edu.school}</Text>}
                {safe(edu.grade)  && <Text style={s.entrySub}>Grade: {edu.grade}</Text>}
              </View>
            ))}
          </Section>
        )}

        {/* Projects */}
        {resume?.projects?.length > 0 && (
          <Section title="Projects">
            {resume.projects.map((proj, i) => (
              <View key={i} style={s.entry}>
                <View style={s.entryHeader}>
                  <Text style={s.entryTitle}>{safe(proj.name) || 'Project'}</Text>
                  {safe(proj.techStack) && <Text style={s.entryDate}>{proj.techStack}</Text>}
                </View>
                {safe(proj.link) && (
                  <Link src={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`} style={s.link}>
                    {proj.link}
                  </Link>
                )}
                {safe(proj.description) && <Text style={s.entryDesc}>{proj.description}</Text>}
              </View>
            ))}
          </Section>
        )}

        {/* Certifications */}
        {resume?.certifications?.length > 0 && (
          <Section title="Certifications">
            {resume.certifications.map((cert, i) => (
              <View key={i} style={s.listItem}>
                <Text style={s.listBullet}>▸</Text>
                <Text style={s.listText}>
                  {[safe(cert.name), safe(cert.issuer) && `· ${cert.issuer}`, safe(cert.year) && `(${cert.year})`]
                    .filter(Boolean).join(' ')}
                </Text>
              </View>
            ))}
          </Section>
        )}

        {/* Achievements */}
        {resume?.achievements?.length > 0 && (
          <Section title="Achievements">
            {resume.achievements.map((ach, i) => (
              <View key={i} style={s.listItem}>
                <Text style={s.listBullet}>▸</Text>
                <Text style={s.listText}>
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
