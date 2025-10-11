import React from 'react';
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

interface ProgressStep {
  key: string;
  label: string;
  isActive: boolean;
  isCompleted: boolean;
}

interface AppHeaderProps {
  title: string;
  showBackButton?: boolean;
  backHref?: string;
  showCartButton?: boolean;
  onCartClick?: () => void;
  showProgress?: boolean;
  progressValue?: number;
  progressSteps?: ProgressStep[];
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
  children,
}) => {
  const getStepClass = (step: ProgressStep) => {
    let baseClass = 'step';
    if (step.isCompleted) {
      baseClass += ' completed';
    } else if (step.isActive) {
      baseClass += ' active';
    }
    return baseClass;
  };

  return (
    <IonHeader>
      <IonToolbar className="app-header">
        {showBackButton && (
          <IonButtons slot="start">
            <IonBackButton defaultHref={backHref} />
          </IonButtons>
        )}
        <IonTitle>{title}</IonTitle>
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