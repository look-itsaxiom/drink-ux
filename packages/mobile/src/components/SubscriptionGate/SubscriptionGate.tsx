/**
 * SubscriptionGate Component
 *
 * Wrapper component that gates storefront content based on subscription status.
 * Shows Coming Soon page for inactive subscriptions and grace period warnings.
 */

import React from 'react';
import { IonSpinner } from '@ionic/react';
import { useSubscriptionStatus } from '../../hooks/useSubscriptionStatus';
import { ComingSoon, SocialLinks } from '../../pages/ComingSoon';
import { GracePeriodBanner } from '../GracePeriodBanner';
import './SubscriptionGate.css';

/**
 * Props for SubscriptionGate component
 */
export interface SubscriptionGateProps {
  /** Business subdomain/slug */
  subdomain: string;
  /** Business name for display */
  businessName?: string;
  /** Business logo URL */
  logoUrl?: string;
  /** Contact email */
  contactEmail?: string;
  /** Contact phone */
  contactPhone?: string;
  /** Social media links */
  socialLinks?: SocialLinks;
  /** Primary brand color */
  primaryColor?: string;
  /** Enable preview/demo mode (bypasses subscription check) */
  previewMode?: boolean;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
  /** Children to render when subscription is active */
  children: React.ReactNode;
}

/**
 * SubscriptionGate component
 */
export function SubscriptionGate({
  subdomain,
  businessName,
  logoUrl,
  contactEmail,
  contactPhone,
  socialLinks,
  primaryColor,
  previewMode = false,
  loadingComponent,
  children,
}: SubscriptionGateProps): React.ReactElement {
  const {
    status,
    isGracePeriod,
    gracePeriodDays,
    canAccessStorefront,
    loading,
    error,
  } = useSubscriptionStatus({
    subdomain,
    skip: previewMode, // Skip API call in preview mode
  });

  // Preview mode: render children immediately with a preview banner
  if (previewMode) {
    return (
      <div className="subscription-gate subscription-gate-preview">
        <div className="subscription-gate-preview-banner" role="alert">
          <span>Preview Mode - Subscription check bypassed</span>
        </div>
        {children}
      </div>
    );
  }

  // Loading state
  if (loading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }

    return (
      <div className="subscription-gate subscription-gate-loading">
        <IonSpinner name="crescent" />
        <p className="subscription-gate-loading-text">Loading...</p>
      </div>
    );
  }

  // Error state or cannot access - show Coming Soon
  if (error || !canAccessStorefront) {
    const isSuspended = status === 'suspended';

    return (
      <ComingSoon
        businessName={businessName}
        logoUrl={logoUrl}
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        socialLinks={socialLinks}
        primaryColor={primaryColor}
        isSuspended={isSuspended}
      />
    );
  }

  // Grace period - show children with warning banner
  if (isGracePeriod) {
    return (
      <div className="subscription-gate subscription-gate-grace-period">
        <GracePeriodBanner
          daysRemaining={gracePeriodDays || 0}
          businessName={businessName}
        />
        {children}
      </div>
    );
  }

  // Active subscription - render children normally
  return <>{children}</>;
}

export default SubscriptionGate;
