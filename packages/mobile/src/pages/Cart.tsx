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
import { useCart, type CartItem } from '../hooks/useCart';
import './Cart.css';

const Cart: React.FC = () => {
  const history = useHistory();
  const { items, total, removeItem, updateQuantity } = useCart();

  const handleCheckout = () => {
    history.push('/checkout');
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

  return (
    <IonPage>
      <AppHeader title="Your Cart" showBackButton={true} backHref="/home" />
      <IonContent fullscreen className="cart-page">
        {items.length === 0 ? (
          <div className="empty-cart">
            <IonIcon icon={cartOutline} className="empty-icon" />
            <h2>Your cart is empty</h2>
            <p>Add some drinks to get started!</p>
            <IonButton routerLink="/drink/new" expand="block">
              Create a Drink
            </IonButton>
          </div>
        ) : (
          <>
            <IonList className="cart-list">
              {items.map((item) => (
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
                      <span className="item-price">${item.totalPrice.toFixed(2)}</span>
                    </div>
                  </IonItem>
                  <IonItemOptions side="end">
                    <IonItemOption color="danger" onClick={() => removeItem(item.id)}>
                      <IonIcon slot="icon-only" icon={trashOutline} />
                    </IonItemOption>
                  </IonItemOptions>
                </IonItemSliding>
              ))}
            </IonList>

            <div className="cart-summary">
              <div className="total-row">
                <span className="total-label">Total</span>
                <span className="total-amount">${total.toFixed(2)}</span>
              </div>
            </div>
          </>
        )}
      </IonContent>

      {items.length > 0 && (
        <IonFooter>
          <IonToolbar>
            <IonButton
              expand="block"
              onClick={handleCheckout}
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
