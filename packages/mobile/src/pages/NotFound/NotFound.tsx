/**
 * NotFound Page
 *
 * 404 page displayed when a user navigates to a non-existent route.
 * Provides navigation options to return home or go back.
 */

import React from 'react';
import {
  IonPage,
  IonContent,
  IonButton,
  IonIcon,
} from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import { searchOutline, homeOutline, arrowBackOutline } from 'ionicons/icons';
import './NotFound.css';

/**
 * Props for NotFound page
 */
export interface NotFoundProps {
  /** Custom title (default: "404") */
  title?: string;
  /** Custom message (default: "Page Not Found") */
  message?: string;
  /** Custom description */
  description?: string;
  /** Show back button (default: true) */
  showBackButton?: boolean;
  /** Custom home path (default: "/") */
  homePath?: string;
  /** Additional content to render */
  children?: React.ReactNode;
}

/**
 * NotFound page component for 404 errors
 */
export function NotFound({
  title = '404',
  message = 'Page Not Found',
  description = "The page you're looking for doesn't exist or has been moved.",
  showBackButton = true,
  homePath = '/',
  children,
}: NotFoundProps): React.ReactElement {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate(homePath);
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="not-found" role="main">
          <div className="not-found-icon">
            <IonIcon icon={searchOutline} />
          </div>

          <h1 className="not-found-title">{title}</h1>

          <h2 className="not-found-message">{message}</h2>

          <p className="not-found-description">{description}</p>

          <div className="not-found-actions">
            <IonButton onClick={handleGoHome} fill="solid" color="primary">
              <IonIcon slot="start" icon={homeOutline} />
              Go Home
            </IonButton>

            {showBackButton && (
              <IonButton onClick={handleGoBack} fill="outline" color="medium">
                <IonIcon slot="start" icon={arrowBackOutline} />
                Go Back
              </IonButton>
            )}
          </div>

          {children && <div className="not-found-children">{children}</div>}
        </div>
      </IonContent>
    </IonPage>
  );
}

export default NotFound;
