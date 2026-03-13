import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { POSProvider } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface FormState {
  provider: POSProvider;
  apiKey: string;
  merchantId: string;
  locationId: string;
}

const POSIntegration: React.FC = () => {
  const { business, refreshBusiness } = useAuth();
  const isConnected = !!business?.posMerchantId;

  const [form, setForm] = useState<FormState>({
    provider: (business?.posProvider as POSProvider) || POSProvider.SQUARE,
    apiKey: '',
    merchantId: business?.posMerchantId || '',
    locationId: '',
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const handleChange = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    setTestResult(null);
    setSaveMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/pos/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          provider: form.provider,
          apiKey: form.apiKey,
          merchantId: form.merchantId,
          locationId: form.locationId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to save configuration');
      }

      setSaveMessage('Configuration saved successfully.');
      await refreshBusiness();
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/pos/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          provider: form.provider,
          apiKey: form.apiKey,
          merchantId: form.merchantId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setTestResult({ ok: false, message: data.error?.message || 'Connection test failed' });
      } else {
        setTestResult({ ok: true, message: 'Connection successful!' });
      }
    } catch (err) {
      setTestResult({ ok: false, message: err instanceof Error ? err.message : 'Connection test failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleSyncMenu = async () => {
    setSyncing(true);
    setSyncMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/pos/sync`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Sync failed');
      }

      setSyncMessage('Menu synced successfully!');
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>POS Integration</h1>
        <p>Configure your Point of Sale system integration</p>
      </div>

      <div className="card">
        <h3>Integration Status</h3>
        <div style={{
          padding: '15px',
          backgroundColor: isConnected ? '#d4edda' : '#f8d7da',
          border: `1px solid ${isConnected ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <strong>Status:</strong> {isConnected ? 'Connected' : 'Disconnected'}
          {isConnected && business?.posMerchantId && (
            <span style={{ marginLeft: '10px', fontSize: '14px', color: '#6c757d' }}>
              (Merchant: {business.posMerchantId.substring(0, 8)}...)
            </span>
          )}
        </div>
      </div>

      <div className="card">
        <h3>POS Provider Configuration</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="provider">Select POS Provider</label>
            <select
              id="provider"
              value={form.provider}
              onChange={handleChange('provider')}
            >
              <option value={POSProvider.SQUARE}>Square</option>
              <option value={POSProvider.TOAST}>Toast</option>
              <option value={POSProvider.CLOVER}>Clover</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="apiKey">API Key / Access Token</label>
            <input
              type="password"
              id="apiKey"
              placeholder="Enter your POS API key"
              value={form.apiKey}
              onChange={handleChange('apiKey')}
            />
          </div>

          <div className="form-group">
            <label htmlFor="merchantId">Merchant ID</label>
            <input
              type="text"
              id="merchantId"
              placeholder="Enter your merchant ID"
              value={form.merchantId}
              onChange={handleChange('merchantId')}
            />
          </div>

          <div className="form-group">
            <label htmlFor="locationId">Location ID</label>
            <input
              type="text"
              id="locationId"
              placeholder="Enter your location ID"
              value={form.locationId}
              onChange={handleChange('locationId')}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginRight: '10px' }} disabled={saving}>
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleTestConnection} disabled={testing}>
            {testing ? 'Testing...' : 'Test Connection'}
          </button>

          {saveMessage && (
            <div style={{ marginTop: '10px', fontSize: '14px', color: saveMessage.includes('success') ? '#27ae60' : '#e74c3c' }}>
              {saveMessage}
            </div>
          )}

          {testResult && (
            <div style={{ marginTop: '10px', fontSize: '14px', color: testResult.ok ? '#27ae60' : '#e74c3c' }}>
              {testResult.message}
            </div>
          )}
        </form>
      </div>

      <div className="card">
        <h3>Menu Sync</h3>
        <p style={{ marginBottom: '15px', color: '#7f8c8d' }}>
          Synchronize your drink menu with your POS system
        </p>
        <button className="btn btn-primary" onClick={handleSyncMenu} disabled={syncing || !isConnected}>
          {syncing ? 'Syncing...' : 'Sync Menu Now'}
        </button>
        {!isConnected && (
          <div style={{ marginTop: '10px', fontSize: '14px', color: '#7f8c8d' }}>
            Connect your POS first to enable menu sync.
          </div>
        )}
        {syncMessage && (
          <div style={{ marginTop: '10px', fontSize: '14px', color: syncMessage.includes('success') ? '#27ae60' : '#e74c3c' }}>
            {syncMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default POSIntegration;
