import React from 'react';

export interface GracePeriodBannerProps {
  daysRemaining: number;
  businessName?: string;
}

export const GracePeriodBanner: React.FC<GracePeriodBannerProps> = ({ daysRemaining }) => {
  return (
    <div
      style={{
        background: '#fff3cd',
        color: '#856404',
        padding: '8px 16px',
        textAlign: 'center',
        borderBottom: '1px solid #ffc107',
      }}
    >
      Your subscription is in a grace period. {daysRemaining} days remaining.
    </div>
  );
};
