import React, { useState, useMemo } from "react";
import { useHistory } from "react-router";
import {
  IonContent,
  IonPage,
  IonButton,
  IonFooter,
  IonToolbar,
} from "@ionic/react";
import {
  DrinkCategory,
  DrinkType,
  CupSize,
  ComponentType,
  ModifierComponent,
} from "@drink-ux/shared";

import AppHeader from "../components/AppHeader";
import CategorySelector from "../components/DrinkBuilder/CategorySelector";
import TypeSelector from "../components/DrinkBuilder/TypeSelector";
import ModificationPanel from "../components/DrinkBuilder/ModificationPanel";
import DrinkVisual from "../components/DrinkBuilder/DrinkVisual";
import ModifierSelector, {
  milkModifiers as fallbackMilkModifiers,
  syrupModifiers as fallbackSyrupModifiers,
  toppingModifiers as fallbackToppingModifiers,
} from "../components/DrinkBuilder/ModifierSelector";
import { useCart, CartItem } from "../hooks/useCart";
import { useCatalogContext } from "../context/CatalogContext";
import { MappedModifier } from "../services/catalogService";

import "./DrinkBuilder.css";

/**
 * Transform mapped modifier to ModifierComponent for UI
 */
function transformModifier(mod: MappedModifier, type: string): ModifierComponent {
  return {
    id: mod.squareModifierId, // Use Square modifier ID directly
    name: mod.name,
    type: ComponentType.MODIFIER,
    category: type.toLowerCase(),
    price: mod.price,
    canTransformDrink: false,
    visual: {
      color: '#f0f0f0',
      opacity: 0.6,
      layerOrder: 2,
    },
    available: true,
  };
}

type BuilderStep = "category" | "type" | "modifications";

// Local state interface (not extending shared DrinkBuilderState to avoid import issues)
interface DrinkBuilderLocalState {
  category?: DrinkCategory;
  categoryId?: string;
  drinkType?: DrinkType;
  cupSize?: CupSize;
  isHot?: boolean;
  milk?: ModifierComponent;
  syrups: ModifierComponent[];
  toppings: ModifierComponent[];
  totalPrice: number;
}

