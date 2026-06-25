const express = require('express')
const router = express.Router()
const Event = require('../models/Event')
const User = require('../models/User')

// Simple admin guard — only your email can access this
function adminOnly(req, res, next) {
  if (req.user.email !== process.env.ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  next()
}

// GET /admin/stats
router.get('/stats', adminOnly, async (req, res) => {
  try {
    const now = new Date()
    const ago7  = new Date(now - 7  * 24 * 60 * 60 * 1000)
    const ago30 = new Date(now - 30 * 24 * 60 * 60 * 1000)

    const [
      totalUsers,
      activeUsers7d,
      totalCaptures,
      captures7d,
      captures30d,
      totalChats,
      chats7d,
      totalLogins7d,
      usersWithReminder,
      usersWithCalendar,
      recentEvents,
    ] = await Promise.all([
      User.countDocuments(),
      Event.distinct('userId', { createdAt: { $gte: ago7 } }).then(ids => ids.length),
      Event.countDocuments({ event: 'capture_submitted' }),
      Event.countDocuments({ event: 'capture_submitted', createdAt: { $gte: ago7 } }),
      Event.countDocuments({ event: 'capture_submitted', createdAt: { $gte: ago30 } }),
      Event.countDocuments({ event: 'capture_chat' }),
      Event.countDocuments({ event: 'capture_chat', createdAt: { $gte: ago7 } }),
      Event.countDocuments({ event: 'login', createdAt: { $gte: ago7 } }),
      Event.distinct('userId', { event: 'reminder_set' }).then(ids => ids.length),
      Event.distinct('userId', { event: 'calendar_connected' }).then(ids => ids.length),
      // Per-user breakdown: last 20 active users
      Event.aggregate([
        { $sort: { createdAt: -1 } },
        { $group: {
          _id: '$userId',
          lastActive: { $first: '$createdAt' },
          totalEvents: { $sum: 1 },
          captures: { $sum: { $cond: [{ $eq: ['$event', 'capture_submitted'] }, 1, 0] } },
          chats: { $sum: { $cond: [{ $eq: ['$event', 'capture_chat'] }, 1, 0] } },
        }},
        { $sort: { lastActive: -1 } },
        { $limit: 30 },
      ]),
    ])

    res.json({
      users: {
        total: totalUsers,
        active7d: activeUsers7d,
        withReminder: usersWithReminder,
        reminderRate: totalUsers ? `${Math.round(usersWithReminder / totalUsers * 100)}%` : '—',
        withCalendar: usersWithCalendar,
        calendarRate: totalUsers ? `${Math.round(usersWithCalendar / totalUsers * 100)}%` : '—',
      },
      captures: {
        total: totalCaptures,
        last7d: captures7d,
        last30d: captures30d,
        avgPerActiveUser7d: activeUsers7d ? (captures7d / activeUsers7d).toFixed(1) : '—',
      },
      chats: {
        total: totalChats,
        last7d: chats7d,
      },
      logins7d: totalLogins7d,
      userBreakdown: recentEvents,
      generatedAt: now,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
