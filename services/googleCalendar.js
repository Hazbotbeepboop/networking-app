const { google } = require('googleapis')
const User = require('../models/User')

function createOAuthClient() {
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/auth/google/calendar/callback'
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl
  )
}

function getAuthUrl(stateToken) {
  const oauth2Client = createOAuthClient()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.readonly'],
    state: stateToken,
  })
}

async function storeTokens(userId, tokens) {
  await User.findByIdAndUpdate(userId, {
    'googleCalendar.accessToken': tokens.access_token,
    'googleCalendar.refreshToken': tokens.refresh_token,
    'googleCalendar.expiryDate': tokens.expiry_date,
    'googleCalendar.connected': true,
  })
}

async function getRecentEvents(userId) {
  try {
    const user = await User.findById(userId).select('googleCalendar')
    if (!user?.googleCalendar?.connected || !user.googleCalendar.accessToken) return []

    const oauth2Client = createOAuthClient()
    oauth2Client.setCredentials({
      access_token: user.googleCalendar.accessToken,
      refresh_token: user.googleCalendar.refreshToken,
      expiry_date: user.googleCalendar.expiryDate,
    })

    // Persist refreshed tokens automatically
    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.access_token) {
        await User.findByIdAndUpdate(userId, {
          'googleCalendar.accessToken': tokens.access_token,
          ...(tokens.expiry_date && { 'googleCalendar.expiryDate': tokens.expiry_date }),
        })
      }
    })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const threeDaysAhead = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: sevenDaysAgo.toISOString(),
      timeMax: threeDaysAhead.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 20,
    })

    return (response.data.items || [])
      .filter(e => e.status !== 'cancelled')
      .map(e => {
        const start = e.start?.dateTime || e.start?.date
        const date = new Date(start)
        const attendeeNames = (e.attendees || [])
          .filter(a => !a.self)
          .map(a => a.displayName || a.email.split('@')[0])
          .slice(0, 5)
        return {
          title: e.summary || 'Untitled',
          date: date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }),
          time: e.start?.dateTime ? date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) : 'All day',
          isPast: date < new Date(),
          attendees: attendeeNames,
        }
      })
  } catch (err) {
    console.error('[googleCalendar] Failed to fetch events:', err.message)
    return []
  }
}

function formatEventsForPrompt(events) {
  if (!events.length) return 'None.'
  const lines = []
  const past = events.filter(e => e.isPast)
  const upcoming = events.filter(e => !e.isPast)
  if (past.length) {
    lines.push('Recent meetings:')
    past.forEach(e => {
      const who = e.attendees.length ? ` with ${e.attendees.join(', ')}` : ''
      lines.push(`  - ${e.title}${who} (${e.date} ${e.time})`)
    })
  }
  if (upcoming.length) {
    lines.push('Upcoming meetings:')
    upcoming.forEach(e => {
      const who = e.attendees.length ? ` with ${e.attendees.join(', ')}` : ''
      lines.push(`  - ${e.title}${who} (${e.date} ${e.time})`)
    })
  }
  return lines.join('\n')
}

module.exports = { getAuthUrl, storeTokens, getRecentEvents, formatEventsForPrompt, getCalendarSuggestions, matchesExistingContact, getRecentlyEndedMeetings }

// ── Helpers ───────────────────────────────────────────────────────────────────

function deriveName(attendee) {
  if (attendee.displayName) return attendee.displayName.trim()
  const prefix = attendee.email ? attendee.email.split('@')[0] : ''
  if (!prefix) return null
  const parts = prefix.split(/[._-]/).filter(Boolean)
  if (parts.some(p => p.length < 2)) return null // skip initials / ambiguous
  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ')
}

function matchesExistingContact(name, contacts) {
  const parts = name.trim().split(/\s+/)
  const firstName = parts[0].toLowerCase()
  const lastName = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : null
  if (!lastName) {
    // First name only: skip if any contact shares that first name
    return contacts.some(c => c.name.trim().split(/\s+/)[0].toLowerCase() === firstName)
  } else {
    // Full name: skip only if exact first + last match
    return contacts.some(c => {
      const cp = c.name.trim().split(/\s+/)
      return cp[0].toLowerCase() === firstName &&
        cp.length > 1 && cp[cp.length - 1].toLowerCase() === lastName
    })
  }
}

