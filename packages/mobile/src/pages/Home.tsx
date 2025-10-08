import { useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
  IonIcon,
  IonRadioGroup,
  IonRadio,
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/react';
import { cartOutline, addCircleOutline } from 'ionicons/icons';
import { useHistory } from 'react-router';
import './Home.css';

const Home: React.FC = () => {
  const history = useHistory();
  const [selectedSize, setSelectedSize] = useState<string>('medium');

  const handleCreateDrink = () => {
    // Navigate to drink builder with optional size parameter
    history.push(`/drink/new?size=${selectedSize}`);
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

          <div className="size-selection-section">
            <h2>Choose Your Cup Size</h2>
            <IonList className="size-list">
              <IonRadioGroup value={selectedSize} onIonChange={(e: CustomEvent) => setSelectedSize(e.detail.value)}>
                <IonItem>
                  <IonLabel>
                    <h3>Small</h3>
                    <p>8 oz - Perfect for a quick drink</p>
                  </IonLabel>
                  <IonRadio slot="start" value="small" />
                </IonItem>
                <IonItem>
                  <IonLabel>
                    <h3>Medium</h3>
                    <p>12 oz - Most popular size</p>
                  </IonLabel>
                  <IonRadio slot="start" value="medium" />
                </IonItem>
                <IonItem>
                  <IonLabel>
                    <h3>Large</h3>
                    <p>16 oz - Maximum refreshment</p>
                  </IonLabel>
                  <IonRadio slot="start" value="large" />
                </IonItem>
              </IonRadioGroup>
            </IonList>
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
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
