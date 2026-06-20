const mongoose = require('mongoose')

const PersonSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  role: { type: String },
  company: { type: String },
  goals: { type: String },
  canHelpWith: { type: String },
  notes: { type: String },
  whereMet: { type: String },
  connections: [
    {
      person: { type: mongoose.Schema.Types.ObjectId, ref: 'Person' },
      context: { type: String }
    }
  ],
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Person', PersonSchema)