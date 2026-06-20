// migrate-entries-to-conversations.js
// Converts existing Entry documents into Conversation records.
// Run ONCE after deploying the conversation system.
// Usage: node migrate-entries-to-conversations.js

require('dotenv').config()
const mongoose = require('mongoose')

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected to MongoDB')

  const Entry = require('./models/Entry')
  const Person = require('./models/Person')
  const Conversation = require('./models/Conversation')

  const entries = await Entry.find({})
  console.log(`Found ${entries.length} entries to migrate`)

  let created = 0
  let skipped = 0

  for (const entry of entries) {
    // Skip if already migrated (check by captureText match)
    const existing = await Conversation.findOne({
      userId: entry.userId,
      captureText: entry.content
    })
    if (existing) {
      skipped++
      continue
    }

    let title = entry.content.slice(0, 60)
    if (entry.content.length > 60) title += '…'

    let relatedPeople = []
    if (entry.personId) {
      relatedPeople = [entry.personId]
    }

    const folder = entry.isMine ? 'MY_JOURNAL' : null

    await Conversation.create({
      userId: entry.userId,
      title,
      captureText: entry.content,
      messages: [{ role: 'user', content: entry.content }],
      relatedPeople,
      folder,
      createdAt: entry.createdAt,
      updatedAt: entry.createdAt
    })
    created++
  }

  console.log(`Migrated ${created} entries → conversations`)
  console.log(`Skipped ${skipped} already-migrated entries`)
  console.log('Done')
  await mongoose.disconnect()
}

migrate().catch(err => {
  console.error(err)
  process.exit(1)
})
