import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { mockUser } from '../../test/helpers';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    business: null,
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    refreshBusiness: vi.fn(),
  }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import MenuManagement from '../MenuManagement';

describe('MenuManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] }),
    });
  });

  const renderMenu = () =>
    render(
      <MemoryRouter>
        <MenuManagement />
      </MemoryRouter>
    );

  it('renders "Menu Management" heading', () => {
    renderMenu();
    expect(screen.getByText('Menu Management')).toBeInTheDocument();
  });

  it('renders subtitle', () => {
    renderMenu();
    expect(screen.getByText('Manage your drink offerings and customizations')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    renderMenu();
    expect(screen.getByText('Loading catalog...')).toBeInTheDocument();
  });

  it('shows tab buttons after loading', async () => {
    renderMenu();
    await waitFor(() => {
      expect(screen.getByText(/Categories \(/)).toBeInTheDocument();
      expect(screen.getByText(/Drink Bases \(/)).toBeInTheDocument();
      expect(screen.getByText(/Modifiers \(/)).toBeInTheDocument();
    });
  });

  it('shows "View Square Items" tab', async () => {
    renderMenu();
    await waitFor(() => {
      expect(screen.getByText('View Square Items')).toBeInTheDocument();
    });
  });

  it('shows empty state for categories when none exist', async () => {
    renderMenu();
    await waitFor(() => {
      expect(screen.getByText(/No categories found/)).toBeInTheDocument();
    });
  });

  it('shows "Add Category" button', async () => {
    renderMenu();
    await waitFor(() => {
      expect(screen.getByText('Add Category')).toBeInTheDocument();
    });
  });

  it('switches to Drink Bases tab when clicked', async () => {
    const user = userEvent.setup();
    renderMenu();
    await waitFor(() => {
      expect(screen.getByText(/Drink Bases \(/)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/Drink Bases \(/));
    expect(screen.getByText('Add Base')).toBeInTheDocument();
  });

  it('switches to Modifiers tab when clicked', async () => {
    const user = userEvent.setup();
    renderMenu();
    await waitFor(() => {
      expect(screen.getByText(/Modifiers \(/)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/Modifiers \(/));
    expect(screen.getByText('Add Modifier')).toBeInTheDocument();
  });

  it('opens Add Category modal when "Add Category" is clicked', async () => {
    const user = userEvent.setup();
    renderMenu();
    await waitFor(() => {
      expect(screen.getByText('Add Category')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Add Category'));
    expect(screen.getByText('Add Category', { selector: 'h2' })).toBeInTheDocument();
    expect(screen.getByText('Name *')).toBeInTheDocument();
  });
});
