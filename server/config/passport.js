/**
 * passport.js
 *
 * Configures Passport with the Google OAuth 2.0 strategy.
 *
 * Flow:
 *   1. User clicks "Continue with Google"
 *   2. Browser redirects to Google consent screen
 *   3. Google redirects back to /api/auth/google/callback with a code
 *   4. Passport exchanges code for profile data
 *   5. We find or create a User document in MongoDB
 *   6. We generate a JWT and redirect to the client with it
 *
 * Why Passport?
 *   Passport handles the OAuth handshake complexity (PKCE, token exchange,
 *   profile normalization). We only write the "what to do with the user" part.
 */

const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const User = require('../models/User')

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase()
        if (!email) {
          return done(new Error('No email returned from Google'), null)
        }

        // Find existing user by email
        let user = await User.findOne({ email })

        if (user) {
          // User already exists (registered with email/password or Google before)
          return done(null, user)
        }

        // Create a new user from Google profile
        // No password — they authenticate via Google
        // We set a placeholder password (bcrypt will hash it but they'll never use it)
        user = await User.create({
          name:     profile.displayName || email.split('@')[0],
          email,
          password: `google_oauth_${profile.id}_${Date.now()}`, // not used — Google auth only
          googleId: profile.id,
        })

        return done(null, user)
      } catch (err) {
        return done(err, null)
      }
    }
  )
)

// Passport needs serialize/deserialize for session — we don't use sessions
// but passport requires these to be defined
passport.serializeUser((user, done) => done(null, user.id))
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id)
    done(null, user)
  } catch (err) {
    done(err, null)
  }
})

module.exports = passport
