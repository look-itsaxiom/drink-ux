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
  // If business is null/undefined, assume onboarding needed (safe default)
  const needsOnboarding = !business || business.accountState === 'ONBOARDING';

  if (requireOnboardingComplete && needsOnboarding && !isOnboarding) {
    // User needs to complete onboarding, redirect there
    return <Navigate to="/onboarding" replace />;
  }

  // Only redirect away from onboarding if we KNOW business is complete
  if (business && business.accountState !== 'ONBOARDING' && isOnboarding) {
    // Onboarding complete, redirect to dashboard
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
