const express = require('express')
const router = express.Router()
const Person = require('../models/Person')

// Create a new person
router.post('/', async (req, res) => {
  try {
    const person = new Person({ ...req.body, userId: req.user.userId })
    const saved = await person.save()
    res.status(201).json(saved)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Get all people
router.get('/', async (req, res) => {
  try {
    const people = await Person.find({ userId: req.user.userId })
    res.json(people)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get one person by ID
router.get('/:id', async (req, res) => {
  try {
    const person = await Person.findOne({ _id: req.params.id, userId: req.user.userId })
    if (!person) return res.status(404).json({ error: 'Person not found' })
    res.json(person)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Update a person
router.put('/:id', async (req, res) => {
  try {
    const person = await Person.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      req.body,
      { new: true }
    )
    if (!person) return res.status(404).json({ error: 'Person not found' })
    res.json(person)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Bulk import contacts
router.post('/import', async (req, res) => {
  try {
    const { contacts } = req.body
    const userId = req.user.userId

    const existing = await Person.find({ userId }).select('name')
    const existingNames = new Set(existing.map(p => p.name.toLowerCase().trim()))

    const toCreate = (contacts || []).filter(c => c.name && !existingNames.has(c.name.toLowerCase().trim()))

    const created = toCreate.length > 0
      ? await Person.insertMany(toCreate.map(c => ({
          userId,
          name: c.name,
          role: c.role || null,
          company: c.company || null,
          whereMet: c.whereMet || null,
        })))
      : []

    res.json({ created, skipped: contacts.length - toCreate.length, total: contacts.length })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// Delete a person
router.delete('/:id', async (req, res) => {
  try {
    const person = await Person.findOneAndDelete({ _id: req.params.id, userId: req.user.userId })
    if (!person) return res.status(404).json({ error: 'Person not found' })
    res.json({ message: 'Person deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router