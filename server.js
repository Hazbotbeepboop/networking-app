const express = require('express')
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const path = require('path')
const rateLimit = require('express-rate-limit')

dotenv.config()

const app = express()
app.use(express.json())

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected')
    const { agenda } = require('./services/agenda')
    await agenda.start()
    await agenda.every('5 minutes', 'check post-meeting reminders', {}, { skipImmediate: true })
    console.log('[agenda] Job scheduler started')
  })
  .catch((err) => console.log('Connection error:', err))

// ── Rate limiting ──────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts, please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// ── Public routes (no token required) ──────────────────────────────────────
const authRoutes = require('./routes/auth')
app.use('/auth', authLimiter, authRoutes)

// ── Production: serve static files (JS/CSS/images) ─────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')))
}

// ── Auth middleware — applied only to API route prefixes ───────────────────
const requireAuth = require('./middleware/auth')
app.use('/api', requireAuth)

// ── Protected routes ────────────────────────────────────────────────────────
const peopleRoutes = require('./routes/people')
app.use('/api/people', peopleRoutes)

const entryRoutes = require('./routes/entries')
app.use('/api/entries', entryRoutes)

const meRoutes = require('./routes/me')
app.use('/api/me', meRoutes)

const insightRoutes = require('./routes/insights')
app.use('/api/insights', insightRoutes)

const suppressionRoutes = require('./routes/suppressions')
app.use('/api/suppressions', suppressionRoutes)

const actionRoutes = require('./routes/actions')
app.use('/api/actions', actionRoutes)

const conversationRoutes = require('./routes/conversations')
app.use('/api/conversations', conversationRoutes)

const adminRoutes = require('./routes/admin')
app.use('/api/admin', adminRoutes)

// ── Production: catch-all for React Router (after all API routes) ───────────
if (process.env.NODE_ENV === 'production') {
  app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'))
  })
}

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))

// ── Weekly digest scheduler ─────────────────────────────────────────────────
const cron = require('node-cron')
const { runDigest } = require('./services/digest')

// Every Monday at 8:00am AEST (Queensland, no DST)
cron.schedule('0 8 * * 1', async () => {
  console.log('[cron] Running weekly digest...')
  try {
    await runDigest()
  } catch (err) {
    console.error('[cron] Digest failed:', err)
  }
}, { timezone: 'Australia/Brisbane' })

console.log('[cron] Weekly digest scheduled — Mondays 8am AEST')