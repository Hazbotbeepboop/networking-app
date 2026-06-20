const express = require('express')
const router = express.Router()
const Suppression = require('../models/Suppression')

// Get all suppressions for a user
router.get('/', async (req, res) => {
  try {
    const suppressions = await Suppression.find({ userId: req.user.userId }).sort({ createdAt: -1 })
    res.json(suppressions)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Create a suppression
router.post('/', async (req, res) => {
  try {
    const { description, personName, note } = req.body
    const suppression = await Suppression.create({
      userId: req.user.userId,
      description,
      personName: personName || null,
      note: note || null
    })
    res.status(201).json(suppression)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Delete a suppression (if user wants to re-enable)
router.delete('/:id', async (req, res) => {
  try {
    const suppression = await Suppression.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    })
    if (!suppression) return res.status(404).json({ error: 'Not found' })
    res.json({ deleted: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router