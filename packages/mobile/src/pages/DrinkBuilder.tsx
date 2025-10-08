import { useState } from 'react';
import { useParams, useHistory } from 'react-router';
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
  IonRadioGroup,
  IonRadio,
  IonCheckbox,
  IonButton,
  IonFooter,
} from '@ionic/react';
import './DrinkBuilder.css';

const DrinkBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const [size, setSize] = useState('medium');
  const [milk, setMilk] = useState('whole');
  const [extras, setExtras] = useState<string[]>([]);

  const handleAddToCart = () => {
    // In a real app, this would add to cart state/context
    console.log('Adding to cart:', { id, size, milk, extras });
    history.push('/cart');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>Customize Your Drink</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="drink-builder">
        <div className="drink-preview">
          <h2>Classic Latte</h2>
          <p className="drink-description">Customize your perfect drink</p>
        </div>

        <IonList>
          <IonItem>
            <IonLabel>
              <h3>Size</h3>
            </IonLabel>
          </IonItem>
          <IonRadioGroup value={size} onIonChange={(e) => setSize(e.detail.value)}>
            <IonItem>
              <IonLabel>Small (8oz) - $4.00</IonLabel>
              <IonRadio slot="start" value="small" />
            </IonItem>
            <IonItem>
              <IonLabel>Medium (12oz) - $4.50</IonLabel>
              <IonRadio slot="start" value="medium" />
            </IonItem>
            <IonItem>
              <IonLabel>Large (16oz) - $5.00</IonLabel>
              <IonRadio slot="start" value="large" />
            </IonItem>
          </IonRadioGroup>

          <IonItem>
            <IonLabel>
              <h3>Milk Type</h3>
            </IonLabel>
          </IonItem>
          <IonRadioGroup value={milk} onIonChange={(e) => setMilk(e.detail.value)}>
            <IonItem>
              <IonLabel>Whole Milk</IonLabel>
              <IonRadio slot="start" value="whole" />
            </IonItem>
            <IonItem>
              <IonLabel>Oat Milk (+$0.75)</IonLabel>
              <IonRadio slot="start" value="oat" />
            </IonItem>
            <IonItem>
              <IonLabel>Almond Milk (+$0.75)</IonLabel>
              <IonRadio slot="start" value="almond" />
            </IonItem>
          </IonRadioGroup>

          <IonItem>
            <IonLabel>
              <h3>Extras</h3>
            </IonLabel>
          </IonItem>
          <IonItem>
            <IonCheckbox
              slot="start"
              checked={extras.includes('whip')}
              onIonChange={(e) => {
                if (e.detail.checked) {
                  setExtras([...extras, 'whip']);
                } else {
                  setExtras(extras.filter((x) => x !== 'whip'));
                }
              }}
            />
            <IonLabel>Whipped Cream (+$0.50)</IonLabel>
          </IonItem>
          <IonItem>
            <IonCheckbox
              slot="start"
              checked={extras.includes('caramel')}
              onIonChange={(e) => {
                if (e.detail.checked) {
                  setExtras([...extras, 'caramel']);
                } else {
                  setExtras(extras.filter((x) => x !== 'caramel'));
                }
              }}
            />
            <IonLabel>Caramel Drizzle (+$0.75)</IonLabel>
          </IonItem>
        </IonList>
      </IonContent>
      <IonFooter>
        <IonToolbar>
          <IonButton expand="block" onClick={handleAddToCart}>
            Add to Cart - $5.00
          </IonButton>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default DrinkBuilder;
