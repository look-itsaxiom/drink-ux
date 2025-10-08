import { useState } from 'react';
import { useHistory } from 'react-router';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonFooter,
  IonChip,
  IonIcon,
  IonModal,
  IonList,
  IonItem,
  IonLabel,
} from '@ionic/react';
import { addCircleOutline, closeCircle } from 'ionicons/icons';
import {
  CupSize,
  CupType,
  LidType,
  ComponentType,
  CupComponent,
  BaseComponent,
  ModifierComponent,
  DrinkBuilderState,
  IntentClarification,
} from '@drink-ux/shared';
import './DrinkBuilder.css';

// Mock data for available components
const availableCups: CupComponent[] = [
  {
    id: 'cup-small',
    name: 'Small Cup',
    type: ComponentType.CUP,
    category: 'cup',
    price: 0,
    size: CupSize.SMALL,
    cupType: CupType.PAPER,
    lidType: LidType.FLAT,
    visual: { color: '#f5f5f5', layerOrder: 0 },
    available: true,
  },
  {
    id: 'cup-medium',
    name: 'Medium Cup',
    type: ComponentType.CUP,
    category: 'cup',
    price: 0.5,
    size: CupSize.MEDIUM,
    cupType: CupType.PAPER,
    lidType: LidType.FLAT,
    visual: { color: '#f5f5f5', layerOrder: 0 },
    available: true,
  },
  {
    id: 'cup-large',
    name: 'Large Cup',
    type: ComponentType.CUP,
    category: 'cup',
    price: 1.0,
    size: CupSize.LARGE,
    cupType: CupType.PAPER,
    lidType: LidType.DOME,
    visual: { color: '#f5f5f5', layerOrder: 0 },
    available: true,
  },
];

const availableBases: BaseComponent[] = [
  {
    id: 'base-espresso',
    name: 'Espresso',
    type: ComponentType.BASE,
    category: 'espresso',
    price: 3.5,
    isHot: true,
    visual: { color: '#3e2723', opacity: 0.9, layerOrder: 1 },
    available: true,
  },
  {
    id: 'base-coldbrew',
    name: 'Cold Brew',
    type: ComponentType.BASE,
    category: 'coffee',
    price: 4.0,
    isHot: false,
    visual: { color: '#4e342e', opacity: 0.8, layerOrder: 1 },
    available: true,
  },
  {
    id: 'base-tea',
    name: 'Green Tea',
    type: ComponentType.BASE,
    category: 'tea',
    price: 3.0,
    isHot: true,
    visual: { color: '#558b2f', opacity: 0.6, layerOrder: 1 },
    available: true,
  },
];

const availableModifiers: ModifierComponent[] = [
  {
    id: 'mod-milk-whole',
    name: 'Whole Milk',
    type: ComponentType.MODIFIER,
    category: 'milk',
    price: 0,
    canTransformDrink: false,
    visual: { color: '#fff9e6', opacity: 0.7, layerOrder: 2 },
    available: true,
  },
  {
    id: 'mod-milk-oat',
    name: 'Oat Milk',
    type: ComponentType.MODIFIER,
    category: 'milk',
    price: 0.75,
    canTransformDrink: false,
    visual: { color: '#f5deb3', opacity: 0.6, layerOrder: 2 },
    available: true,
  },
  {
    id: 'mod-milk-almond',
    name: 'Almond Milk',
    type: ComponentType.MODIFIER,
    category: 'milk',
    price: 0.75,
    canTransformDrink: false,
    visual: { color: '#f0e68c', opacity: 0.6, layerOrder: 2 },
    available: true,
  },
  {
    id: 'mod-ice',
    name: 'Ice',
    type: ComponentType.MODIFIER,
    category: 'ice',
    price: 0,
    canTransformDrink: true,
    visual: { color: '#e3f2fd', opacity: 0.5, layerOrder: 3 },
    available: true,
  },
  {
    id: 'mod-vanilla',
    name: 'Vanilla Syrup',
    type: ComponentType.MODIFIER,
    category: 'syrup',
    price: 0.5,
    canTransformDrink: false,
    visual: { color: '#fff8dc', opacity: 0.4, layerOrder: 3 },
    available: true,
  },
  {
    id: 'mod-caramel',
    name: 'Caramel Syrup',
    type: ComponentType.MODIFIER,
    category: 'syrup',
    price: 0.5,
    canTransformDrink: false,
    visual: { color: '#d2691e', opacity: 0.4, layerOrder: 3 },
    available: true,
  },
  {
    id: 'mod-whip',
    name: 'Whipped Cream',
    type: ComponentType.MODIFIER,
    category: 'topping',
    price: 0.5,
    canTransformDrink: false,
    visual: { color: '#fffaf0', opacity: 0.9, layerOrder: 4 },
    available: true,
  },
];

