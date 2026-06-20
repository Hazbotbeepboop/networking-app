const mongoose = require('mongoose')

const EntrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  personId: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', default: null },
  isMine: { type: Boolean, default: false },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Entry', EntrySchema)