import React, { useState, useEffect } from 'react'

export default function ResetPassword({ onDone }) {
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token')
    if (t) setToken(t)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        return
      }
      setDone(true)
    } catch {
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
          {done ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-700">Password updated. You can now sign in.</p>
              <button
                onClick={onDone}
                className="w-full py-2.5 text-sm font-medium rounded-lg transition-opacity"
                style={{ backgroundColor: '#1C2B3A', color: '#B08D57' }}
              >
                Sign in
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-sm font-medium text-gray-800 mb-4">Choose a new password</h2>
              {!token && (
                <p className="text-xs text-red-500 mb-4">Invalid reset link. Please request a new one.</p>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">New password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoFocus
                    placeholder="At least 8 characters"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Confirm password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    placeholder="Same password again"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#B08D57] transition-colors"
                  />
                </div>

                {error && <p className="text-xs text-red-500">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || !token}
                  className="w-full py-2.5 text-sm font-medium rounded-lg transition-opacity disabled:opacity-60"
                  style={{ backgroundColor: '#1C2B3A', color: '#B08D57' }}
                >
                  {loading ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
