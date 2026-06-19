import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'

function PeopleList({ people, setPeople }) {
  useEffect(() => {
    fetch('/people')
      .then(res => res.json())
      .then(data => setPeople(data))
  }, [])

  return (
    <div>
      <h2>My Network</h2>
      {people.map(person => (
        <div key={person._id}>
          <Link to={`/people/${person._id}`}>
            <h3>{person.name}</h3>
          </Link>
          <p>{person.role} at {person.company}</p>
        </div>
      ))}
    </div>
  )
}

export default PeopleList