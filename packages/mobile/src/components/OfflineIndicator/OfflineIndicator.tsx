/**
 * OfflineIndicator Component
 *
 * Shows a visual indicator when the user loses network connectivity.
 * Supports multiple variants (banner, toast, badge) and optional dismiss/retry functionality.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { IonIcon, IonButton } from '@ionic/react';
import { cloudOfflineOutline, closeOutline, refreshOutline } from 'ionicons/icons';
import './OfflineIndicator.css';

/**
 * Props for OfflineIndicator component
 */
export interface OfflineIndicatorProps {
  /** Custom message to display */
  message?: string;
  /** Display variant */
  variant?: 'banner' | 'toast' | 'badge';
  /** Allow user to dismiss the indicator */
  dismissable?: boolean;
  /** Show retry button */
  showRetry?: boolean;
  /** Callback when user clicks retry */
  onRetry?: () => void;
  /** Callback when device goes offline */
  onOffline?: () => void;
  /** Callback when device comes back online */
  onOnline?: () => void;
}

/**
 * OfflineIndicator component for showing network connectivity status
 */
export function OfflineIndicator({
  message = "You're offline",
  variant = 'banner',
  dismissable = false,
  showRetry = false,
  onRetry,
  onOffline,
  onOnline,
}: OfflineIndicatorProps): React.ReactElement | null {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isDismissed, setIsDismissed] = useState(false);

  // Handle online/offline events
  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setIsDismissed(false); // Reset dismissed state when coming back online
    onOnline?.();
  }, [onOnline]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    onOffline?.();
  }, [onOffline]);

  // Set up event listeners
  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  // Handle dismiss
  const handleDismiss = () => {
    setIsDismissed(true);
  };

  // Handle retry
  const handleRetry = () => {
    onRetry?.();
  };

  // Don't render if online or dismissed
  if (isOnline || isDismissed) {
    return null;
  }

  const variantClass = `offline-indicator-${variant}`;

  return (
    <div
      className={`offline-indicator ${variantClass}`}
      role="alert"
      aria-live="polite"
    >
      <div className="offline-indicator-content">
        <IonIcon icon={cloudOfflineOutline} className="offline-indicator-icon" />
        <span className="offline-indicator-message">{message}</span>
      </div>
      <div className="offline-indicator-actions">
        {showRetry && (
          <IonButton
            fill="clear"
            size="small"
            onClick={handleRetry}
            className="offline-indicator-retry"
          >
            <IonIcon slot="start" icon={refreshOutline} />
            Retry
          </IonButton>
        )}
        {dismissable && (
          <button
            type="button"
            className="offline-indicator-dismiss"
            onClick={handleDismiss}
            aria-label="Dismiss"
          >
            <IonIcon icon={closeOutline} />
          </button>
        )}
      </div>
    </div>
  );
}

export default OfflineIndicator;
