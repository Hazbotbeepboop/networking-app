const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  resetToken: String,
  resetTokenExpiry: Date,
  reminderTime: String,
  reminderTimezone: String,
  reminderEnabled: Boolean,
  googleCalendar: {
    accessToken: String,
    refreshToken: String,
    expiryDate: Number,
    connected: { type: Boolean, default: false },
  },
  calendarEventSuppressions: [String],  // lowercased event titles
  calendarNameSuppressions: [String],   // lowercased person names
  notifiedEventIds: { type: [String], default: [] }, // event IDs already sent a post-meeting nudge
});

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare plaintext password to hash
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);