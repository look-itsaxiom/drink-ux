import React from "react";
import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonList, IonItem, IonLabel } from "@ionic/react";
import { ModifierComponent, ComponentType } from "@drink-ux/shared";
import "./ModifierSelector.css";

interface ModifierSelectorProps {
  isOpen: boolean;
  title: string;
  modifiers: ModifierComponent[];
  onSelect: (modifier: ModifierComponent) => void;
  onDismiss: () => void;
  selectedIds?: string[];
}

const milkModifiers: ModifierComponent[] = [
  {
    id: "mod-milk-whole",
    name: "Whole Milk",
    type: ComponentType.MODIFIER,
    category: "milk",
    price: 0,
    canTransformDrink: false,
    visual: { color: "#fff9e6", opacity: 0.7, layerOrder: 2 },
    available: true,
  },
  {
    id: "mod-milk-oat",
    name: "Oat Milk",
    type: ComponentType.MODIFIER,
    category: "milk",
    price: 0.75,
    canTransformDrink: false,
    visual: { color: "#f5deb3", opacity: 0.6, layerOrder: 2 },
    available: true,
  },
  {
    id: "mod-milk-almond",
    name: "Almond Milk",
    type: ComponentType.MODIFIER,
    category: "milk",
    price: 0.75,
    canTransformDrink: false,
    visual: { color: "#f0e68c", opacity: 0.6, layerOrder: 2 },
    available: true,
  },
  {
    id: "mod-milk-soy",
    name: "Soy Milk",
    type: ComponentType.MODIFIER,
    category: "milk",
    price: 0.75,
    canTransformDrink: false,
    visual: { color: "#f5f5dc", opacity: 0.6, layerOrder: 2 },
    available: true,
  },
];

const syrupModifiers: ModifierComponent[] = [
  {
    id: "mod-vanilla",
    name: "Vanilla Syrup",
    type: ComponentType.MODIFIER,
    category: "syrup",
    price: 0.5,
    canTransformDrink: false,
    visual: { color: "#fff8dc", opacity: 0.4, layerOrder: 3 },
    available: true,
  },
  {
    id: "mod-caramel",
    name: "Caramel Syrup",
    type: ComponentType.MODIFIER,
    category: "syrup",
    price: 0.5,
    canTransformDrink: false,
    visual: { color: "#d2691e", opacity: 0.4, layerOrder: 3 },
    available: true,
  },
  {
    id: "mod-hazelnut",
    name: "Hazelnut Syrup",
    type: ComponentType.MODIFIER,
    category: "syrup",
    price: 0.5,
    canTransformDrink: false,
    visual: { color: "#c19a6b", opacity: 0.4, layerOrder: 3 },
    available: true,
  },
  {
    id: "mod-mocha",
    name: "Mocha Syrup",
    type: ComponentType.MODIFIER,
    category: "syrup",
    price: 0.5,
    canTransformDrink: false,
    visual: { color: "#8b4513", opacity: 0.4, layerOrder: 3 },
    available: true,
  },
];

const toppingModifiers: ModifierComponent[] = [
  {
    id: "mod-whip",
    name: "Whipped Cream",
    type: ComponentType.MODIFIER,
    category: "topping",
    price: 0.5,
    canTransformDrink: false,
    visual: { color: "#fffaf0", opacity: 0.9, layerOrder: 4 },
    available: true,
  },
  {
    id: "mod-cinnamon",
    name: "Cinnamon Powder",
    type: ComponentType.MODIFIER,
    category: "topping",
    price: 0,
    canTransformDrink: false,
    visual: { color: "#8b4513", opacity: 0.5, layerOrder: 4 },
    available: true,
  },
  {
    id: "mod-chocolate-drizzle",
    name: "Chocolate Drizzle",
    type: ComponentType.MODIFIER,
    category: "topping",
    price: 0.5,
    canTransformDrink: false,
    visual: { color: "#3e2723", opacity: 0.8, layerOrder: 4 },
    available: true,
  },
];

export { milkModifiers, syrupModifiers, toppingModifiers };

const ModifierSelector: React.FC<ModifierSelectorProps> = ({ isOpen, title, modifiers, onSelect, onDismiss, selectedIds = [] }) => {
  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss} className="modifier-modal">
      <IonHeader>
        <IonToolbar>
          <IonTitle>{title}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onDismiss} fill="clear">
              Close
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList className="modifier-list" lines="none">
          {modifiers.map((modifier, index) => {
            const isSelected = selectedIds.includes(modifier.id);
            return (
              <IonItem
                key={modifier.id}
                button
                onClick={() => {
                  if (!isSelected) {
                    onSelect(modifier);
                    onDismiss();
                  }
                }}
                disabled={isSelected}
                className={`modifier-item interactive-item ${isSelected ? "selected" : ""}`}
                style={
                  {
                    "--animation-delay": `${index * 0.05}s`,
                  } as React.CSSProperties
                }
              >
                <div slot="start" className="modifier-visual" style={{ backgroundColor: modifier.visual?.color || "#f0f0f0" }}></div>
                <IonLabel>
                  <h2 className="modifier-name">{modifier.name}</h2>
                  <p className="modifier-price">{modifier.price === 0 ? "Free" : `+$${modifier.price.toFixed(2)}`}</p>
                </IonLabel>
                {isSelected && (
                  <IonLabel slot="end" color="success" className="added-label">
                    ✓ Added
                  </IonLabel>
                )}
              </IonItem>
            );
          })}
        </IonList>
      </IonContent>
    </IonModal>
  );
};

export default ModifierSelector;
