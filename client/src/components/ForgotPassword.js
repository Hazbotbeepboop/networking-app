import React, { useState } from 'react'

export default function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        return
      }
      setSent(true)
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
          {sent ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-700">
                If that email is registered, you'll receive a reset link shortly. Check your inbox.
              </p>
              <button
                onClick={onBack}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                ← Back to sign in
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-sm font-medium text-gray-800 mb-4">Reset your password</h2>
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

                {error && <p className="text-xs text-red-500">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 text-sm font-medium rounded-lg transition-opacity disabled:opacity-60"
                  style={{ backgroundColor: '#1C2B3A', color: '#B08D57' }}
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
              <div className="mt-4 text-center">
                <button
                  onClick={onBack}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ← Back to sign in
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
