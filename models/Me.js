const mongoose = require('mongoose')

const MeSchema = new mongoose.Schema({
  name: { type: String },
  role: { type: String },
  goals: { type: String },
  currentProjects: { type: String },
  lookingFor: { type: String },
  updatedAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Me', MeSchema)