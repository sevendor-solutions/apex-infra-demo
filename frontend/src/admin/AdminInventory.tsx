import React, { useState, useEffect, useMemo } from 'react';
import type { InventoryItem, StockMovement, Invoice, Quotation } from '../types';
import { 
  X, Search, Share2, Plus, Trash2, Edit2, Settings,
  Package, FileSpreadsheet, ToggleLeft, ToggleRight, MoreVertical
} from 'lucide-react';
import { 
  getInventoryItems, addInventoryItem, updateInventoryItem, deleteInventoryItem,
  getStockMovements, stockIn, stockOut, adjustStock, getInvoices, getQuotations
} from '../utils/db';

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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(false);

  // Active Tab: 'products' | 'services'
  const [activeTab, setActiveTab] = useState<'products' | 'services'>('products');

  // Selected item for detail view
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [txSearchTerm, setTxSearchTerm] = useState('');

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showBatchesModal, setShowBatchesModal] = useState(false);

  // Editing state
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Form Fields - Item
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('');
  const [hsn, setHsn] = useState('');
  const [unit, setUnit] = useState('SFT');
  const [type, setType] = useState<'Product' | 'Service'>('Product');
  const [batchTracking, setBatchTracking] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);

  // Pricing Tab Fields
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [sellingPriceTaxType, setSellingPriceTaxType] = useState<string>('Without Tax');
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [purchasePriceTaxType, setPurchasePriceTaxType] = useState<string>('Without Tax');
  const [gstPercentage, setGstPercentage] = useState<number>(5);

  // Stock Tab Fields
  const [openingStock, setOpeningStock] = useState<number>(0);
  const [minimumStockLevel, setMinimumStockLevel] = useState<number>(10);
  const [warehouseLocation, setWarehouseLocation] = useState('Main Warehouse');

  // Active Tab inside Add/Edit Item Modal: 'pricing' | 'stock'
  const [modalTab, setModalTab] = useState<'pricing' | 'stock'>('pricing');

  // Form Fields - Adjust Stock
  const [adjType, setAdjType] = useState<'In' | 'Out' | 'Adjust'>('Adjust');
  const [adjQty, setAdjQty] = useState<number>(0);
  const [adjDate, setAdjDate] = useState(new Date().toISOString().split('T')[0]);
  const [adjNotes, setAdjNotes] = useState('');

  // Local Batches config state
  const [modalBatches, setModalBatches] = useState<any[]>([]);

  // Action Menu Dropdowns
  const [activeItemMenuId, setActiveItemMenuId] = useState<string | null>(null);

  const [localCustomUnits, setLocalCustomUnits] = useState<string[]>([]);
  const [localCustomCategories, setLocalCustomCategories] = useState<string[]>([]);

  const handleUnitChange = (val: string) => {
    if (val === 'ADD_CUSTOM') {
      const custom = window.prompt("Enter new custom unit (e.g., Hrs, Days, Drum):");
      if (custom && custom.trim()) {
        const cleaned = custom.trim();
        setUnit(cleaned);
        setLocalCustomUnits(prev => Array.from(new Set([...prev, cleaned])));
      }
    } else {
      setUnit(val);
    }
  };

  const handleCategoryChange = (val: string) => {
    if (val === 'ADD_CUSTOM') {
      const custom = window.prompt("Enter new custom category (e.g., Cement, Paint, Electrical):");
      if (custom && custom.trim()) {
        const cleaned = custom.trim();
        setCategory(cleaned);
        setLocalCustomCategories(prev => Array.from(new Set([...prev, cleaned])));
      }
    } else {
      setCategory(val);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemList, moveList, invList, quoteList] = await Promise.all([
        getInventoryItems(),
        getStockMovements(),
        getInvoices(),
        getQuotations().catch(() => [])
      ]);
      setItems(itemList);
      setMovements(moveList);
      setInvoices(invList);
      setQuotations(quoteList || []);
      
      // Keep selected item sync or default to first
      if (itemList.length > 0) {
        setSelectedItem(prev => {
          if (!prev) return itemList[0];
          const fresh = itemList.find(it => it.id === prev.id);
          return fresh || itemList[0];
        });
      } else {
        setSelectedItem(null);
      }
    } catch (err) {
      onAddToast('Failed to load inventory data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter products / services
  const filteredItems = useMemo(() => {
    const isService = activeTab === 'services';
    return items.filter(item => {
      const matchType = isService ? item.type === 'Service' : item.type !== 'Service';
      const q = searchTerm.toLowerCase();
      const matchQuery = !q || item.name?.toLowerCase().includes(q) || item.code?.toLowerCase().includes(q) || item.category?.toLowerCase().includes(q);
      return matchType && matchQuery;
    });
  }, [items, activeTab, searchTerm]);

  // Unique categories collect
  const categoriesList = useMemo(() => {
    const list = new Set<string>([...localCustomCategories]);
    items.forEach(it => { if (it.category) list.add(it.category); });
    return Array.from(list);
  }, [items, localCustomCategories]);

  // Unique units collect
  const unitsList = useMemo(() => {
    const list = new Set<string>(['SFT', 'Pcs', 'Bags', 'Tons', 'Sq.Mt', 'Nos', 'Service', 'Box', ...localCustomUnits]);
    items.forEach(it => { if (it.unit) list.add(it.unit); });
    return Array.from(list);
  }, [items, localCustomUnits]);

  // Selected item transactions construct
  const selectedTransactions = useMemo(() => {
    if (!selectedItem) return [];
    const list: any[] = [];

    // 1. Opening Stock row
    if (selectedItem.openingStock > 0) {
      list.push({
        id: `opening-${selectedItem.id}`,
        type: 'Opening Stock',
        refNo: '—',
        name: 'Opening Stock',
        date: selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleDateString('en-GB') : '06/04/2026',
        quantity: selectedItem.openingStock,
        priceUnit: selectedItem.purchasePrice,
        status: '—',
        timestamp: selectedItem.createdAt ? new Date(selectedItem.createdAt).getTime() : 0
      });
    }

    // 2. Invoices (Sales)
    invoices.forEach(inv => {
      const matchItem = inv.items?.find(it => it.productCode === selectedItem.code);
      if (matchItem) {
        list.push({
          id: `sale-${inv.id}`,
          type: 'Sale',
          refNo: inv.invoiceNumber,
          name: inv.customerName,
          date: new Date(inv.date).toLocaleDateString('en-GB'),
          quantity: matchItem.quantity,
          priceUnit: matchItem.price,
          status: inv.paymentStatus === 'Partial' ? 'Partial' : (inv.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid'),
          timestamp: new Date(inv.date).getTime()
        });
      }
    });

    // 3. Quotations (Quotes / Estimates)
    quotations.forEach(q => {
      const matchItem = q.items?.find(it => it.productCode === selectedItem.code);
      if (matchItem) {
        list.push({
          id: `quote-${q.id}`,
          type: 'Quotation',
          refNo: q.quotationNumber,
          name: q.customerName,
          date: new Date(q.date).toLocaleDateString('en-GB'),
          quantity: matchItem.quantity,
          priceUnit: matchItem.unitPrice,
          status: q.status || 'Draft',
          timestamp: new Date(q.date).getTime()
        });
      }
    });

    // 4. Stock Movements (Adjustments, Stock In, Stock Out)
    movements.filter(m => m.productCode === selectedItem.code).forEach(m => {
      if (m.notes === 'Opening Stock Initial Seeding') return;
      list.push({
        id: `move-${m.id}`,
        type: m.type === 'Adjustment' ? 'Add Adjustment' : m.type,
        refNo: '—',
        name: m.notes || 'Stock Adjustment',
        date: new Date(m.date).toLocaleDateString('en-GB'),
        quantity: m.quantity,
        priceUnit: selectedItem.purchasePrice || 0,
        status: '—',
        timestamp: new Date(m.date).getTime()
      });
    });

    // Sort by date descending
    const sorted = list.sort((a, b) => b.timestamp - a.timestamp);

    // Apply transaction filter search
    if (txSearchTerm.trim()) {
      const q = txSearchTerm.toLowerCase();
      return sorted.filter(t => 
        t.type.toLowerCase().includes(q) || 
        t.refNo.toLowerCase().includes(q) || 
        t.name.toLowerCase().includes(q) ||
        t.status.toLowerCase().includes(q)
      );
    }
    return sorted;
  }, [selectedItem, invoices, quotations, movements, txSearchTerm]);

  const resetForm = () => {
    setName('');
    setCode('');
    setCategory('');
    setHsn('');
    setUnit('SFT');
    setType('Product');
    setBatchTracking(false);
    setBatches([]);
    setSellingPrice(0);
    setSellingPriceTaxType('Without Tax');
    setPurchasePrice(0);
    setPurchasePriceTaxType('Without Tax');
    setGstPercentage(5);
    setOpeningStock(0);
    setMinimumStockLevel(10);
    setWarehouseLocation('Main Warehouse');
    setEditingItem(null);
    setModalTab('pricing');
  };

  const openAddModal = () => {
    resetForm();
    setShowItemModal(true);
  };

  const openEdit = (item: InventoryItem) => {
    resetForm();
    setEditingItem(item);
    setName(item.name);
    setCode(item.code);
    setCategory(item.category || '');
    setHsn(item.hsn || '');
    setUnit(item.unit || 'SFT');
    setType(item.type as any || 'Product');
    setBatchTracking(item.batchTracking || false);
    setBatches(item.batches || []);
    setSellingPrice(item.sellingPrice || 0);
    setSellingPriceTaxType(item.sellingPriceTaxType || 'Without Tax');
    setPurchasePrice(item.purchasePrice || 0);
    setPurchasePriceTaxType(item.purchasePriceTaxType || 'Without Tax');
    setGstPercentage(item.gstPercentage || 5);
    setOpeningStock(item.openingStock || 0);
    setMinimumStockLevel(item.minimumStockLevel || 10);
    setWarehouseLocation(item.warehouseLocation || 'Main Warehouse');
    setModalTab('pricing');
    setShowItemModal(true);
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    const ok = await onConfirm(`Delete item "${item.name}"? This will clear all its stock records.`);
    if (!ok) return;
    try {
      await deleteInventoryItem(item.id);
      onAddToast('Item deleted successfully.', 'success');
      loadData();
    } catch (err) {
      onAddToast('Failed to delete item.', 'error');
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      onAddToast('Item Name and Unique Code are required.', 'error');
      return;
    }
    try {
      const payload: any = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        category,
        hsn,
        unit,
        type,
        batchTracking,
        batches,
        sellingPrice,
        sellingPriceTaxType,
        purchasePrice,
        purchasePriceTaxType,
        gstPercentage,
        openingStock,
        minimumStockLevel,
        warehouseLocation
      };

      if (editingItem) {
        await updateInventoryItem({ ...payload, id: editingItem.id });
        onAddToast('Item updated successfully.', 'success');
      } else {
        await addInventoryItem(payload);
        onAddToast('Item created successfully.', 'success');
      }
      setShowItemModal(false);
      loadData();
    } catch (err: any) {
      onAddToast(err.message || 'Failed to save item.', 'error');
    }
  };

  // Adjust stock movement submission
  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      const payload = {
        productCode: selectedItem.code,
        quantity: adjQty,
        date: adjDate,
        notes: adjNotes
      };

      if (adjType === 'In') {
        await stockIn(payload);
        onAddToast('Stock In recorded successfully.', 'success');
      } else if (adjType === 'Out') {
        // Double check stock levels
        if (selectedItem.currentStock < adjQty) {
          const proceed = await onConfirm(`Current stock (${selectedItem.currentStock}) is less than adjustment quantity (${adjQty}). Proceed anyway?`);
          if (!proceed) return;
        }
        await stockOut(payload);
        onAddToast('Stock Out recorded successfully.', 'success');
      } else {
        await adjustStock(payload);
        onAddToast('Stock level adjusted successfully.', 'success');
      }
      setShowAdjustModal(false);
      loadData();
    } catch (err: any) {
      onAddToast(err.message || 'Failed to adjust stock.', 'error');
    }
  };

  // Batches management helpers
  const openBatchesModal = () => {
    // Clone existing batches or load defaults
    const currentBatches = batches && batches.length > 0 ? [...batches] : [];
    setModalBatches(currentBatches);
    setShowBatchesModal(true);
  };

  const addBatchRow = () => {
    setModalBatches(prev => [
      ...prev,
      { facingFloor: '', uds: 0, flatNo: '', openingQty: 0, currentQty: 0 }
    ]);
  };

  const updateBatchRow = (idx: number, field: string, value: any) => {
    setModalBatches(prev => prev.map((b, i) => {
      if (i !== idx) return b;
      const updated = { ...b, [field]: value };
      if (field === 'openingQty') {
        // Set currentQty to openingQty as well initially
        updated.currentQty = Number(value) || 0;
      }
      return updated;
    }));
  };

  const deleteBatchRow = (idx: number) => {
    setModalBatches(prev => prev.filter((_, i) => i !== idx));
  };

  const saveBatchesConfig = () => {
    const totalQty = modalBatches.reduce((s, b) => s + (Number(b.openingQty) || 0), 0);
    setBatches(modalBatches);
    setOpeningStock(totalQty);
    setShowBatchesModal(false);
    onAddToast(`Configured ${modalBatches.length} batches. Total Opening Stock set to ${totalQty} ${unit}.`, 'info');
  };

  // Helper to check if a batch / floor unit is linked to a saved invoice
  const getBatchInvoiceInfo = (item: InventoryItem, batch: any): Invoice | null => {
    if (!invoices || invoices.length === 0 || !batch || !batch.flatNo) return null;
    const flatNoStr = String(batch.flatNo).trim();
    if (!flatNoStr) return null;

    for (const inv of invoices) {
      const allLineItems = [...(inv.items || []), ...(inv.amenityItems || [])];
      for (const line of allLineItems) {
        if (!line.productName) continue;
        
        const itemCode = (item.code || '').trim().toLowerCase();
        const itemName = (item.name || '').trim().toLowerCase();
        const lineCode = (line.productCode || '').trim().toLowerCase();
        const lineName = (line.productName || '').trim().toLowerCase();
        const projName = (inv.projectName || '').trim().toLowerCase();

        const matchesProduct = 
          (lineCode && itemCode && lineCode === itemCode) ||
          (projName && projName === itemName) ||
          (lineName.includes(itemName));

        if (!matchesProduct) continue;

        const flatLower = flatNoStr.toLowerCase();
        const escapedFlat = flatLower.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

        const flatWithKeywordRegex = new RegExp(`\\bflat[\\s#_-]*${escapedFlat}\\b`, 'i');
        const flatStandaloneRegex = new RegExp(`\\b${escapedFlat}\\b`, 'i');

        if (flatWithKeywordRegex.test(lineName) || (lineName.includes('flat') && flatStandaloneRegex.test(lineName))) {
          return inv;
        }
      }
    }
    return null;
  };

  // Helper to check if a batch / floor unit is linked to a saved quotation
  const getBatchQuotationInfo = (item: InventoryItem, batch: any): Quotation | null => {
    if (!quotations || quotations.length === 0 || !batch || !batch.flatNo) return null;
    const flatNoStr = String(batch.flatNo).trim();
    if (!flatNoStr) return null;

    for (const q of quotations) {
      if (q.status === 'Rejected') continue;
      const allLineItems = [...(q.items || []), ...(q.amenityItems || [])];
      for (const line of allLineItems) {
        if (!line.productName) continue;
        
        const itemCode = (item.code || '').trim().toLowerCase();
        const itemName = (item.name || '').trim().toLowerCase();
        const lineCode = (line.productCode || '').trim().toLowerCase();
        const lineName = (line.productName || '').trim().toLowerCase();
        const projName = (q.projectName || '').trim().toLowerCase();

        const matchesProduct = 
          (lineCode && itemCode && lineCode === itemCode) ||
          (projName && projName === itemName) ||
          (lineName.includes(itemName));

        if (!matchesProduct) continue;

        const flatLower = flatNoStr.toLowerCase();
        const escapedFlat = flatLower.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

        const flatWithKeywordRegex = new RegExp(`\\bflat[\\s#_-]*${escapedFlat}\\b`, 'i');
        const flatStandaloneRegex = new RegExp(`\\b${escapedFlat}\\b`, 'i');

        if (flatWithKeywordRegex.test(lineName) || (lineName.includes('flat') && flatStandaloneRegex.test(lineName))) {
          return q;
        }
      }
    }
    return null;
  };

  // Export transactions helper
  const exportToExcel = () => {
    if (!selectedItem) return;
    let csv = `Transactions for ${selectedItem.name} (${selectedItem.code})\n`;
    csv += `Type,Invoice/Ref No.,Party Name,Date,Quantity (${selectedItem.unit}),Price/Unit,Status\n`;
    selectedTransactions.forEach(t => {
      csv += `"${t.type}","${t.refNo}","${t.name}","${t.date}",${t.quantity},${t.priceUnit},"${t.status}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `${selectedItem.name.replace(/\s+/g, '_')}_ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onAddToast('Ledger exported successfully as CSV.', 'success');
  };

  return (
    <div className="admin-page-container admin-inventory-view" style={{ padding: '1rem', background: '#f8fafc', minHeight: 'calc(100vh - 80px)' }}>
      
      {/* ── Tabs Bar ────────────────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '1.2rem', background: '#fff', borderRadius: '8px 8px 0 0', padding: '0.5rem 1rem 0', gap: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {(['products', 'services'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => { setActiveTab(tab); setSearchTerm(''); }}
            style={{
              padding: '10px 6px',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: activeTab === tab ? '#3b82f6' : '#64748b',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === tab ? '3px solid #3b82f6' : '3px solid transparent',
              cursor: 'pointer',
              textTransform: 'uppercase',
              transition: 'all 0.15s'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Main Workspace ──────────────────────────────────── */}
      <div className="admin-inventory-workspace" style={{ display: 'flex', gap: '16px', height: 'calc(100vh - 180px)' }}>
          
          {/* ── Left Pane: Items List ───────────────────────── */}
          <div className="admin-inventory-left-pane" style={{ width: '330px', background: '#fff', borderRadius: '10px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0' }}>
            
            {/* Search and Add */}
            <div style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                  <input
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search items..."
                    style={{ width: '100%', padding: '7px 10px 7px 32px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', background: '#f8fafc' }}
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Add Item Button */}
                <button
                  onClick={openAddModal}
                  style={{
                    background: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 4px rgba(245, 158, 11, 0.2)'
                  }}
                >
                  <Plus size={15} />
                  Add Item
                </button>
              </div>
            </div>

            {/* List Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
              {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>Loading items...</div>
              ) : filteredItems.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                  No {activeTab} found.
                </div>
              ) : (
                filteredItems.map(item => {
                  const isSelected = selectedItem?.id === item.id;
                  const isLowStock = item.currentStock <= item.minimumStockLevel;
                  return (
                    <div
                      key={item.id}
                      onClick={() => { setSelectedItem(item); setActiveItemMenuId(null); }}
                      style={{
                        padding: '0.85rem 1rem',
                        cursor: 'pointer',
                        background: isSelected ? '#eff6ff' : 'transparent',
                        borderLeft: isSelected ? '4px solid #3b82f6' : '4px solid transparent',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        position: 'relative',
                        transition: 'all 0.1s'
                      }}
                    >
                      <div style={{ flex: 1, paddingRight: '8px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: isSelected ? '#1d4ed8' : '#1e293b', textTransform: 'uppercase', wordBreak: 'break-word' }}>
                          {item.name}
                        </div>
                        {item.category && (
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                            {item.category}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
                        <span style={{ 
                          fontSize: '0.82rem', 
                          fontWeight: 800, 
                          color: item.currentStock === 0 ? '#ef4444' : (isLowStock ? '#f59e0b' : '#10b981')
                        }}>
                          {item.currentStock}
                        </span>

                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={() => setActiveItemMenuId(prev => prev === item.id ? null : item.id)}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                          >
                            <MoreVertical size={16} />
                          </button>

                          {activeItemMenuId === item.id && (
                            <div style={{
                              position: 'absolute',
                              right: 0,
                              top: '25px',
                              background: '#fff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                              zIndex: 100,
                              width: '100px',
                              overflow: 'hidden'
                            }}>
                              <button
                                onClick={() => { openEdit(item); setActiveItemMenuId(null); }}
                                style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', fontSize: '0.78rem', cursor: 'pointer', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}
                              >
                                <Edit2 size={12} /> Edit
                              </button>
                              <button
                                onClick={() => { handleDeleteItem(item); setActiveItemMenuId(null); }}
                                style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', fontSize: '0.78rem', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px', borderTop: '1px solid #f1f5f9' }}
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Right Pane: Details & Transactions ───────────── */}
          <div style={{ flex: 1, background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {selectedItem ? (
              <>
                {/* Right Header */}
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase' }}>
                      {selectedItem.name}
                    </h2>
                    <button style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex' }} title="Share Ledger">
                      <Share2 size={16} />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setAdjType('Adjust');
                      setAdjQty(selectedItem.currentStock);
                      setAdjNotes('');
                      setShowAdjustModal(true);
                    }}
                    style={{
                      background: '#3b82f6',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
                    }}
                  >
                    <Settings size={14} />
                    ADJUST ITEM
                  </button>
                </div>

                {/* Details Scroll Area */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                  
                  {/* Valuation & Pricing Cards Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '2rem' }}>
                    
                    <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fcfcfd' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Sale Price</span>
                      <h4 style={{ margin: '4px 0 0', fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
                        {fmt(selectedItem.sellingPrice || 0)}
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8', marginLeft: '4px' }}>
                          ({selectedItem.sellingPriceTaxType === 'With Tax' ? 'incl' : 'excl'})
                        </span>
                      </h4>
                    </div>

                    <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fcfcfd' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Purchase Price</span>
                      <h4 style={{ margin: '4px 0 0', fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
                        {fmt(selectedItem.purchasePrice || 0)}
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8', marginLeft: '4px' }}>
                          ({selectedItem.purchasePriceTaxType === 'With Tax' ? 'incl' : 'excl'})
                        </span>
                      </h4>
                    </div>

                    <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fcfcfd' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Stock Quantity</span>
                      <h4 style={{ margin: '4px 0 0', fontSize: '1.1rem', fontWeight: 800, color: selectedItem.currentStock === 0 ? '#ef4444' : '#10b981' }}>
                        {selectedItem.currentStock} {selectedItem.unit}
                      </h4>
                    </div>

                    <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fcfcfd' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Stock Value</span>
                      <h4 style={{ margin: '4px 0 0', fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
                        {fmt((selectedItem.currentStock || 0) * (selectedItem.purchasePrice || selectedItem.sellingPrice || 0))}
                      </h4>
                    </div>

                  </div>

                  {/* Batches Sub-section (if batchTracking is enabled) */}
                  {selectedItem.batchTracking && selectedItem.batches && selectedItem.batches.length > 0 && (
                    <div style={{ marginBottom: '2.5rem', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ background: '#f1f5f9', padding: '0.5rem 1rem', fontWeight: 700, fontSize: '0.8rem', color: '#475569', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Configured Batches / Floor Units ({selectedItem.batches.length})</span>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                            <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b' }}>FACING/FLOOR</th>
                            <th style={{ textAlign: 'center', padding: '8px 12px', color: '#64748b' }}>UDS</th>
                            <th style={{ textAlign: 'center', padding: '8px 12px', color: '#64748b' }}>Flat No.</th>
                            <th style={{ textAlign: 'center', padding: '8px 12px', color: '#64748b' }}>STATUS</th>
                            <th style={{ textAlign: 'right', padding: '8px 12px', color: '#64748b' }}>QTY ({selectedItem.unit})</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedItem.batches.map((b: any, i: number) => {
                            const linkedInvoice = getBatchInvoiceInfo(selectedItem, b);
                            const linkedQuotation = !linkedInvoice ? getBatchQuotationInfo(selectedItem, b) : null;
                            const isInvoiced = !!linkedInvoice;
                            const isQuoted = !!linkedQuotation;

                            return (
                              <tr 
                                key={i} 
                                style={{ 
                                  borderBottom: i === selectedItem.batches!.length - 1 ? 'none' : '1px solid #f1f5f9',
                                  backgroundColor: isInvoiced ? '#fef2f2' : (isQuoted ? '#fffbeb' : (i % 2 === 0 ? '#ffffff' : '#fcfcfd'))
                                }}
                              >
                                <td style={{ padding: '8px 12px', fontWeight: 600, color: isInvoiced ? '#991b1b' : (isQuoted ? '#92400e' : '#334155') }}>
                                  {b.facingFloor}
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'center', color: isInvoiced ? '#991b1b' : (isQuoted ? '#92400e' : '#475569') }}>
                                  {b.uds}
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: isInvoiced ? '#dc2626' : (isQuoted ? '#b45309' : '#0f172a') }}>
                                  {b.flatNo}
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                  {isInvoiced ? (
                                    <span 
                                      title={`Invoiced to ${linkedInvoice.customerName} (${linkedInvoice.invoiceNumber})`}
                                      style={{
                                        backgroundColor: '#fee2e2',
                                        color: '#dc2626',
                                        border: '1px solid #fca5a5',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.72rem',
                                        fontWeight: 800,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                    >
                                      SOLD ({linkedInvoice.invoiceNumber})
                                    </span>
                                  ) : isQuoted ? (
                                    <span 
                                      title={`Quoted to ${linkedQuotation.customerName} (${linkedQuotation.quotationNumber})`}
                                      style={{
                                        backgroundColor: '#fef3c7',
                                        color: '#b45309',
                                        border: '1px solid #fde68a',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                    >
                                      QUOTED ({linkedQuotation.quotationNumber})
                                    </span>
                                  ) : (
                                    <span 
                                      style={{
                                        backgroundColor: '#dcfce7',
                                        color: '#16a34a',
                                        border: '1px solid #86efac',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.72rem',
                                        fontWeight: 700
                                      }}
                                    >
                                      AVAILABLE
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: isInvoiced ? '#dc2626' : (isQuoted ? '#b45309' : '#10b981') }}>
                                  {b.openingQty}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Transactions Section */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase' }}>
                        TRANSACTIONS
                      </span>
                      
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ position: 'relative' }}>
                          <Search size={13} style={{ position: 'absolute', left: '8px', top: '8px', color: '#94a3b8' }} />
                          <input
                            value={txSearchTerm}
                            onChange={e => setTxSearchTerm(e.target.value)}
                            placeholder="Filter transactions..."
                            style={{ padding: '4px 8px 4px 26px', fontSize: '0.78rem', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', width: '160px' }}
                          />
                        </div>

                        <button
                          onClick={exportToExcel}
                          style={{
                            background: 'none',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#16a34a',
                            fontSize: '0.78rem',
                            fontWeight: 600
                          }}
                          title="Export Ledger to CSV"
                        >
                          <FileSpreadsheet size={14} />
                          Excel
                        </button>
                      </div>
                    </div>

                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ textAlign: 'left', padding: '10px 12px', color: '#475569' }}>TYPE</th>
                            <th style={{ textAlign: 'left', padding: '10px 12px', color: '#475569' }}>INVOICE/REF NO.</th>
                            <th style={{ textAlign: 'left', padding: '10px 12px', color: '#475569' }}>NAME</th>
                            <th style={{ textAlign: 'left', padding: '10px 12px', color: '#475569' }}>DATE</th>
                            <th style={{ textAlign: 'right', padding: '10px 12px', color: '#475569' }}>QUANTITY</th>
                            <th style={{ textAlign: 'right', padding: '10px 12px', color: '#475569' }}>PRICE/UNIT</th>
                            <th style={{ textAlign: 'center', padding: '10px 12px', color: '#475569' }}>STATUS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTransactions.length === 0 ? (
                            <tr>
                              <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                                No transactions matching search filters.
                              </td>
                            </tr>
                          ) : (
                            selectedTransactions.map((tx, idx) => {
                              const isSale = tx.type === 'Sale';
                              const isQuote = tx.type === 'Quotation';
                              const qtyColor = isSale || tx.type === 'Stock Out' ? '#ef4444' : (isQuote ? '#0284c7' : '#10b981');
                              
                              let statusBg = '#f1f5f9';
                              let statusText = '#475569';
                              if (tx.status === 'Paid' || tx.status === 'Approved') { statusBg = '#dcfce7'; statusText = '#16a34a'; }
                              else if (tx.status === 'Partial' || tx.status === 'Draft' || tx.status === 'Sent') { statusBg = '#fef3c7'; statusText = '#b45309'; }
                              else if (tx.status === 'Converted') { statusBg = '#e0f2fe'; statusText = '#0369a1'; }
                              else if (tx.status === 'Unpaid' || tx.status === 'Rejected') { statusBg = '#fee2e2'; statusText = '#ef4444'; }

                              return (
                                <tr key={tx.id || idx} style={{ borderBottom: idx === selectedTransactions.length - 1 ? 'none' : '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fcfcfd' }}>
                                  <td style={{ padding: '10px 12px', fontWeight: 700, color: isQuote ? '#0284c7' : '#334155' }}>
                                    {tx.type}
                                  </td>
                                  <td style={{ padding: '10px 12px', color: '#64748b' }}>{tx.refNo}</td>
                                  <td style={{ padding: '10px 12px', color: '#1e293b', fontWeight: 500 }}>{tx.name}</td>
                                  <td style={{ padding: '10px 12px', color: '#64748b' }}>{tx.date}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: qtyColor }}>
                                    {isSale || tx.type === 'Stock Out' ? '-' : (isQuote ? '' : '+')}{tx.quantity} {selectedItem.unit}
                                  </td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                                    {tx.priceUnit > 0 ? fmt(tx.priceUnit) : '—'}
                                  </td>
                                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                    {tx.status !== '—' ? (
                                      <span style={{ 
                                        color: statusText, 
                                        background: statusBg,
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        fontSize: '0.7rem',
                                        fontWeight: 700
                                      }}>
                                        {tx.status}
                                      </span>
                                    ) : '—'}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                <Package size={50} style={{ marginBottom: '1rem', color: '#cbd5e1' }} />
                <span>Select an item from the list to view its stock ledger and details.</span>
              </div>
            )}
          </div>
        </div>

      {/* ── Add / Edit Item Modal ────────────────────────────── */}
      {showItemModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="modal-content inventory-item-modal" style={{
            background: '#fff', borderRadius: '12px', width: '700px', maxWidth: '95vw', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', overflow: 'hidden', border: '1px solid #cbd5e1'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
                  {editingItem ? 'Edit Item' : 'Add Item'}
                </h3>
                
                {/* Product / Service Switch */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '3px 8px', borderRadius: '20px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: type === 'Product' ? '#3b82f6' : '#64748b' }}>Product</span>
                  <button
                    type="button"
                    onClick={() => setType(prev => prev === 'Product' ? 'Service' : 'Product')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: '#3b82f6', padding: 0 }}
                  >
                    {type === 'Product' ? <ToggleRight size={22} /> : <ToggleLeft size={22} style={{ color: '#64748b' }} />}
                  </button>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: type === 'Service' ? '#3b82f6' : '#64748b' }}>Service</span>
                </div>
              </div>

              <button onClick={() => setShowItemModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Body form */}
            <form onSubmit={handleSaveItem}>
              <div style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Basic Fields row */}
                <div className="inventory-modal-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Item Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. ICONIC HEIGHTS"
                      required
                      style={{ width: '100%', padding: '8px 10px', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Item HSN / SAC</label>
                    <input
                      type="text"
                      value={hsn}
                      onChange={e => setHsn(e.target.value)}
                      placeholder="Enter HSN number..."
                      style={{ width: '100%', padding: '8px 10px', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
                    />
                  </div>
                </div>

                {/* Category, code, unit */}
                <div className="inventory-modal-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Category</label>
                    <select
                      value={category}
                      onChange={e => handleCategoryChange(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', background: '#fff' }}
                    >
                      <option value="">Select Category...</option>
                      {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="ADD_CUSTOM" style={{ fontStyle: 'italic', color: '#2563eb', fontWeight: 700 }}>+ Add Custom Category...</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Item Code</label>
                    <input
                      type="text"
                      value={code}
                      onChange={e => setCode(e.target.value)}
                      placeholder="e.g. ICONIC-H"
                      disabled={!!editingItem}
                      required
                      style={{ width: '100%', padding: '8px 10px', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', background: editingItem ? '#f1f5f9' : '#fff' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Unit</label>
                    <select
                      value={unit}
                      onChange={e => handleUnitChange(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', background: '#fff' }}
                    >
                      {unitsList.map(u => <option key={u} value={u}>{u}</option>)}
                      <option value="ADD_CUSTOM" style={{ fontStyle: 'italic', color: '#2563eb', fontWeight: 700 }}>+ Add Custom Unit...</option>
                    </select>
                  </div>
                </div>

                {/* Batch Tracking checkbox */}
                {type === 'Product' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                    <input
                      type="checkbox"
                      id="batchTracking"
                      checked={batchTracking}
                      onChange={e => {
                        setBatchTracking(e.target.checked);
                        if (e.target.checked && batches.length === 0) {
                          // Trigger batches modal
                          openBatchesModal();
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                    <label htmlFor="batchTracking" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', cursor: 'pointer', flex: 1 }}>
                      Enable Batch / Floor Unit Tracking
                    </label>

                    {batchTracking && (
                      <button
                        type="button"
                        onClick={openBatchesModal}
                        style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Configure Batches ({batches.length})
                      </button>
                    )}
                  </div>
                )}

                {/* Sub Tabs Inside Modal: Pricing vs Stock */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginTop: '0.5rem', gap: '1.2rem' }}>
                  <button
                    type="button"
                    onClick={() => setModalTab('pricing')}
                    style={{
                      padding: '8px 4px', fontSize: '0.8rem', fontWeight: 700,
                      color: modalTab === 'pricing' ? '#ef4444' : '#64748b',
                      border: 'none', background: 'none',
                      borderBottom: modalTab === 'pricing' ? '2px solid #ef4444' : '2px solid transparent',
                      cursor: 'pointer'
                    }}
                  >
                    Pricing Details
                  </button>
                  {type === 'Product' && (
                    <button
                      type="button"
                      onClick={() => setModalTab('stock')}
                      style={{
                        padding: '8px 4px', fontSize: '0.8rem', fontWeight: 700,
                        color: modalTab === 'stock' ? '#ef4444' : '#64748b',
                        border: 'none', background: 'none',
                        borderBottom: modalTab === 'stock' ? '2px solid #ef4444' : '2px solid transparent',
                        cursor: 'pointer'
                      }}
                    >
                      Stock Levels
                    </button>
                  )}
                </div>

                {/* Pricing Fields */}
                {modalTab === 'pricing' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    
                    {/* Sale price & Purchase price */}
                    <div className="inventory-modal-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Sale Price (₹)</label>
                        <div className="price-input-group" style={{ display: 'flex' }}>
                          <input
                            type="number"
                            value={sellingPrice}
                            onChange={e => setSellingPrice(parseFloat(e.target.value) || 0)}
                            min={0}
                            style={{ flex: 1, padding: '8px 10px', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '6px 0 0 6px', outline: 'none' }}
                          />
                          <select
                            value={sellingPriceTaxType}
                            onChange={e => setSellingPriceTaxType(e.target.value)}
                            style={{ padding: '8px 10px', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderLeft: 'none', borderRadius: '0 6px 6px 0', outline: 'none', background: '#fff' }}
                          >
                            <option value="Without Tax">Without Tax</option>
                            <option value="With Tax">With Tax</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Purchase Price (₹)</label>
                        <div className="price-input-group" style={{ display: 'flex' }}>
                          <input
                            type="number"
                            value={purchasePrice}
                            onChange={e => setPurchasePrice(parseFloat(e.target.value) || 0)}
                            min={0}
                            style={{ flex: 1, padding: '8px 10px', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '6px 0 0 6px', outline: 'none' }}
                          />
                          <select
                            value={purchasePriceTaxType}
                            onChange={e => setPurchasePriceTaxType(e.target.value)}
                            style={{ padding: '8px 10px', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderLeft: 'none', borderRadius: '0 6px 6px 0', outline: 'none', background: '#fff' }}
                          >
                            <option value="Without Tax">Without Tax</option>
                            <option value="With Tax">With Tax</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Tax configuration */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Tax Rate</label>
                      <select
                        value={gstPercentage}
                        onChange={e => setGstPercentage(Number(e.target.value))}
                        style={{ width: '100%', padding: '8px 10px', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', background: '#fff' }}
                      >
                        <option value={0}>Exempted (0%)</option>
                        <option value={5}>GST @ 5%</option>
                        <option value={12}>GST @ 12%</option>
                        <option value={18}>GST @ 18%</option>
                        <option value={28}>GST @ 28%</option>
                      </select>
                    </div>

                  </div>
                )}

                {/* Stock Fields */}
                {modalTab === 'stock' && type === 'Product' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    
                    <div className="inventory-modal-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Opening Stock Qty</label>
                        <input
                          type="number"
                          value={openingStock}
                          onChange={e => setOpeningStock(parseFloat(e.target.value) || 0)}
                          min={0}
                          disabled={!!editingItem || batchTracking}
                          style={{ width: '100%', padding: '8px 10px', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', background: (editingItem || batchTracking) ? '#f1f5f9' : '#fff' }}
                        />
                        {batchTracking && (
                          <span style={{ fontSize: '0.62rem', color: '#64748b' }}>Computed from batches.</span>
                        )}
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Min Stock Alert Level</label>
                        <input
                          type="number"
                          value={minimumStockLevel}
                          onChange={e => setMinimumStockLevel(parseFloat(e.target.value) || 0)}
                          min={0}
                          style={{ width: '100%', padding: '8px 10px', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Storage Location</label>
                        <input
                          type="text"
                          value={warehouseLocation}
                          onChange={e => setWarehouseLocation(e.target.value)}
                          placeholder="e.g. Block A Shelf 4"
                          style={{ width: '100%', padding: '8px 10px', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
                        />
                      </div>
                    </div>

                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#f8fafc' }}>
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  style={{ padding: '8px 16px', fontSize: '0.82rem', fontWeight: 700, color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', fontSize: '0.82rem', fontWeight: 700, color: '#fff', border: 'none', borderRadius: '6px', background: '#3b82f6', cursor: 'pointer', boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)' }}
                >
                  {editingItem ? 'Update' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Adjust Stock Modal ────────────────────────────────── */}
      {showAdjustModal && selectedItem && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="modal-content" style={{
            background: '#fff', borderRadius: '12px', width: '450px', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', overflow: 'hidden', border: '1px solid #cbd5e1'
          }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                Adjust Stock: {selectedItem.name}
              </h3>
              <button onClick={() => setShowAdjustModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment}>
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Adjust Type */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Adjustment Type</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {(['In', 'Out', 'Adjust'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setAdjType(t)}
                        style={{
                          padding: '6px', fontSize: '0.75rem', fontWeight: 700, borderRadius: '4px', cursor: 'pointer', border: '1px solid #cbd5e1',
                          background: adjType === t ? '#3b82f6' : '#fff',
                          color: adjType === t ? '#fff' : '#475569'
                        }}
                      >
                        {t === 'In' ? 'Stock In (+)' : (t === 'Out' ? 'Stock Out (-)' : 'Override (=)')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Adjust Qty */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    {adjType === 'Adjust' ? 'New Target Stock Qty' : 'Quantity'} ({selectedItem.unit})
                  </label>
                  <input
                    type="number"
                    value={adjQty}
                    onChange={e => setAdjQty(parseFloat(e.target.value) || 0)}
                    min={0}
                    required
                    style={{ width: '100%', padding: '8px 10px', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
                  />
                </div>

                {/* Date */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Post Date</label>
                  <input
                    type="date"
                    value={adjDate}
                    onChange={e => setAdjDate(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 10px', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Adjustment Reason / Description</label>
                  <textarea
                    value={adjNotes}
                    onChange={e => setAdjNotes(e.target.value)}
                    placeholder="Enter stock adjustment reasons..."
                    style={{ width: '100%', padding: '8px 10px', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', height: '60px', resize: 'none' }}
                  />
                </div>

              </div>

              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#f8fafc' }}>
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  style={{ padding: '8px 16px', fontSize: '0.82rem', fontWeight: 700, color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', fontSize: '0.82rem', fontWeight: 700, color: '#fff', border: 'none', borderRadius: '6px', background: '#3b82f6', cursor: 'pointer' }}
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Stock - Batches Modal ────────────────────────── */}
      {showBatchesModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }}>
          <div className="modal-content" style={{
            background: '#fff', borderRadius: '12px', width: '800px', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', overflow: 'hidden', border: '1px solid #cbd5e1'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
                  Add Stock - Batches
                </h3>
                <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '0.78rem' }}>
                  <span>Item Name: <strong style={{ color: '#0f172a' }}>{name || 'New Item'}</strong></span>
                  <span>Category: <strong style={{ color: '#0f172a' }}>{category || 'project1'}</strong></span>
                </div>
              </div>
              <button onClick={() => setShowBatchesModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Body Table */}
            <div style={{ padding: '1.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ textAlign: 'left', padding: '10px', color: '#475569' }}>FACING/FLOOR</th>
                    <th style={{ textAlign: 'center', padding: '10px', color: '#475569' }}>UDS</th>
                    <th style={{ textAlign: 'center', padding: '10px', color: '#475569' }}>Flat No.</th>
                    <th style={{ textAlign: 'right', padding: '10px', color: '#475569' }}>OPENING QTY</th>
                    <th style={{ width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {modalBatches.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px' }}>
                        <input
                          value={row.facingFloor}
                          onChange={e => updateBatchRow(idx, 'facingFloor', e.target.value)}
                          placeholder="e.g. EAST / 1st"
                          style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="number"
                          value={row.uds}
                          onChange={e => updateBatchRow(idx, 'uds', parseFloat(e.target.value) || 0)}
                          placeholder="35"
                          style={{ width: '100%', padding: '6px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          value={row.flatNo}
                          onChange={e => updateBatchRow(idx, 'flatNo', e.target.value)}
                          placeholder="101"
                          style={{ width: '100%', padding: '6px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="number"
                          value={row.openingQty}
                          onChange={e => updateBatchRow(idx, 'openingQty', parseFloat(e.target.value) || 0)}
                          placeholder="1389"
                          style={{ width: '100%', padding: '6px', textAlign: 'right', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', fontWeight: 700 }}
                        />
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => deleteBatchRow(idx)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  
                  {/* Empty state check */}
                  {modalBatches.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                        No batches configured. Click "Add Batch Row" to begin.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Add row trigger */}
              <button
                type="button"
                onClick={addBatchRow}
                style={{
                  marginTop: '12px', background: 'none', border: '1px dashed #cbd5e1', borderRadius: '6px',
                  width: '100%', padding: '8px', cursor: 'pointer', color: '#64748b', fontSize: '0.8rem',
                  fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                <Plus size={14} /> Add Batch Row
              </button>

            </div>

            {/* Modal Footer with total */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155' }}>
                Total: <span style={{ color: '#2563eb', fontSize: '1.05rem', marginLeft: '6px' }}>
                  {modalBatches.reduce((s, b) => s + (Number(b.openingQty) || 0), 0)} {unit}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowBatchesModal(false)}
                  style={{ padding: '8px 16px', fontSize: '0.82rem', fontWeight: 700, color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveBatchesConfig}
                  style={{ padding: '8px 20px', fontSize: '0.82rem', fontWeight: 700, color: '#fff', border: 'none', borderRadius: '6px', background: '#3b82f6', cursor: 'pointer' }}
                >
                  Save
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
