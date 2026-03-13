import React from 'react';
import { IonPage, IonContent } from '@ionic/react';

interface ComingSoonProps {
  businessName?: string;
}

export const ComingSoon: React.FC<ComingSoonProps> = ({ businessName }) => {
  return (
    <IonPage>
      <IonContent className="ion-padding ion-text-center">
        <h1>Coming Soon</h1>
        {businessName && <p>{businessName}</p>}
        <p>We're working hard to get things ready. Check back soon!</p>
      </IonContent>
    </IonPage>
  );
};

export const SocialLinks = {};
