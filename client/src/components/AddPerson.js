import React, { useState } from 'react'
import { authFetch } from '../App'

function AddPerson({ onPersonAdded }) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '', role: '', company: '', goals: '',
    canHelpWith: '', notes: '', whereMet: ''
  })

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    authFetch('/people', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
      .then(res => res.json())
      .then(newPerson => {
        onPersonAdded(newPerson)
        setFormData({ name: '', role: '', company: '', goals: '', canHelpWith: '', notes: '', whereMet: '' })
        setOpen(false)
      })
  }

  return (
    <div className="mb-2">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#1C2B3A', color: '#B08D57' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
          Add contact
        </button>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-medium text-gray-900">New contact</h3>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-300 hover:text-gray-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Name *</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Full name"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Where met</label>
                <input
                  name="whereMet"
                  value={formData.whereMet}
                  onChange={handleChange}
                  placeholder="Conference, intro, etc."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
                <input
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  placeholder="Managing Director"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Company</label>
                <input
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Blackstone"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Their goals</label>
              <textarea
                name="goals"
                value={formData.goals}
                onChange={handleChange}
                placeholder="What are they working towards?"
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">What they can help with</label>
              <textarea
                name="canHelpWith"
                value={formData.canHelpWith}
                onChange={handleChange}
                placeholder="Their expertise, resources, or connections"
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Anything else worth remembering"
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors resize-none"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="px-5 py-2 text-sm font-medium rounded-lg transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#1C2B3A', color: '#B08D57' }}
              >
                Add contact
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm text-gray-400 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default AddPerson