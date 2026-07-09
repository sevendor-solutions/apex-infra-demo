import React, { useState, useEffect, useMemo } from 'react';
import type { Invoice, InvoiceItem, Customer, InventoryItem, Wallet } from '../types';
import { 
  X, Trash, 
  DollarSign, FileText, Landmark 
} from 'lucide-react';
import { 
  getInvoices, addInvoice, deleteInvoice,
  getInventoryItems, getCustomers, getWallets 
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
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [walletId, setWalletId] = useState('');

  // Invoice Line Items
  const [lineItems, setLineItems] = useState<InvoiceItem[]>([]);

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
          gst,
          total
        };
      }));
    }
  };

  const updateLineItem = (idx: number, field: keyof InvoiceItem, value: any) => {
    setLineItems(prev => prev.map((li, i) => {
      if (i !== idx) return li;
      const updated = { ...li, [field]: value };
      
      const qty = field === 'quantity' ? parseFloat(value) || 0 : li.quantity;
      const price = field === 'price' ? parseFloat(value) || 0 : li.price;
      const discount = field === 'discount' ? parseFloat(value) || 0 : li.discount;
      
      const prod = itemsList.find(p => p.code === li.productCode);
      const gstPct = prod ? prod.gstPercentage : 18;
      
      const base = qty * price;
      const afterDisc = base - discount;
      updated.gst = afterDisc * (gstPct / 100);
      updated.total = afterDisc + updated.gst;

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
                  <div className="form-group">
                    <label className="form-label">Customer Select</label>
                    <select 
                      value={customerName} 
                      onChange={e => setCustomerName(e.target.value)} 
                      className="form-control"
                      required
                    >
                      <option value="">-- Select Customer Account --</option>
                      {customersList.map(c => <option key={c.id} value={c.name}>{c.name} (Outstanding: {fmt(c.outstandingAmount)})</option>)}
                    </select>
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
                  <table style={{ width: '100%', borderCollapse: 'collapse' }} className="text-sm">
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                        <th style={{ padding: '6px' }}>Product</th>
                        <th style={{ padding: '6px', width: '90px' }}>Qty</th>
                        <th style={{ padding: '6px', width: '120px' }}>Selling Price</th>
                        <th style={{ padding: '6px', width: '100px' }}>Discount</th>
                        <th style={{ padding: '6px', width: '120px', textAlign: 'right' }}>Total</th>
                        <th style={{ padding: '6px', width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '4px' }}>
                            <select 
                              value={item.productCode} 
                              onChange={e => handleProductSelect(idx, e.target.value)} 
                              className="form-control"
                              style={{ marginBottom: 0, padding: '4px' }}
                              required
                            >
                              <option value="">-- Select Product --</option>
                              {itemsList.map(prod => (
                                <option key={prod.id} value={prod.code}>{prod.name} ({prod.code}) [Available: {prod.currentStock}]</option>
                              ))}
                            </select>
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
