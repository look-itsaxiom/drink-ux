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
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent,
} from "@ionic/react";
import { addCircleOutline, closeCircle, arrowBack } from "ionicons/icons";
import { DrinkBuilderState, DrinkType, CupSize } from "@drink-ux/shared";
import "./ModificationPanel.css";

interface ModificationPanelProps {
  drinkType: DrinkType;
  state: DrinkBuilderState;
  onUpdate: (state: Partial<DrinkBuilderState>) => void;
  onBack: () => void;
  onShowMilkSelector: () => void;
  onShowSyrupSelector: () => void;
  onShowToppingSelector: () => void;
}

const cupSizes = [
  { value: CupSize.SMALL, label: "Small", priceAdd: 0 },
  { value: CupSize.MEDIUM, label: "Medium", priceAdd: 0.5 },
  { value: CupSize.LARGE, label: "Large", priceAdd: 1.0 },
];

const ModificationPanel: React.FC<ModificationPanelProps> = ({
  drinkType,
  state,
  onUpdate,
  onBack,
  onShowMilkSelector,
  onShowSyrupSelector,
  onShowToppingSelector,
}) => {
  const canSelectTemperature = drinkType.isHot === undefined;

  const handleRemoveMilk = () => {
    onUpdate({ milk: undefined });
  };

  const handleRemoveSyrup = (syrupId: string) => {
    onUpdate({ syrups: state.syrups.filter((s) => s.id !== syrupId) });
  };

  const handleRemoveTopping = (toppingId: string) => {
    onUpdate({ toppings: state.toppings.filter((t) => t.id !== toppingId) });
  };

  return (
    <div className="modification-panel">
      <IonHeader className="mod-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton fill="clear" onClick={onBack}>
              <IonIcon icon={arrowBack} />
            </IonButton>
          </IonButtons>
          <IonTitle>Customize your {drinkType.name}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="modifications-content">
        {/* Cup Size */}
        <IonCard className="mod-card">
          <IonCardHeader>
            <IonCardTitle>Cup Size</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div className="size-buttons">
              {cupSizes.map((size) => (
                <IonButton
                  key={size.value}
                  size="small"
                  fill={state.cupSize === size.value ? "solid" : "outline"}
                  onClick={() => onUpdate({ cupSize: size.value })}
                  className="size-button"
                >
                  {size.label}
                  {size.priceAdd > 0 && <span className="price-add">+${size.priceAdd}</span>}
                </IonButton>
              ))}
            </div>
          </IonCardContent>
        </IonCard>

        {/* Temperature (if applicable) */}
        {canSelectTemperature && (
          <IonCard className="mod-card">
            <IonCardHeader>
              <IonCardTitle>Temperature</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="temp-buttons">
                <IonButton size="small" fill={state.isHot === true ? "solid" : "outline"} onClick={() => onUpdate({ isHot: true })} className="temp-button">
                  Hot
                </IonButton>
                <IonButton size="small" fill={state.isHot === false ? "solid" : "outline"} onClick={() => onUpdate({ isHot: false })} className="temp-button">
                  Iced
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>
        )}

        {/* Milk */}
        <IonCard className="mod-card">
          <IonCardHeader>
            <IonCardTitle>Milk</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div className="mod-chips">
              {state.milk && (
                <IonChip color="primary" className="selected-chip">
                  <IonLabel>{state.milk.name}</IonLabel>
                  <IonIcon icon={closeCircle} onClick={handleRemoveMilk} />
                </IonChip>
              )}
              <IonButton size="small" fill="outline" onClick={onShowMilkSelector} className="add-button">
                <IonIcon slot="start" icon={addCircleOutline} />
                {state.milk ? "Change" : "Add"} Milk
              </IonButton>
            </div>
          </IonCardContent>
        </IonCard>

        {/* Syrups */}
        <IonCard className="mod-card">
          <IonCardHeader>
            <IonCardTitle>Syrups</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div className="mod-chips">
              {state.syrups.map((syrup) => (
                <IonChip key={syrup.id} color="secondary" className="selected-chip">
                  <IonLabel>{syrup.name}</IonLabel>
                  <IonIcon icon={closeCircle} onClick={() => handleRemoveSyrup(syrup.id)} />
                </IonChip>
              ))}
              <IonButton size="small" fill="outline" onClick={onShowSyrupSelector} className="add-button">
                <IonIcon slot="start" icon={addCircleOutline} />
                Add Syrup
              </IonButton>
            </div>
          </IonCardContent>
        </IonCard>

        {/* Toppings */}
        <IonCard className="mod-card">
          <IonCardHeader>
            <IonCardTitle>Toppings</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div className="mod-chips">
              {state.toppings.map((topping) => (
                <IonChip key={topping.id} color="tertiary" className="selected-chip">
                  <IonLabel>{topping.name}</IonLabel>
                  <IonIcon icon={closeCircle} onClick={() => handleRemoveTopping(topping.id)} />
                </IonChip>
              ))}
              <IonButton size="small" fill="outline" onClick={onShowToppingSelector} className="add-button">
                <IonIcon slot="start" icon={addCircleOutline} />
                Add Topping
              </IonButton>
            </div>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </div>
  );
};

export default ModificationPanel;
