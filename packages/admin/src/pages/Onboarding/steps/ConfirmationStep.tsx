import React, { useState } from 'react';
import { OnboardingData } from '../Onboarding';
import { useAuth } from '../../../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Props {
  data: OnboardingData;
  onBack: () => void;
  onComplete: () => void;
}

const ConfirmationStep: React.FC<Props> = ({ data, onBack, onComplete }) => {
  const { user, refreshUser } = useAuth();
  const businessId = user?.businessId;
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async () => {
    setCompleting(true);
    setError(null);

    try {
      if (!businessId) {
        throw new Error('No business ID found');
      }

      // Call API to finalize onboarding and update accountState to ACTIVE
      const response = await fetch(`${API_BASE_URL}/api/business/${businessId}/complete-onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          businessName: data.businessName,
          slug: data.slug,
          contactEmail: data.contactEmail,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to complete onboarding');
      }

      // Refresh user data to get updated business state
      await refreshUser();

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete setup');
      setCompleting(false);
    }
  };

  return (
    <div className="step-content">
      <h2>Review & Launch</h2>
      <p className="step-description">
        Confirm your shop setup details before finishing onboarding.
      </p>

      <div className="confirmation-summary">
        <div className="summary-section">
          <h3>Business Details</h3>
          <div className="summary-item">
            <span className="label">Name:</span>
            <span className="value">{data.businessName}</span>
          </div>
          <div className="summary-item">
            <span className="label">Ordering URL:</span>
            <span className="value">drinkux.com/{data.slug}</span>
          </div>
          <div className="summary-item">
            <span className="label">Contact:</span>
            <span className="value">{data.contactEmail}</span>
          </div>
        </div>

        <div className="summary-section">
          <h3>POS Connection</h3>
          <div className="summary-item">
            <span className="label">Status:</span>
            <span className={`value ${data.posConnected ? 'success' : 'warning'}`}>
              {data.posConnected ? 'Connected to Square' : 'Not connected'}
            </span>
          </div>
          {data.posMerchantId && (
            <div className="summary-item">
              <span className="label">Merchant ID:</span>
              <span className="value">{data.posMerchantId}</span>
            </div>
          )}
        </div>

        <div className="summary-section">
          <h3>Branding</h3>
          <div className="summary-item">
            <span className="label">Brand Name:</span>
            <span className="value">{data.brandName || data.businessName}</span>
          </div>
          <div className="summary-item">
            <span className="label">Accent Color:</span>
            <span className="value">{data.accentColor}</span>
          </div>
          <div className="summary-item">
            <span className="label">Voice:</span>
            <span className="value">{data.voice}</span>
          </div>
        </div>

        <div className="summary-section">
          <h3>Menu Catalog</h3>
          {data.catalogSummary ? (
            <>
              <div className="summary-item">
                <span className="label">Categories:</span>
                <span className="value">{data.catalogSummary.categories}</span>
              </div>
              <div className="summary-item">
                <span className="label">Drink Bases:</span>
                <span className="value">{data.catalogSummary.bases}</span>
              </div>
              <div className="summary-item">
                <span className="label">Modifiers:</span>
                <span className="value">{data.catalogSummary.modifiers}</span>
              </div>
            </>
          ) : (
            <div className="summary-item">
              <span className="label">Status:</span>
              <span className="value warning">Not configured</span>
            </div>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="step-actions">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="btn btn-primary btn-large"
          onClick={handleComplete}
          disabled={completing}
        >
          {completing ? 'Completing...' : 'Launch Storefront'}
        </button>
      </div>
    </div>
  );
};

export default ConfirmationStep;
