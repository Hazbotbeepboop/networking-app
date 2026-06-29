import React, { useState, useEffect, useRef } from 'react'
import { authFetch } from '../App'

const GUIDE_TIPS = [
  {
    title: 'Start with someone',
    body: "Think of a person you spoke with recently — a coffee, a call, a message exchange. It doesn't have to be significant. Describe what happened naturally, as if telling a colleague.",
    starters: [
      'Had a coffee with ',
      'Just got off a call with ',
      'Met someone at an event — ',
      'Been meaning to follow up with ',
    ],
    hint: 'Pick a starter or type freely, then hit Analyse.',
  },
  {
    title: "That's the intelligence response",
    body: "Varys read what you wrote and connected it to your network context. This is the core of how it works — every capture builds a richer picture over time.",
    hint: 'Scroll down to keep the conversation going.',
  },
  {
    title: 'Keep the conversation going',
    body: "The chat box lets you go deeper — ask who to introduce, what to say in a follow-up, or anything about your network. Varys has context from everything you've captured in the past.",
    hint: 'Scroll down to see suggested actions.',
  },
  {
    title: 'Suggested actions',
    body: "If Varys picked up on follow-ups or next steps, they appear here. Accept an action to log it with a due date — it'll show up in your actions tab so nothing slips through.",
    hint: "Scroll down to see contact tags. Dismiss anything that doesn't apply.",
  },
  {
    title: 'Contact tags',
    body: "Varys detected people you mentioned and tagged this conversation to their profiles. You can turn tags on or off — tagged conversations show up when you view that contact's profile later.",
    hint: 'Check or uncheck any name to adjust.',
  },
  {
    title: "You're set",
    body: "Every time you have a conversation worth remembering, log it here. The more you capture — and the more you chat — the more useful Varys becomes.",
    hint: null,
    done: true,
  },
]

const TYPE_LABELS = {
  follow_up: 'Follow up',
  introduction: 'Introduction',
  add_contact: 'Add contact',
  add_person: 'New person',
  send_email: 'Send email',
  other: 'Action'
}

