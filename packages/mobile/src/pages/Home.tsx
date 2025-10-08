import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonButton,
  IonIcon,
} from '@ionic/react';
import { cartOutline } from 'ionicons/icons';
import { useHistory } from 'react-router';
import './Home.css';

const Home: React.FC = () => {
  const history = useHistory();

  const drinks = [
    { id: '1', name: 'Classic Latte', category: 'Espresso', price: '$4.50' },
    { id: '2', name: 'Cappuccino', category: 'Espresso', price: '$4.25' },
    { id: '3', name: 'Cold Brew', category: 'Cold Coffee', price: '$4.00' },
    { id: '4', name: 'Mocha', category: 'Specialty', price: '$5.00' },
  ];

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Drink Menu</IonTitle>
          <IonButton slot="end" fill="clear" onClick={() => history.push('/cart')}>
            <IonIcon icon={cartOutline} />
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonGrid>
          <IonRow>
            {drinks.map((drink) => (
              <IonCol size="12" sizeMd="6" sizeLg="4" key={drink.id}>
                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle>{drink.name}</IonCardTitle>
                    <IonCardSubtitle>{drink.category}</IonCardSubtitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <p>Starting at {drink.price}</p>
                    <IonButton
                      expand="block"
                      onClick={() => history.push(`/drink/${drink.id}`)}
                    >
                      Customize
                    </IonButton>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            ))}
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default Home;
