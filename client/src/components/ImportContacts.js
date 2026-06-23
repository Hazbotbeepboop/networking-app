import React, { useState, useRef } from 'react'
import { authFetch } from '../App'

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes
    } else if (line[i] === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += line[i]
    }
  }
  result.push(current.trim())
  return result
}

function parseLinkedInCSV(text) {
  const lines = text.split('\n').map(l => l.trimEnd())
  const headerIndex = lines.findIndex(l =>
    l.includes('First Name') && l.includes('Last Name')
  )
  if (headerIndex === -1) return null

  const headers = parseCSVLine(lines[headerIndex]).map(h =>
    h.toLowerCase().replace(/\s+/g, '_')
  )

  const contacts = []
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const fields = parseCSVLine(line)
    const row = {}
    headers.forEach((h, idx) => { row[h] = fields[idx] || '' })

    const name = `${row['first_name'] || ''} ${row['last_name'] || ''}`.trim()
    if (!name) continue

    contacts.push({
      name,
      role: row['position'] || '',
      company: row['company'] || '',
      whereMet: row['connected_on']
        ? `LinkedIn (connected ${row['connected_on']})`
        : 'LinkedIn',
    })
  }
  return contacts
}

export default function ImportContacts({ existingPeople, onImportComplete }) {
  const [step, setStep] = useState('upload') // upload | preview | enrich | done
  const [parsed, setParsed] = useState([])
  const [importing, setImporting] = useState(false)
  const [importedPeople, setImportedPeople] = useState([])
  const [skippedCount, setSkippedCount] = useState(0)
  const [enrichingId, setEnrichingId] = useState(null)
  const [enrichContext, setEnrichContext] = useState('')
  const [enrichLoading, setEnrichLoading] = useState(false)
  const [doneIds, setDoneIds] = useState(new Set())
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const existingNames = new Set((existingPeople || []).map(p => p.name.toLowerCase().trim()))
  const newContacts = parsed.filter(c => !existingNames.has(c.name.toLowerCase().trim()))
  const duplicateCount = parsed.length - newContacts.length

  const handleFile = (file) => {
    if (!file) return
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const contacts = parseLinkedInCSV(e.target.result)
      if (!contacts) {
        setError('Could not read this as a LinkedIn CSV. Export from LinkedIn: Settings → Data privacy → Get a copy of your data → Connections.')
        return
      }
      if (contacts.length === 0) {
        setError('No contacts found in this file.')
        return
      }
      setParsed(contacts)
      setStep('preview')
    }
    reader.readAsText(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    handleFile(e.dataTransfer.files[0])
  }

  const handleImport = () => {
    setImporting(true)
    authFetch('/people/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacts: newContacts })
    })
      .then(r => r.json())
      .then(data => {
        setImportedPeople(data.created)
        setSkippedCount(data.skipped)
        setImporting(false)
        onImportComplete(data.created)
        setStep('enrich')
      })
      .catch(() => { setError('Import failed. Please try again.'); setImporting(false) })
  }

  const handleEnrich = (person) => {
    if (!enrichContext.trim()) return
    setEnrichLoading(true)
    authFetch('/insights/enrich-person', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId: person._id, context: enrichContext })
    })
      .then(r => r.json())
      .then(() => {
        setDoneIds(prev => new Set([...prev, person._id]))
        setEnrichingId(null)
        setEnrichContext('')
        setEnrichLoading(false)
      })
      .catch(() => setEnrichLoading(false))
  }

  const handleSkip = (id) => {
    setDoneIds(prev => new Set([...prev, id]))
    if (enrichingId === id) { setEnrichingId(null); setEnrichContext('') }
  }

  const handleSkipAll = () => {
    setDoneIds(new Set(importedPeople.map(p => p._id)))
    setStep('done')
  }

  const remaining = importedPeople.filter(p => !doneIds.has(p._id))
  const enrichedCount = [...doneIds].filter(id =>
    importedPeople.some(p => p._id === id)
  ).length

  // Auto-advance when all done
  if (step === 'enrich' && importedPeople.length > 0 && remaining.length === 0) {
    setTimeout(() => setStep('done'), 300)
  }

  // ── Upload step ──────────────────────────────────────────────────────────────
  if (step === 'upload') return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
      <h3 className="text-sm font-medium text-gray-900 mb-1">Import from LinkedIn</h3>
      <p className="text-xs text-gray-400 mb-4">
        Export your connections from LinkedIn: <span className="text-gray-500">Settings → Data privacy → Get a copy of your data → Connections</span>. Then upload the CSV below.
      </p>

      <div
        className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-[#B08D57] transition-colors"
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileInputRef.current.click()}
      >
        <div className="text-2xl mb-2">📄</div>
        <div className="text-sm text-gray-500 mb-1">Drop your LinkedIn CSV here, or click to browse</div>
        <div className="text-xs text-gray-300">Connections.csv</div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => handleFile(e.target.files[0])}
        />
      </div>

      {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
    </div>
  )

  // ── Preview step ─────────────────────────────────────────────────────────────
  if (step === 'preview') return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
      <h3 className="text-sm font-medium text-gray-900 mb-1">Review contacts</h3>
      <p className="text-xs text-gray-400 mb-4">
        Found <span className="text-gray-700 font-medium">{parsed.length}</span> contacts.
        {duplicateCount > 0 && <> <span className="text-gray-500">{duplicateCount} already in your network and will be skipped.</span></>}
        {' '}<span className="text-gray-700 font-medium">{newContacts.length}</span> will be imported.
      </p>

      <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-lg mb-4">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 text-gray-400 font-medium">Name</th>
              <th className="text-left px-3 py-2 text-gray-400 font-medium">Role</th>
              <th className="text-left px-3 py-2 text-gray-400 font-medium">Company</th>
              <th className="text-left px-3 py-2 text-gray-400 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {parsed.map((c, i) => {
              const isDupe = existingNames.has(c.name.toLowerCase().trim())
              return (
                <tr key={i} className={`border-t border-gray-50 ${isDupe ? 'opacity-40' : ''}`}>
                  <td className="px-3 py-2 text-gray-800">{c.name}</td>
                  <td className="px-3 py-2 text-gray-500">{c.role}</td>
                  <td className="px-3 py-2 text-gray-500">{c.company}</td>
                  <td className="px-3 py-2 text-gray-300">{isDupe ? 'exists' : ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3 items-center">
        <button
          onClick={handleImport}
          disabled={importing || newContacts.length === 0}
          className="px-5 py-2 text-sm font-medium rounded-lg disabled:opacity-40"
          style={{ backgroundColor: '#1C2B3A', color: '#B08D57' }}
        >
          {importing ? 'Importing…' : `Import ${newContacts.length} contacts`}
        </button>
        <button onClick={() => setStep('upload')} className="text-xs text-gray-400 hover:text-gray-600">
          ← Back
        </button>
      </div>
      {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
    </div>
  )

  // ── Enrich step ──────────────────────────────────────────────────────────────
  if (step === 'enrich') return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-sm font-medium text-gray-900">
          ✓ {importedPeople.length} contacts imported{skippedCount > 0 ? `, ${skippedCount} skipped (already existed)` : ''}
        </h3>
        <button onClick={handleSkipAll} className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0 ml-4">
          Skip all →
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Optionally enrich your most important contacts — paste in anything you know and Varys will fill their profile. <span className="text-gray-500">We recommend 5–10 key contacts now; you can always add context later.</span>
      </p>

      {remaining.length > 0 && (
        <div className="text-xs text-gray-400 mb-3">
          {enrichedCount} enriched · {remaining.length} remaining
        </div>
      )}

      <div className="space-y-2">
        {importedPeople.map(person => {
          const isDone = doneIds.has(person._id)
          const isOpen = enrichingId === person._id
          return (
            <div key={person._id} className={`border rounded-lg transition-colors ${isDone ? 'border-gray-100 opacity-50' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-800">{person.name}</div>
                  {(person.role || person.company) && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {person.role}{person.role && person.company ? ' · ' : ''}{person.company}
                    </div>
                  )}
                </div>
                {isDone ? (
                  <span className="text-xs text-gray-300">✓</span>
                ) : (
                  <div className="flex gap-3 flex-shrink-0">
                    <button
                      onClick={() => { setEnrichingId(isOpen ? null : person._id); setEnrichContext('') }}
                      className="text-xs font-medium"
                      style={{ color: '#B08D57' }}
                    >
                      {isOpen ? 'Close' : 'Enrich'}
                    </button>
                    <button onClick={() => handleSkip(person._id)} className="text-xs text-gray-300 hover:text-gray-500">
                      Skip
                    </button>
                  </div>
                )}
              </div>

              {isOpen && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                  <textarea
                    value={enrichContext}
                    onChange={e => setEnrichContext(e.target.value)}
                    placeholder={`How do you know ${person.name}? What are they working on? What could they help with? Any goals or background worth knowing?`}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors resize-none placeholder-gray-300"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleEnrich(person)}
                      disabled={enrichLoading || !enrichContext.trim()}
                      className="px-4 py-1.5 text-xs font-medium rounded-lg disabled:opacity-40"
                      style={{ backgroundColor: '#1C2B3A', color: '#B08D57' }}
                    >
                      {enrichLoading ? 'Enriching…' : 'Enrich with Varys'}
                    </button>
                    <button onClick={() => handleSkip(person._id)} className="text-xs text-gray-400 hover:text-gray-600">
                      Skip
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  // ── Done step ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
      <div className="text-center py-4">
        <div className="text-2xl mb-3">✓</div>
        <div className="text-sm font-medium text-gray-900 mb-1">All done</div>
        <div className="text-xs text-gray-400">
          {importedPeople.length} contacts imported · {enrichedCount} enriched
        </div>
      </div>
    </div>
  )
}
