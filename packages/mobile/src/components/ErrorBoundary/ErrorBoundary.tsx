/**
 * ErrorBoundary Component
 *
 * Catches JavaScript errors in child components and displays a fallback UI.
 * Provides recovery options for users to retry the failed operation.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonIcon } from '@ionic/react';
import { alertCircleOutline, refreshOutline } from 'ionicons/icons';

/**
 * Fallback render props
 */
export interface FallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

/**
 * ErrorBoundary props
 */
export interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode;
  /** Static fallback UI to show on error */
  fallback?: ReactNode;
  /** Render function for dynamic fallback UI */
  fallbackRender?: (props: FallbackProps) => ReactNode;
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Callback when Try Again is clicked */
  onRetry?: () => void;
}

/**
 * ErrorBoundary state
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of the
 * component tree that crashed.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * // With custom fallback
 * <ErrorBoundary fallback={<div>Something went wrong</div>}>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * // With render props for more control
 * <ErrorBoundary
 *   fallbackRender={({ error, resetErrorBoundary }) => (
 *     <div>
 *       <p>Error: {error.message}</p>
 *       <button onClick={resetErrorBoundary}>Try Again</button>
 *     </div>
 *   )}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call onError callback if provided
    this.props.onError?.(error, errorInfo);
  }

  resetErrorBoundary = (): void => {
    this.props.onRetry?.();
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, fallbackRender } = this.props;

    if (hasError && error) {
      // Use fallbackRender if provided
      if (fallbackRender) {
        return fallbackRender({
          error,
          resetErrorBoundary: this.resetErrorBoundary,
        });
      }

      // Use static fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default fallback UI
      return <DefaultFallback error={error} resetErrorBoundary={this.resetErrorBoundary} />;
    }

    return children;
  }
}

/**
 * Default fallback UI component
 */
function DefaultFallback({ error, resetErrorBoundary }: FallbackProps): JSX.Element {
  return (
    <div role="alert" className="error-boundary-fallback">
      <IonCard>
        <IonCardHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IonIcon
              icon={alertCircleOutline}
              style={{ fontSize: '24px', color: 'var(--ion-color-danger)' }}
            />
            <IonCardTitle>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Something went wrong</h2>
            </IonCardTitle>
          </div>
        </IonCardHeader>
        <IonCardContent>
          <p style={{ marginBottom: '16px', color: 'var(--ion-color-medium)' }}>
            We encountered an unexpected error. Please try again.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <details style={{ marginBottom: '16px' }}>
              <summary style={{ cursor: 'pointer', color: 'var(--ion-color-medium)' }}>
                Technical details
              </summary>
              <pre
                style={{
                  marginTop: '8px',
                  padding: '8px',
                  background: 'var(--ion-color-light)',
                  borderRadius: '4px',
                  overflow: 'auto',
                  fontSize: '12px',
                }}
              >
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
          <IonButton expand="block" onClick={resetErrorBoundary}>
            <IonIcon slot="start" icon={refreshOutline} />
            Try Again
          </IonButton>
        </IonCardContent>
      </IonCard>
    </div>
  );
}

export default ErrorBoundary;
