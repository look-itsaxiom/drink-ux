import React, { useState, useEffect } from 'react';
import { OnboardingData } from '../Onboarding';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005';

interface Props {
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface CatalogSuggestion {
  categories: Array<{ name: string; icon?: string }>;
  bases: Array<{ name: string; category: string; basePrice: number }>;
  modifiers: Array<{ name: string; type: 'MILK' | 'SYRUP' | 'TOPPING'; price: number }>;
}

const CatalogTransformStep: React.FC<Props> = ({ data, onUpdate, onNext, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<CatalogSuggestion | null>(null);
  const [editedSuggestions, setEditedSuggestions] = useState<CatalogSuggestion | null>(null);

  useEffect(() => {
    if (data.posConnected && !suggestions) {
      fetchAndTransformCatalog();
    }
  }, [data.posConnected]);

  const fetchAndTransformCatalog = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch raw catalog from Square via API
      const businessId = 'temp-business-id'; // TODO: Get from auth context
      const importResponse = await fetch(`${API_BASE_URL}/api/pos/import-catalog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ businessId }),
      });

      if (!importResponse.ok) {
        const errorData = await importResponse.json();
        throw new Error(errorData.error?.message || 'Failed to import catalog');
      }

      const importResult = await importResponse.json();
      const rawCatalog = importResult.data.rawCatalog;

      // 2. Send raw catalog to AI for transformation
      const transformResponse = await fetch(`${API_BASE_URL}/api/pos/transform-catalog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rawCatalog }),
      });

      if (!transformResponse.ok) {
        const errorData = await transformResponse.json();
        throw new Error(errorData.error?.message || 'Failed to transform catalog');
      }

      const transformResult = await transformResponse.json();
      const aiSuggestions = transformResult.data.suggestions;
      const aiPowered = transformResult.data.aiPowered;

      // 3. Convert AI suggestions to our UI format
      const transformedSuggestions: CatalogSuggestion = {
        categories: aiSuggestions.categories.map((cat: { name: string; icon: string }) => ({
          name: cat.name,
          icon: cat.icon,
        })),
        bases: aiSuggestions.bases.map((base: { name: string; categoryName: string; basePrice: number }) => ({
          name: base.name,
          category: base.categoryName,
          basePrice: base.basePrice,
        })),
        modifiers: aiSuggestions.modifiers.map((mod: { name: string; type: string; price: number }) => ({
          name: mod.name,
          type: mod.type as 'MILK' | 'SYRUP' | 'TOPPING',
          price: mod.price,
        })),
      };

      // Show whether AI was used
      if (aiPowered && aiSuggestions.reasoning) {
        console.log('AI transformation reasoning:', aiSuggestions.reasoning);
      }

      setSuggestions(transformedSuggestions);
      setEditedSuggestions(transformedSuggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transform catalog');
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = async () => {
    setLoading(true);
    setError(null);

    try {
      // Use predefined template catalog
      await new Promise(resolve => setTimeout(resolve, 1000));

      onUpdate({
        catalogTransformed: true,
        catalogSummary: {
          categories: 3,
          bases: 8,
          modifiers: 12,
        },
      });
      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply template');
    } finally {
      setLoading(false);
    }
  };

  const handleStartFresh = () => {
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

  const handleApplySuggestions = async () => {
    if (!editedSuggestions) return;

    setLoading(true);
    setError(null);

    try {
      // TODO: Save the transformed catalog to the API
      await new Promise(resolve => setTimeout(resolve, 1000));

      onUpdate({
        catalogTransformed: true,
        catalogSummary: {
          categories: editedSuggestions.categories.length,
          bases: editedSuggestions.bases.length,
          modifiers: editedSuggestions.modifiers.length,
        },
      });
      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save catalog');
    } finally {
      setLoading(false);
    }
  };

  // If no POS connected, show alternate options
  if (!data.posConnected) {
    return (
      <div className="step-content">
        <h2>Set Up Your Menu</h2>
        <p className="step-description">
          Choose how you'd like to set up your drink menu.
        </p>

        <div className="catalog-options">
          <div className="catalog-option">
            <h3>Start with a Template</h3>
            <p>Get started quickly with a pre-built coffee shop menu that you can customize.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleUseTemplate}
              disabled={loading}
            >
              {loading ? 'Setting up...' : 'Use Template'}
            </button>
          </div>

          <div className="catalog-option">
            <h3>Start Fresh</h3>
            <p>Build your menu from scratch in the admin dashboard.</p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleStartFresh}
            >
              Start Fresh
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="step-actions">
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            Back
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading && !suggestions) {
    return (
      <div className="step-content">
        <h2>Analyzing Your Menu</h2>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Our AI is analyzing your Square catalog and transforming it into the drink-ux format...</p>
        </div>
      </div>
    );
  }

  // Show AI suggestions for review
  return (
    <div className="step-content">
      <h2>Review Catalog Suggestions</h2>
      <p className="step-description">
        We've analyzed your menu and created suggestions for your drink-ux catalog.
        Review and edit as needed before applying.
      </p>

      {error && <div className="error-message">{error}</div>}

      {editedSuggestions && (
        <div className="suggestions-review">
          <div className="suggestion-section">
            <h3>Categories ({editedSuggestions.categories.length})</h3>
            <div className="items-list">
              {editedSuggestions.categories.map((cat, i) => (
                <div key={i} className="item-card">
                  <span className="item-name">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="suggestion-section">
            <h3>Drink Bases ({editedSuggestions.bases.length})</h3>
            <div className="items-list">
              {editedSuggestions.bases.map((base, i) => (
                <div key={i} className="item-card">
                  <span className="item-name">{base.name}</span>
                  <span className="item-detail">{base.category}</span>
                  <span className="item-price">${base.basePrice.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="suggestion-section">
            <h3>Modifiers ({editedSuggestions.modifiers.length})</h3>
            <div className="items-list">
              {editedSuggestions.modifiers.map((mod, i) => (
                <div key={i} className="item-card">
                  <span className="item-name">{mod.name}</span>
                  <span className="item-detail">{mod.type}</span>
                  <span className="item-price">
                    {mod.price > 0 ? `+$${mod.price.toFixed(2)}` : 'Included'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="step-actions">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleApplySuggestions}
          disabled={loading}
        >
          {loading ? 'Applying...' : 'Apply Suggestions'}
        </button>
      </div>
    </div>
  );
};

export default CatalogTransformStep;
