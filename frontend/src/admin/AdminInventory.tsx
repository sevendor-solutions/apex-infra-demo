import React, { useState, useEffect, useMemo } from 'react';
import type { InventoryItem, StockMovement } from '../types';
import { 
  X, AlertTriangle, 
  ArrowUpRight, ArrowDownLeft, BarChart2, Package 
} from 'lucide-react';
import { 
  getInventoryItems, addInventoryItem, updateInventoryItem, deleteInventoryItem,
  getStockMovements, stockIn, stockOut, adjustStock 
} from '../utils/db';
import { ALVGrid } from './ALVGrid';
import type { ALVColumn } from './ALVGrid';

interface AdminInventoryProps {
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onConfirm: (msg: string) => Promise<boolean>;
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const AdminInventory: React.FC<AdminInventoryProps> = ({
  onAddToast,
  onConfirm
}) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveType, setMoveType] = useState<'In' | 'Out' | 'Adjust'>('In');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  // Local sub-tab selection to prevent side-by-side grid cut-off on standard screen sizes
  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'movements'>('inventory');

  // Form Fields - Item
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [unit, setUnit] = useState('Pcs');
  const [openingStock, setOpeningStock] = useState(0);
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [gstPercentage, setGstPercentage] = useState(18);
  const [minimumStock, setMinimumStock] = useState(10);
  const [supplierName, setSupplierName] = useState('');
  const [warehouse, setWarehouse] = useState('Main Warehouse');

  // Form Fields - Movement
  const [mProductCode, setMProductCode] = useState('');
  const [mQuantity, setMQuantity] = useState(0);
  const [mDate, setMDate] = useState(new Date().toISOString().split('T')[0]);
  const [mWarehouse, setMWarehouse] = useState('Main Warehouse');
  const [mNotes, setMNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemList, moveList] = await Promise.all([
        getInventoryItems(),
        getStockMovements()
      ]);
      setItems(itemList);
      setMovements(moveList);
    } catch (err) {
      onAddToast('Failed to load inventory data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      onAddToast('Product name and code are required.', 'error');
      return;
    }
    try {
      const payload = {
        name, code, category, brand, unit,
        openingStock, purchasePrice, sellingPrice, gstPercentage,
        minimumStockLevel: minimumStock, supplierName, warehouseLocation: warehouse
      };

      if (editingItem) {
        await updateInventoryItem({ ...payload, id: editingItem.id });
        onAddToast('Product updated successfully.', 'success');
      } else {
        await addInventoryItem(payload);
        onAddToast('Product created successfully.', 'success');
      }
      setShowItemModal(false);
      resetForm();
      loadData();
    } catch (err: any) {
      onAddToast(err.message || 'Failed to save product.', 'error');
    }
  };

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mProductCode) {
      onAddToast('Please select a product.', 'error');
      return;
    }
    if (mQuantity <= 0 && moveType !== 'Adjust') {
      onAddToast('Quantity must be greater than zero.', 'error');
      return;
    }

    try {
      const payload = {
        productCode: mProductCode,
        quantity: mQuantity,
        date: mDate,
        warehouse: mWarehouse,
        notes: mNotes
      };

      if (moveType === 'In') {
        await stockIn(payload);
        onAddToast('Stock In recorded successfully.', 'success');
      } else if (moveType === 'Out') {
        await stockOut(payload);
        onAddToast('Stock Out recorded successfully.', 'success');
      } else {
        await adjustStock(payload);
        onAddToast('Stock adjustment completed.', 'success');
      }
      setShowMoveModal(false);
      setMProductCode('');
      setMQuantity(0);
      setMNotes('');
      loadData();
    } catch (err: any) {
      onAddToast(err.message || 'Failed to post movement.', 'error');
    }
  };

  const handleDeleteItem = async (id: string, code: string) => {
    const ok = await onConfirm(`Delete product "${code}"? This will clear all its stock records.`);
    if (!ok) return;
    try {
      await deleteInventoryItem(id);
      onAddToast('Product deleted.', 'success');
      loadData();
    } catch (err) {
      onAddToast('Failed to delete product.', 'error');
    }
  };

  const resetForm = () => {
    setName(''); setCode(''); setCategory(''); setBrand(''); setUnit('Pcs');
    setOpeningStock(0); setPurchasePrice(0); setSellingPrice(0); setGstPercentage(18);
    setMinimumStock(10); setSupplierName(''); setWarehouse('Main Warehouse');
    setEditingItem(null);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setName(item.name);
    setCode(item.code);
    setCategory(item.category || '');
    setBrand(item.brand || '');
    setUnit(item.unit);
    setOpeningStock(item.openingStock);
    setPurchasePrice(item.purchasePrice);
    setSellingPrice(item.sellingPrice);
    setGstPercentage(item.gstPercentage);
    setMinimumStock(item.minimumStockLevel);
    setSupplierName(item.supplierName || '');
    setWarehouse(item.warehouseLocation || 'Main Warehouse');
    setShowItemModal(true);
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const totalCount = items.length;
    const valuation = items.reduce((sum, item) => sum + (item.currentStock * item.purchasePrice), 0);
    const lowStockList = items.filter(item => item.currentStock <= item.minimumStockLevel);
    return {
      totalCount,
      valuation,
      lowStockCount: lowStockList.length
    };
  }, [items]);

  const itemCols: ALVColumn[] = [
    { key: 'code', label: 'Item Code', sortable: true },
    { key: 'name', label: 'Product Name', sortable: true },
    { key: 'category', label: 'Category', sortable: true },
    { 
      key: 'currentStock', 
      label: 'Stock Level', 
      align: 'right', 
      render: (_, row) => {
        const item = row as unknown as InventoryItem;
        const isLow = item.currentStock <= item.minimumStockLevel;
        return (
          <span style={{ color: isLow ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>
            {item.currentStock} {item.unit} {isLow && '⚠️'}
          </span>
        );
      }
    },
    { key: 'purchasePrice', label: 'Purchase Price', align: 'right', render: (v) => fmt(Number(v)) },
    { key: 'sellingPrice', label: 'Selling Price', align: 'right', render: (v) => fmt(Number(v)) },
    { key: 'warehouseLocation', label: 'Warehouse' },
    {
      key: 'actions',
      label: 'Actions',
      align: 'center',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
          <button 
            onClick={() => openEdit(row as any)} 
            className="btn btn-sm btn-outline text-primary"
            style={{ padding: '2px 8px' }}
          >
            Edit
          </button>
          <button 
            onClick={() => handleDeleteItem(String(row.id), String(row.code))} 
            className="btn btn-sm btn-outline text-danger"
            style={{ padding: '2px 8px', color: '#ef4444', borderColor: '#ef4444' }}
          >
            Delete
          </button>
        </div>
      )
    }
  ];

  const moveCols: ALVColumn[] = [
    { key: 'date', label: 'Date', sortable: true },
    { key: 'productCode', label: 'Code', sortable: true },
    { key: 'type', label: 'Type', sortable: true, render: (v) => {
      const t = String(v);
      const color = t === 'Stock In' ? 'var(--success)' : t === 'Stock Out' ? 'var(--danger)' : 'var(--info)';
      return <strong style={{ color }}>{t}</strong>;
    }},
    { key: 'quantity', label: 'Qty', align: 'right' },
    { key: 'warehouse', label: 'Warehouse' },
    { key: 'notes', label: 'Notes' }
  ];

  return (
    <div className="admin-page-container">
      {/* KPI Stats cards */}
      <div className="grid grid-3 gap-2 mb-3">
        <div className="stat-card shadow-sm" style={{ borderLeft: '4px solid var(--secondary)' }}>
          <div className="stat-icon-wrapper secondary-soft">
            <Package size={24} className="text-secondary" />
          </div>
          <div>
            <span className="stat-title">Total Inventory Items</span>
            <h3>{stats.totalCount}</h3>
          </div>
        </div>

        <div className="stat-card shadow-sm" style={{ borderLeft: '4px solid var(--success)' }}>
          <div className="stat-icon-wrapper success-soft">
            <BarChart2 size={24} className="text-success" />
          </div>
          <div>
            <span className="stat-title">Stock Valuation</span>
            <h3>{fmt(stats.valuation)}</h3>
          </div>
        </div>

        <div className="stat-card shadow-sm" style={{ borderLeft: '4px solid var(--danger)' }}>
          <div className="stat-icon-wrapper danger-soft">
            <AlertTriangle size={24} className="text-danger" />
          </div>
          <div>
            <span className="stat-title">Low Stock Alerts</span>
            <h3 className="text-danger">{stats.lowStockCount}</h3>
          </div>
        </div>
      </div>

      {/* Control Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem' }}>
        <button 
          onClick={() => { setMoveType('In'); setShowMoveModal(true); }}
          className="btn btn-secondary flex align-center gap-0.5"
        >
          <ArrowUpRight size={16} /> Record Stock In
        </button>
        <button 
          onClick={() => { setMoveType('Out'); setShowMoveModal(true); }}
          className="btn btn-outline flex align-center gap-0.5"
          style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
        >
          <ArrowDownLeft size={16} /> Record Stock Out
        </button>
      </div>

      {/* Tab Switcher: Solves the "screen grid half cut not showing in screen" layout issue */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '1rem', gap: '1.5rem' }}>
        <button
          type="button"
          onClick={() => setActiveSubTab('inventory')}
          style={{
            padding: '8px 4px',
            fontSize: '0.875rem',
            fontWeight: 700,
            color: activeSubTab === 'inventory' ? 'var(--primary)' : '#64748b',
            border: 'none',
            background: 'none',
            borderBottom: activeSubTab === 'inventory' ? '3px solid var(--primary)' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          Warehouse Inventory Registry
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('movements')}
          style={{
            padding: '8px 4px',
            fontSize: '0.875rem',
            fontWeight: 700,
            color: activeSubTab === 'movements' ? 'var(--primary)' : '#64748b',
            border: 'none',
            background: 'none',
            borderBottom: activeSubTab === 'movements' ? '3px solid var(--primary)' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          Stock Movement Logs
        </button>
      </div>

      {/* Main Grid Tables */}
      <div style={{ width: '100%' }}>
        {activeSubTab === 'inventory' ? (
          <ALVGrid 
            title="Warehouse Inventory List"
            subtitle="Current stock levels and warehouse valuation ledger"
            columns={itemCols}
            data={items as any}
            rowKey="id"
            onAdd={() => { resetForm(); setShowItemModal(true); }}
            addLabel="Add Product"
            onRefresh={loadData}
            pageSize={10}
            selectable={false}
            loading={loading}
          />
        ) : (
          <ALVGrid 
            title="Stock Movement Log"
            subtitle="Postings for stock in, stock out, and manual overrides"
            columns={moveCols}
            data={movements as any}
            rowKey="id"
            onRefresh={loadData}
            pageSize={10}
            selectable={false}
            loading={loading}
          />
        )}
      </div>

      {/* Item Modal */}
      {showItemModal && (
        <div className="modal-overlay" onClick={() => setShowItemModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '600px' }}>
            <div className="modal-header">
              <h3>{editingItem ? `Edit Product: ${editingItem.code}` : 'Add New Inventory Item'}</h3>
              <button onClick={() => setShowItemModal(false)} className="close-btn"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveItem}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="grid grid-2 gap-2">
                  <div className="form-group">
                    <label className="form-label">Product Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      placeholder="e.g. 53-Grade Cement"
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unique Item Code</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={code} 
                      onChange={e => setCode(e.target.value.toUpperCase())} 
                      placeholder="e.g. CEMENT-53"
                      disabled={!!editingItem}
                      required 
                    />
                  </div>
                </div>

                <div className="grid grid-3 gap-2">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={category} 
                      onChange={e => setCategory(e.target.value)} 
                      placeholder="e.g. Cement" 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Brand</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={brand} 
                      onChange={e => setBrand(e.target.value)} 
                      placeholder="e.g. UltraTech" 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stock Unit</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={unit} 
                      onChange={e => setUnit(e.target.value)} 
                      placeholder="e.g. Bags, Tons, Pcs" 
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-3 gap-2">
                  <div className="form-group">
                    <label className="form-label">Purchase Price (INR)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={purchasePrice} 
                      onChange={e => setPurchasePrice(parseFloat(e.target.value) || 0)} 
                      min={0}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Selling Price (INR)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={sellingPrice} 
                      onChange={e => setSellingPrice(parseFloat(e.target.value) || 0)} 
                      min={0}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GST Percentage</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={gstPercentage} 
                      onChange={e => setGstPercentage(parseFloat(e.target.value) || 0)} 
                      min={0}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-3 gap-2">
                  {!editingItem && (
                    <div className="form-group">
                      <label className="form-label">Opening Stock Qty</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={openingStock} 
                        onChange={e => setOpeningStock(parseFloat(e.target.value) || 0)} 
                        min={0}
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Minimum Alert Level</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={minimumStock} 
                      onChange={e => setMinimumStock(parseFloat(e.target.value) || 0)} 
                      min={0}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Warehouse Shelf</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={warehouse} 
                      onChange={e => setWarehouse(e.target.value)} 
                      placeholder="e.g. Yard A" 
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Preferred Supplier</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={supplierName} 
                    onChange={e => setSupplierName(e.target.value)} 
                    placeholder="Supplier contact name" 
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowItemModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-secondary">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Movement Modal */}
      {showMoveModal && (
        <div className="modal-overlay" onClick={() => setShowMoveModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '450px' }}>
            <div className="modal-header">
              <h3>
                {moveType === 'In' ? 'Record Stock In' : moveType === 'Out' ? 'Record Stock Out' : 'Adjust Stock Level Override'}
              </h3>
              <button onClick={() => setShowMoveModal(false)} className="close-btn"><X size={20} /></button>
            </div>
            <form onSubmit={handleMovement}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Select Product</label>
                  <select 
                    value={mProductCode} 
                    onChange={e => setMProductCode(e.target.value)} 
                    className="form-control"
                    required
                  >
                    <option value="">Select product code...</option>
                    {items.map(item => (
                      <option key={item.id} value={item.code}>{item.name} ({item.code}) [Current: {item.currentStock}]</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {moveType === 'Adjust' ? 'New absolute stock count' : 'Quantity'}
                  </label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={mQuantity} 
                    onChange={e => setMQuantity(parseFloat(e.target.value) || 0)} 
                    min={0}
                    step="any"
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Post Date</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={mDate} 
                    onChange={e => setMDate(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Warehouse Yard</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={mWarehouse} 
                    onChange={e => setMWarehouse(e.target.value)} 
                    placeholder="e.g. Block A" 
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Movement Notes / Reason</label>
                  <textarea 
                    className="form-control" 
                    value={mNotes} 
                    onChange={e => setMNotes(e.target.value)} 
                    placeholder="Explain the stock adjustment reason..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowMoveModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-secondary">Submit Stock Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