function QuickCapture({
  captureText, setCaptureText,
  captureResult, setCaptureResult,
  captureSaves, setCaptureSaves,
  capturePendingActions, setCapturePendingActions,
  captureAcceptedActions, setCaptureAcceptedActions,
  chatHistory, setChatHistory,
  conversationTitle, setConversationTitle,
  savedConversationId, setSavedConversationId,
  newPeopleData, setNewPeopleData,
}) {
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [suppressingIndex, setSuppressingIndex] = useState(null)
  const [suppressionNote, setSuppressionNote] = useState('')
  const [acceptingIndex, setAcceptingIndex] = useState(null)
  const [acceptDueDate, setAcceptDueDate] = useState('')
  const [saveStatus, setSaveStatus] = useState(null) // 'saving' | 'saved' | null
  const [analyseError, setAnalyseError] = useState(null)
  const [chatError, setChatError] = useState(null)
  const [, setNewPersonForms] = useState({}) // editable fields per new person index
  const [, setAddedPeople] = useState({})      // index → true once added
  const [calSuggestions, setCalSuggestions] = useState([])
  const [calSuggForms, setCalSuggForms] = useState({})
  const [calSuggActions, setCalSuggActions] = useState({})
  const [calSuggOpen, setCalSuggOpen] = useState(false)
  const [calSuggExpandedIndex, setCalSuggExpandedIndex] = useState(null)
  const [addPersonExpandedIndex, setAddPersonExpandedIndex] = useState(null)
  const [addPersonForms, setAddPersonForms] = useState({})
  const savedIdRef = useRef(savedConversationId)
  const chatBottomRef = useRef(null)

  // Guide state — only shows once, gated by localStorage
  const [guideTip, setGuideTip] = useState(0)
  const [guideDone, setGuideDone] = useState(
    () => !!localStorage.getItem('varys_guide_done')
  )

  const dismissGuide = () => {
    localStorage.setItem('varys_guide_done', '1')
    setGuideDone(true)
  }

  const showGuide = !guideDone

  // Keep ref in sync with lifted state (survives remount)
  useEffect(() => { savedIdRef.current = savedConversationId }, [savedConversationId])

  useEffect(() => {
    authFetch('/people')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setPeople(data) })
  }, [])

  useEffect(() => {
    authFetch('/insights/calendar-suggestions')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data.suggestions)) setCalSuggestions(data.suggestions) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatHistory])

  // Auto-advance guide from tip 0 → 1 when analysis completes
  useEffect(() => {
    if (captureResult && showGuide && guideTip === 0) {
      setGuideTip(1)
    }
  }, [captureResult]) // eslint-disable-line

  const handleAnalyse = () => {
    if (!captureText.trim()) return
    setLoading(true)
    setCaptureResult(null)
    setAnalyseError(null)
    setCapturePendingActions([])
    setCaptureAcceptedActions([])
    setChatHistory([])
    setSuppressingIndex(null)
    setNewPeopleData([])
    setNewPersonForms({})
    setAddedPeople({})
    setAddPersonExpandedIndex(null)
    setAddPersonForms({})

    setSavedConversationId(null)
    savedIdRef.current = null
    setSaveStatus(null)

    authFetch('/insights/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: captureText })
    })
      .then(res => res.json())
      .then(data => {
        setCaptureResult(data)
        setNewPeopleData(data.newPeopleData || [])
        setNewPersonForms({})
        setAddedPeople({})
        const initialSaves = {}
        data.suggestedSaves.forEach(name => { initialSaves[name] = true })
        setCaptureSaves(initialSaves)
        const addPersonActions = (data.newPeopleData || []).map(p => ({
          type: 'add_person',
          description: `Add ${p.name} to your network`,
          personName: p.name,
          _personData: { name: p.name, role: p.role || '', company: p.company || '', notes: p.notes || '' }
        }))
        setCapturePendingActions([...(data.suggestedActions || []), ...addPersonActions])
        setConversationTitle(data.conversationTitle || captureText.slice(0, 60))

        // Seed chat history with the initial exchange
        const intelligenceText = data.insights
          .replace(/^INTELLIGENCE\s*/m, '')
          .replace(/^ACTIONS[\s\S]*$/m, '')
          .replace(/^ACTION:.*$/gm, '')
          .replace(/PEOPLE_MENTIONED:.*$/m, '')
          .replace(/SUGGESTED_SAVES:.*$/m, '')
          .trim()

        const seedHistory = [
          { role: 'user', content: captureText },
          { role: 'assistant', content: intelligenceText }
        ]
        setChatHistory(seedHistory)

        // Auto-save immediately
        const savesForSave = data.suggestedSaves || []
        const relatedPeopleNames = savesForSave.filter(n => n !== 'MY_JOURNAL')
        const folder = savesForSave.includes('MY_JOURNAL') ? 'MY_JOURNAL' : null
        setSaveStatus('saving')
        authFetch('/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: data.conversationTitle || captureText.slice(0, 60),
            captureText,
            messages: seedHistory,
            relatedPeopleNames,
            folder
          })
        })
          .then(r => r.json())
          .then(saved => {
            savedIdRef.current = saved._id
            setSavedConversationId(saved._id)
            setSaveStatus('saved')
          })
          .catch(() => setSaveStatus(null))

        setLoading(false)
      })
      .catch(err => { console.error(err); setLoading(false); setAnalyseError('Something went wrong — please try again.') })
  }

  const handleChatSend = () => {
    if (!chatInput.trim() || chatLoading) return
    const userMessage = chatInput.trim()
    setChatInput('')
    setChatLoading(true)
    setChatError(null)

    const updatedHistory = [...chatHistory, { role: 'user', content: userMessage }]
    setChatHistory(updatedHistory)

    authFetch('/insights/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history: updatedHistory, pendingActions: capturePendingActions })
    })
      .then(res => res.json())
      .then(data => {
        // Don't append empty assistant messages to history
        if (data.response) {
          const newHistory = [...updatedHistory, { role: 'assistant', content: data.response }]
          setChatHistory(newHistory)

          // Auto-update saved conversation
          if (savedIdRef.current) {
            authFetch(`/conversations/${savedIdRef.current}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages: newHistory })
            }).catch(() => {})
          }
        }

        // Add new actions — deduplicate by type + person/description key
        if (data.newActions?.length > 0) {
          setCapturePendingActions(prev => {
            const existingKeys = new Set(prev.map(a => `${a.type}|${(a.personName || a.description).toLowerCase()}`))
            const fresh = data.newActions.filter(a => {
              const key = `${a.type}|${(a.personName || a.description).toLowerCase()}`
              return !existingKeys.has(key)
            })
            return fresh.length > 0 ? [...prev, ...fresh] : prev
          })
        }
        // Remove retired actions — Claude returns exact descriptions to retire
        if (data.retireActions?.length > 0) {
          setCapturePendingActions(prev => prev.filter(action =>
            !data.retireActions.includes(action.description)
          ))
        }
        // Merge any newly mentioned people into saves and update
        if (data.suggestedSaves?.length > 0) {
          setCaptureSaves(prev => {
            const merged = { ...prev }
            data.suggestedSaves.forEach(name => { if (!merged[name]) merged[name] = true })
            handleUpdateTags(merged, conversationTitle)
            return merged
          })
        }
        setChatLoading(false)
      })
      .catch(err => { console.error(err); setChatLoading(false); setChatError('Failed to send — please try again.') })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleChatSend()
    }
  }

  const suggestDueDateFromDescription = (description) => {
    const text = description.toLowerCase()
    const dayMatch = text.match(/in (\d+) days?/)
    const weekMatch = text.match(/in (\d+) weeks?/)
    const d = new Date()
    if (dayMatch) { d.setDate(d.getDate() + parseInt(dayMatch[1])); return d.toISOString().split('T')[0] }
    if (weekMatch) { d.setDate(d.getDate() + parseInt(weekMatch[1]) * 7); return d.toISOString().split('T')[0] }
    return ''
  }

  const handleAcceptClick = (index) => {
    setAcceptingIndex(index)
    setAcceptDueDate(suggestDueDateFromDescription(capturePendingActions[index].description))
  }

  const handleAccept = (action, index, dueDate) => {
    authFetch('/insights/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actions: [{ ...action, dueDate: dueDate || null }], sourceCapture: captureText })
    })
      .then(res => res.json())
      .then(saved => {
        setCaptureAcceptedActions(prev => [...prev, { ...action, _id: saved[0]._id }])
        setCapturePendingActions(prev => prev.filter((_, i) => i !== index))
        setAcceptingIndex(null)
        setAcceptDueDate('')
      })
      .catch(err => console.error('Failed to save action:', err))
  }

  const handleUndo = (action, index) => {
    authFetch(`/actions/${action._id}`, { method: 'DELETE' })
      .then(() => {
        setCaptureAcceptedActions(prev => prev.filter((_, i) => i !== index))
        setCapturePendingActions(prev => [...prev, { ...action, _id: undefined }])
      })
      .catch(err => console.error('Failed to undo action:', err))
  }

  const handleDismiss = (index) => {
    setCapturePendingActions(prev => prev.filter((_, i) => i !== index))
  }

  const handleStopSuggesting = (action, index) => {
    authFetch('/suppressions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: action.description,
        personName: action.personName || null,
        note: suppressionNote.trim() || null
      })
    })
      .then(() => {
        setCapturePendingActions(prev => prev.filter((_, i) => i !== index))
        setSuppressingIndex(null)
        setSuppressionNote('')
      })
      .catch(err => console.error('Failed to save suppression:', err))
  }

  const handleUpdateTags = (saves, title) => {
    if (!savedIdRef.current) return
    const selectedNames = Object.entries(saves)
      .filter(([, checked]) => checked)
      .map(([name]) => name)
    const relatedPeopleNames = selectedNames.filter(n => n !== 'MY_JOURNAL')
    const folder = selectedNames.includes('MY_JOURNAL') ? 'MY_JOURNAL' : null
    authFetch(`/conversations/${savedIdRef.current}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, relatedPeopleNames, folder })
    }).catch(err => console.error('Failed to update conversation:', err))
  }

  const handleNewCapture = () => {
    setCaptureText('')
    setCaptureResult(null)
    setCaptureSaves({})
    setCapturePendingActions([])
    setCaptureAcceptedActions([])
    setChatHistory([])
    setConversationTitle('')
    setSuppressingIndex(null)
    setSuppressionNote('')
    setSavedConversationId(null)
    savedIdRef.current = null
    setSaveStatus(null)
    setNewPeopleData([])
    setNewPersonForms({})
    setAddedPeople({})
    setAddPersonExpandedIndex(null)
    setAddPersonForms({})
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Quick capture</h2>
          <p className="text-sm text-gray-400 mt-1">What just happened? Who did you meet? What's on your mind?</p>
        </div>
        {captureResult && (
          <button
            onClick={handleNewCapture}
            className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            + New capture
          </button>
        )}
      </div>

      {/* Guided first-session tip panel */}
      {showGuide && (() => {
        const tip = GUIDE_TIPS[guideTip]
        const isFirst = guideTip === 0
        const isLast = guideTip === GUIDE_TIPS.length - 1
        return (
          <div className="mb-5 rounded-xl overflow-hidden border border-[#B08D57]/30" style={{ backgroundColor: '#fdfaf5' }}>
            <div className="px-5 pt-4 pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium tracking-widest uppercase" style={{ color: '#B08D57' }}>
                      {guideTip + 1} of {GUIDE_TIPS.length}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">{tip.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{tip.body}</p>
                  {tip.hint && (
                    <p className="text-xs text-gray-400 mt-2 italic">{tip.hint}</p>
                  )}
                </div>
                <button
                  onClick={dismissGuide}
                  className="text-gray-300 hover:text-gray-400 transition-colors flex-shrink-0 mt-0.5 text-lg leading-none"
                  title="Dismiss guide"
                >
                  ×
                </button>
              </div>

              {/* Starter prompts — tip 0 only */}
              {isFirst && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {tip.starters.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setCaptureText(s)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-[#B08D57]/40 text-gray-600 hover:bg-[#B08D57]/10 transition-colors"
                    >
                      "{s}…"
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-[#B08D57]/20">
              <button
                onClick={() => setGuideTip(t => Math.max(0, t - 1))}
                disabled={isFirst}
                className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-0 transition-colors"
              >
                ← Back
              </button>
              <div className="flex gap-1">
                {GUIDE_TIPS.map((_, i) => (
                  <div
                    key={i}
                    className="h-1 rounded-full transition-all"
                    style={{
                      width: i === guideTip ? '16px' : '6px',
                      backgroundColor: i <= guideTip ? '#B08D57' : '#e5d9c4',
                    }}
                  />
                ))}
              </div>
              {isLast ? (
                <button
                  onClick={dismissGuide}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity"
                  style={{ backgroundColor: '#1C2B3A', color: '#B08D57' }}
                >
                  Got it
                </button>
              ) : (
                <button
                  onClick={() => setGuideTip(t => Math.min(GUIDE_TIPS.length - 1, t + 1))}
                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        )
      })()}

      {/* Calendar contact suggestions */}
      {calSuggestions.length > 0 && calSuggestions.some((_, i) => !calSuggActions[i]) && (
        <div className="mb-4">
          <button
            onClick={() => setCalSuggOpen(o => !o)}
            className="flex items-center gap-2 w-full text-left mb-2"
          >
            <span className="text-xs font-medium tracking-widest text-gray-400 uppercase">
              From your calendar ({calSuggestions.filter((_, i) => !calSuggActions[i]).length})
            </span>
            <span className="text-gray-300 text-xs">{calSuggOpen ? '▲' : '▼'}</span>
          </button>
          {calSuggOpen && (
            <div className="space-y-2">
              {calSuggestions.map((person, i) => {
                if (calSuggActions[i]) return null

                const defaultForm = {
                  name: person.name,
                  role: '',
                  company: '',
                  whereMet: `${person.eventTitle} (${person.date})`,
                  goals: '',
                  canHelpWith: '',
                  notes: '',
                }
                const form = calSuggForms[i] ?? defaultForm
                const setField = (field, val) =>
                  setCalSuggForms(prev => ({ ...prev, [i]: { ...(prev[i] ?? defaultForm), [field]: val } }))

                const suppress = (type) => {
                  const value = type === 'event' ? person.eventTitle : person.name
                  authFetch('/insights/calendar-suppress', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type, value })
                  }).catch(err => console.error('suppress failed:', err))
                  setCalSuggActions(prev => ({ ...prev, [i]: 'suppressed' }))
                  if (calSuggExpandedIndex === i) setCalSuggExpandedIndex(null)
                }

                const isExpanded = calSuggExpandedIndex === i

                return (
                  <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    {/* Compact row — always visible */}
                    <div className="p-3 space-y-2">
                      <div>
                        <div className="text-sm font-medium text-gray-800">{person.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {person.isPast ? 'Recent' : 'Upcoming'}: {person.eventTitle} — {person.date}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (!calSuggForms[i]) setCalSuggForms(prev => ({ ...prev, [i]: defaultForm }))
                            setCalSuggExpandedIndex(isExpanded ? null : i)
                          }}
                          disabled={calSuggExpandedIndex !== null && !isExpanded}
                          className="px-3 py-1 text-xs font-medium rounded-md disabled:opacity-30 transition-opacity"
                          style={{ backgroundColor: '#1C2B3A', color: '#B08D57' }}
                        >
                          Add to network
                        </button>
                        <button
                          onClick={() => {
                            setCalSuggActions(prev => ({ ...prev, [i]: 'dismissed' }))
                            if (calSuggExpandedIndex === i) setCalSuggExpandedIndex(null)
                          }}
                          className="px-3 py-1 text-xs text-gray-400 border border-gray-200 rounded-md hover:bg-gray-50"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => suppress('event')}
                          className="px-3 py-1 text-xs text-gray-400 border border-gray-200 rounded-md hover:bg-gray-50"
                          title="Stop suggesting this event"
                        >
                          Stop suggesting
                        </button>
                      </div>
                    </div>

                    {/* Expanded form — in place */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                              <input
                                autoFocus
                                value={form.name}
                                onChange={e => setField('name', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
                              <input
                                value={form.role}
                                onChange={e => setField('role', e.target.value)}
                                placeholder="e.g. Founder, Investor"
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Company</label>
                              <input
                                value={form.company}
                                onChange={e => setField('company', e.target.value)}
                                placeholder="e.g. Acme Corp"
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Where met</label>
                              <input
                                value={form.whereMet}
                                onChange={e => setField('whereMet', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Their goals</label>
                            <input
                              value={form.goals}
                              onChange={e => setField('goals', e.target.value)}
                              placeholder="What are they working towards?"
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Can help with</label>
                            <input
                              value={form.canHelpWith}
                              onChange={e => setField('canHelpWith', e.target.value)}
                              placeholder="What can they help you with?"
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                            <textarea
                              value={form.notes}
                              onChange={e => setField('notes', e.target.value)}
                              placeholder="Anything else worth remembering"
                              rows={2}
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors resize-none"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => {
                              authFetch('/people', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  name: form.name || person.name,
                                  role: form.role || '',
                                  company: form.company || '',
                                  whereMet: form.whereMet || '',
                                  goals: form.goals || '',
                                  canHelpWith: form.canHelpWith || '',
                                  notes: form.notes || '',
                                })
                              })
                                .then(res => res.json())
                                .then(saved => {
                                  setPeople(prev => [...prev, saved])
                                  setCalSuggActions(prev => ({ ...prev, [i]: 'added' }))
                                  setCalSuggExpandedIndex(null)
                                })
                                .catch(err => console.error('Failed to add person:', err))
                            }}
                            className="px-4 py-2 text-xs font-medium rounded-lg"
                            style={{ backgroundColor: '#1C2B3A', color: '#B08D57' }}
                          >
                            Add
                          </button>
                          <button
                            onClick={() => setCalSuggExpandedIndex(null)}
                            className="px-4 py-2 text-xs text-gray-400 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Capture box — stays visible so user can see what they wrote */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
        <textarea
          value={captureText}
          onChange={e => setCaptureText(e.target.value)}
          placeholder="Start typing…"
          rows={captureResult ? 2 : 5}
          className="w-full px-5 py-4 text-sm text-gray-800 placeholder-gray-300 outline-none resize-none leading-relaxed"
        />
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
          <span className="text-xs text-gray-400">Varys will analyse your network for connections and actions</span>
          <button
            onClick={handleAnalyse}
            disabled={loading || !captureText.trim()}
            className="px-4 py-2 text-xs font-medium rounded-lg disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: '#1C2B3A', color: '#B08D57' }}
          >
            {loading ? 'Analysing…' : captureResult ? 'Re-analyse' : 'Analyse'}
          </button>
        </div>
      </div>

      {analyseError && (
        <p className="text-xs text-red-500 mt-2 mb-2">{analyseError}</p>
      )}

      {/* Chat thread */}
      {chatHistory.length > 0 && (
        <div className="space-y-3 mb-4">
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1" style={{ backgroundColor: '#1C2B3A' }}>
                    <svg className="w-3 h-3" style={{ color: '#B08D57' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <div
                    className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ backgroundColor: '#1C2B3A', color: '#C8D4DC' }}
                  >
                    {msg.content}
                  </div>
                </div>
              )}
              {msg.role === 'user' && (
                // Skip showing the initial capture as a user bubble — it's already in the textarea
                i > 0 && (
                  <div className="max-w-[85%] bg-white border border-gray-200 rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-gray-800 leading-relaxed">
                    {msg.content}
                  </div>
                )
              )}
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1C2B3A' }}>
                  <svg className="w-3 h-3" style={{ color: '#B08D57' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm" style={{ backgroundColor: '#1C2B3A', color: '#B08D57' }}>
                  Thinking…
                </div>
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>
      )}

      {/* Chat input */}
      {captureResult && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
          <textarea
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a follow-up — clarify, correct, or dig deeper… (Enter to send)"
            rows={2}
            className="w-full px-5 py-4 text-sm text-gray-800 placeholder-gray-300 outline-none resize-none leading-relaxed"
          />
          <div className="flex justify-end px-4 py-3 bg-gray-50 border-t border-gray-100">
            <button
              onClick={handleChatSend}
              disabled={chatLoading || !chatInput.trim()}
              className="px-4 py-2 text-xs font-medium rounded-lg disabled:opacity-40 transition-opacity"
              style={{ backgroundColor: '#1C2B3A', color: '#B08D57' }}
            >
              Send
            </button>
          </div>
        </div>
      )}

      {chatError && (
        <p className="text-xs text-red-500 mt-2 mb-1">{chatError}</p>
      )}

      {/* Actions and save — only show after analysis */}
      {captureResult && (
        <div className="space-y-6">

          {/* Pending actions */}
          {capturePendingActions.length > 0 && (
            <div>
              <div className="text-xs font-medium tracking-widest text-gray-400 uppercase mb-3">Suggested actions</div>
              <div className="space-y-2">
                {capturePendingActions.map((action, i) => {
                  if (action.type === 'add_person') {
                    const defaultForm = { ...action._personData, whereMet: '', goals: '', canHelpWith: '' }
                    const form = addPersonForms[i] ?? defaultForm
                    const setField = (field, val) =>
                      setAddPersonForms(prev => ({ ...prev, [i]: { ...(prev[i] ?? defaultForm), [field]: val } }))
                    const isExpanded = addPersonExpandedIndex === i
                    const handleLater = () => {
                      authFetch('/insights/actions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ actions: [{ type: 'add_contact', description: action.description, dueDate: null }], sourceCapture: captureText })
                      })
                        .then(res => res.json())
                        .then(saved => {
                          setCaptureAcceptedActions(prev => [...prev, { type: 'add_contact', description: action.description, _id: saved[0]._id }])
                          setCapturePendingActions(prev => prev.filter((_, idx) => idx !== i))
                          if (addPersonExpandedIndex === i) setAddPersonExpandedIndex(null)
                        })
                        .catch(err => console.error('Failed to save action:', err))
                    }
                    const handleAddSubmit = () => {
                      authFetch('/people', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          name: form.name || action.personName,
                          role: form.role || '',
                          company: form.company || '',
                          whereMet: form.whereMet || '',
                          goals: form.goals || '',
                          canHelpWith: form.canHelpWith || '',
                          notes: form.notes || '',
                        })
                      })
                        .then(res => res.json())
                        .then(saved => {
                          setPeople(prev => [...prev, saved])
                          const newSaves = { ...captureSaves, [form.name || action.personName]: true }
                          setCaptureSaves(newSaves)
                          handleUpdateTags(newSaves, conversationTitle)
                          setCaptureAcceptedActions(prev => [...prev, { type: 'add_person', description: `Added ${form.name || action.personName}`, _id: saved._id }])
                          setCapturePendingActions(prev => prev.filter((_, idx) => idx !== i))
                          setAddPersonExpandedIndex(null)
                        })
                        .catch(err => console.error('Failed to add person:', err))
                    }
                    return (
                      <div key={i} className="bg-white border border-gray-200 rounded-lg">
                        <div className="p-3 space-y-2">
                          <div className="flex items-start gap-3">
                            <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 mt-0.5" style={{ backgroundColor: '#F5EDD8', color: '#B08D57' }}>
                              New person
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-gray-800">{action.description}</div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                if (!addPersonForms[i]) setAddPersonForms(prev => ({ ...prev, [i]: defaultForm }))
                                setAddPersonExpandedIndex(isExpanded ? null : i)
                              }}
                              disabled={addPersonExpandedIndex !== null && !isExpanded}
                              className="px-3 py-1 text-xs font-medium rounded-md disabled:opacity-30 transition-opacity"
                              style={{ backgroundColor: '#1C2B3A', color: '#B08D57' }}
                            >
                              Add
                            </button>
                            <button
                              onClick={handleLater}
                              className="px-3 py-1 text-xs text-gray-400 border border-gray-200 rounded-md hover:bg-gray-50"
                            >
                              Later
                            </button>
                            <button
                              onClick={() => { handleDismiss(i); if (addPersonExpandedIndex === i) setAddPersonExpandedIndex(null) }}
                              className="px-3 py-1 text-xs text-gray-400 border border-gray-200 rounded-md hover:bg-gray-50"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                                  <input
                                    autoFocus
                                    value={form.name}
                                    onChange={e => setField('name', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
                                  <input
                                    value={form.role}
                                    onChange={e => setField('role', e.target.value)}
                                    placeholder="e.g. Founder, Investor"
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Company</label>
                                  <input
                                    value={form.company}
                                    onChange={e => setField('company', e.target.value)}
                                    placeholder="e.g. Acme Corp"
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Where met</label>
                                  <input
                                    value={form.whereMet}
                                    onChange={e => setField('whereMet', e.target.value)}
                                    placeholder="e.g. Coffee with Tom"
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Their goals</label>
                                <input
                                  value={form.goals}
                                  onChange={e => setField('goals', e.target.value)}
                                  placeholder="What are they working towards?"
                                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Can help with</label>
                                <input
                                  value={form.canHelpWith}
                                  onChange={e => setField('canHelpWith', e.target.value)}
                                  placeholder="What can they help you with?"
                                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                                <textarea
                                  value={form.notes}
                                  onChange={e => setField('notes', e.target.value)}
                                  placeholder="Anything else worth remembering"
                                  rows={2}
                                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors resize-none"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                              <button
                                onClick={handleAddSubmit}
                                className="px-4 py-2 text-xs font-medium rounded-lg"
                                style={{ backgroundColor: '#1C2B3A', color: '#B08D57' }}
                              >
                                Add
                              </button>
                              <button
                                onClick={() => setAddPersonExpandedIndex(null)}
                                className="px-4 py-2 text-xs text-gray-400 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  }
                  return (
                    <div key={i} className="bg-white border border-gray-200 rounded-lg">
                      <div className="p-3 space-y-2">
                        <div className="flex items-start gap-3">
                          <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 mt-0.5" style={{ backgroundColor: '#F5EDD8', color: '#B08D57' }}>
                            {TYPE_LABELS[action.type] || action.type}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-800">{action.description}</div>
                            {action.personName && <div className="text-xs text-gray-400 mt-0.5">{action.personName}</div>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleAcceptClick(i)}
                            className="px-3 py-1 text-xs font-medium rounded-md"
                            style={{ backgroundColor: '#1C2B3A', color: '#B08D57' }}>
                            Accept
                          </button>
                          <button onClick={() => handleDismiss(i)}
                            className="px-3 py-1 text-xs text-gray-400 border border-gray-200 rounded-md hover:bg-gray-50">
                            Dismiss
                          </button>
                          <button
                            onClick={() => { setSuppressingIndex(suppressingIndex === i ? null : i); setSuppressionNote('') }}
                            className="px-3 py-1 text-xs text-gray-400 border border-gray-200 rounded-md hover:bg-gray-50">
                            Stop suggesting
                          </button>
                        </div>
                      </div>
                      {acceptingIndex === i && (
                        <div className="px-3 pb-3 pt-2 border-t border-gray-100">
                          <div className="text-xs text-gray-400 mb-2">Set a due date <span className="text-gray-300">(optional)</span></div>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {[3, 7, 14].map(days => {
                              const d = new Date(); d.setDate(d.getDate() + days)
                              const val = d.toISOString().split('T')[0]
                              return (
                                <button key={days} onClick={() => setAcceptDueDate(val)}
                                  className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${acceptDueDate === val ? 'border-[#B08D57] text-[#B08D57]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                  +{days}d
                                </button>
                              )
                            })}
                            <input type="date" value={acceptDueDate}
                              onChange={e => setAcceptDueDate(e.target.value)}
                              className="px-2 py-1 text-xs border border-gray-200 rounded-md outline-none focus:border-[#B08D57] text-gray-500" />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleAccept(action, i, acceptDueDate)}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg"
                              style={{ backgroundColor: '#1C2B3A', color: '#B08D57' }}>
                              Save
                            </button>
                            <button onClick={() => handleAccept(action, i, null)}
                              className="px-3 py-1.5 text-xs text-gray-400 border border-gray-200 rounded-lg hover:bg-gray-50">
                              No date
                            </button>
                            <button onClick={() => { setAcceptingIndex(null); setAcceptDueDate('') }}
                              className="px-3 py-1.5 text-xs text-gray-300 hover:text-gray-500">
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                      {suppressingIndex === i && (
                        <div className="px-3 pb-3 pt-1 border-t border-gray-100">
                          <div className="text-xs text-gray-400 mb-2">Why? <span className="text-gray-300">(optional — helps Varys be more precise)</span></div>
                          <textarea
                            value={suppressionNote}
                            onChange={e => setSuppressionNote(e.target.value)}
                            placeholder="e.g. Already tried this, dead end / Not the right time"
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors resize-none placeholder-gray-300"
                            autoFocus
                          />
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => handleStopSuggesting(action, i)}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg"
                              style={{ backgroundColor: '#1C2B3A', color: '#B08D57' }}>
                              Confirm
                            </button>
                            <button onClick={() => { setSuppressingIndex(null); setSuppressionNote('') }}
                              className="px-3 py-1.5 text-xs text-gray-400 border border-gray-200 rounded-lg hover:bg-gray-50">
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Accepted actions */}
          {captureAcceptedActions.length > 0 && (
            <div>
              <div className="text-xs font-medium tracking-widest text-gray-400 uppercase mb-3">Saved to actions</div>
              <div className="space-y-2">
                {captureAcceptedActions.map((action, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-100 rounded-lg">
                    <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 mt-0.5" style={{ backgroundColor: '#F5EDD8', color: '#B08D57' }}>
                      {TYPE_LABELS[action.type] || action.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-600">{action.description}</div>
                      {action.personName && <div className="text-xs text-gray-400 mt-0.5">{action.personName}</div>}
                    </div>
                    <button onClick={() => handleUndo(action, i)}
                      className="text-xs text-gray-300 hover:text-gray-500 flex-shrink-0 transition-colors">
                      Undo
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-gray-100" />

          {/* Saved conversation */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-medium tracking-widest text-gray-400 uppercase">Conversation</div>
              {saveStatus === 'saving' && <span className="text-xs text-gray-300">Saving…</span>}
              {saveStatus === 'saved' && <span className="text-xs text-gray-300">Auto-saved ✓</span>}
            </div>

            {/* Editable title */}
            <div className="flex gap-2 mb-3">
              <input
                value={conversationTitle}
                onChange={e => setConversationTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleUpdateTags(captureSaves, conversationTitle) } }}
                placeholder="Conversation title…"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors"
              />
              <button
                onClick={() => handleUpdateTags(captureSaves, conversationTitle)}
                className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                style={{ color: '#B08D57' }}
              >
                Save
              </button>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input type="checkbox" checked={captureSaves['MY_JOURNAL'] || false}
                  onChange={e => {
                    const newSaves = { ...captureSaves, MY_JOURNAL: e.target.checked }
                    setCaptureSaves(newSaves)
                    handleUpdateTags(newSaves, conversationTitle)
                  }}
                  className="accent-[#B08D57]" />
                <span className="text-sm text-gray-800">My journal</span>
              </label>
              {people.map(person => (
                <label key={person._id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input type="checkbox" checked={captureSaves[person.name] || false}
                    onChange={e => {
                      const newSaves = { ...captureSaves, [person.name]: e.target.checked }
                      setCaptureSaves(newSaves)
                      handleUpdateTags(newSaves, conversationTitle)
                    }}
                    className="accent-[#B08D57]" />
                  <div>
                    <div className="text-sm text-gray-800">{person.name}</div>
                    {person.role && <div className="text-xs text-gray-400">{person.role}{person.company ? ` · ${person.company}` : ''}</div>}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default QuickCapture