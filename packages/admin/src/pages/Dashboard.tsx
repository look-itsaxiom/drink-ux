import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface POSStatus {
  configured: boolean;
  environment: string;
}

const ACT_ICONS = {
  check: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,7 5.5,10.5 12,4"/></svg>,
  dollar: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 1v12M4.5 3.5h4a2 2 0 0 1 0 4h-3a2 2 0 0 0 0 4H9"/></svg>,
  sync: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 7A5 5 0 1 1 7 2"/><path d="M7 2l2.5-1.3M7 2l1.3 2.5"/></svg>,
  warn: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 1L1 12h12L7 1z"/><path d="M7 5.5v3M7 10.5v.5"/></svg>
};

const Dashboard: React.FC = () => {
  const { user, business } = useAuth();
  const businessId = user?.businessId;
  const [loading, setLoading] = useState(true);
  const [, setPosStatus] = useState<POSStatus | null>(null);

  useEffect(() => {
    if (businessId) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [businessId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const posStatusRes = await fetch(`${API_BASE_URL}/api/pos/oauth/status`, {
        credentials: 'include',
      }).catch(() => null);

      if (posStatusRes?.ok) {
        const posData = await posStatusRes.json();
        if (posData.success) {
          setPosStatus(posData.data);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isPosConnected = !!business?.posMerchantId;

  const subscriptionStatus = (business?.subscriptionStatus || 'trial').toLowerCase();
  
  // Static data from prototype
  const queue = [
    { code: 'A3F8', name: 'Alex M.', items: 'Oat Milk Latte · Cold Brew', status: 'pending', time: '1m ago', late: false },
    { code: 'D4J5', name: 'Casey L.', items: 'Chai Latte · Iced Matcha', status: 'preparing', time: '9m ago', late: true },
    { code: 'B2K9', name: 'Jordan', items: 'Cold Brew × 2', status: 'preparing', time: '6m ago', late: false },
    { code: 'C7M1', name: 'Sam W.', items: 'Matcha Latte · Oat Milk', status: 'ready', time: '3m ago', late: false },
    { code: 'E9P3', name: 'Riley', items: 'Vanilla Latte', status: 'pending', time: '2m ago', late: false },
    { code: 'F1Q6', name: 'Taylor', items: 'Espresso × 2 · Croissant', status: 'preparing', time: '12m ago', late: true }
  ];

  const activity = [
    { type: 'check', text: 'Order F1Q6 marked preparing', time: '2m ago' },
    { type: 'dollar', text: 'Payment received · $14.50', time: '4m ago' },
    { type: 'sync', text: 'Menu synced from Square', time: '11m ago' },
    { type: 'check', text: 'Order Z9W2 completed', time: '14m ago' }
  ];

  const STATUS_CHIP_CLASS: Record<string, string> = { pending: 'chip-pending', preparing: 'chip-preparing', ready: 'chip-ready' };
  const STATUS_BADGE_CLASS: Record<string, string> = { pending: 'badge-pending', preparing: 'badge-preparing', ready: 'badge-ready' };
  const STATUS_LABEL: Record<string, string> = { pending: 'Pending', preparing: 'Preparing', ready: 'Ready' };
  const ADVANCE_LABEL: Record<string, string> = { pending: 'Start →', preparing: 'Ready →', ready: 'Complete ✓' };

  if (loading) {
    return (
      <div className="admin-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-body">
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-left">
          <div className="topbar-title">Dashboard</div>
          <div className="topbar-sub">Good morning, {business?.name || 'Morgan'} ☕</div>
        </div>
        <div className="pos-indicator">
          {isPosConnected ? (
            <>
              <span className="pos-dot pos-dot-green"></span>
              <span className="pos-label-ok">POS Synced</span>
            </>
          ) : (
            <>
              <span className="pos-dot pos-dot-red"></span>
              <span className="pos-label-err">POS Error</span>
            </>
          )}
        </div>
      </div>

      {/* Page body */}
      <div className="page-body">
        <div className="page-grid">
          
          {/* Left column */}
          <div className="left-col">
            {/* KPI cards */}
            <div className="kpi-row">
              <div className="kpi-card">
                <div className="kpi-label">Today's Revenue</div>
                <div className="kpi-val">$284</div>
                <div className="kpi-trend trend-up">↑ 12% vs yesterday</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Orders Today</div>
                <div className="kpi-val">38</div>
                <div className="kpi-trend trend-up">↑ 4 orders</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Active Orders</div>
                <div className="kpi-val">
                  <span className="live-dot"></span>
                  <span style={{ marginLeft: '8px' }}>{queue.length}</span>
                </div>
                <div className="kpi-trend trend-live">Live</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Avg Order Value</div>
                <div className="kpi-val">$7.47</div>
                <div className="kpi-trend trend-down">↓ $0.22</div>
              </div>
            </div>

            {/* Active order queue */}
            <div className="queue-card">
              <div className="queue-header">
                <div className="live-dot"></div>
                <span className="queue-title">Active Orders</span>
                <span className="queue-count-badge">{queue.length}</span>
                <span className="queue-refresh-hint">Auto-refreshes every 30s</span>
              </div>
              <div className="queue-body">
                {queue.length === 0 ? (
                  <div className="queue-empty">No active orders right now</div>
                ) : (
                  queue.map((order, idx) => (
                    <div className="queue-row" key={idx}>
                      <span className={`code-chip ${STATUS_CHIP_CLASS[order.status]}`}>{order.code}</span>
                      <div className="order-info">
                        <div className="order-name">{order.name}</div>
                        <div className="order-items">{order.items}</div>
                      </div>
                      <span className={`status-badge ${STATUS_BADGE_CLASS[order.status]}`}>{STATUS_LABEL[order.status]}</span>
                      <span className={`order-time ${order.late ? 'time-late' : ''}`}>{order.time}</span>
                      <button className="advance-btn">{ADVANCE_LABEL[order.status]}</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="right-col">
            {/* Subscription card */}
            <div className={`sub-card ${subscriptionStatus === 'active' ? 'sub-card-active' : subscriptionStatus === 'grace' ? 'sub-card-grace' : 'sub-card-trial'}`}>
              <div className="sub-header">
                {subscriptionStatus === 'active' ? 'Pro Plan · Active ✓' : subscriptionStatus === 'grace' ? 'Payment Failed ⚠' : '14-Day Free Trial'}
              </div>
              <div className="sub-sub">
                {subscriptionStatus === 'active' ? 'Next billing: Apr 3, 2026' : subscriptionStatus === 'grace' ? 'Re-activate in 3 days or lose access' : '8 days remaining'}
              </div>
              {subscriptionStatus !== 'active' && (
                <div className="sub-bar-track">
                  <div className={`sub-bar-fill ${subscriptionStatus === 'grace' ? 'sub-bar-red' : 'sub-bar-blue'}`} style={{ width: subscriptionStatus === 'grace' ? '100%' : '43%' }}></div>
                </div>
              )}
              <button className={`sub-cta ${subscriptionStatus === 'active' ? 'sub-cta-green' : subscriptionStatus === 'grace' ? 'sub-cta-red' : ''}`}>
                {subscriptionStatus === 'active' ? 'Manage Plan' : subscriptionStatus === 'grace' ? 'Update Payment →' : 'Upgrade to Pro →'}
              </button>
            </div>

            {/* Quick actions */}
            <div className="quick-actions-wrap">
              <div className="section-label">Quick Actions</div>
              <div className="quick-grid">
                <button className="quick-btn">
                  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="12" height="10" rx="1.5"/>
                    <path d="M6 13v2M12 13v2M5 15h8"/>
                    <path d="M6 7h6M6 9.5h4"/>
                  </svg>
                  <span className="quick-label">Print Today's Report</span>
                </button>
                <button className="quick-btn">
                  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="9" r="7"/>
                    <path d="M9 5.5V9M9 9l2.5 2.5"/>
                    <path d="M6 9h3"/>
                  </svg>
                  <span className="quick-label">New Manual Order</span>
                </button>
                <button className="quick-btn">
                  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 9A6 6 0 1 1 9 3"/>
                    <path d="M9 3l3-1.5M9 3l1.5 3"/>
                  </svg>
                  <span className="quick-label">Sync from Square</span>
                </button>
                <button className="quick-btn">
                  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="14" height="10" rx="2"/>
                    <path d="M5 8h8M5 11h5"/>
                  </svg>
                  <span className="quick-label">View All Orders</span>
                </button>
              </div>
            </div>

            {/* Recent activity */}
            <div className="activity-wrap">
              <div className="section-label">Recent Activity</div>
              <div className="activity-list">
                <div className="activity-inner">
                  {activity.map((evt, idx) => (
                    <div className="activity-item" key={idx}>
                      <div className={`act-icon ${evt.type}`}>{ACT_ICONS[evt.type as keyof typeof ACT_ICONS]}</div>
                      <span className="act-text">{evt.text}</span>
                      <span className="act-time">{evt.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
