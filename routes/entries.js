const express = require('express')
const router = express.Router()
const Entry = require('../models/Entry')

// Add a personal journal entry
router.post('/me', async (req, res) => {
  try {
    const entry = new Entry({
      userId: req.user.userId,
      isMine: true,
      content: req.body.content
    })
    const saved = await entry.save()
    res.status(201).json(saved)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Get all personal journal entries
router.get('/me', async (req, res) => {
  try {
    const entries = await Entry.find({ userId: req.user.userId, isMine: true })
      .sort({ createdAt: -1 })
    res.json(entries)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Add an entry for a person
router.post('/:personId', async (req, res) => {
  try {
    const entry = new Entry({
      userId: req.user.userId,
      personId: req.params.personId,
      content: req.body.content
    })
    const saved = await entry.save()
    res.status(201).json(saved)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Get all entries for a person
router.get('/:personId', async (req, res) => {
  try {
    const entries = await Entry.find({ userId: req.user.userId, personId: req.params.personId })
      .sort({ createdAt: -1 })
    res.json(entries)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Update an entry
router.put('/:entryId', async (req, res) => {
  try {
    const entry = await Entry.findOneAndUpdate(
      { _id: req.params.entryId, userId: req.user.userId },
      { content: req.body.content },
      { new: true }
    )
    if (!entry) return res.status(404).json({ error: 'Entry not found' })
    res.json(entry)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

module.exports = router