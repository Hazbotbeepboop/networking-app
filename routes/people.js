const express = require('express')
const router = express.Router()
const Person = require('../models/Person')

// Create a new person
router.post('/', async (req, res) => {
  try {
    const person = new Person(req.body)
    const saved = await person.save()
    res.status(201).json(saved)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Get all people
router.get('/', async (req, res) => {
  try {
    const people = await Person.find()
    res.json(people)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get one person by ID
router.get('/:id', async (req, res) => {
  try {
    const person = await Person.findById(req.params.id)
    if (!person) return res.status(404).json({ error: 'Person not found' })
    res.json(person)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const person = await Person.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
    if (!person) return res.status(404).json({ error: 'Person not found' })
    res.json(person)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const person = await Person.findByIdAndDelete(req.params.id)
    if (!person) return res.status(404).json({ error: 'Person not found' })
    res.json({ message: 'Person deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router