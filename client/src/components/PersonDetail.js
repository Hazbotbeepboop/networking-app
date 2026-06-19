import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'

function PersonDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [person, setPerson] = useState(null)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({})
  const [entries, setEntries] = useState([])
  const [newEntry, setNewEntry] = useState('')
  const [editingEntry, setEditingEntry] = useState(null)
  const [editingContent, setEditingContent] = useState('')
  const [insights, setInsights] = useState(null)
  const [loadingInsights, setLoadingInsights] = useState(false)

  useEffect(() => {
    fetch(`/people/${id}`)
      .then(res => res.json())
      .then(data => {
        setPerson(data)
        setFormData(data)
      })

    fetch(`/entries/${id}`)
      .then(res => res.json())
      .then(data => setEntries(data))
  }, [id])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSave = () => {
    fetch(`/people/${id}`, {
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
    if (window.confirm(`Delete ${person.name}?`)) {
      fetch(`/people/${id}`, { method: 'DELETE' })
        .then(() => navigate('/'))
    }
  }

  const handleAddEntry = () => {
    if (!newEntry.trim()) return
    fetch(`/entries/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newEntry })
    })
      .then(res => res.json())
      .then(saved => {
        setEntries([saved, ...entries])
        setNewEntry('')
      })
  }

  const handleSaveEntry = (entryId) => {
  fetch(`/entries/${entryId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: editingContent })
  })
    .then(res => res.json())
    .then(updated => {
      setEntries(entries.map(e => e._id === entryId ? updated : e))
      setEditingEntry(null)
      setEditingContent('')
    })
}

const handleGetInsights = () => {
  setLoadingInsights(true)
  fetch(`/insights/person/${id}`, { method: 'POST' })
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

  if (!person) return <p>Loading...</p>

  return (
    <div>
      <Link to="/">← Back to network</Link>

      {editing ? (
        <div>
          <h2>Editing {person.name}</h2>
          <input name="name" value={formData.name || ''} onChange={handleChange} /><br />
          <input name="role" value={formData.role || ''} onChange={handleChange} /><br />
          <input name="company" value={formData.company || ''} onChange={handleChange} /><br />
          <input name="whereMet" value={formData.whereMet || ''} onChange={handleChange} /><br />
          <textarea name="goals" value={formData.goals || ''} onChange={handleChange} /><br />
          <textarea name="canHelpWith" value={formData.canHelpWith || ''} onChange={handleChange} /><br />
          <textarea name="notes" value={formData.notes || ''} onChange={handleChange} /><br />
          <button onClick={handleSave}>Save</button>
          <button onClick={() => setEditing(false)}>Cancel</button>
        </div>
      ) : (
        <div>
          <h2>{person.name}</h2>
          <p><strong>Role:</strong> {person.role}</p>
          <p><strong>Company:</strong> {person.company}</p>
          <p><strong>Where met:</strong> {person.whereMet}</p>
          <p><strong>Goals:</strong> {person.goals}</p>
          <p><strong>Can help with:</strong> {person.canHelpWith}</p>
          <p><strong>Notes:</strong> {person.notes}</p>
          <button onClick={() => setEditing(true)}>Edit</button>
          <button onClick={handleDelete}>Delete</button>
        </div>
      )}

      <hr />
      <div>
        <h3>AI Insights</h3>
        <button onClick={handleGetInsights} disabled={loadingInsights}>
          {loadingInsights ? 'Analysing...' : 'Get Insights'}
        </button>
        {insights && (
          <div style={{ marginTop: '12px', whiteSpace: 'pre-wrap' }}>
            {insights}
          </div>
        )}
      </div>

      <hr />

      <div>
        <h3>Log</h3>
        <textarea
          value={newEntry}
          onChange={e => setNewEntry(e.target.value)}
          placeholder="Add a note about this person..."
          rows={3}
          style={{ width: '100%' }}
        />
        <button onClick={handleAddEntry}>Add Entry</button>

        <div>
          {entries.length === 0 && <p>No entries yet.</p>}
          {entries.map(entry => (
            <div key={entry._id} style={{ borderBottom: '1px solid #ccc', padding: '8px 0' }}>
                {editingEntry === entry._id ? (
                <div>
                    <textarea
                    value={editingContent}
                    onChange={e => setEditingContent(e.target.value)}
                    rows={3}
                    style={{ width: '100%' }}
                    />
                    <button onClick={() => handleSaveEntry(entry._id)}>Save</button>
                    <button onClick={() => setEditingEntry(null)}>Cancel</button>
                </div>
                ) : (
                <div>
                    <p>{entry.content}</p>
                    <small>{new Date(entry.createdAt).toLocaleDateString('en-AU', {
                    day: 'numeric', month: 'long', year: 'numeric'
                    })}</small>
                    <button onClick={() => {
                    setEditingEntry(entry._id)
                    setEditingContent(entry.content)
                    }}>Edit</button>
                </div>
                )}
            </div>
            ))}
        </div>
      </div>
    </div>
  )
}

export default PersonDetail