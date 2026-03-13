import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ConnectPOSStep from './steps/ConnectPOSStep';
import BusinessProfileStep from './steps/BusinessProfileStep';
import CatalogTransformStep from './steps/CatalogTransformStep';
import ConfirmationStep from './steps/ConfirmationStep';
import './Onboarding.css';

export interface OnboardingData {
  businessName: string;
  slug: string;
  contactEmail: string;
  posConnected: boolean;
  posMerchantId?: string;
  catalogTransformed: boolean;
  catalogSummary?: {
    categories: number;
    bases: number;
    modifiers: number;
  };
}

// Reordered: Connect POS first, then profile (pre-filled), then catalog
const STEPS = [
  { id: 'pos', label: 'Connect POS' },
  { id: 'profile', label: 'Business Profile' },
  { id: 'catalog', label: 'Import Catalog' },
  { id: 'confirm', label: 'Confirmation' },
];

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { user, business } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);

  // Pre-populate with data from signup
  const [data, setData] = useState<OnboardingData>({
    businessName: business?.name || '',
    slug: business?.slug || '',
    contactEmail: user?.email || '',
    posConnected: false,
    catalogTransformed: false,
  });

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    // Navigate to admin dashboard after onboarding
    navigate('/');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        // Connect POS first - no back button on first step
        return (
          <ConnectPOSStep
            data={data}
            onUpdate={updateData}
            onNext={nextStep}
          />
        );
      case 1:
        // Business profile - pre-filled from signup, can edit if needed
        return (
          <BusinessProfileStep
            data={data}
            onUpdate={updateData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 2:
        return (
          <CatalogTransformStep
            data={data}
            onUpdate={updateData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 3:
        return (
          <ConfirmationStep
            data={data}
            onBack={prevStep}
            onComplete={handleComplete}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-header">
        <h1>Welcome to Drink-UX</h1>
        <p>Let's get your business set up</p>
      </div>

      <div className="onboarding-progress">
        {STEPS.map((step, index) => (
          <div
            key={step.id}
            className={`progress-step ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
          >
            <div className="step-number">
              {index < currentStep ? '✓' : index + 1}
            </div>
            <div className="step-label">{step.label}</div>
          </div>
        ))}
      </div>

      <div className="onboarding-content">
        {renderStepContent()}
      </div>
    </div>
  );
};

export default Onboarding;
