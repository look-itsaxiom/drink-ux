import React from "react";
import { IonList, IonItem, IonLabel, IonNote, IonIcon, IonSpinner } from "@ionic/react";
import { arrowBack, alertCircleOutline } from "ionicons/icons";
import { DrinkCategory, DrinkType } from "@drink-ux/shared";
import { useCatalogContext } from "../../context/CatalogContext";
import { MappedBase, getDefaultIsHot } from "../../services/catalogService";
import "./TypeSelector.css";

interface TypeSelectorProps {
  category: DrinkCategory;
  categoryId?: string;
  onSelect: (drinkType: DrinkType) => void;
  onBack: () => void;
}

// Mock data - fallback when API is not available
const getFallbackDrinkTypes = (category: DrinkCategory): DrinkType[] => {
  switch (category) {
    case DrinkCategory.COFFEE:
      return [
        { id: "latte", name: "Latte", category, basePrice: 4.5, isHot: undefined },
        { id: "americano", name: "Americano", category, basePrice: 3.5, isHot: undefined },
        { id: "cappuccino", name: "Cappuccino", category, basePrice: 4.0, isHot: true },
        { id: "cold-brew", name: "Cold Brew", category, basePrice: 4.0, isHot: false },
        { id: "iced-coffee", name: "Iced Coffee", category, basePrice: 3.5, isHot: false },
        { id: "drip-coffee", name: "Drip Coffee", category, basePrice: 2.5, isHot: true },
      ];
    case DrinkCategory.TEA:
      return [
        { id: "green-tea", name: "Green Tea", category, basePrice: 3.0, isHot: undefined },
        { id: "black-tea", name: "Black Tea", category, basePrice: 3.0, isHot: undefined },
        { id: "herbal-tea", name: "Herbal Tea", category, basePrice: 3.0, isHot: true },
        { id: "chai-latte", name: "Chai Latte", category, basePrice: 4.5, isHot: undefined },
      ];
    case DrinkCategory.ITALIAN_SODA:
      return [
        { id: "italian-soda", name: "Italian Soda", category, basePrice: 3.5, isHot: false },
        { id: "cream-soda", name: "Italian Cream Soda", category, basePrice: 4.0, isHot: false },
      ];
    case DrinkCategory.JUICE:
      return [
        { id: "orange-juice", name: "Orange Juice", category, basePrice: 3.5, isHot: false },
        { id: "apple-juice", name: "Apple Juice", category, basePrice: 3.5, isHot: false },
      ];
    case DrinkCategory.BLENDED:
      return [
        { id: "smoothie", name: "Smoothie", category, basePrice: 5.5, isHot: false },
        { id: "frappe", name: "Frappe", category, basePrice: 5.0, isHot: false },
      ];
    case DrinkCategory.SPECIALTY:
      return [
        { id: "hot-chocolate", name: "Hot Chocolate", category, basePrice: 3.5, isHot: true },
        { id: "matcha-latte", name: "Matcha Latte", category, basePrice: 4.5, isHot: undefined },
      ];
    default:
      return [];
  }
};

/**
 * Transform mapped base to DrinkType
 * Note: DrinkType.id now stores the squareItemId for order submission
 */
function transformToDrinkType(base: MappedBase, category: DrinkCategory): DrinkType {
  return {
    id: base.squareItemId, // Use Square ID directly
    name: base.name,
    category,
    basePrice: base.price,
    isHot: getDefaultIsHot(base.temperatures),
  };
}

const TypeSelector: React.FC<TypeSelectorProps> = ({ category, categoryId, onSelect, onBack }) => {
  // Try to use catalog context, but handle the case where it's not available
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

  // Get bases from API if categoryId is provided
  const apiBases = categoryId ? getBasesByCategory(categoryId) : [];
  const drinkTypes = apiBases.length > 0
    ? apiBases.map(base => transformToDrinkType(base, category))
    : getFallbackDrinkTypes(category);

  // Show loading state
  if (loading) {
    return (
      <div className="section">
        <div className="selector-header">
          <IonIcon icon={arrowBack} className="back-icon" onClick={onBack} />
          <h2 className="section-title">Loading drinks...</h2>
        </div>
        <div className="loading-container">
          <IonSpinner name="crescent" />
        </div>
      </div>
    );
  }

  // Show error state (but still show fallback data)
  const showError = error && apiBases.length === 0;

  return (
    <div className="section">
      <div className="selector-header">
        <IonIcon icon={arrowBack} className="back-icon" onClick={onBack} />
        <h2 className="section-title">Choose your {category}</h2>
      </div>

      {showError && (
        <div className="error-notice">
          <IonIcon icon={alertCircleOutline} color="warning" />
          <span>Using sample menu</span>
        </div>
      )}

      {drinkTypes.length === 0 ? (
        <div className="empty-container">
          <p>No drinks available in this category</p>
        </div>
      ) : (
        <IonList className="type-list" lines="none">
          {drinkTypes.map((drinkType, index) => (
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
              <IonLabel>
                <h2 className="type-name">{drinkType.name}</h2>
                <IonNote className="type-price">${drinkType.basePrice.toFixed(2)}</IonNote>
              </IonLabel>
              {drinkType.isHot !== undefined && (
                <IonNote slot="end" className="type-badge" color={drinkType.isHot ? "warning" : "primary"}>
                  {drinkType.isHot ? "Hot only" : "Iced only"}
                </IonNote>
              )}
            </IonItem>
          ))}
        </IonList>
      )}
    </div>
  );
};

export default TypeSelector;
