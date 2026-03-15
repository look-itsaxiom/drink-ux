import React from "react";
import {
  IonButton,
  IonChip,
  IonIcon,
  IonLabel,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonNote,
} from "@ionic/react";
import { addCircleOutline, closeCircle, radioButtonOn, radioButtonOff, checkboxOutline, squareOutline } from "ionicons/icons";
import { MappedVariation, MappedModifierGroup, MappedModifier } from "../../services/catalogService";
import "./ModificationPanel.css";

/**
 * Selected modifiers organized by group ID
 */
export interface SelectedModifiers {
  [groupId: string]: MappedModifier[];
}

interface ModificationPanelProps {
  /** Item name for display */
  itemName: string;
  /** Available variations (sizes) for this item */
  variations: MappedVariation[];
  /** Currently selected variation */
  selectedVariation?: MappedVariation;
  /** Whether temperature selection is available */
  showTemperature: boolean;
  /** Current temperature selection */
  isHot?: boolean;
  /** Modifier groups applicable to this item */
  modifierGroups: MappedModifierGroup[];
  /** Currently selected modifiers by group */
  selectedModifiers: SelectedModifiers;
  /** Callbacks */
  onSelectVariation: (variation: MappedVariation) => void;
  onSelectTemperature: (isHot: boolean) => void;
  onOpenModifierGroup: (group: MappedModifierGroup) => void;
  onRemoveModifier: (groupId: string, modifierId: string) => void;
}

/**
 * Format cents to dollar display
 */
function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Get selection hint text for a modifier group
 */
function getSelectionHint(group: MappedModifierGroup): string {
  if (group.selectionMode === 'single') {
    return group.minSelections > 0 ? 'Required — pick 1' : 'Pick 1';
  }
  if (group.minSelections > 0 && group.maxSelections < group.modifiers.length) {
    return `Pick ${group.minSelections}–${group.maxSelections}`;
  }
  if (group.minSelections > 0) {
    return `Pick at least ${group.minSelections}`;
  }
  if (group.maxSelections < group.modifiers.length) {
    return `Pick up to ${group.maxSelections}`;
  }
  return 'Optional';
}

const ModificationPanel: React.FC<ModificationPanelProps> = ({
  variations,
  selectedVariation,
  showTemperature,
  isHot,
  modifierGroups,
  selectedModifiers,
  onSelectVariation,
  onSelectTemperature,
  onOpenModifierGroup,
  onRemoveModifier,
}) => {
  return (
    <div className="modification-panel">
      <div className="modifications-content">
        {/* Variations (Size picker) — only show if more than 1 variation */}
        {variations.length > 1 && (
          <IonCard className="mod-card">
            <IonCardHeader>
              <IonCardTitle>Size</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="size-buttons">
                {variations.map((variation) => {
                  const isSelected = selectedVariation?.variationId === variation.variationId;
                  return (
                    <IonButton
                      key={variation.variationId}
                      size="small"
                      fill={isSelected ? "solid" : "outline"}
                      onClick={() => onSelectVariation(variation)}
                      className="size-button"
                    >
                      {variation.name}
                      <span className="price-add">{formatPrice(variation.price)}</span>
                    </IonButton>
                  );
                })}
              </div>
            </IonCardContent>
          </IonCard>
        )}

        {/* Temperature (only if applicable) */}
        {showTemperature && (
          <IonCard className="mod-card">
            <IonCardHeader>
              <IonCardTitle>Temperature</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="temp-buttons">
                <IonButton
                  size="small"
                  fill={isHot === true ? "solid" : "outline"}
                  onClick={() => onSelectTemperature(true)}
                  className="temp-button"
                >
                  Hot
                </IonButton>
                <IonButton
                  size="small"
                  fill={isHot === false ? "solid" : "outline"}
                  onClick={() => onSelectTemperature(false)}
                  className="temp-button"
                >
                  Iced
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>
        )}

        {/* Dynamic Modifier Groups */}
        {modifierGroups.map((group) => {
          const selected = selectedModifiers[group.id] || [];
          const atMax = group.selectionMode === 'single'
            ? selected.length >= 1
            : selected.length >= group.maxSelections;

          return (
            <IonCard key={group.id} className="mod-card">
              <IonCardHeader>
                <IonCardTitle>{group.name}</IonCardTitle>
                <IonNote color="medium" className="mod-group-hint">
                  {getSelectionHint(group)}
                </IonNote>
              </IonCardHeader>
              <IonCardContent>
                <div className="mod-chips">
                  {selected.map((mod) => (
                    <IonChip key={mod.squareModifierId} color="primary" className="selected-chip">
                      <IonLabel>
                        {mod.name}
                        {mod.price > 0 && <span className="chip-price"> +{formatPrice(mod.price)}</span>}
                      </IonLabel>
                      <IonIcon
                        icon={closeCircle}
                        onClick={() => onRemoveModifier(group.id, mod.squareModifierId)}
                      />
                    </IonChip>
                  ))}
                  {!atMax && (
                    <IonButton
                      size="small"
                      fill="outline"
                      onClick={() => onOpenModifierGroup(group)}
                      className="add-button"
                    >
                      <IonIcon slot="start" icon={addCircleOutline} />
                      {selected.length > 0 && group.selectionMode === 'single' ? 'Change' : 'Add'}
                    </IonButton>
                  )}
                </div>
              </IonCardContent>
            </IonCard>
          );
        })}

        {/* Empty state — no modifier groups and single variation */}
        {modifierGroups.length === 0 && variations.length <= 1 && !showTemperature && (
          <div className="empty-customization">
            <p>No customization options for this item.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModificationPanel;
