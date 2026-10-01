const mongoose = require('mongoose')

/**
 * SavedJob — a per-user saved job record.
 *
 * Embedding strategy: full job data is embedded directly in the document
 * (denormalized) so the Saved Jobs page can render all cards even if the
 * external Job API is unavailable.
 *
 * Trade-off: slight data duplication vs guaranteed availability.
 * This is the correct choice for saved jobs because users expect their
 * saved list to always be accessible.
 */
const SavedJobSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // The MongoDB _id of the cached Job document (optional reference)
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
    },
    // Embedded snapshot of the job at save time
    jobData: {
      externalId:     { type: String, required: true },
      source:         { type: String, default: '' },
      title:          { type: String, default: '' },
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
      employmentType: { type: String, default: '' },
      description:    { type: String, default: '' },
      applyUrl:       { type: String, default: '' },
      postedAt:       { type: String, default: '' },
      salary: {
        min:      { type: Number, default: null },
        max:      { type: Number, default: null },
        currency: { type: String, default: '' },
      },
    },
  },
  { timestamps: true }
)

// A user can only save a given external job once
SavedJobSchema.index({ user: 1, 'jobData.externalId': 1 }, { unique: true })

module.exports = mongoose.model('SavedJob', SavedJobSchema)
