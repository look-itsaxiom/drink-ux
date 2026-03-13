/**
 * CustomerInfoForm Component
 * Form for collecting customer information during checkout
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  IonItem,
  IonInput,
  IonButton,
  IonSpinner,
  IonNote,
} from '@ionic/react';
import './CustomerInfoForm.css';

/**
 * Customer information interface
 */
export interface CustomerInfo {
  name: string;
  phone?: string;
  email?: string;
}

/**
 * Validation errors interface
 */
interface ValidationErrors {
  name?: string;
  phone?: string;
  email?: string;
}

/**
 * CustomerInfoForm props
 */
export interface CustomerInfoFormProps {
  /** Callback when form is submitted with valid data */
  onSubmit: (info: CustomerInfo) => void;
  /** Whether form is in loading state */
  isLoading?: boolean;
  /** Initial values for form fields */
  initialValues?: CustomerInfo;
  /** Custom text for submit button */
  submitButtonText?: string;
  /** Auto-focus on name field */
  autoFocus?: boolean;
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  if (!email) return true; // Optional field
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone format
 * Accepts various formats: 555-1234, (555) 123-4567, 5551234567, etc.
 */
function isValidPhone(phone: string): boolean {
  if (!phone) return true; // Optional field
  // Remove all non-digit characters and check length
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * CustomerInfoForm component for collecting customer details
 */
const CustomerInfoForm: React.FC<CustomerInfoFormProps> = ({
  onSubmit,
  isLoading = false,
  initialValues,
  submitButtonText = 'Continue',
  autoFocus = false,
}) => {
  const [name, setName] = useState(initialValues?.name || '');
  const [phone, setPhone] = useState(initialValues?.phone || '');
  const [email, setEmail] = useState(initialValues?.email || '');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const nameInputRef = useRef<HTMLIonInputElement>(null);

  // Auto-focus on name field
  useEffect(() => {
    if (autoFocus && nameInputRef.current) {
      setTimeout(() => {
        nameInputRef.current?.setFocus();
      }, 100);
    }
  }, [autoFocus]);

  // Clear specific error when field value changes
  useEffect(() => {
    if (hasSubmitted && name.trim()) {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
  }, [name, hasSubmitted]);

  useEffect(() => {
    if (hasSubmitted && isValidPhone(phone)) {
      setErrors((prev) => ({ ...prev, phone: undefined }));
    }
  }, [phone, hasSubmitted]);

  useEffect(() => {
    if (hasSubmitted && isValidEmail(email)) {
      setErrors((prev) => ({ ...prev, email: undefined }));
    }
  }, [email, hasSubmitted]);

  /**
   * Validate all form fields
   */
  const validate = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Name is required
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    // Phone validation (optional but must be valid if provided)
    if (phone && !isValidPhone(phone)) {
      newErrors.phone = 'Invalid phone number';
    }

    // Email validation (optional but must be valid if provided)
    if (email && !isValidEmail(email)) {
      newErrors.email = 'Invalid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setHasSubmitted(true);

    if (isLoading) {
      return;
    }

    if (!validate()) {
      return;
    }

    onSubmit({
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="customer-info-form">
      <IonItem className={errors.name ? 'ion-invalid' : ''}>
        <IonInput
          ref={nameInputRef}
          label="Name"
          labelPlacement="floating"
          placeholder="Enter your name"
          value={name}
          onIonInput={(e) => setName(e.detail.value || '')}
          disabled={isLoading}
          aria-label="Name"
          data-testid="input-name"
        />
      </IonItem>
      {errors.name && (
        <IonNote color="danger" className="error-note">
          {errors.name}
        </IonNote>
      )}

      <IonItem className={errors.phone ? 'ion-invalid' : ''}>
        <IonInput
          label="Phone (optional)"
          labelPlacement="floating"
          placeholder="Enter your phone number"
          type="tel"
          value={phone}
          onIonInput={(e) => setPhone(e.detail.value || '')}
          disabled={isLoading}
          aria-label="Phone (optional)"
          data-testid="input-phone-(optional)"
        />
      </IonItem>
      {errors.phone && (
        <IonNote color="danger" className="error-note">
          {errors.phone}
        </IonNote>
      )}

      <IonItem className={errors.email ? 'ion-invalid' : ''}>
        <IonInput
          label="Email (optional)"
          labelPlacement="floating"
          placeholder="Enter your email"
          type="email"
          value={email}
          onIonInput={(e) => setEmail(e.detail.value || '')}
          disabled={isLoading}
          aria-label="Email (optional)"
          data-testid="input-email-(optional)"
        />
      </IonItem>
      {errors.email && (
        <IonNote color="danger" className="error-note">
          {errors.email}
        </IonNote>
      )}

      <div className="form-actions">
        <IonButton
          expand="block"
          type="submit"
          disabled={isLoading}
          className="submit-button"
        >
          {isLoading ? (
            <>
              <IonSpinner name="crescent" />
              <span style={{ marginLeft: '8px' }}>Processing...</span>
            </>
          ) : (
            submitButtonText
          )}
        </IonButton>
      </div>
    </form>
  );
};

export default CustomerInfoForm;
