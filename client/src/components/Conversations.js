import React, { useState, useEffect } from 'react'
import { authFetch } from '../App'

function Conversations() {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    authFetch('/conversations')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setConversations(data)
        setLoading(false)
      })
      .catch(err => { console.error(err); setLoading(false) })
  }, [])

  const handleDelete = (id) => {
    if (!window.confirm('Delete this conversation?')) return
    authFetch(`/conversations/${id}`, { method: 'DELETE' })
      .then(() => {
        setConversations(prev => prev.filter(c => c._id !== id))
        if (selected?._id === id) setSelected(null)
      })
      .catch(err => console.error(err))
  }

  const handleOpen = (conv) => {
    authFetch(`/conversations/${conv._id}`)
      .then(res => res.json())
      .then(data => setSelected(data))
      .catch(err => console.error(err))
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-sm text-gray-400">Loading…</div>
  )

  if (selected) {
    return (
      <div>
        <button
          onClick={() => setSelected(null)}
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-6"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to conversations
        </button>

        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-900">{selected.title}</h2>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(selected.createdAt).toLocaleDateString('en-AU', {
              day: 'numeric', month: 'long', year: 'numeric'
            })}
          </p>
        </div>

        <div className="space-y-3">
          {selected.messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="flex gap-3 max-w-[85%]">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                    style={{ backgroundColor: '#1C2B3A' }}
                  >
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
                <div className="max-w-[85%] bg-white border border-gray-200 rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-gray-800 leading-relaxed">
                  {msg.content}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={() => handleDelete(selected._id)}
            className="text-xs text-red-400 hover:text-red-500 transition-colors"
          >
            Delete conversation
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900">Conversations</h2>
        <p className="text-sm text-gray-400 mt-1">Saved captures and follow-up threads</p>
      </div>

      {conversations.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-400">No conversations saved yet.</p>
          <p className="text-xs text-gray-300 mt-1">After a quick capture, save the conversation to store it here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map(conv => (
            <div
              key={conv._id}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors cursor-pointer"
              onClick={() => handleOpen(conv)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{conv.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5 truncate">{conv.captureText}</div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-gray-300">
                    {new Date(conv.createdAt).toLocaleDateString('en-AU', {
                      day: 'numeric', month: 'short'
                    })}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(conv._id) }}
                    className="text-xs text-gray-300 hover:text-red-400 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Conversations
