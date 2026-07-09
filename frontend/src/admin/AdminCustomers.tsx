import React, { useState, useEffect, useMemo } from 'react';
import type { Customer } from '../types';
import { X, Users2, DollarSign, ShieldAlert } from 'lucide-react';
import { getCustomers, addCustomer, updateCustomer, deleteCustomer } from '../utils/db';
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
    if (!name.trim() || !mobile.trim()) {
      onAddToast('Customer name and mobile number are required.', 'error');
      return;
    }
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
    const ok = await onConfirm(`Delete customer account for "${name}"?`);
    if (!ok) return;
    try {
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
    { key: 'gstNumber', label: 'GST Number' },
    { key: 'creditLimit', label: 'Credit Limit', align: 'right', render: (v) => fmt(Number(v)) },
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
      <div className="grid grid-3 gap-2 mb-3">
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

        <div className="stat-card shadow-sm" style={{ borderLeft: '4px solid var(--success)' }}>
          <div className="stat-icon-wrapper success-soft">
            <ShieldAlert size={24} className="text-success" />
          </div>
          <div>
            <span className="stat-title">Aggregated Credit Limits</span>
            <h3>{fmt(stats.limitTotal)}</h3>
          </div>
        </div>
      </div>

      <ALVGrid 
        title="Customer Directory"
        subtitle="Manage customer credits, accounts receivables, and contact lists"
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
                    className="form-control" 
                    value={mobile} 
                    onChange={e => setMobile(e.target.value)} 
                    placeholder="e.g. 9876543210"
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    placeholder="e.g. john@domain.com"
                  />
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
                <div className="grid grid-2 gap-2">
                  <div className="form-group">
                    <label className="form-label">GSTIN / Tax Number</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={gstNumber} 
                      onChange={e => setGstNumber(e.target.value.toUpperCase())} 
                      placeholder="e.g. 37AAAAA1111A1Z1"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Credit Limit (INR)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={creditLimit} 
                      onChange={e => setCreditLimit(parseFloat(e.target.value) || 0)} 
                      min={0}
                      required 
                    />
                  </div>
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
