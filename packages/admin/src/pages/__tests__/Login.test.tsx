import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    business: null,
    isLoading: false,
    isAuthenticated: false,
    signup: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    refreshBusiness: vi.fn(),
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import Login from '../Login';

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderLogin = () =>
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

  it('renders login form with email and password fields', () => {
    renderLogin();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('renders "Sign in" button', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('renders sign up link', () => {
    renderLogin();
    expect(screen.getByText('Sign up')).toBeInTheDocument();
  });

  it('renders "Forgot password?" button', () => {
    renderLogin();
    expect(screen.getByText('Forgot password?')).toBeInTheDocument();
  });

  it('calls login with email and password on form submit', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce(undefined);
    renderLogin();

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
  });

  it('shows error message when login fails', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
    renderLogin();

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
  });

  it('navigates to dashboard after successful login', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce(undefined);
    renderLogin();

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('switches to forgot password view when clicking "Forgot password?"', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByText('Forgot password?'));
    expect(screen.getByText('Reset Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Account Email')).toBeInTheDocument();
  });

  it('shows "Back to sign in" link in forgot password view', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByText('Forgot password?'));
    expect(screen.getByText('Back to sign in')).toBeInTheDocument();
  });

  it('shows "Drink-UX" as heading', () => {
    renderLogin();
    expect(screen.getByText('Drink-UX')).toBeInTheDocument();
  });

  it('shows subtitle "Sign in to your account"', () => {
    renderLogin();
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
  });
});
