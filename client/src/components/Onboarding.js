import React, { useState } from 'react'
import { authFetch } from '../App'
import ImportContacts from './ImportContacts'

const STEPS = ['about', 'goals', 'how', 'contact']

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Step 1 — About you
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [company, setCompany] = useState('')

  // Step 2 — Goals
  const [goals, setGoals] = useState('')
  const [lookingFor, setLookingFor] = useState('')

  // Step 3 — How to add contacts
  const [addMethod, setAddMethod] = useState(null) // 'linkedin' | 'manual' | null

  // Step 4 — First contact (manual)
  const [contactName, setContactName] = useState('')
  const [contactCompany, setContactCompany] = useState('')
  const [contactWhereMet, setContactWhereMet] = useState('')
  const [savedContacts, setSavedContacts] = useState([])

  async function handleProfileNext() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await authFetch('/me', {
        method: 'PUT',
        body: JSON.stringify({ name: name.trim(), role: role.trim(), company: company.trim() }),
      })
      setStep(1)
    } finally {
      setSaving(false)
    }
  }

  async function handleGoalsNext() {
    setSaving(true)
    try {
      await authFetch('/me', {
        method: 'PUT',
        body: JSON.stringify({ goals: goals.trim(), lookingFor: lookingFor.trim() }),
      })
      setStep(2)
    } finally {
      setSaving(false)
    }
  }

  async function handleContactDone() {
    if (contactName.trim()) {
      setSaving(true)
      try {
        await authFetch('/people', {
          method: 'POST',
          body: JSON.stringify({
            name: contactName.trim(),
            company: contactCompany.trim(),
            whereMet: contactWhereMet.trim(),
          }),
        })
        setSavedContacts(prev => [...prev, contactName.trim()])
        setContactName('')
        setContactCompany('')
        setContactWhereMet('')
      } catch (err) {
        console.error('Failed to add contact:', err)
      } finally {
        setSaving(false)
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80">
      <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div style={{ backgroundColor: '#1C2B3A' }} className="px-8 pt-8 pb-6">
          <div className="text-sm font-medium tracking-widest text-white mb-1">
            VAR<span style={{ color: '#B08D57' }}>Y</span>S
          </div>
          <p className="text-sm" style={{ color: '#7a99b0' }}>
            Let's get you set up — takes 60 seconds.
          </p>
          {/* Step dots */}
          <div className="flex gap-1.5 mt-4">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="h-1 rounded-full transition-all"
                style={{
                  width: i === step ? '24px' : '8px',
                  backgroundColor: i <= step ? '#B08D57' : 'rgba(255,255,255,0.2)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-7">

          {/* Step 0 — About you */}
          {step === 0 && (
            <div>
              <h2 className="text-base font-medium text-gray-900 mb-1">About you</h2>
              <p className="text-xs text-gray-400 mb-5">This helps Varys contextualise your network.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Your name *</label>
                  <input
                    autoFocus
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && name.trim() && handleProfileNext()}
                    placeholder="e.g. Sarah Chen"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Your role</label>
                  <input
                    type="text"
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && name.trim() && handleProfileNext()}
                    placeholder="e.g. Founder, Product Manager, Investor"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Company <span className="text-gray-300">(if applicable)</span></label>
                  <input
                    type="text"
                    value={company}
                    onChange={e => setCompany(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && name.trim() && handleProfileNext()}
                    placeholder="e.g. Acme Corp, Self-employed"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
                  />
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={handleProfileNext}
                  disabled={!name.trim() || saving}
                  className="px-5 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-40 transition-opacity"
                  style={{ backgroundColor: '#1C2B3A' }}
                >
                  {saving ? 'Saving…' : 'Next →'}
                </button>
              </div>
            </div>
          )}

          {/* Step 1 — Goals */}
          {step === 1 && (
            <div>
              <h2 className="text-base font-medium text-gray-900 mb-1">What are you working towards?</h2>
              <p className="text-xs text-gray-400 mb-5">Varys uses this to make your weekly digest relevant.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Your goals</label>
                  <textarea
                    autoFocus
                    value={goals}
                    onChange={e => setGoals(e.target.value)}
                    placeholder="e.g. Raise a seed round, grow to 1000 users, find a technical co-founder"
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Looking for</label>
                  <input
                    type="text"
                    value={lookingFor}
                    onChange={e => setLookingFor(e.target.value)}
                    placeholder="e.g. Introductions to VCs, enterprise clients, engineering talent"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center mt-6">
                <button
                  onClick={() => setStep(2)}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleGoalsNext}
                  disabled={saving}
                  className="px-5 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-40 transition-opacity"
                  style={{ backgroundColor: '#1C2B3A' }}
                >
                  {saving ? 'Saving…' : 'Next →'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — How to add contacts */}
          {step === 2 && (
            <div>
              <h2 className="text-base font-medium text-gray-900 mb-1">Add your contacts</h2>
              <p className="text-xs text-gray-400 mb-5">How would you like to get started?</p>
              <div className="space-y-3">
                <button
                  onClick={() => { setAddMethod('linkedin'); setStep(3) }}
                  className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors group"
                >
                  <div className="text-sm font-medium text-gray-800 group-hover:text-gray-900">↑ Import from LinkedIn</div>
                  <div className="text-xs text-gray-400 mt-0.5">Upload your LinkedIn connections CSV</div>
                </button>
                <button
                  onClick={() => { setAddMethod('manual'); setStep(3) }}
                  className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors group"
                >
                  <div className="text-sm font-medium text-gray-800 group-hover:text-gray-900">+ Add one contact manually</div>
                  <div className="text-xs text-gray-400 mt-0.5">Enter your most important contact now</div>
                </button>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={onComplete}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — LinkedIn import */}
          {step === 3 && addMethod === 'linkedin' && (
            <div>
              <h2 className="text-base font-medium text-gray-900 mb-1">Import from LinkedIn</h2>
              <p className="text-xs text-gray-400 mb-4">Upload your connections CSV. You can enrich contacts after import.</p>
              <ImportContacts
                existingPeople={[]}
                onImportComplete={onComplete}
                compact
              />
              <div className="flex justify-start mt-4">
                <button
                  onClick={onComplete}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Manual contact (when addMethod === 'manual') */}
          {step === 3 && addMethod === 'manual' && (
            <div>
              <h2 className="text-base font-medium text-gray-900 mb-1">Add your contacts</h2>
              <p className="text-xs text-gray-400 mb-4">The more contacts and context you give Varys, the better it gets at surfacing valuable opportunities in your network.</p>

              {savedContacts.length > 0 && (
                <div className="mb-4 px-3 py-2 bg-gray-50 rounded-lg">
                  {savedContacts.map((n, i) => (
                    <div key={i} className="text-xs text-gray-500 py-0.5">✓ {n}</div>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {savedContacts.length === 0 ? 'Name *' : 'Add another (name)'}
                  </label>
                  <input
                    autoFocus
                    type="text"
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && contactName.trim() && handleContactDone()}
                    placeholder="e.g. James Liu"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={contactCompany}
                    onChange={e => setContactCompany(e.target.value)}
                    placeholder="Company"
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
                  />
                  <input
                    type="text"
                    value={contactWhereMet}
                    onChange={e => setContactWhereMet(e.target.value)}
                    placeholder="How you met"
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center mt-5">
                {savedContacts.length === 0 ? (
                  <span className="text-xs text-gray-300">Add at least one contact to continue</span>
                ) : (
                  <button
                    onClick={onComplete}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Done adding
                  </button>
                )}
                <button
                  onClick={handleContactDone}
                  disabled={!contactName.trim() || saving}
                  className="px-5 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-40 transition-opacity"
                  style={{ backgroundColor: '#1C2B3A' }}
                >
                  {saving ? 'Saving…' : 'Add contact'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
