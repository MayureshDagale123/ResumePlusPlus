const jwt = require('jsonwebtoken')

/**
 * Protect middleware: verifies Bearer JWT from Authorization header.
 * On success: sets req.user = { id: decoded.id } and calls next().
 * On failure: responds 401 with { success: false, message: '...' }.
 */
const protect = async (req, res, next) => {
  let token

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1]
  }

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: 'Not authorized, no token' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = { id: decoded.id }
    next()
  } catch {
    return res
      .status(401)
      .json({ success: false, message: 'Not authorized, token failed' })
  }
}

module.exports = { protect }
