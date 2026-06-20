const mongoose = require('mongoose')

const SuppressionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  description: { type: String, required: true }, // the action text being suppressed
  personName: { type: String, default: null },   // person it related to, if any
  note: { type: String, default: null },          // user's reason e.g. "already tried, dead end"
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Suppression', SuppressionSchema)