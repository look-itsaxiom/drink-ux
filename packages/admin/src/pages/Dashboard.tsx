import React from 'react';

const Dashboard: React.FC = () => {
  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of your business performance</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Today's Orders</h3>
          <div className="value">47</div>
        </div>
        <div className="stat-card">
          <h3>Revenue</h3>
          <div className="value">$342</div>
        </div>
        <div className="stat-card">
          <h3>Active Drinks</h3>
          <div className="value">23</div>
        </div>
        <div className="stat-card">
          <h3>POS Status</h3>
          <div className="value" style={{ color: '#27ae60', fontSize: '18px' }}>
            Connected
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Recent Orders</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ecf0f1' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Order ID</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Drink</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #ecf0f1' }}>
              <td style={{ padding: '10px' }}>#1001</td>
              <td style={{ padding: '10px' }}>Classic Latte (Medium)</td>
              <td style={{ padding: '10px' }}>Completed</td>
              <td style={{ padding: '10px', textAlign: 'right' }}>$5.00</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #ecf0f1' }}>
              <td style={{ padding: '10px' }}>#1002</td>
              <td style={{ padding: '10px' }}>Cold Brew (Large)</td>
              <td style={{ padding: '10px' }}>Processing</td>
              <td style={{ padding: '10px', textAlign: 'right' }}>$4.50</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
