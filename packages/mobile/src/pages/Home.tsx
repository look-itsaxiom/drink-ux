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
  IonSpinner,
  IonText,
} from '@ionic/react';
import { addCircleOutline, cafeOutline, iceCreamOutline, waterOutline, alertCircleOutline } from 'ionicons/icons';
import { useHistory } from 'react-router';
import AppHeader from '../components/AppHeader';
import { useBusinessContext } from '../context/BusinessContext';
import './Home.css';

const Home: React.FC = () => {
  const history = useHistory();

  // Try to use business context, but handle gracefully if not available
  let businessData: { business: { name: string } | null; loading: boolean; error: string | null } = {
    business: null,
    loading: false,
    error: null,
  };

  try {
    businessData = useBusinessContext();
  } catch {
    // Context not available, use defaults
  }

  const { business, loading, error } = businessData;

  const handleCreateDrink = () => {
    // Navigate to drink builder
    history.push('/drink/new');
  };

  // Get the title based on business data
  const getTitle = () => {
    if (loading) return 'Loading...';
    if (business?.name) return business.name;
    return 'Drink Builder';
  };

  return (
    <IonPage>
      <AppHeader
        title={getTitle()}
        showCartButton={true}
        onCartClick={() => history.push('/cart')}
      />
      <IonContent fullscreen className="home-page">
        <div className="container">
          {loading ? (
            <div className="loading-container">
              <IonSpinner name="crescent" />
              <p>Loading...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="error-banner">
                  <IonIcon icon={alertCircleOutline} color="warning" />
                  <IonText color="medium">
                    <span>Running in demo mode</span>
                  </IonText>
                </div>
              )}

              <div className="welcome-section">
                <h1 className="page-title">
                  {business?.name ? `Welcome to ${business.name}` : 'Build Your Perfect Drink'}
                </h1>
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
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
