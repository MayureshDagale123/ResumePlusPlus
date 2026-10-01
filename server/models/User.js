const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    select: false,
    // Not required at schema level — Google OAuth users have no password
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Google OAuth — optional, only set for Google-authenticated users
  googleId: {
    type: String,
    default: null,
  },
})

// Pre-save hook: hash password only when it is modified
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

// Instance method: compare entered plaintext password to stored hash
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password)
}

module.exports = mongoose.model('User', UserSchema)
