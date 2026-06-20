const mongoose = require('mongoose')

const ActionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: ['follow_up', 'introduction', 'add_contact', 'send_email', 'other'],
    required: true
  },
  description: { type: String, required: true },
  personId: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', default: null },
  personName: { type: String, default: null },
  status: {
    type: String,
    enum: ['pending', 'done', 'dismissed'],
    default: 'pending'
  },
  outcome: { type: String, default: null }, // optional note added when marking done
  sourceCapture: { type: String, default: null },
  completedAt: { type: Date, default: null },
  dueDate: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Action', ActionSchema)