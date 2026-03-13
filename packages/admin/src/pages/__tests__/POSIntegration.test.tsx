import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { mockUser, mockBusiness } from '../../test/helpers';

const mockRefreshBusiness = vi.fn();

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
    refreshBusiness: mockRefreshBusiness,
  }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import POSIntegration from '../POSIntegration';

describe('POSIntegration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPOS = () =>
    render(
      <MemoryRouter>
        <POSIntegration />
      </MemoryRouter>
    );

  it('renders page heading', () => {
    renderPOS();
    expect(screen.getByText('POS Integration')).toBeInTheDocument();
  });

  it('shows "Disconnected" status when no merchant ID', () => {
    renderPOS();
    expect(screen.getByText(/Disconnected/)).toBeInTheDocument();
  });

  it('renders provider select with Square as default', () => {
    renderPOS();
    const select = screen.getByLabelText('Select POS Provider') as HTMLSelectElement;
    expect(select.value).toBe('square');
  });

  it('renders controlled form inputs', async () => {
    const user = userEvent.setup();
    renderPOS();

    const apiKeyInput = screen.getByLabelText('API Key / Access Token') as HTMLInputElement;
    const merchantInput = screen.getByLabelText('Merchant ID') as HTMLInputElement;
    const locationInput = screen.getByLabelText('Location ID') as HTMLInputElement;

    await user.type(merchantInput, 'merch-123');
    expect(merchantInput.value).toBe('merch-123');

    await user.type(locationInput, 'loc-456');
    expect(locationInput.value).toBe('loc-456');

    await user.type(apiKeyInput, 'secret-key');
    expect(apiKeyInput.value).toBe('secret-key');
  });

  it('calls save endpoint on form submit', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    renderPOS();

    await user.type(screen.getByLabelText('Merchant ID'), 'merch-123');
    await user.click(screen.getByRole('button', { name: 'Save Configuration' }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/pos/config'),
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  it('shows success message after save', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    renderPOS();

    await user.click(screen.getByRole('button', { name: 'Save Configuration' }));

    expect(await screen.findByText('Configuration saved successfully.')).toBeInTheDocument();
  });

  it('calls test endpoint on Test Connection click', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    renderPOS();

    await user.click(screen.getByRole('button', { name: 'Test Connection' }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/pos/test'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('shows connection test result', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    renderPOS();

    await user.click(screen.getByRole('button', { name: 'Test Connection' }));

    expect(await screen.findByText('Connection successful!')).toBeInTheDocument();
  });

  it('disables Sync Menu Now when POS is not connected', () => {
    renderPOS();
    const syncBtn = screen.getByRole('button', { name: 'Sync Menu Now' });
    expect(syncBtn).toBeDisabled();
  });

  it('shows "Menu Sync" section', () => {
    renderPOS();
    expect(screen.getByText('Menu Sync')).toBeInTheDocument();
  });
});
