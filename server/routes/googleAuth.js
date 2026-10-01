/**
 * googleAuth.js
 *
 * Google OAuth routes:
 *   GET /api/auth/google          → Redirects to Google consent screen
 *   GET /api/auth/google/callback → Google redirects here after consent
 *
 * On success: redirects to CLIENT_URL/auth/google/success?token=<jwt>
 * On failure: redirects to CLIENT_URL/login?error=google_failed
 */

const express    = require('express')
const router     = express.Router()
const passport   = require('../config/passport')
const { generateToken } = require('../utils/jwt')

// Step 1 — Redirect to Google
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
)

// Step 2 — Google redirects back here
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session:      false,
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=google_failed`,
  }),
  (req, res) => {
    // req.user is the User document from our DB (set by passport strategy)
    const token = generateToken(req.user._id)

    // Redirect to a dedicated client-side callback page with the JWT as query param
    // The client page will store the token and redirect to dashboard
    res.redirect(
      `${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/callback?token=${token}`
    )
  }
)

module.exports = router
