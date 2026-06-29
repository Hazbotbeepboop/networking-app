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
  const apiUrl = url.startsWith('/auth') ? url : `/api${url}`
  return fetch(apiUrl, {
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
    <div className="fixed bottom-[60px] left-0 right-0 sm:static sm:mt-0 flex items-center justify-center px-6 py-2.5 z-40" style={{ backgroundColor: '#B08D57' }}>
      <div className="flex items-center gap-2 text-sm font-medium" style={{ color: '#1C2B3A' }}>
        <span className="text-base sm:hidden">↓</span>
        <span className="text-base hidden sm:inline">↑</span>
        <span className="sm:hidden">Tap <Link to="/" className="underline underline-offset-2 font-semibold">Capture</Link> below to log your first conversation and begin using Varys</span>
        <span className="hidden sm:inline">Click <Link to="/" className="underline underline-offset-2 font-semibold">Capture</Link> in the menu above to log your first conversation and begin using Varys</span>
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

function NavBar({ userEmail, onLogout, overdueCount }) {
  const location = useLocation()
  const links = [
    {
      to: '/', label: 'Capture',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>,
    },
    {
      to: '/network', label: 'Network',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>,
    },
    {
      to: '/conversations', label: 'Convos',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" /></svg>,
    },
    {
      to: '/actions', label: 'Actions',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      to: '/me', label: 'Profile',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>,
    },
  ]

  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : '?'

  return (
    <>
      {/* ── Desktop nav ── */}
      <nav className="hidden sm:flex items-center justify-between px-6 border-b border-gray-100" style={{ height: '52px' }}>
        <div className="text-sm font-medium tracking-widest text-gray-900">
          VAR<span className="text-[#B08D57]">Y</span>S
        </div>
        <div className="flex gap-7">
          {links.map(link => {
            const active = location.pathname === link.to
            const isActionsTab = link.to === '/actions'
            const hasOverdue = isActionsTab && overdueCount > 0
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm pb-0.5 transition-colors relative ${
                  active
                    ? 'text-gray-900 font-medium border-b-2 border-[#B08D57]'
                    : hasOverdue
                    ? 'text-red-500 hover:text-red-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {link.label === 'Convos' ? 'Conversations' : link.label}
                {hasOverdue && <span className="absolute -top-1 -right-3 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">{overdueCount}</span>}
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

      {/* ── Mobile top bar ── */}
      <nav className="flex sm:hidden fixed top-0 left-0 right-0 z-50 items-center justify-between px-4 border-b border-gray-100 bg-white" style={{ height: '52px' }}>
        <div className="text-sm font-medium tracking-widest text-gray-900">
          VAR<span className="text-[#B08D57]">Y</span>S
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

      {/* ── Mobile bottom tab bar ── */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 flex px-2">
        {links.map(link => {
          const active = location.pathname === link.to
          const isActionsTab = link.to === '/actions'
          const hasOverdue = isActionsTab && overdueCount > 0
          const color = active ? '#B08D57' : hasOverdue ? '#EF4444' : '#9CA3AF'
          return (
            <Link
              key={link.to}
              to={link.to}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors"
              style={{ color }}
            >
              <div className="w-5 h-5 relative">
                {link.icon}
                {hasOverdue && !active && (
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">{overdueCount}</span>
                )}
              </div>
              <span className="text-[10px] font-medium">{link.label}</span>
            </Link>
          )
        })}
      </div>
    </>
  )
}

function AuthenticatedApp({ onLogout }) {
  const [people, setPeople] = useState([])
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
  const [overdueCount, setOverdueCount] = useState(0)

  // Fetch overdue action count for tab badge
  useEffect(() => {
    authFetch('/actions')
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return
        const now = new Date(); now.setHours(0, 0, 0, 0)
        const count = data.filter(a => {
          if (!a.dueDate) return false
          const due = new Date(a.dueDate); due.setHours(0, 0, 0, 0)
          return due < now
        }).length
        setOverdueCount(count)
      })
      .catch(() => {})
  }, [])

  // Check whether to show onboarding on mount (once per authenticated session)
  useEffect(() => {
    fetch('/api/me', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(res => res.json())
      .then(me => { if (!me?.name) setShowOnboarding(true) })
      .catch(() => {})
  }, [])

  const handlePersonAdded = (newPerson) => {
    setPeople(prev => [...prev, newPerson])
  }

  const handlePeopleImported = (newPeople) => {
    setPeople(prev => [...prev, ...newPeople])
    setShowImport(false)
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
        <NavBar userEmail={userEmail} onLogout={onLogout} overdueCount={overdueCount} />
        <CaptureNudgeBanner />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-[68px] sm:pt-8 pb-24 sm:pb-8">
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

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'))

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

  return <AuthenticatedApp key={token} onLogout={handleLogout} />
}

export default App