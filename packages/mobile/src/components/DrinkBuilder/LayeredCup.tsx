import React, { useEffect, useState } from 'react';
import { CupSize } from '@drink-ux/shared';
import { DrinkLayer, TOPPING_PROPERTIES } from './DrinkVisualizer';

interface LayeredCupProps {
  layers: DrinkLayer[];
  cupSize: CupSize;
  cupHeight: number;
  hasTopping: boolean;
  toppingType?: string;
  className?: string;
}

const LayeredCup: React.FC<LayeredCupProps> = ({
  layers,
  cupSize,
  cupHeight,
  hasTopping,
  toppingType,
  className = 'visual-cup'
}) => {
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Reset animation when layers change
    setVisibleLayers(new Set());
    if (layers.length === 0) return;

    // CSS-only staggering: show all layers immediately and rely on per-layer animation-delay
    // This avoids multiple renders/timeouts and plays smoother on low-end devices.
    const ids = new Set(layers.map(l => l.id));
    setVisibleLayers(ids);
  }, [layers]);

  const calculateLayerPath = (layer: DrinkLayer, isVisible: boolean): string => {
    if (!isVisible) return '';

    // Define the usable vertical space of the cup's liquid area
    const cupTopY = 40; // lid ellipse Y
    const liquidTopPadding = 10; // visual padding below lid
    const liquidTopY = cupTopY + liquidTopPadding; // start of liquid area
    const liquidBottomY = cupHeight; // bottom of cup
    const totalHeight = Math.max(0, liquidBottomY - liquidTopY);

    // Sum the heights of layers below this one (bottom-most have lowest order)
    const heightBelow = layers
      .filter((l) => l.order < layer.order)
      .reduce((sum, l) => sum + l.height, 0);

    // Pixel heights
    const layerHeightPx = totalHeight * layer.height;
    const bottomY = liquidBottomY - totalHeight * heightBelow;
    const topY = Math.max(liquidTopY, bottomY - layerHeightPx);

    // Cup shape calculations (simple trapezoid approximation)
    const topWidth = 90; // Width near the top of liquid
    const bottomWidth = 80; // Width near the bottom
    const leftX = 100 - topWidth / 2;
    const rightX = 100 + topWidth / 2;
    const leftBottomX = 100 - bottomWidth / 2;
    const rightBottomX = 100 + bottomWidth / 2;

    // Create path for the layer
    return `M ${leftX} ${topY}
            L ${leftBottomX} ${bottomY}
            Q 100 ${bottomY + 10} ${rightBottomX} ${bottomY}
            L ${rightX} ${topY}
            Q 100 ${topY + 5} ${leftX} ${topY} Z`;
  };

  const getToppingElements = () => {
    if (!hasTopping || !toppingType) return null;

    const toppingProps = TOPPING_PROPERTIES[toppingType as keyof typeof TOPPING_PROPERTIES] || 
                        TOPPING_PROPERTIES.default;

    const elements = [];

    // Estimate current liquid surface Y by summing heights of non-topping layers
    const cupTopY = 40;
    const liquidTopPadding = 10;
    const liquidTopY = cupTopY + liquidTopPadding;
    const liquidBottomY = cupHeight;
    const totalHeight = Math.max(0, liquidBottomY - liquidTopY);

    const filledPortion = layers
      .filter(l => l.animationType !== 'foam' && l.animationType !== 'sparkle')
      .reduce((sum, l) => sum + l.height, 0);

    const surfaceY = Math.max(liquidTopY, liquidBottomY - totalHeight * filledPortion);
    
    if (toppingProps.type === 'foam') {
      // Create foam bubbles
      for (let i = 0; i < 8; i++) {
        const x = 70 + Math.random() * 60;
        const y = surfaceY - 8 - Math.random() * 6; // hover around surface
        const radius = 2 + Math.random() * 3;
        
        elements.push(
          <circle
            key={`bubble-${i}`}
            cx={x}
            cy={y}
            r={radius}
            fill={toppingProps.color}
            opacity="0.7"
            className="foam-bubble"
            style={{
              animationDelay: `${i * 100}ms`
            }}
          />
        );
      }
    } else if (toppingProps.type === 'sprinkle') {
      // Create sprinkles
      for (let i = 0; i < 12; i++) {
        const x = 75 + Math.random() * 50;
        const y = surfaceY - 10 - Math.random() * 10;
        const rotation = Math.random() * 360;
        
        elements.push(
          <rect
            key={`sprinkle-${i}`}
            x={x}
            y={y}
            width="1"
            height="4"
            fill={toppingProps.color}
            opacity="0.8"
            className="sprinkle"
            transform={`rotate(${rotation} ${x} ${y})`}
            style={{
              animationDelay: `${i * 50}ms`
            }}
          />
        );
      }
    } else if (toppingProps.type === 'dust') {
      // Create powder dust effect
      for (let i = 0; i < 20; i++) {
        const x = 70 + Math.random() * 60;
        const y = surfaceY - 12 - Math.random() * 12;
        const size = 0.5 + Math.random() * 1;
        
        elements.push(
          <circle
            key={`dust-${i}`}
            cx={x}
            cy={y}
            r={size}
            fill={toppingProps.color}
            opacity="0.6"
            className="dust-particle"
            style={{
              animationDelay: `${i * 30}ms`
            }}
          />
        );
      }
    }

    return elements;
  };

  return (
    <svg
      className={className}
      viewBox={`0 0 200 ${cupHeight + 40}`}
    >
      {/* Cup outline */}
      <path
        d={`M 50 40 L 60 ${cupHeight} Q 100 ${cupHeight + 10} 140 ${cupHeight} L 150 40 Z`}
        className="cup-outline"
      />

      {/* Render layers in order */}
      {layers
        .sort((a, b) => a.order - b.order)
        .map((layer) => {
          const isVisible = visibleLayers.has(layer.id);
          const path = calculateLayerPath(layer, isVisible);
          
          if (!path) return null;

          return (
            <path
              key={layer.id}
              d={path}
              fill={layer.color}
              opacity={layer.opacity}
              className={`drink-layer ${layer.animationType || ''}-layer ${layer.id === 'whipped' ? 'whipped-layer' : ''} ${isVisible ? 'visible' : 'hidden'}`}
              style={{
                '--layer-order': layer.order,
                '--animation-type': layer.animationType || 'none',
                '--layer-delay': `${layer.order * 120}ms`
              } as React.CSSProperties}
            />
          );
        })}

      {/* Toppings */}
      {getToppingElements()}

      {/* Cup lid */}
      <ellipse cx="100" cy="40" rx="50" ry="8" className="cup-lid" />
      {cupSize === CupSize.LARGE && (
        <path d="M 50 40 Q 100 20 150 40" className="large-cup-lid-top" />
      )}
    </svg>
  );
};

export default LayeredCup;