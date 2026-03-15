import React from "react";
import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonList, IonItem, IonLabel } from "@ionic/react";
import { MappedModifier, MappedModifierGroup } from "../../services/catalogService";
import "./ModifierSelector.css";

interface ModifierSelectorProps {
  isOpen: boolean;
  group: MappedModifierGroup | null;
  selectedIds: string[];
  onSelect: (modifier: MappedModifier) => void;
  onDismiss: () => void;
}

/**
 * Format cents to dollar display
 */
function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const ModifierSelector: React.FC<ModifierSelectorProps> = ({ isOpen, group, selectedIds, onSelect, onDismiss }) => {
  if (!group) return null;

  const isSingleSelect = group.selectionMode === 'single';

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss} className="modifier-modal">
      <IonHeader>
        <IonToolbar>
          <IonTitle>{group.name}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onDismiss} fill="clear">
              {isSingleSelect ? 'Close' : 'Done'}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList className="modifier-list" lines="none">
          {group.modifiers.map((modifier, index) => {
            const isSelected = selectedIds.includes(modifier.squareModifierId);
            return (
              <IonItem
                key={modifier.squareModifierId}
                button
                onClick={() => {
                  if (!isSelected || isSingleSelect) {
                    onSelect(modifier);
                    if (isSingleSelect) {
                      onDismiss();
                    }
                  }
                }}
                disabled={isSelected && !isSingleSelect}
                className={`modifier-item interactive-item ${isSelected ? "selected" : ""}`}
                style={
                  {
                    "--animation-delay": `${index * 0.05}s`,
                  } as React.CSSProperties
                }
              >
                <IonLabel>
                  <h2 className="modifier-name">{modifier.name}</h2>
                  <p className="modifier-price">
                    {modifier.price === 0 ? "Included" : `+${formatPrice(modifier.price)}`}
                  </p>
                </IonLabel>
                {isSelected && (
                  <IonLabel slot="end" color="success" className="added-label">
                    Selected
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
