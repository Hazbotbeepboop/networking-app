import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { authFetch } from '../App'

function PersonDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [person, setPerson] = useState(null)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({})
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [insights, setInsights] = useState(null)
  const [loadingInsights, setLoadingInsights] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  useEffect(() => {
    authFetch(`/people/${id}`)
      .then(res => res.json())
      .then(data => {
        setPerson(data)
        setFormData(data)
      })
    authFetch(`/conversations/person/${id}`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setConversations(data) })
  }, [id])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSave = () => {
    authFetch(`/people/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
      .then(res => res.json())
      .then(updated => {
        setPerson(updated)
        setEditing(false)
      })
  }

  const handleDelete = () => {
    if (window.confirm(`Remove ${person.name} from your network?`)) {
      authFetch(`/people/${id}`, { method: 'DELETE' })
        .then(() => navigate('/network'))
    }
  }

  const handleDeleteConversation = (convId) => {
    if (!window.confirm('Delete this conversation?')) return
    authFetch(`/conversations/${convId}`, { method: 'DELETE' })
      .then(() => {
        setConversations(prev => prev.filter(c => c._id !== convId))
        if (selectedConversation?._id === convId) setSelectedConversation(null)
      })
      .catch(err => console.error(err))
  }

  const handleGetInsights = () => {
    setLoadingInsights(true)
    authFetch(`/insights/person/${id}`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        setInsights(data.insights)
        setLoadingInsights(false)
      })
      .catch(err => {
        console.error(err)
        setLoadingInsights(false)
      })
  }

  const handleSaveNote = () => {
    if (!noteText.trim()) return
    setSavingNote(true)
    const title = noteText.trim().split('\n')[0].slice(0, 60) || 'Note'
    authFetch('/conversations', {
      method: 'POST',
      body: JSON.stringify({
        title,
        captureText: noteText.trim(),
        messages: [{ role: 'user', content: noteText.trim() }],
        relatedPeopleNames: [person.name],
      }),
    })
      .then(res => res.json())
      .then(saved => {
        setConversations(prev => [saved, ...prev])
        setNoteText('')
        setSavingNote(false)
      })
      .catch(err => {
        console.error(err)
        setSavingNote(false)
      })
  }

  if (!person) return (
    <div className="flex items-center justify-center py-20 text-sm text-gray-400">Loading…</div>
  )

  const initials = (person.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div>
      {/* Back */}
      <Link to="/network" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-6">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to network
      </Link>

      {/* Profile card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        {editing ? (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">Edit contact</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                  <input name="name" value={formData.name || ''} onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Where met</label>
                  <input name="whereMet" value={formData.whereMet || ''} onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
                  <input name="role" value={formData.role || ''} onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Company</label>
                  <input name="company" value={formData.company || ''} onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Their goals</label>
                <textarea name="goals" value={formData.goals || ''} onChange={handleChange} rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">What they can help with</label>
                <textarea name="canHelpWith" value={formData.canHelpWith || ''} onChange={handleChange} rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                <textarea name="notes" value={formData.notes || ''} onChange={handleChange} rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors resize-none" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleSave}
                  className="px-4 py-2 text-sm font-medium rounded-lg"
                  style={{ backgroundColor: '#1C2B3A', color: '#B08D57' }}>
                  Save
                </button>
                <button onClick={() => setEditing(false)}
                  className="px-4 py-2 text-sm text-gray-400 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium text-[#B08D57] flex-shrink-0"
                  style={{ backgroundColor: '#1C2B3A' }}>
                  {initials}
                </div>
                <div>
                  <h2 className="text-lg font-medium text-gray-900">{person.name}</h2>
                  {(person.role || person.company) && (
                    <p className="text-sm text-gray-400 mt-0.5">
                      {person.role}{person.role && person.company ? ' · ' : ''}{person.company}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(true)}
                  className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  Edit
                </button>
                <button onClick={handleDelete}
                  className="px-3 py-1.5 text-xs text-red-400 border border-red-100 rounded-lg hover:bg-red-50 transition-colors">
                  Remove
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {person.whereMet && (
                <div>
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Where met</div>
                  <div className="text-sm text-gray-700">{person.whereMet}</div>
                </div>
              )}
              {person.goals && (
                <div>
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Their goals</div>
                  <div className="text-sm text-gray-700">{person.goals}</div>
                </div>
              )}
              {person.canHelpWith && (
                <div>
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Can help with</div>
                  <div className="text-sm text-gray-700">{person.canHelpWith}</div>
                </div>
              )}
              {person.notes && (
                <div>
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Notes</div>
                  <div className="text-sm text-gray-700">{person.notes}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* AI Insights */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-medium tracking-widest text-gray-400 uppercase">Intelligence</div>
          <button
            onClick={handleGetInsights}
            disabled={loadingInsights}
            className="px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: '#1C2B3A', color: '#B08D57' }}
          >
            {loadingInsights ? 'Analysing…' : 'Get insights'}
          </button>
        </div>
        {insights ? (
          <div className="rounded-lg p-4 flex gap-3" style={{ backgroundColor: '#1C2B3A' }}>
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#B08D57' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#C8D4DC' }}>{insights}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-300">Click "Get insights" to analyse this contact against your full network.</p>
        )}
      </div>

      {/* Conversations */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-xs font-medium tracking-widest text-gray-400 uppercase mb-4">Conversations</div>

        {!selectedConversation && (
          <div className="mb-4">
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Add a note about this person…"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors resize-none"
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handleSaveNote}
                disabled={savingNote || !noteText.trim()}
                className="px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-40 transition-opacity"
                style={{ backgroundColor: '#1C2B3A', color: '#B08D57' }}
              >
                {savingNote ? 'Saving…' : 'Save note'}
              </button>
            </div>
          </div>
        )}

        {selectedConversation ? (
          <div>
            <button
              onClick={() => setSelectedConversation(null)}
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-4"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <div className="text-sm font-medium text-gray-900 mb-1">{selectedConversation.title}</div>
            <div className="text-xs text-gray-300 mb-4">
              {new Date(selectedConversation.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <div className="space-y-3">
              {selectedConversation.messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="flex gap-2 max-w-[85%]">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-1" style={{ backgroundColor: '#1C2B3A' }}>
                        <svg className="w-2.5 h-2.5" style={{ color: '#B08D57' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </div>
                      <div className="rounded-2xl rounded-tl-sm px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap" style={{ backgroundColor: '#1C2B3A', color: '#C8D4DC' }}>
                        {msg.content}
                      </div>
                    </div>
                  )}
                  {msg.role === 'user' && (
                    <div className="max-w-[85%] bg-gray-50 border border-gray-100 rounded-2xl rounded-tr-sm px-3 py-2 text-sm text-gray-800 leading-relaxed">
                      {msg.content}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.length === 0 && (
              <p className="text-sm text-gray-300 py-2">No conversations linked to {person.name} yet.</p>
            )}
            {conversations.map(conv => (
              <div
                key={conv._id}
                className="flex items-center gap-2 border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors"
              >
                <button
                  onClick={() => authFetch(`/conversations/${conv._id}`).then(r => r.json()).then(setSelectedConversation)}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="text-sm font-medium text-gray-800 truncate">{conv.title}</div>
                  <div className="text-xs text-gray-300 mt-0.5">
                    {new Date(conv.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </button>
                <button
                  onClick={() => handleDeleteConversation(conv._id)}
                  className="text-xs text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 px-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default PersonDetail