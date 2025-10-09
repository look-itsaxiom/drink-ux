import React from 'react';
import { IonButton, IonChip, IonIcon, IonLabel } from '@ionic/react';
import { addCircleOutline, closeCircle, arrowBack } from 'ionicons/icons';
import { DrinkBuilderState, DrinkType, CupSize } from '@drink-ux/shared';

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
  { value: CupSize.SMALL, label: 'Small', priceAdd: 0 },
  { value: CupSize.MEDIUM, label: 'Medium', priceAdd: 0.5 },
  { value: CupSize.LARGE, label: 'Large', priceAdd: 1.0 },
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
    onUpdate({ syrups: state.syrups.filter(s => s.id !== syrupId) });
  };

  const handleRemoveTopping = (toppingId: string) => {
    onUpdate({ toppings: state.toppings.filter(t => t.id !== toppingId) });
  };

  return (
    <div className="modification-panel">
      <div className="selector-header">
        <IonIcon icon={arrowBack} className="back-icon" onClick={onBack} />
        <h2 className="selector-title">Customize your {drinkType.name}</h2>
      </div>

      <div className="modifications-scroll">
        {/* Cup Size */}
        <div className="mod-section">
          <h4>Cup Size</h4>
          <div className="size-buttons">
            {cupSizes.map((size) => (
              <IonButton
                key={size.value}
                size="small"
                fill={state.cupSize === size.value ? 'solid' : 'outline'}
                onClick={() => onUpdate({ cupSize: size.value })}
              >
                {size.label}
              </IonButton>
            ))}
          </div>
        </div>

        {/* Temperature (if applicable) */}
        {canSelectTemperature && (
          <div className="mod-section">
            <h4>Temperature</h4>
            <div className="temp-buttons">
              <IonButton
                size="small"
                fill={state.isHot === true ? 'solid' : 'outline'}
                onClick={() => onUpdate({ isHot: true })}
              >
                Hot
              </IonButton>
              <IonButton
                size="small"
                fill={state.isHot === false ? 'solid' : 'outline'}
                onClick={() => onUpdate({ isHot: false })}
              >
                Iced
              </IonButton>
            </div>
          </div>
        )}

        {/* Milk */}
        <div className="mod-section">
          <h4>Milk</h4>
          <div className="mod-chips">
            {state.milk && (
              <IonChip color="secondary">
                <IonLabel>{state.milk.name}</IonLabel>
                <IonIcon icon={closeCircle} onClick={handleRemoveMilk} />
              </IonChip>
            )}
            <IonButton size="small" fill="outline" onClick={onShowMilkSelector}>
              <IonIcon slot="start" icon={addCircleOutline} />
              {state.milk ? 'Change' : 'Add'} Milk
            </IonButton>
          </div>
        </div>

        {/* Syrups */}
        <div className="mod-section">
          <h4>Syrups</h4>
          <div className="mod-chips">
            {state.syrups.map((syrup) => (
              <IonChip key={syrup.id} color="secondary">
                <IonLabel>{syrup.name}</IonLabel>
                <IonIcon icon={closeCircle} onClick={() => handleRemoveSyrup(syrup.id)} />
              </IonChip>
            ))}
            <IonButton size="small" fill="outline" onClick={onShowSyrupSelector}>
              <IonIcon slot="start" icon={addCircleOutline} />
              Add Syrup
            </IonButton>
          </div>
        </div>

        {/* Toppings */}
        <div className="mod-section">
          <h4>Toppings</h4>
          <div className="mod-chips">
            {state.toppings.map((topping) => (
              <IonChip key={topping.id} color="secondary">
                <IonLabel>{topping.name}</IonLabel>
                <IonIcon icon={closeCircle} onClick={() => handleRemoveTopping(topping.id)} />
              </IonChip>
            ))}
            <IonButton size="small" fill="outline" onClick={onShowToppingSelector}>
              <IonIcon slot="start" icon={addCircleOutline} />
              Add Topping
            </IonButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModificationPanel;
