const express = require('express')
const router = express.Router()
const Anthropic = require('@anthropic-ai/sdk')
const Person = require('../models/Person')
const Conversation = require('../models/Conversation')
const Me = require('../models/Me')
const Action = require('../models/Action')
const Suppression = require('../models/Suppression')
const User = require('../models/User')
const { track } = require('../services/analytics')
const { getRecentEvents, formatEventsForPrompt, getCalendarSuggestions, matchesExistingContact } = require('../services/googleCalendar')

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

function formatCompletedActions(actions) {
  if (!actions.length) return 'None.'
  return actions.map(a => {
    const date = new Date(a.completedAt || a.createdAt).toLocaleDateString('en-AU')
    const person = a.personName ? ` re: ${a.personName}` : ''
    const outcome = a.outcome ? ` — outcome: ${a.outcome}` : ' — no outcome recorded'
    return `- [${date}] ${a.description}${person}${outcome}`
  }).join('\n')
}

function formatSuppressions(suppressions) {
  if (!suppressions.length) return 'None.'
  return suppressions.map(s => {
    const person = s.personName ? ` re: ${s.personName}` : ''
    const note = s.note ? ` — reason: ${s.note}` : ''
    return `- ${s.description}${person}${note}`
  }).join('\n')
}

function formatAllConversations(conversations, peopleMap) {
  if (!conversations.length) return 'None.'
  return conversations.map(c => {
    const date = new Date(c.createdAt).toLocaleDateString('en-AU')
    const people = (c.relatedPeople || [])
      .map(id => peopleMap[id.toString()])
      .filter(Boolean)
      .join(', ')
    const journal = c.folder === 'MY_JOURNAL' ? 'My journal' : ''
    const tags = [people, journal].filter(Boolean).join(', ')
    const header = `--- [${date}] "${c.title}"${tags ? ` (${tags})` : ''}`
    const messages = (c.messages || []).map(m =>
      `${m.role === 'user' ? 'User' : 'Varys'}: ${m.content}`
    ).join('\n')
    return `${header}\n${messages}`
  }).join('\n\n')
}

