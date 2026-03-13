import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ConnectPOSStep from './steps/ConnectPOSStep';
import BusinessProfileStep from './steps/BusinessProfileStep';
import CatalogTransformStep from './steps/CatalogTransformStep';
import BrandingStep from './steps/BrandingStep';
import ConfirmationStep from './steps/ConfirmationStep';
import './Onboarding.css';

export type BrandVoice = 'warm' | 'bold' | 'minimal';

export interface OnboardingData {
  businessName: string;
  slug: string;
  contactEmail: string;
  posConnected: boolean;
  posMerchantId?: string;
  catalogTransformed: boolean;
  brandName: string;
  accentColor: string;
  voice: BrandVoice;
  catalogSummary?: {
    categories: number;
    bases: number;
    modifiers: number;
  };
}

const STEPS = [
  { id: 'profile', label: 'Shop Details' },
  { id: 'pos', label: 'Square Connect' },
  { id: 'catalog', label: 'Menu Setup' },
  { id: 'branding', label: 'Branding' },
  { id: 'confirm', label: 'Review' },
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
    brandName: business?.name || '',
    accentColor: '#6B4226',
    voice: 'warm',
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
        return (
          <BusinessProfileStep
            data={data}
            onUpdate={updateData}
            onNext={nextStep}
          />
        );
      case 1:
        return (
          <ConnectPOSStep
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
          <BrandingStep
            data={data}
            onUpdate={updateData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 4:
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
