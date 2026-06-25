const mongoose = require('mongoose')

const eventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  event: { type: String, required: true, index: true },
  metadata: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now, index: true },
})

module.exports = mongoose.model('Event', eventSchema)
