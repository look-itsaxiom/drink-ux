/**
 * Checkout Page
 * Two-step flow: (1) review cart + enter customer info → create order,
 * then (2) collect payment via Square Web Payments SDK → confirm order.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  IonContent,
  IonPage,
  IonList,
  IonItem,
  IonLabel,
  IonText,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonBadge,
  IonSpinner,
} from '@ionic/react';
import { useHistory } from 'react-router';
import AppHeader from '../components/AppHeader';
import { CustomerInfoForm, CustomerInfo, SquarePaymentForm } from '../components/Checkout';
import { useCart, CartItem } from '../hooks/useCart';
import { payOrder, OrderResponse } from '../services/orderService';
import './Checkout.css';

/** Square App ID from env (Vite injects VITE_ prefixed vars) */
const SQUARE_APP_ID = import.meta.env.VITE_SQUARE_APP_ID || '';
const SQUARE_LOCATION_ID = import.meta.env.VITE_SQUARE_LOCATION_ID || '';

type CheckoutStep = 'review' | 'payment';

const Checkout: React.FC = () => {
  const history = useHistory();
  const [step, setStep] = useState<CheckoutStep>('review');
  const [submitting, setSubmitting] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingOrder, setPendingOrder] = useState<OrderResponse | null>(null);

  // Try to use cart context
  let cartData: {
    items: CartItem[];
    total: number;
    submitOrder: (info: { customerName: string; customerEmail?: string; customerPhone?: string }) => Promise<OrderResponse>;
    orderError: string | null;
  } = {
    items: [],
    total: 0,
    submitOrder: async () => ({ id: '' } as OrderResponse),
    orderError: null,
  };

  let cartAvailable = false;

  try {
    const cart = useCart();
    cartData = {
      items: cart.items,
      total: cart.total,
      submitOrder: cart.submitOrder,
      orderError: cart.orderError,
    };
    cartAvailable = true;
  } catch {
    // Cart context not available
  }

  const { items, total, submitOrder, orderError } = cartData;

  // Redirect to home if cart is empty and we're not in payment step
  useEffect(() => {
    if (cartAvailable && items.length === 0 && step === 'review') {
      history.push('/home');
    }
  }, [cartAvailable, items.length, history, step]);

  const formatSize = (size: string): string => {
    switch (size) {
      case 'SMALL': return 'Small';
      case 'MEDIUM': return 'Medium';
      case 'LARGE': return 'Large';
      default: return size;
    }
  };

  const formatItemDescription = (item: CartItem): string => {
    const parts: string[] = [];
    parts.push(formatSize(item.size));
    parts.push(item.isHot ? 'Hot' : 'Iced');
    if (item.modifierNames.length > 0) {
      parts.push(item.modifierNames.join(', '));
    }
    return parts.join(' | ');
  };

  /**
   * Step 1: Create order from cart
   */
  const handleSubmitOrder = useCallback(async (customerInfo: CustomerInfo) => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const order = await submitOrder({
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
      });

      setPendingOrder(order);

      // If Square payment is configured, go to payment step
      if (SQUARE_APP_ID) {
        setStep('payment');
      } else {
        // No payment configured — go directly to confirmation (order stays PENDING)
        history.push(`/order/${order.id}`);
      }
    } catch (err) {
      console.error('Order submission failed:', err);
      setSubmitError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }, [submitOrder, history]);

  /**
   * Step 2: Process payment token from Square
   */
  const handlePaymentToken = useCallback(async (sourceId: string) => {
    if (!pendingOrder) return;

    setPaymentProcessing(true);
    setSubmitError(null);

    try {
      await payOrder(pendingOrder.id, sourceId, pendingOrder.totalAmount);
      // Payment successful — navigate to order confirmation
      history.push(`/order/${pendingOrder.id}`);
    } catch (err) {
      console.error('Payment failed:', err);
      setSubmitError(
        err instanceof Error ? err.message : 'Payment failed. Please try again.'
      );
    } finally {
      setPaymentProcessing(false);
    }
  }, [pendingOrder, history]);

  // Loading state
  if (!cartAvailable) {
    return (
      <IonPage>
        <AppHeader title="Checkout" showBackButton={true} backHref="/cart" />
        <IonContent className="checkout-page">
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <p>Loading...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <AppHeader
        title={step === 'review' ? 'Checkout' : 'Payment'}
        showBackButton={true}
        backHref={step === 'review' ? '/cart' : undefined}
      />
      <IonContent className="checkout-page">
        <div className="checkout-container">
          {/* Order Summary */}
          <IonCard className="summary-card">
            <IonCardHeader>
              <IonCardTitle>Order Summary</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList lines="none" className="item-list">
                {(step === 'review' ? items : []).map((item) => (
                  <IonItem key={item.id} className="cart-item">
                    <IonLabel>
                      <h3 className="item-name">
                        {item.baseName}
                        {item.quantity > 1 && (
                          <IonBadge color="primary" className="quantity-badge">
                            x{item.quantity}
                          </IonBadge>
                        )}
                      </h3>
                      <p className="item-description">{formatItemDescription(item)}</p>
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
                  <span className="total-amount">
                    ${(pendingOrder?.totalAmount ?? total).toFixed(2)}
                  </span>
                </div>
              </div>
            </IonCardContent>
          </IonCard>

          {/* Step 1: Customer Info */}
          {step === 'review' && (
            <IonCard className="form-card">
              <IonCardHeader>
                <IonCardTitle>Your Information</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <CustomerInfoForm
                  onSubmit={handleSubmitOrder}
                  isLoading={submitting}
                  submitButtonText={SQUARE_APP_ID ? 'Continue to Payment' : 'Place Order'}
                  autoFocus={true}
                />
              </IonCardContent>
            </IonCard>
          )}

          {/* Step 2: Payment */}
          {step === 'payment' && pendingOrder && SQUARE_APP_ID && (
            <IonCard className="form-card">
              <IonCardHeader>
                <IonCardTitle>Payment</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <SquarePaymentForm
                  appId={SQUARE_APP_ID}
                  locationId={SQUARE_LOCATION_ID || undefined}
                  amount={pendingOrder.totalAmount}
                  onPaymentToken={handlePaymentToken}
                  processing={paymentProcessing}
                />
              </IonCardContent>
            </IonCard>
          )}

          {/* Error Message */}
          {(submitError || orderError) && (
            <div className="error-container">
              <IonText color="danger">
                <p className="error-message">{submitError || orderError}</p>
              </IonText>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Checkout;
