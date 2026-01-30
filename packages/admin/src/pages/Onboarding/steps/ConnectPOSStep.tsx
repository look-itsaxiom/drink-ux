import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { OnboardingData } from '../Onboarding';
import { useBusiness } from '../../../contexts/BusinessContext';

interface Props {
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const ConnectPOSStep: React.FC<Props> = ({ data, onUpdate, onNext, onBack }) => {
  const { businessId } = useBusiness();
  const [searchParams, setSearchParams] = useSearchParams();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle OAuth callback parameters on mount
  useEffect(() => {
    const posConnected = searchParams.get('pos_connected');
    const merchantId = searchParams.get('merchant_id');
    const posError = searchParams.get('pos_error');

    if (posConnected === 'true' && merchantId) {
      // Successfully connected
      onUpdate({
        posConnected: true,
        posMerchantId: merchantId,
      });
      // Clear URL params
      setSearchParams({});
    } else if (posError) {
      setError(decodeURIComponent(posError));
      setSearchParams({});
    }
  }, [searchParams, onUpdate, setSearchParams]);

  const handleConnectSquare = async () => {
    setConnecting(true);
    setError(null);

    try {
      if (!businessId) {
        throw new Error('No business ID configured. Please set up your business first.');
      }

      // Get OAuth URL from API (GET request with businessId)
      const response = await fetch(
        `${API_BASE_URL}/api/pos/oauth/authorize?businessId=${businessId}`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to initiate Square connection');
      }

      const result = await response.json();

      if (!result.success || !result.data?.authorizationUrl) {
        throw new Error(result.error?.message || 'Failed to get authorization URL');
      }

      // Redirect to Square OAuth
      window.location.href = result.data.authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Square');
      setConnecting(false);
    }
  };

  return (
    <div className="step-content">
      <h2>Connect Your POS</h2>
      <p className="step-description">
        Connect your Square account to automatically import your menu and enable order syncing.
      </p>

      {data.posConnected ? (
        <div className="pos-connected">
          <div className="success-badge">
            <span className="checkmark">✓</span>
            Square Connected
          </div>
          <p>Your Square account is connected. We'll import your catalog in the next step.</p>
          {data.posMerchantId && (
            <p className="merchant-id">Merchant ID: {data.posMerchantId}</p>
          )}
          <div className="step-actions">
            <button type="button" className="btn btn-secondary" onClick={onBack}>
              Back
            </button>
            <button type="button" className="btn btn-primary" onClick={onNext}>
              Continue
            </button>
          </div>
        </div>
      ) : (
        <div className="pos-connect">
          <div className="pos-option">
            <div className="pos-logo">
              <img src="/square-logo.svg" alt="Square" />
            </div>
            <h3>Square POS</h3>
            <p>
              Connect your Square account to import your existing menu items
              and sync orders in real-time.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-large"
              onClick={handleConnectSquare}
              disabled={connecting}
            >
              {connecting ? 'Connecting...' : 'Connect Square'}
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="step-actions">
            <button type="button" className="btn btn-secondary" onClick={onBack}>
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectPOSStep;
