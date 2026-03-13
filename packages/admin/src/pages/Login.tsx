import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface LocationState {
  from?: { pathname: string };
}

type AuthView = 'login' | 'forgot' | 'reset';

const Login: React.FC = () => {
  const location = useLocation();
  const queryToken = new URLSearchParams(location.search).get('token') || '';

  const [view, setView] = useState<AuthView>(queryToken ? 'reset' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState(queryToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const state = location.state as LocationState;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      // Navigate to intended destination or dashboard
      const from = state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to request password reset');
      }

      const token = data.data?.resetToken as string | undefined;
      if (token) {
        setResetToken(token);
        setView('reset');
        setSuccess('Reset token generated. Set your new password below.');
      } else {
        setSuccess('If that account exists, a password reset email has been sent.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request password reset');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to reset password');
      }

      setSuccess('Password updated. You can now sign in with your new password.');
      setView('login');
      setPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const authHeader = {
    login: { title: 'Drink-UX', subtitle: 'Sign in to your account' },
    forgot: { title: 'Reset Password', subtitle: 'Enter your email to request a reset' },
    reset: { title: 'Set New Password', subtitle: 'Use your reset token to choose a new password' },
  }[view];

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>{authHeader.title}</h1>
          <p>{authHeader.subtitle}</p>
        </div>

        <form
          onSubmit={view === 'login' ? handleLogin : view === 'forgot' ? handleForgotPassword : handleResetPassword}
          className="auth-form"
        >
          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          {view === 'login' && (
            <>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  disabled={isSubmitting}
                />
              </div>

              <div className="auth-inline-actions">
                <button
                  type="button"
                  className="auth-link-button"
                  onClick={() => {
                    setView('forgot');
                    setForgotEmail(email);
                    setError(null);
                    setSuccess(null);
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <button type="submit" className="auth-button" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>
            </>
          )}

          {view === 'forgot' && (
            <>
              <div className="form-group">
                <label htmlFor="forgot-email">Account Email</label>
                <input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  disabled={isSubmitting}
                />
              </div>
              <button type="submit" className="auth-button" disabled={isSubmitting}>
                {isSubmitting ? 'Requesting reset...' : 'Request reset'}
              </button>
            </>
          )}

          {view === 'reset' && (
            <>
              <div className="form-group">
                <label htmlFor="reset-token">Reset Token</label>
                <input
                  id="reset-token"
                  type="text"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="Paste reset token"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="form-group">
                <label htmlFor="new-password">New Password</label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  disabled={isSubmitting}
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirm-new-password">Confirm New Password</label>
                <input
                  id="confirm-new-password"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  disabled={isSubmitting}
                />
              </div>
              <button type="submit" className="auth-button" disabled={isSubmitting}>
                {isSubmitting ? 'Updating password...' : 'Update password'}
              </button>
            </>
          )}
        </form>

        <div className="auth-footer">
          {view === 'login' && (
            <p>
              Don&apos;t have an account? <Link to="/signup">Sign up</Link>
            </p>
          )}
          {view !== 'login' && (
            <p>
              <button
                type="button"
                className="auth-link-button"
                onClick={() => {
                  setView('login');
                  setError(null);
                  setSuccess(null);
                }}
              >
                Back to sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
