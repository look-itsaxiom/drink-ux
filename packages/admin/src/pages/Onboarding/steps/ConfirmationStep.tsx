import React, { useState } from 'react';
import { OnboardingData } from '../Onboarding';

interface Props {
  data: OnboardingData;
  onBack: () => void;
  onComplete: () => void;
}

const ConfirmationStep: React.FC<Props> = ({ data, onBack, onComplete }) => {
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async () => {
    setCompleting(true);
    setError(null);

    try {
      // TODO: Call API to finalize onboarding
      // POST /api/onboarding/complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete setup');
      setCompleting(false);
    }
  };

  return (
    <div className="step-content">
      <h2>You're All Set!</h2>
      <p className="step-description">
        Review your setup and complete the onboarding process.
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

      <div className="next-steps">
        <h3>What's Next?</h3>
        <ul>
          <li>Fine-tune your menu in the admin dashboard</li>
          <li>Customize your branding and theme</li>
          <li>Share your ordering link with customers</li>
          <li>Monitor orders from your dashboard</li>
        </ul>
      </div>

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
          {completing ? 'Completing...' : 'Complete Setup'}
        </button>
      </div>
    </div>
  );
};

export default ConfirmationStep;
