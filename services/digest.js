require('dotenv').config()
const Anthropic = require('@anthropic-ai/sdk')
const sgMail = require('@sendgrid/mail')
const mongoose = require('mongoose')

const User = require('../models/User')
const Person = require('../models/Person')
const Me = require('../models/Me')
const Action = require('../models/Action')
const Conversation = require('../models/Conversation')

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

// ── Tavily search ─────────────────────────────────────────────────────────────

async function tavilySearch(query) {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: 'basic',
      max_results: 5,
      include_answer: false,
      days: 365,
    }),
  })
  if (!res.ok) throw new Error(`Tavily error: ${res.status}`)
  const data = await res.json()
  return (data.results || []).map(r => ({
    title: r.title,
    url: r.url,
    content: r.content || r.snippet || '',
    score: r.score || 0,
    published_date: r.published_date || null,
  }))
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatConversationsForPrompt(conversations, peopleMap) {
  if (!conversations.length) return 'None.'
  return conversations.map(c => {
    const date = new Date(c.createdAt).toLocaleDateString('en-AU')
    const people = (c.relatedPeople || [])
      .map(id => peopleMap[id.toString()])
      .filter(Boolean)
      .join(', ')
    const header = `--- [${date}] "${c.title}"${people ? ` (${people})` : ''}`
    const messages = (c.messages || []).map(m =>
      `${m.role === 'user' ? 'User' : 'Varys'}: ${m.content}`
    ).join('\n')
    return `${header}\n${messages}`
  }).join('\n\n')
}

function daysSince(date) {
  return Math.floor((Date.now() - new Date(date)) / (1000 * 60 * 60 * 24))
}

function scoreContact(person, recentConvPeople, pendingActionPeople) {
  let score = 0
  const id = person._id.toString()
  if (recentConvPeople.has(id)) score += 3
  if (pendingActionPeople.has(id)) score += 2
  const age = daysSince(person.createdAt)
  if (age < 30) score += 2
  if (age < 90) score += 1
  return score
}

// ── Per-contact intelligence ──────────────────────────────────────────────────

async function analyseContact({ person, newsResults, me, conversations, peopleMap }) {
  const newsText = newsResults.length
    ? newsResults.map(r => {
        const date = r.published_date ? ` [${r.published_date}]` : ''
        const score = r.score ? ` [relevance: ${r.score.toFixed(2)}]` : ''
        return `- ${r.title}${date}${score}\n  ${r.url}\n  ${r.content}`
      }).join('\n\n')
    : null

  if (!newsText && conversations.length === 0) return null

  const personConvs = conversations.filter(c =>
    c.relatedPeople.some(pid => pid.toString() === person._id.toString())
  )
  const lastTouched = personConvs.length > 0
    ? daysSince(personConvs[0].createdAt)
    : null

  const prompt = `You are Varys, a private intelligence advisor. Analyse this contact and surface ONE concise insight (2–4 sentences max) for the user's weekly digest. Be specific and direct — no filler.

USER PROFILE:
Name: ${me?.name || 'unknown'}
Role: ${me?.role || 'unknown'}
Goals: ${me?.goals || 'not specified'}
Looking for: ${me?.lookingFor || 'not specified'}

CONTACT:
Name: ${person.name}
Role: ${person.role || '—'}
Company: ${person.company || '—'}
Goals: ${person.goals || '—'}
Can help with: ${person.canHelpWith || '—'}
Notes: ${person.notes || '—'}
Last conversation: ${lastTouched !== null ? `${lastTouched} days ago` : 'never'}

RECENT NEWS ABOUT THIS CONTACT/COMPANY:
${newsText || 'No recent news found.'}

CONVERSATION HISTORY WITH THIS CONTACT:
${formatConversationsForPrompt(personConvs, peopleMap)}

If there is a genuinely useful insight connecting the news (or the relationship gap) to the user's goals, write it. Connect the news to the user's specific situation and this contact. End with a one-line suggested action if obvious.
When referencing a news source, link it inline using markdown: [anchor text](url). Only use URLs that appear verbatim in the news results above — do not invent or modify URLs.
IMPORTANT: Before using any news result, verify it is plausibly about THIS specific person — cross-check against their role (${person.role || 'unknown'}), company (${person.company || 'unknown'}), and any context from the conversation history. If the news appears to be about a different person with the same name, discard it entirely.
If there is nothing worth surfacing, or you cannot confirm the news is about this specific person, respond with exactly: SKIP`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].text.trim()
  if (text === 'SKIP' || text.startsWith('SKIP')) return null

  return {
    person,
    insight: text,
    lastTouched,
    hasNews: !!newsText,
    sources: newsResults.slice(0, 3),
  }
}

