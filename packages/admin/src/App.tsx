import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import MenuManagement from './pages/MenuManagement';
import POSIntegration from './pages/POSIntegration';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="sidebar">
          <div className="logo">
            <h2>Drink-UX Admin</h2>
          </div>
          <ul className="nav-links">
            <li>
              <Link to="/">Dashboard</Link>
            </li>
            <li>
              <Link to="/menu">Menu Management</Link>
            </li>
            <li>
              <Link to="/pos">POS Integration</Link>
            </li>
          </ul>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/menu" element={<MenuManagement />} />
            <Route path="/pos" element={<POSIntegration />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
