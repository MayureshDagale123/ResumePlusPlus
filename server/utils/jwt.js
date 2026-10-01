const jwt = require('jsonwebtoken')

/**
 * Signs a JWT with the given userId as payload.
 * @param {string} userId - MongoDB ObjectId as string
 * @returns {string} signed JWT, expires in 7 days
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

module.exports = { generateToken }
