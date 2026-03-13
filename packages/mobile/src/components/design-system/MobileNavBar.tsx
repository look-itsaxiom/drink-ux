import React from 'react';

export interface NavItem {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

interface MobileNavBarProps {
  items: NavItem[];
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({ items }) => (
  <nav className="mobile-nav">
    {items.map((item) => (
      <button
        key={item.label}
        className={`mobile-nav-item${item.active ? ' active' : ''}`}
        onClick={item.onClick}
        aria-label={item.label}
      >
        {item.icon}
        <span>{item.label}</span>
      </button>
    ))}
  </nav>
);
