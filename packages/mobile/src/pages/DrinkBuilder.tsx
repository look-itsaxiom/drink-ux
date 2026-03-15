import React, { useState, useMemo, useCallback } from "react";
import { useHistory } from "react-router";
import {
  IonContent,
  IonPage,
  IonButton,
  IonFooter,
  IonToolbar,
} from "@ionic/react";
import {
  DrinkType,
} from "@drink-ux/shared";

import AppHeader from "../components/AppHeader";
import CategorySelector from "../components/DrinkBuilder/CategorySelector";
import TypeSelector from "../components/DrinkBuilder/TypeSelector";
import ModificationPanel, { SelectedModifiers } from "../components/DrinkBuilder/ModificationPanel";
import DrinkVisual from "../components/DrinkBuilder/DrinkVisual";
import ModifierSelector from "../components/DrinkBuilder/ModifierSelector";
import { useCart, CartItem } from "../hooks/useCart";
import { useCatalogContext } from "../context/CatalogContext";
import {
  MappedBase,
  MappedVariation,
  MappedModifier,
  MappedModifierGroup,
  getDefaultIsHot,
} from "../services/catalogService";

import "./DrinkBuilder.css";

type BuilderStep = "category" | "type" | "modifications";

interface BuilderState {
  category?: string;
  categoryId?: string;
  drinkType?: DrinkType;
  item?: MappedBase;
  selectedVariation?: MappedVariation;
  isHot?: boolean;
  selectedModifiers: SelectedModifiers;
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

  // Try to use catalog context for modifier groups
  let catalogData: ReturnType<typeof useCatalogContext> | null = null;
  try {
    catalogData = useCatalogContext();
  } catch {
    // Catalog context not available
  }

  const [step, setStep] = useState<BuilderStep>("category");
  const [state, setState] = useState<BuilderState>({
    selectedModifiers: {},
  });

  // Currently open modifier group selector
  const [openGroup, setOpenGroup] = useState<MappedModifierGroup | null>(null);

  // Get modifier groups for the selected item
  const itemModifierGroups = useMemo(() => {
    if (!state.item || !catalogData) return [];
    return catalogData.getModifierGroupsForItem(state.item);
  }, [state.item, catalogData]);

  const handleCategorySelect = (category: string, categoryId: string) => {
    setState({ ...state, category, categoryId });
    setStep("type");
  };

  const handleTypeSelect = (drinkType: DrinkType) => {
    // Find the matching MappedBase for this drink type (by squareItemId)
    const matchingBase = catalogData?.bases.find(b => b.squareItemId === drinkType.id);

    const newState: BuilderState = {
      ...state,
      drinkType,
      item: matchingBase,
      selectedModifiers: {},
    };

    // Auto-select first variation if available
    if (matchingBase?.variations && matchingBase.variations.length > 0) {
      // Default to first variation (or middle one if 3+)
      const defaultIndex = matchingBase.variations.length >= 3 ? 1 : 0;
      newState.selectedVariation = matchingBase.variations[defaultIndex];
    }

    // Set temperature based on drink type constraints
    if (drinkType.isHot !== undefined) {
      newState.isHot = drinkType.isHot;
    }

    setState(newState);
    setStep("modifications");
  };

  const handleSelectVariation = useCallback((variation: MappedVariation) => {
    setState(prev => ({ ...prev, selectedVariation: variation }));
  }, []);

  const handleSelectTemperature = useCallback((isHot: boolean) => {
    setState(prev => ({ ...prev, isHot }));
  }, []);

  const handleOpenModifierGroup = useCallback((group: MappedModifierGroup) => {
    setOpenGroup(group);
  }, []);

  const handleModifierSelect = useCallback((modifier: MappedModifier) => {
    if (!openGroup) return;

    setState(prev => {
      const groupId = openGroup.id;
      const current = prev.selectedModifiers[groupId] || [];

      if (openGroup.selectionMode === 'single') {
        // Single select: replace
        return {
          ...prev,
          selectedModifiers: {
            ...prev.selectedModifiers,
            [groupId]: [modifier],
          },
        };
      }

      // Multi select: add if not already selected
      const alreadySelected = current.some(m => m.squareModifierId === modifier.squareModifierId);
      if (alreadySelected) return prev;

      return {
        ...prev,
        selectedModifiers: {
          ...prev.selectedModifiers,
          [groupId]: [...current, modifier],
        },
      };
    });
  }, [openGroup]);

  const handleRemoveModifier = useCallback((groupId: string, modifierId: string) => {
    setState(prev => ({
      ...prev,
      selectedModifiers: {
        ...prev.selectedModifiers,
        [groupId]: (prev.selectedModifiers[groupId] || []).filter(
          m => m.squareModifierId !== modifierId
        ),
      },
    }));
  }, []);

