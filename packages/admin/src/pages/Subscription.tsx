import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: 'monthly' | 'annual';
  features: string[];
}

interface SubscriptionStatus {
  status: 'active' | 'trial' | 'paused' | 'suspended' | 'churned' | 'grace_period' | 'cancelled' | null;
  planId: string | null;
  subscriptionId?: string;
  currentPeriodEnd?: string;
  trialEndsAt?: string;
  pausedAt?: string;
  suspendedAt?: string;
  cancelledAt?: string;
  gracePeriodEndsAt?: string;
  resumeAt?: string;
}

const Subscription: React.FC = () => {
  const { user, business, refreshBusiness } = useAuth();
  const businessId = user?.businessId;
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (businessId) {
      fetchSubscriptionData();
    } else {
      setLoading(false);
    }
  }, [businessId]);

  const fetchSubscriptionData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [plansRes, statusRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/subscription/plans`, {
          credentials: 'include',
        }),
        fetch(`${API_BASE_URL}/api/subscription?businessId=${businessId}`, {
          credentials: 'include',
        }),
      ]);

      if (plansRes.ok) {
        const data = await plansRes.json();
        if (data.success) {
          setPlans(data.data);
        }
      }

      if (statusRes.ok) {
        const data = await statusRes.json();
        if (data.success) {
          setStatus(data.data);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrial = async () => {
    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/subscription/start-trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
        credentials: 'include',
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`Free trial started! Ends on ${new Date(data.data.trialEndsAt).toLocaleDateString()}`);
        await refreshBusiness();
        await fetchSubscriptionData();
      } else {
        setError(data.error?.message || 'Failed to start trial');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start trial');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckout = async (planId: string) => {
    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/subscription/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, planId }),
        credentials: 'include',
      });

      const data = await res.json();
      if (data.success) {
        // In a real app, redirect to Stripe/Square checkout
        // For now, simulate redirect
        window.location.href = `${API_BASE_URL}${data.data.checkoutUrl}`;
      } else {
        setError(data.error?.message || 'Failed to create checkout session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create checkout session');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription?')) {
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/subscription/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
        credentials: 'include',
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage('Subscription cancelled successfully.');
        await refreshBusiness();
        await fetchSubscriptionData();
      } else {
        setError(data.error?.message || 'Failed to cancel subscription');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusDisplay = () => {
    if (!status?.status) {
      // Fallback to business.accountState if status route didn't return much
      const state = business?.accountState || 'ONBOARDING';
      switch (state) {
        case 'ONBOARDING': return { text: 'Setup In Progress', color: '#3498db' };
        case 'SETUP_COMPLETE': return { text: 'Setup Complete', color: '#27ae60' };
        case 'TRIAL': return { text: 'Free Trial', color: '#f39c12' };
        case 'ACTIVE': return { text: 'Active', color: '#27ae60' };
        case 'PAUSED': return { text: 'Paused', color: '#f39c12' };
        case 'SUSPENDED': return { text: 'Suspended', color: '#e74c3c' };
        default: return { text: state, color: '#7f8c8d' };
      }
    }

    switch (status.status) {
      case 'active': return { text: 'Active', color: '#27ae60' };
      case 'trial': return { text: 'Free Trial', color: '#f39c12' };
      case 'paused': return { text: 'Paused', color: '#f39c12' };
      case 'suspended': return { text: 'Suspended', color: '#e74c3c' };
      case 'grace_period': return { text: 'Grace Period', color: '#e67e22' };
      case 'cancelled': return { text: 'Cancelled', color: '#95a5a6' };
      default: return { text: status.status, color: '#7f8c8d' };
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h1>Subscription</h1>
          <p>Manage your plan and billing</p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p>Loading subscription details...</p>
        </div>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay();
  const isSubscribed = status?.status === 'active' || status?.status === 'grace_period';
  const canStartTrial = business?.accountState === 'SETUP_COMPLETE';

  return (
    <div className="subscription-page">
      <div className="page-header">
        <h1>Subscription</h1>
        <p>Manage your plan and billing</p>
      </div>

      {error && (
        <div className="alert alert-error" style={{
          backgroundColor: '#fee',
          color: '#c00',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success" style={{
          backgroundColor: '#efe',
          color: '#27ae60',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          {successMessage}
        </div>
      )}

      {/* Current Status Card */}
      <div className="card" style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '20px' }}>Current Status</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#7f8c8d', textTransform: 'uppercase' }}>Plan Status</label>
            <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '5px 0', color: statusDisplay.color }}>
              {statusDisplay.text}
            </p>
          </div>
          {status?.planId && (
            <div>
              <label style={{ fontSize: '12px', color: '#7f8c8d', textTransform: 'uppercase' }}>Current Plan</label>
              <p style={{ fontSize: '18px', fontWeight: 500, margin: '5px 0' }}>
                {plans.find(p => p.id === status.planId)?.name || status.planId}
              </p>
            </div>
          )}
          {status?.currentPeriodEnd && (
            <div>
              <label style={{ fontSize: '12px', color: '#7f8c8d', textTransform: 'uppercase' }}>Next Billing Date</label>
              <p style={{ fontSize: '18px', fontWeight: 500, margin: '5px 0' }}>
                {new Date(status.currentPeriodEnd).toLocaleDateString()}
              </p>
            </div>
          )}
          {status?.trialEndsAt && (
            <div>
              <label style={{ fontSize: '12px', color: '#7f8c8d', textTransform: 'uppercase' }}>Trial Ends On</label>
              <p style={{ fontSize: '18px', fontWeight: 500, margin: '5px 0' }}>
                {new Date(status.trialEndsAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {canStartTrial && (
          <div style={{ marginTop: '20px' }}>
            <button
              onClick={handleStartTrial}
              disabled={actionLoading}
              className="btn btn-primary"
            >
              {actionLoading ? 'Starting...' : 'Start 14-Day Free Trial'}
            </button>
          </div>
        )}

        {isSubscribed && (
          <div style={{ marginTop: '20px' }}>
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="btn btn-outline-danger"
              style={{ color: '#e74c3c', borderColor: '#e74c3c', background: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
            >
              Cancel Subscription
            </button>
          </div>
        )}
      </div>

      {/* Plans Section */}
      {!isSubscribed && (
        <div className="plans-container">
          <h3 style={{ marginBottom: '20px' }}>Choose a Plan</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {plans.map(plan => (
              <div key={plan.id} className="card plan-card" style={{ border: plan.interval === 'annual' ? '2px solid #3498db' : '1px solid #ddd' }}>
                {plan.interval === 'annual' && (
                  <div style={{ backgroundColor: '#3498db', color: 'white', padding: '4px 12px', fontSize: '12px', borderRadius: '20px', display: 'inline-block', marginBottom: '10px' }}>
                    Best Value
                  </div>
                )}
                <h4 style={{ fontSize: '20px', marginBottom: '10px' }}>{plan.name}</h4>
                <div style={{ marginBottom: '20px' }}>
                  <span style={{ fontSize: '32px', fontWeight: 'bold' }}>${plan.price}</span>
                  <span style={{ color: '#7f8c8d' }}>/{plan.interval === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
                <ul style={{ padding: 0, listStyle: 'none', marginBottom: '30px' }}>
                  {plan.features.map((feature, i) => (
                    <li key={i} style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#27ae60' }}>✓</span> {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={actionLoading}
                  className={`btn ${plan.interval === 'annual' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ width: '100%', padding: '12px' }}
                >
                  {actionLoading ? 'Processing...' : `Select ${plan.name}`}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Support Section */}
      <div className="card" style={{ marginTop: '40px', backgroundColor: '#f9f9f9' }}>
        <h3>Need Help?</h3>
        <p style={{ color: '#7f8c8d', marginTop: '10px' }}>
          If you have questions about billing or need a custom plan for multiple locations, please contact our support team.
        </p>
        <div style={{ marginTop: '15px' }}>
          <a href="mailto:support@drink-ux.com" style={{ color: '#3498db', textDecoration: 'none' }}>support@drink-ux.com</a>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
