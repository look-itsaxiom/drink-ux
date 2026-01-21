/**
 * OrderConfirmation Page
 * Shows order status and pickup information
 */

import React from 'react';
import {
  IonContent,
  IonPage,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonList,
  IonItem,
  IonLabel,
  IonText,
  IonSpinner,
  IonIcon,
  IonButton,
  IonBadge,
} from '@ionic/react';
import {
  checkmarkCircle,
  hourglass,
  cafe,
  checkmarkDone,
  closeCircle,
  copyOutline,
  refreshOutline,
} from 'ionicons/icons';
import { useParams } from 'react-router';
import { OrderStatus } from '@drink-ux/shared';
import AppHeader from '../components/AppHeader';
import { useOrderStatus } from '../hooks/useOrderStatus';
import { formatOrderStatus, getStatusStep } from '../services/orderService';
import './OrderConfirmation.css';

/**
 * Status step configuration
 */
const STATUS_STEPS = [
  { status: OrderStatus.PENDING, label: 'Received', icon: hourglass },
  { status: OrderStatus.CONFIRMED, label: 'Confirmed', icon: checkmarkCircle },
  { status: OrderStatus.PREPARING, label: 'Preparing', icon: cafe },
  { status: OrderStatus.READY, label: 'Ready', icon: checkmarkDone },
];

/**
 * Get icon for status
 */
function getStatusIcon(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.PENDING:
      return hourglass;
    case OrderStatus.CONFIRMED:
      return checkmarkCircle;
    case OrderStatus.PREPARING:
      return cafe;
    case OrderStatus.READY:
    case OrderStatus.COMPLETED:
      return checkmarkDone;
    case OrderStatus.CANCELLED:
    case OrderStatus.FAILED:
      return closeCircle;
    default:
      return hourglass;
  }
}

/**
 * Get status color
 */
function getStatusColor(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.PENDING:
      return 'warning';
    case OrderStatus.CONFIRMED:
      return 'primary';
    case OrderStatus.PREPARING:
      return 'secondary';
    case OrderStatus.READY:
      return 'success';
    case OrderStatus.COMPLETED:
      return 'success';
    case OrderStatus.CANCELLED:
    case OrderStatus.FAILED:
      return 'danger';
    default:
      return 'medium';
  }
}

/**
 * Format estimated time
 */
