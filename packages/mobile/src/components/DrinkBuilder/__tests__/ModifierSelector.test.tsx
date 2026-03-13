import { render } from '@testing-library/react';
import { ComponentType } from '@drink-ux/shared';
import type { ModifierComponent } from '@drink-ux/shared';
import ModifierSelector from '../ModifierSelector';

const mockModifiers: ModifierComponent[] = [
  {
    id: 'mod-milk-whole',
    name: 'Whole Milk',
    type: ComponentType.MODIFIER,
    category: 'milk',
    price: 0,
    canTransformDrink: false,
    visual: { color: '#fff9e6', opacity: 0.7, layerOrder: 2 },
    available: true,
  },
  {
    id: 'mod-milk-oat',
    name: 'Oat Milk',
    type: ComponentType.MODIFIER,
    category: 'milk',
    price: 0.75,
    canTransformDrink: false,
    visual: { color: '#f5deb3', opacity: 0.6, layerOrder: 2 },
    available: true,
  },
];

const defaultProps = {
  isOpen: true,
  title: 'Select Milk',
  modifiers: mockModifiers,
  onSelect: vi.fn(),
  onDismiss: vi.fn(),
  selectedIds: [] as string[],
};

describe('ModifierSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders ion-modal when isOpen is true', () => {
    const { container } = render(<ModifierSelector {...defaultProps} />);
    expect(container.querySelector('ion-modal')).toBeTruthy();
  });

  it('renders with isOpen false without error', () => {
    expect(() =>
      render(<ModifierSelector {...defaultProps} isOpen={false} />)
    ).not.toThrow();
  });

  it('accepts modifier data without error', () => {
    expect(() => render(<ModifierSelector {...defaultProps} />)).not.toThrow();
  });

  it('accepts selectedIds prop', () => {
    expect(() =>
      render(<ModifierSelector {...defaultProps} selectedIds={['mod-milk-whole']} />)
    ).not.toThrow();
  });
});
