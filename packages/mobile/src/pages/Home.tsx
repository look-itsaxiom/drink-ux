import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/react';
import { cartOutline, addCircleOutline, cafeOutline, iceCreamOutline, waterOutline } from 'ionicons/icons';
import { useHistory } from 'react-router';
import './Home.css';

const Home: React.FC = () => {
  const history = useHistory();

  const handleCreateDrink = () => {
    // Navigate to drink builder
    history.push('/drink/new');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Drink Builder</IonTitle>
          <IonButton slot="end" fill="clear" onClick={() => history.push('/cart')}>
            <IonIcon icon={cartOutline} />
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="home-page">
        <div className="home-container">
          <div className="welcome-section">
            <h1>Build Your Perfect Drink</h1>
            <p>Create a custom drink exactly how you like it</p>
          </div>

          <div className="action-section">
            <IonButton 
              expand="block" 
              size="large"
              onClick={handleCreateDrink}
              className="create-drink-button"
            >
              <IonIcon slot="start" icon={addCircleOutline} />
              Create Your Drink
            </IonButton>
          </div>

          <div className="promotional-section">
            <h2>Featured Drinks</h2>
            <IonGrid>
              <IonRow>
                <IonCol size="12" sizeMd="4">
                  <IonCard className="promo-card">
                    <IonCardHeader>
                      <div className="promo-icon">
                        <IonIcon icon={cafeOutline} />
                      </div>
                      <IonCardTitle>Classic Espresso</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      Rich and bold espresso drinks crafted to perfection
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="12" sizeMd="4">
                  <IonCard className="promo-card">
                    <IonCardHeader>
                      <div className="promo-icon">
                        <IonIcon icon={iceCreamOutline} />
                      </div>
                      <IonCardTitle>Iced Delights</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      Cool and refreshing drinks perfect for any time
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="12" sizeMd="4">
                  <IonCard className="promo-card">
                    <IonCardHeader>
                      <div className="promo-icon">
                        <IonIcon icon={waterOutline} />
                      </div>
                      <IonCardTitle>Specialty Teas</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      Premium tea selections with custom flavors
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>
            </IonGrid>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
