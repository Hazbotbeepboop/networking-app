const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');
const rateLimit = require('express-rate-limit');

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Too many password reset requests. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
})
const User = require('../models/User');
const Person = require('../models/Person');
const Me = require('../models/Me');
const Action = require('../models/Action');
const Conversation = require('../models/Conversation');
const Suppression = require('../models/Suppression');
const auth = require('../middleware/auth');
const { scheduleReminder, cancelReminder } = require('../services/agenda')
const { track } = require('../services/analytics')
const { getAuthUrl, storeTokens } = require('../services/googleCalendar')

function signToken(user) {
  return jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    const user = await User.create({ email, password });
    const token = signToken(user);
    track(user._id, 'registered')
    res.status(201).json({ token, email: user.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user);
    track(user._id, 'login')
    res.json({ token, email: user.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /auth/account
router.delete('/account', auth, async (req, res) => {
  try {
    const userId = req.user.userId
    await Promise.all([
      Person.deleteMany({ userId }),
      Me.deleteMany({ userId }),
      Action.deleteMany({ userId }),
      Conversation.deleteMany({ userId }),
      Suppression.deleteMany({ userId }),
    ])
    await User.deleteOne({ _id: userId })
    await cancelReminder(userId)
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /auth/reminder
router.get('/reminder', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('reminderTime reminderTimezone reminderEnabled')
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({
      time: user.reminderTime || null,
      timezone: user.reminderTimezone || 'Australia/Brisbane',
      enabled: !!user.reminderEnabled,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT /auth/reminder
router.put('/reminder', auth, async (req, res) => {
  try {
    const { time, timezone, enabled } = req.body
    const user = await User.findById(req.user.userId)
    if (!user) return res.status(404).json({ error: 'User not found' })

    user.reminderTime = time || null
    user.reminderTimezone = timezone || 'Australia/Brisbane'
    user.reminderEnabled = enabled !== false
    await user.save()

    if (user.reminderEnabled && user.reminderTime) {
      await scheduleReminder(user)
      track(user._id, 'reminder_set', { time: user.reminderTime, timezone: user.reminderTimezone })
    } else {
      await cancelReminder(user._id)
    }

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /auth/forgot-password
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email is required' })

    const user = await User.findOne({ email: email.toLowerCase().trim() })
    // Always respond OK to prevent email enumeration
    if (!user) return res.json({ ok: true })

    const plainToken = crypto.randomBytes(32).toString('hex')
    const hashed = crypto.createHash('sha256').update(plainToken).digest('hex')

    user.resetToken = hashed
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    await user.save()

    const appUrl = process.env.APP_URL || 'http://localhost:3000'
    const resetUrl = `${appUrl}/reset-password?token=${plainToken}`

    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    await sgMail.send({
      to: user.email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'Reset your Varys password',
      text: `Hi,\n\nClick the link below to reset your Varys password. This link expires in 1 hour.\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
      html: `<p>Click the link below to reset your Varys password. This link expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can safely ignore this email.</p>`,
    })

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required' })
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })

    const hashed = crypto.createHash('sha256').update(token).digest('hex')
    const user = await User.findOne({
      resetToken: hashed,
      resetTokenExpiry: { $gt: new Date() },
    })

    if (!user) return res.status(400).json({ error: 'Reset link is invalid or has expired' })

    user.password = password // hashed by pre-save hook
    user.resetToken = undefined
    user.resetTokenExpiry = undefined
    await user.save()

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /auth/google/calendar/start — generate OAuth URL (requires auth)
router.get('/google/calendar/start', auth, async (req, res) => {
  try {
    const stateToken = jwt.sign({ userId: req.user.userId }, process.env.JWT_SECRET, { expiresIn: '10m' })
    const url = getAuthUrl(stateToken)
    res.json({ url })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /auth/google/calendar/callback — Google redirects here after auth
router.get('/google/calendar/callback', async (req, res) => {
  const appUrl = process.env.APP_URL || 'http://localhost:3000'
  try {
    const { code, state, error } = req.query
    if (error || !code || !state) return res.redirect(`${appUrl}/me?calendar=error`)

    const { userId } = jwt.verify(state, process.env.JWT_SECRET)
    const { google } = require('googleapis')
    const callbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/auth/google/calendar/callback'
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl
    )
    const { tokens } = await oauth2Client.getToken(code)
    await storeTokens(userId, tokens)
    track(userId, 'calendar_connected')
    res.redirect(`${appUrl}/me?calendar=connected`)
  } catch (err) {
    console.error(err)
    const appUrl = process.env.APP_URL || 'http://localhost:3000'
    res.redirect(`${appUrl}/me?calendar=error`)
  }
})

// GET /auth/google/calendar/status
router.get('/google/calendar/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('googleCalendar')
    res.json({ connected: !!user?.googleCalendar?.connected })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /auth/google/calendar — disconnect
router.delete('/google/calendar', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.userId, {
      'googleCalendar.accessToken': null,
      'googleCalendar.refreshToken': null,
      'googleCalendar.expiryDate': null,
      'googleCalendar.connected': false,
    })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router;