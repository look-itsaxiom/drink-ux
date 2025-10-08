import React from 'react';

const MenuManagement: React.FC = () => {
  const drinks = [
    { id: 1, name: 'Classic Latte', category: 'Espresso', price: '$4.50', active: true },
    { id: 2, name: 'Cappuccino', category: 'Espresso', price: '$4.25', active: true },
    { id: 3, name: 'Cold Brew', category: 'Cold Coffee', price: '$4.00', active: true },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Menu Management</h1>
        <p>Manage your drink offerings and customizations</p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>Drinks Menu</h3>
          <button className="btn btn-primary">Add New Drink</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ecf0f1' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Category</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Price</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {drinks.map((drink) => (
              <tr key={drink.id} style={{ borderBottom: '1px solid #ecf0f1' }}>
                <td style={{ padding: '10px' }}>{drink.name}</td>
                <td style={{ padding: '10px' }}>{drink.category}</td>
                <td style={{ padding: '10px' }}>{drink.price}</td>
                <td style={{ padding: '10px' }}>
                  <span style={{ 
                    color: drink.active ? '#27ae60' : '#e74c3c',
                    fontWeight: 500
                  }}>
                    {drink.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '10px', textAlign: 'right' }}>
                  <button className="btn btn-secondary" style={{ marginRight: '5px' }}>Edit</button>
                  <button className="btn btn-secondary">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MenuManagement;
