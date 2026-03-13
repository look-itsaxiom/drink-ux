import React, { useState, useEffect, useCallback } from 'react';
import { OnboardingData } from '../Onboarding';
import { useAuth } from '../../../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Props {
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface CatalogItem {
  id: string;
  name: string;
  price: number; // in cents
  type: 'item' | 'modifier';
}

type CategoryType = 'uncategorized' | 'bases' | 'milks' | 'syrups' | 'toppings' | 'hidden';

interface CategoryConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  itemType: 'BASE' | 'MODIFIER' | 'HIDDEN';
  category?: string;
}

const CATEGORIES: Record<CategoryType, CategoryConfig> = {
  uncategorized: {
    label: 'Uncategorized',
    description: 'Items to be categorized',
    color: '#7f8c8d',
    bgColor: '#f8f9fa',
    itemType: 'HIDDEN', // default fallback
  },
  bases: {
    label: 'Bases',
    description: 'Drinks you can order (Latte, Cappuccino, etc.)',
    color: '#6B4226',
    bgColor: '#fdf6f0',
    itemType: 'BASE',
  },
  milks: {
    label: 'Milks',
    description: 'Milk modifiers (Oat, Almond, etc.)',
    color: '#3498db',
    bgColor: '#ebf5fb',
    itemType: 'MODIFIER',
    category: 'milks',
  },
  syrups: {
    label: 'Syrups',
    description: 'Syrup modifiers (Vanilla, Caramel, etc.)',
    color: '#9b59b6',
    bgColor: '#f5eef8',
    itemType: 'MODIFIER',
    category: 'syrups',
  },
  toppings: {
    label: 'Toppings',
    description: 'Topping modifiers (Whipped cream, etc.)',
    color: '#27ae60',
    bgColor: '#e8f8f0',
    itemType: 'MODIFIER',
    category: 'toppings',
  },
  hidden: {
    label: 'Hidden',
    description: "Don't show in ordering (merch, combos, etc.)",
    color: '#95a5a6',
    bgColor: '#f5f5f5',
    itemType: 'HIDDEN',
  },
};

const CATEGORY_ORDER: CategoryType[] = ['uncategorized', 'bases', 'milks', 'syrups', 'toppings', 'hidden'];

const formatPrice = (cents: number): string => {
  if (cents === 0) return 'Free';
  return `$${(cents / 100).toFixed(2)}`;
};

