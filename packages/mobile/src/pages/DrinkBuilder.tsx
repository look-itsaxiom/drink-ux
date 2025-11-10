import React, { useState } from "react";
import { useHistory } from "react-router";
import {
  IonContent,
  IonPage,
  IonButton,
  IonFooter,
  IonToolbar,
} from "@ionic/react";
import {
  DrinkBuilderState,
  DrinkCategory,
  DrinkType,
  CupSize,
} from "@drink-ux/shared";

import AppHeader from "../components/AppHeader";
import CategorySelector from "../components/DrinkBuilder/CategorySelector";
import TypeSelector from "../components/DrinkBuilder/TypeSelector";
import ModificationPanel from "../components/DrinkBuilder/ModificationPanel";
import DrinkVisual from "../components/DrinkBuilder/DrinkVisual";
import ModifierSelector, {
  milkModifiers,
  syrupModifiers,
  toppingModifiers,
} from "../components/DrinkBuilder/ModifierSelector";

import "./DrinkBuilder.css";

type BuilderStep = "category" | "type" | "modifications";

const DrinkBuilder: React.FC = () => {
  const history = useHistory();

  const [step, setStep] = useState<BuilderStep>("category");
  const [drinkState, setDrinkState] = useState<DrinkBuilderState>({
    syrups: [],
    toppings: [],
    totalPrice: 0,
    cupSize: CupSize.MEDIUM, // Default size
  });

  const [showMilkSelector, setShowMilkSelector] = useState(false);
  const [showSyrupSelector, setShowSyrupSelector] = useState(false);
  const [showToppingSelector, setShowToppingSelector] = useState(false);

  const handleCategorySelect = (category: DrinkCategory) => {
    setDrinkState({ ...drinkState, category });
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

  const handleStateUpdate = (updates: Partial<DrinkBuilderState>) => {
    setDrinkState({ ...drinkState, ...updates });
  };

  const handleMilkSelect = (milk: any) => {
    setDrinkState({ ...drinkState, milk });
  };

  const handleSyrupSelect = (syrup: any) => {
    setDrinkState({ ...drinkState, syrups: [...drinkState.syrups, syrup] });
  };

  const handleToppingSelect = (topping: any) => {
    setDrinkState({
      ...drinkState,
      toppings: [...drinkState.toppings, topping],
    });
  };

  const handleBackFromType = () => {
    setDrinkState({ ...drinkState, category: undefined });
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

    return total.toFixed(2);
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
    console.log("Adding to cart:", drinkState);
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
              Add to Cart - ${calculateTotalPrice()}
            </IonButton>
          </IonToolbar>
        </IonFooter>
      )}
    </IonPage>
  );
};

export default DrinkBuilder;
