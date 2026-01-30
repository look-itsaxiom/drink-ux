import React, { useState } from 'react';
import { OnboardingData } from '../Onboarding';

interface Props {
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack?: () => void;
}

const BusinessProfileStep: React.FC<Props> = ({ data, onUpdate, onNext, onBack }) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    onUpdate({
      businessName: name,
      slug: generateSlug(name),
    });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!data.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    }

    if (!data.slug.trim()) {
      newErrors.slug = 'URL slug is required';
    } else if (!/^[a-z0-9-]+$/.test(data.slug)) {
      newErrors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens';
    }

    if (!data.contactEmail.trim()) {
      newErrors.contactEmail = 'Contact email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail)) {
      newErrors.contactEmail = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onNext();
    }
  };

  return (
    <div className="step-content">
      <h2>Business Profile</h2>
      <p className="step-description">
        Tell us about your coffee shop. This information will be used to set up your ordering page.
      </p>

      <form onSubmit={handleSubmit} className="onboarding-form">
        <div className="form-group">
          <label htmlFor="businessName">Business Name</label>
          <input
            type="text"
            id="businessName"
            value={data.businessName}
            onChange={handleNameChange}
            placeholder="e.g., Blue Mountain Coffee"
          />
          {errors.businessName && <span className="error">{errors.businessName}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="slug">URL Slug</label>
          <div className="input-with-prefix">
            <span className="prefix">drinkux.com/</span>
            <input
              type="text"
              id="slug"
              value={data.slug}
              onChange={(e) => onUpdate({ slug: e.target.value.toLowerCase() })}
              placeholder="blue-mountain-coffee"
            />
          </div>
          {errors.slug && <span className="error">{errors.slug}</span>}
          <span className="hint">This will be your customer ordering URL</span>
        </div>

        <div className="form-group">
          <label htmlFor="contactEmail">Contact Email</label>
          <input
            type="email"
            id="contactEmail"
            value={data.contactEmail}
            onChange={(e) => onUpdate({ contactEmail: e.target.value })}
            placeholder="owner@example.com"
          />
          {errors.contactEmail && <span className="error">{errors.contactEmail}</span>}
        </div>

        <div className="step-actions">
          {onBack && (
            <button type="button" className="btn btn-secondary" onClick={onBack}>
              Back
            </button>
          )}
          <button type="submit" className="btn btn-primary">
            Continue
          </button>
        </div>
      </form>
    </div>
  );
};

export default BusinessProfileStep;
