import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { mockUser, mockBusiness } from '../../test/helpers';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    business: mockBusiness,
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    refreshBusiness: vi.fn(),
  }),
}));

// Mock fetch to return empty data — save original for restore
const mockFetch = vi.fn();
const originalFetch = global.fetch;
global.fetch = mockFetch;

import Dashboard from '../Dashboard';

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    // Default: all fetches return empty success
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] }),
    });
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  const renderDashboard = () =>
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

  it('renders "Dashboard" heading', async () => {
    renderDashboard();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders "Overview of your business" subtitle', () => {
    renderDashboard();
    expect(screen.getByText('Overview of your business')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    renderDashboard();
    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
  });

  it('shows business name after loading', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Test Coffee Shop')).toBeInTheDocument();
    });
  });

  it('shows "Business Information" section after loading', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Business Information')).toBeInTheDocument();
    });
  });

  it('shows "Trial" subscription status for trial business', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Trial')).toBeInTheDocument();
    });
  });

  it('shows "Manage Menu" quick action', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Manage Menu')).toBeInTheDocument();
    });
  });

  it('shows "Categories" stat card', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Categories')).toBeInTheDocument();
    });
  });

  it('shows "POS Status" stat card', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('POS Status')).toBeInTheDocument();
    });
  });

  it('shows "Not Connected" for POS when no merchant ID', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Not Connected')).toBeInTheDocument();
    });
  });

  it('shows "Complete Your Setup" when not fully configured', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Complete Your Setup')).toBeInTheDocument();
    });
  });
});
