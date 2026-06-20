const express = require('express')
const router = express.Router()
const Me = require('../models/Me')

// Get my profile (creates one if it doesn't exist)
router.get('/', async (req, res) => {
  try {
    let me = await Me.findOne({ userId: req.user.userId })
    if (!me) me = await Me.create({ userId: req.user.userId })
    res.json(me)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Update my profile
router.put('/', async (req, res) => {
  try {
    let me = await Me.findOne({ userId: req.user.userId })
    if (!me) me = await Me.create({ userId: req.user.userId })
    Object.assign(me, req.body)
    me.updatedAt = Date.now()
    const saved = await me.save()
    res.json(saved)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

module.exports = router