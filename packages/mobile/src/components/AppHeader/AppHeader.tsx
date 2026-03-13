import React, { useState, useCallback } from 'react';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonProgressBar,
} from '@ionic/react';
import { useTheme } from '../../theme/ThemeProvider';
import './AppHeader.css';

interface ProgressStep {
  key: string;
  label: string;
  isActive: boolean;
  isCompleted: boolean;
}

interface AppHeaderProps {
  /** Title text to display */
  title: string;
  /** Show back navigation button */
  showBackButton?: boolean;
  /** Default href for back button */
  backHref?: string;
  /** Show cart button */
  showCartButton?: boolean;
  /** Cart button click handler */
  onCartClick?: () => void;
  /** Show progress indicator */
  showProgress?: boolean;
  /** Progress value (0-1) */
  progressValue?: number;
  /** Progress steps to display */
  progressSteps?: ProgressStep[];
  /** Show logo from theme */
  showLogo?: boolean;
  /** Business name for logo alt text fallback */
  businessName?: string;
  /** Additional children for end slot */
  children?: React.ReactNode;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  showBackButton = false,
  backHref = '/home',
  showCartButton = false,
  onCartClick,
  showProgress = false,
  progressValue = 0,
  progressSteps = [],
  showLogo = false,
  businessName,
  children,
}) => {
  const { logoUrl, isLoading } = useTheme();
  const [logoError, setLogoError] = useState(false);

  const getStepClass = (step: ProgressStep) => {
    let baseClass = 'step';
    if (step.isCompleted) {
      baseClass += ' completed';
    } else if (step.isActive) {
      baseClass += ' active';
    }
    return baseClass;
  };

  /**
   * Handle logo loading error
   * Falls back to showing title text
   */
  const handleLogoError = useCallback(() => {
    setLogoError(true);
  }, []);

  /**
   * Determine whether to show logo image
   */
  const shouldShowLogo = showLogo && logoUrl && !logoError && !isLoading;

  /**
   * Get alt text for logo image
   */
  const logoAltText = businessName
    ? `${businessName} logo`
    : `${title} logo`;

  return (
    <IonHeader>
      <IonToolbar className="app-header">
        {showBackButton && (
          <IonButtons slot="start">
            <IonBackButton defaultHref={backHref} />
          </IonButtons>
        )}

        {shouldShowLogo ? (
          <div className="header-logo-container" slot="start">
            <img
              src={logoUrl}
              alt={logoAltText}
              className="header-logo"
              data-testid="header-logo"
              onError={handleLogoError}
            />
          </div>
        ) : null}

        <IonTitle>{title}</IonTitle>

        {isLoading && showLogo && (
          <span data-testid="loading" style={{ display: 'none' }}>
            loading
          </span>
        )}

        {(showCartButton || children) && (
          <IonButtons slot="end">
            {showCartButton && (
              <IonButton fill="clear" onClick={onCartClick}>
                <IonIcon name="bag-outline" />
              </IonButton>
            )}
            {children}
          </IonButtons>
        )}
      </IonToolbar>
      {showProgress && (
        <>
          <IonProgressBar value={progressValue} color="primary" />
          {progressSteps.length > 0 && (
            <div className="progress-steps">
              {progressSteps.map((step) => (
                <span key={step.key} className={getStepClass(step)}>
                  {step.label}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </IonHeader>
  );
};

export default AppHeader;