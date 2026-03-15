import React, { useMemo } from 'react';
import LayeredCup from './LayeredCup.js';
import { DrinkLayer } from './DrinkVisualizer.js';

export interface DrinkVisualProps {
  state: {
    drinkType?: { name?: string; visualColor?: string };
    selectedVariation?: { name?: string };
    isHot?: boolean;
    [key: string]: any;
  };
}

/**
 * Map a variation name to a cup height for the visual.
 * Works with any naming convention — small/medium/large, 12oz/16oz/20oz, etc.
 */
function getCupHeight(variationName?: string): number {
  if (!variationName) return 180;
  const lower = variationName.toLowerCase();
  if (lower.includes('small') || lower.includes('8') || lower.includes('12') || lower === 's') return 150;
  if (lower.includes('large') || lower.includes('24') || lower.includes('20') || lower === 'l') return 210;
  return 180; // medium / default
}

const DrinkVisual: React.FC<DrinkVisualProps> = ({ state }) => {
  const cupHeight = getCupHeight(state.selectedVariation?.name);
  const hasContent = state.drinkType !== undefined;
  const drinkName = state.drinkType?.name || '';
  const isHot = state.isHot !== false;
  const sizeName = state.selectedVariation?.name;

  // Simple layers based on state
  const layers = useMemo((): DrinkLayer[] => {
    if (!hasContent) return [];

    const baseColor = state.drinkType?.visualColor || '#6F4E37';
    return [{
      id: 'base',
      name: 'Base',
      color: baseColor,
      opacity: 0.85,
      height: 0.7,
      order: 0,
    }];
  }, [hasContent, state.drinkType]);

  return (
    <div className="drink-visual">
      {hasContent ? (
        <LayeredCup
          layers={layers}
          cupSize={sizeName || 'medium'}
          cupHeight={cupHeight}
          hasTopping={false}
          toppingType={undefined}
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
            <path
              d={`M 55 38 L 62 ${cupHeight} Q 100 ${cupHeight + 12} 138 ${cupHeight} L 145 38 Z`}
              className="cup-outline"
            />
            <path
              d={`M 55 38 L 62 ${cupHeight} Q 100 ${cupHeight + 12} 138 ${cupHeight} L 145 38 Z`}
              fill="url(#emptyCupGrad)"
            />
            <ellipse cx="100" cy="38" rx="45" ry="8" className="cup-lid" />
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
          <h3>{sizeName ? `${sizeName} Cup` : 'Cup'}</h3>
          <p className="drink-name">{drinkName}</p>
        </div>
      )}
    </div>
  );
};

export default DrinkVisual;
