import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('ionicons/icons', () => ({
  addCircleOutline: 'mock-icon',
  cafeOutline: 'mock-icon',
  iceCreamOutline: 'mock-icon',
  waterOutline: 'mock-icon',
}));

const mockPush = vi.fn();

vi.mock('react-router', () => ({
  useHistory: vi.fn(() => ({ push: mockPush })),
}));

import Home from '../Home';

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Build Your Perfect Drink" heading', () => {
    render(<Home />);
    expect(screen.getByText('Build Your Perfect Drink')).toBeInTheDocument();
  });

  it('renders "Create Your Drink" button', () => {
    render(<Home />);
    expect(screen.getByText('Create Your Drink')).toBeInTheDocument();
  });

  it('navigates to /drink/new when "Create Your Drink" is clicked', async () => {
    const user = userEvent.setup();
    render(<Home />);

    const button = screen.getByText('Create Your Drink');
    await user.click(button);

    expect(mockPush).toHaveBeenCalledWith('/drink/new');
  });

  it('renders featured drinks cards', () => {
    render(<Home />);
    expect(screen.getByText('Classic Espresso')).toBeInTheDocument();
    expect(screen.getByText('Iced Delights')).toBeInTheDocument();
    expect(screen.getByText('Specialty Teas')).toBeInTheDocument();
  });

  it('renders AppHeader with title "Drink Builder"', () => {
    render(<Home />);
    expect(screen.getByText('Drink Builder')).toBeInTheDocument();
  });

  it('renders the subtitle text', () => {
    render(<Home />);
    expect(
      screen.getByText('Create a custom drink exactly how you like it')
    ).toBeInTheDocument();
  });

  it('renders "Featured Drinks" section title', () => {
    render(<Home />);
    expect(screen.getByText('Featured Drinks')).toBeInTheDocument();
  });
});
