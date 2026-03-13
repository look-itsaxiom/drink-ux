import { useState } from 'react';
import { Link } from 'react-router-dom';

const ADMIN_URL = import.meta.env.VITE_ADMIN_URL || 'http://localhost:3002';
const DEMO_URL = import.meta.env.VITE_DEMO_URL || 'https://look-itsaxiom.github.io/drink-ux/';

function App() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Integrate with email capture service
    console.log('Lead captured:', email);
    setSubmitted(true);
  };

  return (
    <div className="marketing-site">
      {/* Navigation */}
      <nav className="nav">
        <div className="nav-container">
          <a href="/" className="logo">
            <span className="logo-icon" aria-hidden="true">&#9749;</span>
            <span className="logo-text">drink-ux</span>
          </a>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#pricing">Pricing</a>
            <a href={DEMO_URL} className="btn btn-secondary" target="_blank" rel="noopener noreferrer">Try Demo</a>
            <a href={`${ADMIN_URL}/signup`} className="btn btn-primary">Get Started</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Mobile ordering that customers <em>actually enjoy</em></h1>
          <p className="hero-subtitle">
            Transform your coffee shop with an interactive drink builder.
            Customers customize their perfect drink while orders flow directly to your Square POS.
          </p>
          <div className="hero-cta">
            <a href={`${ADMIN_URL}/signup`} className="btn btn-primary btn-large">
              Start Free Trial
            </a>
            <a href={DEMO_URL} className="btn btn-secondary btn-large" target="_blank" rel="noopener noreferrer">
              Try Live Demo
            </a>
          </div>
          <p className="hero-note">No credit card required. 14-day free trial.</p>
        </div>
        <div className="hero-visual">
          <div className="phone-mockup">
            <div className="phone-screen">
              <div className="drink-preview">
                <div className="drink-cup">
                  <div className="drink-layer milk"></div>
                  <div className="drink-layer coffee"></div>
                  <div className="drink-layer foam"></div>
                </div>
                <div className="drink-label">Vanilla Oat Latte</div>
                <div className="drink-mods">+ Oat Milk + Vanilla + Extra Shot</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Solution */}
      <section className="problem-section">
        <div className="container">
          <div className="problem-grid">
            <div className="problem-item">
              <div className="problem-icon">😤</div>
              <h3>Long lines frustrate customers</h3>
              <p>Peak hours mean lost sales and unhappy regulars</p>
            </div>
            <div className="problem-item">
              <div className="problem-icon">📝</div>
              <h3>Complex orders get lost</h3>
              <p>"Oat milk vanilla latte with an extra shot, light ice" - written wrong again</p>
            </div>
            <div className="problem-item">
              <div className="problem-icon">💸</div>
              <h3>Generic ordering apps feel impersonal</h3>
              <p>Your unique drink menu deserves better than a boring list</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="how-it-works">
        <div className="container">
          <h2>How It Works</h2>
          <p className="section-subtitle">Get your shop on drink-ux in three simple steps</p>

          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Connect Your Square Account</h3>
                <p>
                  One-click OAuth integration. We securely connect to your Square POS
                  to sync your menu and receive orders.
                </p>
              </div>
            </div>

            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>We Transform Your Menu</h3>
                <p>
                  Our AI analyzes your existing menu and converts it into an interactive
                  drink builder format. Review and customize as needed.
                </p>
              </div>
            </div>

            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Share Your Custom Link</h3>
                <p>
                  Get your branded storefront at <strong>yourshop.drink-ux.com</strong>.
                  Customers order, you make drinks. Orders appear in Square automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="features">
        <div className="container">
          <h2>Built for Coffee Shops</h2>
          <p className="section-subtitle">Everything you need to offer a delightful mobile ordering experience</p>

          <div className="features-grid">
            <div className="feature">
              <div className="feature-icon">🎨</div>
              <h3>Visual Drink Builder</h3>
              <p>
                Customers see their drink come to life as they customize.
                Choose base, milk, syrups, and toppings with an animated preview.
              </p>
            </div>

            <div className="feature">
              <div className="feature-icon">🔗</div>
              <h3>Direct Square Integration</h3>
              <p>
                Orders sync instantly to your Square POS. No tablet juggling,
                no manual entry, no missed orders.
              </p>
            </div>

            <div className="feature">
              <div className="feature-icon">✨</div>
              <h3>AI Menu Setup</h3>
              <p>
                Import your Square catalog and let our AI organize it into
                the drink builder format. Up and running in minutes.
              </p>
            </div>

            <div className="feature">
              <div className="feature-icon">📱</div>
              <h3>Your Branded Storefront</h3>
              <p>
                Custom subdomain, your colors, your logo. Customers experience
                your brand, not ours.
              </p>
            </div>

            <div className="feature">
              <div className="feature-icon">⚡</div>
              <h3>Real-Time Updates</h3>
              <p>
                86 an item? Toggle availability instantly.
                Customers always see your current menu.
              </p>
            </div>

            <div className="feature">
              <div className="feature-icon">📊</div>
              <h3>Simple Dashboard</h3>
              <p>
                Manage your menu, track orders, and see what's popular.
                No complexity, just what you need.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Placeholder */}
      <section className="social-proof">
        <div className="container">
          <p className="testimonial-placeholder">
            "drink-ux made our morning rush so much smoother.
            Customers love building their drinks, and orders come through perfectly every time."
          </p>
          <p className="testimonial-author">— Future Happy Customer</p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="pricing">
        <div className="container">
          <h2>Simple, Transparent Pricing</h2>
          <p className="section-subtitle">One plan. Everything included. No surprises.</p>

          <div className="pricing-card">
            <div className="pricing-header">
              <h3>Pro Plan</h3>
              <div className="price">
                <span className="amount">$49</span>
                <span className="period">/month</span>
              </div>
            </div>

            <ul className="pricing-features">
              <li>Unlimited orders</li>
              <li>Visual drink builder</li>
              <li>Square POS integration</li>
              <li>Custom branded storefront</li>
              <li>Menu management dashboard</li>
              <li>AI-powered menu setup</li>
              <li>Real-time availability updates</li>
              <li>Email support</li>
            </ul>

            <a href={`${ADMIN_URL}/signup`} className="btn btn-primary btn-large btn-block">
              Start 14-Day Free Trial
            </a>
            <p className="pricing-note">No credit card required</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <h2>Ready to transform your ordering experience?</h2>
          <p>Join coffee shops using drink-ux to delight customers and streamline operations.</p>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="email-form">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary">
                Get Started
              </button>
            </form>
          ) : (
            <div className="success-message">
              <p>Thanks! We'll be in touch soon.</p>
              <a href={`${ADMIN_URL}/signup`} className="btn btn-primary">
                Or sign up now
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <span className="logo-icon" aria-hidden="true">&#9749;</span>
              <span className="logo-text">drink-ux</span>
              <p>Visual mobile ordering for coffee shops</p>
            </div>
            <div className="footer-links">
              <div className="footer-column">
                <h4>Product</h4>
                <a href="#features">Features</a>
                <a href="#how-it-works">How It Works</a>
                <a href="#pricing">Pricing</a>
              </div>
              <div className="footer-column">
                <h4>Resources</h4>
                <a href={DEMO_URL} target="_blank" rel="noopener noreferrer">Live Demo</a>
                <a href="mailto:support@drink-ux.com">Support</a>
              </div>
              <div className="footer-column">
                <h4>Legal</h4>
                <Link to="/terms">Terms of Service</Link>
                <Link to="/privacy">Privacy Policy</Link>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} drink-ux. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
