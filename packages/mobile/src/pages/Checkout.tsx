/**
 * Checkout Page
 * Review cart and submit order
 */

import React, { useEffect, useState } from 'react';
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
import { CustomerInfoForm, CustomerInfo } from '../components/Checkout';
import { useCart, CartItem } from '../hooks/useCart';
import './Checkout.css';

/**
 * Checkout page component
 */
const Checkout: React.FC = () => {
  const history = useHistory();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Try to use cart context
  let cartData: {
    items: CartItem[];
    total: number;
    submitOrder: (info: { customerName: string; customerEmail?: string; customerPhone?: string }) => Promise<{ id: string }>;
    orderError: string | null;
  } = {
    items: [],
    total: 0,
    submitOrder: async () => ({ id: '' }),
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

  // Redirect to home if cart is empty
  useEffect(() => {
    if (cartAvailable && items.length === 0) {
      history.push('/home');
    }
  }, [cartAvailable, items.length, history]);

  /**
   * Format size for display
   */
  const formatSize = (size: string): string => {
    switch (size) {
      case 'SMALL':
        return 'Small';
      case 'MEDIUM':
        return 'Medium';
      case 'LARGE':
        return 'Large';
      default:
        return size;
    }
  };

  /**
   * Format item description
   */
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
   * Handle form submission
   */
  const handleSubmit = async (customerInfo: CustomerInfo) => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const order = await submitOrder({
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
      });

      // Navigate to order confirmation
      history.push(`/order/${order.id}`);
    } catch (err) {
      console.error('Order submission failed:', err);
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading if cart not available yet
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
      <AppHeader title="Checkout" showBackButton={true} backHref="/cart" />
      <IonContent className="checkout-page">
        <div className="checkout-container">
          {/* Order Summary */}
          <IonCard className="summary-card">
            <IonCardHeader>
              <IonCardTitle>Order Summary</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList lines="none" className="item-list">
                {items.map((item) => (
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
                  <span className="total-amount">${total.toFixed(2)}</span>
                </div>
              </div>
            </IonCardContent>
          </IonCard>

          {/* Customer Info Form */}
          <IonCard className="form-card">
            <IonCardHeader>
              <IonCardTitle>Your Information</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <CustomerInfoForm
                onSubmit={handleSubmit}
                isLoading={submitting}
                submitButtonText="Place Order"
                autoFocus={true}
              />
            </IonCardContent>
          </IonCard>

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
