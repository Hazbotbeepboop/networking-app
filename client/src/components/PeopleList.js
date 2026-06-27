import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { authFetch } from '../App'

function PeopleList({ people, setPeople }) {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authFetch('/people')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setPeople(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-medium text-gray-900">My network</h2>
          <p className="text-sm text-gray-400 mt-0.5">{people.length} contact{people.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl animate-pulse">
              <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="flex-1">
                <div className="h-3.5 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : people.length === 0 ? (
        <div className="text-center py-16">
          <div
            className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: '#F5EDD8' }}
          >
            <svg className="w-5 h-5" style={{ color: '#B08D57' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-700 mb-1">No contacts yet</h3>
          <p className="text-sm text-gray-400 max-w-xs mx-auto leading-relaxed">
            Add someone above, or{' '}
            <Link to="/" className="underline underline-offset-2 hover:text-gray-600">log a conversation</Link>
            {' '}— Varys will suggest contacts automatically.
          </p>
        </div>
      ) : (
      <div className="space-y-2">
        {people.map(person => (
          <Link
            to={`/people/${person._id}`}
            key={person._id}
            className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors group"
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium text-[#B08D57] flex-shrink-0"
              style={{ backgroundColor: '#1C2B3A' }}
            >
              {person.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 group-hover:text-gray-700">{person.name}</div>
              {(person.role || person.company) && (
                <div className="text-xs text-gray-400 mt-0.5">
                  {person.role}{person.role && person.company ? ' · ' : ''}{person.company}
                </div>
              )}
            </div>
            {person.whereMet && (
              <div className="text-xs text-gray-300 hidden sm:block">{person.whereMet}</div>
            )}
            <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
      )}
    </div>
  )
}

export default PeopleList