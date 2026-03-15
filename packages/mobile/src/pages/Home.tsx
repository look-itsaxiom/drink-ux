import { IonContent, IonPage, IonSpinner } from '@ionic/react';
import { useHistory } from 'react-router';
import { useState, useMemo } from 'react';
import { useBusinessContext } from '../context/BusinessContext';
import { useCatalogContext } from '../context/CatalogContext';
import { useCart } from '../hooks/useCart';
import { ThemeSwitcher, CategoryPills } from '../components/design-system';
import { MappedBase, getDisplayPrice } from '../services/catalogService';
import './Home.css';

/**
 * Format cents to dollar display
 */
function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const Home: React.FC = () => {
  const history = useHistory();
  const [activeCategory, setActiveCategory] = useState('All');

  let businessData: { business: { name: string } | null; loading: boolean; error: string | null } = {
    business: null, loading: false, error: null,
  };
  try { businessData = useBusinessContext(); } catch { /* defaults */ }

  let catalogData: ReturnType<typeof useCatalogContext> | null = null;
  try { catalogData = useCatalogContext(); } catch { /* defaults */ }

  let cartData: { itemCount: number; total: number } = { itemCount: 0, total: 0 };
  try { const cart = useCart(); cartData = { itemCount: cart.itemCount, total: cart.total }; } catch { /* defaults */ }

  const { business, loading } = businessData;
  const shopName = business?.name || 'Order';

  // Build category pills from API data
  const categoryNames = useMemo(() => {
    if (!catalogData?.categories || catalogData.categories.length === 0) return ['All'];
    return ['All', ...catalogData.categories.map(c => c.name)];
  }, [catalogData?.categories]);

  // Get items to display based on active category
  const displayItems = useMemo((): MappedBase[] => {
    if (!catalogData?.bases) return [];
    if (activeCategory === 'All') return catalogData.bases;
    return catalogData.bases.filter(b =>
      b.category.toLowerCase() === activeCategory.toLowerCase()
    );
  }, [catalogData?.bases, activeCategory]);

  // Featured items: first 4 items, or items with images
  const featuredItems = useMemo(() => {
    if (!catalogData?.bases || catalogData.bases.length === 0) return [];
    const withImages = catalogData.bases.filter(b => b.imageUrl);
    if (withImages.length >= 2) return withImages.slice(0, 4);
    return catalogData.bases.slice(0, 4);
  }, [catalogData?.bases]);

  const handleItemClick = (item: MappedBase) => {
    // Navigate to drink builder — item will be selected via the catalog flow
    history.push('/drink/new');
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent fullscreen className="home-page">
          <div className="loading-container"><IonSpinner name="crescent" /><p>Loading...</p></div>
        </IonContent>
      </IonPage>
    );
  }

  const hasMenu = catalogData && catalogData.bases.length > 0;

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
                  <div className="shop-tagline">Open now</div>
                </div>
              </div>
              <div className="header-actions">
                <button className="icon-btn" aria-label="Favorites">
                  <svg width="20" height="20" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="white" strokeWidth="2" fill="none"/></svg>
                </button>
                <button className="icon-btn" onClick={() => history.push('/cart')} aria-label="Cart">
                  <svg width="20" height="20" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="white" strokeWidth="2" fill="none"/><line x1="3" y1="6" x2="21" y2="6" stroke="white" strokeWidth="2"/><path d="M16 10a4 4 0 01-8 0" stroke="white" strokeWidth="2" fill="none"/></svg>
                  <div className="cart-badge">{cartData.itemCount}</div>
                </button>
              </div>
            </div>
            <div className="search-bar">
              <svg width="16" height="16" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" stroke="rgba(255,255,255,0.7)" strokeWidth="2" fill="none"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke="rgba(255,255,255,0.7)" strokeWidth="2"/></svg>
              <span className="search-bar-placeholder">Search menu&hellip;</span>
            </div>
          </header>

          {/* Scrollable Content */}
          <div className="scroll-content">
            <CategoryPills categories={categoryNames} active={activeCategory} onSelect={setActiveCategory} />

            {/* Featured Items */}
            {featuredItems.length > 0 && activeCategory === 'All' && (
              <div className="featured-section">
                <div className="section-header">
                  <div>
                    <div className="section-label">{'\u2B50'} Popular Items</div>
                    <div className="section-sublabel">Top picks, ready to order</div>
                  </div>
                  <button className="see-all" onClick={() => history.push('/drink/new')}>Order</button>
                </div>
                <div className="h-scroll">
                  {featuredItems.map((item) => {
                    const { price, hasMultiple } = getDisplayPrice(item);
                    return (
                      <div key={item.squareItemId} className="drink-card" style={{ width: 150 }} onClick={() => handleItemClick(item)}>
                        <div className="drink-card-visual" style={{
                          background: item.imageUrl
                            ? `url(${item.imageUrl}) center/cover`
                            : 'linear-gradient(160deg, rgba(212,165,116,0.3), rgba(107,66,38,0.15))'
                        }}>
                          {!item.imageUrl && <span style={{ fontSize: 32 }}>{'\uD83C\uDF7D'}</span>}
                        </div>
                        <div className="drink-card-info">
                          <div className="drink-card-name">{item.name}</div>
                          {item.description && (
                            <div className="drink-card-detail">{item.description}</div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                            <span className="drink-card-price">
                              {hasMultiple ? 'from ' : ''}{formatPrice(price)}
                            </span>
                            <button className="drink-card-add-btn" onClick={(e) => { e.stopPropagation(); handleItemClick(item); }} aria-label={`Add ${item.name}`}>+</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="divider" />

            {/* Menu Items */}
            {hasMenu ? (
              <div className="menu-section">
                <div className="section-header">
                  <div>
                    <div className="section-label">
                      {activeCategory === 'All' ? 'Full Menu' : activeCategory}
                    </div>
                    <div className="section-sublabel">{displayItems.length} items</div>
                  </div>
                </div>
                <div className="menu-items">
                  {displayItems.map((item) => {
                    const { price, hasMultiple } = getDisplayPrice(item);
                    return (
                      <div key={item.squareItemId} className="menu-item" onClick={() => handleItemClick(item)}>
                        <div className="item-visual" style={{
                          background: item.imageUrl
                            ? `url(${item.imageUrl}) center/cover`
                            : 'linear-gradient(135deg, rgba(107,66,38,0.08), rgba(212,165,116,0.15))'
                        }}>
                          {!item.imageUrl && <span style={{ fontSize: 24 }}>{'\uD83C\uDF7D'}</span>}
                        </div>
                        <div className="item-info">
                          <div className="item-name">{item.name}</div>
                          {item.description && <div className="item-desc">{item.description}</div>}
                          <div className="item-meta">
                            <span className="item-price">
                              {hasMultiple ? 'from ' : ''}{formatPrice(price)}
                            </span>
                            {item.variations.length > 1 && (
                              <span className="item-temp-badge">{item.variations.length} options</span>
                            )}
                          </div>
                        </div>
                        <button className="item-add" onClick={(e) => { e.stopPropagation(); handleItemClick(item); }} aria-label={`Add ${item.name}`}>
                          <svg width="18" height="18" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" stroke="white" strokeWidth="2.5"/><line x1="5" y1="12" x2="19" y2="12" stroke="white" strokeWidth="2.5"/></svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="menu-section">
                <div className="section-header">
                  <div>
                    <div className="section-label">Menu</div>
                    <div className="section-sublabel">Connect Square to see your items</div>
                  </div>
                </div>
                <div className="empty-menu">
                  <p>No menu items yet. Start by building your order!</p>
                  <button className="see-all" onClick={() => history.push('/drink/new')}>Build an Order</button>
                </div>
              </div>
            )}

            <div style={{ height: 100 }} />
          </div>

          {/* Cart Bar */}
          <div className="cart-bar-float">
            <button className="cart-bar-btn" onClick={() => history.push('/cart')}>
              <div className="cart-bar-left">
                <div className="cart-count-pill">{cartData.itemCount}</div>
                <span className="cart-bar-text">View Cart</span>
              </div>
              <span className="cart-bar-price">{formatPrice(cartData.total)}</span>
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
