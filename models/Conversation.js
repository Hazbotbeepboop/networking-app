const mongoose = require('mongoose')

const MessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true }
}, { _id: false })

const ConversationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  captureText: { type: String, required: true },
  messages: [MessageSchema],
  relatedPeople: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Person' }],
  folder: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Conversation', ConversationSchema)
