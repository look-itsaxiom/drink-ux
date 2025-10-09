import React from 'react';
import { DrinkBuilderState, CupSize } from '@drink-ux/shared';

interface DrinkVisualProps {
  state: DrinkBuilderState;
}

const DrinkVisual: React.FC<DrinkVisualProps> = ({ state }) => {
  const getCupHeight = () => {
    switch (state.cupSize) {
      case CupSize.SMALL: return 160;
      case CupSize.MEDIUM: return 200;
      case CupSize.LARGE: return 240;
      default: return 200;
    }
  };

  const cupHeight = getCupHeight();
  const hasContent = state.drinkType !== undefined;

  const generateDrinkName = (): string => {
    if (!state.drinkType) return '';

    const parts: string[] = [];
    
    // Size
    if (state.cupSize) {
      parts.push(state.cupSize.charAt(0).toUpperCase() + state.cupSize.slice(1));
    }

    // Temperature
    if (state.isHot === false) {
      parts.push('Iced');
    }

    // Syrup flavor
    if (state.syrups.length > 0) {
      parts.push(state.syrups[0].name.replace(' Syrup', ''));
    }

    // Milk type
    if (state.milk && state.milk.name !== 'Whole Milk') {
      parts.push(state.milk.name.replace(' Milk', ''));
    }

    // Drink type
    parts.push(state.drinkType.name);

    return parts.join(' ');
  };

  return (
    <div className="drink-visual">
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

        {/* Drink fill */}
        {hasContent && (
          <path
            d={`M 60 ${cupHeight * 0.3} L 60 ${cupHeight} Q 100 ${cupHeight + 10} 140 ${cupHeight} L 140 ${cupHeight * 0.3} Q 100 ${cupHeight * 0.3 - 5} 60 ${cupHeight * 0.3} Z`}
            fill={state.isHot === false ? '#8b4513' : '#3e2723'}
            opacity="0.8"
          />
        )}

        {/* Milk layer */}
        {state.milk && (
          <path
            d={`M 60 ${cupHeight * 0.15} L 60 ${cupHeight * 0.35} Q 100 ${cupHeight * 0.35 - 5} 140 ${cupHeight * 0.35} L 140 ${cupHeight * 0.15} Q 100 ${cupHeight * 0.15 - 5} 60 ${cupHeight * 0.15} Z`}
            fill="#fff9e6"
            opacity="0.7"
          />
        )}

        {/* Lid */}
        <ellipse cx="100" cy="40" rx="50" ry="8" fill="#f5f5f5" stroke="#d0d0d0" strokeWidth="2" />
        {state.cupSize === CupSize.LARGE && (
          <path d="M 50 40 Q 100 20 150 40" fill="#f5f5f5" stroke="#d0d0d0" strokeWidth="2" />
        )}
      </svg>

      {!hasContent && (
        <div className="empty-cup-hint">
          <p>Select a drink to get started!</p>
        </div>
      )}

      {hasContent && (
        <div className="cup-info">
          <h3>{state.cupSize ? `${state.cupSize.charAt(0).toUpperCase() + state.cupSize.slice(1)} Cup` : 'Cup'}</h3>
          <p className="drink-name">{generateDrinkName()}</p>
        </div>
      )}
    </div>
  );
};

export default DrinkVisual;
