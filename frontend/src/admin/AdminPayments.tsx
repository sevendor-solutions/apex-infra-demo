import React, { useState, useEffect, useMemo } from 'react';
import type { PaymentIn, PaymentOut, Invoice, Supplier, Customer, Wallet } from '../types';
import { 
  X, Bell 
} from 'lucide-react';
import { 
  getPaymentsIn, addPaymentIn, getPaymentsOut, addPaymentOut, 
  getPendingPayments, getCustomers, getSuppliers, getInvoices, getWallets 
} from '../utils/db';
import { ALVGrid } from './ALVGrid';
import type { ALVColumn } from './ALVGrid';

interface AdminPaymentsProps {
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const AdminPayments: React.FC<AdminPaymentsProps> = ({
  onAddToast
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'In' | 'Out' | 'Pending'>('In');
  const [paymentsIn, setPaymentsIn] = useState<PaymentIn[]>([]);
  const [paymentsOut, setPaymentsOut] = useState<PaymentOut[]>([]);
  const [customerPending, setCustomerPending] = useState<Invoice[]>([]);
  const [supplierPending, setSupplierPending] = useState<Supplier[]>([]);
  
  // Lists for dropdown selection
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);

  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Form Fields - Payment In / Out
  const [customerName, setCustomerName] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [walletId, setWalletId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [pIn, pOut, pending, custs, sups, invs, wals] = await Promise.all([
        getPaymentsIn(),
        getPaymentsOut(),
        getPendingPayments(),
        getCustomers(),
        getSuppliers(),
        getInvoices(),
        getWallets()
      ]);
      setPaymentsIn(pIn);
      setPaymentsOut(pOut);
      setCustomerPending(pending.customerPending);
      setSupplierPending(pending.supplierPending);
      setCustomers(custs);
      setSuppliers(sups);
      setInvoices(invs);
      setWallets(wals);
      if (wals.length > 0) {
        setWalletId(wals[0].id);
      }
    } catch (err) {
      onAddToast('Failed to load payments data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeSubTab]);

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      onAddToast('Amount must be greater than zero.', 'error');
      return;
    }

    try {
      if (activeSubTab === 'In') {
        if (!customerName) { onAddToast('Please select a customer.', 'error'); return; }
        await addPaymentIn({
          customerName, invoiceNumber, paymentDate, amount, paymentMethod,
          walletId: walletId || undefined, referenceNumber, notes
        });
        onAddToast('Received payment recorded successfully.', 'success');
      } else {
        if (!supplierName) { onAddToast('Please select a supplier.', 'error'); return; }
        await addPaymentOut({
          supplierName, billNumber, paymentDate, amount, paymentMethod,
          walletId: walletId || undefined, referenceNumber, notes
        });
        onAddToast('Supplier payment recorded successfully.', 'success');
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (err) {
      onAddToast('Failed to record payment.', 'error');
    }
  };

  const resetForm = () => {
    setCustomerName(''); setSupplierName(''); setInvoiceNumber(''); setBillNumber('');
    setPaymentDate(new Date().toISOString().split('T')[0]); setAmount(0);
    setPaymentMethod('UPI'); setReferenceNumber(''); setNotes('');
  };

  const handleSendReminder = (name: string, amt: number, num: string) => {
    const text = `Dear ${name}, this is a friendly reminder that a payment of ${fmt(amt)} is pending for Invoice ${num}. Please settle it at your earliest convenience. Thank you, JK Future Infra.`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
    onAddToast(`WhatsApp reminder dispatched for ${name}.`, 'info');
  };

  const inCols: ALVColumn[] = [
    { key: 'customerName', label: 'Customer Name', sortable: true },
    { key: 'invoiceNumber', label: 'Linked Invoice', sortable: true },
    { key: 'paymentDate', label: 'Payment Date', sortable: true },
    { key: 'amount', label: 'Amount Received', align: 'right', render: (v) => fmt(Number(v)) },
    { key: 'paymentMethod', label: 'Method' },
    { key: 'accountName', label: 'Bank Account' },
    { key: 'referenceNumber', label: 'Reference Code' },
    { key: 'notes', label: 'Notes' }
  ];

  const outCols: ALVColumn[] = [
    { key: 'supplierName', label: 'Supplier Name', sortable: true },
    { key: 'billNumber', label: 'Bill Number', sortable: true },
    { key: 'paymentDate', label: 'Payment Date', sortable: true },
    { key: 'amount', label: 'Amount Paid', align: 'right', render: (v) => fmt(Number(v)) },
    { key: 'paymentMethod', label: 'Method' },
    { key: 'accountName', label: 'Source Account' },
    { key: 'referenceNumber', label: 'Reference Code' },
    { key: 'notes', label: 'Notes' }
  ];

  const totalReceivablePending = useMemo(() => {
    return customerPending.reduce((sum, inv) => sum + (inv.pendingAmount || 0), 0);
  }, [customerPending]);

  const totalPayablePending = useMemo(() => {
    return supplierPending.reduce((sum, sup) => sum + (sup.outstandingAmount || 0), 0);
  }, [supplierPending]);

  return (
    <div className="admin-page-container">
      {/* Sub tabs header */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border-color)', marginBottom: '1.5rem', gap: '4px' }}>
        <button 
          onClick={() => setActiveSubTab('In')}
          className={`btn btn-sm ${activeSubTab === 'In' ? 'btn-secondary' : 'btn-outline'}`}
          style={{ borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '-2px' }}
        >
          Payments In (Receivables)
        </button>
        <button 
          onClick={() => setActiveSubTab('Out')}
          className={`btn btn-sm ${activeSubTab === 'Out' ? 'btn-secondary' : 'btn-outline'}`}
          style={{ borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '-2px' }}
        >
          Payments Out (Payables)
        </button>
        <button 
          onClick={() => setActiveSubTab('Pending')}
          className={`btn btn-sm ${activeSubTab === 'Pending' ? 'btn-secondary' : 'btn-outline'}`}
          style={{ borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '-2px' }}
        >
          Pending Payments & Aging
        </button>
      </div>

      {activeSubTab === 'In' && (
        <ALVGrid 
          title="Customer Cash Receipts (Payments In)"
          subtitle="Postings and ledger of payments received from customers"
          columns={inCols}
          data={paymentsIn as any}
          rowKey="id"
          onAdd={() => { resetForm(); setShowModal(true); }}
          addLabel="Record Receipt (Payment In)"
          onRefresh={loadData}
          pageSize={15}
          selectable={false}
          loading={loading}
        />
      )}

      {activeSubTab === 'Out' && (
        <ALVGrid 
          title="Supplier Expenditures (Payments Out)"
          subtitle="Postings and ledger of disbursements paid out to suppliers/vendors"
          columns={outCols}
          data={paymentsOut as any}
          rowKey="id"
          onAdd={() => { resetForm(); setShowModal(true); }}
          addLabel="Record Disbursement (Payment Out)"
          onRefresh={loadData}
          pageSize={15}
          selectable={false}
          loading={loading}
        />
      )}

      {activeSubTab === 'Pending' && (
        <div>
          <div className="grid grid-2 gap-3 mobile-stack">
            {/* Customer Pending Receivables */}
            <div className="admin-card p-3 shadow-sm">
              <div className="flex justify-between align-center mb-2" style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '8px' }}>
                <h3 className="text-dark">Customer Pending Receivables</h3>
                <span className="badge badge-ongoing font-bold text-md" style={{ color: '#ef4444' }}>{fmt(totalReceivablePending)}</span>
              </div>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {customerPending.map(inv => (
                  <div key={inv.id} className="flex justify-between align-center py-1.5" style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <div className="flex flex-col">
                      <span className="font-bold text-dark">{inv.customerName}</span>
                      <span className="text-xs text-muted">Invoice: {inv.invoiceNumber} | Due: {inv.date}</span>
                    </div>
                    <div className="flex align-center gap-1">
                      <span className="font-bold text-danger text-sm" style={{ color: '#ef4444' }}>{fmt(inv.pendingAmount)}</span>
                      <button 
                        onClick={() => handleSendReminder(inv.customerName, inv.pendingAmount, inv.invoiceNumber)}
                        className="btn btn-sm btn-outline text-secondary flex align-center gap-0.5"
                        style={{ padding: '3px 8px', fontSize: '0.75rem', borderColor: 'var(--secondary)', color: 'var(--secondary)' }}
                        title="Send WhatsApp Reminder"
                      >
                        <Bell size={12} /> Remind
                      </button>
                    </div>
                  </div>
                ))}
                {customerPending.length === 0 && <p className="text-center text-muted py-3">No pending receivables!</p>}
              </div>
            </div>

            {/* Supplier Pending Payables */}
            <div className="admin-card p-3 shadow-sm">
              <div className="flex justify-between align-center mb-2" style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '8px' }}>
                <h3 className="text-dark">Supplier Outstanding Payables</h3>
                <span className="badge badge-ongoing font-bold text-md" style={{ color: '#ef4444' }}>{fmt(totalPayablePending)}</span>
              </div>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {supplierPending.map(sup => (
                  <div key={sup.id} className="flex justify-between align-center py-1.5" style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <div className="flex flex-col">
                      <span className="font-bold text-dark">{sup.name}</span>
                      <span className="text-xs text-muted">Contact: {sup.contactNumber}</span>
                    </div>
                    <span className="font-bold text-danger text-sm" style={{ color: '#ef4444', marginRight: '1rem' }}>{fmt(sup.outstandingAmount)}</span>
                  </div>
                ))}
                {supplierPending.length === 0 && <p className="text-center text-muted py-3">No outstanding payables!</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '480px' }}>
            <div className="modal-header">
              <h3>{activeSubTab === 'In' ? 'Record Customer Cash Receipt' : 'Record Supplier Disbursement'}</h3>
              <button onClick={() => setShowModal(false)} className="close-btn"><X size={20} /></button>
            </div>
            <form onSubmit={handleSavePayment}>
              <div className="modal-body">
                {activeSubTab === 'In' ? (
                  <>
                    <div className="form-group">
                      <label className="form-label">Select Customer</label>
                      <select 
                        value={customerName} 
                        onChange={e => setCustomerName(e.target.value)} 
                        className="form-control"
                        required
                      >
                        <option value="">-- Choose Customer --</option>
                        {customers.map(c => <option key={c.id} value={c.name}>{c.name} (Outstanding: {fmt(c.outstandingAmount)})</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Linked Sales Invoice (Optional)</label>
                      <select 
                        value={invoiceNumber} 
                        onChange={e => setInvoiceNumber(e.target.value)} 
                        className="form-control"
                      >
                        <option value="">-- Not Linked / Advance Payment --</option>
                        {invoices.filter(i => i.customerName === customerName && i.paymentStatus !== 'Paid').map(i => (
                          <option key={i.id} value={i.invoiceNumber}>{i.invoiceNumber} (Pending: {fmt(i.pendingAmount)})</option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-group">
                      <label className="form-label">Select Supplier</label>
                      <select 
                        value={supplierName} 
                        onChange={e => setSupplierName(e.target.value)} 
                        className="form-control"
                        required
                      >
                        <option value="">-- Choose Supplier --</option>
                        {suppliers.map(s => <option key={s.id} value={s.name}>{s.name} (Outstanding: {fmt(s.outstandingAmount)})</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Bill / Purchase Number (Optional)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={billNumber} 
                        onChange={e => setBillNumber(e.target.value)} 
                        placeholder="e.g. BILL-999"
                      />
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label className="form-label">Amount (INR)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={amount} 
                    onChange={e => setAmount(parseFloat(e.target.value) || 0)} 
                    min={0.01}
                    step="any"
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Post Date</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={paymentDate} 
                    onChange={e => setPaymentDate(e.target.value)} 
                    required 
                  />
                </div>

                <div className="grid grid-2 gap-2">
                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select 
                      value={paymentMethod} 
                      onChange={e => setPaymentMethod(e.target.value)} 
                      className="form-control"
                    >
                      <option value="UPI">UPI / GPay</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cash">Cash</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Post to Account</label>
                    <select 
                      value={walletId} 
                      onChange={e => setWalletId(e.target.value)} 
                      className="form-control"
                      required
                    >
                      <option value="">Select Cash/Bank account...</option>
                      {wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({fmt(w.currentBalance)})</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Transaction Reference Number</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={referenceNumber} 
                    onChange={e => setReferenceNumber(e.target.value)} 
                    placeholder="e.g. UTR / UPI Ref ID"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes / Memo</label>
                  <textarea 
                    className="form-control" 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                    placeholder="post notes details..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-secondary">Submit Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
