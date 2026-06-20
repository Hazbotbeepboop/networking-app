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