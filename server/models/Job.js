const mongoose = require('mongoose')

/**
 * Job — stores normalized job data fetched from the external Job API.
 * Jobs are cached here so Saved Jobs can still display info even if
 * the external API is down.
 *
 * This matches the Standard Job JSON used throughout the app:
 * { externalId, source, title, company, location, employmentType,
 *   description, applyUrl, postedAt, salary }
 */
const JobSchema = new mongoose.Schema(
  {
    externalId: {
      type: String,
      required: true,
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
    },
  },
  { timestamps: true }
)

// Compound index: each job from a given source is unique by its external id
JobSchema.index({ externalId: 1, source: 1 }, { unique: true })

module.exports = mongoose.model('Job', JobSchema)
