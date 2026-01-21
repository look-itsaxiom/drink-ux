/**
 * GracePeriodBanner Component
 *
 * Displays a warning banner during subscription grace period.
 * Shows remaining days and provides link to update payment.
 * Can be dismissed but reappears the next day.
 */

import React, { useState, useEffect } from 'react';
import { IonIcon, IonButton } from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import { alertCircle, close } from 'ionicons/icons';
import './GracePeriodBanner.css';

/**
 * Local storage key for dismissal tracking
 */
const DISMISSAL_STORAGE_KEY = 'gracePeriodBannerDismissed';

/**
 * Check if banner was dismissed today
 */
function wasDismissedToday(): boolean {
  const dismissedDate = localStorage.getItem(DISMISSAL_STORAGE_KEY);
  if (!dismissedDate) return false;

  const today = new Date().toDateString();
  return dismissedDate === today;
}

/**
 * Store dismissal for today
 */
function storeDismissal(): void {
  const today = new Date().toDateString();
  localStorage.setItem(DISMISSAL_STORAGE_KEY, today);
}

/**
 * Props for GracePeriodBanner component
 */
export interface GracePeriodBannerProps {
  /** Number of days remaining in grace period */
  daysRemaining: number;
  /** Business name for personalized message */
  businessName?: string;
  /** URL to navigate for payment update */
  paymentUpdateUrl?: string;
  /** Callback when banner is dismissed */
  onDismiss?: () => void;
}

/**
 * Get the appropriate message based on days remaining
 */
function getMessage(daysRemaining: number, businessName?: string): string {
  const businessText = businessName ? `${businessName}'s ` : 'Your ';

  if (daysRemaining === 0) {
    return `${businessText}subscription grace period expires today! Update payment to avoid service interruption.`;
  }

  if (daysRemaining === 1) {
    return `Last day of ${businessText.toLowerCase()}grace period! Update payment immediately to maintain service.`;
  }

  const dayWord = daysRemaining === 1 ? 'day' : 'days';
  return `${businessText}subscription is in a grace period. ${daysRemaining} ${dayWord} remaining to update payment.`;
}

/**
 * GracePeriodBanner component
 */
export function GracePeriodBanner({
  daysRemaining,
  businessName,
  paymentUpdateUrl = '/admin/billing',
  onDismiss,
}: GracePeriodBannerProps): React.ReactElement | null {
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState(wasDismissedToday);

  // Check dismissal on mount
  useEffect(() => {
    setIsDismissed(wasDismissedToday());
  }, []);

  // Handle dismiss
  const handleDismiss = () => {
    storeDismissal();
    setIsDismissed(true);
    onDismiss?.();
  };

  // Handle payment update click
  const handleUpdatePayment = () => {
    navigate(paymentUpdateUrl);
  };

  // Don't render if dismissed today
  if (isDismissed) {
    return null;
  }

  const message = getMessage(daysRemaining, businessName);
  const isUrgent = daysRemaining <= 1;
  const bannerClass = `grace-period-banner ${
    isUrgent ? 'grace-period-banner-urgent' : 'grace-period-banner-warning'
  }`;

  return (
    <div
      className={bannerClass}
      role="alert"
      aria-live="polite"
    >
      <div className="grace-period-banner-content">
        <IonIcon icon={alertCircle} className="grace-period-banner-icon" />
        <span className="grace-period-banner-message">{message}</span>
      </div>

      <div className="grace-period-banner-actions">
        <IonButton
          fill="solid"
          size="small"
          color={isUrgent ? 'light' : 'primary'}
          onClick={handleUpdatePayment}
          aria-label="Update payment"
        >
          Update Payment
        </IonButton>

        <button
          className="grace-period-banner-dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          <IonIcon icon={close} />
        </button>
      </div>
    </div>
  );
}

export default GracePeriodBanner;