const CatalogTransformStep: React.FC<Props> = ({ data, onUpdate, onNext, onBack }) => {
  const { user } = useAuth();
  const businessId = user?.businessId;
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [categorizedItems, setCategorizedItems] = useState<Record<CategoryType, string[]>>({
    uncategorized: [],
    bases: [],
    milks: [],
    syrups: [],
    toppings: [],
    hidden: [],
  });
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  // Fetch catalog on mount
  useEffect(() => {
    if (data.posConnected) {
      fetchCatalog();
    }
  }, [data.posConnected]);

  const fetchCatalog = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!businessId) {
        throw new Error('No business ID configured');
      }

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
      const { rawCatalog } = result.data;

      // Flatten items and modifiers into a single list
      const allItems: CatalogItem[] = [];

      // Add items (with their first variation price)
      for (const item of rawCatalog.items) {
        const price = item.variations?.[0]?.price ?? item.price ?? 0;
        allItems.push({
          id: item.id,
          name: item.name,
          price,
          type: 'item',
        });
      }

      // Add modifiers
      for (const modifier of rawCatalog.modifiers) {
        allItems.push({
          id: modifier.id,
          name: modifier.name,
          price: modifier.price ?? 0,
          type: 'modifier',
        });
      }

      setItems(allItems);
      // All items start as uncategorized
      setCategorizedItems(prev => ({
        ...prev,
        uncategorized: allItems.map(i => i.id),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch catalog';
      if (!message.includes('No catalog')) {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const getItemById = useCallback((id: string): CatalogItem | undefined => {
    return items.find(item => item.id === id);
  }, [items]);

  const moveItem = (itemId: string, toCategory: CategoryType) => {
    setCategorizedItems(prev => {
      const newState = { ...prev };
      // Remove from current category
      for (const cat of CATEGORY_ORDER) {
        newState[cat] = prev[cat].filter(id => id !== itemId);
      }
      // Add to new category
      newState[toCategory] = [...newState[toCategory], itemId];
      return newState;
    });
    setSelectedItem(null);
  };

  const handleSave = async () => {
    if (!businessId) return;

    setSaving(true);
    setError(null);

    try {
      // Create mappings for all categorized items (not uncategorized)
      const mappingsToCreate: Array<{
        squareItemId: string;
        itemType: string;
        category?: string;
      }> = [];

      for (const cat of CATEGORY_ORDER) {
        if (cat === 'uncategorized') continue;
        const config = CATEGORIES[cat];
        for (const itemId of categorizedItems[cat]) {
          mappingsToCreate.push({
            squareItemId: itemId,
            itemType: config.itemType,
            category: config.category,
          });
        }
      }

      // Create mappings one by one (could batch in future)
      for (const mapping of mappingsToCreate) {
        const response = await fetch(`${API_BASE_URL}/api/mappings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            businessId,
            ...mapping,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          // Ignore duplicate mapping errors, just continue
          if (!errorData.error?.includes('already exists')) {
            console.warn('Failed to create mapping:', errorData);
          }
        }
      }

      // Count categorized items for summary
      const basesCount = categorizedItems.bases.length;
      const modifiersCount = categorizedItems.milks.length + 
                            categorizedItems.syrups.length + 
                            categorizedItems.toppings.length;

      onUpdate({
        catalogTransformed: true,
        catalogSummary: {
          categories: 0,
          bases: basesCount,
          modifiers: modifiersCount,
        },
      });

      onNext();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save mappings';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
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

        <div style={{
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
          <button type="button" className="btn btn-primary" onClick={handleSkip}>
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
        <h2>Loading Your Square Catalog</h2>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spinner"></div>
          <p style={{ color: '#7f8c8d' }}>Fetching your items...</p>
        </div>
      </div>
    );
  }

  // No items found
  if (items.length === 0) {
    return (
      <div className="step-content">
        <h2>Set Up Your Menu</h2>
        <p className="step-description">
          Your Square catalog is empty. You can set up your menu manually later.
        </p>

        <div style={{
          backgroundColor: '#fff3e0',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#ef6c00' }}>No Items Found</h3>
          <p style={{ margin: 0, color: '#666' }}>
            Your Square catalog appears to be empty. After onboarding, 
            you can create your drink menu from scratch in Menu Management.
          </p>
        </div>

        <div className="step-actions">
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            Back
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSkip}>
            Continue
          </button>
        </div>
      </div>
    );
  }

  const categorizedCount = items.length - categorizedItems.uncategorized.length;

  return (
    <div className="step-content">
      <h2>Categorize Your Items</h2>
      <p className="step-description">
        Click an item to assign it to a category. This tells Drink-UX how to use each item.
      </p>

      {error && (
        <div className="error-message" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Progress indicator */}
      <div style={{
        backgroundColor: '#e8f5e9',
        padding: '12px 16px',
        borderRadius: '8px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ color: '#2e7d32', fontWeight: 500 }}>
          {categorizedCount} of {items.length} items categorized
        </span>
        <span style={{ color: '#7f8c8d', fontSize: '14px' }}>
          {categorizedItems.uncategorized.length} remaining
        </span>
      </div>

      {/* Category zones */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {CATEGORY_ORDER.map(cat => {
          const config = CATEGORIES[cat];
          const itemIds = categorizedItems[cat];

          return (
            <div
              key={cat}
              style={{
                backgroundColor: config.bgColor,
                border: `2px solid ${config.color}20`,
                borderRadius: '12px',
                padding: '16px',
                minHeight: '150px'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <h3 style={{
                  margin: 0,
                  color: config.color,
                  fontSize: '16px',
                  fontWeight: 600
                }}>
                  {config.label}
                </h3>
                <span style={{
                  backgroundColor: config.color,
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 500
                }}>
                  {itemIds.length}
                </span>
              </div>
              <p style={{
                margin: '0 0 12px 0',
                color: '#7f8c8d',
                fontSize: '12px'
              }}>
                {config.description}
              </p>

              {/* Items in this category */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                {itemIds.map(itemId => {
                  const item = getItemById(itemId);
                  if (!item) return null;

                  const isSelected = selectedItem === itemId;

                  return (
                    <div key={itemId} style={{ position: 'relative' }}>
                      <button
                        onClick={() => setSelectedItem(isSelected ? null : itemId)}
                        style={{
                          backgroundColor: isSelected ? config.color : 'white',
                          color: isSelected ? 'white' : '#2c3e50',
                          border: `1px solid ${config.color}40`,
                          borderRadius: '6px',
                          padding: '8px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: '2px',
                          transition: 'all 0.2s'
                        }}
                      >
                        <span style={{ fontWeight: 500, fontSize: '13px' }}>
                          {item.name}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          opacity: 0.7
                        }}>
                          {formatPrice(item.price)}
                        </span>
                      </button>

                      {/* Category dropdown when selected */}
                      {isSelected && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          zIndex: 100,
                          backgroundColor: 'white',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          padding: '4px',
                          marginTop: '4px',
                          minWidth: '140px'
                        }}>
                          {CATEGORY_ORDER.filter(c => c !== cat).map(targetCat => {
                            const targetConfig = CATEGORIES[targetCat];
                            return (
                              <button
                                key={targetCat}
                                onClick={() => moveItem(itemId, targetCat)}
                                style={{
                                  display: 'block',
                                  width: '100%',
                                  textAlign: 'left',
                                  padding: '8px 12px',
                                  border: 'none',
                                  borderRadius: '4px',
                                  backgroundColor: 'transparent',
                                  cursor: 'pointer',
                                  color: targetConfig.color,
                                  fontWeight: 500,
                                  fontSize: '13px'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = targetConfig.bgColor;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                              >
                                → {targetConfig.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {itemIds.length === 0 && (
                  <span style={{
                    color: '#bdc3c7',
                    fontSize: '13px',
                    fontStyle: 'italic'
                  }}>
                    No items yet
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Click outside to deselect */}
      {selectedItem && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 50
          }}
          onClick={() => setSelectedItem(null)}
        />
      )}

      <div className="step-actions">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          Back
        </button>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            className="btn btn-link"
            onClick={handleSkip}
            disabled={saving}
          >
            Skip for now
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || categorizedCount === 0}
          >
            {saving ? 'Saving...' : `Save & Continue (${categorizedCount} items)`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CatalogTransformStep;
