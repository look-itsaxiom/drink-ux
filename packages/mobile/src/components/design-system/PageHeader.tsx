import React from 'react';

interface PageHeaderProps {
  /** Shop name / title */
  title: string;
  /** Optional subtitle / tagline */
  subtitle?: string;
  /** Logo element (icon or image) */
  logo?: React.ReactNode;
  /** Right-side action buttons */
  actions?: React.ReactNode;
  /** Optional search bar below header */
  searchBar?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  logo,
  actions,
  searchBar,
}) => (
  <header
    className="app-header"
    style={{
      background: 'var(--theme-primary)',
      padding: '8px 20px 20px',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: searchBar ? 16 : 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {logo && (
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.2)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 18, backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255,255,255,0.25)',
          }}>
            {logo}
          </div>
        )}
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'white', letterSpacing: '-0.3px' }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {actions && <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{actions}</div>}
    </div>
    {searchBar}
  </header>
);
