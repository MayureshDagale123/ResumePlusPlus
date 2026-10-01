const User = require('../models/User')
const { generateToken } = require('../utils/jwt')

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ─────────────────────────────────────────────────────────────────
// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
// ─────────────────────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' })
    }
    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ success: false, message: 'Valid email is required' })
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' })
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() })
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' })
    }

    const user = await User.create({ name: name.trim(), email: email.toLowerCase().trim(), password })

    return res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: { _id: user._id, name: user.name, email: user.email },
    })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Email already registered' })
    }
    console.error('Register error:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────
// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
// ─────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ success: false, message: 'Valid email is required' })
    }
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' })
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password')
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }

    const isMatch = await user.matchPassword(password)
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }

    return res.status(200).json({
      success: true,
      token: generateToken(user._id),
      user: { _id: user._id, name: user.name, email: user.email },
    })
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────
// @desc    Logout user (stateless — client removes token)
// @route   POST /api/auth/logout
// @access  Public
// ─────────────────────────────────────────────────────────────────
const logout = async (req, res) => {
  return res.status(200).json({ success: true, message: 'Logged out' })
}

// ─────────────────────────────────────────────────────────────────
// @desc    Get current authenticated user
// @route   GET /api/auth/me
// @access  Protected
// ─────────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    return res.status(200).json({ success: true, user })
  } catch (err) {
    console.error('GetMe error:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = { register, login, logout, getMe }
