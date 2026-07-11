import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import Home from './pages/ArtificialIntelligence'
import About from './pages/Robotics'
import Services from './pages/QuantumComputing'
import Contact from './pages/SpaceExploration'
import ChatWidget from './components/ChatWidget'
import { WEBSITE_SCHEMA } from './data/knowledgeBase'

function App() {
  useEffect(() => {
    let script = document.getElementById('website-jsonld') as HTMLScriptElement
    if (!script) {
      script = document.createElement('script')
      script.id = 'website-jsonld'
      script.type = 'application/ld+json'
      script.text = JSON.stringify(WEBSITE_SCHEMA)
      document.head.appendChild(script)
    }
  }, [])

  return (
    <Router>
      <div>
        <header>
          <nav>
            <NavLink to="/">Artificial Intelligence</NavLink>
            <NavLink to="/about">Robotics</NavLink>
            <NavLink to="/services">Quantum Computing</NavLink>
            <NavLink to="/contact">Space Exploration</NavLink>
          </nav>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<Services />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </main>
        <ChatWidget />
      </div>
    </Router>
  )
}

export default App

