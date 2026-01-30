import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOnboardingComplete?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireOnboardingComplete = true,
}) => {
  const { isAuthenticated, isLoading, business } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login, preserving the intended destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Smart routing based on onboarding state
  const isOnboarding = location.pathname.startsWith('/onboarding');
  const needsOnboarding = business?.accountState === 'ONBOARDING';

  if (requireOnboardingComplete && needsOnboarding && !isOnboarding) {
    // User needs to complete onboarding, redirect there
    return <Navigate to="/onboarding" replace />;
  }

  if (!needsOnboarding && isOnboarding) {
    // Onboarding complete but user is on onboarding page, go to dashboard
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