function formatEstimatedTime(estimatedReadyAt?: string): string {
  if (!estimatedReadyAt) {
    return 'Calculating...';
  }

  const readyTime = new Date(estimatedReadyAt);
  const now = new Date();
  const diffMs = readyTime.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);

  if (diffMins <= 0) {
    return 'Any moment now';
  } else if (diffMins === 1) {
    return '~1 minute';
  } else if (diffMins < 60) {
    return `~${diffMins} minutes`;
  } else {
    return readyTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

/**
 * OrderConfirmation page component
 */
const OrderConfirmation: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();

  const { order, status, isLoading, error, refetch } = useOrderStatus({
    orderId,
    pollingInterval: 5000,
    enabled: !!orderId,
  });

  /**
   * Copy pickup code to clipboard
   */
  const handleCopyPickupCode = async () => {
    if (order?.pickupCode && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(order.pickupCode);
        // Could show a toast here
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  // Loading state
  if (isLoading && !order) {
    return (
      <IonPage>
        <AppHeader title="Order Status" showBackButton={true} backHref="/home" />
        <IonContent className="order-confirmation-page">
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <p>Loading order...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // Error state (and no cached order)
  if (error && !order) {
    return (
      <IonPage>
        <AppHeader title="Order Status" showBackButton={true} backHref="/home" />
        <IonContent className="order-confirmation-page">
          <div className="error-container">
            <IonIcon icon={closeCircle} color="danger" className="error-icon" />
            <h2>Order not found</h2>
            <p>{error.message}</p>
            <IonButton onClick={refetch}>
              <IonIcon slot="start" icon={refreshOutline} />
              Retry
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!order || !status) {
    return null;
  }

  const currentStep = getStatusStep(status);
  const isTerminal = status === OrderStatus.COMPLETED || status === OrderStatus.CANCELLED || status === OrderStatus.FAILED;

  return (
    <IonPage>
      <AppHeader title="Order Status" showBackButton={true} backHref="/home" />
      <IonContent className="order-confirmation-page">
        <div className="confirmation-container">
          {/* Success Banner */}
          <div className="success-banner">
            <IonIcon icon={checkmarkCircle} className="success-icon" />
            <h1>Order Placed!</h1>
            <p>Order #{order.orderNumber || order.id.slice(-8).toUpperCase()}</p>
          </div>

          {/* Pickup Code Card */}
          <IonCard className="pickup-card">
            <IonCardContent>
              <div className="pickup-label">Your Pickup Code</div>
              <div className="pickup-code" onClick={handleCopyPickupCode}>
                {order.pickupCode || 'N/A'}
              </div>
              <IonButton
                fill="clear"
                size="small"
                onClick={handleCopyPickupCode}
                className="copy-button"
              >
                <IonIcon slot="start" icon={copyOutline} />
                Copy
              </IonButton>
            </IonCardContent>
          </IonCard>

          {/* Status Progress */}
          <IonCard className="status-card">
            <IonCardHeader>
              <IonCardTitle>Order Status</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {/* Current Status */}
              <div className="current-status">
                <IonIcon
                  icon={getStatusIcon(status)}
                  color={getStatusColor(status)}
                  className="status-icon"
                />
                <div className="status-details">
                  <h3>{formatOrderStatus(status)}</h3>
                  {!isTerminal && status !== OrderStatus.READY && (
                    <p className="estimated-time">
                      Estimated ready: {formatEstimatedTime(order.estimatedReadyAt)}
                    </p>
                  )}
                  {status === OrderStatus.READY && (
                    <p className="ready-message">Your order is ready for pickup!</p>
                  )}
                </div>
              </div>

              {/* Progress Steps */}
              {!isTerminal && currentStep >= 0 && (
                <div className="progress-steps">
                  {STATUS_STEPS.map((step, index) => {
                    const isActive = index <= currentStep;
                    const isCurrent = index === currentStep;
                    return (
                      <div
                        key={step.status}
                        className={`progress-step ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}`}
                      >
                        <div className="step-indicator">
                          <IonIcon icon={step.icon} />
                        </div>
                        <span className="step-label">{step.label}</span>
                        {index < STATUS_STEPS.length - 1 && (
                          <div className={`step-connector ${isActive ? 'active' : ''}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Cancelled/Failed Message */}
              {(status === OrderStatus.CANCELLED || status === OrderStatus.FAILED) && (
                <div className="error-status">
                  <IonText color="danger">
                    <p>
                      {status === OrderStatus.CANCELLED
                        ? 'This order has been cancelled.'
                        : 'There was a problem with this order.'}
                    </p>
                  </IonText>
                </div>
              )}
            </IonCardContent>
          </IonCard>

          {/* Order Details */}
          <IonCard className="details-card">
            <IonCardHeader>
              <IonCardTitle>Order Details</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList lines="none" className="item-list">
                {order.items.map((item) => (
                  <IonItem key={item.id} className="order-item">
                    <IonLabel>
                      <h3 className="item-name">
                        {item.name}
                        {item.quantity > 1 && (
                          <IonBadge color="primary" className="quantity-badge">
                            x{item.quantity}
                          </IonBadge>
                        )}
                      </h3>
                      {item.description && (
                        <p className="item-description">{item.description}</p>
                      )}
                    </IonLabel>
                    <span slot="end" className="item-price">
                      ${item.totalPrice.toFixed(2)}
                    </span>
                  </IonItem>
                ))}
              </IonList>

              <div className="total-section">
                <div className="total-row">
                  <span className="total-label">Total</span>
                  <span className="total-amount">${order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </IonCardContent>
          </IonCard>

          {/* Refresh Button */}
          <div className="refresh-section">
            <IonButton fill="clear" onClick={refetch} disabled={isLoading}>
              <IonIcon slot="start" icon={refreshOutline} />
              Refresh Status
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default OrderConfirmation;
