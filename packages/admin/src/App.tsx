import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import MenuManagement from './pages/MenuManagement';
import OrderManagement from './pages/OrderManagement';
import POSIntegration from './pages/POSIntegration';
import Subscription from './pages/Subscription';
import AdminSettings from './pages/AdminSettings';
import Onboarding from './pages/Onboarding';
import './App.css';

function AppLayout() {
  const location = useLocation();
  const { logout, user } = useAuth();
  const isOnboarding = location.pathname.startsWith('/onboarding');

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
            <Link to="/orders">Order Management</Link>
          </li>
          <li>
            <Link to="/pos">POS Integration</Link>
          </li>
          <li>
            <Link to="/subscription">Subscription</Link>
          </li>
          <li>
            <Link to="/settings">Settings</Link>
          </li>
        </ul>
        <div className="sidebar-footer">
          {user && (
            <div className="user-info">
              <span className="user-email">{user.email}</span>
              <button onClick={logout} className="logout-btn">
                Sign out
              </button>
            </div>
          )}
        </div>
      </nav>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/menu" element={<MenuManagement />} />
          <Route path="/orders" element={<OrderManagement />} />
          <Route path="/pos" element={<POSIntegration />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/settings" element={<AdminSettings />} />
        </Routes>
      </main>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected routes */}
      <Route
        path="/onboarding/*"
        element={
          <ProtectedRoute requireOnboardingComplete={false}>
            <Onboarding />
          </ProtectedRoute>
        }
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
