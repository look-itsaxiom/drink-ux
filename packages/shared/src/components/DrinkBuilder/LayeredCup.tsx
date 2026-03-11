import React, { useEffect, useState, useMemo, useRef } from 'react';
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

// Extra vertical space above the cup for steam
const STEAM_HEADROOM = 60;

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
  const animFrameRef = useRef<number>(0);

  // Two-phase visibility: clear → set, so CSS animations re-trigger on layer changes
  useEffect(() => {
    setVisibleLayers(new Set());

    if (layers.length === 0) return;

    // Use rAF to ensure the "hidden" frame paints before we show layers
    animFrameRef.current = requestAnimationFrame(() => {
      setVisibleLayers(new Set(layers.map(l => l.id)));
    });

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [layers]);

  // Cup geometry
  const cup = useMemo(() => {
    const topWidth = cupSize === CupSize.LARGE ? 100 : cupSize === CupSize.MEDIUM ? 90 : 78;
    const bottomWidth = cupSize === CupSize.LARGE ? 74 : cupSize === CupSize.MEDIUM ? 66 : 58;
    const lidY = STEAM_HEADROOM + 8;
    const bottomY = STEAM_HEADROOM + cupHeight;
    const bottomCurve = 14;
    const cx = 100;

    return { cx, lidY, bottomY, topWidth, bottomWidth, bottomCurve,
      leftTop: cx - topWidth / 2, rightTop: cx + topWidth / 2,
      leftBottom: cx - bottomWidth / 2, rightBottom: cx + bottomWidth / 2,
    };
  }, [cupSize, cupHeight]);

  const viewBoxHeight = cupHeight + STEAM_HEADROOM + 30;

  // Interpolate cup width at a given Y
  const widthAtY = (y: number) => {
    const t = Math.max(0, Math.min(1, (y - cup.lidY) / (cup.bottomY - cup.lidY)));
    return cup.topWidth * (1 - t) + cup.bottomWidth * t;
  };

  const calculateLayerPath = (layer: DrinkLayer, isVisible: boolean): string => {
    if (!isVisible) return '';

    const inset = 3; // inset from cup walls
    const liquidTopY = cup.lidY + 8;
    const liquidBottomY = cup.bottomY - 4;
    const totalHeight = Math.max(1, liquidBottomY - liquidTopY);

    const heightBelow = layers
      .filter(l => l.order < layer.order)
      .reduce((sum, l) => sum + l.height, 0);

    const layerHeightPx = totalHeight * layer.height;
    const bottomY = liquidBottomY - totalHeight * heightBelow;
    const topY = Math.max(liquidTopY, bottomY - layerHeightPx);

    const topW = widthAtY(topY) - inset * 2;
    const botW = widthAtY(bottomY) - inset * 2;
    const leftTop = cup.cx - topW / 2;
    const rightTop = cup.cx + topW / 2;
    const leftBot = cup.cx - botW / 2;
    const rightBot = cup.cx + botW / 2;

    const isBottomLayer = heightBelow < 0.01;
    const bottomCurveAmt = isBottomLayer ? cup.bottomCurve * 0.55 : 3;

    return `M ${leftTop} ${topY}
            L ${leftBot} ${bottomY}
            Q ${cup.cx} ${bottomY + bottomCurveAmt} ${rightBot} ${bottomY}
            L ${rightTop} ${topY}
            Q ${cup.cx} ${topY + 3} ${leftTop} ${topY} Z`;
  };

  // Liquid surface Y for overlays
  const getSurfaceY = () => {
    const liquidTopY = cup.lidY + 8;
    const liquidBottomY = cup.bottomY - 4;
    const totalHeight = Math.max(1, liquidBottomY - liquidTopY);
    const filledPortion = layers.reduce((sum, l) => sum + l.height, 0);
    return Math.max(liquidTopY, liquidBottomY - totalHeight * filledPortion);
  };

  const getToppingElements = () => {
    if (!hasTopping || !toppingType) return null;
    const props = TOPPING_PROPERTIES[toppingType as keyof typeof TOPPING_PROPERTIES] || TOPPING_PROPERTIES.default;
    const surfaceY = getSurfaceY();
    const elements = [];

    if (props.type === 'foam') {
      for (let i = 0; i < 10; i++) {
        elements.push(
          <circle key={`b-${i}`} cx={70 + Math.random() * 60} cy={surfaceY - 4 - Math.random() * 8}
            r={1.5 + Math.random() * 3} fill={props.color} opacity="0.7"
            className="foam-bubble" style={{ animationDelay: `${i * 120}ms` }} />
        );
      }
    } else if (props.type === 'sprinkle') {
      for (let i = 0; i < 12; i++) {
        const x = 74 + Math.random() * 52, y = surfaceY - 6 - Math.random() * 10;
        elements.push(
          <rect key={`s-${i}`} x={x} y={y} width="1.2" height="4" rx="0.6"
            fill={props.color} opacity="0.85" className="sprinkle"
            transform={`rotate(${Math.random() * 360} ${x} ${y})`}
            style={{ animationDelay: `${i * 60}ms` }} />
        );
      }
    } else if (props.type === 'dust') {
      for (let i = 0; i < 20; i++) {
        elements.push(
          <circle key={`d-${i}`} cx={70 + Math.random() * 60} cy={surfaceY - 8 - Math.random() * 12}
            r={0.4 + Math.random() * 1} fill={props.color} opacity="0.6"
            className="dust-particle" style={{ animationDelay: `${i * 35}ms` }} />
        );
      }
    }
    return elements;
  };

  const getSteamElements = () => {
    if (!isHot || layers.length === 0) return null;
    const baseY = cup.lidY - 2;
    return (
      <g className="steam-group">
        {[0, 1, 2].map(i => {
          const x = cup.cx - 14 + i * 14;
          return (
            <path key={`steam-${i}`} className="steam-wisp"
              d={`M ${x} ${baseY} Q ${x + 5} ${baseY - 16} ${x - 4} ${baseY - 30} Q ${x + 6} ${baseY - 42} ${x + 1} ${baseY - 52}`}
              fill="none" stroke="rgba(180, 180, 180, 0.6)" strokeWidth="2.5" strokeLinecap="round"
              style={{ animationDelay: `${i * 700}ms` }} />
          );
        })}
      </g>
    );
  };

  const getIceElements = () => {
    if (isHot || layers.length === 0) return null;
    const surfaceY = getSurfaceY();
    const liquidBottomY = cup.bottomY - 4;
    const midY = (surfaceY + liquidBottomY) / 2;
    const cubes = [
      { x: cup.cx - 18, y: midY - 14, size: 13, rot: -10 },
      { x: cup.cx + 4, y: midY - 6, size: 11, rot: 12 },
      { x: cup.cx - 8, y: midY + 6, size: 12, rot: -4 },
    ];
    return (
      <g className="ice-group">
        {cubes.map((c, i) => (
          <g key={`ice-${i}`} className="ice-cube" style={{ animationDelay: `${i * 200 + 400}ms` }}>
            <rect x={c.x} y={c.y} width={c.size} height={c.size} rx="2.5"
              transform={`rotate(${c.rot} ${c.x + c.size / 2} ${c.y + c.size / 2})`}
              fill="rgba(210, 235, 255, 0.5)" stroke="rgba(170, 210, 255, 0.45)" strokeWidth="0.8" />
            <rect x={c.x + 2} y={c.y + 1.5} width={c.size * 0.35} height={c.size * 0.22} rx="1"
              transform={`rotate(${c.rot} ${c.x + c.size / 2} ${c.y + c.size / 2})`}
              fill="rgba(255, 255, 255, 0.55)" />
          </g>
        ))}
      </g>
    );
  };

  const getStraw = () => {
    if (isHot || layers.length === 0) return null;
    const strawX = cup.cx + 16;
    return (
      <g className="straw-group">
        <line x1={strawX} y1={cup.lidY - 30} x2={strawX + 3} y2={cup.bottomY - 24}
          stroke="#d4d4d4" strokeWidth="4.5" strokeLinecap="round" className="straw" />
        <line x1={strawX} y1={cup.lidY - 30} x2={strawX + 3} y2={cup.bottomY - 24}
          stroke="#f0f0f0" strokeWidth="2.2" strokeLinecap="round" />
        <line x1={strawX - 0.2} y1={cup.lidY - 30} x2={strawX + 2.8} y2={cup.bottomY - 24}
          stroke="rgba(102, 126, 234, 0.25)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="5 7" />
      </g>
    );
  };

  const getSurfaceHighlight = () => {
    if (layers.length === 0) return null;
    const y = getSurfaceY();
    const w = widthAtY(y) - 12;
    return <ellipse cx={cup.cx} cy={y} rx={w / 2} ry="2.5" fill="rgba(255, 255, 255, 0.22)" className="surface-highlight" />;
  };

  const getSleeve = () => {
    if (!isHot || layers.length === 0) return null;
    const t1 = 0.35, t2 = 0.65;
    const y1 = cup.lidY + (cup.bottomY - cup.lidY) * t1;
    const y2 = cup.lidY + (cup.bottomY - cup.lidY) * t2;
    const w1 = widthAtY(y1), w2 = widthAtY(y2);
    return (
      <path d={`M ${cup.cx - w1 / 2} ${y1} L ${cup.cx - w2 / 2} ${y2} L ${cup.cx + w2 / 2} ${y2} L ${cup.cx + w1 / 2} ${y1} Z`}
        fill="rgba(170, 130, 90, 0.12)" stroke="rgba(170, 130, 90, 0.18)" strokeWidth="0.5" className="cup-sleeve" />
    );
  };

  const cupPath = `M ${cup.leftTop} ${cup.lidY} L ${cup.leftBottom} ${cup.bottomY}
    Q ${cup.cx} ${cup.bottomY + cup.bottomCurve} ${cup.rightBottom} ${cup.bottomY}
    L ${cup.rightTop} ${cup.lidY} Z`;

  return (
    <svg className={className} viewBox={`0 0 200 ${viewBoxHeight}`}>
      <defs>
        <linearGradient id="cupGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(0,0,0,0.03)" />
          <stop offset="35%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="55%" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.04)" />
        </linearGradient>
        <linearGradient id="lidGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fafafa" />
          <stop offset="100%" stopColor="#e8e8e8" />
        </linearGradient>
        <linearGradient id="layerShine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(0,0,0,0.06)" />
          <stop offset="28%" stopColor="rgba(255,255,255,0.1)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.04)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.04)" />
        </linearGradient>
        <filter id="cupShadow" x="-10%" y="-5%" width="120%" height="115%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.1" />
        </filter>
      </defs>

      {/* Steam (rendered first so it's behind the lid) */}
      {getSteamElements()}

      {/* Cup body */}
      <path d={cupPath} className="cup-outline" filter="url(#cupShadow)" />
      <path d={cupPath} fill="url(#cupGrad)" stroke="none" />

      {/* Layers */}
      {layers.sort((a, b) => a.order - b.order).map(layer => {
        const isVisible = visibleLayers.has(layer.id);
        const path = calculateLayerPath(layer, isVisible);
        if (!path) return null;
        return (
          <g key={layer.id}>
            <path d={path} fill={layer.color}
              className={`drink-layer ${layer.animationType || 'fill'}-layer ${isVisible ? 'visible' : 'hidden'}`}
              style={{
                '--layer-delay': `${layer.order * 140}ms`,
                '--layer-opacity': layer.opacity,
              } as React.CSSProperties} />
            {isVisible && (
              <path d={path} fill="url(#layerShine)"
                className={`drink-layer layer-shine ${isVisible ? 'visible' : 'hidden'}`}
                style={{ '--layer-delay': `${layer.order * 140}ms`, pointerEvents: 'none' } as React.CSSProperties} />
            )}
          </g>
        );
      })}

      {getSurfaceHighlight()}
      {getIceElements()}
      {getToppingElements()}
      {getSleeve()}
      {getStraw()}

      {/* Lid */}
      <ellipse cx={cup.cx} cy={cup.lidY} rx={cup.topWidth / 2} ry="8"
        className="cup-lid" fill="url(#lidGrad)" stroke="#d0d0d0" strokeWidth="1.5" />
      {cupSize === CupSize.LARGE && (
        <path d={`M ${cup.leftTop} ${cup.lidY} Q ${cup.cx} ${cup.lidY - 14} ${cup.rightTop} ${cup.lidY}`}
          className="large-cup-lid-top" />
      )}
      {/* Rim highlight */}
      <ellipse cx={cup.cx} cy={cup.lidY} rx={cup.topWidth / 2 - 3} ry="5"
        fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
    </svg>
  );
};

export default LayeredCup;
