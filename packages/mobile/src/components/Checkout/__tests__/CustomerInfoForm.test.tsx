import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import CustomerInfoForm, { CustomerInfo } from '../CustomerInfoForm';

// Mock Ionic components
vi.mock('@ionic/react', () => ({
  IonInput: ({ label, value, onIonInput, onIonChange, type, placeholder, disabled, ref, ...props }: any) => (
    <div>
      <label htmlFor={`input-${label?.toLowerCase().replace(/\s+/g, '-')}`}>{label}</label>
      <input
        id={`input-${label?.toLowerCase().replace(/\s+/g, '-')}`}
        type={type || 'text'}
        value={value || ''}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => {
          if (onIonInput) onIonInput({ detail: { value: e.target.value } });
          if (onIonChange) onIonChange({ detail: { value: e.target.value } });
        }}
        aria-label={label}
        data-testid={`input-${label?.toLowerCase().replace(/\s+/g, '-')}`}
        {...props}
      />
    </div>
  ),
  IonItem: ({ children, className }: any) => <div className={`ion-item ${className || ''}`}>{children}</div>,
  IonLabel: ({ children }: any) => <span>{children}</span>,
  IonButton: ({ children, onClick, disabled, type, expand, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} type={type || 'button'} {...props}>
      {children}
    </button>
  ),
  IonSpinner: () => <span data-testid="loading-spinner">Loading...</span>,
  IonText: ({ children, color }: any) => <span className={`ion-text-${color}`}>{children}</span>,
  IonNote: ({ children, color }: any) => <span className={`ion-note ${color ? `ion-note-${color}` : ''}`}>{children}</span>,
}));

describe('CustomerInfoForm', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to submit form
  const submitForm = async () => {
    const form = document.querySelector('form');
    if (form) {
      fireEvent.submit(form);
    }
  };

  describe('rendering', () => {
    it('should render all form fields', () => {
      render(<CustomerInfoForm onSubmit={mockOnSubmit} />);

      expect(screen.getByTestId('input-name')).toBeInTheDocument();
      expect(screen.getByTestId('input-phone-(optional)')).toBeInTheDocument();
      expect(screen.getByTestId('input-email-(optional)')).toBeInTheDocument();
    });

    it('should render submit button', () => {
      render(<CustomerInfoForm onSubmit={mockOnSubmit} />);

      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    });

    it('should render with custom submit button text', () => {
      render(<CustomerInfoForm onSubmit={mockOnSubmit} submitButtonText="Place Order" />);

      expect(screen.getByRole('button', { name: /place order/i })).toBeInTheDocument();
    });

    it('should render with initial values', () => {
      const initialValues: CustomerInfo = {
        name: 'John Doe',
        phone: '555-1234',
        email: 'john@example.com',
      };

      render(<CustomerInfoForm onSubmit={mockOnSubmit} initialValues={initialValues} />);

      expect(screen.getByTestId('input-name')).toHaveValue('John Doe');
      expect(screen.getByTestId('input-phone-(optional)')).toHaveValue('555-1234');
      expect(screen.getByTestId('input-email-(optional)')).toHaveValue('john@example.com');
    });
  });

  describe('submission', () => {
    it('should submit with valid data', async () => {
      render(<CustomerInfoForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'John Doe' } });
      await submitForm();

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'John Doe',
          phone: undefined,
          email: undefined,
        });
      });
    });

    it('should submit with all fields filled', async () => {
      render(<CustomerInfoForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'Jane Smith' } });
      fireEvent.change(screen.getByTestId('input-phone-(optional)'), { target: { value: '555-9876' } });
      fireEvent.change(screen.getByTestId('input-email-(optional)'), { target: { value: 'jane@example.com' } });
      await submitForm();

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'Jane Smith',
          phone: '555-9876',
          email: 'jane@example.com',
        });
      });
    });

    it('should trim whitespace from values', async () => {
      render(<CustomerInfoForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByTestId('input-name'), { target: { value: '  John Doe  ' } });
      await submitForm();

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'John Doe',
          })
        );
      });
    });
  });

  describe('validation', () => {
    it('should show error for empty name', async () => {
      render(<CustomerInfoForm onSubmit={mockOnSubmit} />);

      await submitForm();

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error for whitespace-only name', async () => {
      render(<CustomerInfoForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByTestId('input-name'), { target: { value: '   ' } });
      await submitForm();

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should validate phone format if provided', async () => {
      render(<CustomerInfoForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'John' } });
      fireEvent.change(screen.getByTestId('input-phone-(optional)'), { target: { value: 'abc' } });
      await submitForm();

      await waitFor(() => {
        expect(screen.getByText(/invalid phone/i)).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should accept valid phone formats', async () => {
      render(<CustomerInfoForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'John' } });
      fireEvent.change(screen.getByTestId('input-phone-(optional)'), { target: { value: '555-123-4567' } });
      await submitForm();

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('should validate email format if provided', async () => {
      render(<CustomerInfoForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'John' } });
      fireEvent.change(screen.getByTestId('input-email-(optional)'), { target: { value: 'notanemail' } });
      await submitForm();

      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should accept valid email format', async () => {
      render(<CustomerInfoForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'John' } });
      fireEvent.change(screen.getByTestId('input-email-(optional)'), { target: { value: 'john@example.com' } });
      await submitForm();

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('should clear errors on valid input', async () => {
      render(<CustomerInfoForm onSubmit={mockOnSubmit} />);

      // Trigger validation error
      await submitForm();

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });

      // Type valid input
      fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'John' } });

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/name is required/i)).not.toBeInTheDocument();
      });
    });

    it('should validate all fields together', async () => {
      render(<CustomerInfoForm onSubmit={mockOnSubmit} />);

      // Leave name empty, add invalid phone and email
      fireEvent.change(screen.getByTestId('input-phone-(optional)'), { target: { value: 'x' } });
      fireEvent.change(screen.getByTestId('input-email-(optional)'), { target: { value: 'y' } });
      await submitForm();

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/invalid phone/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('should show loading state during submission', () => {
      render(<CustomerInfoForm onSubmit={mockOnSubmit} isLoading={true} />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should disable form while loading', () => {
      render(<CustomerInfoForm onSubmit={mockOnSubmit} isLoading={true} />);

      expect(screen.getByTestId('input-name')).toBeDisabled();
      expect(screen.getByTestId('input-phone-(optional)')).toBeDisabled();
      expect(screen.getByTestId('input-email-(optional)')).toBeDisabled();
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should not submit while loading', async () => {
      render(<CustomerInfoForm onSubmit={mockOnSubmit} isLoading={true} />);

      // Button should be disabled
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('accessibility', () => {
    it('should have proper labels for inputs', () => {
      render(<CustomerInfoForm onSubmit={mockOnSubmit} />);

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });
  });
});
