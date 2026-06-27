import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { authFetch } from '../App'

const EMAIL_DRAFTABLE = ['follow_up', 'introduction', 'send_email']

const TYPE_LABELS = {
  follow_up: 'Follow up',
  introduction: 'Introduction',
  add_contact: 'Add contact',
  send_email: 'Send email',
  other: 'Action'
}

function getDueStatus(dueDate) {
  if (!dueDate) return 'none'
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const due = new Date(dueDate); due.setHours(0, 0, 0, 0)
  const diff = (due - now) / (1000 * 60 * 60 * 24)
  if (diff < 0) return 'overdue'
  if (diff <= 3) return 'soon'
  return 'upcoming'
}

function sortActions(actions) {
  const order = { overdue: 0, soon: 1, upcoming: 2, none: 3 }
  return [...actions].sort((a, b) => {
    const sa = order[getDueStatus(a.dueDate)]
    const sb = order[getDueStatus(b.dueDate)]
    if (sa !== sb) return sa - sb
    if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate)
    return new Date(b.createdAt) - new Date(a.createdAt)
  })
}

function Actions() {
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(null)
  const [outcomeText, setOutcomeText] = useState('')
  const [editingDueDate, setEditingDueDate] = useState(null) // action._id
  const [editingDescription, setEditingDescription] = useState(null) // action._id
  const [editDescriptionText, setEditDescriptionText] = useState('')
  const [draftingEmail, setDraftingEmail] = useState(null) // action._id
  const [emailDrafts, setEmailDrafts] = useState({}) // { [actionId]: { subject, body } }
  const [draftLoading, setDraftLoading] = useState(null) // action._id

  useEffect(() => {
    authFetch('/actions')
      .then(res => res.json())
      .then(data => {
        setActions(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleDone = (id) => {
    authFetch(`/actions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done', outcome: outcomeText.trim() || null })
    }).then(() => {
      setActions(prev => prev.filter(a => a._id !== id))
      setCompleting(null)
      setOutcomeText('')
    })
  }

  const handleDismiss = (id) => {
    authFetch(`/actions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'dismissed' })
    }).then(() => {
      setActions(prev => prev.filter(a => a._id !== id))
    })
  }

  const handleDraftEmail = (action) => {
    if (draftingEmail === action._id) { setDraftingEmail(null); return }
    setDraftingEmail(action._id)
    if (emailDrafts[action._id]) return
    setDraftLoading(action._id)
    authFetch('/insights/draft-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionId: action._id })
    }).then(res => res.json()).then(data => {
      setEmailDrafts(prev => ({ ...prev, [action._id]: { subject: data.subject, body: data.body } }))
      setDraftLoading(null)
    }).catch(() => setDraftLoading(null))
  }

  const handleSaveDescription = (id) => {
    const text = editDescriptionText.trim()
    if (!text) return
    authFetch(`/actions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: text })
    }).then(res => res.json()).then(updated => {
      setActions(prev => prev.map(a => a._id === id ? { ...a, description: updated.description } : a))
      setEditingDescription(null)
    })
  }

  const handleSetDueDate = (id, dueDate) => {
    authFetch(`/actions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dueDate: dueDate || null })
    }).then(res => res.json()).then(updated => {
      setActions(prev => prev.map(a => a._id === id ? { ...a, dueDate: updated.dueDate } : a))
      setEditingDueDate(null)
    })
  }

  if (loading) return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900">Actions</h2>
        <div className="h-3 bg-gray-100 rounded w-32 mt-2 animate-pulse" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
            <div className="flex items-start gap-4">
              <div className="h-5 w-20 bg-gray-200 rounded-full flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="h-3.5 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/4" />
              </div>
              <div className="h-7 w-16 bg-gray-200 rounded-lg flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900">Actions</h2>
        <p className="text-sm text-gray-400 mt-1">
          {actions.length > 0
            ? `${actions.length} pending action${actions.length !== 1 ? 's' : ''}${actions.filter(a => getDueStatus(a.dueDate) === 'overdue').length > 0 ? ` · ${actions.filter(a => getDueStatus(a.dueDate) === 'overdue').length} overdue` : ''}`
            : 'Nothing pending'}
        </p>
      </div>

      {actions.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <div className="text-2xl mb-3">✓</div>
          <p className="text-sm text-gray-400">No pending actions. New ones will appear here after a Quick Capture.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortActions(actions).map(action => {
            const dueStatus = getDueStatus(action.dueDate)
            const borderColor = dueStatus === 'overdue' ? 'border-red-200' : dueStatus === 'soon' ? 'border-amber-200' : 'border-gray-200'
            return (
            <div key={action._id} className={`bg-white border ${borderColor} rounded-xl p-4`}>
              <div className="flex items-start gap-3">
                <span
                  className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: '#F5EDD8', color: '#B08D57' }}
                >
                  {TYPE_LABELS[action.type] || action.type}
                </span>

                <div className="flex-1 min-w-0">
                  {editingDescription === action._id ? (
                    <div>
                      <textarea
                        value={editDescriptionText}
                        onChange={e => setEditDescriptionText(e.target.value)}
                        rows={2}
                        autoFocus
                        className="w-full px-2 py-1.5 text-sm border border-[#B08D57] rounded-lg outline-none resize-none"
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveDescription(action._id) }
                          if (e.key === 'Escape') setEditingDescription(null)
                        }}
                      />
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => handleSaveDescription(action._id)} className="text-xs font-medium" style={{ color: '#B08D57' }}>Save</button>
                        <button onClick={() => setEditingDescription(null)} className="text-xs text-gray-300 hover:text-gray-500">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="text-sm text-gray-800 leading-snug cursor-pointer hover:text-gray-600 group"
                      onClick={() => { setEditingDescription(action._id); setEditDescriptionText(action.description) }}
                      title="Click to edit"
                    >
                      {action.description}
                      <span className="ml-1.5 text-gray-200 group-hover:text-gray-400 text-xs">✎</span>
                    </div>
                  )}
                  {action.personId ? (
                    <Link
                      to={`/people/${action.personId._id}`}
                      className="text-xs mt-1 inline-block hover:underline"
                      style={{ color: '#B08D57' }}
                    >
                      {action.personId.name}
                      {action.personId.role ? ` · ${action.personId.role}` : ''}
                    </Link>
                  ) : action.personName ? (
                    <div className="text-xs text-gray-400 mt-1">{action.personName}</div>
                  ) : null}
                  <div className="text-xs text-gray-300 mt-1">
                    {new Date(action.createdAt).toLocaleDateString('en-AU', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </div>

                  {/* Due date */}
                  {editingDueDate === action._id ? (
                    <div className="flex items-center gap-2 mt-2">
                      <input type="date"
                        defaultValue={action.dueDate ? new Date(action.dueDate).toISOString().split('T')[0] : ''}
                        className="px-2 py-1 text-xs border border-gray-200 rounded-md outline-none focus:border-[#B08D57] text-gray-500"
                        onKeyDown={e => { if (e.key === 'Enter') handleSetDueDate(action._id, e.target.value) }}
                        autoFocus
                        id={`due-${action._id}`}
                      />
                      <button onClick={() => handleSetDueDate(action._id, document.getElementById(`due-${action._id}`).value)}
                        className="text-xs font-medium" style={{ color: '#B08D57' }}>Save</button>
                      {action.dueDate && <button onClick={() => handleSetDueDate(action._id, null)}
                        className="text-xs text-gray-300 hover:text-red-400">Clear</button>}
                      <button onClick={() => setEditingDueDate(null)}
                        className="text-xs text-gray-300 hover:text-gray-500">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setEditingDueDate(action._id)}
                      className={`text-xs mt-1.5 inline-block ${
                        dueStatus === 'overdue' ? 'text-red-400 font-medium' :
                        dueStatus === 'soon' ? 'text-amber-500 font-medium' :
                        dueStatus === 'upcoming' ? 'text-gray-400' :
                        'text-gray-300 hover:text-gray-400'
                      }`}>
                      {action.dueDate
                        ? `Due ${new Date(action.dueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}${dueStatus === 'overdue' ? ' · overdue' : ''}`
                        : '+ set due date'}
                    </button>
                  )}
                </div>
              </div>

              {completing !== action._id && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {EMAIL_DRAFTABLE.includes(action.type) && (
                    <button
                      onClick={() => handleDraftEmail(action)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50"
                      style={draftingEmail === action._id ? { backgroundColor: '#F5EDD8', color: '#B08D57', borderColor: '#B08D57' } : { color: '#B08D57' }}
                    >
                      {draftLoading === action._id ? '…' : 'Draft email'}
                    </button>
                  )}
                  <button
                    onClick={() => { setCompleting(action._id); setOutcomeText('') }}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg"
                    style={{ backgroundColor: '#1C2B3A', color: '#B08D57' }}
                  >
                    Done
                  </button>
                  <button
                    onClick={() => handleDismiss(action._id)}
                    className="px-3 py-1.5 text-xs text-gray-400 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    Not relevant
                  </button>
                </div>
              )}

              {/* Email draft panel */}
              {draftingEmail === action._id && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  {draftLoading === action._id ? (
                    <div className="text-xs text-gray-400 py-2">Drafting…</div>
                  ) : emailDrafts[action._id] ? (
                    <>
                      <div className="mb-2">
                        <div className="text-xs text-gray-400 mb-1">Subject</div>
                        <input
                          type="text"
                          value={emailDrafts[action._id].subject}
                          onChange={e => setEmailDrafts(prev => ({ ...prev, [action._id]: { ...prev[action._id], subject: e.target.value } }))}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors"
                        />
                      </div>
                      <div className="mb-3">
                        <div className="text-xs text-gray-400 mb-1">Body</div>
                        <textarea
                          value={emailDrafts[action._id].body}
                          onChange={e => setEmailDrafts(prev => ({ ...prev, [action._id]: { ...prev[action._id], body: e.target.value } }))}
                          rows={8}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors resize-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigator.clipboard.writeText(`Subject: ${emailDrafts[action._id].subject}\n\n${emailDrafts[action._id].body}`)}
                          className="px-4 py-1.5 text-xs font-medium rounded-lg"
                          style={{ backgroundColor: '#1C2B3A', color: '#B08D57' }}
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => setDraftingEmail(null)}
                          className="px-3 py-1.5 text-xs text-gray-400 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          Close
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              )}

              {/* Outcome input — shown when marking done */}
              {completing === action._id && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="text-xs font-medium text-gray-500 mb-2">
                    What happened? <span className="text-gray-300 font-normal">(optional — helps Varys learn)</span>
                  </div>
                  <textarea
                    value={outcomeText}
                    onChange={e => setOutcomeText(e.target.value)}
                    placeholder="e.g. Sent intro email, meeting scheduled for next week"
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors resize-none placeholder-gray-300"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleDone(action._id)}
                      className="px-4 py-1.5 text-xs font-medium rounded-lg"
                      style={{ backgroundColor: '#1C2B3A', color: '#B08D57' }}
                    >
                      Mark done
                    </button>
                    <button
                      onClick={() => { setCompleting(null); setOutcomeText('') }}
                      className="px-3 py-1.5 text-xs text-gray-400 border border-gray-200 rounded-lg hover:bg-gray-50"
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
  )
}

export default Actions