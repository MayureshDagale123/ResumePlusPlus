const mongoose = require('mongoose')

/**
 * Resume — stores the user's ORIGINAL resume as Standard Resume JSON.
 *
 * Rules:
 *  - Exactly ONE original resume per user (enforced by unique index on `user`).
 *  - This document is NEVER overwritten by the AI optimizer.
 *    Optimized versions are stored in the OptimizedResume collection.
 *
 * Standard Resume JSON schema:
 * {
 *   personalInfo: { name, headline, email, phone, location, linkedin, github },
 *   summary: string,
 *   education: [],
 *   skills: [],
 *   experience: [],
 *   projects: [],
 *   certifications: [],
 *   achievements: []
 * }
 */
const ResumeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // One original resume per user
    },
    personalInfo: {
      name:     { type: String, default: '' },
      headline: { type: String, default: '' },
      email:    { type: String, default: '' },
      phone:    { type: String, default: '' },
      location: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      github:   { type: String, default: '' },
    },
    summary: {
      type: String,
      default: '',
    },
    education: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    skills: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    experience: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    projects: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    certifications: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    achievements: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Resume', ResumeSchema)
