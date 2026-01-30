import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Business {
  id: string;
  name: string;
}

interface BusinessContextType {
  businessId: string | null;
  business: Business | null;
  loading: boolean;
  error: string | null;
  setBusinessId: (id: string) => void;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

const STORAGE_KEY = 'drink-ux-business-id';

interface BusinessProviderProps {
  children: ReactNode;
}

export const BusinessProvider: React.FC<BusinessProviderProps> = ({ children }) => {
  const [businessId, setBusinessIdState] = useState<string | null>(() => {
    // Check localStorage first, then environment variable
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;

    // Check for environment variable
    const envBusinessId = import.meta.env.VITE_BUSINESS_ID;
    if (envBusinessId) return envBusinessId;

    return null;
  });
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setBusinessId = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setBusinessIdState(id);
  };

  // Fetch business details when businessId changes
  useEffect(() => {
    if (!businessId) {
      setBusiness(null);
      return;
    }

    const fetchBusiness = async () => {
      setLoading(true);
      setError(null);

      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005';
        const response = await fetch(`${apiUrl}/api/businesses/${businessId}`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setBusiness({ id: businessId, name: data.data.name });
          }
        }
      } catch {
        // Silently fail - business details are optional
      } finally {
        setLoading(false);
      }
    };

    fetchBusiness();
  }, [businessId]);

  return (
    <BusinessContext.Provider value={{ businessId, business, loading, error, setBusinessId }}>
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = (): BusinessContextType => {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
};
