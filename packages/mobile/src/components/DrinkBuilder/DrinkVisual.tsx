import React, { useMemo } from 'react';
import { DrinkBuilderState } from '@drink-ux/shared';
import { DrinkVisualizer } from './DrinkVisualizer';
import LayeredCup from './LayeredCup';
import './DrinkVisual.css';

interface DrinkVisualProps {
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

  return (
    <div className="drink-visual">
      {hasContent ? (
        <LayeredCup
          layers={visualProperties.layers}
          cupSize={state.cupSize!}
          cupHeight={cupHeight}
          hasTopping={visualProperties.hasTopping}
          toppingType={visualProperties.toppingType}
        />
      ) : (
        <svg
          className="visual-cup"
          viewBox={`0 0 200 ${cupHeight + 40}`}
        >
          {/* Empty cup outline */}
          <path
            d={`M 50 40 L 60 ${cupHeight} Q 100 ${cupHeight + 10} 140 ${cupHeight} L 150 40 Z`}
            className="cup-outline"
          />
          {/* Empty cup lid */}
          <ellipse cx="100" cy="40" rx="50" ry="8" className="cup-lid" />
        </svg>
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
