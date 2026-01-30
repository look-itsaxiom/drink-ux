import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Category {
  id: string;
  name: string;
  displayOrder: number;
  color?: string;
  icon?: string;
}

interface Base {
  id: string;
  categoryId: string;
  name: string;
  basePrice: number;
  temperatureConstraint: string;
  available: boolean;
}

interface Modifier {
  id: string;
  type: 'MILK' | 'SYRUP' | 'TOPPING';
  name: string;
  price: number;
  available: boolean;
}

type TabType = 'categories' | 'bases' | 'modifiers';
type ModalType = 'category' | 'base' | 'modifier' | null;

const MenuManagement: React.FC = () => {
  const { user } = useAuth();
  const businessId = user?.businessId;
  const [activeTab, setActiveTab] = useState<TabType>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [bases, setBases] = useState<Base[]>([]);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingItem, setEditingItem] = useState<Category | Base | Modifier | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: ModalType; id: string; name: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState<Record<string, string | number | boolean>>({});

  useEffect(() => {
    if (businessId) {
      fetchCatalogData();
    }
  }, [businessId]);

  const fetchCatalogData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [categoriesRes, basesRes, modifiersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/catalog/categories?businessId=${businessId}`, {
          credentials: 'include',
        }),
        fetch(`${API_BASE_URL}/api/catalog/bases?businessId=${businessId}`, {
          credentials: 'include',
        }),
        fetch(`${API_BASE_URL}/api/catalog/modifiers?businessId=${businessId}`, {
          credentials: 'include',
        }),
      ]);

      const categoriesData = await categoriesRes.json();
      const basesData = await basesRes.json();
      const modifiersData = await modifiersRes.json();

      if (categoriesData.success) {
        setCategories(Array.isArray(categoriesData.data) ? categoriesData.data : []);
      }
      if (basesData.success) {
        setBases(Array.isArray(basesData.data) ? basesData.data : []);
      }
      if (modifiersData.success) {
        setModifiers(Array.isArray(modifiersData.data) ? modifiersData.data : []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load catalog');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (categoryId: string): string => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  };

  const getBasesByCategory = (): Record<string, Base[]> => {
    const grouped: Record<string, Base[]> = {};
    bases.forEach(base => {
      const categoryName = getCategoryName(base.categoryId);
      if (!grouped[categoryName]) {
        grouped[categoryName] = [];
      }
      grouped[categoryName].push(base);
    });
    return grouped;
  };

  const getModifiersByType = (): Record<string, Modifier[]> => {
    const grouped: Record<string, Modifier[]> = {};
    modifiers.forEach(mod => {
      if (!grouped[mod.type]) {
        grouped[mod.type] = [];
      }
      grouped[mod.type].push(mod);
    });
    return grouped;
  };

  const formatPrice = (price: number): string => {
    return `$${price.toFixed(2)}`;
  };

  // Modal handlers
  const openAddModal = (type: ModalType) => {
    setModalType(type);
    setEditingItem(null);
    setFormData(getDefaultFormData(type));
  };

  const openEditModal = (type: ModalType, item: Category | Base | Modifier) => {
    setModalType(type);
    setEditingItem(item);
    setFormData({ ...item });
  };

  const closeModal = () => {
    setModalType(null);
    setEditingItem(null);
    setFormData({});
  };

  const getDefaultFormData = (type: ModalType): Record<string, string | number | boolean> => {
    switch (type) {
      case 'category':
        return { name: '', displayOrder: categories.length + 1, color: '', icon: '' };
      case 'base':
        return { name: '', categoryId: categories[0]?.id || '', basePrice: 0, temperatureConstraint: 'BOTH', available: true };
      case 'modifier':
        return { name: '', type: 'SYRUP', price: 0, available: true };
      default:
        return {};
    }
  };

  const handleFormChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!modalType) return;

    setSaving(true);
    setError(null);

    try {
      const isEdit = editingItem !== null;
      const endpoint = getEndpoint(modalType, isEdit ? (editingItem as { id: string }).id : null);
      const method = isEdit ? 'PUT' : 'POST';

      const body = {
        ...formData,
        businessId: businessId,
      };

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to save');
      }

      await fetchCatalogData();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    setSaving(true);
    setError(null);

    try {
      const endpoint = getEndpoint(deleteConfirm.type, deleteConfirm.id);

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to delete');
      }

      await fetchCatalogData();
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  const getEndpoint = (type: ModalType, id: string | null): string => {
    const base = `/api/catalog/${type === 'category' ? 'categories' : type === 'base' ? 'bases' : 'modifiers'}`;
    return id ? `${base}/${id}` : base;
  };

  const renderTabs = () => (
    <div className="tabs" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
      <button
        className={`btn ${activeTab === 'categories' ? 'btn-primary' : 'btn-secondary'}`}
        onClick={() => setActiveTab('categories')}
      >
        Categories ({categories.length})
      </button>
      <button
        className={`btn ${activeTab === 'bases' ? 'btn-primary' : 'btn-secondary'}`}
        onClick={() => setActiveTab('bases')}
      >
        Drink Bases ({bases.length})
      </button>
      <button
        className={`btn ${activeTab === 'modifiers' ? 'btn-primary' : 'btn-secondary'}`}
        onClick={() => setActiveTab('modifiers')}
      >
        Modifiers ({modifiers.length})
      </button>
    </div>
  );

  const renderCategories = () => (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>Categories</h3>
        <button className="btn btn-primary" onClick={() => openAddModal('category')}>Add Category</button>
      </div>
      {categories.length === 0 ? (
        <p style={{ color: '#7f8c8d', textAlign: 'center', padding: '40px' }}>
          No categories found. Add your first category to get started.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ecf0f1' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Order</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Icon</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Items</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.sort((a, b) => a.displayOrder - b.displayOrder).map((category) => (
              <tr key={category.id} style={{ borderBottom: '1px solid #ecf0f1' }}>
                <td style={{ padding: '10px' }}>{category.displayOrder}</td>
                <td style={{ padding: '10px', fontWeight: 500 }}>{category.name}</td>
                <td style={{ padding: '10px' }}>{category.icon || '-'}</td>
                <td style={{ padding: '10px' }}>
                  {bases.filter(b => b.categoryId === category.id).length} bases
                </td>
                <td style={{ padding: '10px', textAlign: 'right' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ marginRight: '5px' }}
                    onClick={() => openEditModal('category', category)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setDeleteConfirm({ type: 'category', id: category.id, name: category.name })}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderBases = () => {
    const basesByCategory = getBasesByCategory();
    const categoryNames = Object.keys(basesByCategory).sort();

    return (
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>Drink Bases</h3>
          <button
            className="btn btn-primary"
            onClick={() => openAddModal('base')}
            disabled={categories.length === 0}
          >
            Add Base
          </button>
        </div>
        {categories.length === 0 ? (
          <p style={{ color: '#7f8c8d', textAlign: 'center', padding: '40px' }}>
            Add categories first before adding drink bases.
          </p>
        ) : bases.length === 0 ? (
          <p style={{ color: '#7f8c8d', textAlign: 'center', padding: '40px' }}>
            No drink bases found. Add your first base to get started.
          </p>
        ) : (
          categoryNames.map(categoryName => (
            <div key={categoryName} style={{ marginBottom: '30px' }}>
              <h4 style={{ marginBottom: '10px', color: '#2c3e50' }}>{categoryName}</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ecf0f1' }}>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Name</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Base Price</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Temperature</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {basesByCategory[categoryName].map((base) => (
                    <tr key={base.id} style={{ borderBottom: '1px solid #ecf0f1' }}>
                      <td style={{ padding: '10px', fontWeight: 500 }}>{base.name}</td>
                      <td style={{ padding: '10px' }}>{formatPrice(base.basePrice)}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          backgroundColor: base.temperatureConstraint === 'BOTH' ? '#e8f5e9' :
                            base.temperatureConstraint === 'HOT_ONLY' ? '#fff3e0' : '#e3f2fd',
                          color: base.temperatureConstraint === 'BOTH' ? '#2e7d32' :
                            base.temperatureConstraint === 'HOT_ONLY' ? '#ef6c00' : '#1565c0',
                        }}>
                          {base.temperatureConstraint === 'BOTH' ? 'Hot & Iced' :
                            base.temperatureConstraint === 'HOT_ONLY' ? 'Hot Only' : 'Iced Only'}
                        </span>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span style={{
                          color: base.available ? '#27ae60' : '#e74c3c',
                          fontWeight: 500
                        }}>
                          {base.available ? 'Available' : 'Unavailable'}
                        </span>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ marginRight: '5px' }}
                          onClick={() => openEditModal('base', base)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => setDeleteConfirm({ type: 'base', id: base.id, name: base.name })}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    );
  };

  const renderModifiers = () => {
    const modifiersByType = getModifiersByType();
    const typeLabels: Record<string, string> = {
      'MILK': 'Milk Options',
      'SYRUP': 'Syrups & Flavors',
      'TOPPING': 'Toppings',
    };
    const typeOrder = ['MILK', 'SYRUP', 'TOPPING'];

    return (
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>Modifiers</h3>
          <button className="btn btn-primary" onClick={() => openAddModal('modifier')}>Add Modifier</button>
        </div>
        {modifiers.length === 0 ? (
          <p style={{ color: '#7f8c8d', textAlign: 'center', padding: '40px' }}>
            No modifiers found. Add modifiers to customize drinks.
          </p>
        ) : (
          typeOrder.filter(type => modifiersByType[type]?.length > 0).map(type => (
            <div key={type} style={{ marginBottom: '30px' }}>
              <h4 style={{ marginBottom: '10px', color: '#2c3e50' }}>
                {typeLabels[type]} ({modifiersByType[type].length})
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ecf0f1' }}>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Name</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Price</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {modifiersByType[type].map((modifier) => (
                    <tr key={modifier.id} style={{ borderBottom: '1px solid #ecf0f1' }}>
                      <td style={{ padding: '10px', fontWeight: 500 }}>{modifier.name}</td>
                      <td style={{ padding: '10px' }}>
                        {modifier.price > 0 ? `+${formatPrice(modifier.price)}` : 'Included'}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span style={{
                          color: modifier.available ? '#27ae60' : '#e74c3c',
                          fontWeight: 500
                        }}>
                          {modifier.available ? 'Available' : 'Unavailable'}
                        </span>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ marginRight: '5px' }}
                          onClick={() => openEditModal('modifier', modifier)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => setDeleteConfirm({ type: 'modifier', id: modifier.id, name: modifier.name })}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    );
  };

  const renderCategoryForm = () => (
    <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Name *</label>
        <input
          type="text"
          value={formData.name as string || ''}
          onChange={(e) => handleFormChange('name', e.target.value)}
          required
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
        />
      </div>
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Display Order</label>
        <input
          type="number"
          value={formData.displayOrder as number || 1}
          onChange={(e) => handleFormChange('displayOrder', parseInt(e.target.value))}
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
        />
      </div>
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Icon (emoji or text)</label>
        <input
          type="text"
          value={formData.icon as string || ''}
          onChange={(e) => handleFormChange('icon', e.target.value)}
          placeholder="e.g., coffee, tea"
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
        />
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );

  const renderBaseForm = () => (
    <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Name *</label>
        <input
          type="text"
          value={formData.name as string || ''}
          onChange={(e) => handleFormChange('name', e.target.value)}
          required
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
        />
      </div>
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Category *</label>
        <select
          value={formData.categoryId as string || ''}
          onChange={(e) => handleFormChange('categoryId', e.target.value)}
          required
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
        >
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Base Price ($) *</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={formData.basePrice as number || 0}
          onChange={(e) => handleFormChange('basePrice', parseFloat(e.target.value))}
          required
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
        />
      </div>
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Temperature</label>
        <select
          value={formData.temperatureConstraint as string || 'BOTH'}
          onChange={(e) => handleFormChange('temperatureConstraint', e.target.value)}
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
        >
          <option value="BOTH">Hot & Iced</option>
          <option value="HOT_ONLY">Hot Only</option>
          <option value="ICED_ONLY">Iced Only</option>
        </select>
      </div>
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={formData.available as boolean ?? true}
            onChange={(e) => handleFormChange('available', e.target.checked)}
          />
          <span>Available for ordering</span>
        </label>
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );

  const renderModifierForm = () => (
    <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Name *</label>
        <input
          type="text"
          value={formData.name as string || ''}
          onChange={(e) => handleFormChange('name', e.target.value)}
          required
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
        />
      </div>
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Type *</label>
        <select
          value={formData.type as string || 'SYRUP'}
          onChange={(e) => handleFormChange('type', e.target.value)}
          required
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
        >
          <option value="MILK">Milk</option>
          <option value="SYRUP">Syrup/Flavor</option>
          <option value="TOPPING">Topping</option>
        </select>
      </div>
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Extra Price ($)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={formData.price as number || 0}
          onChange={(e) => handleFormChange('price', parseFloat(e.target.value))}
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
        />
        <small style={{ color: '#7f8c8d' }}>Set to 0 for included modifiers</small>
      </div>
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={formData.available as boolean ?? true}
            onChange={(e) => handleFormChange('available', e.target.checked)}
          />
          <span>Available for ordering</span>
        </label>
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h1>Menu Management</h1>
          <p>Manage your drink offerings and customizations</p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p>Loading catalog...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Menu Management</h1>
        <p>Manage your drink offerings and customizations</p>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#fee',
          color: '#c00',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          {error}
          <button
            onClick={() => setError(null)}
            style={{ marginLeft: '15px' }}
            className="btn btn-secondary"
          >
            Dismiss
          </button>
        </div>
      )}

      {renderTabs()}

      {activeTab === 'categories' && renderCategories()}
      {activeTab === 'bases' && renderBases()}
      {activeTab === 'modifiers' && renderModifiers()}

      {/* Add/Edit Category Modal */}
      <Modal
        isOpen={modalType === 'category'}
        onClose={closeModal}
        title={editingItem ? 'Edit Category' : 'Add Category'}
      >
        {renderCategoryForm()}
      </Modal>

      {/* Add/Edit Base Modal */}
      <Modal
        isOpen={modalType === 'base'}
        onClose={closeModal}
        title={editingItem ? 'Edit Drink Base' : 'Add Drink Base'}
      >
        {renderBaseForm()}
      </Modal>

      {/* Add/Edit Modifier Modal */}
      <Modal
        isOpen={modalType === 'modifier'}
        onClose={closeModal}
        title={editingItem ? 'Edit Modifier' : 'Add Modifier'}
      >
        {renderModifierForm()}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Confirm Delete"
      >
        <p>Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>?</p>
        <p style={{ color: '#e74c3c', fontSize: '14px' }}>This action cannot be undone.</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
          <button
            className="btn btn-primary"
            style={{ backgroundColor: '#e74c3c' }}
            onClick={handleDelete}
            disabled={saving}
          >
            {saving ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default MenuManagement;
