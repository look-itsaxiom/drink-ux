import {
  IonContent,
  IonPage,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonFooter,
  IonToolbar,
} from '@ionic/react';
import AppHeader from '../components/AppHeader';
import './Cart.css';

const Cart: React.FC = () => {
  // In a real app, this would come from state/context
  const cartItems = [
    { id: '1', name: 'Classic Latte', size: 'Medium', price: 5.0 },
  ];

  const total = cartItems.reduce((sum, item) => sum + item.price, 0);

  return (
    <IonPage>
      <AppHeader title="Your Cart" showBackButton={true} backHref="/home" />
      <IonContent fullscreen>
        <IonList>
          {cartItems.map((item) => (
            <IonItem key={item.id}>
              <IonLabel>
                <h2>{item.name}</h2>
                <p>{item.size}</p>
              </IonLabel>
              <IonLabel slot="end">${item.price.toFixed(2)}</IonLabel>
            </IonItem>
          ))}
        </IonList>
        <div className="cart-total">
          <h2>Total: ${total.toFixed(2)}</h2>
        </div>
      </IonContent>
      <IonFooter>
        <IonToolbar>
          <IonButton expand="block">
            Send to POS
          </IonButton>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default Cart;
