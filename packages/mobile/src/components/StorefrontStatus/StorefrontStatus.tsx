/**
 * StorefrontStatus Component
 *
 * Displays the current health status of the storefront by polling a health endpoint.
 * Shows different visual indicators for healthy, degraded, and unhealthy states.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  IonCard,
  IonCardContent,
  IonSpinner,
  IonIcon,
} from '@ionic/react';
import {
  checkmarkCircle,
  alertCircle,
  closeCircle,
  ellipse,
} from 'ionicons/icons';
import './StorefrontStatus.css';

/**
 * Health status response from the API
 */
interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  database?: { healthy: boolean };
  pos?: { healthy: boolean };
  [key: string]: unknown;
}

/**
 * Props for StorefrontStatus component
 */
export interface StorefrontStatusProps {
  /** The health endpoint URL to poll */
  healthEndpoint: string;
  /** Poll interval in milliseconds (default: 30000) */
  pollInterval?: number;
  /** Display variant */
  variant?: 'badge' | 'card' | 'detailed';
  /** Store name to display */
  storeName?: string;
  /** Callback when status changes */
  onStatusChange?: (status: 'healthy' | 'degraded' | 'unhealthy') => void;
  /** Callback when health check fails */
  onError?: (error: Error) => void;
}

type StatusState = 'loading' | 'healthy' | 'degraded' | 'unhealthy';

/**
 * Get status label for display
 */
function getStatusLabel(status: StatusState): string {
  switch (status) {
    case 'loading':
      return 'Checking...';
    case 'healthy':
      return 'Online';
    case 'degraded':
      return 'Limited Service';
    case 'unhealthy':
      return 'Offline';
    default:
      return 'Unknown';
  }
}

/**
 * Get status icon
 */
function getStatusIcon(status: StatusState): string {
  switch (status) {
    case 'loading':
      return ellipse;
    case 'healthy':
      return checkmarkCircle;
    case 'degraded':
      return alertCircle;
    case 'unhealthy':
      return closeCircle;
    default:
      return ellipse;
  }
}

/**
 * StorefrontStatus component for displaying storefront health
 */
export function StorefrontStatus({
  healthEndpoint,
  pollInterval = 30000,
  variant = 'badge',
  storeName,
  onStatusChange,
  onError,
}: StorefrontStatusProps): React.ReactElement {
  const [status, setStatus] = useState<StatusState>('loading');
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const previousStatusRef = useRef<StatusState | null>(null);
  const isMountedRef = useRef(true);

  // Check health endpoint
  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch(healthEndpoint);

      if (!isMountedRef.current) return;

      if (!response.ok) {
        const newStatus = 'unhealthy';
        setStatus(newStatus);
        setError(new Error(`Health check failed with status ${response.status}`));
        if (previousStatusRef.current !== newStatus) {
          previousStatusRef.current = newStatus;
          onStatusChange?.(newStatus);
        }
        return;
      }

      const data: HealthResponse = await response.json();

      if (!isMountedRef.current) return;

      setHealthData(data);
      setError(null);

      const newStatus = data.status;
      setStatus(newStatus);

      if (previousStatusRef.current !== newStatus) {
        previousStatusRef.current = newStatus;
        onStatusChange?.(newStatus);
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setStatus('unhealthy');
      onError?.(error);

      if (previousStatusRef.current !== 'unhealthy') {
        previousStatusRef.current = 'unhealthy';
        onStatusChange?.('unhealthy');
      }
    }
  }, [healthEndpoint, onStatusChange, onError]);

  // Initial check and polling
  useEffect(() => {
    isMountedRef.current = true;
    checkHealth();

    const intervalId = setInterval(checkHealth, pollInterval);

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [checkHealth, pollInterval]);

  const statusLabel = getStatusLabel(status);
  const statusIcon = getStatusIcon(status);

  // Badge variant (minimal)
  if (variant === 'badge') {
    return (
      <div
        className={`storefront-status storefront-status-badge storefront-status-indicator-${status}`}
        role="status"
        aria-live="polite"
        aria-label={`Store status: ${statusLabel}`}
      >
        {status === 'loading' ? (
          <IonSpinner name="dots" />
        ) : (
          <IonIcon icon={statusIcon} />
        )}
        <span className="storefront-status-label">
          {storeName && <span className="storefront-status-name">{storeName}</span>}
          {statusLabel}
        </span>
      </div>
    );
  }

  // Card variant
  if (variant === 'card') {
    return (
      <IonCard
        className={`storefront-status storefront-status-card storefront-status-indicator-${status}`}
        role="status"
        aria-live="polite"
      >
        <IonCardContent>
          <div className="storefront-status-card-content">
            {status === 'loading' ? (
              <IonSpinner name="dots" />
            ) : (
              <IonIcon icon={statusIcon} />
            )}
            <div className="storefront-status-info">
              {storeName && <span className="storefront-status-name">{storeName}</span>}
              <span className="storefront-status-label">{statusLabel}</span>
            </div>
          </div>
        </IonCardContent>
      </IonCard>
    );
  }

  // Detailed variant
  return (
    <div
      className={`storefront-status storefront-status-detailed storefront-status-indicator-${status}`}
      role="status"
      aria-live="polite"
    >
      <div className="storefront-status-header">
        {status === 'loading' ? (
          <IonSpinner name="dots" />
        ) : (
          <IonIcon icon={statusIcon} />
        )}
        <div className="storefront-status-info">
          {storeName && <h3 className="storefront-status-name">{storeName}</h3>}
          <span className="storefront-status-label">{statusLabel}</span>
        </div>
      </div>

      {healthData && status !== 'loading' && (
        <div className="storefront-status-services">
          {healthData.database !== undefined && (
            <div className={`storefront-status-service ${healthData.database.healthy ? 'healthy' : 'unhealthy'}`}>
              <IonIcon icon={healthData.database.healthy ? checkmarkCircle : closeCircle} />
              <span>Database</span>
            </div>
          )}
          {healthData.pos !== undefined && (
            <div className={`storefront-status-service ${healthData.pos.healthy ? 'healthy' : 'unhealthy'}`}>
              <IonIcon icon={healthData.pos.healthy ? checkmarkCircle : closeCircle} />
              <span>POS</span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="storefront-status-error">
          <small>Last error: {error.message}</small>
        </div>
      )}
    </div>
  );
}

export default StorefrontStatus;
