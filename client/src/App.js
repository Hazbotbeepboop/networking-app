import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import PeopleList from './components/PeopleList'
import AddPerson from './components/AddPerson'
import PersonDetail from './components/PersonDetail'
import Me from './components/Me'
import QuickCapture from './components/QuickCapture'

function App() {
  const [people, setPeople] = useState([])

  const handlePersonAdded = (newPerson) => {
    setPeople(prev => [...prev, newPerson])
  }

  return (
    <Router>
      <div>
        <h1>Networking App</h1>
        <nav>
          <Link to="/">My Network</Link> | <Link to="/capture">Quick Capture</Link> | <Link to="/me">My Profile</Link>
        </nav>
        <Routes>
          <Route path="/" element={
            <>
              <AddPerson onPersonAdded={handlePersonAdded} />
              <PeopleList people={people} setPeople={setPeople} />
            </>
          } />
          <Route path="/people/:id" element={<PersonDetail />} />
          <Route path="/me" element={<Me />} />
          <Route path="/capture" element={<QuickCapture />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App