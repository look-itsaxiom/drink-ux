import React, { useEffect, useState, useMemo } from 'react';
import { CupSize } from '../../types.js';
import { DrinkLayer, TOPPING_PROPERTIES } from './DrinkVisualizer.js';

export interface LayeredCupProps {
  layers: DrinkLayer[];
  cupSize: CupSize;
  cupHeight: number;
  hasTopping: boolean;
  toppingType?: string;
  isHot?: boolean;
  className?: string;
}

const LayeredCup: React.FC<LayeredCupProps> = ({
  layers,
  cupSize,
  cupHeight,
  hasTopping,
  toppingType,
  isHot = true,
  className = 'visual-cup'
}) => {
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set());

  useEffect(() => {
    setVisibleLayers(new Set());
    if (layers.length === 0) return;
    const ids = new Set(layers.map(l => l.id));
    setVisibleLayers(ids);
  }, [layers]);

  // Cup geometry based on size
  const cup = useMemo(() => {
    const topWidth = cupSize === CupSize.LARGE ? 96 : cupSize === CupSize.MEDIUM ? 90 : 82;
    const bottomWidth = cupSize === CupSize.LARGE ? 72 : cupSize === CupSize.MEDIUM ? 68 : 62;
    const lidY = 38;
    const bottomY = cupHeight;
    const bottomCurve = 14;
    const cx = 100;

    return {
      cx,
      lidY,
      bottomY,
      topWidth,
      bottomWidth,
      bottomCurve,
      leftTop: cx - topWidth / 2,
      rightTop: cx + topWidth / 2,
      leftBottom: cx - bottomWidth / 2,
      rightBottom: cx + bottomWidth / 2,
    };
  }, [cupSize, cupHeight]);

  const calculateLayerPath = (layer: DrinkLayer, isVisible: boolean): string => {
    if (!isVisible) return '';

    const liquidTopPadding = 8;
    const liquidTopY = cup.lidY + liquidTopPadding;
    const liquidBottomY = cup.bottomY - 4; // slight inset from cup bottom
    const totalHeight = Math.max(0, liquidBottomY - liquidTopY);

    const heightBelow = layers
      .filter((l) => l.order < layer.order)
      .reduce((sum, l) => sum + l.height, 0);

    const layerHeightPx = totalHeight * layer.height;
    const bottomY = liquidBottomY - totalHeight * heightBelow;
    const topY = Math.max(liquidTopY, bottomY - layerHeightPx);

    // Interpolate cup width at each Y position
    const frac = (y: number) => (y - cup.lidY) / (cup.bottomY - cup.lidY);
    const widthAt = (y: number) => {
      const t = frac(y);
      return cup.topWidth * (1 - t) + cup.bottomWidth * t;
    };

    const topW = widthAt(topY);
    const botW = widthAt(bottomY);
    const leftTop = cup.cx - topW / 2;
    const rightTop = cup.cx + topW / 2;
    const leftBot = cup.cx - botW / 2;
    const rightBot = cup.cx + botW / 2;

    // Curved bottom when this is the lowest layer
    const isBottomLayer = heightBelow < 0.01;
    const bottomCurveAmount = isBottomLayer ? cup.bottomCurve * 0.6 : 4;

    return `M ${leftTop} ${topY}
            L ${leftBot} ${bottomY}
            Q ${cup.cx} ${bottomY + bottomCurveAmount} ${rightBot} ${bottomY}
            L ${rightTop} ${topY}
            Q ${cup.cx} ${topY + 3} ${leftTop} ${topY} Z`;
  };

  const getToppingElements = () => {
    if (!hasTopping || !toppingType) return null;

    const toppingProps = TOPPING_PROPERTIES[toppingType as keyof typeof TOPPING_PROPERTIES] ||
                        TOPPING_PROPERTIES.default;

    const elements = [];

    const liquidTopPadding = 8;
    const liquidTopY = cup.lidY + liquidTopPadding;
    const liquidBottomY = cup.bottomY - 4;
    const totalHeight = Math.max(0, liquidBottomY - liquidTopY);

    const filledPortion = layers
      .filter(l => l.animationType !== 'foam' && l.animationType !== 'sparkle')
      .reduce((sum, l) => sum + l.height, 0);

    const surfaceY = Math.max(liquidTopY, liquidBottomY - totalHeight * filledPortion);

    if (toppingProps.type === 'foam') {
      for (let i = 0; i < 10; i++) {
        const x = 68 + Math.random() * 64;
        const y = surfaceY - 6 - Math.random() * 8;
        const radius = 1.5 + Math.random() * 3;
        elements.push(
          <circle
            key={`bubble-${i}`}
            cx={x}
            cy={y}
            r={radius}
            fill={toppingProps.color}
            opacity="0.7"
            className="foam-bubble"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        );
      }
    } else if (toppingProps.type === 'sprinkle') {
      for (let i = 0; i < 14; i++) {
        const x = 72 + Math.random() * 56;
        const y = surfaceY - 8 - Math.random() * 12;
        const rotation = Math.random() * 360;
        elements.push(
          <rect
            key={`sprinkle-${i}`}
            x={x}
            y={y}
            width="1.2"
            height="4.5"
            rx="0.6"
            fill={toppingProps.color}
            opacity="0.85"
            className="sprinkle"
            transform={`rotate(${rotation} ${x} ${y})`}
            style={{ animationDelay: `${i * 60}ms` }}
          />
        );
      }
    } else if (toppingProps.type === 'dust') {
      for (let i = 0; i < 24; i++) {
        const x = 68 + Math.random() * 64;
        const y = surfaceY - 10 - Math.random() * 14;
        const size = 0.4 + Math.random() * 1.2;
        elements.push(
          <circle
            key={`dust-${i}`}
            cx={x}
            cy={y}
            r={size}
            fill={toppingProps.color}
            opacity="0.6"
            className="dust-particle"
            style={{ animationDelay: `${i * 35}ms` }}
          />
        );
      }
    }

    return elements;
  };

  // Steam effect for hot drinks
  const getSteamElements = () => {
    if (!isHot || layers.length === 0) return null;

    return (
      <g className="steam-group">
        {[0, 1, 2].map(i => {
          const x = cup.cx - 12 + i * 12;
          const baseY = cup.lidY - 4;
          return (
            <path
              key={`steam-${i}`}
              className="steam-wisp"
              d={`M ${x} ${baseY} Q ${x + 4} ${baseY - 14} ${x - 3} ${baseY - 26} Q ${x + 5} ${baseY - 38} ${x} ${baseY - 48}`}
              fill="none"
              stroke="rgba(200, 200, 200, 0.5)"
              strokeWidth="2"
              strokeLinecap="round"
              style={{
                animationDelay: `${i * 600}ms`,
              }}
            />
          );
        })}
      </g>
    );
  };

  // Ice cubes for cold drinks
  const getIceElements = () => {
    if (isHot || layers.length === 0) return null;

    const liquidTopPadding = 8;
    const liquidTopY = cup.lidY + liquidTopPadding;
    const liquidBottomY = cup.bottomY - 4;
    const totalHeight = Math.max(0, liquidBottomY - liquidTopY);

    const filledPortion = layers.reduce((sum, l) => sum + l.height, 0);
    const surfaceY = Math.max(liquidTopY, liquidBottomY - totalHeight * filledPortion);
    const midY = (surfaceY + liquidBottomY) / 2;

    const cubes = [
      { x: cup.cx - 16, y: midY - 10, size: 12, rot: -8 },
      { x: cup.cx + 6, y: midY - 4, size: 10, rot: 15 },
      { x: cup.cx - 6, y: midY + 8, size: 11, rot: -5 },
    ];

    return (
      <g className="ice-group">
        {cubes.map((cube, i) => (
          <g key={`ice-${i}`} className="ice-cube" style={{ animationDelay: `${i * 200 + 400}ms` }}>
            <rect
              x={cube.x}
              y={cube.y}
              width={cube.size}
              height={cube.size}
              rx="2.5"
              transform={`rotate(${cube.rot} ${cube.x + cube.size / 2} ${cube.y + cube.size / 2})`}
              fill="rgba(220, 240, 255, 0.55)"
              stroke="rgba(180, 220, 255, 0.4)"
              strokeWidth="0.8"
            />
            {/* Highlight on ice */}
            <rect
              x={cube.x + 2}
              y={cube.y + 1.5}
              width={cube.size * 0.35}
              height={cube.size * 0.25}
              rx="1"
              transform={`rotate(${cube.rot} ${cube.x + cube.size / 2} ${cube.y + cube.size / 2})`}
              fill="rgba(255, 255, 255, 0.6)"
            />
          </g>
        ))}
      </g>
    );
  };

  // Straw for cold drinks
  const getStraw = () => {
    if (isHot || layers.length === 0) return null;

    const strawX = cup.cx + 14;
    const strawTop = cup.lidY - 28;
    const strawBottom = cup.bottomY - 20;

    return (
      <g className="straw-group">
        {/* Straw body */}
        <line
          x1={strawX}
          y1={strawTop}
          x2={strawX + 4}
          y2={strawBottom}
          stroke="#e8e8e8"
          strokeWidth="4"
          strokeLinecap="round"
          className="straw"
        />
        {/* Straw inner */}
        <line
          x1={strawX}
          y1={strawTop}
          x2={strawX + 4}
          y2={strawBottom}
          stroke="#f5f5f5"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Straw stripe */}
        <line
          x1={strawX - 0.3}
          y1={strawTop}
          x2={strawX + 3.7}
          y2={strawBottom}
          stroke="rgba(102, 126, 234, 0.3)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="6 8"
        />
      </g>
    );
  };

  // Liquid surface meniscus
  const getSurfaceHighlight = () => {
    if (layers.length === 0) return null;

    const liquidTopPadding = 8;
    const liquidTopY = cup.lidY + liquidTopPadding;
    const liquidBottomY = cup.bottomY - 4;
    const totalHeight = Math.max(0, liquidBottomY - liquidTopY);

    const filledPortion = layers.reduce((sum, l) => sum + l.height, 0);
    const surfaceY = Math.max(liquidTopY, liquidBottomY - totalHeight * filledPortion);

    const frac = (surfaceY - cup.lidY) / (cup.bottomY - cup.lidY);
    const w = cup.topWidth * (1 - frac) + cup.bottomWidth * frac;
    const leftX = cup.cx - w / 2 + 4;
    const rightX = cup.cx + w / 2 - 4;

    return (
      <ellipse
        cx={cup.cx}
        cy={surfaceY}
        rx={(rightX - leftX) / 2}
        ry="2.5"
        fill="rgba(255, 255, 255, 0.25)"
        className="surface-highlight"
      />
    );
  };

  // Cup SVG shape
  const cupOutlinePath = `
    M ${cup.leftTop} ${cup.lidY}
    L ${cup.leftBottom} ${cup.bottomY}
    Q ${cup.cx} ${cup.bottomY + cup.bottomCurve} ${cup.rightBottom} ${cup.bottomY}
    L ${cup.rightTop} ${cup.lidY}
    Z`;

  // Cup sleeve (cardboard band for hot drinks)
  const getSleeve = () => {
    if (!isHot || layers.length === 0) return null;

    const sleeveTopFrac = 0.35;
    const sleeveBotFrac = 0.65;
    const sleeveTopY = cup.lidY + (cup.bottomY - cup.lidY) * sleeveTopFrac;
    const sleeveBotY = cup.lidY + (cup.bottomY - cup.lidY) * sleeveBotFrac;

    const widthAt = (frac: number) => cup.topWidth * (1 - frac) + cup.bottomWidth * frac;
    const topW = widthAt(sleeveTopFrac);
    const botW = widthAt(sleeveBotFrac);

    return (
      <path
        d={`M ${cup.cx - topW / 2} ${sleeveTopY}
            L ${cup.cx - botW / 2} ${sleeveBotY}
            L ${cup.cx + botW / 2} ${sleeveBotY}
            L ${cup.cx + topW / 2} ${sleeveTopY}
            Z`}
        fill="rgba(180, 140, 100, 0.15)"
        stroke="rgba(180, 140, 100, 0.2)"
        strokeWidth="0.5"
        className="cup-sleeve"
      />
    );
  };

  return (
    <svg
      className={className}
      viewBox={`0 0 200 ${cupHeight + 40}`}
    >
      {/* Definitions for gradients and filters */}
      <defs>
        <linearGradient id="cupGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(0,0,0,0.04)" />
          <stop offset="30%" stopColor="rgba(255,255,255,0.1)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.15)" />
          <stop offset="70%" stopColor="rgba(255,255,255,0.05)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.06)" />
        </linearGradient>
        <linearGradient id="lidGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fafafa" />
          <stop offset="100%" stopColor="#e8e8e8" />
        </linearGradient>
        <filter id="cupShadow" x="-10%" y="-5%" width="120%" height="115%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.08" />
        </filter>
        {/* Layer gradient overlay for depth */}
        <linearGradient id="layerShine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(0,0,0,0.08)" />
          <stop offset="25%" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="45%" stopColor="rgba(255,255,255,0.06)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.05)" />
        </linearGradient>
      </defs>

      {/* Steam (behind cup for layering) */}
      {getSteamElements()}

      {/* Cup body */}
      <path
        d={cupOutlinePath}
        className="cup-outline"
        filter="url(#cupShadow)"
      />
      {/* Cup body gradient overlay for 3D effect */}
      <path
        d={cupOutlinePath}
        fill="url(#cupGradient)"
        stroke="none"
      />

      {/* Render layers in order */}
      {layers
        .sort((a, b) => a.order - b.order)
        .map((layer) => {
          const isVisible = visibleLayers.has(layer.id);
          const path = calculateLayerPath(layer, isVisible);

          if (!path) return null;

          return (
            <g key={layer.id}>
              <path
                d={path}
                fill={layer.color}
                opacity={layer.opacity}
                className={`drink-layer ${layer.animationType || ''}-layer ${layer.id === 'whipped' ? 'whipped-layer' : ''} ${isVisible ? 'visible' : 'hidden'}`}
                style={{
                  '--layer-order': layer.order,
                  '--animation-type': layer.animationType || 'none',
                  '--layer-delay': `${layer.order * 120}ms`,
                  '--layer-opacity': layer.opacity,
                } as React.CSSProperties}
              />
              {/* Gradient shine on each layer for depth */}
              {isVisible && (
                <path
                  d={path}
                  fill="url(#layerShine)"
                  className={`drink-layer layer-shine ${isVisible ? 'visible' : 'hidden'}`}
                  style={{
                    '--layer-delay': `${layer.order * 120}ms`,
                    pointerEvents: 'none',
                  } as React.CSSProperties}
                />
              )}
            </g>
          );
        })}

      {/* Surface highlight / meniscus */}
      {getSurfaceHighlight()}

      {/* Ice cubes (rendered above liquid) */}
      {getIceElements()}

      {/* Toppings */}
      {getToppingElements()}

      {/* Cup sleeve for hot drinks */}
      {getSleeve()}

      {/* Straw for cold drinks */}
      {getStraw()}

      {/* Cup lid */}
      <ellipse cx={cup.cx} cy={cup.lidY} rx={cup.topWidth / 2} ry="8" className="cup-lid" fill="url(#lidGradient)" stroke="#d0d0d0" strokeWidth="1.5" />
      {cupSize === CupSize.LARGE && (
        <path d={`M ${cup.leftTop} ${cup.lidY} Q ${cup.cx} ${cup.lidY - 16} ${cup.rightTop} ${cup.lidY}`} className="large-cup-lid-top" />
      )}

      {/* Cup rim highlight */}
      <ellipse cx={cup.cx} cy={cup.lidY} rx={cup.topWidth / 2 - 3} ry="5" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
    </svg>
  );
};

export default LayeredCup;
