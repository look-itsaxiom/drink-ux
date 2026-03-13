import React, { useMemo, useState } from 'react';
import './AdminSettings.css';

type SettingsTab = 'account' | 'branding' | 'pos' | 'subscription';

const THEME_COLORS = ['#6B4226', '#1A6B8A', '#C0392B', '#14532D', '#6D28D9'];

const AdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [brandColor, setBrandColor] = useState('#6B4226');
  const [brandName, setBrandName] = useState('Brew & Co.');

  const previewStyle = useMemo(
    () => ({ '--preview-color': brandColor } as React.CSSProperties),
    [brandColor]
  );

  return (
    <div className="settings-page">
      <header className="settings-page-header">
        <div>
          <h1>Settings</h1>
          <p>Manage account, storefront branding, POS integration, and billing.</p>
        </div>
        <button className="settings-save-btn" type="button">
          Save Changes
        </button>
      </header>

      <div className="settings-tabs" role="tablist" aria-label="Settings sections">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'account'}
          className={activeTab === 'account' ? 'settings-tab active' : 'settings-tab'}
          onClick={() => setActiveTab('account')}
        >
          Account
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'branding'}
          className={activeTab === 'branding' ? 'settings-tab active' : 'settings-tab'}
          onClick={() => setActiveTab('branding')}
        >
          Branding
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'pos'}
          className={activeTab === 'pos' ? 'settings-tab active' : 'settings-tab'}
          onClick={() => setActiveTab('pos')}
        >
          POS
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'subscription'}
          className={activeTab === 'subscription' ? 'settings-tab active' : 'settings-tab'}
          onClick={() => setActiveTab('subscription')}
        >
          Subscription
        </button>
      </div>

      <section className="settings-content">
        {activeTab === 'account' && (
          <div className="settings-card">
            <div className="settings-card-header">
              <h2>Business Account</h2>
              <p>Core profile details used across your admin and storefront.</p>
            </div>
            <div className="settings-card-body settings-grid">
              <label className="settings-field">
                <span>Business Name</span>
                <input
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Business name"
                />
              </label>
              <label className="settings-field">
                <span>Support Email</span>
                <input defaultValue="hello@brewandco.com" type="email" />
              </label>
              <label className="settings-field">
                <span>Phone</span>
                <input defaultValue="(503) 555-0142" />
              </label>
              <label className="settings-field">
                <span>Timezone</span>
                <select defaultValue="America/Los_Angeles">
                  <option value="America/Los_Angeles">Pacific (US)</option>
                  <option value="America/Denver">Mountain (US)</option>
                  <option value="America/Chicago">Central (US)</option>
                  <option value="America/New_York">Eastern (US)</option>
                </select>
              </label>
              <label className="settings-field">
                <span>Address</span>
                <input defaultValue="125 Oak Street, Portland, OR" />
              </label>
              <label className="settings-field">
                <span>Sales Tax (%)</span>
                <input defaultValue="8.5" />
              </label>
            </div>
          </div>
        )}

        {activeTab === 'branding' && (
          <div className="settings-card">
            <div className="settings-card-header">
              <h2>Storefront Branding</h2>
              <p>Set your visual identity and preview customer-facing updates.</p>
            </div>
            <div className="settings-card-body branding-layout">
              <div className="branding-controls">
                <label className="settings-field">
                  <span>Storefront Name</span>
                  <input value={brandName} onChange={(e) => setBrandName(e.target.value)} />
                </label>
                <div className="settings-field">
                  <span>Primary Color</span>
                  <div className="color-row">
                    {THEME_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={`Use color ${color}`}
                        className={brandColor === color ? 'color-swatch selected' : 'color-swatch'}
                        style={{ backgroundColor: color }}
                        onClick={() => setBrandColor(color)}
                      />
                    ))}
                  </div>
                </div>
                <label className="settings-field">
                  <span>Logo URL</span>
                  <input defaultValue="https://example.com/logo.png" />
                </label>
              </div>

              <div className="brand-preview" style={previewStyle}>
                <p className="preview-label">Live Preview</p>
                <div className="preview-phone">
                  <div className="preview-top">
                    <strong>{brandName || 'Your Shop'}</strong>
                    <span>10:24</span>
                  </div>
                  <div className="preview-body">
                    <div className="preview-pill">Popular</div>
                    <div className="preview-item">
                      <div className="preview-icon">☕</div>
                      <div>
                        <p>Vanilla Oat Latte</p>
                        <small>$6.75</small>
                      </div>
                      <button type="button">+</button>
                    </div>
                    <div className="preview-item">
                      <div className="preview-icon">🧋</div>
                      <div>
                        <p>Nitro Cold Brew</p>
                        <small>$6.50</small>
                      </div>
                      <button type="button">+</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pos' && (
          <div className="settings-card">
            <div className="settings-card-header">
              <h2>POS Integration</h2>
              <p>Square connection status and location sync controls.</p>
            </div>
            <div className="settings-card-body">
              <div className="pos-status-card">
                <div>
                  <h3>Square Connected</h3>
                  <p>Merchant ID: SQ-2KV9J1A • Last sync: 4 minutes ago</p>
                </div>
                <div className="pos-actions">
                  <button type="button" className="settings-secondary-btn">
                    Resync Catalog
                  </button>
                  <button type="button" className="settings-danger-btn">
                    Disconnect
                  </button>
                </div>
              </div>

              <div className="settings-list">
                <div className="settings-list-row">
                  <div>
                    <strong>Downtown - Main Bar</strong>
                    <p>Orders enabled · Pickup code required</p>
                  </div>
                  <span className="pill success">Active</span>
                </div>
                <div className="settings-list-row">
                  <div>
                    <strong>West Side Kiosk</strong>
                    <p>Orders enabled · Shared prep station</p>
                  </div>
                  <span className="pill success">Active</span>
                </div>
                <div className="settings-list-row">
                  <div>
                    <strong>Pop-up Cart</strong>
                    <p>No live orders · seasonal location</p>
                  </div>
                  <span className="pill muted">Paused</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'subscription' && (
          <>
            <div className="subscription-hero">
              <p className="subscription-plan">Current Plan</p>
              <h2>Pro Plan</h2>
              <p className="subscription-price">
                $49<span>/month</span>
              </p>
              <p className="subscription-meta">Renews April 6, 2026 · 14,284 orders this billing cycle</p>
              <div className="subscription-actions">
                <button type="button">Manage Plan</button>
                <button type="button" className="ghost">
                  Update Payment Method
                </button>
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-card-header">
                <h2>Billing History</h2>
                <p>Recent invoices and payment status.</p>
              </div>
              <div className="settings-card-body settings-list">
                <div className="settings-list-row">
                  <div>
                    <strong>March 2026</strong>
                    <p>Invoice #INV-2038 · Paid March 6</p>
                  </div>
                  <span>$49.00</span>
                </div>
                <div className="settings-list-row">
                  <div>
                    <strong>February 2026</strong>
                    <p>Invoice #INV-1987 · Paid February 6</p>
                  </div>
                  <span>$49.00</span>
                </div>
                <div className="settings-list-row">
                  <div>
                    <strong>January 2026</strong>
                    <p>Invoice #INV-1931 · Paid January 6</p>
                  </div>
                  <span>$49.00</span>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default AdminSettings;
