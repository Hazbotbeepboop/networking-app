import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { authFetch } from '../App'

function PeopleList({ people, setPeople }) {
  useEffect(() => {
    authFetch('/people')
      .then(res => res.json())
      .then(data => setPeople(data))
  }, [])

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-medium text-gray-900">My network</h2>
          <p className="text-sm text-gray-400 mt-0.5">{people.length} contact{people.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {people.length === 0 && (
        <div className="text-sm text-gray-400 py-8 text-center">
          No contacts yet — add your first person above
        </div>
      )}

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
    </div>
  )
}

export default PeopleList