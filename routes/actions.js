const express = require('express')
const router = express.Router()
const Action = require('../models/Action')

// Get all pending actions
router.get('/', async (req, res) => {
  try {
    const actions = await Action.find({ userId: req.user.userId, status: 'pending' })
      .sort({ createdAt: -1 })
      .populate('personId', 'name role company')
    res.json(actions)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Update action status (done or dismissed), optionally with outcome note
router.put('/:id', async (req, res) => {
  try {
    const update = {}
    if (req.body.status) update.status = req.body.status
    if (req.body.status === 'done') {
      update.completedAt = new Date()
      if (req.body.outcome) update.outcome = req.body.outcome
    }
    if (req.body.dueDate !== undefined) {
      update.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null
    }
    if (req.body.description !== undefined) {
      update.description = req.body.description
    }
    const action = await Action.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      update,
      { new: true }
    )
    if (!action) return res.status(404).json({ error: 'Action not found' })
    res.json(action)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Delete an action (used by undo in QuickCapture)
router.delete('/:id', async (req, res) => {
  try {
    const action = await Action.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    })
    if (!action) return res.status(404).json({ error: 'Action not found' })
    res.json({ deleted: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router