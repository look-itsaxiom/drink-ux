import { Route, Redirect } from 'react-router';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import Home from './pages/Home';
import DrinkBuilder from './pages/DrinkBuilder';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import { ThemeProvider } from './theme';
import { AppProvider, useBusinessContext } from './context';
import { SubscriptionGate } from './components/SubscriptionGate';
import { getSubdomain } from './services/businessService';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme CSS */
import './theme/theme.css';

setupIonicReact();

/**
 * Protected routes wrapper that checks subscription status
 */
function ProtectedRoutes(): React.ReactElement {
  const { business } = useBusinessContext();
  const subdomain = getSubdomain();

  // If no subdomain detected, render routes without subscription gate
  // This handles development without a business context
  if (!subdomain) {
    return (
      <IonRouterOutlet>
        <Route path="/home" component={Home} exact />
        <Route path="/drink/:id" component={DrinkBuilder} exact />
        <Route path="/cart" component={Cart} exact />
        <Route path="/checkout" component={Checkout} exact />
        <Route path="/order/:orderId" component={OrderConfirmation} exact />
        <Route path="/" exact>
          <Redirect to="/home" />
        </Route>
      </IonRouterOutlet>
    );
  }

  // Check for preview mode via query parameter
  const searchParams = new URLSearchParams(window.location.search);
  const previewMode = searchParams.get('preview') === 'true';

  return (
    <SubscriptionGate
      subdomain={subdomain}
      businessName={business?.name}
      logoUrl={business?.theme?.logoUrl}
      primaryColor={business?.theme?.primaryColor}
      previewMode={previewMode}
    >
      <IonRouterOutlet>
        <Route path="/home" component={Home} exact />
        <Route path="/drink/:id" component={DrinkBuilder} exact />
        <Route path="/cart" component={Cart} exact />
        <Route path="/checkout" component={Checkout} exact />
        <Route path="/order/:orderId" component={OrderConfirmation} exact />
        <Route path="/" exact>
          <Redirect to="/home" />
        </Route>
      </IonRouterOutlet>
    </SubscriptionGate>
  );
}

const App: React.FC = () => (
  <ThemeProvider>
    <AppProvider>
      <IonApp>
        <IonReactRouter basename={import.meta.env.BASE_URL}>
          <ProtectedRoutes />
        </IonReactRouter>
      </IonApp>
    </AppProvider>
  </ThemeProvider>
);

export default App;
