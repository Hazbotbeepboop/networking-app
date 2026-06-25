import React, { useState } from 'react'

export default function Login({ onLogin, onForgotPassword }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        return
      }

      localStorage.setItem('token', data.token)
      localStorage.setItem('userEmail', data.email)
      onLogin(data.token)
    } catch (err) {
      setError('Could not connect to server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <h1 className="text-2xl font-medium tracking-widest text-gray-900">
            VAR<span className="text-[#B08D57]">Y</span>S
          </h1>
          <p className="text-sm text-gray-400 mt-2">Your private network intelligence</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setMode('login'); setError('') }}
              className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                mode === 'login'
                  ? 'bg-navy text-[#B08D57] border-navy font-medium'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
              style={mode === 'login' ? { backgroundColor: '#1C2B3A', borderColor: '#1C2B3A' } : {}}
            >
              Sign in
            </button>
            <button
              onClick={() => { setMode('register'); setError('') }}
              className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                mode === 'register'
                  ? 'text-[#B08D57] font-medium'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
              style={mode === 'register' ? { backgroundColor: '#1C2B3A', borderColor: '#1C2B3A' } : {}}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="you@example.com"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder={mode === 'register' ? 'At least 8 characters' : ''}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors"
              />
            </div>

            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-medium rounded-lg transition-opacity disabled:opacity-60"
              style={{ backgroundColor: '#1C2B3A', color: '#B08D57' }}
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>

            {mode === 'login' && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </form>
        </div>
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => window.location.href = '/privacy'}
            className="text-xs text-gray-300 hover:text-gray-400 transition-colors"
          >
            Privacy &amp; Data
          </button>
        </div>
      </div>
    </div>
  )
}