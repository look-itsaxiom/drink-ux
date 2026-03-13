import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Default mock auth values
export const mockUser = {
  id: 'user-1',
  email: 'owner@test.com',
  name: 'Test Owner',
  emailVerified: true,
  businessId: 'biz-1',
};

export const mockBusiness = {
  id: 'biz-1',
  name: 'Test Coffee Shop',
  slug: 'test-coffee',
  accountState: 'active',
  posProvider: null as string | null,
  posMerchantId: null as string | null,
  contactEmail: 'owner@test.com',
  subscriptionStatus: 'trial',
  createdAt: '2025-01-15T00:00:00Z',
};

export const mockAuthContext = {
  user: mockUser,
  business: mockBusiness,
  isLoading: false,
  isAuthenticated: true,
  login: vi.fn(),
  signup: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
  refreshBusiness: vi.fn(),
};

export function renderWithRouter(ui: React.ReactElement, { route = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  );
}
