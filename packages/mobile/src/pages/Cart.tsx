/**
 * Cart Page
 * Displays cart items and allows checkout navigation
 */

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
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonBadge,
} from '@ionic/react';
import { trashOutline, addOutline, removeOutline, cartOutline } from 'ionicons/icons';
import { useHistory } from 'react-router';
import AppHeader from '../components/AppHeader';
import { useCart, CartItem } from '../hooks/useCart';
import './Cart.css';

const Cart: React.FC = () => {
  const history = useHistory();

  // Try to use cart context, handle gracefully if not available
  let cartData: {
    items: CartItem[];
    total: number;
    itemCount: number;
    removeItem: (id: string) => void;
    updateQuantity: (id: string, qty: number) => void;
    clearCart: () => void;
  } = {
    items: [],
    total: 0,
    itemCount: 0,
    removeItem: () => {},
    updateQuantity: () => {},
    clearCart: () => {},
  };

  let cartAvailable = false;

  try {
    const cart = useCart();
    cartData = {
      items: cart.items,
      total: cart.total,
      itemCount: cart.itemCount,
      removeItem: cart.removeItem,
      updateQuantity: cart.updateQuantity,
      clearCart: cart.clearCart,
    };
    cartAvailable = true;
  } catch {
    // Cart context not available
  }

  const { items, total, removeItem, updateQuantity } = cartData;

  const handleCheckout = () => {
    history.push('/checkout');
  };

  const formatPrice = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

  const formatSize = (size: string): string => {
    // Accept any string — legacy values like SMALL/MEDIUM/LARGE
    // or dynamic variation names like "12 oz", "Regular", etc.
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
    if (item.isHot !== undefined) {
      parts.push(item.isHot ? 'Hot' : 'Iced');
    }
    if (item.modifierNames.length > 0) {
      parts.push(item.modifierNames.join(', '));
    }
    if (item.notes) {
      parts.push(item.notes);
    }
    return parts.join(' | ');
  };

  // If cart context is not available, show demo items (prices in cents)
  const displayItems = cartAvailable ? items : [
    { id: '1', baseId: 'demo-base', baseName: 'Classic Latte', size: 'Medium', isHot: true, modifierIds: [], modifierNames: [], quantity: 1, unitPrice: 500, totalPrice: 500 } as CartItem,
  ];

  const displayTotal = cartAvailable ? total : 500;

  return (
    <IonPage>
      <AppHeader title="Your Cart" showBackButton={true} backHref="/home" />
      <IonContent fullscreen className="cart-page">
        {displayItems.length === 0 ? (
          <div className="empty-cart">
            <IonIcon icon={cartOutline} className="empty-icon" />
            <h2>Your cart is empty</h2>
            <p>Add some items to get started!</p>
            <IonButton routerLink="/drink/new" expand="block">
              Browse Menu
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
                      <span className="item-price">{formatPrice(item.totalPrice)}</span>
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
                <span className="total-amount">{formatPrice(displayTotal)}</span>
              </div>
            </div>
          </>
        )}
      </IonContent>

      {displayItems.length > 0 && (
        <IonFooter>
          <IonToolbar>
            <IonButton
              expand="block"
              onClick={handleCheckout}
              disabled={!cartAvailable}
            >
              Proceed to Checkout
            </IonButton>
          </IonToolbar>
        </IonFooter>
      )}
    </IonPage>
  );
};

export default Cart;
