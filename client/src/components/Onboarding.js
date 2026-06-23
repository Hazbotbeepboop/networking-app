import React, { useState } from 'react'
import { authFetch } from '../App'

const STEPS = ['about', 'goals', 'contact']

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Step 1 — About you
  const [name, setName] = useState('')
  const [role, setRole] = useState('')

  // Step 2 — Goals
  const [goals, setGoals] = useState('')
  const [lookingFor, setLookingFor] = useState('')

  // Step 3 — First contact
  const [contactName, setContactName] = useState('')
  const [contactCompany, setContactCompany] = useState('')
  const [contactWhereMet, setContactWhereMet] = useState('')

  async function handleProfileNext() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await authFetch('/me', {
        method: 'PUT',
        body: JSON.stringify({ name: name.trim(), role: role.trim() }),
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
      } catch (err) {
        console.error('Failed to add contact:', err)
      } finally {
        setSaving(false)
      }
    }
    onComplete()
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

          {/* Step 2 — First contact */}
          {step === 2 && (
            <div>
              <h2 className="text-base font-medium text-gray-900 mb-1">Add your first contact</h2>
              <p className="text-xs text-gray-400 mb-5">Who's the most important person in your network right now?</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                  <input
                    autoFocus
                    type="text"
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    placeholder="e.g. James Liu"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
                  <input
                    type="text"
                    value={contactCompany}
                    onChange={e => setContactCompany(e.target.value)}
                    placeholder="e.g. Acme Ventures"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">How you met</label>
                  <input
                    type="text"
                    value={contactWhereMet}
                    onChange={e => setContactWhereMet(e.target.value)}
                    placeholder="e.g. YC startup school, referred by Alex"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center mt-6">
                <button
                  onClick={onComplete}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleContactDone}
                  disabled={saving}
                  className="px-5 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-40 transition-opacity"
                  style={{ backgroundColor: '#1C2B3A' }}
                >
                  {saving ? 'Saving…' : contactName.trim() ? 'Add & finish' : 'Finish'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
