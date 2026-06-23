require('dotenv').config()
const mongoose = require('mongoose')
const User = require('../models/User')
const Person = require('../models/Person')
const Me = require('../models/Me')
const Action = require('../models/Action')
const Conversation = require('../models/Conversation')

const email = process.argv[2]
if (!email) {
  console.error('Usage: node scripts/deleteUser.js <email>')
  process.exit(1)
}

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const user = await User.findOne({ email })
  if (!user) {
    console.error(`User not found: ${email}`)
    process.exit(1)
  }
  const uid = user._id
  const [p, m, a, c] = await Promise.all([
    Person.deleteMany({ userId: uid }),
    Me.deleteMany({ userId: uid }),
    Action.deleteMany({ userId: uid }),
    Conversation.deleteMany({ userId: uid }),
  ])
  await User.deleteOne({ _id: uid })
  console.log(`Deleted ${email}`, { people: p.deletedCount, me: m.deletedCount, actions: a.deletedCount, conversations: c.deletedCount })
  process.exit(0)
}).catch(e => { console.error(e); process.exit(1) })
