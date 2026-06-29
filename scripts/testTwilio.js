require('dotenv').config()
const twilio = require('twilio')

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, APP_URL } = process.env

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
  console.error('✗ Missing Twilio env vars')
  process.exit(1)
}

const to = process.argv[2]
if (!to) {
  console.error('Usage: node scripts/testTwilio.js +61412345678')
  process.exit(1)
}

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

client.messages.create({
  body: `How did "Coffee with Jake" go? Log it while it's fresh → ${APP_URL || 'https://your-app.railway.app'}`,
  from: TWILIO_PHONE_NUMBER,
  to,
})
  .then(msg => console.log('✓ SMS sent:', msg.sid))
  .catch(err => console.error('✗ Failed:', err.message))
