/**
 * ErrorDisplay Component
 *
 * Shows user-friendly error messages with action buttons.
 * Supports multiple variants for different contexts (card, inline, toast, fullscreen).
 */

import React from 'react';
import {
  IonCard,
  IonCardContent,
  IonButton,
  IonIcon,
  IonText,
} from '@ionic/react';
import {
  alertCircleOutline,
  refreshOutline,
  logInOutline,
  callOutline,
} from 'ionicons/icons';
import type { AppError } from '../../utils/errors';
import './ErrorDisplay.css';

/**
 * Props for ErrorDisplay component
 */
export interface ErrorDisplayProps {
  /** The error to display */
  error: AppError;
  /** Callback when user wants to retry */
  onRetry?: () => void;
  /** Callback when user dismisses the error */
  onDismiss?: () => void;
  /** Display variant */
  variant?: 'card' | 'inline' | 'toast' | 'fullscreen';
  /** Custom title override */
  title?: string;
  /** Show error code for debugging */
  showErrorCode?: boolean;
  /** Additional content to render */
  children?: React.ReactNode;
}

/**
 * Get the action button label based on error action type
 */
function getActionLabel(action?: AppError['action']): string {
  switch (action) {
    case 'retry':
      return 'Try Again';
    case 'refresh':
      return 'Refresh';
    case 'login':
      return 'Log In';
    case 'contact-support':
      return 'Contact Support';
    default:
      return 'Try Again';
  }
}

/**
 * Get the action button icon based on error action type
 */
function getActionIcon(action?: AppError['action']): string {
  switch (action) {
    case 'retry':
      return refreshOutline;
    case 'refresh':
      return refreshOutline;
    case 'login':
      return logInOutline;
    case 'contact-support':
      return callOutline;
    default:
      return refreshOutline;
  }
}

/**
 * Get default title based on error action
 */
function getDefaultTitle(action?: AppError['action']): string {
  switch (action) {
    case 'login':
      return 'Session Expired';
    case 'contact-support':
      return 'Unable to Process';
    default:
      return 'Something Went Wrong';
  }
}

/**
 * Determine if we should show an action button
 */
function shouldShowActionButton(error: AppError, onRetry?: () => void): boolean {
  // Show if onRetry is provided
  if (onRetry) return true;
  // Show if error is retryable
  if (error.retryable) return true;
  // Show if there's a specific action
  if (error.action) return true;
  return false;
}

/**
 * ErrorDisplay component for showing user-friendly error messages
 */
export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  variant = 'card',
  title,
  showErrorCode = false,
  children,
}: ErrorDisplayProps): React.ReactElement {
  const displayTitle = title || getDefaultTitle(error.action);
  const actionLabel = getActionLabel(error.action);
  const actionIcon = getActionIcon(error.action);
  const showAction = shouldShowActionButton(error, onRetry);

  const handleAction = () => {
    if (error.action === 'refresh') {
      window.location.reload();
    } else if (onRetry) {
      onRetry();
    }
  };

  const content = (
    <>
      <div className="error-display-icon">
        <IonIcon icon={alertCircleOutline} color="danger" />
      </div>
      <div className="error-display-content">
        <h2 className="error-display-title">{displayTitle}</h2>
        <IonText color="medium">
          <p className="error-display-message">{error.userMessage}</p>
        </IonText>
        {showErrorCode && (
          <IonText color="medium">
            <p className="error-display-code">Error code: {error.code}</p>
          </IonText>
        )}
        {children}
      </div>
      <div className="error-display-actions">
        {showAction && (
          <IonButton onClick={handleAction} fill="solid" color="primary">
            <IonIcon slot="start" icon={actionIcon} />
            {actionLabel}
          </IonButton>
        )}
        {onDismiss && (
          <IonButton onClick={onDismiss} fill="outline" color="medium">
            Dismiss
          </IonButton>
        )}
      </div>
    </>
  );

  // Render based on variant
  if (variant === 'inline') {
    return (
      <div className="error-display error-display-inline" role="alert">
        {content}
      </div>
    );
  }

  if (variant === 'toast') {
    return (
      <div className="error-display error-display-toast" role="alert">
        {content}
      </div>
    );
  }

  if (variant === 'fullscreen') {
    return (
      <div className="error-display error-display-fullscreen" role="alert">
        <div className="error-display-fullscreen-content">
          {content}
        </div>
      </div>
    );
  }

  // Default: card variant
  return (
    <IonCard className="error-display error-display-card" role="alert">
      <IonCardContent>
        {content}
      </IonCardContent>
    </IonCard>
  );
}

export default ErrorDisplay;
