import React from "react";
import { IonList, IonItem, IonLabel, IonNote, IonIcon, IonSpinner, IonAvatar, IonThumbnail } from "@ionic/react";
import { arrowBack, alertCircleOutline, imageOutline } from "ionicons/icons";
import { DrinkType } from "@drink-ux/shared";
import { useCatalogContext } from "../../context/CatalogContext";
import { MappedBase, getDefaultIsHot, getDisplayPrice } from "../../services/catalogService";
import "./TypeSelector.css";

interface TypeSelectorProps {
  category: string;
  categoryId?: string;
  onSelect: (drinkType: DrinkType) => void;
  onBack: () => void;
}

// Fallback when API is not available
const getFallbackDrinkTypes = (category: string): DrinkType[] => {
  const lower = category.toLowerCase();
  if (lower.includes('coffee')) {
    return [
      { id: "latte", name: "Latte", category, priceCents: 450, isHot: undefined },
      { id: "americano", name: "Americano", category, priceCents: 350, isHot: undefined },
      { id: "cappuccino", name: "Cappuccino", category, priceCents: 400, isHot: true },
      { id: "cold-brew", name: "Cold Brew", category, priceCents: 400, isHot: false },
    ];
  }
  if (lower.includes('tea')) {
    return [
      { id: "green-tea", name: "Green Tea", category, priceCents: 300, isHot: undefined },
      { id: "chai-latte", name: "Chai Latte", category, priceCents: 450, isHot: undefined },
    ];
  }
  return [];
};

/**
 * Transform mapped base to DrinkType
 * DrinkType.id stores the squareItemId for order submission
 */
function transformToDrinkType(base: MappedBase, category: string): DrinkType {
  const { price } = getDisplayPrice(base);
  return {
    id: base.squareItemId,
    name: base.name,
    category,
    priceCents: price,
    isHot: getDefaultIsHot(base.temperatures),
  };
}

/**
 * Format cents to dollar display
 */
function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const TypeSelector: React.FC<TypeSelectorProps> = ({ category, categoryId, onSelect, onBack }) => {
  let catalogData: { getBasesByCategory: (id: string) => MappedBase[]; loading: boolean; error: string | null } = {
    getBasesByCategory: () => [],
    loading: false,
    error: null,
  };

  try {
    catalogData = useCatalogContext();
  } catch {
    // Context not available, use fallback
  }

  const { getBasesByCategory, loading, error } = catalogData;

  const apiBases = categoryId ? getBasesByCategory(categoryId) : [];
  const drinkTypes = apiBases.length > 0
    ? apiBases.map(base => transformToDrinkType(base, category))
    : getFallbackDrinkTypes(category);

  // Build a lookup for MappedBase by squareItemId for image/description access
  const baseMap = new Map(apiBases.map(b => [b.squareItemId, b]));

  if (loading) {
    return (
      <div className="section">
        <div className="selector-header">
          <IonIcon icon={arrowBack} className="back-icon" onClick={onBack} />
          <h2 className="section-title">Loading items...</h2>
        </div>
        <div className="loading-container">
          <IonSpinner name="crescent" />
        </div>
      </div>
    );
  }

  const showError = error && apiBases.length === 0;

  return (
    <div className="section">
      <div className="selector-header">
        <IonIcon icon={arrowBack} className="back-icon" onClick={onBack} />
        <h2 className="section-title">Choose your item</h2>
      </div>

      {showError && (
        <div className="error-notice">
          <IonIcon icon={alertCircleOutline} color="warning" />
          <span>Using sample menu</span>
        </div>
      )}

      {drinkTypes.length === 0 ? (
        <div className="empty-container">
          <p>No items available in this category</p>
        </div>
      ) : (
        <IonList className="type-list" lines="none">
          {drinkTypes.map((drinkType, index) => {
            const base = baseMap.get(drinkType.id);
            const displayInfo = base ? getDisplayPrice(base) : null;
            const hasImage = !!base?.imageUrl;

            return (
              <IonItem
                key={drinkType.id}
                button
                onClick={() => onSelect(drinkType)}
                className="type-item interactive-item interactive-item-large slide-in-up"
                style={
                  {
                    "--animation-delay": `${index * 0.05}s`,
                  } as React.CSSProperties
                }
              >
                {/* Item image or placeholder */}
                {hasImage ? (
                  <IonThumbnail slot="start" className="item-thumbnail">
                    <img
                      src={base!.imageUrl}
                      alt={drinkType.name}
                      loading="lazy"
                    />
                  </IonThumbnail>
                ) : (
                  <IonAvatar slot="start" className="item-placeholder">
                    <div className="placeholder-icon">
                      <IonIcon icon={imageOutline} />
                    </div>
                  </IonAvatar>
                )}

                <IonLabel>
                  <h2 className="type-name">{drinkType.name}</h2>
                  {base?.description && (
                    <p className="type-description">{base.description}</p>
                  )}
                  <IonNote className="type-price">
                    {displayInfo?.hasMultiple ? 'from ' : ''}
                    {formatPrice(drinkType.priceCents)}
                  </IonNote>
                </IonLabel>

                {drinkType.isHot !== undefined && (
                  <IonNote slot="end" className="type-badge" color={drinkType.isHot ? "warning" : "primary"}>
                    {drinkType.isHot ? "Hot only" : "Iced only"}
                  </IonNote>
                )}

                {base?.variations && base.variations.length > 1 && (
                  <IonNote slot="end" className="type-variations-badge" color="medium">
                    {base.variations.length} options
                  </IonNote>
                )}
              </IonItem>
            );
          })}
        </IonList>
      )}
    </div>
  );
};

export default TypeSelector;
