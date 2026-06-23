import React, { useState } from 'react'
import { authFetch } from '../App'
import ImportContacts from './ImportContacts'

const STEPS = ['welcome', 'about', 'goals', 'how', 'contact']

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
  const [contactRole, setContactRole] = useState('')
  const [contactCompany, setContactCompany] = useState('')
  const [contactWhereMet, setContactWhereMet] = useState('')
  const [contactGoals, setContactGoals] = useState('')
  const [contactCanHelpWith, setContactCanHelpWith] = useState('')
  const [contactNotes, setContactNotes] = useState('')
  const [savedContacts, setSavedContacts] = useState([])

  async function handleProfileNext() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await authFetch('/me', {
        method: 'PUT',
        body: JSON.stringify({ name: name.trim(), role: role.trim(), company: company.trim() }),
      })
      setStep(2)
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
      setStep(3)
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
            role: contactRole.trim(),
            company: contactCompany.trim(),
            whereMet: contactWhereMet.trim(),
            goals: contactGoals.trim(),
            canHelpWith: contactCanHelpWith.trim(),
            notes: contactNotes.trim(),
          }),
        })
        setSavedContacts(prev => [...prev, contactName.trim()])
        setContactName('')
        setContactRole('')
        setContactCompany('')
        setContactWhereMet('')
        setContactGoals('')
        setContactCanHelpWith('')
        setContactNotes('')
      } catch (err) {
        console.error('Failed to add contact:', err)
      } finally {
        setSaving(false)
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80">
      <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div style={{ backgroundColor: '#1C2B3A' }} className="px-8 pt-8 pb-6">
          <div className="text-sm font-medium tracking-widest text-white mb-1">
            VAR<span style={{ color: '#B08D57' }}>Y</span>S
          </div>
          {step > 0 && (
            <p className="text-sm" style={{ color: '#7a99b0' }}>
              Let's get you set up.
            </p>
          )}
          {/* Step dots — hidden on welcome screen */}
          {step > 0 && (
            <div className="flex gap-1.5 mt-4">
              {STEPS.slice(1).map((_, i) => (
                <div
                  key={i}
                  className="h-1 rounded-full transition-all"
                  style={{
                    width: i === step - 1 ? '24px' : '8px',
                    backgroundColor: i <= step - 1 ? '#B08D57' : 'rgba(255,255,255,0.2)',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-8 py-7 overflow-y-auto flex-1">

          {/* Step 0 — Welcome */}
          {step === 0 && (
            <div>
              <h2 className="text-base font-medium text-gray-900 mb-3">Welcome to Varys</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                Varys is your private networking intelligence advisor. It tracks your contacts, monitors what's happening in their world, and surfaces opportunities you'd otherwise miss.
              </p>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                The more you use it — adding contacts, chatting through situations, journalling what's on your mind — the more useful it becomes. Varys gets sharper the more context it has.
              </p>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                Setup can take as little as a minute — but the more you put in now, the more Varys can do for you from day one.
              </p>
              <div className="flex justify-end">
                <button
                  onClick={() => setStep(1)}
                  className="px-5 py-2 text-sm font-medium rounded-lg"
                  style={{ backgroundColor: '#1C2B3A', color: '#B08D57' }}
                >
                  Get started →
                </button>
              </div>
            </div>
          )}

          {/* Step 1 — About you */}
          {step === 1 && (
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

          {/* Step 2 — Goals */}
          {step === 2 && (
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
                  onClick={() => setStep(3)}
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

          {/* Step 3 — How to add contacts */}
          {step === 3 && (
            <div>
              <h2 className="text-base font-medium text-gray-900 mb-1">Add your contacts</h2>
              <p className="text-xs text-gray-400 mb-5">How would you like to get started?</p>
              <div className="space-y-3">
                <button
                  onClick={() => { setAddMethod('linkedin'); setStep(4) }}
                  className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors group"
                >
                  <div className="text-sm font-medium text-gray-800 group-hover:text-gray-900">↑ Import from LinkedIn</div>
                  <div className="text-xs text-gray-400 mt-0.5">Upload your LinkedIn connections CSV</div>
                </button>
                <button
                  onClick={() => { setAddMethod('manual'); setStep(4) }}
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

          {/* Step 4 — LinkedIn import */}
          {step === 4 && addMethod === 'linkedin' && (
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

          {/* Step 4 — Manual contact (when addMethod === 'manual') */}
          {step === 4 && addMethod === 'manual' && (
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
                    {savedContacts.length === 0 ? 'Name *' : 'Name *'}
                  </label>
                  <input
                    autoFocus
                    type="text"
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    placeholder="e.g. James Liu"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                    <input
                      type="text"
                      value={contactRole}
                      onChange={e => setContactRole(e.target.value)}
                      placeholder="e.g. Investor, CTO"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
                    <input
                      type="text"
                      value={contactCompany}
                      onChange={e => setContactCompany(e.target.value)}
                      placeholder="e.g. Acme Corp"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Where you met</label>
                  <input
                    type="text"
                    value={contactWhereMet}
                    onChange={e => setContactWhereMet(e.target.value)}
                    placeholder="e.g. SydStart conference, mutual intro from Sarah"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Their goals</label>
                  <input
                    type="text"
                    value={contactGoals}
                    onChange={e => setContactGoals(e.target.value)}
                    placeholder="What are they working towards?"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Can help with</label>
                  <input
                    type="text"
                    value={contactCanHelpWith}
                    onChange={e => setContactCanHelpWith(e.target.value)}
                    placeholder="What can they help you with?"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                  <textarea
                    value={contactNotes}
                    onChange={e => setContactNotes(e.target.value)}
                    placeholder="Anything else worth remembering"
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center mt-5">
                {savedContacts.length === 0 ? (
                  <span className="text-xs text-gray-300">Add at least one contact to continue</span>
                ) : (
                  <button
                    onClick={onComplete}
                    className="px-5 py-2 text-sm font-medium rounded-lg transition-opacity"
                    style={{ backgroundColor: '#1C2B3A', color: '#B08D57' }}
                  >
                    Finish adding contacts
                  </button>
                )}
                <button
                  onClick={handleContactDone}
                  disabled={!contactName.trim() || saving}
                  className="px-5 py-2 text-sm font-medium rounded-lg disabled:opacity-40 transition-opacity"
                  style={{ backgroundColor: '#B08D57', color: '#1C2B3A' }}
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
