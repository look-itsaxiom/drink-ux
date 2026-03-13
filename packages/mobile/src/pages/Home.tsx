import { IonContent, IonPage, IonSpinner } from '@ionic/react';
import { useHistory } from 'react-router';
import { useState } from 'react';
import { useBusinessContext } from '../context/BusinessContext';
import { ThemeSwitcher, CategoryPills } from '../components/design-system';
import './Home.css';

const CATEGORIES = ['All', 'Espresso', 'Iced', 'Tea', 'Blended', 'Seasonal'];

interface DrinkItem {
  id: string;
  name: string;
  description: string;
  price: string;
  tempBadge: string;
  gradient: string;
}

const FEATURED_DRINKS: DrinkItem[] = [
  { id: 'vanilla-oat', name: 'Vanilla Oat Latte', description: 'Oat milk, vanilla syrup', price: '$6.50', tempBadge: 'Hot / Iced', gradient: 'linear-gradient(160deg, rgba(212,165,116,0.3), rgba(107,66,38,0.15))' },
  { id: 'caramel-macchiato', name: 'Caramel Macchiato', description: 'Vanilla, caramel drizzle', price: '$5.75', tempBadge: 'Hot / Iced', gradient: 'linear-gradient(160deg, rgba(230,126,34,0.25), rgba(107,66,38,0.2))' },
  { id: 'matcha-latte', name: 'Matcha Latte', description: 'Oat milk, ceremonial grade', price: '$6.25', tempBadge: 'Hot / Iced', gradient: 'linear-gradient(160deg, rgba(45,155,111,0.2), rgba(45,106,79,0.15))' },
  { id: 'cold-brew', name: 'Nitro Cold Brew', description: 'Smooth, low acid, iced', price: '$5.25', tempBadge: 'Iced only', gradient: 'linear-gradient(160deg, rgba(44,24,16,0.15), rgba(107,66,38,0.2))' },
];

const MENU_ITEMS: DrinkItem[] = [
  { id: 'americano', name: 'Americano', description: 'Espresso shots + hot water. Clean and bold.', price: '$3.75', tempBadge: 'Hot / Iced', gradient: 'linear-gradient(135deg, rgba(107,66,38,0.08), rgba(212,165,116,0.15))' },
  { id: 'flat-white', name: 'Flat White', description: 'Double ristretto, micro-foamed milk', price: '$4.50', tempBadge: 'Hot only', gradient: 'linear-gradient(135deg, rgba(212,165,116,0.1), rgba(255,255,255,0.5))' },
  { id: 'iced-latte', name: 'Iced Latte', description: 'Espresso over ice, your choice of milk', price: '$5.00', tempBadge: 'Iced only', gradient: 'linear-gradient(135deg, rgba(44,24,16,0.08), rgba(107,66,38,0.15))' },
  { id: 'cappuccino', name: 'Cappuccino', description: 'Espresso, steamed milk, thick foam', price: '$4.25', tempBadge: 'Hot only', gradient: 'linear-gradient(135deg, rgba(255,255,255,0.5), rgba(212,165,116,0.1))' },
];