const DrinkBuilder: React.FC = () => {
  const history = useHistory();
  
  const [drinkState, setDrinkState] = useState<DrinkBuilderState>({
    cup: availableCups[1], // Start with medium cup
    modifiers: [],
    totalPrice: availableCups[1].price,
  });
  
  const [showCupSelector, setShowCupSelector] = useState(false);
  const [showBaseSelector, setShowBaseSelector] = useState(false);
  const [showModifierSelector, setShowModifierSelector] = useState(false);
  const [showIntentModal, setShowIntentModal] = useState(false);

  const calculateTotalPrice = () => {
    let total = drinkState.cup?.price || 0;
    total += drinkState.base?.price || 0;
    drinkState.modifiers.forEach(mod => {
      total += mod.price;
    });
    return total.toFixed(2);
  };

  const handleCupSelect = (cup: CupComponent) => {
    setDrinkState({
      ...drinkState,
      cup,
      totalPrice: drinkState.totalPrice - (drinkState.cup?.price || 0) + cup.price,
    });
    setShowCupSelector(false);
  };

  const handleBaseSelect = (base: BaseComponent) => {
    setDrinkState({
      ...drinkState,
      base,
      totalPrice: drinkState.totalPrice - (drinkState.base?.price || 0) + base.price,
    });
    setShowBaseSelector(false);
  };

  const handleModifierAdd = (modifier: ModifierComponent) => {
    // Check for intent clarification needed
    if (modifier.id === 'mod-ice' && drinkState.base?.isHot) {
      const clarification: IntentClarification = {
        componentId: modifier.id,
        prompt: 'Adding ice to a hot drink. What would you like?',
        options: [
          {
            id: 'light-ice',
            label: 'Light ice to cool it down',
            resultingComponents: ['mod-ice-light'],
          },
          {
            id: 'iced-drink',
            label: 'Make this an iced drink',
            resultingComponents: ['mod-ice-full', 'base-iced'],
          },
        ],
      };
      setDrinkState({ ...drinkState, clarificationNeeded: clarification });
      setShowIntentModal(true);
      setShowModifierSelector(false);
      return;
    }

    setDrinkState({
      ...drinkState,
      modifiers: [...drinkState.modifiers, modifier],
      totalPrice: drinkState.totalPrice + modifier.price,
    });
    setShowModifierSelector(false);
  };

  const handleModifierRemove = (modifierId: string) => {
    const modifier = drinkState.modifiers.find(m => m.id === modifierId);
    if (modifier) {
      setDrinkState({
        ...drinkState,
        modifiers: drinkState.modifiers.filter(m => m.id !== modifierId),
        totalPrice: drinkState.totalPrice - modifier.price,
      });
    }
  };

  const handleIntentChoice = (optionId: string) => {
    // In a real app, this would apply the chosen transformation
    console.log('User chose intent option:', optionId);
    setShowIntentModal(false);
    setDrinkState({ ...drinkState, clarificationNeeded: undefined });
  };

  const handleAddToCart = () => {
    console.log('Adding to cart:', drinkState);
    history.push('/cart');
  };

  const getCupHeight = () => {
    if (!drinkState.cup) return 200;
    switch (drinkState.cup.size) {
      case CupSize.SMALL: return 160;
      case CupSize.MEDIUM: return 200;
      case CupSize.LARGE: return 240;
      default: return 200;
    }
  };

  const renderVisualCup = () => {
    const cupHeight = getCupHeight();
    const components = [drinkState.base, ...drinkState.modifiers].filter(Boolean);
    
    return (
      <div className="visual-cup-container">
        <svg 
          className="visual-cup" 
          viewBox={`0 0 200 ${cupHeight + 40}`}
          style={{ width: '100%', maxWidth: '300px', height: 'auto' }}
        >
          {/* Cup outline */}
          <path
            d={`M 50 40 L 60 ${cupHeight} Q 100 ${cupHeight + 10} 140 ${cupHeight} L 150 40 Z`}
            fill="#ffffff"
            stroke="#d0d0d0"
            strokeWidth="2"
          />
          
          {/* Drink layers */}
          {components.map((component, index) => {
            if (!component) return null;
            const fillHeight = (cupHeight - 40) * (0.6 / components.length) * (index + 1);
            const y = cupHeight - fillHeight;
            
            return (
              <path
                key={component.id}
                d={`M 60 ${y} L 60 ${cupHeight} Q 100 ${cupHeight + 10} 140 ${cupHeight} L 140 ${y} Q 100 ${y - 5} 60 ${y} Z`}
                fill={component.visual.color}
                opacity={component.visual.opacity || 1}
              />
            );
          })}

          {/* Cup lid */}
          {drinkState.cup?.lidType !== LidType.NONE && (
            <>
              <ellipse cx="100" cy="40" rx="50" ry="8" fill="#f5f5f5" stroke="#d0d0d0" strokeWidth="2" />
              {drinkState.cup?.lidType === LidType.DOME && (
                <path d="M 50 40 Q 100 20 150 40" fill="#f5f5f5" stroke="#d0d0d0" strokeWidth="2" />
              )}
            </>
          )}
        </svg>
        
        {!drinkState.base && (
          <div className="empty-cup-hint">
            <p>Start by selecting a base drink!</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>Build Your Drink</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent fullscreen className="drink-builder">
        <div className="builder-container">
          {/* Visual Cup Display */}
          <div className="visual-section">
            {renderVisualCup()}
            
            <div className="cup-info">
              <h3>{drinkState.cup?.name || 'Select a cup'}</h3>
              {drinkState.base && <p className="base-name">{drinkState.base.name}</p>}
            </div>
          </div>

          {/* Component Selection */}
          <div className="components-section">
            <div className="component-category">
              <h4>Cup Size</h4>
              <IonButton 
                size="small" 
                fill="outline" 
                onClick={() => setShowCupSelector(true)}
              >
                {drinkState.cup?.name || 'Choose Cup'}
              </IonButton>
            </div>

            <div className="component-category">
              <h4>Base Drink</h4>
              {drinkState.base ? (
                <IonChip color="primary">
                  <IonLabel>{drinkState.base.name}</IonLabel>
                  <IonIcon 
                    icon={closeCircle} 
                    onClick={() => setDrinkState({ ...drinkState, base: undefined, totalPrice: drinkState.totalPrice - (drinkState.base?.price || 0) })} 
                  />
                </IonChip>
              ) : (
                <IonButton 
                  size="small" 
                  fill="solid"
                  color="primary"
                  onClick={() => setShowBaseSelector(true)}
                >
                  <IonIcon slot="start" icon={addCircleOutline} />
                  Select Base
                </IonButton>
              )}
            </div>

            <div className="component-category">
              <h4>Customize</h4>
              <div className="modifiers-chips">
                {drinkState.modifiers.map(modifier => (
                  <IonChip key={modifier.id} color="secondary">
                    <IonLabel>{modifier.name}</IonLabel>
                    <IonIcon 
                      icon={closeCircle} 
                      onClick={() => handleModifierRemove(modifier.id)} 
                    />
                  </IonChip>
                ))}
                <IonButton 
                  size="small" 
                  fill="outline"
                  onClick={() => setShowModifierSelector(true)}
                >
                  <IonIcon slot="start" icon={addCircleOutline} />
                  Add More
                </IonButton>
              </div>
            </div>
          </div>
        </div>

        {/* Cup Selector Modal */}
        <IonModal isOpen={showCupSelector} onDidDismiss={() => setShowCupSelector(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Select Cup Size</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowCupSelector(false)}>Close</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <IonList>
              {availableCups.map(cup => (
                <IonItem key={cup.id} button onClick={() => handleCupSelect(cup)}>
                  <IonLabel>
                    <h2>{cup.name}</h2>
                    <p>{cup.size} - ${cup.price.toFixed(2)}</p>
                  </IonLabel>
                </IonItem>
              ))}
            </IonList>
          </IonContent>
        </IonModal>

        {/* Base Selector Modal */}
        <IonModal isOpen={showBaseSelector} onDidDismiss={() => setShowBaseSelector(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Select Base Drink</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowBaseSelector(false)}>Close</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <IonList>
              {availableBases.map(base => (
                <IonItem key={base.id} button onClick={() => handleBaseSelect(base)}>
                  <IonLabel>
                    <h2>{base.name}</h2>
                    <p>{base.category} - ${base.price.toFixed(2)} ({base.isHot ? 'Hot' : 'Cold'})</p>
                  </IonLabel>
                </IonItem>
              ))}
            </IonList>
          </IonContent>
        </IonModal>

        {/* Modifier Selector Modal */}
        <IonModal isOpen={showModifierSelector} onDidDismiss={() => setShowModifierSelector(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Add Customizations</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModifierSelector(false)}>Close</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <IonList>
              {availableModifiers.map(modifier => {
                const alreadyAdded = drinkState.modifiers.some(m => m.id === modifier.id);
                return (
                  <IonItem 
                    key={modifier.id} 
                    button 
                    onClick={() => !alreadyAdded && handleModifierAdd(modifier)}
                    disabled={alreadyAdded}
                  >
                    <IonLabel>
                      <h2>{modifier.name}</h2>
                      <p>{modifier.category} - ${modifier.price.toFixed(2)}</p>
                    </IonLabel>
                    {alreadyAdded && <IonLabel slot="end" color="medium">Added</IonLabel>}
                  </IonItem>
                );
              })}
            </IonList>
          </IonContent>
        </IonModal>

        {/* Intent Clarification Modal */}
        <IonModal isOpen={showIntentModal} onDidDismiss={() => setShowIntentModal(false)}>
          <IonHeader>
            <IonToolbar color="warning">
              <IonTitle>Choose Option</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            {drinkState.clarificationNeeded && (
              <div className="intent-clarification">
                <p className="intent-prompt">{drinkState.clarificationNeeded.prompt}</p>
                <IonList>
                  {drinkState.clarificationNeeded.options.map(option => (
                    <IonItem 
                      key={option.id} 
                      button 
                      onClick={() => handleIntentChoice(option.id)}
                    >
                      <IonLabel>{option.label}</IonLabel>
                    </IonItem>
                  ))}
                </IonList>
              </div>
            )}
          </IonContent>
        </IonModal>
      </IonContent>

      <IonFooter>
        <IonToolbar>
          <IonButton 
            expand="block" 
            onClick={handleAddToCart}
            disabled={!drinkState.base}
          >
            Add to Cart - ${calculateTotalPrice()}
          </IonButton>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default DrinkBuilder;
