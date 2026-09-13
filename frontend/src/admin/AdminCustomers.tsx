import React, { useState, useEffect, useMemo } from 'react';
import type { Customer } from '../types';
import { X, Users2, DollarSign } from 'lucide-react';
import { getCustomers, addCustomer, updateCustomer, deleteCustomer, getExpenses, getInvoices, getQuotations } from '../utils/db';
import { ALVGrid } from './ALVGrid';
import type { ALVColumn } from './ALVGrid';

interface AdminCustomersProps {
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onConfirm: (msg: string) => Promise<boolean>;
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const AdminCustomers: React.FC<AdminCustomersProps> = ({
  onAddToast,
  onConfirm
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [creditLimit, setCreditLimit] = useState(100000);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [formErrors, setFormErrors] = useState<{ mobile?: string; email?: string }>({});

  const phoneRegex = /^[6-9]\d{9}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await getCustomers();
      setCustomers(list);
    } catch (err) {
      onAddToast('Failed to load customers data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { mobile?: string; email?: string } = {};
    if (!name.trim() || !mobile.trim()) {
      onAddToast('Customer name and mobile number are required.', 'error');
      return;
    }
    if (!phoneRegex.test(mobile.trim())) {
      errors.mobile = 'Enter a valid 10-digit Indian mobile number (starts with 6–9)';
    }
    if (email.trim() && !emailRegex.test(email.trim())) {
      errors.email = 'Enter a valid email address (e.g. user@domain.com)';
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    try {
      const payload = {
        name, mobile, email, address, gstNumber, creditLimit, openingBalance
      };

      if (editingCustomer) {
        await updateCustomer({ ...payload, id: editingCustomer.id });
        onAddToast('Customer details updated successfully.', 'success');
      } else {
        await addCustomer(payload);
        onAddToast('Customer created successfully.', 'success');
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (err) {
      onAddToast('Failed to save customer.', 'error');
    }
  };

  const openEdit = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setMobile(c.mobile);
    setEmail(c.email || '');
    setAddress(c.address || '');
    setGstNumber(c.gstNumber || '');
    setCreditLimit(c.creditLimit);
    setOpeningBalance(c.openingBalance);
    setShowModal(true);
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      const [allExpenses, allInvoices, allQuotations] = await Promise.all([
        getExpenses().catch(() => []),
        getInvoices().catch(() => []),
        getQuotations().catch(() => [])
      ]);

      const targetCustomer = customers.find(c => c.id === id);
      const cleanName = (name || '').trim().toLowerCase();
      const cleanMobile = (targetCustomer?.mobile || '').trim();

      const usedInExpenses = allExpenses.filter(e => e.party && e.party.trim().toLowerCase() === cleanName);
      const usedInInvoices = allInvoices.filter(inv => 
        (inv.customerName && inv.customerName.trim().toLowerCase() === cleanName) ||
        (cleanMobile && inv.customerMobile && inv.customerMobile.trim() === cleanMobile)
      );
      const usedInQuotations = allQuotations.filter(q => 
        (q.customerName && q.customerName.trim().toLowerCase() === cleanName) ||
        (cleanMobile && q.customerMobile && q.customerMobile.trim() === cleanMobile)
      );

      const usageReasons: string[] = [];
      if (usedInExpenses.length > 0) usageReasons.push(`${usedInExpenses.length} Expense${usedInExpenses.length > 1 ? 's' : ''}`);
      if (usedInInvoices.length > 0) usageReasons.push(`${usedInInvoices.length} Sales Invoice${usedInInvoices.length > 1 ? 's' : ''}`);
      if (usedInQuotations.length > 0) usageReasons.push(`${usedInQuotations.length} Quotation${usedInQuotations.length > 1 ? 's' : ''}`);

      if (usageReasons.length > 0) {
        onAddToast(`Cannot delete customer "${name}" because it is currently linked to: ${usageReasons.join(', ')}. Please delete or reassign those records first.`, 'error');
        return;
      }

      const ok = await onConfirm(`Delete customer account for "${name}"?`);
      if (!ok) return;

      await deleteCustomer(id);
      onAddToast('Customer deleted.', 'success');
      loadData();
    } catch (err) {
      onAddToast('Failed to delete customer.', 'error');
    }
  };

  const resetForm = () => {
    setName(''); setMobile(''); setEmail(''); setAddress(''); setGstNumber('');
    setCreditLimit(100000); setOpeningBalance(0);
    setEditingCustomer(null);
    setFormErrors({});
  };

  // KPIs
  const stats = useMemo(() => {
    const totalReceivables = customers.reduce((sum, c) => sum + (c.outstandingAmount || 0), 0);
    const limitTotal = customers.reduce((sum, c) => sum + (c.creditLimit || 0), 0);
    return {
      totalReceivables,
      limitTotal,
      custCount: customers.length
    };
  }, [customers]);

  const cols: ALVColumn[] = [
    { key: 'name', label: 'Customer Name', sortable: true },
    { key: 'mobile', label: 'Mobile Number', sortable: true },
    { key: 'email', label: 'Email Address' },
    { key: 'address', label: 'Office/Billing Address' },
    { 
      key: 'outstandingAmount', 
      label: 'Outstanding Balance', 
      align: 'right', 
      render: (v) => <strong style={{ color: Number(v) > 0 ? '#ef4444' : 'var(--success)' }}>{fmt(Number(v))}</strong> 
    },
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
            onClick={() => handleDelete(String(row.id), String(row.name))} 
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
      <div className="grid grid-2 gap-2 mb-3">
        <div className="stat-card shadow-sm" style={{ borderLeft: '4px solid var(--secondary)' }}>
          <div className="stat-icon-wrapper secondary-soft">
            <Users2 size={24} className="text-secondary" />
          </div>
          <div>
            <span className="stat-title">Active Customer Accounts</span>
            <h3>{stats.custCount}</h3>
          </div>
        </div>

        <div className="stat-card shadow-sm" style={{ borderLeft: '4px solid var(--danger)' }}>
          <div className="stat-icon-wrapper danger-soft">
            <DollarSign size={24} className="text-danger" />
          </div>
          <div>
            <span className="stat-title">Outstanding Receivables</span>
            <h3 className="text-danger">{fmt(stats.totalReceivables)}</h3>
          </div>
        </div>
      </div>

      <ALVGrid 
        title="Customer Directory"
        subtitle="Manage customer accounts receivables and contact lists"
        columns={cols}
        data={customers as any}
        rowKey="id"
        onAdd={() => { resetForm(); setShowModal(true); }}
        addLabel="Create Customer"
        onRefresh={loadData}
        pageSize={15}
        selectable={false}
        loading={loading}
      />

      {/* Editor Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '500px' }}>
            <div className="modal-header">
              <h3>{editingCustomer ? 'Edit Customer Details' : 'Create Customer Account'}</h3>
              <button onClick={() => setShowModal(false)} className="close-btn"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="e.g. John Doe"
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <input 
                    type="tel" 
                    className={`form-control${formErrors.mobile ? ' input-error' : ''}`}
                    value={mobile} 
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setMobile(val);
                      if (formErrors.mobile) setFormErrors(prev => ({ ...prev, mobile: undefined }));
                    }}
                    placeholder="e.g. 9876543210"
                    maxLength={10}
                    inputMode="numeric"
                    required 
                  />
                  {formErrors.mobile && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px', display: 'block' }}>{formErrors.mobile}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input 
                    type="email" 
                    className={`form-control${formErrors.email ? ' input-error' : ''}`}
                    value={email} 
                    onChange={e => {
                      setEmail(e.target.value);
                      if (formErrors.email) setFormErrors(prev => ({ ...prev, email: undefined }));
                    }}
                    placeholder="e.g. john@domain.com"
                  />
                  {formErrors.email && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px', display: 'block' }}>{formErrors.email}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Office/Billing Address</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={address} 
                    onChange={e => setAddress(e.target.value)} 
                    placeholder="Physical address details"
                  />
                </div>
                {!editingCustomer && (
                  <div className="form-group">
                    <label className="form-label">Opening Debit Balance (INR)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={openingBalance} 
                      onChange={e => setOpeningBalance(parseFloat(e.target.value) || 0)} 
                      min={0}
                    />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-secondary">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
