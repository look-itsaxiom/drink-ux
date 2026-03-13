import React from 'react';
import { OnboardingData } from '../Onboarding';

interface Props {
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const VOICE_OPTIONS: Array<{ value: OnboardingData['voice']; title: string; description: string }> = [
  { value: 'warm', title: 'Warm', description: 'Friendly and cozy neighborhood coffee tone.' },
  { value: 'bold', title: 'Bold', description: 'Confident, energetic, and modern café vibe.' },
  { value: 'minimal', title: 'Minimal', description: 'Clean, restrained, and premium voice.' },
];

const BrandingStep: React.FC<Props> = ({ data, onUpdate, onNext, onBack }) => {
  return (
    <div className="step-content">
      <h2>Branding</h2>
      <p className="step-description">
        Add your display brand and pick a color direction for your ordering page.
      </p>

      <div className="onboarding-form">
        <div className="form-group">
          <label htmlFor="brandName">Display Brand Name</label>
          <input
            type="text"
            id="brandName"
            value={data.brandName}
            onChange={(event) => onUpdate({ brandName: event.target.value })}
            placeholder="e.g., Brew & Blossom"
          />
          <span className="hint">Shown to customers throughout the storefront and receipts.</span>
        </div>

        <div className="form-group">
          <label htmlFor="accentColor">Accent Color</label>
          <div className="color-row">
            <input
              type="color"
              id="accentColor"
              value={data.accentColor}
              onChange={(event) => onUpdate({ accentColor: event.target.value })}
              aria-label="Accent color"
            />
            <input
              type="text"
              value={data.accentColor}
              onChange={(event) => onUpdate({ accentColor: event.target.value })}
              placeholder="#6B4226"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Brand Voice</label>
          <div className="voice-grid">
            {VOICE_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.value}
                className={`voice-option ${data.voice === option.value ? 'selected' : ''}`}
                onClick={() => onUpdate({ voice: option.value })}
              >
                <span className="voice-title">{option.title}</span>
                <span className="voice-description">{option.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="brand-preview" style={{ borderColor: data.accentColor }}>
          <div className="brand-preview-dot" style={{ backgroundColor: data.accentColor }} />
          <div>
            <strong>{data.brandName || data.businessName || 'Your Brand'}</strong>
            <p>{data.voice === 'warm' ? 'Warm welcome copy and cozy highlights.' : data.voice === 'bold' ? 'High-energy calls to action and standout sections.' : 'Minimal copy with premium whitespace.'}</p>
          </div>
        </div>

        <div className="step-actions">
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            Back
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onNext}
            disabled={!data.brandName.trim()}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default BrandingStep;
