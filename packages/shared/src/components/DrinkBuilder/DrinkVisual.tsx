import React, { useMemo } from 'react';
import { DrinkBuilderState, CupSize } from '../../types.js';
import { DrinkVisualizer } from './DrinkVisualizer.js';
import LayeredCup from './LayeredCup.js';

export interface DrinkVisualProps {
  state: DrinkBuilderState;
}

const DrinkVisual: React.FC<DrinkVisualProps> = ({ state }) => {
  // Generate visual properties from state
  const visualProperties = useMemo(() => {
    return DrinkVisualizer.generateVisualProperties(state);
  }, [state]);

  const cupHeight = DrinkVisualizer.getCupHeight(state.cupSize);
  const hasContent = state.drinkType !== undefined;
  const drinkName = DrinkVisualizer.generateDrinkName(state);
  const isHot = state.isHot !== false; // default to hot

  return (
    <div className="drink-visual">
      {hasContent ? (
        <LayeredCup
          layers={visualProperties.layers}
          cupSize={state.cupSize || CupSize.MEDIUM}
          cupHeight={cupHeight}
          hasTopping={visualProperties.hasTopping}
          toppingType={visualProperties.toppingType}
          isHot={isHot}
        />
      ) : (
        <div className="empty-cup-container">
          <svg
            className="visual-cup empty-cup"
            viewBox={`0 0 200 ${cupHeight + 40}`}
          >
            <defs>
              <linearGradient id="emptyCupGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(0,0,0,0.03)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.08)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.03)" />
              </linearGradient>
            </defs>
            {/* Empty cup outline */}
            <path
              d={`M 55 38 L 62 ${cupHeight} Q 100 ${cupHeight + 12} 138 ${cupHeight} L 145 38 Z`}
              className="cup-outline"
            />
            <path
              d={`M 55 38 L 62 ${cupHeight} Q 100 ${cupHeight + 12} 138 ${cupHeight} L 145 38 Z`}
              fill="url(#emptyCupGrad)"
            />
            {/* Empty cup lid */}
            <ellipse cx="100" cy="38" rx="45" ry="8" className="cup-lid" />
            {/* Decorative dashed line inside cup */}
            <line x1="100" y1="70" x2="100" y2={cupHeight - 20} stroke="rgba(0,0,0,0.06)" strokeWidth="1" strokeDasharray="4 6" />
          </svg>
        </div>
      )}

      {!hasContent && (
        <div className="empty-cup-hint">
          <p>Select a drink to get started!</p>
        </div>
      )}

      {hasContent && (
        <div className="cup-info">
          <h3>{state.cupSize ? `${state.cupSize.charAt(0).toUpperCase() + state.cupSize.slice(1)} Cup` : 'Cup'}</h3>
          <p className="drink-name">{drinkName}</p>
          {visualProperties.layers.length > 1 && (
            <p className="layer-count">
              {visualProperties.layers.length} layer{visualProperties.layers.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default DrinkVisual;
