require('dotenv').config()
const sgMail = require('@sendgrid/mail')

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const msg = {
  to: 'harry.phillips51094@gmail.com',
  from: process.env.SENDGRID_FROM_EMAIL,
  subject: 'Varys — SendGrid test',
  text: 'SendGrid is connected. Weekly digests are go.',
  html: '<p>SendGrid is connected. Weekly digests are go.</p>',
}

sgMail.send(msg)
  .then(() => console.log('✓ Email sent'))
  .catch(err => console.error('✗ Failed:', err.response?.body || err.message))