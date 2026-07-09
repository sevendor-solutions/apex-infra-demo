import React, { useState, useEffect, useMemo } from 'react';
import type { Quotation, QuotationItem, Customer, InventoryItem } from '../types';
import { 
  X, Trash 
} from 'lucide-react';
import { 
  getQuotations, addQuotation, updateQuotation, deleteQuotation,
  getInventoryItems, getCustomers, addInvoice 
} from '../utils/db';
import { ALVGrid } from './ALVGrid';
import type { ALVColumn } from './ALVGrid';

interface AdminQuotationsProps {
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onConfirm: (msg: string) => Promise<boolean>;
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const AdminQuotations: React.FC<AdminQuotationsProps> = ({
  onAddToast,
  onConfirm
}) => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [itemsList, setItemsList] = useState<InventoryItem[]>([]);
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [validTillDate, setValidTillDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30); // 30 days validity default
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('1. Quotation valid for 30 days from date of issue.\n2. Goods once sold will not be taken back.\n3. All disputes subject to local jurisdiction.');
  const [status, setStatus] = useState('Draft');

  // Quotation Line Items
  const [lineItems, setLineItems] = useState<QuotationItem[]>([
    { productName: '', productCode: '', quantity: 1, unitPrice: 0, discount: 0, gstPercentage: 18, total: 0 }
  ]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [quotes, items, customers] = await Promise.all([
        getQuotations(),
        getInventoryItems(),
        getCustomers()
      ]);
      setQuotations(quotes);
      setItemsList(items);
      setCustomersList(customers);
    } catch (err) {
      onAddToast('Failed to load quotations data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCustomerSelect = (name: string) => {
    setCustomerName(name);
    const cust = customersList.find(c => c.name === name);
    if (cust) {
      setCustomerMobile(cust.mobile);
      setCustomerAddress(cust.address || '');
    }
  };

  const handleProductSelect = (idx: number, code: string) => {
    const prod = itemsList.find(p => p.code === code);
    if (prod) {
      setLineItems(prev => prev.map((li, i) => {
        if (i !== idx) return li;
        const qty = li.quantity || 1;
        const discount = li.discount || 0;
        const price = prod.sellingPrice;
        const gst = prod.gstPercentage;
        const base = qty * price;
        const afterDisc = base - discount;
        const total = afterDisc + (afterDisc * (gst / 100));

        return {
          ...li,
          productName: prod.name,
          productCode: code,
          unitPrice: price,
          gstPercentage: gst,
          total
        };
      }));
    }
  };

  const updateLineItem = (idx: number, field: keyof QuotationItem, value: any) => {
    setLineItems(prev => prev.map((li, i) => {
      if (i !== idx) return li;
      const updated = { ...li, [field]: value };
      
      const qty = field === 'quantity' ? parseFloat(value) || 0 : li.quantity;
      const price = field === 'unitPrice' ? parseFloat(value) || 0 : li.unitPrice;
      const discount = field === 'discount' ? parseFloat(value) || 0 : li.discount;
      const gst = field === 'gstPercentage' ? parseFloat(value) || 0 : li.gstPercentage;
      
      const base = qty * price;
      const afterDisc = base - discount;
      updated.total = afterDisc + (afterDisc * (gst / 100));

      return updated;
    }));
  };

  const addLineItem = () => {
    setLineItems(prev => [
      ...prev,
      { productName: '', productCode: '', quantity: 1, unitPrice: 0, discount: 0, gstPercentage: 18, total: 0 }
    ]);
  };

  const removeLineItem = (idx: number) => {
    if (lineItems.length === 1) return;
    setLineItems(prev => prev.filter((_, i) => i !== idx));
  };

  const totalAmount = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + item.total, 0);
  }, [lineItems]);

  const resetForm = () => {
    setCustomerName('');
    setCustomerMobile('');
    setCustomerAddress('');
    setDate(new Date().toISOString().split('T')[0]);
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setValidTillDate(d.toISOString().split('T')[0]);
    setNotes('');
    setTerms('1. Quotation valid for 30 days from date of issue.\n2. Goods once sold will not be taken back.\n3. All disputes subject to local jurisdiction.');
    setStatus('Draft');
    setLineItems([{ productName: '', productCode: '', quantity: 1, unitPrice: 0, discount: 0, gstPercentage: 18, total: 0 }]);
    setEditingQuotation(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerMobile.trim()) {
      onAddToast('Customer name and mobile are required.', 'error');
      return;
    }
    if (lineItems.some(li => !li.productCode)) {
      onAddToast('Please select products for all line items.', 'error');
      return;
    }

    try {
      const payload = {
        customerName,
        customerMobile,
        customerAddress,
        date,
        validTillDate,
        items: lineItems,
        totalAmount,
        notes,
        termsAndConditions: terms,
        status
      };

      if (editingQuotation) {
        await updateQuotation({ ...payload, id: editingQuotation.id });
        onAddToast('Quotation updated successfully.', 'success');
      } else {
        await addQuotation(payload);
        onAddToast('Quotation created successfully.', 'success');
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (err) {
      onAddToast('Failed to save quotation.', 'error');
    }
  };

  const openEdit = (q: Quotation) => {
    setEditingQuotation(q);
    setCustomerName(q.customerName);
    setCustomerMobile(q.customerMobile);
    setCustomerAddress(q.customerAddress || '');
    setDate(q.date);
    setValidTillDate(q.validTillDate);
    setNotes(q.notes || '');
    setTerms(q.termsAndConditions || '');
    setStatus(q.status);
    setLineItems(q.items && q.items.length ? q.items : []);
    setShowModal(true);
  };

  const handleDelete = async (id: string, num: string) => {
    const ok = await onConfirm(`Delete quotation "${num}"?`);
    if (!ok) return;
    try {
      await deleteQuotation(id);
      onAddToast('Quotation deleted.', 'success');
      loadData();
    } catch (err) {
      onAddToast('Failed to delete quotation.', 'error');
    }
  };

  const handleConvertToInvoice = async (q: Quotation) => {
    const ok = await onConfirm(`Convert quotation "${q.quotationNumber}" to a Sales Invoice? This will automatically subtract items from warehouse stock.`);
    if (!ok) return;
    try {
      // Structure items for Invoice
      const invoiceItems = q.items.map(item => ({
        productName: item.productName,
        productCode: item.productCode,
        quantity: item.quantity,
        price: item.unitPrice,
        discount: item.discount,
        gst: (item.unitPrice * item.quantity - item.discount) * (item.gstPercentage / 100),
        total: item.total
      }));

      const gstTotal = invoiceItems.reduce((s, i) => s + i.gst, 0);
      const discountTotal = invoiceItems.reduce((s, i) => s + i.discount, 0);

      await addInvoice({
        customerName: q.customerName,
        date: new Date().toISOString().split('T')[0],
        items: invoiceItems as any,
        totalAmount: q.totalAmount,
        gstAmount: gstTotal,
        discountAmount: discountTotal,
        paidAmount: 0
      });

      // Update Quotation Status to Converted
      await updateQuotation({ id: q.id, status: 'Converted' });

      onAddToast(`Quotation ${q.quotationNumber} successfully converted to Invoice!`, 'success');
      loadData();
    } catch (err) {
      onAddToast('Failed to convert quotation to invoice.', 'error');
    }
  };

  const cols: ALVColumn[] = [
    { key: 'quotationNumber', label: 'Quotation Number', sortable: true },
    { key: 'customerName', label: 'Customer Name', sortable: true },
    { key: 'date', label: 'Date', sortable: true },
    { key: 'validTillDate', label: 'Valid Until', sortable: true },
    { 
      key: 'totalAmount', 
      label: 'Total Amount', 
      align: 'right', 
      render: (v) => <strong style={{ color: 'var(--secondary)' }}>{fmt(Number(v))}</strong> 
    },
    { key: 'status', label: 'Status', sortable: true, render: (v) => {
      const s = String(v);
      let color = 'var(--text-muted)';
      if (s === 'Approved' || s === 'Converted') color = 'var(--success)';
      if (s === 'Rejected') color = 'var(--danger)';
      if (s === 'Sent') color = 'var(--info)';
      return <span style={{ color, fontWeight: 'bold' }}>{s}</span>;
    }},
    {
      key: 'actions',
      label: 'Actions',
      align: 'center',
      render: (_, row) => {
        const q = row as unknown as Quotation;
        return (
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
            {q.status !== 'Converted' && (
              <button 
                onClick={() => handleConvertToInvoice(q)} 
                className="btn btn-sm btn-outline text-success"
                style={{ padding: '2px 8px', color: 'var(--success)', borderColor: 'var(--success)' }}
                title="Convert to Sales Invoice"
              >
                Convert to Inv
              </button>
            )}
            <button 
              onClick={() => openEdit(q)} 
              className="btn btn-sm btn-outline text-primary"
              style={{ padding: '2px 8px' }}
            >
              Edit
            </button>
            <button 
              onClick={() => handleDelete(q.id, q.quotationNumber)} 
              className="btn btn-sm btn-outline text-danger"
              style={{ padding: '2px 8px', color: '#ef4444', borderColor: '#ef4444' }}
            >
              Delete
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="admin-page-container">
      <ALVGrid 
        title="Quotation Management"
        subtitle="Manage, print, and convert buyer quotes to tax invoices"
        columns={cols}
        data={quotations as any}
        rowKey="id"
        onAdd={() => { resetForm(); setShowModal(true); }}
        addLabel="Create Quotation"
        onRefresh={loadData}
        pageSize={15}
        selectable={false}
        loading={loading}
      />

      {/* Quotation Editor Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '800px', maxWidth: '95%' }}>
            <div className="modal-header">
              <h3>{editingQuotation ? `Edit Quotation ${editingQuotation.quotationNumber}` : 'Create New Quotation'}</h3>
              <button onClick={() => setShowModal(false)} className="close-btn"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                <div className="grid grid-3 gap-2">
                  <div className="form-group">
                    <label className="form-label">Customer Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={customerName} 
                      onChange={e => handleCustomerSelect(e.target.value)} 
                      placeholder="Type name or select below..."
                      list="customers-datalist"
                      required
                    />
                    <datalist id="customers-datalist">
                      {customersList.map(c => <option key={c.id} value={c.name} />)}
                    </datalist>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Customer Mobile</label>
                    <input 
                      type="tel" 
                      className="form-control" 
                      value={customerMobile} 
                      onChange={e => setCustomerMobile(e.target.value)} 
                      placeholder="e.g. 9876543210"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quote Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={date} 
                      onChange={e => setDate(e.target.value)} 
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-2 gap-2">
                  <div className="form-group">
                    <label className="form-label">Customer Address</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={customerAddress} 
                      onChange={e => setCustomerAddress(e.target.value)} 
                      placeholder="Shipping/Billing Address"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Validity Till Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={validTillDate} 
                      onChange={e => setValidTillDate(e.target.value)} 
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label font-bold" style={{ borderBottom: '1px solid #eee', paddingBottom: '4px', marginBottom: '8px' }}>Line Items / Products</label>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }} className="text-sm">
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                        <th style={{ padding: '6px' }}>Product Select</th>
                        <th style={{ padding: '6px', width: '90px' }}>Qty</th>
                        <th style={{ padding: '6px', width: '120px' }}>Unit Price</th>
                        <th style={{ padding: '6px', width: '100px' }}>Discount</th>
                        <th style={{ padding: '6px', width: '100px' }}>GST%</th>
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
                                <option key={prod.id} value={prod.code}>{prod.name} ({prod.code})</option>
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
                              value={item.unitPrice} 
                              onChange={e => updateLineItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)} 
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
                          <td style={{ padding: '4px' }}>
                            <input 
                              type="number" 
                              value={item.gstPercentage} 
                              onChange={e => updateLineItem(idx, 'gstPercentage', parseFloat(e.target.value) || 0)} 
                              className="form-control"
                              style={{ marginBottom: 0, padding: '4px' }}
                              min={0}
                              required
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
                      <label className="form-label">Terms & Conditions</label>
                      <textarea 
                        value={terms} 
                        onChange={e => setTerms(e.target.value)} 
                        className="form-control"
                        rows={3} 
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Internal Notes / Memo</label>
                      <textarea 
                        value={notes} 
                        onChange={e => setNotes(e.target.value)} 
                        className="form-control"
                        rows={2} 
                      />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                      <div className="flex justify-between font-semibold">
                        <span>Total Items Value:</span>
                        <span>{fmt(totalAmount)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg" style={{ borderTop: '1px solid #ddd', paddingTop: '8px', color: 'var(--primary)' }}>
                        <span>Grand Total (INR):</span>
                        <span>{fmt(totalAmount)}</span>
                      </div>
                    </div>
                    <div className="form-group mt-1">
                      <label className="form-label">Quotation Status</label>
                      <select 
                        value={status} 
                        onChange={e => setStatus(e.target.value)} 
                        className="form-control"
                      >
                        <option value="Draft">Draft</option>
                        <option value="Sent">Sent</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-secondary">Save Quotation</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
