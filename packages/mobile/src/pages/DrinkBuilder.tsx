import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useHistory, useParams } from "react-router";
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
  getDisplayPrice,
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

/**
 * Parse the :id URL param to determine entry mode.
 * - "new"              -> browse from category selection
 * - "preset-{id}"      -> preset recipe, skip to customization with modifiers pre-loaded
 * - "item-{id}"        -> direct item, skip to customization (empty modifiers)
 * - anything else      -> treat as item ID (backwards compat)
 */
function parseRouteId(id: string): { mode: 'browse' | 'preset' | 'item'; targetId?: string } {
  if (!id || id === 'new') return { mode: 'browse' };
  if (id.startsWith('preset-')) return { mode: 'preset', targetId: id.slice(7) };
  if (id.startsWith('item-')) return { mode: 'item', targetId: id.slice(5) };
  return { mode: 'item', targetId: id };
}

const DrinkBuilder: React.FC = () => {
  const history = useHistory();
  const { id: routeId } = useParams<{ id: string }>();

  let cartAvailable = false;
  let addToCart: ((item: CartItem) => void) | null = null;

  try {
    const cart = useCart();
    addToCart = cart.addItem;
    cartAvailable = true;
  } catch {
    // Cart context not available
  }

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
  const [initialized, setInitialized] = useState(false);

  const [openGroup, setOpenGroup] = useState<MappedModifierGroup | null>(null);

  // Initialize state based on URL param once catalog is loaded
  useEffect(() => {
    if (initialized || !catalogData || catalogData.loading) return;

    const { mode, targetId } = parseRouteId(routeId);

    if (mode === 'browse') {
      setStep('category');
      setInitialized(true);
      return;
    }

    if (mode === 'preset' && targetId) {
      const preset = catalogData.getPresetById(targetId);
      if (preset) {
        const base = catalogData.getBaseById(preset.baseId);
        const { price } = base ? getDisplayPrice(base) : { price: preset.priceCents };

        const drinkType: DrinkType = {
          id: preset.baseId,
          name: preset.baseName,
          category: base?.category || '',
          priceCents: price,
          isHot: preset.defaultHot,
        };

        let selectedVariation: MappedVariation | undefined;
        if (preset.defaultVariationId && base?.variations) {
          selectedVariation = base.variations.find(v => v.variationId === preset.defaultVariationId);
        }
        if (!selectedVariation && base?.variations && base.variations.length > 0) {
          const defaultIndex = base.variations.length >= 3 ? 1 : 0;
          selectedVariation = base.variations[defaultIndex];
        }

        // Pre-select modifiers from the preset recipe
        const preSelectedModifiers: SelectedModifiers = {};
        if (preset.modifierIds.length > 0 && base) {
          const groups = catalogData.getModifierGroupsForItem(base);
          for (const group of groups) {
            const matched = group.modifiers.filter(m =>
              preset.modifierIds.includes(m.squareModifierId)
            );
            if (matched.length > 0) {
              preSelectedModifiers[group.id] = matched;
            }
          }
        }

        setState({
          category: base?.category,
          categoryId: base?.category?.toLowerCase().replace(/\s+/g, '_'),
          drinkType,
          item: base,
          selectedVariation,
          isHot: preset.defaultHot,
          selectedModifiers: preSelectedModifiers,
        });
        setStep('modifications');
        setInitialized(true);
        return;
      }
    }

    if (mode === 'item' && targetId) {
      const base = catalogData.getBaseById(targetId);
      if (base) {
        const { price } = getDisplayPrice(base);
        const drinkType: DrinkType = {
          id: base.squareItemId,
          name: base.name,
          category: base.category,
          priceCents: price,
          isHot: getDefaultIsHot(base.temperatures),
        };

        let selectedVariation: MappedVariation | undefined;
        if (base.variations.length > 0) {
          const defaultIndex = base.variations.length >= 3 ? 1 : 0;
          selectedVariation = base.variations[defaultIndex];
        }

        setState({
          category: base.category,
          categoryId: base.category.toLowerCase().replace(/\s+/g, '_'),
          drinkType,
          item: base,
          selectedVariation,
          isHot: drinkType.isHot,
          selectedModifiers: {},
        });
        setStep('modifications');
        setInitialized(true);
        return;
      }
    }

    // Fallback: browse mode
    setStep('category');
    setInitialized(true);
  }, [routeId, catalogData, initialized]);

  const itemModifierGroups = useMemo(() => {
    if (!state.item || !catalogData) return [];
    return catalogData.getModifierGroupsForItem(state.item);
  }, [state.item, catalogData]);

  const handleCategorySelect = (category: string, categoryId: string) => {
    setState({ ...state, category, categoryId });
    setStep("type");
  };

  const handleTypeSelect = (drinkType: DrinkType) => {
    const matchingBase = catalogData?.bases.find(b => b.squareItemId === drinkType.id);

    const newState: BuilderState = {
      ...state,
      drinkType,
      item: matchingBase,
      selectedModifiers: {},
    };

    if (matchingBase?.variations && matchingBase.variations.length > 0) {
      const defaultIndex = matchingBase.variations.length >= 3 ? 1 : 0;
      newState.selectedVariation = matchingBase.variations[defaultIndex];
    }

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
        return {
          ...prev,
          selectedModifiers: {
            ...prev.selectedModifiers,
            [groupId]: [modifier],
          },
        };
      }

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
    const { mode } = parseRouteId(routeId);
    if (mode !== 'browse') {
      history.push('/home');
      return;
    }
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
    let total = state.selectedVariation?.price || state.drinkType?.priceCents || 0;

    for (const mods of Object.values(state.selectedModifiers)) {
      for (const mod of mods) {
        total += mod.price;
      }
    }

    return total;
  };

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

  const showTemperature = useMemo(() => {
    if (!state.item) return state.drinkType?.isHot === undefined;
    const temps = state.item.temperatures || [];
    if (temps.length === 0) return false;
    const hot = temps.some(t => t.toUpperCase() === 'HOT');
    const iced = temps.some(t => t.toUpperCase() === 'ICED');
    return hot && iced;
  }, [state.item, state.drinkType]);

  const drinkVisualState = useMemo(() => ({
    drinkType: state.drinkType,
    selectedVariation: state.selectedVariation,
    isHot: state.isHot,
    selectedModifiers: [],
    totalPriceCents: calculateTotalPrice(),
  }), [state.drinkType, state.isHot, state.selectedModifiers, state.selectedVariation]);

  const { mode: entryMode } = parseRouteId(routeId);
  const progressSteps = entryMode === 'browse' ? [
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
  ] : [
    {
      key: "modifications",
      label: "Customize",
      isActive: step === "modifications",
      isCompleted: false,
    },
  ];

  const openGroupSelectedIds = useMemo(() => {
    if (!openGroup) return [];
    return (state.selectedModifiers[openGroup.id] || []).map(m => m.squareModifierId);
  }, [openGroup, state.selectedModifiers]);

  const headerTitle = step === 'modifications' && state.drinkType
    ? state.drinkType.name
    : 'Build Your Order';

  return (
    <IonPage>
      <AppHeader
        title={headerTitle}
        showBackButton={true}
        backHref="/home"
        showProgress={entryMode === 'browse'}
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
          {step === "modifications" && (
            <div className="visual-section">
              <DrinkVisual state={drinkVisualState} />
            </div>
          )}

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
