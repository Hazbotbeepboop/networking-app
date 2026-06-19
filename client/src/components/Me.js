import React, { useState, useEffect } from 'react'

function Me() {
  const [me, setMe] = useState(null)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({})
  const [entries, setEntries] = useState([])
  const [newEntry, setNewEntry] = useState('')
  const [editingEntry, setEditingEntry] = useState(null)
  const [editingContent, setEditingContent] = useState('')

  useEffect(() => {
    fetch('/me')
      .then(res => res.json())
      .then(data => {
        setMe(data)
        setFormData(data)
      })

    fetch('/entries/me')
      .then(res => res.json())
      .then(data => setEntries(data))
  }, [])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSave = () => {
    fetch('/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
      .then(res => res.json())
      .then(updated => {
        setMe(updated)
        setEditing(false)
      })
  }

  const handleAddEntry = () => {
    if (!newEntry.trim()) return
    fetch('/entries/me', {
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

  if (!me) return <p>Loading...</p>

  return (
    <div>
      <h2>My Profile</h2>

      {editing ? (
        <div>
          <input name="name" placeholder="Your name" value={formData.name || ''} onChange={handleChange} /><br />
          <input name="role" placeholder="Your role" value={formData.role || ''} onChange={handleChange} /><br />
          <textarea name="goals" placeholder="Your goals" value={formData.goals || ''} onChange={handleChange} /><br />
          <textarea name="currentProjects" placeholder="Current projects" value={formData.currentProjects || ''} onChange={handleChange} /><br />
          <textarea name="lookingFor" placeholder="What are you looking for right now?" value={formData.lookingFor || ''} onChange={handleChange} /><br />
          <button onClick={handleSave}>Save</button>
          <button onClick={() => setEditing(false)}>Cancel</button>
        </div>
      ) : (
        <div>
          <p><strong>Name:</strong> {me.name}</p>
          <p><strong>Role:</strong> {me.role}</p>
          <p><strong>Goals:</strong> {me.goals}</p>
          <p><strong>Current projects:</strong> {me.currentProjects}</p>
          <p><strong>Looking for:</strong> {me.lookingFor}</p>
          <button onClick={() => setEditing(true)}>Edit</button>
        </div>
      )}

      <hr />

      <div>
        <h3>My Journal</h3>
        <textarea
          value={newEntry}
          onChange={e => setNewEntry(e.target.value)}
          placeholder="What's on your mind? What are you working on or looking for?"
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

export default Me