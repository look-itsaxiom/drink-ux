import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface CatalogSummary {
  categories: number;
  bases: number;
  modifiers: number;
}

interface POSStatus {
  configured: boolean;
  environment: string;
}

const Dashboard: React.FC = () => {
  const { user, business } = useAuth();
  const businessId = user?.businessId;
  const [loading, setLoading] = useState(true);
  const [catalogSummary, setCatalogSummary] = useState<CatalogSummary>({ categories: 0, bases: 0, modifiers: 0 });
  const [posStatus, setPosStatus] = useState<POSStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (businessId) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [businessId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch catalog and POS status data (business info comes from AuthContext)
      const [categoriesRes, basesRes, modifiersRes, posStatusRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/catalog/categories?businessId=${businessId}`, {
          credentials: 'include',
        }).catch(() => null),
        fetch(`${API_BASE_URL}/api/catalog/bases?businessId=${businessId}`, {
          credentials: 'include',
        }).catch(() => null),
        fetch(`${API_BASE_URL}/api/catalog/modifiers?businessId=${businessId}`, {
          credentials: 'include',
        }).catch(() => null),
        fetch(`${API_BASE_URL}/api/pos/oauth/status`, {
          credentials: 'include',
        }).catch(() => null),
      ]);

      // Parse catalog counts
      const summary: CatalogSummary = { categories: 0, bases: 0, modifiers: 0 };

      if (categoriesRes?.ok) {
        const data = await categoriesRes.json();
        if (data.success && Array.isArray(data.data)) {
          summary.categories = data.data.length;
        }
      }

      if (basesRes?.ok) {
        const data = await basesRes.json();
        if (data.success && Array.isArray(data.data)) {
          summary.bases = data.data.length;
        }
      }

      if (modifiersRes?.ok) {
        const data = await modifiersRes.json();
        if (data.success && Array.isArray(data.data)) {
          summary.modifiers = data.data.length;
        }
      }

      setCatalogSummary(summary);

      // Parse POS status
      if (posStatusRes?.ok) {
        const posData = await posStatusRes.json();
        if (posData.success) {
          setPosStatus(posData.data);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getPOSStatusDisplay = () => {
    if (!business?.posMerchantId) {
      return { text: 'Not Connected', color: '#e74c3c', connected: false };
    }
    return { text: 'Connected', color: '#27ae60', connected: true };
  };

  const getSubscriptionDisplay = () => {
    const status = business?.subscriptionStatus || 'trial';
    switch (status.toLowerCase()) {
      case 'active':
        return { text: 'Active', color: '#27ae60' };
      case 'trial':
        return { text: 'Trial', color: '#f39c12' };
      case 'expired':
        return { text: 'Expired', color: '#e74c3c' };
      default:
        return { text: status, color: '#7f8c8d' };
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h1>Dashboard</h1>
          <p>Overview of your business</p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const posStatusDisplay = getPOSStatusDisplay();
  const subscriptionDisplay = getSubscriptionDisplay();

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of your business</p>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#fee',
          color: '#c00',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {/* Business Info Card */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '15px' }}>Business Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#7f8c8d', textTransform: 'uppercase' }}>Business Name</label>
            <p style={{ fontSize: '18px', fontWeight: 500, margin: '5px 0' }}>
              {business?.name || 'Your Business'}
            </p>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#7f8c8d', textTransform: 'uppercase' }}>Account Status</label>
            <p style={{ fontSize: '18px', fontWeight: 500, margin: '5px 0', color: subscriptionDisplay.color }}>
              {subscriptionDisplay.text}
            </p>
            <Link to="/subscription" style={{ fontSize: '12px', color: '#3498db' }}>Manage Subscription &rarr;</Link>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#7f8c8d', textTransform: 'uppercase' }}>Member Since</label>
            <p style={{ fontSize: '18px', fontWeight: 500, margin: '5px 0' }}>
              {business?.createdAt
                ? new Date(business.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Categories</h3>
          <div className="value">{catalogSummary.categories}</div>
          <Link to="/menu" style={{ fontSize: '14px', color: '#3498db' }}>Manage</Link>
        </div>
        <div className="stat-card">
          <h3>Drink Bases</h3>
          <div className="value">{catalogSummary.bases}</div>
          <Link to="/menu" style={{ fontSize: '14px', color: '#3498db' }}>Manage</Link>
        </div>
        <div className="stat-card">
          <h3>Modifiers</h3>
          <div className="value">{catalogSummary.modifiers}</div>
          <Link to="/menu" style={{ fontSize: '14px', color: '#3498db' }}>Manage</Link>
        </div>
        <div className="stat-card">
          <h3>POS Status</h3>
          <div className="value" style={{ color: posStatusDisplay.color, fontSize: '18px' }}>
            {posStatusDisplay.text}
          </div>
          {!posStatusDisplay.connected && (
            <Link to="/onboarding" style={{ fontSize: '14px', color: '#3498db' }}>Connect Now</Link>
          )}
          {posStatusDisplay.connected && business?.posMerchantId && (
            <span style={{ fontSize: '12px', color: '#7f8c8d' }}>
              Merchant: {business.posMerchantId.substring(0, 8)}...
            </span>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h3 style={{ marginBottom: '15px' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link to="/menu" className="btn btn-primary">
            Manage Menu
          </Link>
          {!posStatusDisplay.connected && (
            <Link to="/onboarding" className="btn btn-secondary">
              Connect Square POS
            </Link>
          )}
          <Link to="/orders" className="btn btn-secondary">
            View Orders
          </Link>
          <Link to="/settings" className="btn btn-secondary">
            Settings
          </Link>
        </div>
      </div>

      {/* Setup Progress (show if not fully set up) */}
      {(catalogSummary.categories === 0 || !posStatusDisplay.connected) && (
        <div className="card" style={{ marginTop: '20px', borderLeft: '4px solid #f39c12' }}>
          <h3 style={{ marginBottom: '15px' }}>Complete Your Setup</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: posStatusDisplay.connected ? '#27ae60' : '#ecf0f1',
                color: posStatusDisplay.connected ? 'white' : '#7f8c8d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px'
              }}>
                {posStatusDisplay.connected ? '✓' : '1'}
              </span>
              <span style={{ color: posStatusDisplay.connected ? '#27ae60' : '#2c3e50' }}>
                Connect your Square POS
              </span>
              {!posStatusDisplay.connected && (
                <Link to="/onboarding" style={{ marginLeft: 'auto', fontSize: '14px' }}>
                  Connect &rarr;
                </Link>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: catalogSummary.categories > 0 ? '#27ae60' : '#ecf0f1',
                color: catalogSummary.categories > 0 ? 'white' : '#7f8c8d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px'
              }}>
                {catalogSummary.categories > 0 ? '✓' : '2'}
              </span>
              <span style={{ color: catalogSummary.categories > 0 ? '#27ae60' : '#2c3e50' }}>
                Set up your drink menu
              </span>
              {catalogSummary.categories === 0 && (
                <Link to="/menu" style={{ marginLeft: 'auto', fontSize: '14px' }}>
                  Add Menu &rarr;
                </Link>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: '#ecf0f1',
                color: '#7f8c8d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px'
              }}>
                3
              </span>
              <span style={{ color: '#2c3e50' }}>
                Start accepting orders
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Environment Info (dev only) */}
      {posStatus && (
        <div style={{
          marginTop: '20px',
          padding: '10px',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#7f8c8d'
        }}>
          Square Environment: {posStatus.environment} |
          OAuth Configured: {posStatus.configured ? 'Yes' : 'No'}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
