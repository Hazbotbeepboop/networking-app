// migrate.js — run this ONCE to claim existing data for your account
// Usage: node migrate.js your@email.com
//
// Place this file in: C:\Users\user\OneDrive\Documents\Networking app\migrate.js
// Then run from that folder: node migrate.js your@email.com

require('dotenv').config()
const mongoose = require('mongoose')

async function migrate() {
  const email = process.argv[2]
  if (!email) {
    console.error('Please provide your email: node migrate.js your@email.com')
    process.exit(1)
  }

  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected to MongoDB')

  const User = require('./models/User')
  const Person = require('./models/Person')
  const Entry = require('./models/Entry')
  const Me = require('./models/Me')

  const user = await User.findOne({ email })
  if (!user) {
    console.error(`No account found for ${email} — register in the app first`)
    process.exit(1)
  }

  const userId = user._id
  console.log(`Claiming data for ${email} (${userId})`)

  const people = await Person.updateMany(
    { userId: { $exists: false } },
    { $set: { userId } }
  )
  console.log(`Updated ${people.modifiedCount} people`)

  const entries = await Entry.updateMany(
    { userId: { $exists: false } },
    { $set: { userId } }
  )
  console.log(`Updated ${entries.modifiedCount} entries`)

  const me = await Me.updateMany(
    { userId: { $exists: false } },
    { $set: { userId } }
  )
  console.log(`Updated ${me.modifiedCount} Me profile(s)`)

  console.log('Migration complete')
  await mongoose.disconnect()
}

migrate().catch(err => {
  console.error(err)
  process.exit(1)
})