const Home: React.FC = () => {
  const history = useHistory();
  const [activeCategory, setActiveCategory] = useState('All');

  let businessData: { business: { name: string } | null; loading: boolean; error: string | null } = {
    business: null, loading: false, error: null,
  };
  try { businessData = useBusinessContext(); } catch { /* defaults */ }

  const { business, loading } = businessData;
  const shopName = business?.name || 'Brew & Co.';

  const handleDrinkClick = (id: string) => history.push(`/drink/${id}`);

  if (loading) {
    return (
      <IonPage>
        <IonContent fullscreen className="home-page">
          <div className="loading-container"><IonSpinner name="crescent" /><p>Loading...</p></div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent fullscreen scrollY={false} className="home-page">
        <div className="home-layout">

          {/* App Header */}
          <header className="home-header">
            <div className="header-top">
              <div className="shop-logo-name">
                <div className="shop-logo">{'\u2615'}</div>
                <div>
                  <div className="shop-name">{shopName}</div>
                  <div className="shop-tagline">Specialty Coffee &middot; Open now</div>
                </div>
              </div>
              <div className="header-actions">
                <button className="icon-btn" aria-label="Favorites">
                  <svg width="20" height="20" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="white" strokeWidth="2" fill="none"/></svg>
                </button>
                <button className="icon-btn" onClick={() => history.push('/cart')} aria-label="Cart">
                  <svg width="20" height="20" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="white" strokeWidth="2" fill="none"/><line x1="3" y1="6" x2="21" y2="6" stroke="white" strokeWidth="2"/><path d="M16 10a4 4 0 01-8 0" stroke="white" strokeWidth="2" fill="none"/></svg>
                  <div className="cart-badge">0</div>
                </button>
              </div>
            </div>
            <div className="search-bar">
              <svg width="16" height="16" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" stroke="rgba(255,255,255,0.7)" strokeWidth="2" fill="none"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke="rgba(255,255,255,0.7)" strokeWidth="2"/></svg>
              <span className="search-bar-placeholder">Search drinks&hellip;</span>
            </div>
          </header>

          {/* Scrollable Content */}
          <div className="scroll-content">
            <CategoryPills categories={CATEGORIES} active={activeCategory} onSelect={setActiveCategory} />

            {/* Featured Drinks */}
            <div className="featured-section">
              <div className="section-header">
                <div>
                  <div className="section-label">{'\u2B50'} Signature Drinks</div>
                  <div className="section-sublabel">Fan favorites, ready to order</div>
                </div>
                <button className="see-all">See all</button>
              </div>
              <div className="h-scroll">
                {FEATURED_DRINKS.map((drink) => (
                  <div key={drink.id} className="drink-card" style={{ width: 150 }} onClick={() => handleDrinkClick(drink.id)}>
                    <div className="drink-card-visual" style={{ background: drink.gradient }}>
                      <span style={{ fontSize: 32 }}>{'\u2615'}</span>
                    </div>
                    <div className="drink-card-info">
                      <div className="drink-card-name">{drink.name}</div>
                      <div className="drink-card-detail">{drink.description}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                        <span className="drink-card-price">{drink.price}</span>
                        <button className="drink-card-add-btn" onClick={(e) => { e.stopPropagation(); }} aria-label={`Add ${drink.name}`}>+</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="divider" />

            {/* Menu Items */}
            <div className="menu-section">
              <div className="section-header">
                <div>
                  <div className="section-label">Espresso Drinks</div>
                  <div className="section-sublabel">{MENU_ITEMS.length} items</div>
                </div>
              </div>
              <div className="menu-items">
                {MENU_ITEMS.map((item) => (
                  <div key={item.id} className="menu-item" onClick={() => handleDrinkClick(item.id)}>
                    <div className="item-visual" style={{ background: item.gradient }}>
                      <span style={{ fontSize: 24 }}>{'\u2615'}</span>
                    </div>
                    <div className="item-info">
                      <div className="item-name">{item.name}</div>
                      <div className="item-desc">{item.description}</div>
                      <div className="item-meta">
                        <span className="item-price">{item.price}</span>
                        <span className="item-temp-badge">{item.tempBadge}</span>
                      </div>
                    </div>
                    <button className="item-add" onClick={(e) => { e.stopPropagation(); }} aria-label={`Add ${item.name}`}>
                      <svg width="18" height="18" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" stroke="white" strokeWidth="2.5"/><line x1="5" y1="12" x2="19" y2="12" stroke="white" strokeWidth="2.5"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ height: 100 }} />
          </div>

          {/* Cart Bar */}
          <div className="cart-bar-float">
            <button className="cart-bar-btn" onClick={() => history.push('/cart')}>
              <div className="cart-bar-left">
                <div className="cart-count-pill">0</div>
                <span className="cart-bar-text">View Cart</span>
              </div>
              <span className="cart-bar-price">$0.00</span>
            </button>
          </div>

          {/* Theme Switcher (dev) */}
          <div className="theme-switcher-dock"><ThemeSwitcher /></div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
