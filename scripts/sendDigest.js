require('dotenv').config()
const mongoose = require('mongoose')
const { runDigest } = require('../services/digest')

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('[digest] DB connected')
    await runDigest()
    console.log('[digest] Done')
    process.exit(0)
  })
  .catch(err => {
    console.error('[digest] DB connection failed:', err.message)
    process.exit(1)
  })