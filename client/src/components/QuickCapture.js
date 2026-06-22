import React, { useState, useEffect, useRef } from 'react'
import { authFetch } from '../App'

const TYPE_LABELS = {
  follow_up: 'Follow up',
  introduction: 'Introduction',
  add_contact: 'Add contact',
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
  const savedIdRef = useRef(savedConversationId)
  const chatBottomRef = useRef(null)

  // Keep ref in sync with lifted state (survives remount)
  useEffect(() => { savedIdRef.current = savedConversationId }, [savedConversationId])

  useEffect(() => {
    authFetch('/people')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setPeople(data) })
  }, [])

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatHistory])

  const handleAnalyse = () => {
    if (!captureText.trim()) return
    setLoading(true)
    setCaptureResult(null)
    setCapturePendingActions([])
    setCaptureAcceptedActions([])
    setChatHistory([])
    setSuppressingIndex(null)

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
        const initialSaves = {}
        data.suggestedSaves.forEach(name => { initialSaves[name] = true })
        setCaptureSaves(initialSaves)
        setCapturePendingActions(data.suggestedActions || [])
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
      .catch(err => { console.error(err); setLoading(false) })
  }

  const handleChatSend = () => {
    if (!chatInput.trim() || chatLoading) return
    const userMessage = chatInput.trim()
    setChatInput('')
    setChatLoading(true)

    const updatedHistory = [...chatHistory, { role: 'user', content: userMessage }]
    setChatHistory(updatedHistory)

    authFetch('/insights/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history: updatedHistory, pendingActions: capturePendingActions })
    })
      .then(res => res.json())
      .then(data => {
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

        // Add new actions
        if (data.newActions?.length > 0) {
          setCapturePendingActions(prev => [...prev, ...data.newActions])
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
      .catch(err => { console.error(err); setChatLoading(false) })
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

      {/* Actions and save — only show after analysis */}
      {captureResult && (
        <div className="space-y-6">

          {/* Pending actions */}
          {capturePendingActions.length > 0 && (
            <div>
              <div className="text-xs font-medium tracking-widest text-gray-400 uppercase mb-3">Suggested actions</div>
              <div className="space-y-2">
                {capturePendingActions.map((action, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-start gap-3 p-3">
                      <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 mt-0.5" style={{ backgroundColor: '#F5EDD8', color: '#B08D57' }}>
                        {TYPE_LABELS[action.type] || action.type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-800">{action.description}</div>
                        {action.personName && <div className="text-xs text-gray-400 mt-0.5">{action.personName}</div>}
                      </div>
                    <div className="flex gap-2 flex-shrink-0">
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
                ))}
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