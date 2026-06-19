import React, { useState, useEffect } from 'react'

function QuickCapture() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [people, setPeople] = useState([])
  const [saves, setSaves] = useState({})

  useEffect(() => {
    fetch('/people')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPeople(data)
      })
  }, [])

  const handleAnalyse = () => {
    if (!text.trim()) return
    setLoading(true)
    setResult(null)
    fetch('/insights/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    })
      .then(res => res.json())
      .then(data => {
        setResult(data)
        // Pre-tick suggested saves
        const initialSaves = {}
        data.suggestedSaves.forEach(name => {
          initialSaves[name] = true
        })
        setSaves(initialSaves)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }

  const handleSave = () => {
    const promises = []

    Object.entries(saves).forEach(([name, checked]) => {
      if (!checked) return

      if (name === 'MY_JOURNAL') {
        promises.push(
          fetch('/entries/me', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: text })
          })
        )
      } else {
        const person = people.find(p =>
          p.name.toLowerCase() === name.toLowerCase()
        )
        if (person) {
          promises.push(
            fetch(`/entries/${person._id}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: text })
            })
          )
        }
      }
    })

    Promise.all(promises).then(() => {
      setText('')
      setResult(null)
      setSaves({})
      alert('Saved!')
    })
  }

  // Strip the structured output from display
  const displayInsights = result?.insights
    .replace(/PEOPLE_MENTIONED:.*$/m, '')
    .replace(/SUGGESTED_SAVES:.*$/m, '')
    .trim()

  return (
    <div>
      <h2>Quick Capture</h2>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="What just happened? Who did you meet? What's on your mind?"
        rows={6}
        style={{ width: '100%' }}
      />
      <button onClick={handleAnalyse} disabled={loading}>
        {loading ? 'Analysing...' : 'Analyse'}
      </button>

      {result && (
        <div>
          <hr />
          <h3>Insights</h3>
          <div style={{ whiteSpace: 'pre-wrap' }}>{displayInsights}</div>

          <hr />
          <h3>Save this entry to:</h3>
          <div>
            {/* My Journal option */}
            <label style={{ display: 'block', marginBottom: '8px' }}>
              <input
                type="checkbox"
                checked={saves['MY_JOURNAL'] || false}
                onChange={e => setSaves({ ...saves, MY_JOURNAL: e.target.checked })}
              />
              {' '}My Journal
            </label>

            {/* Network people options */}
            {people.map(person => (
              <label key={person._id} style={{ display: 'block', marginBottom: '8px' }}>
                <input
                  type="checkbox"
                  checked={saves[person.name] || false}
                  onChange={e => setSaves({ ...saves, [person.name]: e.target.checked })}
                />
                {' '}{person.name}
              </label>
            ))}
          </div>

          <button onClick={handleSave}>Save Selected</button>
        </div>
      )}
    </div>
  )
}

export default QuickCapture