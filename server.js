const express = require('express')
const mongoose = require('mongoose')
const dotenv = require('dotenv')

dotenv.config()

const app = express()
app.use(express.json())

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log('Connection error:', err))

// ── Public routes (no token required) ──────────────────────────────────────
const authRoutes = require('./routes/auth')
app.use('/auth', authRoutes)

// ── Auth middleware — everything below requires a valid JWT ─────────────────
const requireAuth = require('./middleware/auth')
app.use(requireAuth)

// ── Protected routes ────────────────────────────────────────────────────────
const peopleRoutes = require('./routes/people')
app.use('/people', peopleRoutes)

const entryRoutes = require('./routes/entries')
app.use('/entries', entryRoutes)

app.get('/', (req, res) => {
  res.send('Server is running')
})

const meRoutes = require('./routes/me')
app.use('/me', meRoutes)

const insightRoutes = require('./routes/insights')
app.use('/insights', insightRoutes)

const suppressionRoutes = require('./routes/suppressions')
app.use('/suppressions', suppressionRoutes)

const actionRoutes = require('./routes/actions')
app.use('/actions', actionRoutes)

const conversationRoutes = require('./routes/conversations')
app.use('/conversations', conversationRoutes)

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