import React, { useState, useEffect } from 'react';
import { OnboardingData } from '../Onboarding';
import { useAuth } from '../../../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Props {
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface SquareImportSummary {
  categories: number;
  items: number;
  modifiers: number;
}

const CatalogTransformStep: React.FC<Props> = ({ data, onUpdate, onNext, onBack }) => {
  const { user } = useAuth();
  const businessId = user?.businessId;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<SquareImportSummary | null>(null);

  useEffect(() => {
    if (data.posConnected && !importSummary) {
      fetchSquareSummary();
    }
  }, [data.posConnected]);

  const fetchSquareSummary = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!businessId) {
        throw new Error('No business ID configured');
      }

      // Fetch raw catalog summary from Square
      const response = await fetch(`${API_BASE_URL}/api/pos/import-catalog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ businessId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch Square catalog');
      }

      const result = await response.json();
      setImportSummary(result.data.summary);
    } catch (err) {
      // Don't show error for empty catalog - that's expected for new sandbox
      const message = err instanceof Error ? err.message : 'Failed to fetch catalog';
      if (!message.includes('No catalog')) {
        setError(message);
      }
      setImportSummary({ categories: 0, items: 0, modifiers: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    onUpdate({
      catalogTransformed: true,
      catalogSummary: {
        categories: 0,
        bases: 0,
        modifiers: 0,
      },
    });
    onNext();
  };

  // If no POS connected, show alternate options
  if (!data.posConnected) {
    return (
      <div className="step-content">
        <h2>Set Up Your Menu</h2>
        <p className="step-description">
          You can set up your drink menu after completing onboarding.
        </p>

        <div className="catalog-info" style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <p style={{ margin: 0 }}>
            After onboarding, you'll be able to create categories, drink bases, and modifiers
            in the Menu Management section.
          </p>
        </div>

        <div className="step-actions">
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            Back
          </button>
          <button type="button" className="btn btn-primary" onClick={handleContinue}>
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="step-content">
        <h2>Checking Your Square Catalog</h2>
        <div className="loading-state" style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spinner" style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p>Fetching your Square catalog...</p>
        </div>
      </div>
    );
  }

  const hasSquareData = importSummary && (importSummary.categories > 0 || importSummary.items > 0 || importSummary.modifiers > 0);

  return (
    <div className="step-content">
      <h2>Set Up Your Menu</h2>
      <p className="step-description">
        Your Square account is connected. Now let's set up your drink-ux menu.
      </p>

      {error && <div className="error-message" style={{ marginBottom: '20px' }}>{error}</div>}

      {hasSquareData ? (
        <div className="square-summary" style={{
          backgroundColor: '#e8f5e9',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#2e7d32' }}>
            Found in Your Square Catalog
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2e7d32' }}>
                {importSummary?.categories || 0}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Categories</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2e7d32' }}>
                {importSummary?.items || 0}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Items</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2e7d32' }}>
                {importSummary?.modifiers || 0}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Modifiers</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="square-summary" style={{
          backgroundColor: '#fff3e0',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#ef6c00' }}>
            No Items in Square Catalog
          </h3>
          <p style={{ margin: 0, color: '#666' }}>
            Your Square catalog appears to be empty. No worries - you can create your
            drink menu from scratch in the Menu Management section.
          </p>
        </div>
      )}

      <div className="next-steps" style={{
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3 style={{ margin: '0 0 15px 0' }}>What's Next?</h3>
        <p style={{ margin: '0 0 10px 0' }}>
          After completing onboarding, go to <strong>Menu Management</strong> to:
        </p>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Create drink categories (Coffee, Tea, Specialty, etc.)</li>
          <li>Add drink bases (Latte, Cappuccino, Cold Brew, etc.)</li>
          <li>Set up modifiers (milks, syrups, toppings)</li>
          {hasSquareData && (
            <li>Reference your Square items while building your menu</li>
          )}
        </ul>
      </div>

      <div className="step-actions">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn btn-primary" onClick={handleContinue}>
          Continue to Confirmation
        </button>
      </div>
    </div>
  );
};

export default CatalogTransformStep;
