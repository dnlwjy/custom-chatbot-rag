import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import Home from './pages/ArtificialIntelligence'
import About from './pages/Robotics'
import Services from './pages/QuantumComputing'
import Contact from './pages/SpaceExploration'
import ChatWidget from './components/ChatWidget'

function App() {
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