const DrinkBuilder: React.FC = () => {
  const history = useHistory();

  // Try to use cart context, handle gracefully if not available
  let cartAvailable = false;
  let addToCart: ((item: CartItem) => void) | null = null;

  try {
    const cart = useCart();
    addToCart = cart.addItem;
    cartAvailable = true;
  } catch {
    // Cart context not available
  }

  // Try to use catalog context for modifiers, handle gracefully if not available
  let catalogModifiers = { milks: [] as MappedModifier[], syrups: [] as MappedModifier[], toppings: [] as MappedModifier[] };

  try {
    const catalog = useCatalogContext();
    catalogModifiers = catalog.modifiers || { milks: [], syrups: [], toppings: [] };
  } catch {
    // Catalog context not available
  }

  // Transform API modifiers to ModifierComponent format, or use fallbacks
  const milkModifiers = useMemo(() => {
    const apiMilks = catalogModifiers.milks || [];
    return apiMilks.length > 0 ? apiMilks.map(m => transformModifier(m, 'milk')) : fallbackMilkModifiers;
  }, [catalogModifiers.milks]);

  const syrupModifiers = useMemo(() => {
    const apiSyrups = catalogModifiers.syrups || [];
    return apiSyrups.length > 0 ? apiSyrups.map(m => transformModifier(m, 'syrup')) : fallbackSyrupModifiers;
  }, [catalogModifiers.syrups]);

  const toppingModifiers = useMemo(() => {
    const apiToppings = catalogModifiers.toppings || [];
    return apiToppings.length > 0 ? apiToppings.map(m => transformModifier(m, 'topping')) : fallbackToppingModifiers;
  }, [catalogModifiers.toppings]);

  const [step, setStep] = useState<BuilderStep>("category");
  const [drinkState, setDrinkState] = useState<DrinkBuilderLocalState>({
    syrups: [],
    toppings: [],
    totalPrice: 0,
    cupSize: CupSize.MEDIUM, // Default size
  });

  const [showMilkSelector, setShowMilkSelector] = useState(false);
  const [showSyrupSelector, setShowSyrupSelector] = useState(false);
  const [showToppingSelector, setShowToppingSelector] = useState(false);

  const handleCategorySelect = (category: DrinkCategory, categoryId: string) => {
    setDrinkState({ ...drinkState, category, categoryId });
    setStep("type");
  };

  const handleTypeSelect = (drinkType: DrinkType) => {
    const newState = { ...drinkState, drinkType };

    // Set temperature based on drink type constraints
    if (drinkType.isHot !== undefined) {
      newState.isHot = drinkType.isHot;
    }

    setDrinkState(newState);
    setStep("modifications");
  };

  const handleStateUpdate = (updates: Partial<DrinkBuilderLocalState>) => {
    setDrinkState({ ...drinkState, ...updates });
  };

  const handleMilkSelect = (milk: ModifierComponent) => {
    setDrinkState({ ...drinkState, milk });
  };

  const handleSyrupSelect = (syrup: ModifierComponent) => {
    setDrinkState({ ...drinkState, syrups: [...drinkState.syrups, syrup] });
  };

  const handleToppingSelect = (topping: ModifierComponent) => {
    setDrinkState({
      ...drinkState,
      toppings: [...drinkState.toppings, topping],
    });
  };

  const handleBackFromType = () => {
    setDrinkState({ ...drinkState, category: undefined, categoryId: undefined });
    setStep("category");
  };

  const handleBackFromMods = () => {
    setDrinkState({
      ...drinkState,
      drinkType: undefined,
      milk: undefined,
      syrups: [],
      toppings: [],
    });
    setStep("type");
  };

  const calculateTotalPrice = () => {
    let total = drinkState.drinkType?.basePrice || 0;

    // Cup size premium
    switch (drinkState.cupSize) {
      case CupSize.MEDIUM:
        total += 0.5;
        break;
      case CupSize.LARGE:
        total += 1.0;
        break;
    }

    // Add modifier prices
    if (drinkState.milk) total += drinkState.milk.price;
    drinkState.syrups.forEach((s) => (total += s.price));
    drinkState.toppings.forEach((t) => (total += t.price));

    return total;
  };

  const getProgressValue = () => {
    switch (step) {
      case "category":
        return 0.33;
      case "type":
        return 0.66;
      case "modifications":
        return 1.0;
      default:
        return 0;
    }
  };

  const handleAddToCart = () => {
    if (!drinkState.drinkType) return;

    const totalPrice = calculateTotalPrice();
    const modifierIds: string[] = [];
    const modifierNames: string[] = [];

    // Collect modifier info - IDs are now Square modifier IDs
    if (drinkState.milk) {
      modifierIds.push(drinkState.milk.id);
      modifierNames.push(drinkState.milk.name);
    }
    drinkState.syrups.forEach((s) => {
      modifierIds.push(s.id);
      modifierNames.push(s.name);
    });
    drinkState.toppings.forEach((t) => {
      modifierIds.push(t.id);
      modifierNames.push(t.name);
    });

    // Create cart item - baseId is now the Square item ID
    const cartItem: CartItem = {
      id: `item-${Date.now()}`,
      baseId: drinkState.drinkType.id, // This is now squareItemId
      baseName: drinkState.drinkType.name,
      size: drinkState.cupSize || CupSize.MEDIUM,
      isHot: drinkState.isHot ?? true,
      modifierIds, // These are now squareModifierIds
      modifierNames,
      quantity: 1,
      unitPrice: totalPrice,
      totalPrice: totalPrice,
    };

    if (cartAvailable && addToCart) {
      addToCart(cartItem);
    }

    console.log("Adding to cart:", cartItem);
    history.push("/cart");
  };

  // Progress steps data for AppHeader
  const progressSteps = [
    {
      key: "category",
      label: "Category",
      isActive: step === "category",
      isCompleted: step === "type" || step === "modifications",
    },
    {
      key: "type",
      label: "Type",
      isActive: step === "type",
      isCompleted: step === "modifications",
    },
    {
      key: "modifications",
      label: "Customize",
      isActive: step === "modifications",
      isCompleted: false,
    },
  ];

  return (
    <IonPage>
      <AppHeader
        title="Build Your Drink"
        showBackButton={true}
        backHref="/home"
        showProgress={true}
        progressValue={getProgressValue()}
        progressSteps={progressSteps}
      />

      <IonContent
        fullscreen
        className={`drink-builder ${
          step === "modifications" ? "modifications-step" : ""
        }`}
        scrollY={step !== "modifications"}
      >
        <div
          className={
            step === "modifications"
              ? "builder-container-modifications"
              : "builder-container-standard"
          }
        >
          {/* Visual Section - Only visible on modifications step */}
          {step === "modifications" && (
            <div className="visual-section">
              <DrinkVisual state={drinkState} />
            </div>
          )}

          {/* Content Section - Changes based on step */}
          <div
            className={
              step === "modifications"
                ? "customization-section"
                : "standard-content"
            }
          >
            {step === "modifications" && (
              <div className="customization-sheet-handle">
                <div className="sheet-handle-bar"></div>
                <div className="sheet-handle-shadow"></div>
              </div>
            )}

            {step === "category" && (
              <CategorySelector onSelect={handleCategorySelect} />
            )}

            {step === "type" && drinkState.category && (
              <TypeSelector
                category={drinkState.category}
                categoryId={drinkState.categoryId}
                onSelect={handleTypeSelect}
                onBack={handleBackFromType}
              />
            )}

            {step === "modifications" && drinkState.drinkType && (
              <ModificationPanel
                drinkType={drinkState.drinkType}
                state={drinkState}
                onUpdate={handleStateUpdate}
                onBack={handleBackFromMods}
                onShowMilkSelector={() => setShowMilkSelector(true)}
                onShowSyrupSelector={() => setShowSyrupSelector(true)}
                onShowToppingSelector={() => setShowToppingSelector(true)}
              />
            )}
          </div>
        </div>

        {/* Modals */}
        <ModifierSelector
          isOpen={showMilkSelector}
          title="Select Milk"
          modifiers={milkModifiers}
          onSelect={handleMilkSelect}
          onDismiss={() => setShowMilkSelector(false)}
          selectedIds={drinkState.milk ? [drinkState.milk.id] : []}
        />

        <ModifierSelector
          isOpen={showSyrupSelector}
          title="Select Syrup"
          modifiers={syrupModifiers}
          onSelect={handleSyrupSelect}
          onDismiss={() => setShowSyrupSelector(false)}
          selectedIds={drinkState.syrups.map((s) => s.id)}
        />

        <ModifierSelector
          isOpen={showToppingSelector}
          title="Select Topping"
          modifiers={toppingModifiers}
          onSelect={handleToppingSelect}
          onDismiss={() => setShowToppingSelector(false)}
          selectedIds={drinkState.toppings.map((t) => t.id)}
        />
      </IonContent>

      {step === "modifications" && (
        <IonFooter>
          <IonToolbar>
            <IonButton
              expand="block"
              onClick={handleAddToCart}
              disabled={!drinkState.drinkType}
            >
              Add to Cart - ${calculateTotalPrice().toFixed(2)}
            </IonButton>
          </IonToolbar>
        </IonFooter>
      )}
    </IonPage>
  );
};

export default DrinkBuilder;
