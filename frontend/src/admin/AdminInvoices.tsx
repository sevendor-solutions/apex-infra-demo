import React, { useState, useEffect, useMemo } from 'react';
import type { Invoice, Customer, InventoryItem, Wallet } from '../types';
import { 
  X, Trash, 
  DollarSign, FileText, Landmark 
} from 'lucide-react';
import { 
  getInvoices, addInvoice, deleteInvoice,
  getInventoryItems, getCustomers, getWallets,
  addInventoryItem, addCustomer
} from '../utils/db';
import { ALVGrid } from './ALVGrid';
import type { ALVColumn } from './ALVGrid';

interface AdminInvoicesProps {
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onConfirm: (msg: string) => Promise<boolean>;
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const AdminInvoices: React.FC<AdminInvoicesProps> = ({
  onAddToast,
  onConfirm
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [itemsList, setItemsList] = useState<InventoryItem[]>([]);
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [walletsList, setWalletsList] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [customerSearchText, setCustomerSearchText] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [walletId, setWalletId] = useState('');

  // Invoice Line Items
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [activeProductSearchIdx, setActiveProductSearchIdx] = useState<number | null>(null);

  const handleCreateCustomer = async (typedName: string) => {
    if (!typedName.trim()) return;
    try {
      const uniqueMobile = '9' + Math.floor(100000000 + Math.random() * 900000000);
      const newCust = await addCustomer({
        name: typedName.trim(),
        mobile: uniqueMobile,
        openingBalance: 0
      });
      onAddToast(`Created customer account for "${newCust.name}"`, 'success');
      const customers = await getCustomers();
      setCustomersList(customers);
      setCustomerName(newCust.name);
      setCustomerSearchText(newCust.name);
      setShowCustomerDropdown(false);
    } catch (err: any) {
      onAddToast(err.message || 'Failed to create customer.', 'error');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [invs, items, customers, wallets] = await Promise.all([
        getInvoices(),
        getInventoryItems(),
        getCustomers(),
        getWallets()
      ]);
      setInvoices(invs);
      setItemsList(items);
      setCustomersList(customers);
      setWalletsList(wallets);
      if (wallets.length > 0) {
        setWalletId(wallets[0].id);
      }
    } catch (err) {
      onAddToast('Failed to load invoices data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProductSelect = (idx: number, code: string) => {
    const prod = itemsList.find(p => p.code === code);
    if (prod) {
      setLineItems(prev => prev.map((li, i) => {
        if (i !== idx) return li;
        const qty = li.quantity || 1;
        const discount = li.discount || 0;
        const price = prod.sellingPrice;
        const gstPct = prod.gstPercentage;
        const base = qty * price;
        const afterDisc = base - discount;
        const gst = afterDisc * (gstPct / 100);
        const total = afterDisc + gst;

        return {
          ...li,
          productName: prod.name,
          productCode: code,
          price,
          gstPercentage: gstPct,
          gst,
          total
        };
      }));
    }
  };

  const updateLineItem = (idx: number, field: string, value: any) => {
    setLineItems(prev => prev.map((li, i) => {
      if (i !== idx) return li;
      const updated = { ...li, [field]: value };
      
      const qty = field === 'quantity' ? parseFloat(value) || 0 : li.quantity;
      const price = field === 'price' ? parseFloat(value) || 0 : li.price;
      const discount = field === 'discount' ? parseFloat(value) || 0 : li.discount;
      const gstPct = field === 'gstPercentage' ? parseFloat(value) || 0 : (li.gstPercentage !== undefined ? li.gstPercentage : (() => {
        const prod = itemsList.find(p => p.code === li.productCode);
        return prod ? prod.gstPercentage : 18;
      })());
      
      const base = qty * price;
      const afterDisc = base - discount;
      updated.gst = afterDisc * (gstPct / 100);
      updated.total = afterDisc + updated.gst;
      updated.gstPercentage = gstPct;

      return updated;
    }));
  };

  const addLineItem = () => {
    setLineItems(prev => [
      ...prev,
      { productName: '', productCode: '', quantity: 1, price: 0, discount: 0, gst: 0, total: 0 }
    ]);
  };

  const removeLineItem = (idx: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== idx));
  };

  const totalAmount = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + item.total, 0);
  }, [lineItems]);

  const totalGst = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + item.gst, 0);
  }, [lineItems]);

  const totalDiscount = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + item.discount, 0);
  }, [lineItems]);

  const resetForm = () => {
    setCustomerName('');
    setCustomerSearchText('');
    setDate(new Date().toISOString().split('T')[0]);
    setPaidAmount(0);
    setLineItems([{ productName: '', productCode: '', quantity: 1, price: 0, discount: 0, gst: 0, total: 0 }]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      onAddToast('Please select a customer.', 'error');
      return;
    }
    if (lineItems.length === 0 || lineItems.some(li => !li.productCode)) {
      onAddToast('Please add products for all line items.', 'error');
      return;
    }

    try {
      const payload = {
        customerName,
        date,
        items: lineItems,
        totalAmount,
        gstAmount: totalGst,
        discountAmount: totalDiscount,
        paidAmount,
        walletId: paidAmount > 0 ? walletId : undefined
      };

      await addInvoice(payload as any);
      onAddToast('Invoice generated successfully.', 'success');
      setShowModal(false);
      resetForm();
      loadData();
    } catch (err) {
      onAddToast('Failed to generate sales invoice.', 'error');
    }
  };

  const handleDelete = async (id: string, num: string) => {
    const ok = await onConfirm(`Delete tax invoice "${num}"? This will reverse the customer outstanding debt balance and return the items back into warehouse inventory stock.`);
    if (!ok) return;
    try {
      await deleteInvoice(id);
      onAddToast('Invoice deleted and stock reversed.', 'success');
      loadData();
    } catch (err) {
      onAddToast('Failed to delete invoice.', 'error');
    }
  };

  // KPIs
  const stats = useMemo(() => {
    const totalSales = invoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
    const totalReceived = invoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
    const totalPending = invoices.reduce((sum, i) => sum + (i.pendingAmount || 0), 0);
    return {
      totalSales,
      totalReceived,
      totalPending
    };
  }, [invoices]);

  const cols: ALVColumn[] = [
    { key: 'invoiceNumber', label: 'Invoice Number', sortable: true },
    { key: 'customerName', label: 'Customer Name', sortable: true },
    { key: 'date', label: 'Date', sortable: true },
    { 
      key: 'totalAmount', 
      label: 'Grand Total', 
      align: 'right', 
      render: (v) => fmt(Number(v)) 
    },
    { key: 'paidAmount', label: 'Paid Amount', align: 'right', render: (v) => fmt(Number(v)) },
    { 
      key: 'pendingAmount', 
      label: 'Balance Pending', 
      align: 'right', 
      render: (v) => <strong style={{ color: Number(v) > 0 ? '#ef4444' : 'var(--success)' }}>{fmt(Number(v))}</strong> 
    },
    { key: 'paymentStatus', label: 'Payment Status', sortable: true, render: (v) => {
      const s = String(v);
      let color = 'var(--text-muted)';
      if (s === 'Paid') color = 'var(--success)';
      if (s === 'Partial') color = 'var(--warning)';
      if (s === 'Unpaid') color = 'var(--danger)';
      return <span style={{ color, fontWeight: 'bold' }}>{s}</span>;
    }},
    {
      key: 'actions',
      label: 'Actions',
      align: 'center',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
          <button 
            onClick={() => handleDelete(String(row.id), String(row.invoiceNumber))} 
            className="btn btn-sm btn-outline text-danger"
            style={{ padding: '2px 8px', color: '#ef4444', borderColor: '#ef4444' }}
          >
            Delete
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="admin-page-container">
      {/* KPIs */}
      <div className="grid grid-3 gap-2 mb-3">
        <div className="stat-card shadow-sm" style={{ borderLeft: '4px solid var(--secondary)' }}>
          <div className="stat-icon-wrapper secondary-soft">
            <FileText size={24} className="text-secondary" />
          </div>
          <div>
            <span className="stat-title">Total Sales Invoices</span>
            <h3>{fmt(stats.totalSales)}</h3>
          </div>
        </div>

        <div className="stat-card shadow-sm" style={{ borderLeft: '4px solid var(--success)' }}>
          <div className="stat-icon-wrapper success-soft">
            <DollarSign size={24} className="text-success" />
          </div>
          <div>
            <span className="stat-title">Cash Collections Received</span>
            <h3>{fmt(stats.totalReceived)}</h3>
          </div>
        </div>

        <div className="stat-card shadow-sm" style={{ borderLeft: '4px solid var(--danger)' }}>
          <div className="stat-icon-wrapper danger-soft">
            <Landmark size={24} className="text-danger" />
          </div>
          <div>
            <span className="stat-title">Receivables Outstanding</span>
            <h3 className="text-danger">{fmt(stats.totalPending)}</h3>
          </div>
        </div>
      </div>

      <ALVGrid 
        title="Sales Invoices Ledger"
        subtitle="Manage tax invoices, sales postings, and collections"
        columns={cols}
        data={invoices as any}
        rowKey="id"
        onAdd={() => { resetForm(); setShowModal(true); }}
        addLabel="Generate Sales Invoice"
        onRefresh={loadData}
        pageSize={15}
        selectable={false}
        loading={loading}
      />

      {/* Invoice Editor Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '800px', maxWidth: '95%' }}>
            <div className="modal-header">
              <h3>Generate Sales Invoice</h3>
              <button onClick={() => setShowModal(false)} className="close-btn"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                <div className="grid grid-2 gap-2">
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label className="form-label">Customer Select *</label>
                    <input 
                      type="text"
                      className="form-control"
                      value={customerSearchText}
                      onChange={e => {
                        const val = e.target.value;
                        setCustomerSearchText(val);
                        setCustomerName(val);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      onBlur={() => {
                        setTimeout(() => {
                          setShowCustomerDropdown(false);
                          if (customerSearchText.trim()) {
                            const matched = customersList.find(c => c.name.toLowerCase() === customerSearchText.trim().toLowerCase());
                            if (matched) {
                              setCustomerName(matched.name);
                              setCustomerSearchText(matched.name);
                            }
                          }
                        }, 250);
                      }}
                      placeholder="Search or type customer name..."
                      required
                    />
                    {showCustomerDropdown && (
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        backgroundColor: '#fff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        zIndex: 9999,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        marginTop: '2px'
                      }}>
                        <div 
                          onMouseDown={async () => {
                            const cName = prompt("Enter new customer name:");
                            if (!cName || !cName.trim()) return;
                            if (customersList.some(c => c.name.toLowerCase() === cName.trim().toLowerCase())) {
                              onAddToast('Customer already exists.', 'error');
                              return;
                            }
                            await handleCreateCustomer(cName);
                          }}
                          style={{ 
                            padding: '8px 12px', 
                            cursor: 'pointer', 
                            borderBottom: '1px solid #e2e8f0', 
                            fontSize: '0.78rem',
                            fontWeight: 'bold',
                            color: '#2563eb',
                            backgroundColor: '#fff',
                            textAlign: 'left'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; }}
                        >
                          + Create New Customer
                        </div>
                        {customerSearchText.trim() !== '' && !customersList.some(c => c.name.toLowerCase() === customerSearchText.trim().toLowerCase()) && (
                          <div 
                            onMouseDown={() => handleCreateCustomer(customerSearchText)}
                            style={{ 
                              padding: '8px 12px', 
                              cursor: 'pointer', 
                              borderBottom: '1px solid #f1f5f9', 
                              fontSize: '0.78rem',
                              fontWeight: 'bold',
                              color: '#2563eb',
                              backgroundColor: '#fff',
                              textAlign: 'left'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; }}
                          >
                            + Create Customer: "{customerSearchText}"
                          </div>
                        )}
                        {customersList
                          .filter(c => c.name.toLowerCase().includes(customerSearchText.toLowerCase()))
                          .map(c => (
                            <div 
                              key={c.id}
                              onMouseDown={() => {
                                setCustomerName(c.name);
                                setCustomerSearchText(c.name);
                                setShowCustomerDropdown(false);
                              }}
                              style={{ 
                                padding: '8px 12px', 
                                cursor: 'pointer', 
                                borderBottom: '1px solid #f1f5f9', 
                                fontSize: '0.78rem',
                                color: '#1e293b',
                                backgroundColor: '#fff',
                                textAlign: 'left'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; }}
                            >
                              {c.name} (Outstanding: {fmt(c.outstandingAmount)})
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Billing Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={date} 
                      onChange={e => setDate(e.target.value)} 
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label font-bold" style={{ borderBottom: '1px solid #eee', paddingBottom: '4px', marginBottom: '8px' }}>Line Items / Products</label>
                  <div className="modal-table-wrapper">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }} className="text-sm">
                      <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                          <th style={{ padding: '6px' }}>Product</th>
                          <th style={{ padding: '6px', width: '80px' }}>Qty</th>
                          <th style={{ padding: '6px', width: '110px' }}>Selling Price</th>
                          <th style={{ padding: '6px', width: '90px' }}>Discount</th>
                          <th style={{ padding: '6px', width: '100px', textAlign: 'center' }}>GST %</th>
                          <th style={{ padding: '6px', width: '120px', textAlign: 'right' }}>Total</th>
                          <th style={{ padding: '6px', width: '40px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '4px', position: 'relative' }}>
                              <input 
                                type="text"
                                value={item.productName}
                                onChange={e => {
                                  const val = e.target.value;
                                  const matched = itemsList.find(p => p.name.toLowerCase() === val.trim().toLowerCase());
                                  setLineItems(prev => prev.map((li, i) => {
                                    if (i !== idx) return li;
                                    if (matched) {
                                      const qty = li.quantity || 1;
                                      const discount = li.discount || 0;
                                      const price = matched.sellingPrice;
                                      const gstPct = matched.gstPercentage;
                                      const base = qty * price;
                                      const afterDisc = base - discount;
                                      const gst = afterDisc * (gstPct / 100);
                                      const total = afterDisc + gst;
                                      return {
                                        ...li,
                                        productName: matched.name,
                                        productCode: matched.code,
                                        price,
                                        gstPercentage: gstPct,
                                        gst,
                                        total
                                      };
                                    }
                                    return { ...li, productName: val, productCode: '' };
                                  }));
                                  setActiveProductSearchIdx(idx);
                                }}
                                onFocus={() => setActiveProductSearchIdx(idx)}
                                onBlur={() => {
                                  setTimeout(() => {
                                    setLineItems(prev => prev.map((li, i) => {
                                      if (i !== idx) return li;
                                      if (!li.productCode && li.productName.trim()) {
                                        const matched = itemsList.find(p => p.name.toLowerCase() === li.productName.trim().toLowerCase());
                                        if (matched) {
                                          const qty = li.quantity || 1;
                                          const discount = li.discount || 0;
                                          const price = matched.sellingPrice;
                                          const gstPct = matched.gstPercentage;
                                          const base = qty * price;
                                          const afterDisc = base - discount;
                                          const gst = afterDisc * (gstPct / 100);
                                          const total = afterDisc + gst;
                                          return {
                                            ...li,
                                            productName: matched.name,
                                            productCode: matched.code,
                                            price,
                                            gstPercentage: gstPct,
                                            gst,
                                            total
                                          };
                                        }
                                      }
                                      return li;
                                    }));
                                    setActiveProductSearchIdx(null);
                                  }, 250);
                                }}
                                placeholder="Search or type product..."
                                className="form-control"
                                style={{ marginBottom: 0, padding: '4px' }}
                                required
                              />
                              {activeProductSearchIdx === idx && (
                                <div style={{
                                  position: 'absolute',
                                  left: 4,
                                  right: 4,
                                  backgroundColor: '#fff',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '6px',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                  zIndex: 9999,
                                  maxHeight: '180px',
                                  overflowY: 'auto',
                                  marginTop: '2px'
                                }}>
                                  <div 
                                    onMouseDown={async () => {
                                      const pName = prompt("Enter new product/service name:");
                                      if (!pName || !pName.trim()) return;
                                      if (itemsList.some(p => p.name.toLowerCase() === pName.trim().toLowerCase())) {
                                        onAddToast('Product already exists.', 'error');
                                        return;
                                      }
                                      try {
                                        const code = 'SRV-' + Math.floor(1000 + Math.random() * 9000);
                                        const newItem = await addInventoryItem({
                                          name: pName.trim(),
                                          code,
                                          unit: 'Pcs',
                                          openingStock: 0,
                                          purchasePrice: 0,
                                          sellingPrice: item.price || 0,
                                          gstPercentage: 18
                                        });
                                        onAddToast(`Added "${newItem.name}" to database.`, 'success');
                                        await loadData();
                                        handleProductSelect(idx, newItem.code);
                                      } catch (err: any) {
                                        onAddToast(err.message || 'Failed to add item.', 'error');
                                      }
                                      setActiveProductSearchIdx(null);
                                    }}
                                    style={{ 
                                      padding: '8px 12px', 
                                      cursor: 'pointer', 
                                      borderBottom: '1px solid #e2e8f0', 
                                      fontSize: '0.78rem',
                                      fontWeight: 'bold',
                                      color: '#2563eb',
                                      backgroundColor: '#fff',
                                      textAlign: 'left'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; }}
                                  >
                                    + Create New Product/Service
                                  </div>
                                  {item.productName.trim() !== '' && !itemsList.some(prod => prod.name.toLowerCase() === item.productName.toLowerCase()) && (
                                    <div 
                                      onMouseDown={async () => {
                                        try {
                                          const code = 'SRV-' + Math.floor(1000 + Math.random() * 9000);
                                          const newItem = await addInventoryItem({
                                            name: item.productName,
                                            code,
                                            unit: 'Pcs',
                                            openingStock: 0,
                                            purchasePrice: 0,
                                            sellingPrice: item.price || 0,
                                            gstPercentage: 18
                                          });
                                          onAddToast(`Added "${newItem.name}" to database.`, 'success');
                                          await loadData();
                                          handleProductSelect(idx, newItem.code);
                                        } catch (err: any) {
                                          onAddToast(err.message || 'Failed to add item.', 'error');
                                        }
                                        setActiveProductSearchIdx(null);
                                      }}
                                      style={{ 
                                        padding: '8px 12px', 
                                        cursor: 'pointer', 
                                        borderBottom: '1px solid #f1f5f9', 
                                        fontSize: '0.78rem',
                                        fontWeight: 'bold',
                                        color: '#0854a0',
                                        backgroundColor: '#fff'
                                      }}
                                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; }}
                                    >
                                      + Add New Product/Service: "{item.productName}"
                                    </div>
                                  )}
                                  {itemsList
                                    .filter(prod => 
                                      prod.name.toLowerCase().includes(item.productName.toLowerCase()) || 
                                      prod.code.toLowerCase().includes(item.productName.toLowerCase())
                                    )
                                    .map((prod, pIdx) => (
                                      <div 
                                        key={prod.id || pIdx}
                                        onMouseDown={() => {
                                          handleProductSelect(idx, prod.code);
                                          setActiveProductSearchIdx(null);
                                        }}
                                        style={{ 
                                          padding: '8px 12px', 
                                          cursor: 'pointer', 
                                          borderBottom: '1px solid #f1f5f9', 
                                          fontSize: '0.78rem',
                                          color: '#1e293b',
                                          backgroundColor: '#fff',
                                          textAlign: 'left'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; }}
                                      >
                                        {prod.name} ({prod.code}) {prod.currentStock !== undefined ? `[Avail: ${prod.currentStock}]` : ''}
                                      </div>
                                    ))
                                  }
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '4px' }}>
                              <input 
                                type="number" 
                                value={item.quantity} 
                                onChange={e => updateLineItem(idx, 'quantity', parseFloat(e.target.value) || 0)} 
                                className="form-control"
                                style={{ marginBottom: 0, padding: '4px' }}
                                min={1}
                                required 
                              />
                            </td>
                            <td style={{ padding: '4px' }}>
                              <input 
                                type="number" 
                                value={item.price} 
                                onChange={e => updateLineItem(idx, 'price', parseFloat(e.target.value) || 0)} 
                                className="form-control"
                                style={{ marginBottom: 0, padding: '4px' }}
                                min={0}
                                required 
                              />
                            </td>
                            <td style={{ padding: '4px' }}>
                              <input 
                                type="number" 
                                value={item.discount} 
                                onChange={e => updateLineItem(idx, 'discount', parseFloat(e.target.value) || 0)} 
                                className="form-control"
                                style={{ marginBottom: 0, padding: '4px' }}
                                min={0}
                              />
                            </td>
                            <td style={{ padding: '4px', textAlign: 'center' }}>
                              <select
                                value={item.gstPercentage !== undefined ? item.gstPercentage : (() => {
                                  const prod = itemsList.find(p => p.code === item.productCode);
                                  return prod ? prod.gstPercentage : 18;
                                })()}
                                onChange={e => {
                                  const pct = parseFloat(e.target.value) || 0;
                                  updateLineItem(idx, 'gstPercentage', pct);
                                }}
                                className="form-control"
                                style={{ marginBottom: 0, padding: '4px', fontSize: '0.78rem', textAlign: 'center' }}
                              >
                                <option value={0}>0%</option>
                                <option value={5}>5%</option>
                                <option value={12}>12%</option>
                                <option value={18}>18%</option>
                                <option value={28}>28%</option>
                              </select>
                            </td>
                            <td style={{ padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>
                              {fmt(item.total)}
                            </td>
                            <td style={{ padding: '4px', textAlign: 'center' }}>
                              <button 
                                type="button" 
                                onClick={() => removeLineItem(idx)} 
                                className="text-danger" 
                                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                              >
                                <Trash size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button 
                    type="button" 
                    onClick={addLineItem} 
                    className="btn btn-outline btn-sm mt-1"
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                  >
                    + Add Product Line
                  </button>
                </div>

                <div className="grid grid-2 gap-3" style={{ borderTop: '1px solid #eee', paddingTop: '10px' }}>
                  <div>
                    <div className="form-group">
                      <label className="form-label">Payment Received Amount (INR)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={paidAmount} 
                        onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)} 
                        min={0}
                        max={totalAmount}
                        step="any"
                      />
                    </div>
                    {paidAmount > 0 && (
                      <div className="form-group">
                        <label className="form-label">Deposit Account</label>
                        <select 
                          value={walletId} 
                          onChange={e => setWalletId(e.target.value)} 
                          className="form-control"
                          required
                        >
                          {walletsList.map(w => <option key={w.id} value={w.id}>{w.name} ({fmt(w.currentBalance)})</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px' }} className="text-sm">
                      <div className="flex justify-between">
                        <span>GST Tax Amount:</span>
                        <span>{fmt(totalGst)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Discounts Deducted:</span>
                        <span>{fmt(totalDiscount)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg" style={{ borderTop: '1px solid #ddd', paddingTop: '8px', color: 'var(--primary)' }}>
                        <span>Grand Total (INR):</span>
                        <span>{fmt(totalAmount)}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-danger">
                        <span>Outstanding Debt Balance:</span>
                        <span>{fmt(totalAmount - paidAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-secondary">Save & Post Invoice</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
