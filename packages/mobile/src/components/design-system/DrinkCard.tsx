import React from 'react';

interface DrinkCardProps {
  name: string;
  detail?: string;
  price?: string;
  visual?: React.ReactNode;
  gradientBg?: string;
  onClick?: () => void;
  onAdd?: () => void;
  width?: number;
}

export const DrinkCard: React.FC<DrinkCardProps> = ({
  name,
  detail,
  price,
  visual,
  gradientBg,
  onClick,
  onAdd,
  width = 150,
}) => (
  <div className="drink-card" style={{ width }} onClick={onClick}>
    <div
      className="drink-card-visual"
      style={gradientBg ? { background: gradientBg } : undefined}
    >
      {visual}
    </div>
    <div className="drink-card-info">
      <div className="drink-card-name">{name}</div>
      {detail && <div className="drink-card-detail">{detail}</div>}
      {(price || onAdd) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          {price && <span className="drink-card-price">{price}</span>}
          {onAdd && (
            <button
              className="drink-card-add-btn"
              onClick={(e) => { e.stopPropagation(); onAdd(); }}
              aria-label={`Add ${name}`}
            >
              +
            </button>
          )}
        </div>
      )}
    </div>
  </div>
);
