import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonFooter,
} from '@ionic/react';
import './Cart.css';

const Cart: React.FC = () => {
  // In a real app, this would come from state/context
  const cartItems = [
    { id: '1', name: 'Classic Latte', size: 'Medium', price: 5.0 },
  ];

  const total = cartItems.reduce((sum, item) => sum + item.price, 0);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>Your Cart</IonTitle>
        </IonToolbar>
      </IonHeader>
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
