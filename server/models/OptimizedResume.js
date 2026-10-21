const mongoose = require('mongoose')

/**
 * OptimizedResume — stores each AI-optimized version of a user's resume.
 *
 * Rules:
 *  - Multiple optimized versions per user (one per optimization request).
 *  - Each version is linked to the original Resume and optionally to a SavedJob.
 *  - The original Resume is NEVER modified — this is always a separate document.
 *  - The `resumeData` field stores the full Standard Resume JSON after optimization.
 *  - `jobTitle` is a human-readable label for display in "My Resume" list.
 *
 * Example display label: "Optimized for Senior Software Engineer at Google"
 */
const OptimizedResumeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Reference to the source original resume
    originalResume: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      required: true,
    },
    // Optional: the saved job this was optimized for
    savedJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SavedJob',
      default: null,
    },
    // Human-readable label for the optimization target
    jobTitle: {
      type: String,
      default: 'Optimized Resume',
      trim: true,
    },
    // The full optimized resume as Standard Resume JSON
    resumeData: {
      personalInfo: {
        name:     { type: String, default: '' },
        headline: { type: String, default: '' },
        email:    { type: String, default: '' },
        phone:    { type: String, default: '' },
        location: { type: String, default: '' },
        linkedin: { type: String, default: '' },
        github:   { type: String, default: '' },
      },
      summary:        { type: String, default: '' },
      education:      { type: [mongoose.Schema.Types.Mixed], default: [] },
      skills:         { type: [mongoose.Schema.Types.Mixed], default: [] },
      experience:     { type: [mongoose.Schema.Types.Mixed], default: [] },
      projects:       { type: [mongoose.Schema.Types.Mixed], default: [] },
      certifications: { type: [mongoose.Schema.Types.Mixed], default: [] },
      achievements:   { type: [mongoose.Schema.Types.Mixed], default: [] },
    },
    // The job description text used for this optimization
    jobDescription: {
      type: String,
      default: '',
    },
    // The calculated real ATS score (0-100)
    atsScore: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
)

// Index for efficient per-user lookup, sorted by newest first
OptimizedResumeSchema.index({ user: 1, createdAt: -1 })

module.exports = mongoose.model('OptimizedResume', OptimizedResumeSchema)
