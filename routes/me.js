const express = require('express')
const router = express.Router()
const Me = require('../models/Me')
const User = require('../models/User')

// Get my profile (creates one if it doesn't exist)
router.get('/', async (req, res) => {
  try {
    let me = await Me.findOne({ userId: req.user.userId })
    if (!me) me = await Me.create({ userId: req.user.userId })
    const user = await User.findById(req.user.userId).select('phone')
    res.json({ ...me.toObject(), phone: user?.phone || '' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Update my profile
router.put('/', async (req, res) => {
  try {
    const { phone, ...meData } = req.body
    let me = await Me.findOne({ userId: req.user.userId })
    if (!me) me = await Me.create({ userId: req.user.userId })
    Object.assign(me, meData)
    me.updatedAt = Date.now()
    const saved = await me.save()
    if (phone !== undefined) {
      await User.findByIdAndUpdate(req.user.userId, { phone: phone.trim() })
    }
    res.json({ ...saved.toObject(), phone: phone !== undefined ? phone.trim() : '' })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

module.exports = router