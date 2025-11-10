import React, { useState } from 'react';
import { POSProvider } from './types';

const POSIntegration: React.FC = () => {
  const [provider, setProvider] = useState<POSProvider>(POSProvider.SQUARE);
  const [isConnected] = useState(true);

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
        </div>
      </div>

      <div className="card">
        <h3>POS Provider Configuration</h3>
        <form>
          <div className="form-group">
            <label htmlFor="provider">Select POS Provider</label>
            <select 
              id="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value as POSProvider)}
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
            />
          </div>

          <div className="form-group">
            <label htmlFor="merchantId">Merchant ID</label>
            <input 
              type="text" 
              id="merchantId"
              placeholder="Enter your merchant ID"
            />
          </div>

          <div className="form-group">
            <label htmlFor="locationId">Location ID</label>
            <input 
              type="text" 
              id="locationId"
              placeholder="Enter your location ID"
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginRight: '10px' }}>
            Save Configuration
          </button>
          <button type="button" className="btn btn-secondary">
            Test Connection
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Menu Sync</h3>
        <p style={{ marginBottom: '15px', color: '#7f8c8d' }}>
          Synchronize your drink menu with your POS system
        </p>
        <button className="btn btn-primary">
          Sync Menu Now
        </button>
        <div style={{ marginTop: '15px', fontSize: '14px', color: '#7f8c8d' }}>
          Last synced: 2 hours ago
        </div>
      </div>
    </div>
  );
};

export default POSIntegration;
