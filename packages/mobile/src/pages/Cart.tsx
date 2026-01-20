import { useState } from 'react';
import {
  IonContent,
  IonPage,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonFooter,
  IonToolbar,
  IonIcon,
  IonSpinner,
  IonText,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonInput,
  IonAlert,
  IonBadge,
} from '@ionic/react';
import { trashOutline, addOutline, removeOutline, checkmarkCircleOutline } from 'ionicons/icons';
import AppHeader from '../components/AppHeader';
import { useCart, CartItem } from '../hooks/useCart';
import './Cart.css';

const Cart: React.FC = () => {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  // Try to use cart context, handle gracefully if not available
  let cartData: {
    items: CartItem[];
    total: number;
    itemCount: number;
    removeItem: (id: string) => void;
    updateQuantity: (id: string, qty: number) => void;
    clearCart: () => void;
    submitOrder: (info: { customerName: string; customerEmail?: string }) => Promise<{ id: string }>;
    submitting: boolean;
    orderError: string | null;
  } = {
    items: [],
    total: 0,
    itemCount: 0,
    removeItem: () => {},
    updateQuantity: () => {},
    clearCart: () => {},
    submitOrder: async () => ({ id: '' }),
    submitting: false,
    orderError: null,
  };

  let cartAvailable = false;

  try {
    cartData = useCart();
    cartAvailable = true;
  } catch {
    // Cart context not available
  }

  const { items, total, removeItem, updateQuantity, submitOrder, submitting, orderError } = cartData;

  const handleSubmitOrder = async () => {
    if (!customerName.trim()) {
      return; // Form validation should handle this
    }

    try {
      const order = await submitOrder({
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || undefined,
      });

      setLastOrderId(order.id);
      setShowSuccessAlert(true);
      setCustomerName('');
      setCustomerEmail('');
    } catch (err) {
      // Error is handled by the hook
      console.error('Order submission failed:', err);
    }
  };

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

  const formatItemDescription = (item: CartItem): string => {
    const parts: string[] = [];
    parts.push(formatSize(item.size));
    parts.push(item.isHot ? 'Hot' : 'Iced');
    if (item.modifierNames.length > 0) {
      parts.push(item.modifierNames.join(', '));
    }
    if (item.notes) {
      parts.push(item.notes);
    }
    return parts.join(' | ');
  };

  // If cart context is not available, show demo items
  const displayItems = cartAvailable ? items : [
    { id: '1', baseName: 'Classic Latte', size: 'MEDIUM', isHot: true, modifierNames: [], quantity: 1, totalPrice: 5.0 } as CartItem,
  ];

  const displayTotal = cartAvailable ? total : 5.0;

  return (
    <IonPage>
      <AppHeader title="Your Cart" showBackButton={true} backHref="/home" />
      <IonContent fullscreen className="cart-page">
        {displayItems.length === 0 ? (
          <div className="empty-cart">
            <IonIcon icon={trashOutline} className="empty-icon" />
            <h2>Your cart is empty</h2>
            <p>Add some drinks to get started!</p>
            <IonButton routerLink="/drink/new" expand="block">
              Create a Drink
            </IonButton>
          </div>
        ) : (
          <>
            <IonList className="cart-list">
              {displayItems.map((item) => (
                <IonItemSliding key={item.id}>
                  <IonItem className="cart-item">
                    <IonLabel>
                      <h2 className="item-name">
                        {item.baseName}
                        {item.quantity > 1 && (
                          <IonBadge color="primary" className="quantity-badge">
                            x{item.quantity}
                          </IonBadge>
                        )}
                      </h2>
                      <p className="item-description">{formatItemDescription(item)}</p>
                    </IonLabel>
                    <div className="item-controls" slot="end">
                      {cartAvailable && (
                        <div className="quantity-controls">
                          <IonButton
                            fill="clear"
                            size="small"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            <IonIcon icon={removeOutline} />
                          </IonButton>
                          <span className="quantity">{item.quantity}</span>
                          <IonButton
                            fill="clear"
                            size="small"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <IonIcon icon={addOutline} />
                          </IonButton>
                        </div>
                      )}
                      <span className="item-price">${item.totalPrice.toFixed(2)}</span>
                    </div>
                  </IonItem>
                  {cartAvailable && (
                    <IonItemOptions side="end">
                      <IonItemOption color="danger" onClick={() => removeItem(item.id)}>
                        <IonIcon slot="icon-only" icon={trashOutline} />
                      </IonItemOption>
                    </IonItemOptions>
                  )}
                </IonItemSliding>
              ))}
            </IonList>

            <div className="cart-summary">
              <div className="total-row">
                <span className="total-label">Total</span>
                <span className="total-amount">${displayTotal.toFixed(2)}</span>
              </div>
            </div>

            {cartAvailable && (
              <div className="customer-info">
                <h3>Customer Information</h3>
                <IonItem>
                  <IonInput
                    label="Name"
                    labelPlacement="floating"
                    placeholder="Enter your name"
                    value={customerName}
                    onIonChange={(e) => setCustomerName(e.detail.value || '')}
                    required
                  />
                </IonItem>
                <IonItem>
                  <IonInput
                    label="Email (optional)"
                    labelPlacement="floating"
                    placeholder="Enter your email"
                    type="email"
                    value={customerEmail}
                    onIonChange={(e) => setCustomerEmail(e.detail.value || '')}
                  />
                </IonItem>
              </div>
            )}

            {orderError && (
              <div className="error-message">
                <IonText color="danger">{orderError}</IonText>
              </div>
            )}
          </>
        )}
      </IonContent>

      {displayItems.length > 0 && (
        <IonFooter>
          <IonToolbar>
            <IonButton
              expand="block"
              onClick={handleSubmitOrder}
              disabled={submitting || !customerName.trim() || !cartAvailable}
            >
              {submitting ? (
                <>
                  <IonSpinner name="crescent" />
                  <span style={{ marginLeft: '8px' }}>Submitting...</span>
                </>
              ) : (
                'Send to POS'
              )}
            </IonButton>
          </IonToolbar>
        </IonFooter>
      )}

      <IonAlert
        isOpen={showSuccessAlert}
        onDidDismiss={() => setShowSuccessAlert(false)}
        header="Order Submitted!"
        message={`Your order #${lastOrderId?.slice(-6) || ''} has been sent to the barista.`}
        buttons={[
          {
            text: 'OK',
            handler: () => {
              // Could navigate to order status page
            },
          },
        ]}
        cssClass="success-alert"
      />
    </IonPage>
  );
};

export default Cart;
