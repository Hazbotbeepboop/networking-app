import React, { useState } from 'react'

function AddPerson({ onPersonAdded }) {
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    company: '',
    goals: '',
    canHelpWith: '',
    notes: '',
    whereMet: ''
  })

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    fetch('/people', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
      .then(res => res.json())
      .then(newPerson => {
        onPersonAdded(newPerson)
        setFormData({ name: '', role: '', company: '', goals: '', canHelpWith: '', notes: '', whereMet: '' })
      })
  }

  return (
    <div>
      <h2>Add Person</h2>
      <form onSubmit={handleSubmit}>
        <input name="name" placeholder="Name" value={formData.name} onChange={handleChange} required /><br />
        <input name="role" placeholder="Role" value={formData.role} onChange={handleChange} /><br />
        <input name="company" placeholder="Company" value={formData.company} onChange={handleChange} /><br />
        <input name="whereMet" placeholder="Where met" value={formData.whereMet} onChange={handleChange} /><br />
        <textarea name="goals" placeholder="Their goals" value={formData.goals} onChange={handleChange} /><br />
        <textarea name="canHelpWith" placeholder="What they can help with" value={formData.canHelpWith} onChange={handleChange} /><br />
        <textarea name="notes" placeholder="Notes" value={formData.notes} onChange={handleChange} /><br />
        <button type="submit">Add Person</button>
      </form>
    </div>
  )
}

export default AddPerson