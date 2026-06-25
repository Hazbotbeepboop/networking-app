const Agenda = require('agenda')
const sgMail = require('@sendgrid/mail')

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const agenda = new Agenda({
  db: { address: process.env.MONGO_URI, collection: 'agendaJobs' },
  processEvery: '1 minute',
  defaultLockLifetime: 10000,
})

// ── Job definitions ───────────────────────────────────────────────────────────

agenda.define('send daily reminder', async (job) => {
  const { email } = job.attrs.data
  const appUrl = process.env.APP_URL || 'http://localhost:3000'

  await sgMail.send({
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: 'What happened today worth remembering?',
    text: `Open Varys and log anything from today — a conversation, a follow-up, someone you met.\n\n• Build the habit\n• Make your network analysis more powerful\n• 30 seconds is enough\n\n${appUrl}\n\nTo change your reminder time, visit your Profile tab in Varys.`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #333; padding: 32px 0;">
        <p style="font-size: 13px; font-weight: 600; letter-spacing: 0.15em; color: #1C2B3A; margin-bottom: 28px;">
          VAR<span style="color: #B08D57;">Y</span>S
        </p>
        <p style="font-size: 16px; font-weight: 500; color: #1C2B3A; margin-bottom: 16px;">
          What happened today worth remembering?
        </p>
        <p style="font-size: 14px; color: #555; margin-bottom: 20px; line-height: 1.6;">
          Open Varys and log anything from today — a conversation, a follow-up, someone you met.
        </p>
        <ul style="font-size: 13px; color: #777; padding-left: 18px; margin-bottom: 28px; line-height: 2;">
          <li>Build the habit</li>
          <li>Make your network analysis more powerful</li>
          <li>30 seconds is enough</li>
        </ul>
        <a href="${appUrl}" style="display: inline-block; background: #1C2B3A; color: #B08D57; padding: 11px 26px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">
          Open Varys →
        </a>
        <p style="font-size: 11px; color: #ccc; margin-top: 40px;">
          To change your reminder time, visit your <a href="${appUrl}/me" style="color: #ccc;">Profile tab</a>.
        </p>
      </div>
    `,
  })
})

// ── Helpers ───────────────────────────────────────────────────────────────────

async function scheduleReminder(user) {
  // Cancel any existing reminder jobs for this user
  await agenda.cancel({ name: 'send daily reminder', 'data.userId': user._id.toString() })

  if (!user.reminderEnabled || !user.reminderTime) return

  const [h, m] = user.reminderTime.split(':')
  const cronExpr = `${parseInt(m)} ${parseInt(h)} * * *`
  const timezone = user.reminderTimezone || 'Australia/Brisbane'

  await agenda.every(
    cronExpr,
    'send daily reminder',
    { userId: user._id.toString(), email: user.email },
    { timezone, skipImmediate: true }
  )
}

async function cancelReminder(userId) {
  await agenda.cancel({ name: 'send daily reminder', 'data.userId': userId.toString() })
}

module.exports = { agenda, scheduleReminder, cancelReminder }
