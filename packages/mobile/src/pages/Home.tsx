import {
  IonContent,
  IonPage,
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
import { addCircleOutline, cafeOutline, iceCreamOutline, waterOutline } from 'ionicons/icons';
import { useHistory } from 'react-router';
import AppHeader from '../components/AppHeader';
import './Home.css';

const Home: React.FC = () => {
  const history = useHistory();

  const handleCreateDrink = () => {
    // Navigate to drink builder
    history.push('/drink/new');
  };

  return (
    <IonPage>
      <AppHeader 
        title="Drink Builder" 
        showCartButton={true}
        onCartClick={() => history.push('/cart')}
      />
      <IonContent fullscreen className="home-page">
        <div className="container">
          <div className="welcome-section">
            <h1 className="page-title">Build Your Perfect Drink</h1>
            <p className="page-subtitle">Create a custom drink exactly how you like it</p>
          </div>

          <div className="action-section">
            <IonButton 
              expand="block" 
              size="large"
              onClick={handleCreateDrink}
              className="button-elevated"
              style={{"--background": "var(--theme-secondary)"}}
            >
              <IonIcon slot="start" icon={addCircleOutline} />
              Create Your Drink
            </IonButton>
          </div>

          <div className="section">
            <h2 className="section-title">Featured Drinks</h2>
            <IonGrid>
              <IonRow>
                <IonCol size="12" sizeMd="4">
                  <IonCard className="card-elevated">
                    <IonCardHeader>
                      <div className="promo-icon">
                        <IonIcon icon={cafeOutline} />
                      </div>
                      <IonCardTitle className="theme-text">Classic Espresso</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent className="theme-text-secondary">
                      Rich and bold espresso drinks crafted to perfection
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="12" sizeMd="4">
                  <IonCard className="card-elevated">
                    <IonCardHeader>
                      <div className="promo-icon">
                        <IonIcon icon={iceCreamOutline} />
                      </div>
                      <IonCardTitle className="theme-text">Iced Delights</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent className="theme-text-secondary">
                      Cool and refreshing drinks perfect for any time
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="12" sizeMd="4">
                  <IonCard className="card-elevated">
                    <IonCardHeader>
                      <div className="promo-icon">
                        <IonIcon icon={waterOutline} />
                      </div>
                      <IonCardTitle className="theme-text">Specialty Teas</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent className="theme-text-secondary">
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
