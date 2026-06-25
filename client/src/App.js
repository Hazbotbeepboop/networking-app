import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import PeopleList from './components/PeopleList'
import AddPerson from './components/AddPerson'
import PersonDetail from './components/PersonDetail'
import Me from './components/Me'
import QuickCapture from './components/QuickCapture'
import Login from './components/Login'
import ForgotPassword from './components/ForgotPassword'
import ResetPassword from './components/ResetPassword'
import Privacy from './components/Privacy'
import Actions from './components/Actions'
import Conversations from './components/Conversations'
import ImportContacts from './components/ImportContacts'
import Onboarding from './components/Onboarding'

export function authFetch(url, options = {}) {
  const token = localStorage.getItem('token')
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}

function CaptureNudgeBanner() {
  const location = useLocation()
  const [dismissed, setDismissed] = useState(false)
  const onCapturePage = location.pathname === '/'
  const guideDone = !!localStorage.getItem('varys_guide_done')

  if (dismissed || onCapturePage || guideDone) return null

  return (
    <div className="flex items-center justify-center px-6 py-2.5 relative" style={{ backgroundColor: '#B08D57' }}>
      <div className="flex items-center gap-2 text-sm font-medium" style={{ color: '#1C2B3A' }}>
        <span className="text-base">↑</span>
        Click <Link to="/" className="underline underline-offset-2 font-semibold">Capture</Link> in the menu above to log your first conversation and begin using Varys
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-6 text-lg leading-none opacity-60 hover:opacity-100 transition-opacity"
        style={{ color: '#1C2B3A' }}
      >
        ×
      </button>
    </div>
  )
}

function NavBar({ userEmail, onLogout }) {
  const location = useLocation()
  const links = [
    { to: '/', label: 'Capture' },
    { to: '/network', label: 'Network' },
    { to: '/conversations', label: 'Conversations' },
    { to: '/actions', label: 'Actions' },
    { to: '/me', label: 'Profile' },
  ]

  const initials = userEmail
    ? userEmail.slice(0, 2).toUpperCase()
    : '?'

  return (
    <nav className="flex items-center justify-between px-6 border-b border-gray-100" style={{ height: '52px' }}>
      <div className="text-sm font-medium tracking-widest text-gray-900">
        VAR<span className="text-[#B08D57]">Y</span>S
      </div>
      <div className="flex gap-7">
        {links.map(link => {
          const active = location.pathname === link.to
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm pb-0.5 transition-colors ${
                active
                  ? 'text-gray-900 font-medium border-b-2 border-[#B08D57]'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {link.label}
            </Link>
          )
        })}
      </div>
      <div className="flex items-center gap-3">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-[#B08D57]"
          style={{ backgroundColor: '#1C2B3A' }}
        >
          {initials}
        </div>
        <button
          onClick={onLogout}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}

function App() {
  const [people, setPeople] = useState([])
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [userEmail] = useState(() => localStorage.getItem('userEmail'))

  // Capture state — persists across tab switches
  const [captureText, setCaptureText] = useState('')
  const [captureResult, setCaptureResult] = useState(null)
  const [captureSaves, setCaptureSaves] = useState({})
  const [capturePendingActions, setCapturePendingActions] = useState([])
  const [captureAcceptedActions, setCaptureAcceptedActions] = useState([])
  const [chatHistory, setChatHistory] = useState([]) // multi-turn conversation history
  const [conversationTitle, setConversationTitle] = useState('')
  const [savedConversationId, setSavedConversationId] = useState(null)
  const [newPeopleData, setNewPeopleData] = useState([])
  const [showImport, setShowImport] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Check whether to show onboarding whenever token is set
  useEffect(() => {
    if (!token) return
    fetch('/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(me => { if (!me?.name) setShowOnboarding(true) })
      .catch(() => {})
  }, [token])

  const handlePersonAdded = (newPerson) => {
    setPeople(prev => [...prev, newPerson])
  }

  const handlePeopleImported = (newPeople) => {
    setPeople(prev => [...prev, ...newPeople])
    setShowImport(false)
  }

  function handleLogin(newToken) {
    setToken(newToken)
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('userEmail')
    setToken(null)
  }

  if (!token) {
    const path = window.location.pathname
    if (path === '/reset-password') return <ResetPassword onDone={() => window.location.href = '/'} />
    if (path === '/forgot-password') return <ForgotPassword onBack={() => window.location.href = '/'} />
    if (path === '/privacy') return <Privacy onBack={() => window.location.href = '/'} />
    return <Login onLogin={handleLogin} onForgotPassword={() => window.location.href = '/forgot-password'} />
  }

  const captureProps = {
    captureText, setCaptureText,
    captureResult, setCaptureResult,
    captureSaves, setCaptureSaves,
    capturePendingActions, setCapturePendingActions,
    captureAcceptedActions, setCaptureAcceptedActions,
    chatHistory, setChatHistory,
    conversationTitle, setConversationTitle,
    savedConversationId, setSavedConversationId,
    newPeopleData, setNewPeopleData,
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {showOnboarding && <Onboarding onComplete={() => {
          localStorage.removeItem('varys_guide_done')
          setShowOnboarding(false)
        }} />}
        <NavBar userEmail={userEmail} onLogout={handleLogout} />
        <CaptureNudgeBanner />
        <main className="max-w-3xl mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<QuickCapture {...captureProps} />} />
            <Route path="/network" element={
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">Network</h2>
                  </div>
                  <button
                    onClick={() => setShowImport(v => !v)}
                    className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    style={{ color: '#B08D57' }}
                  >
                    {showImport ? '✕ Cancel import' : '↑ Import from LinkedIn'}
                  </button>
                </div>
                {showImport && (
                  <ImportContacts
                    existingPeople={people}
                    onImportComplete={handlePeopleImported}
                  />
                )}
                <AddPerson onPersonAdded={handlePersonAdded} />
                <PeopleList people={people} setPeople={setPeople} />
              </>
            } />
            <Route path="/people/:id" element={<PersonDetail />} />
            <Route path="/conversations" element={<Conversations />} />
            <Route path="/actions" element={<Actions />} />
            <Route path="/me" element={<Me />} />
            <Route path="/privacy" element={<Privacy />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App