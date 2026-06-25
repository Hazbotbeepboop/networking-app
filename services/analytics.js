const Event = require('../models/Event')

/**
 * Fire-and-forget event tracking. Never throws — analytics must not break the app.
 * @param {string|ObjectId} userId
 * @param {string} event  e.g. 'login', 'capture_submitted', 'reminder_set'
 * @param {object} metadata  optional extra fields (never include PII or message content)
 */
async function track(userId, event, metadata = {}) {
  try {
    await Event.create({ userId, event, metadata })
  } catch (err) {
    // Swallow silently — analytics failure must never affect the user
    console.error('[analytics] Failed to track event:', event, err.message)
  }
}

module.exports = { track }
