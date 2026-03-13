/**
 * SquarePaymentForm
 * Loads the Square Web Payments SDK and renders a hosted card form.
 * On successful tokenization, calls onPaymentToken with the nonce (sourceId).
 *
 * Uses types from src/types/square.d.ts
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { IonButton, IonSpinner, IonText } from '@ionic/react';
import './SquarePaymentForm.css';

export interface SquarePaymentFormProps {
  /** Square Application ID */
  appId: string;
  /** Square Location ID (optional) */
  locationId?: string;
  /** Amount to display on the pay button */
  amount: number;
  /** Called with the payment token (nonce) on successful tokenization */
  onPaymentToken: (sourceId: string) => void;
  /** Whether payment is currently being processed */
  processing?: boolean;
  /** Whether the form is disabled */
  disabled?: boolean;
}

/** URL for Square Web Payments SDK (sandbox) */
const SQUARE_SDK_URL_SANDBOX = 'https://sandbox.web.squarecdn.com/v1/square.js';
/** URL for Square Web Payments SDK (production) */
const SQUARE_SDK_URL_PRODUCTION = 'https://web.squarecdn.com/v1/square.js';

function getSquareSdkUrl(appId: string): string {
  return appId.startsWith('sandbox-') ? SQUARE_SDK_URL_SANDBOX : SQUARE_SDK_URL_PRODUCTION;
}

/**
 * Load the Square Web Payments SDK script if not already loaded
 */
function loadSquareSdk(appId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if ('Square' in window && window.Square != null) {
      resolve();
      return;
    }

    const existing = document.querySelector('script[data-square-sdk]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Square SDK')));
      return;
    }

    const script = document.createElement('script');
    script.src = getSquareSdkUrl(appId);
    script.setAttribute('data-square-sdk', 'true');
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Square Web Payments SDK'));
    document.head.appendChild(script);
  });
}

const SquarePaymentForm: React.FC<SquarePaymentFormProps> = ({
  appId,
  locationId,
  amount,
  onPaymentToken,
  processing = false,
  disabled = false,
}) => {
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [cardReady, setCardReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenizing, setTokenizing] = useState(false);
  const cardRef = useRef<Square.Card | null>(null);
  const mountedRef = useRef(true);

  // Load SDK and initialize card form
  useEffect(() => {
    mountedRef.current = true;

    async function init() {
      try {
        setError(null);
        await loadSquareSdk(appId);

        if (!mountedRef.current) return;
        setSdkLoaded(true);

        if (!window.Square) {
          throw new Error('Square SDK loaded but Square object not found');
        }

        const payments = await window.Square(appId, locationId || '');
        const card = await payments.card();

        if (!mountedRef.current) {
          await card.destroy();
          return;
        }

        await card.attach('#square-card-container');
        cardRef.current = card;

        if (mountedRef.current) {
          setCardReady(true);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to initialize payment form');
        }
      }
    }

    init();

    return () => {
      mountedRef.current = false;
      if (cardRef.current) {
        cardRef.current.destroy().catch(() => {});
        cardRef.current = null;
      }
    };
  }, [appId, locationId]);

  const handlePay = useCallback(async () => {
    if (!cardRef.current || tokenizing || processing || disabled) return;

    setTokenizing(true);
    setError(null);

    try {
      const result = await cardRef.current.tokenize();

      if (result.status === 'OK' && result.token) {
        onPaymentToken(result.token);
      } else {
        const errorMessage = result.errors?.[0]?.message || 'Card tokenization failed';
        setError(errorMessage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      if (mountedRef.current) {
        setTokenizing(false);
      }
    }
  }, [onPaymentToken, tokenizing, processing, disabled]);

  const isLoading = !sdkLoaded || !cardReady;
  const isDisabled = disabled || processing || tokenizing || isLoading;

  return (
    <div className="square-payment-form">
      {isLoading && !error && (
        <div className="payment-loading">
          <IonSpinner name="crescent" />
          <p>Loading payment form...</p>
        </div>
      )}

      <div
        id="square-card-container"
        className={`card-container ${isLoading ? 'hidden' : ''}`}
      />

      {error && (
        <div className="payment-error">
          <IonText color="danger">
            <p>{error}</p>
          </IonText>
        </div>
      )}

      <IonButton
        expand="block"
        onClick={handlePay}
        disabled={isDisabled}
        className="pay-button"
      >
        {processing || tokenizing ? (
          <>
            <IonSpinner name="crescent" slot="start" />
            Processing...
          </>
        ) : (
          `Pay $${amount.toFixed(2)}`
        )}
      </IonButton>
    </div>
  );
};

export default SquarePaymentForm;
