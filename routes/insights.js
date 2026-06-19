const express = require('express')
const router = express.Router()
const Anthropic = require('@anthropic-ai/sdk')
const Person = require('../models/Person')
const Entry = require('../models/Entry')
const Me = require('../models/Me')

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

router.post('/person/:personId', async (req, res) => {
  try {
    // Fetch everything
    const person = await Person.findById(req.params.personId)
    const personEntries = await Entry.find({ personId: req.params.personId }).sort({ createdAt: -1 })
    const me = await Me.findOne()
    const myEntries = await Entry.find({ isMine: true }).sort({ createdAt: -1 })
    const allPeople = await Person.find()
    const allEntries = await Entry.find({ isMine: false, personId: { $ne: req.params.personId } })

    // Build the prompt
    const prompt = `
You are a smart networking assistant. Analyse the following information and surface insights.

MY PROFILE:
Name: ${me?.name}
Role: ${me?.role}
Goals: ${me?.goals}
Current projects: ${me?.currentProjects}
Looking for: ${me?.lookingFor}

MY JOURNAL ENTRIES:
${myEntries.map(e => `- ${new Date(e.createdAt).toLocaleDateString()}: ${e.content}`).join('\n')}

PERSON I'M ASKING ABOUT:
Name: ${person.name}
Role: ${person.role}
Company: ${person.company}
Where met: ${person.whereMet}
Goals: ${person.goals}
Can help with: ${person.canHelpWith}
Notes: ${person.notes}

LOG ENTRIES FOR ${person.name}:
${personEntries.map(e => `- ${new Date(e.createdAt).toLocaleDateString()}: ${e.content}`).join('\n')}

REST OF MY NETWORK:
${allPeople.filter(p => p._id.toString() !== req.params.personId).map(p => {
  const entries = allEntries.filter(e => e.personId?.toString() === p._id.toString())
  return `
${p.name} (${p.role} at ${p.company}):
${entries.map(e => `  - ${e.content}`).join('\n')}
  `
}).join('\n')}

Please provide:
1. How ${person.name} might be able to help me given my current goals and what I'm looking for
2. How I might be able to help ${person.name} given their goals
3. Connections you notice between ${person.name} and others in my network
4. Anything I might have forgotten or missed based on the log entries
5. Suggested next actions

Be specific and reference actual details from the logs. Be concise but insightful.
`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    })

    res.json({ insights: message.content[0].text })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/capture', async (req, res) => {
  try {
    const { text } = req.body
    const me = await Me.findOne()
    const myEntries = await Entry.find({ isMine: true }).sort({ createdAt: -1 })
    const allPeople = await Person.find()
    const allEntries = await Entry.find({ isMine: false })

    const prompt = `
You are a smart networking assistant. The user has just written a quick capture — a freeform note about something that just happened or is on their mind.

MY PROFILE:
Name: ${me?.name}
Role: ${me?.role}
Goals: ${me?.goals}
Current projects: ${me?.currentProjects}
Looking for: ${me?.lookingFor}

MY RECENT JOURNAL ENTRIES:
${myEntries.slice(0, 10).map(e => `- ${new Date(e.createdAt).toLocaleDateString()}: ${e.content}`).join('\n')}

MY NETWORK:
${allPeople.map(p => {
  const entries = allEntries.filter(e => e.personId?.toString() === p._id.toString())
  return `
${p.name} (${p.role} at ${p.company}):
Goals: ${p.goals}
Can help with: ${p.canHelpWith}
Notes: ${p.notes}
Log: ${entries.slice(0, 5).map(e => `${e.content}`).join(' | ')}
  `
}).join('\n')}

QUICK CAPTURE:
"${text}"

Please respond with:
1. Key insights from this capture relevant to my network and goals
2. People in my network this relates to and how
3. Anyone mentioned who isn't in my network yet (suggest adding them)
4. Concrete next actions

Then on a new line output exactly this format so the app can parse it:
PEOPLE_MENTIONED: [comma separated list of full names mentioned in the capture]
SUGGESTED_SAVES: [comma separated list of people from MY NETWORK this should be saved to, or MY_JOURNAL if it's personal]
`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    })

    const responseText = message.content[0].text

    // Parse the structured output
    const peopleMatch = responseText.match(/PEOPLE_MENTIONED: \[(.+)\]/)
    const savesMatch = responseText.match(/SUGGESTED_SAVES: \[(.+)\]/)

    const peopleMentioned = peopleMatch ? peopleMatch[1].split(',').map(s => s.trim()) : []
    const suggestedSaves = savesMatch ? savesMatch[1].split(',').map(s => s.trim()) : []

    res.json({
      insights: responseText,
      peopleMentioned,
      suggestedSaves
    })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router