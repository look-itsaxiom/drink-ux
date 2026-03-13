import React, { useState, useCallback, useMemo } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { useHistory } from 'react-router';
import { ThemeSwitcher } from '../components/design-system';
import './DrinkCustomizer.css';

// ── Types ──────────────────────────────────────

interface MilkOption {
  name: string;
  note: string;
  price: number;
  color: string;
}

interface FlavorOption {
  emoji: string;
  name: string;
  price: number;
}

// ── Static data ────────────────────────────────

const SIZES = [
  { key: 'S', label: 'S \u00B7 8oz', basePrice: 4.50, scale: 0.82 },
  { key: 'M', label: 'M \u00B7 12oz', basePrice: 5.50, scale: 1 },
  { key: 'L', label: 'L \u00B7 16oz', basePrice: 6.50, scale: 1.16 },
];

const MILKS: MilkOption[] = [
  { name: 'Whole Milk', note: 'Rich and creamy', price: 0, color: 'rgba(255,250,245,0.9)' },
  { name: 'Oat Milk', note: 'Naturally sweet, vegan', price: 0.75, color: 'rgba(241,220,193,0.85)' },
  { name: 'Almond Milk', note: 'Light, nutty', price: 0.75, color: 'rgba(248,235,210,0.85)' },
  { name: 'Coconut Milk', note: 'Tropical, dairy-free', price: 0.75, color: 'rgba(255,252,240,0.85)' },
  { name: 'No Milk', note: 'Black / espresso only', price: 0, color: 'rgba(107,66,38,0)' },
];

const SYRUPS: FlavorOption[] = [
  { emoji: '\uD83C\uDF66', name: 'Vanilla', price: 0.50 },
  { emoji: '\uD83C\uDF6E', name: 'Caramel', price: 0.50 },
  { emoji: '\uD83C\uDF30', name: 'Hazelnut', price: 0.50 },
  { emoji: '\uD83E\uDD0E', name: 'Brown Sugar', price: 0.50 },
  { emoji: '\uD83D\uDC9C', name: 'Lavender', price: 0.65 },
  { emoji: '', name: 'Classic Simple', price: 0 },
];

const TOPPINGS: FlavorOption[] = [
  { emoji: '\uD83C\uDF00', name: 'Caramel Drizzle', price: 0.25 },
  { emoji: '\u2601\uFE0F', name: 'Whipped Cream', price: 0.75 },
  { emoji: '\uD83E\uDED9', name: 'Cinnamon', price: 0 },
  { emoji: '\uD83C\uDF6B', name: 'Cocoa Powder', price: 0 },
  { emoji: '\uD83E\uDEE7', name: 'Cold Foam', price: 0.75 },
];

// ── Component ──────────────────────────────────

