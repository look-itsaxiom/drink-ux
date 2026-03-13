/**
 * OrderConfirmation Page
 * Shows order status timeline and pickup information.
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
import { closeCircle, copyOutline, refreshOutline } from 'ionicons/icons';
import { useParams } from 'react-router';
import { OrderStatus } from '@drink-ux/shared';
import AppHeader from '../components/AppHeader';
import { useOrderStatus } from '../hooks/useOrderStatus';
import { formatOrderStatus, getStatusStep } from '../services/orderService';
import './OrderConfirmation.css';

interface TimelineStep {
  status: OrderStatus;
  title: string;
  description: string;
}

const TIMELINE_STEPS: TimelineStep[] = [
  {
    status: OrderStatus.PENDING,
    title: 'Received',
    description: 'We got your order and payment',
  },
  {
    status: OrderStatus.CONFIRMED,
    title: 'Confirmed',
    description: 'Barista has accepted your order',
  },
  {
    status: OrderStatus.PREPARING,
    title: 'Preparing',
    description: 'Your drinks are being crafted',
  },
  {
    status: OrderStatus.READY,
    title: 'Ready for Pickup',
    description: 'Come grab your order at the counter',
  },
];

function getHeroMeta(status: OrderStatus, pickupCode: string): { emoji: string; title: string; subtitle: string } {
  switch (status) {
    case OrderStatus.PENDING:
      return {
        emoji: '⏳',
        title: 'Order Sent!',
        subtitle: 'Waiting for the shop to confirm your order',
      };
    case OrderStatus.CONFIRMED:
      return {
        emoji: '☕',
        title: 'Order Confirmed!',
        subtitle: 'Your order is in queue and will be prepared soon',
      };
    case OrderStatus.PREPARING:
      return {
        emoji: '🔥',
        title: 'Being Crafted!',
        subtitle: 'Your barista is making your drinks now',
      };
    case OrderStatus.READY:
      return {
        emoji: '🎉',
        title: 'Ready for Pickup!',
        subtitle: `Show code ${pickupCode} at pickup`,
      };
    case OrderStatus.COMPLETED:
      return {
        emoji: '✅',
        title: 'Order Completed!',
        subtitle: 'Thanks for ordering with Drink-UX',
      };
    case OrderStatus.CANCELLED:
      return {
        emoji: '⚠️',
        title: 'Order Cancelled',
        subtitle: 'This order was cancelled by the store',
      };
    case OrderStatus.FAILED:
      return {
        emoji: '⚠️',
        title: 'Order Failed',
        subtitle: 'There was a problem processing this order',
      };
    default:
      return {
        emoji: '☕',
        title: 'Order Update',
        subtitle: formatOrderStatus(status),
      };
  }
}

function formatEstimatedTime(estimatedReadyAt?: string): string {
  if (!estimatedReadyAt) {
    return 'Calculating...';
  }

  const readyTime = new Date(estimatedReadyAt);
  const now = new Date();
  const diffMs = readyTime.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);

  if (diffMins <= 0) {
    return 'Ready now';
  }
  if (diffMins === 1) {
    return '~1 minute';
  }
  if (diffMins < 60) {
    return `~${diffMins} minutes`;
  }

  return readyTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatTime(value?: string): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function getTimelineStep(status: OrderStatus): number {
  const rawStep = getStatusStep(status);
  if (rawStep < 0) {
    return -1;
  }
  return Math.min(rawStep, TIMELINE_STEPS.length - 1);
}

const OrderConfirmation: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();

  const { order, status, isLoading, error, refetch } = useOrderStatus({
    orderId,
    pollingInterval: 5000,
    enabled: !!orderId,
  });

  const handleCopyPickupCode = async () => {
    if (order?.pickupCode && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(order.pickupCode);
      } catch (err) {
        console.error('Failed to copy pickup code:', err);
      }
    }
  };

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

  const currentStep = getTimelineStep(status);
  const isFailedState = status === OrderStatus.CANCELLED || status === OrderStatus.FAILED;
  const isReadyOrDone = status === OrderStatus.READY || status === OrderStatus.COMPLETED;
  const pickupCode = order.pickupCode || 'N/A';
  const orderNumber = order.orderNumber || order.id.slice(-8).toUpperCase();
  const heroMeta = getHeroMeta(status, pickupCode);
  const progressPercent = currentStep < 0 ? 0 : [0, 36, 67, 100][currentStep];
  const firstStepTime = formatTime(order.createdAt);
  const currentStepTime = formatTime(order.updatedAt);

  return (
    <IonPage>
      <AppHeader title="Order Status" showBackButton={true} backHref="/home" />
      <IonContent className="order-confirmation-page" fullscreen>
        <div className="order-hero">
          <div className="hero-circle hero-circle-1" />
          <div className="hero-circle hero-circle-2" />
          <span className="hero-emoji" aria-hidden="true">
            {heroMeta.emoji}
          </span>
          <h1>{heroMeta.title}</h1>
          <p>{heroMeta.subtitle}</p>
          <div className="pickup-card">
            <div className="pickup-label">Your Pickup Code</div>
            <div className="pickup-code" onClick={handleCopyPickupCode} role="button" tabIndex={0}>
              {pickupCode}
            </div>
            <div className="pickup-order-num">Order #{orderNumber}</div>
            <IonButton fill="clear" size="small" onClick={handleCopyPickupCode} className="copy-button">
              <IonIcon slot="start" icon={copyOutline} />
              Copy
            </IonButton>
          </div>
        </div>

        <div className="confirmation-content">
          {!isFailedState && (
            <>
              <div className="eta-card">
                <p className="eta-label">Estimated ready</p>
                <p className="eta-value">
                  {isReadyOrDone ? 'Ready now' : formatEstimatedTime(order.estimatedReadyAt)}
                </p>
                <p className="status-copy">
                  {status === OrderStatus.READY
                    ? `Status: ${formatOrderStatus(status)}`
                    : formatOrderStatus(status)}
                </p>
              </div>

              <IonCard className="status-card">
                <IonCardHeader>
                  <IonCardTitle>Order Status</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <div className="timeline">
                    <div className="timeline-track" />
                    <div className="timeline-progress" style={{ height: `${progressPercent}%` }} />
                    {TIMELINE_STEPS.map((step, index) => {
                      const done = currentStep > index;
                      const active = currentStep === index;
                      const titleClass = done ? 'step-title done' : active ? 'step-title active' : 'step-title';
                      const showTime = done || active;
                      const timeText = index === 0 ? firstStepTime : active ? currentStepTime : done ? 'Done' : '';
                      return (
                        <article className="timeline-item" key={step.status}>
                          <div className={done ? 'timeline-dot done' : active ? 'timeline-dot active' : 'timeline-dot'}>
                            {done ? '✓' : null}
                          </div>
                          <div className="timeline-content">
                            <h3 className={titleClass}>{step.title}</h3>
                            <p className="step-description">{step.description}</p>
                            <p className="timeline-time">{showTime ? timeText : ''}</p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </IonCardContent>
              </IonCard>
            </>
          )}

          {isFailedState && (
            <IonCard className="status-card">
              <IonCardContent>
                <div className="error-status">
                  <IonIcon icon={closeCircle} color="danger" className="error-icon" />
                  <IonText color="danger">
                    <p>
                      {status === OrderStatus.CANCELLED
                        ? 'This order has been cancelled.'
                        : 'There was a problem with this order.'}
                    </p>
                  </IonText>
                </div>
              </IonCardContent>
            </IonCard>
          )}

          <IonCard className="details-card">
            <IonCardHeader>
              <IonCardTitle>Your Order</IonCardTitle>
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
                      {item.description && <p className="item-description">{item.description}</p>}
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

          <div className="refresh-section">
            <IonButton fill="clear" onClick={refetch}>
              <IonIcon slot="start" icon={refreshOutline} />
              Refresh
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default OrderConfirmation;