  const handleBackFromType = () => {
    setState({ ...state, category: undefined, categoryId: undefined });
    setStep("category");
  };

  const handleBackFromMods = () => {
    setState({
      ...state,
      drinkType: undefined,
      item: undefined,
      selectedVariation: undefined,
      selectedModifiers: {},
    });
    setStep("type");
  };

  const calculateTotalPrice = (): number => {
    // Use variation price if selected, otherwise base price
    let total = state.selectedVariation?.price || state.drinkType?.priceCents || 0;

    // Add modifier prices
    for (const mods of Object.values(state.selectedModifiers)) {
      for (const mod of mods) {
        total += mod.price;
      }
    }

    return total;
  };

  /**
   * Format price for display. Prices from Square are in cents.
   */
  const formatDisplayPrice = (cents: number): string => {
    return `$${(cents / 100).toFixed(2)}`;
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
    if (!state.drinkType) return;

    const totalPrice = calculateTotalPrice();
    const modifierIds: string[] = [];
    const modifierNames: string[] = [];
    const modifierDetails: Array<{ id: string; name: string; price: number }> = [];

    // Collect all selected modifiers across groups
    for (const mods of Object.values(state.selectedModifiers)) {
      for (const mod of mods) {
        modifierIds.push(mod.squareModifierId);
        modifierNames.push(mod.name);
        modifierDetails.push({
          id: mod.squareModifierId,
          name: mod.name,
          price: mod.price,
        });
      }
    }

    const cartItem: CartItem = {
      id: `item-${Date.now()}`,
      baseId: state.drinkType.id,
      baseName: state.drinkType.name,
      size: state.selectedVariation?.name || 'Regular',
      isHot: state.isHot,
      modifierIds,
      modifierNames,
      quantity: 1,
      unitPrice: totalPrice,
      totalPrice: totalPrice,
      modifierDetails,
    };

    if (cartAvailable && addToCart) {
      addToCart(cartItem);
    }

    history.push("/cart");
  };

  // Determine if temperature selection should be shown
  const showTemperature = useMemo(() => {
    if (!state.item) return state.drinkType?.isHot === undefined;
    // Show if item supports both hot and iced
    const temps = state.item.temperatures || [];
    if (temps.length === 0) return false;
    const hot = temps.some(t => t.toUpperCase() === 'HOT');
    const iced = temps.some(t => t.toUpperCase() === 'ICED');
    return hot && iced;
  }, [state.item, state.drinkType]);

  // For DrinkVisual compatibility — build a legacy-ish state object
  const drinkVisualState = useMemo(() => ({
    drinkType: state.drinkType,
    cupSize: undefined,
    isHot: state.isHot,
    milk: undefined,
    syrups: [],
    toppings: [],
    totalPrice: calculateTotalPrice(),
  }), [state.drinkType, state.isHot, state.selectedModifiers, state.selectedVariation]);

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
      label: "Item",
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

  // Selected modifier IDs for the currently open group
  const openGroupSelectedIds = useMemo(() => {
    if (!openGroup) return [];
    return (state.selectedModifiers[openGroup.id] || []).map(m => m.squareModifierId);
  }, [openGroup, state.selectedModifiers]);

  return (
    <IonPage>
      <AppHeader
        title="Build Your Order"
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
              <DrinkVisual state={drinkVisualState} />
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

            {step === "type" && state.category && (
              <TypeSelector
                category={state.category}
                categoryId={state.categoryId}
                onSelect={handleTypeSelect}
                onBack={handleBackFromType}
              />
            )}

            {step === "modifications" && state.drinkType && (
              <ModificationPanel
                itemName={state.drinkType.name}
                variations={state.item?.variations || []}
                selectedVariation={state.selectedVariation}
                showTemperature={showTemperature}
                isHot={state.isHot}
                modifierGroups={itemModifierGroups}
                selectedModifiers={state.selectedModifiers}
                onSelectVariation={handleSelectVariation}
                onSelectTemperature={handleSelectTemperature}
                onOpenModifierGroup={handleOpenModifierGroup}
                onRemoveModifier={handleRemoveModifier}
              />
            )}
          </div>
        </div>

        {/* Modifier Group Selector Modal */}
        <ModifierSelector
          isOpen={!!openGroup}
          group={openGroup}
          selectedIds={openGroupSelectedIds}
          onSelect={handleModifierSelect}
          onDismiss={() => setOpenGroup(null)}
        />
      </IonContent>

      {step === "modifications" && (
        <IonFooter>
          <IonToolbar>
            <IonButton
              expand="block"
              onClick={handleAddToCart}
              disabled={!state.drinkType}
            >
              Add to Cart - {formatDisplayPrice(calculateTotalPrice())}
            </IonButton>
          </IonToolbar>
        </IonFooter>
      )}
    </IonPage>
  );
};

export default DrinkBuilder;
