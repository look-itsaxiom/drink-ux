import React from 'react';
import { IonPage, IonContent } from '@ionic/react';

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  [key: string]: string | undefined;
}

export interface ComingSoonProps {
  businessName?: string;
  logoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  socialLinks?: SocialLinks;
  primaryColor?: string;
  isSuspended?: boolean;
}

export const ComingSoon: React.FC<ComingSoonProps> = ({
  businessName,
  isSuspended,
}) => {
  return (
    <IonPage>
      <IonContent className="ion-padding ion-text-center">
        <h1>{isSuspended ? 'Temporarily Unavailable' : 'Coming Soon'}</h1>
        {businessName && <p>{businessName}</p>}
        <p>
          {isSuspended
            ? 'This storefront is temporarily unavailable. Please check back later.'
            : "We're working hard to get things ready. Check back soon!"}
        </p>
      </IonContent>
    </IonPage>
  );
};
