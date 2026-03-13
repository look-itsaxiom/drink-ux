import React, { useState, useMemo } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { useHistory } from 'react-router';
import { ThemeSwitcher } from '../components/design-system';
import './CheckoutRedesign.css';

interface OrderItem {
  id: string;
  name: string;
  mods: string[];
  price: number;
  qty: number;
}

const SAMPLE_ORDER: OrderItem[] = [
  { id: '1', name: 'Iced Latte', mods: ['Large', 'Oat Milk', 'Vanilla +$0.75'], price: 6.75, qty: 1 },
  { id: '2', name: 'Cappuccino', mods: ['Medium', 'Hot', 'Whole Milk'], price: 4.25, qty: 1 },
  { id: '3', name: 'Matcha Latte', mods: ['Large', 'Oat Milk'], price: 5.75, qty: 2 },
];

const TAX_RATE = 0.085;

const CheckoutRedesign: React.FC = () => {
  const history = useHistory();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const subtotal = useMemo(() => SAMPLE_ORDER.reduce((s, i) => s + i.price * i.qty, 0), []);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  const itemCount = SAMPLE_ORDER.reduce((s, i) => s + i.qty, 0);
  const fmt = (n: number) => `$${n.toFixed(2)}`;

  const handlePlaceOrder = () => {
    setShowSuccess(true);
  };

  if (showSuccess) {
    return (
      <IonPage>
        <IonContent fullscreen scrollY={false} className="checkout-redesign-page">
          <div className="success-overlay show">
            <div className="success-ring">{'\u2713'}</div>
            <div className="success-pickup">4:30</div>
            <div className="success-label">Estimated Pickup</div>
            <div className="success-title">Order Confirmed!</div>
            <div className="success-sub">Your drinks are being prepared with care. We&rsquo;ll text you when they&rsquo;re ready.</div>
            <button className="success-btn" onClick={() => history.push('/home')}>Back to Menu</button>
            <div className="success-order-num">Order #BRW-4821</div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent fullscreen scrollY={false} className="checkout-redesign-page">
        <div className="checkout-layout">

          {/* Top Nav */}
          <div className="checkout-top-nav">
            <button className="checkout-back-btn" onClick={() => history.goBack()}>
              <svg width="14" height="14" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/></svg>
            </button>
            <div>
              <div className="checkout-nav-title">Checkout</div>
              <div className="checkout-nav-sub">{itemCount} items</div>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="checkout-scroll-body">

            <div className="co-section-head">Your Order</div>

            {/* Order items */}
            <div className="co-summary-card">
              {SAMPLE_ORDER.map((item) => (
                <div key={item.id} className="co-order-item">
                  <div className="co-cup-thumb">
                    <span style={{ fontSize: 22 }}>{'\u2615'}</span>
                  </div>
                  <div className="co-item-info">
                    <div className="co-item-name">{item.name}</div>
                    <div className="co-item-mods">
                      {item.mods.map((m) => (
                        <span key={m} className="co-mod-tag">{m}</span>
                      ))}
                    </div>
                  </div>
                  <div className="co-item-qty-price">
                    <div className="co-item-price">{fmt(item.price * item.qty)}</div>
                    <div className="co-item-qty">{'\u00D7'}{item.qty}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Promo code */}
            <div className="co-section-head">Promo Code</div>
            <div className="co-promo-row">
              <span style={{ fontSize: 16 }}>{'\uD83C\uDFF7\uFE0F'}</span>
              <input className="co-promo-input" type="text" placeholder="Enter promo or gift code" />
              <span className="co-promo-apply">Apply</span>
            </div>

            {/* Totals */}
            <div className="co-section-head">Order Total</div>
            <div className="co-totals-card">
              <div className="co-total-row">
                <span>Subtotal ({itemCount} items)</span>
                <span>{fmt(subtotal)}</span>
              </div>
              <div className="co-total-row">
                <span>Tax (8.5%)</span>
                <span>{fmt(tax)}</span>
              </div>
              <div className="co-total-row">
                <span>Service fee</span>
                <span>$0.00</span>
              </div>
              <div className="co-total-divider" />
              <div className="co-total-row co-bold">
                <span>Total</span>
                <span>{fmt(total)}</span>
              </div>
            </div>

            {/* Customer info */}
            <div className="co-section-head">Your Details</div>
            <div className="co-form-section">
              <div>
                <div className="co-field-label">Name (for pickup)</div>
                <input
                  className={`co-field-input${name ? ' filled' : ''}`}
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <div className="co-field-label">Email (receipt)</div>
                <input
                  className={`co-field-input${email ? ' filled' : ''}`}
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Payment */}
            <div className="co-section-head">Payment</div>
            <div className="co-payment-card">
              <div className="co-payment-header">
                <div className="co-payment-title">
                  <span>{'\uD83D\uDD12'}</span>
                  <span>Secure Payment</span>
                </div>
                <div className="co-payment-badges">
                  <span className="co-pay-badge">VISA</span>
                  <span className="co-pay-badge">MC</span>
                  <span className="co-pay-badge">AMEX</span>
                </div>
              </div>

              <div className="co-square-frame">
                <div>
                  <div className="co-sq-field-label">Card Number</div>
                  <div className="co-sq-field">
                    <span className="co-sq-field-value" style={{ letterSpacing: 1 }}>{'\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 4242'}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 18 }}>{'\uD83D\uDCB3'}</span>
                  </div>
                </div>
                <div className="co-sq-row">
                  <div>
                    <div className="co-sq-field-label">Expiry</div>
                    <div className="co-sq-field">
                      <span className="co-sq-field-value">12 / 27</span>
                    </div>
                  </div>
                  <div>
                    <div className="co-sq-field-label">CVV</div>
                    <div className="co-sq-field">
                      <span className="co-sq-field-value" style={{ letterSpacing: 2 }}>{'\u2022\u2022\u2022'}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="co-sq-field-label">Zip / Postal Code</div>
                  <div className="co-sq-field">
                    <span className="co-sq-field-text">Enter zip for verification</span>
                  </div>
                </div>
                <div className="co-sq-powered">
                  <span>{'\uD83D\uDD10'}</span>
                  <span>Powered by Square {'\u00B7'} PCI-DSS Level 1 certified</span>
                </div>
              </div>
            </div>

            {/* Trust badges */}
            <div className="co-trust-row">
              <div className="co-trust-item"><span>{'\uD83D\uDD12'}</span><span>256-bit SSL</span></div>
              <div className="co-trust-item"><span>{'\u2713'}</span><span>PCI Compliant</span></div>
              <div className="co-trust-item"><span>{'\u21A9'}</span><span>Easy refunds</span></div>
            </div>

            <div style={{ height: 120 }} />
          </div>

          {/* Fixed bottom bar */}
          <div className="co-bottom-bar">
            <button className="co-place-btn" onClick={handlePlaceOrder}>
              <span>Place Order</span>
              <span className="co-btn-total">{'\u00B7'} {fmt(total)}</span>
            </button>
          </div>

          <div className="theme-switcher-dock"><ThemeSwitcher /></div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default CheckoutRedesign;