const DrinkCustomizer: React.FC = () => {
  const history = useHistory();

  const [size, setSize] = useState('M');
  const [isHot, setIsHot] = useState(true);
  const [selectedMilk, setSelectedMilk] = useState(1); // Oat Milk
  const [selectedSyrups, setSelectedSyrups] = useState<Set<string>>(new Set(['Vanilla']));
  const [selectedToppings, setSelectedToppings] = useState<Set<string>>(new Set());
  const [qty, setQty] = useState(1);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['temp', 'milk', 'syrup']));

  const sizeData = SIZES.find((s) => s.key === size) || SIZES[1];
  const milkData = MILKS[selectedMilk];

  const syrupTotal = useMemo(() => {
    let total = 0;
    selectedSyrups.forEach((name) => {
      const s = SYRUPS.find((x) => x.name === name);
      if (s) total += s.price;
    });
    return total;
  }, [selectedSyrups]);

  const toppingTotal = useMemo(() => {
    let total = 0;
    selectedToppings.forEach((name) => {
      const t = TOPPINGS.find((x) => x.name === name);
      if (t) total += t.price;
    });
    return total;
  }, [selectedToppings]);

  const totalPrice = (sizeData.basePrice + milkData.price + syrupTotal + toppingTotal) * qty;

  const toggleSection = useCallback((id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleChip = useCallback((set: Set<string>, name: string, setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }, []);

  const formatPrice = (p: number) => `$${p.toFixed(2)}`;

  return (
    <IonPage>
      <IonContent fullscreen scrollY={false} className="customizer-page">
        <div className="customizer-layout">

          {/* Nav Header */}
          <div className="customizer-nav">
            <button className="back-btn" onClick={() => history.goBack()}>
              <svg width="18" height="18" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" stroke="var(--theme-text)" strokeWidth="2.5" fill="none" strokeLinecap="round"/></svg>
            </button>
            <span className="nav-title">Customize Drink</span>
            <button className="fav-btn" aria-label="Favorite">
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="none" stroke="var(--theme-textSecondary)" strokeWidth="2"/></svg>
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="scroll-content">

            {/* Cup Stage */}
            <div className="cup-stage">
              <div className="drink-name-row">
                <div className="drink-name">Vanilla Oat Latte</div>
                <div className="drink-base-info">Espresso base &middot; from {formatPrice(SIZES[0].basePrice)}</div>
              </div>

              <div className="cup-wrapper">
                <div className="cup-glow" />
                <svg
                  className="cup-svg-container"
                  width="120"
                  height="180"
                  viewBox="0 0 120 180"
                  style={{ transform: `scale(${sizeData.scale})`, transition: 'transform 0.3s ease' }}
                >
                  <path d="M18 28 L102 28 L93 150 Q93 160 60 162 Q27 160 27 150 Z" fill="none" stroke="rgba(107,66,38,0.2)" strokeWidth="2"/>
                  <path d="M29 145 Q29 158 60 160 Q91 158 91 145 L89 115 Q90 115 30 115 Z" fill="rgba(107,66,38,0.72)"/>
                  <path d="M22 88 L98 88 L89 115 L31 115 Z" fill={milkData.color} style={{ transition: 'fill 0.3s ease' }}/>
                  <path d="M35 88 Q45 82 55 88 Q65 94 75 88 Q85 82 91 88 L89 115 Q65 110 35 115 Z" fill="rgba(230,190,120,0.55)"/>
                  <path d="M18 28 L102 28 L98 60 Q92 50 80 54 Q70 46 60 50 Q50 46 40 54 Q28 50 22 60 Z" fill={isHot ? 'rgba(255,255,255,0.88)' : 'rgba(200,235,255,0.5)'} style={{ transition: 'fill 0.3s ease' }}/>
                  <circle cx="48" cy="42" r="5" fill="rgba(212,165,116,0.25)"/>
                  <circle cx="60" cy="38" r="4" fill="rgba(212,165,116,0.2)"/>
                  <circle cx="72" cy="43" r="5" fill="rgba(212,165,116,0.22)"/>
                  <ellipse cx="60" cy="28" rx="42" ry="9" fill="rgba(255,255,255,0.6)"/>
                  <path d="M32 50 Q28 80 30 130" stroke="rgba(255,255,255,0.3)" strokeWidth="3" fill="none" strokeLinecap="round"/>
                  <ellipse cx="60" cy="160" rx="33" ry="5" fill="rgba(107,66,38,0.12)"/>
                </svg>
              </div>

              {/* Size Selector */}
              <div className="size-selector">
                {SIZES.map((s) => (
                  <button key={s.key} className={`size-btn${size === s.key ? ' active' : ''}`} onClick={() => setSize(s.key)}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Row */}
            <div className="price-row">
              <div className="price-breakdown">
                Base {formatPrice(sizeData.basePrice)}
                {milkData.price > 0 && ` \u00B7 ${milkData.name} +${formatPrice(milkData.price)}`}
                {syrupTotal > 0 && ` \u00B7 Syrups +${formatPrice(syrupTotal)}`}
                {toppingTotal > 0 && ` \u00B7 Toppings +${formatPrice(toppingTotal)}`}
              </div>
              <div className="price-total">
                <div className="price-total-label">Total</div>
                <div className="price-total-amount">{formatPrice(totalPrice)}</div>
              </div>
            </div>

            {/* Options */}
            <div className="options-wrap">

              {/* Temperature */}
              <div className={`option-section${openSections.has('temp') ? ' open' : ''}`}>
                <div className="option-header" onClick={() => toggleSection('temp')}>
                  <div className="option-header-left">
                    <div className="option-icon">{'\uD83C\uDF21\uFE0F'}</div>
                    <div>
                      <div className="option-title">Temperature</div>
                      <div className="option-subtitle">{isHot ? 'Hot' : 'Iced'}</div>
                    </div>
                  </div>
                  <ChevronIcon />
                </div>
                <div className="option-body">
                  <div className="temp-toggle">
                    <div className={`temp-opt${isHot ? ' active' : ''}`} onClick={() => setIsHot(true)}>
                      <span className="temp-emoji">{'\u2615'}</span>
                      <div className="temp-label">Hot</div>
                      <div className="temp-desc">Steamed, ~150&deg;F</div>
                    </div>
                    <div className={`temp-opt${!isHot ? ' active' : ''}`} onClick={() => setIsHot(false)}>
                      <span className="temp-emoji">{'\uD83E\uDDCA'}</span>
                      <div className="temp-label">Iced</div>
                      <div className="temp-desc">Over ice, chilled</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Milk */}
              <div className={`option-section${openSections.has('milk') ? ' open' : ''}`}>
                <div className="option-header" onClick={() => toggleSection('milk')}>
                  <div className="option-header-left">
                    <div className="option-icon">{'\uD83E\uDD5B'}</div>
                    <div>
                      <div className="option-title">Milk</div>
                      <div className="option-subtitle">{milkData.name}{milkData.price > 0 ? ` +${formatPrice(milkData.price)}` : ''}</div>
                    </div>
                  </div>
                  <ChevronIcon />
                </div>
                <div className="option-body">
                  <div className="milk-grid">
                    {MILKS.map((m, i) => (
                      <div key={m.name} className={`milk-opt${selectedMilk === i ? ' active' : ''}`} onClick={() => setSelectedMilk(i)}>
                        <div className="milk-opt-left">
                          <div className="milk-dot" />
                          <div>
                            <div className="milk-name">{m.name}</div>
                            <div className="milk-note">{m.note}</div>
                          </div>
                        </div>
                        <span className={`milk-price${selectedMilk === i ? ' added' : ''}`}>
                          {m.price > 0 ? `+${formatPrice(m.price)}` : m.name === 'No Milk' ? '\u2014' : 'Included'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Syrups */}
              <div className={`option-section${openSections.has('syrup') ? ' open' : ''}`}>
                <div className="option-header" onClick={() => toggleSection('syrup')}>
                  <div className="option-header-left">
                    <div className="option-icon">{'\uD83C\uDF6F'}</div>
                    <div>
                      <div className="option-title">Syrups</div>
                      <div className="option-subtitle">
                        {selectedSyrups.size === 0 ? 'None' : Array.from(selectedSyrups).slice(0, 2).join(', ')}{syrupTotal > 0 ? ` +${formatPrice(syrupTotal)}` : ''}
                      </div>
                    </div>
                  </div>
                  <ChevronIcon />
                </div>
                <div className="option-body">
                  <div className="chip-grid">
                    {SYRUPS.map((s) => (
                      <button
                        key={s.name}
                        className={`flavor-chip${selectedSyrups.has(s.name) ? ' active' : ''}`}
                        onClick={() => toggleChip(selectedSyrups, s.name, setSelectedSyrups)}
                      >
                        <span>{s.emoji ? `${s.emoji} ` : ''}{s.name}</span>
                        <span className="chip-price">{s.price > 0 ? `+${formatPrice(s.price)}` : 'Free'}</span>
                        {selectedSyrups.has(s.name) && <span className="chip-check">{'\u2713'}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Toppings */}
              <div className={`option-section${openSections.has('topping') ? ' open' : ''}`}>
                <div className="option-header" onClick={() => toggleSection('topping')}>
                  <div className="option-header-left">
                    <div className="option-icon">{'\u2728'}</div>
                    <div>
                      <div className="option-title">Toppings</div>
                      <div className="option-subtitle">
                        {selectedToppings.size === 0 ? 'None selected' : Array.from(selectedToppings).slice(0, 2).join(', ')}{toppingTotal > 0 ? ` +${formatPrice(toppingTotal)}` : ''}
                      </div>
                    </div>
                  </div>
                  <ChevronIcon />
                </div>
                <div className="option-body">
                  <div className="chip-grid">
                    {TOPPINGS.map((t) => (
                      <button
                        key={t.name}
                        className={`flavor-chip${selectedToppings.has(t.name) ? ' active' : ''}`}
                        onClick={() => toggleChip(selectedToppings, t.name, setSelectedToppings)}
                      >
                        <span>{t.emoji ? `${t.emoji} ` : ''}{t.name}</span>
                        <span className="chip-price">{t.price > 0 ? `+${formatPrice(t.price)}` : 'Free'}</span>
                        {selectedToppings.has(t.name) && <span className="chip-check">{'\u2713'}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            <div style={{ height: 100 }} />
          </div>

          {/* Add to Cart Bar */}
          <div className="atc-bar">
            <button className="atc-btn">
              <div className="atc-left">
                <div className="qty-stepper">
                  <button className="qty-btn" onClick={(e) => { e.stopPropagation(); setQty((q) => Math.max(1, q - 1)); }}>{'\u2212'}</button>
                  <span className="qty-num">{qty}</span>
                  <button className="qty-btn" onClick={(e) => { e.stopPropagation(); setQty((q) => q + 1); }}>+</button>
                </div>
                <span className="atc-text">Add to Cart</span>
              </div>
              <span className="atc-price">{formatPrice(totalPrice)}</span>
            </button>
          </div>

          <div className="theme-switcher-dock"><ThemeSwitcher /></div>
        </div>
      </IonContent>
    </IonPage>
  );
};

const ChevronIcon: React.FC = () => (
  <div className="option-chevron">
    <svg width="20" height="20" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" stroke="var(--theme-textSecondary)" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
  </div>
);

export default DrinkCustomizer;