async function getCalendarSuggestions(userId, contacts) {
  try {
    const user = await User.findById(userId).select('googleCalendar calendarEventSuppressions calendarNameSuppressions')
    if (!user?.googleCalendar?.connected || !user.googleCalendar.accessToken) return { suggestions: [], rawEvents: [], seenNames: new Set(), eventSuppressions: [], nameSuppressions: [] }

    const eventSuppressions = (user.calendarEventSuppressions || []).map(s => s.toLowerCase())
    const nameSuppressions = (user.calendarNameSuppressions || []).map(s => s.toLowerCase())

    const oauth2Client = createOAuthClient()
    oauth2Client.setCredentials({
      access_token: user.googleCalendar.accessToken,
      refresh_token: user.googleCalendar.refreshToken,
      expiry_date: user.googleCalendar.expiryDate,
    })
    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.access_token) {
        await User.findByIdAndUpdate(userId, {
          'googleCalendar.accessToken': tokens.access_token,
          ...(tokens.expiry_date && { 'googleCalendar.expiryDate': tokens.expiry_date }),
        })
      }
    })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const threeDaysAhead = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: sevenDaysAgo.toISOString(),
      timeMax: threeDaysAhead.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 30,
    })

    const suggestions = []
    const seenNames = new Set()
    const rawEvents = []
    for (const event of (response.data.items || [])) {
      if (event.status === 'cancelled') continue
      const start = event.start?.dateTime || event.start?.date
      const date = new Date(start)
      const formattedDate = date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
      const isPast = date < new Date()
      if (eventSuppressions.includes((event.summary || '').toLowerCase())) continue
      rawEvents.push({ title: event.summary || '', date: formattedDate, isPast })
      for (const attendee of (event.attendees || []).filter(a => !a.self)) {
        const name = deriveName(attendee)
        if (!name || seenNames.has(name.toLowerCase())) continue
        if (matchesExistingContact(name, contacts)) continue
        if (nameSuppressions.includes(name.toLowerCase())) continue
        seenNames.add(name.toLowerCase())
        suggestions.push({
          name,
          email: attendee.email || null,
          eventTitle: event.summary || 'Meeting',
          date: formattedDate,
          isPast,
        })
      }
    }
    return { suggestions, rawEvents, seenNames, eventSuppressions, nameSuppressions }
  } catch (err) {
    console.error('[googleCalendar] getCalendarSuggestions failed:', err.message)
    return { suggestions: [], rawEvents: [], seenNames: new Set(), eventSuppressions: [], nameSuppressions: [] }
  }
}

async function getRecentlyEndedMeetings(userId) {
  try {
    const user = await User.findById(userId).select('googleCalendar notifiedEventIds')
    if (!user?.googleCalendar?.connected || !user.googleCalendar.accessToken) return []

    const oauth2Client = createOAuthClient()
    oauth2Client.setCredentials({
      access_token: user.googleCalendar.accessToken,
      refresh_token: user.googleCalendar.refreshToken,
      expiry_date: user.googleCalendar.expiryDate,
    })
    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.access_token) {
        await User.findByIdAndUpdate(userId, {
          'googleCalendar.accessToken': tokens.access_token,
          ...(tokens.expiry_date && { 'googleCalendar.expiryDate': tokens.expiry_date }),
        })
      }
    })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    const now = new Date()
    const windowStart = new Date(now - 20 * 60 * 1000)

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: windowStart.toISOString(),
      timeMax: now.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 10,
    })

    const alreadyNotified = new Set(user.notifiedEventIds || [])
    const twoMinAgo = new Date(now - 2 * 60 * 1000)
    const fifteenMinAgo = new Date(now - 15 * 60 * 1000)

    return (response.data.items || [])
      .filter(e => {
        if (e.status === 'cancelled') return false
        if (!e.end?.dateTime) return false // skip all-day events
        const endTime = new Date(e.end.dateTime)
        if (endTime > twoMinAgo || endTime < fifteenMinAgo) return false
        if (alreadyNotified.has(e.id)) return false
        return (e.attendees || []).filter(a => !a.self).length >= 1
      })
      .map(e => ({
        id: e.id,
        title: e.summary || 'Untitled meeting',
        attendees: (e.attendees || [])
          .filter(a => !a.self)
          .map(a => a.displayName || a.email.split('@')[0])
          .slice(0, 5),
      }))
  } catch (err) {
    console.error(`[googleCalendar] getRecentlyEndedMeetings failed for user ${userId}:`, err.message)
    return []
  }
}