// ── Person insights ───────────────────────────────────────────────────────────
router.post('/person/:personId', async (req, res) => {
  try {
    const userId = req.user.userId

    const person = await Person.findOne({ _id: req.params.personId, userId })
    if (!person) return res.status(404).json({ error: 'Person not found' })

    const me = await Me.findOne({ userId })
    const allPeople = await Person.find({ userId })
    const completedActions = await Action.find({ userId, status: 'done' }).sort({ completedAt: -1 }).limit(20)
    const suppressions = await Suppression.find({ userId })
    const allConversations = await Conversation.find({ userId }).sort({ createdAt: -1 }).select('title messages relatedPeople folder createdAt')

    const peopleMap = {}
    allPeople.forEach(p => { peopleMap[p._id.toString()] = p.name })

    const personActions = completedActions.filter(a =>
      a.personId?.toString() === req.params.personId ||
      (a.personName && a.personName.toLowerCase() === person.name.toLowerCase())
    )

    const personConversations = allConversations.filter(c =>
      c.relatedPeople.some(pid => pid.toString() === req.params.personId)
    )

    const networkPeople = allPeople
      .filter(p => p._id.toString() !== req.params.personId)
      .map(p => `${p.name} (${p.role || 'unknown role'} at ${p.company || 'unknown company'})
Goals: ${p.goals || '—'}
Can help with: ${p.canHelpWith || '—'}
Notes: ${p.notes || '—'}`)
      .join('\n\n')

    const prompt = `You are Varys — a private intelligence advisor for high-value networking. You are direct, specific, and see connections others miss. You never hedge unnecessarily. Every insight you surface should be actionable.

MY PROFILE:
Name: ${me?.name || 'unknown'}
Role: ${me?.role || 'unknown'}
Goals: ${me?.goals || 'not specified'}
Current projects: ${me?.currentProjects || 'not specified'}
Looking for: ${me?.lookingFor || 'not specified'}

MY RECENT JOURNAL:
${formatAllConversations(allConversations.filter(c => c.folder === 'MY_JOURNAL'), peopleMap)}

COMPLETED ACTIONS (already acted on — do not suggest these again):
${formatCompletedActions(completedActions)}

STOP SUGGESTING (user has explicitly asked not to see these again):
${formatSuppressions(suppressions)}

CONTACT:
Name: ${person.name}
Role: ${person.role || '—'}
Company: ${person.company || '—'}
Where met: ${person.whereMet || '—'}
Goals: ${person.goals || '—'}
Can help with: ${person.canHelpWith || '—'}
Notes: ${person.notes || '—'}

COMPLETED ACTIONS WITH ${person.name.toUpperCase()}:
${formatCompletedActions(personActions)}

CONVERSATIONS WITH ${person.name.toUpperCase()}:
${formatAllConversations(personConversations, peopleMap)}

REST OF NETWORK:
${networkPeople || 'No other contacts.'}

ALL SAVED CONVERSATIONS:
${formatAllConversations(allConversations, peopleMap)}

Respond in this exact format — no preamble:

LEVERAGE
How ${person.name} can help you right now, given your goals. Be specific. If there is no clear leverage, say so plainly. Do not suggest anything in COMPLETED ACTIONS or STOP SUGGESTING.

RECIPROCITY
How you can help ${person.name} given their goals. Specific only — no generalities.

CONNECTIONS
Any links between ${person.name} and others in the network worth acting on. If none, say none.

GAPS
What the log suggests you may have forgotten, left unresolved, or should revisit. Only flag things that are genuinely unresolved and not in COMPLETED ACTIONS or STOP SUGGESTING.

ACTIONS
A short numbered list of the most valuable next steps. Maximum 4. Each one sentence. Do not repeat anything in COMPLETED ACTIONS or STOP SUGGESTING.`

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

// ── Calendar contact suggestions ──────────────────────────────────────────────
router.get('/calendar-suggestions', async (req, res) => {
  try {
    const userId = req.user.userId
    const contacts = await Person.find({ userId }).select('name')
    const { suggestions, rawEvents, seenNames, eventSuppressions, nameSuppressions } = await getCalendarSuggestions(userId, contacts)

    // Pass event titles to Claude to extract names from title-only events
    if (rawEvents.length > 0) {
      const titlesText = rawEvents
        .filter(e => e.title)
        .map(e => `- ${e.title}`)
        .join('\n')

      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: `Extract individual person names from these calendar event titles. For each name found, output one line in this exact format: Name | Event Title\nOutput NONE if there are no individual person names. Only include names of specific individual people — ignore companies, teams, job roles, and generic descriptions.\n\nEvents:\n${titlesText}`,
        }]
      })

      const claudeText = msg.content[0].text.trim()
      if (claudeText !== 'NONE') {
        for (const line of claudeText.split('\n')) {
          const parts = line.split('|')
          if (parts.length < 2) continue
          const name = parts[0].trim()
          const eventTitle = parts[1].trim()
          if (!name || seenNames.has(name.toLowerCase())) continue
          if (matchesExistingContact(name, contacts)) continue
          if (nameSuppressions.includes(name.toLowerCase())) continue
          if (eventSuppressions.includes(eventTitle.toLowerCase())) continue
          seenNames.add(name.toLowerCase())
          const matchedEvent = rawEvents.find(e => e.title.toLowerCase() === eventTitle.toLowerCase())
          suggestions.push({
            name,
            email: null,
            eventTitle: matchedEvent?.title || eventTitle,
            date: matchedEvent?.date || '',
            isPast: matchedEvent?.isPast ?? false,
          })
        }
      }
    }

    res.json({ suggestions })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// POST /insights/calendar-suppress
router.post('/calendar-suppress', async (req, res) => {
  try {
    const userId = req.user.userId
    const { type, value } = req.body // type: 'event' | 'name', value: string
    if (!type || !value) return res.status(400).json({ error: 'type and value required' })
    const field = type === 'event' ? 'calendarEventSuppressions' : 'calendarNameSuppressions'
    await User.findByIdAndUpdate(userId, { $addToSet: { [field]: value.toLowerCase() } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Quick capture ─────────────────────────────────────────────────────────────
router.post('/capture', async (req, res) => {
  try {
    const { text } = req.body
    const userId = req.user.userId

    const me = await Me.findOne({ userId })
    const allPeople = await Person.find({ userId })
    const completedActions = await Action.find({ userId, status: 'done' }).sort({ completedAt: -1 }).limit(20)
    const suppressions = await Suppression.find({ userId })
    const allConversations = await Conversation.find({ userId }).sort({ createdAt: -1 }).select('title messages relatedPeople folder createdAt')

    const calendarEvents = await getRecentEvents(userId)
    const calendarContext = formatEventsForPrompt(calendarEvents)

    const peopleMap = {}
    allPeople.forEach(p => { peopleMap[p._id.toString()] = p.name })

    const networkContext = allPeople.map(p =>
      `${p.name} (${p.role || '—'} at ${p.company || '—'})
Goals: ${p.goals || '—'}
Can help with: ${p.canHelpWith || '—'}
Notes: ${p.notes || '—'}`
    ).join('\n\n')

    const prompt = `You are Varys — a private intelligence advisor for high-value networking. The user has just made a quick capture. Your job is to surface what matters, identify actions, and spot connections — without padding or hedging.

MY PROFILE:
Name: ${me?.name || 'unknown'}
Role: ${me?.role || 'unknown'}
Goals: ${me?.goals || 'not specified'}
Current projects: ${me?.currentProjects || 'not specified'}
Looking for: ${me?.lookingFor || 'not specified'}

COMPLETED ACTIONS (already acted on — do not suggest these again):
${formatCompletedActions(completedActions)}

STOP SUGGESTING (user has explicitly asked not to see these again):
${formatSuppressions(suppressions)}

NETWORK:
${networkContext || 'No contacts yet.'}

SAVED CONVERSATIONS:
${formatAllConversations(allConversations, peopleMap)}

CALENDAR (recent & upcoming meetings from Google Calendar):
${calendarContext}

CAPTURE:
"${text}"

Respond in this exact format — no preamble, no filler:

INTELLIGENCE
2–4 sentences. What this capture means in the context of the user's goals and network. Name specific people where relevant. Be direct. Do not suggest anything in COMPLETED ACTIONS or STOP SUGGESTING.

ACTIONS
List each action on its own line in this exact format:
ACTION: <type> | <one sentence description> | <person name or blank>

Valid types: follow_up, introduction, add_contact, send_email, other

Only include actions that are clearly warranted, not already completed, and not in STOP SUGGESTING. Maximum 4.

PEOPLE_MENTIONED: [comma separated full names mentioned in the capture]
SUGGESTED_SAVES: [comma separated names from NETWORK who are mentioned or relevant to this capture, plus MY_JOURNAL if the content is personal. Always include this field — use MY_JOURNAL if in doubt.]
TITLE: [a short title for this conversation, max 8 words, e.g. "Beck Phillips capacity + JMC Academy lead"]

NEW_PERSON
For each person mentioned in the capture who does NOT already exist in NETWORK, output one line in this exact format:
NEW_PERSON: <full name> | <inferred role or blank> | <inferred company or blank> | <brief notes from the capture>
Omit entirely if there are no new people. Maximum 3.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    })

    const responseText = message.content[0].text
    const peopleMatch = responseText.match(/PEOPLE_MENTIONED: \[(.+)\]/)
    const savesMatch = responseText.match(/SUGGESTED_SAVES: \[(.+)\]/)
    const titleMatch = responseText.match(/TITLE: \[(.+)\]/)
    const peopleMentioned = peopleMatch ? peopleMatch[1].split(',').map(s => s.trim()).filter(Boolean) : []
    const suggestedSaves = savesMatch ? savesMatch[1].split(',').map(s => s.trim()).filter(Boolean) : []
    const conversationTitle = titleMatch ? titleMatch[1].trim() : text.slice(0, 60)
    const actionLines = [...responseText.matchAll(/^ACTION: (.+) \| (.+) \| (.*)$/gm)]
    const suggestedActions = actionLines.map(match => ({
      type: match[1].trim(),
      description: match[2].trim(),
      personName: match[3].trim() || null
    }))

    const existingNames = new Set(allPeople.map(p => p.name.toLowerCase()))
    const newPersonLines = [...responseText.matchAll(/^NEW_PERSON: (.+?) \| (.*?) \| (.*?) \| (.*)$/gm)]
    const newPeopleData = newPersonLines
      .map(match => ({
        name: match[1].trim(),
        role: match[2].trim(),
        company: match[3].trim(),
        notes: match[4].trim(),
      }))
      .filter(p => p.name && !existingNames.has(p.name.toLowerCase()))

    res.json({ insights: responseText, peopleMentioned, suggestedSaves, suggestedActions, conversationTitle, newPeopleData })
    track(userId, 'capture_submitted')

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── Save accepted actions ─────────────────────────────────────────────────────
router.post('/actions', async (req, res) => {
  try {
    const userId = req.user.userId
    const { actions, sourceCapture } = req.body

    const saved = await Promise.all(actions.map(async (a) => {
      let personId = null
      if (a.personName) {
        const match = await Person.findOne({
          userId,
          name: { $regex: new RegExp(a.personName, 'i') }
        })
        if (match) personId = match._id
      }
      return Action.create({
        userId,
        type: a.type,
        description: a.description,
        personName: a.personName || null,
        personId,
        sourceCapture: sourceCapture || null,
        dueDate: a.dueDate ? new Date(a.dueDate) : null
      })
    }))

    res.status(201).json(saved)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── Follow-up chat ────────────────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  try {
    const { history, pendingActions } = req.body
    const userId = req.user.userId

    const me = await Me.findOne({ userId })
    const allPeople = await Person.find({ userId })
    const completedActions = await Action.find({ userId, status: 'done' }).sort({ completedAt: -1 }).limit(20)
    const suppressions = await Suppression.find({ userId })
    const allConversations = await Conversation.find({ userId }).sort({ createdAt: -1 }).select('title messages relatedPeople folder createdAt')

    const peopleMap = {}
    allPeople.forEach(p => { peopleMap[p._id.toString()] = p.name })

    const networkContext = allPeople.map(p =>
      `${p.name} (${p.role || '—'} at ${p.company || '—'})
Goals: ${p.goals || '—'}
Can help with: ${p.canHelpWith || '—'}
Notes: ${p.notes || '—'}`
    ).join('\n\n')

    const systemPrompt = `You are Varys — a private intelligence advisor for high-value networking. You are direct, specific, and see connections others miss. You never hedge unnecessarily.

The user is having a follow-up conversation about their network after an initial capture and analysis. They may clarify, correct, or ask you to dig deeper. Update your analysis based on what they tell you.

MY PROFILE:
Name: ${me?.name || 'unknown'}
Role: ${me?.role || 'unknown'}
Goals: ${me?.goals || 'not specified'}
Current projects: ${me?.currentProjects || 'not specified'}
Looking for: ${me?.lookingFor || 'not specified'}

COMPLETED ACTIONS (already acted on — do not suggest these again):
${formatCompletedActions(completedActions)}

STOP SUGGESTING:
${formatSuppressions(suppressions)}

NETWORK:
${networkContext || 'No contacts yet.'}

SAVED CONVERSATIONS:
${formatAllConversations(allConversations, peopleMap)}

CURRENT PENDING ACTIONS (these are shown to the user right now, awaiting their decision):
${pendingActions?.length > 0 ? pendingActions.map((a, i) => `${i + 1}. "${a.description}"${a.personName ? ` (re: ${a.personName})` : ''}`).join('\n') : 'None.'}

When the user clarifies or corrects something, update your analysis accordingly. If new actions are warranted, include them at the end of your response in this exact format:
ACTION: <type> | <one sentence description> | <person name or blank>

Valid types: follow_up, introduction, add_contact, send_email, other

Only include new actions not already suggested. If no new actions, omit the ACTION lines entirely.

If the user indicates they have already done something, or a pending action is no longer relevant, retire it using the EXACT description string from CURRENT PENDING ACTIONS above:
RETIRE_ACTION: <exact description string>

Only emit RETIRE_ACTION lines for actions that are genuinely superseded. If no actions need retiring, omit entirely.

Always include the following line listing every person from NETWORK who appears meaningfully in this conversation (including earlier turns), plus MY_JOURNAL if the content is personal. Do not omit this line:
SUGGESTED_SAVES: [comma separated names from NETWORK, plus MY_JOURNAL if personal]

If people are mentioned who are NOT already in NETWORK above and should be added as contacts, include at the end:
NEW_PERSON: <full name> | <inferred role or blank> | <inferred company or blank> | <brief notes from the conversation>
Omit entirely if no new people. Maximum 3.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: history
    })

    const responseText = message.content[0].text
    const existingNames = new Set(allPeople.map(p => p.name.toLowerCase()))

    const actionLines = [...responseText.matchAll(/^ACTION: (.+) \| (.+) \| (.*)$/gm)]
    const newActions = actionLines.map(match => {
      const type = match[1].trim()
      const description = match[2].trim()
      const personName = match[3].trim() || null
      // Convert add_contact actions for people not yet in the network into add_person
      if (type === 'add_contact' && personName && !existingNames.has(personName.toLowerCase())) {
        return {
          type: 'add_person',
          description: `Add ${personName} to your network`,
          personName,
          _personData: { name: personName, role: '', company: '', notes: '' }
        }
      }
      return { type, description, personName }
    })

    const retireLines = [...responseText.matchAll(/^RETIRE_ACTION: (.+)$/gm)]
    const retireActions = retireLines.map(match => match[1].trim())

    const savesMatch = responseText.match(/SUGGESTED_SAVES: \[(.+)\]/)
    const suggestedSaves = savesMatch ? savesMatch[1].split(',').map(s => s.trim()).filter(Boolean) : []

    const newPersonLines = [...responseText.matchAll(/^NEW_PERSON: (.+?) \| (.*?) \| (.*?) \| (.*)$/gm)]
    const addPersonActions = newPersonLines
      .map(m => ({ name: m[1].trim(), role: m[2].trim(), company: m[3].trim(), notes: m[4].trim() }))
      .filter(p => p.name && !existingNames.has(p.name.toLowerCase()))
      .map(p => ({
        type: 'add_person',
        description: `Add ${p.name} to your network`,
        personName: p.name,
        _personData: { name: p.name, role: p.role, company: p.company, notes: p.notes }
      }))

    const displayText = responseText
      .replace(/^ACTION:.*$/gm, '')
      .replace(/^RETIRE_ACTION:.*$/gm, '')
      .replace(/^SUGGESTED_SAVES:.*$/gm, '')
      .replace(/^NEW_PERSON:.*$/gm, '')
      .trim()

    res.json({ response: displayText, newActions: [...newActions, ...addPersonActions], retireActions, suggestedSaves })
    track(userId, 'capture_chat')

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── Enrich person profile from free-text context ─────────────────────────────
router.post('/enrich-person', async (req, res) => {
  try {
    const { personId, context } = req.body
    const userId = req.user.userId

    const person = await Person.findOne({ _id: personId, userId })
    if (!person) return res.status(404).json({ error: 'Person not found' })

    const prompt = `Based on the following context about ${person.name}, extract or infer profile fields for a networking CRM.

CONTEXT:
"${context}"

Return ONLY a valid JSON object. Omit any fields you cannot determine. Use these exact keys:
{
  "role": "job title or role",
  "company": "company or organisation name",
  "goals": "what they are working towards or trying to achieve",
  "canHelpWith": "what they can concretely help others with",
  "notes": "relevant background, context, or things to remember",
  "whereMet": "where or how you know them"
}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = message.content[0].text
    const jsonMatch = text.match(/\{[\s\S]+\}/)
    if (!jsonMatch) return res.status(500).json({ error: 'Could not parse AI response' })

    const fields = JSON.parse(jsonMatch[0])
    const update = {}
    if (fields.role) update.role = fields.role
    if (fields.company) update.company = fields.company
    if (fields.goals) update.goals = fields.goals
    if (fields.canHelpWith) update.canHelpWith = fields.canHelpWith
    if (fields.notes) update.notes = fields.notes
    if (fields.whereMet) update.whereMet = fields.whereMet

    const updated = await Person.findOneAndUpdate({ _id: personId, userId }, update, { new: true })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── Draft email ───────────────────────────────────────────────────────────────
router.post('/draft-email', async (req, res) => {
  try {
    const { actionId } = req.body
    const userId = req.user.userId

    const action = await Action.findOne({ _id: actionId, userId })
    if (!action) return res.status(404).json({ error: 'Action not found' })

    const me = await Me.findOne({ userId })
    const allPeople = await Person.find({ userId })
    const allConversations = await Conversation.find({ userId }).sort({ createdAt: -1 }).select('title messages relatedPeople folder createdAt')

    const peopleMap = {}
    allPeople.forEach(p => { peopleMap[p._id.toString()] = p.name })

    let person = null
    if (action.personId) {
      person = await Person.findOne({ _id: action.personId, userId })
    }

    const personConversations = person
      ? allConversations.filter(c => c.relatedPeople.some(pid => pid.toString() === person._id.toString()))
      : []

    const recipientSection = person
      ? `RECIPIENT:
Name: ${person.name}
Role: ${person.role || '—'}
Company: ${person.company || '—'}
Where met: ${person.whereMet || '—'}
Notes: ${person.notes || '—'}

CONVERSATION HISTORY WITH ${person.name.toUpperCase()}:
${formatAllConversations(personConversations, peopleMap)}`
      : `RECIPIENT: ${action.personName || 'unknown'}`

    const prompt = `You are Varys. Draft a real, send-ready email for the user to execute the action below.

MY PROFILE:
Name: ${me?.name || 'unknown'}
Role: ${me?.role || 'unknown'}
Goals: ${me?.goals || 'not specified'}

${recipientSection}

ACTION TO EXECUTE:
Type: ${action.type}
Description: ${action.description}

Calibrate tone to the relationship — infer warmth and formality from the conversation history. If there is no history, default to professional but warm. Do not mention Varys or AI.

For introductions, draft a three-way intro email addressed to both parties.

Respond in this exact format, no preamble:
SUBJECT: [subject line]
BODY:
[email body]`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = message.content[0].text
    const subjectMatch = text.match(/^SUBJECT: (.+)$/m)
    const bodyMatch = text.match(/BODY:\n([\s\S]+)$/)
    const subject = subjectMatch ? subjectMatch[1].trim() : ''
    const body = bodyMatch ? bodyMatch[1].trim() : text

    res.json({ subject, body })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router