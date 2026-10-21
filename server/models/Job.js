const mongoose = require('mongoose')

/**
 * Job — stores normalized job data scraped via JobSpy (multi-platform:
 * LinkedIn, Indeed, Glassdoor, ZipRecruiter, Google, etc.).
 * Jobs are cached here so Saved Jobs and detail views can still display info.
 *
 * Standard Job JSON used throughout the app:
 * { externalId, source, title, company, location, employmentType,
 *   description, applyUrl, postedAt, salary, skills, jobLevel }
 */
const JobSchema = new mongoose.Schema(
  {
    externalId: {
      type: String,
      required: true,
      index: true,
    },
    source: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      name: { type: String, default: '' },
      logo: { type: String, default: '' },
    },
    location: {
      city:    { type: String, default: '' },
      state:   { type: String, default: '' },
      country: { type: String, default: '' },
      remote:  { type: Boolean, default: false },
      raw:     { type: String, default: '' },
    },
    employmentType: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    applyUrl: {
      type: String,
      default: '',
    },
    postedAt: {
      type: String,
      default: '',
    },
    salary: {
      min:      { type: Number, default: null },
      max:      { type: Number, default: null },
      currency: { type: String, default: '' },
      interval: { type: String, default: '' },
    },
    skills: {
      type: [String],
      default: [],
    },
    jobLevel: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
)

// Index for fast lookup by externalId
JobSchema.index({ externalId: 1, source: 1 }, { unique: true })

module.exports = mongoose.model('Job', JobSchema)
