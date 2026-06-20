const express = require('express')
const router = express.Router()
const Conversation = require('../models/Conversation')
const Person = require('../models/Person')

// ── List all conversations for the user ───────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const conversations = await Conversation.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .select('title captureText relatedPeople folder createdAt')
    res.json(conversations)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── Get conversations linked to a specific person ─────────────────────────────
router.get('/person/:personId', async (req, res) => {
  try {
    const conversations = await Conversation.find({
      userId: req.user.userId,
      relatedPeople: req.params.personId
    }).sort({ createdAt: -1 }).select('title captureText createdAt messages')
    res.json(conversations)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── Get conversations tagged to self (isMine) ─────────────────────────────────
router.get('/mine', async (req, res) => {
  try {
    const conversations = await Conversation.find({
      userId: req.user.userId,
      relatedPeople: { $size: 0 },
      folder: 'MY_JOURNAL'
    }).sort({ createdAt: -1 }).select('title captureText createdAt messages')

    // Also get any conversation explicitly tagged mine
    const allMine = await Conversation.find({
      userId: req.user.userId,
      folder: 'MY_JOURNAL'
    }).sort({ createdAt: -1 }).select('title captureText createdAt messages')

    res.json(allMine)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── Get a single conversation ─────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user.userId
    })
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' })
    res.json(conversation)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── Save a new conversation ───────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const userId = req.user.userId
    const { title, captureText, messages, relatedPeopleNames, folder } = req.body

    // Resolve person names to IDs
    let relatedPeople = []
    if (relatedPeopleNames && relatedPeopleNames.length > 0) {
      const people = await Person.find({ userId })
      relatedPeople = relatedPeopleNames
        .map(name => {
          const match = people.find(p => p.name.toLowerCase() === name.toLowerCase())
          return match ? match._id : null
        })
        .filter(Boolean)
    }

    const conversation = await Conversation.create({
      userId,
      title,
      captureText,
      messages,
      relatedPeople,
      folder: folder || null
    })

    res.status(201).json(conversation)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── Delete a conversation ─────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await Conversation.deleteOne({ _id: req.params.id, userId: req.user.userId })
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
