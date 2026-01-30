import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { BusinessProvider } from './contexts/BusinessContext';
import Dashboard from './pages/Dashboard';
import MenuManagement from './pages/MenuManagement';
import POSIntegration from './pages/POSIntegration';
import Onboarding from './pages/Onboarding';
import './App.css';

function AppLayout() {
  const location = useLocation();
  const isOnboarding = location.pathname === '/onboarding';

  // Onboarding has its own layout
  if (isOnboarding) {
    return <Onboarding />;
  }

  return (
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
  );
}

function App() {
  return (
    <BusinessProvider>
      <Router>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </Router>
    </BusinessProvider>
  );
}

export default App;
