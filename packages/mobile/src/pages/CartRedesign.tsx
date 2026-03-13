import React, { useState, useMemo } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { useHistory } from 'react-router';
import { ThemeSwitcher } from '../components/design-system';
import './CartRedesign.css';

interface CartItemData {
  id: string;
  name: string;
  mods: string[];
  price: number;
  qty: number;
}

const INITIAL_ITEMS: CartItemData[] = [
  { id: '1', name: 'Vanilla Oat Latte', mods: ['Medium', 'Hot', 'Oat milk', 'Vanilla'], price: 6.75, qty: 1 },
  { id: '2', name: 'Nitro Cold Brew', mods: ['Large', 'Iced', 'No milk'], price: 6.50, qty: 1 },
];

const TAX_RATE = 0.0825;

const CartRedesign: React.FC = () => {
  const history = useHistory();
  const [items, setItems] = useState<CartItemData[]>(INITIAL_ITEMS);

  const updateQty = (id: string, delta: number) => {
    setItems((prev) => prev.map((item) =>
      item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item
    ));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.price * i.qty, 0), [items]);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  const itemCount = items.reduce((sum, i) => sum + i.qty, 0);
  const fmt = (n: number) => `$${n.toFixed(2)}`;

  return (
    <IonPage>
      <IonContent fullscreen scrollY={false} className="cart-redesign-page">
        <div className="cart-layout">

          {/* Header */}
          <div className="cart-page-header">
            <button className="back-btn" onClick={() => history.goBack()}>
              <svg width="18" height="18" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" stroke="var(--theme-text)" strokeWidth="2.5" fill="none" strokeLinecap="round"/></svg>
            </button>
            <span className="cart-page-title">My Cart</span>
            <button className="clear-btn" onClick={() => setItems([])}>Clear all</button>
          </div>

          {/* Scroll Content */}
          <div className="scroll-content">

            <div className="section-label-sm">{itemCount} item{itemCount !== 1 ? 's' : ''}</div>

            {items.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-cup">
                  <span style={{ fontSize: 24 }}>{'\u2615'}</span>
                </div>
                <div className="cart-item-details">
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-mods">
                    {item.mods.map((m) => (
                      <span key={m} className="mod-tag">{m}</span>
                    ))}
                  </div>
                  <div className="cart-item-bottom">
                    <div className="cart-item-price">{fmt(item.price)}</div>
                    <div className="qty-control">
                      <button className="qty-btn" onClick={() => updateQty(item.id, -1)}>{'\u2212'}</button>
                      <span className="qty-num">{item.qty}</span>
                      <button className="qty-btn" onClick={() => updateQty(item.id, 1)}>+</button>
                    </div>
                  </div>
                </div>
                <button className="delete-btn" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.name}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" stroke="#E53E3E" strokeWidth="2" fill="none"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="#E53E3E" strokeWidth="2" fill="none"/><path d="M10 11v6M14 11v6" stroke="#E53E3E" strokeWidth="2" fill="none"/></svg>
                </button>
              </div>
            ))}

            {/* Add another drink */}
            <button className="add-more-btn" onClick={() => history.push('/home')}>
              <div className="add-more-icon">
                <svg width="14" height="14" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" stroke="var(--theme-primary)" strokeWidth="2.5"/><line x1="5" y1="12" x2="19" y2="12" stroke="var(--theme-primary)" strokeWidth="2.5"/></svg>
              </div>
              <span>Add another drink</span>
            </button>

            {/* Promo code */}
            <div className="promo-row">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="12" rx="3" stroke="var(--theme-textSecondary)" strokeWidth="2"/><circle cx="12" cy="12" r="2" fill="var(--theme-textSecondary)"/></svg>
              <span className="promo-text">Add promo code</span>
              <span className="promo-arrow">{'\u203A'}</span>
            </div>

            {/* Order notes */}
            <div className="notes-field">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="var(--theme-textSecondary)" strokeWidth="2"/><polyline points="14 2 14 8 20 8" stroke="var(--theme-textSecondary)" strokeWidth="2" fill="none"/><line x1="16" y1="13" x2="8" y2="13" stroke="var(--theme-textSecondary)" strokeWidth="2"/><line x1="16" y1="17" x2="8" y2="17" stroke="var(--theme-textSecondary)" strokeWidth="2"/></svg>
              <span className="notes-text">Add order notes (allergies, special requests&hellip;)</span>
            </div>

            {/* Order Summary */}
            <div className="summary-card">
              <div className="summary-title">Order Summary</div>
              <div className="summary-row">
                <span className="summary-label">Subtotal</span>
                <span className="summary-value">{fmt(subtotal)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Tax (8.25%)</span>
                <span className="summary-value">{fmt(tax)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Service fee</span>
                <span className="summary-value">$0.00</span>
              </div>
              <div className="summary-divider" />
              <div className="summary-row">
                <span className="summary-total-label">Total</span>
                <span className="summary-total-value">{fmt(total)}</span>
              </div>
            </div>

            <div style={{ height: 100 }} />
          </div>

          {/* Checkout Bar */}
          <div className="checkout-bar">
            <button className="checkout-btn" onClick={() => history.push('/checkout')}>
              <div className="checkout-btn-left">
                <span className="item-count-badge">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                <span className="checkout-label">Proceed to Checkout</span>
              </div>
              <span className="checkout-total">{fmt(total)}</span>
            </button>
          </div>

          <div className="theme-switcher-dock"><ThemeSwitcher /></div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default CartRedesign;
