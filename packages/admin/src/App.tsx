import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import MenuManagement from './pages/MenuManagement';
import POSIntegration from './pages/POSIntegration';
import './App.css';

function Sidebar() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path ? 'active' : '';

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 2C5.13 2 2 5.13 2 9s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm0 12.25A5.25 5.25 0 1 1 9 3.75a5.25 5.25 0 0 1 0 10.5z" fill="white" fillOpacity="0.9"/>
            <circle cx="9" cy="9" r="2.5" fill="white"/>
          </svg>
        </div>
        <div className="logo-text-wrap">
          <div className="logo-name">Drink-UX</div>
          <div className="logo-sub">Brew &amp; Blossom</div>
        </div>
      </div>

      <nav className="nav-list">
        <Link to="/" className={`nav-item ${isActive('/')}`}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="1" width="6" height="6" rx="1.5"/>
            <rect x="9" y="1" width="6" height="6" rx="1.5"/>
            <rect x="1" y="9" width="6" height="6" rx="1.5"/>
            <rect x="9" y="9" width="6" height="6" rx="1.5"/>
          </svg>
          <span className="nav-label">Dashboard</span>
        </Link>
        <Link to="/orders" className={`nav-item ${isActive('/orders')}`}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 4h12M2 8h8M2 12h5"/>
          </svg>
          <span className="nav-label">Orders</span>
        </Link>
        <Link to="/menu" className={`nav-item ${isActive('/menu')}`}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2v4M5 3.5C5 5.4 6.3 7 8 7s3-1.6 3-3.5"/>
            <path d="M3 7c0 2.76 2.24 5 5 5s5-2.24 5-5"/>
            <path d="M8 12v2M6 14h4"/>
          </svg>
          <span className="nav-label">Menu</span>
        </Link>
        <Link to="/pos" className={`nav-item ${isActive('/pos')}`}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="2.5"/>
            <path d="M8 1.5v1.3M8 13.2v1.3M1.5 8h1.3M13.2 8h1.3M3.2 3.2l.9.9M11.9 11.9l.9.9M3.2 12.8l.9-.9M11.9 4.1l.9-.9"/>
          </svg>
          <span className="nav-label">Settings</span>
        </Link>
      </nav>

      <div className="sidebar-footer">
        <div className="user-row">
          <div className="user-avatar">MB</div>
          <div>
            <div className="user-name">Morgan B.</div>
            <div className="user-role">Owner</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="app">
        <Sidebar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/menu" element={<MenuManagement />} />
          <Route path="/pos" element={<POSIntegration />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