// ── Markdown → HTML ───────────────────────────────────────────────────────────

function mdToHtml(text) {
  return text
    .replace(/\[(.+?)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" style="color:#B08D57;text-decoration:underline;">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
}

function formatLastContact(days) {
  if (days === null) return null
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

// ── Email HTML builder ────────────────────────────────────────────────────────

function buildEmailHtml({ me, insights, overdueActions, upcomingActions, weekOf }) {
  const navy = '#1C2B3A'
  const gold = '#B08D57'

  const insightBlocks = insights.length
    ? insights.map(({ person, insight, lastTouched }) => {
        return `
        <div style="margin-bottom:24px;padding:16px;background:#f9f9f9;border-left:3px solid ${gold};border-radius:4px;">
          <div style="font-size:13px;font-weight:600;color:${navy};margin-bottom:4px;">
            ${person.name}
            ${person.role ? `<span style="font-weight:400;color:#888;"> · ${person.role}${person.company ? ` at ${person.company}` : ''}</span>` : ''}
          </div>
          ${lastTouched !== null ? `<div style="font-size:11px;color:#aaa;margin-bottom:8px;">Last contact: ${formatLastContact(lastTouched)}</div>` : ''}
          <div style="font-size:13px;color:#444;line-height:1.6;">${mdToHtml(insight)}</div>
        </div>`
      }).join('')
    : `<p style="color:#999;font-size:13px;">Nothing notable in your network this week.</p>`

  const actionRow = (a) => {
    const due = a.dueDate
      ? new Date(a.dueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
      : null
    return `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#333;">${a.description}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:12px;color:#888;white-space:nowrap;padding-left:12px;">${a.personName || ''}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:12px;color:#888;white-space:nowrap;padding-left:12px;">${due || ''}</td>
    </tr>`
  }

  const overdueBlock = overdueActions.length ? `
    <h2 style="font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#c0392b;margin:32px 0 12px;">Overdue</h2>
    <table style="width:100%;border-collapse:collapse;">${overdueActions.map(actionRow).join('')}</table>
  ` : ''

  const upcomingBlock = upcomingActions.length ? `
    <h2 style="font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${navy};margin:32px 0 12px;">Due this week</h2>
    <table style="width:100%;border-collapse:collapse;">${upcomingActions.map(actionRow).join('')}</table>
  ` : ''

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:8px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="background:${navy};padding:24px 32px;">
          <div style="font-size:14px;font-weight:600;letter-spacing:0.15em;color:#fff;">
            VAR<span style="color:${gold};">Y</span>S
          </div>
          <div style="font-size:12px;color:#7a99b0;margin-top:4px;">Weekly intelligence · ${weekOf}</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">

          <p style="font-size:14px;color:#666;margin:0 0 24px;">
            ${me?.name ? `${me.name.split(' ')[0]}, here` : 'Here'}'s what's worth your attention this week.
          </p>

          <h2 style="font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${navy};margin:0 0 16px;">Network intelligence</h2>
          ${insightBlocks}

          ${overdueBlock}
          ${upcomingBlock}

          ${(!overdueActions.length && !upcomingActions.length) ? `<p style="font-size:13px;color:#999;margin-top:32px;">No pending actions.</p>` : ''}

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 32px;border-top:1px solid #f0f0f0;">
          <p style="font-size:11px;color:#bbb;margin:0;">Varys · your private networking intelligence</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── Main digest runner ────────────────────────────────────────────────────────

async function runDigestForUser(user) {
  console.log(`[digest] Processing ${user.email}`)

  const userId = user._id

  const [me, allPeople, allConversations, pendingActions] = await Promise.all([
    Me.findOne({ userId }),
    Person.find({ userId }),
    Conversation.find({ userId }).sort({ createdAt: -1 }).select('title messages relatedPeople folder createdAt'),
    Action.find({ userId, status: 'pending' }).populate('personId', 'name'),
  ])

  if (!allPeople.length) {
    console.log(`[digest] ${user.email} has no contacts — skipping`)
    return
  }

  const peopleMap = {}
  allPeople.forEach(p => { peopleMap[p._id.toString()] = p.name })

  const recentConvPeople = new Set()
  allConversations.slice(0, 30).forEach(c =>
    c.relatedPeople.forEach(id => recentConvPeople.add(id.toString()))
  )
  const pendingActionPeople = new Set(
    pendingActions.filter(a => a.personId).map(a => a.personId._id.toString())
  )

  const scored = allPeople
    .map(p => ({ person: p, score: scoreContact(p, recentConvPeople, pendingActionPeople) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 25)

  const BATCH = 5
  const contactInsights = []

  for (let i = 0; i < scored.length; i += BATCH) {
    const batch = scored.slice(i, i + BATCH)
    const results = await Promise.all(batch.map(async ({ person }) => {
      const queryParts = [person.name, person.role, person.company].filter(Boolean)
        const query = queryParts.join(' ')
      try {
        const news = await tavilySearch(query)
        const BLOCKED_DOMAINS = [
          'linkedin.com', 'crunchbase.com', 'bloomberg.com/profile',
          'facebook.com', 'twitter.com', 'x.com', 'instagram.com',
          'wikipedia.org', 'yellowpages.com.au', 'whitepages.com.au',
          'seek.com.au', 'indeed.com', 'glassdoor.com',
        ]
        const filtered = news.filter(r =>
          !BLOCKED_DOMAINS.some(domain => r.url.includes(domain))
        )
        return { person, news: filtered }
      } catch (err) {
        console.warn(`[digest] Tavily failed for ${person.name}:`, err.message)
        return { person, news: [] }
      }
    }))

    for (const { person, news } of results) {
      const insight = await analyseContact({
        person,
        newsResults: news,
        me,
        conversations: allConversations,
        peopleMap,
      })
      if (insight) contactInsights.push(insight)
    }
  }

  contactInsights.sort((a, b) => {
    if (a.hasNews && !b.hasNews) return -1
    if (!a.hasNews && b.hasNews) return 1
    return (a.lastTouched ?? 999) - (b.lastTouched ?? 999)
  })

  const now = new Date(); now.setHours(0, 0, 0, 0)
  const in7 = new Date(now); in7.setDate(in7.getDate() + 7)

  const overdueActions = pendingActions.filter(a => {
    if (!a.dueDate) return false
    return new Date(a.dueDate) < now
  })
  const upcomingActions = pendingActions.filter(a => {
    if (!a.dueDate) return false
    const d = new Date(a.dueDate)
    return d >= now && d <= in7
  })

  const weekOf = now.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })

  const html = buildEmailHtml({ me, insights: contactInsights, overdueActions, upcomingActions, weekOf })

  const insightCount = contactInsights.length
  const subject = insightCount > 0
    ? `Varys · ${insightCount} thing${insightCount !== 1 ? 's' : ''} worth your attention this week`
    : `Varys · your weekly network digest`

  await sgMail.send({
    to: user.email,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject,
    html,
  })

  console.log(`[digest] Sent to ${user.email} — ${insightCount} insights, ${overdueActions.length} overdue, ${upcomingActions.length} upcoming`)
}

async function runDigest() {
  const users = await User.find({})
  console.log(`[digest] Running for ${users.length} user(s)`)
  for (const user of users) {
    try {
      await runDigestForUser(user)
    } catch (err) {
      console.error(`[digest] Failed for ${user.email}:`, err.message)
    }
  }
}

module.exports = { runDigest }