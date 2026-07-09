import React, { useState, useEffect, useMemo } from 'react';
import type { Supplier } from '../types';
import { X, Users2, DollarSign } from 'lucide-react';
import { getSuppliers, addSupplier, updateSupplier, deleteSupplier } from '../utils/db';
import { ALVGrid } from './ALVGrid';
import type { ALVColumn } from './ALVGrid';

interface AdminSuppliersProps {
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onConfirm: (msg: string) => Promise<boolean>;
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const AdminSuppliers: React.FC<AdminSuppliersProps> = ({
  onAddToast,
  onConfirm
}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');
  const [gst, setGst] = useState('');
  const [openingBalance, setOpeningBalance] = useState(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await getSuppliers();
      setSuppliers(list);
    } catch (err) {
      onAddToast('Failed to load suppliers data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contact.trim()) {
      onAddToast('Supplier name and contact number are required.', 'error');
      return;
    }
    try {
      const payload = {
        name, contactNumber: contact, address, gstNumber: gst, openingBalance
      };

      if (editingSupplier) {
        await updateSupplier({ ...payload, id: editingSupplier.id });
        onAddToast('Supplier details updated.', 'success');
      } else {
        await addSupplier(payload);
        onAddToast('Supplier account created.', 'success');
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (err) {
      onAddToast('Failed to save supplier.', 'error');
    }
  };

  const openEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setName(s.name);
    setContact(s.contactNumber);
    setAddress(s.address || '');
    setGst(s.gstNumber || '');
    setOpeningBalance(s.openingBalance);
    setShowModal(true);
  };

  const handleDelete = async (id: string, name: string) => {
    const ok = await onConfirm(`Delete supplier account for "${name}"?`);
    if (!ok) return;
    try {
      await deleteSupplier(id);
      onAddToast('Supplier deleted.', 'success');
      loadData();
    } catch (err) {
      onAddToast('Failed to delete supplier.', 'error');
    }
  };

  const resetForm = () => {
    setName(''); setContact(''); setAddress(''); setGst(''); setOpeningBalance(0);
    setEditingSupplier(null);
  };

  // KPIs
  const stats = useMemo(() => {
    const totalPayables = suppliers.reduce((sum, s) => sum + (s.outstandingAmount || 0), 0);
    return {
      totalPayables,
      supCount: suppliers.length
    };
  }, [suppliers]);

  const cols: ALVColumn[] = [
    { key: 'name', label: 'Supplier Name', sortable: true },
    { key: 'contactNumber', label: 'Contact Number', sortable: true },
    { key: 'address', label: 'Address' },
    { key: 'gstNumber', label: 'GST Number' },
    { 
      key: 'outstandingAmount', 
      label: 'Outstanding Payables', 
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
            <span className="stat-title">Active Supplier Accounts</span>
            <h3>{stats.supCount}</h3>
          </div>
        </div>

        <div className="stat-card shadow-sm" style={{ borderLeft: '4px solid var(--danger)' }}>
          <div className="stat-icon-wrapper danger-soft">
            <DollarSign size={24} className="text-danger" />
          </div>
          <div>
            <span className="stat-title">Outstanding Payables</span>
            <h3 className="text-danger">{fmt(stats.totalPayables)}</h3>
          </div>
        </div>
      </div>

      <ALVGrid 
        title="Supplier Directory"
        subtitle="Manage vendor bills, accounts payables, and purchases contact lists"
        columns={cols}
        data={suppliers as any}
        rowKey="id"
        onAdd={() => { resetForm(); setShowModal(true); }}
        addLabel="Create Supplier"
        onRefresh={loadData}
        pageSize={15}
        selectable={false}
        loading={loading}
      />

      {/* Editor Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '480px' }}>
            <div className="modal-header">
              <h3>{editingSupplier ? 'Edit Supplier Details' : 'Create Supplier Account'}</h3>
              <button onClick={() => setShowModal(false)} className="close-btn"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Supplier/Company Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="e.g. Tata Steel Ltd"
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact / Phone Number</label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    value={contact} 
                    onChange={e => setContact(e.target.value)} 
                    placeholder="e.g. 7890123456"
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Office Address</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={address} 
                    onChange={e => setAddress(e.target.value)} 
                    placeholder="e.g. Plot No 12, Industrial Yard"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">GSTIN / Tax Registration</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={gst} 
                    onChange={e => setGst(e.target.value.toUpperCase())} 
                    placeholder="e.g. 37AAAAA1111A1Z1"
                  />
                </div>
                {!editingSupplier && (
                  <div className="form-group">
                    <label className="form-label">Opening Credit Balance (INR)</label>
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
                <button type="submit" className="btn btn-secondary">Save Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
