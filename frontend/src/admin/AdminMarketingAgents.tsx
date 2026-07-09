import React, { useState } from 'react';
import type { User, MarketingAgent } from '../types';
import { Trash2, Edit2, Plus, User as UserIcon, Phone, Mail, Award, CheckCircle, XCircle, X, Upload } from 'lucide-react';
import { addMarketingAgent, updateMarketingAgent, deleteMarketingAgent, uploadImage } from '../utils/db';
import { ALVGrid } from './ALVGrid';
import type { ALVColumn } from './ALVGrid';

interface AdminMarketingAgentsProps {
  agents: MarketingAgent[];
  currentUser?: User | null;
  onRefresh: () => void;
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onConfirm: (msg: string) => Promise<boolean>;
}

export const AdminMarketingAgents: React.FC<AdminMarketingAgentsProps> = ({
  agents,
  currentUser,
  onRefresh,
  onAddToast,
  onConfirm
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<MarketingAgent | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [status, setStatus] = useState('Active');
  
  // Image uploading state
  const [uploading, setUploading] = useState(false);

  const handleOpenAdd = () => {
    setEditingAgent(null);
    setName('');
    setPhone('');
    setEmail('');
    setDesignation('');
    setPhotoUrl('');
    setStatus('Active');
    setModalOpen(true);
  };

  const handleOpenEdit = (agent: MarketingAgent) => {
    setEditingAgent(agent);
    setName(agent.name);
    setPhone(agent.phone || '');
    setEmail(agent.email || '');
    setDesignation(agent.designation || '');
    setPhotoUrl(agent.photoUrl || '');
    setStatus(agent.status || 'Active');
    setModalOpen(true);
  };

  const handleDeleteClick = async (id: string, name: string) => {
    if (await onConfirm(`Are you sure you want to delete marketing agent "${name}"?`)) {
      try {
        await deleteMarketingAgent(id);
        onAddToast(`Marketing agent "${name}" has been deleted.`, 'success');
        onRefresh();
      } catch (error) {
        onAddToast('Failed to delete marketing agent.', 'error');
      }
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    try {
      const file = e.target.files[0];
      const url = await uploadImage(file, 'AGENTS');
      setPhotoUrl(url);
      onAddToast('Profile image uploaded successfully.', 'success');
    } catch (err) {
      onAddToast('Failed to upload image.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onAddToast('Please enter the agent name', 'error');
      return;
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        onAddToast('Please enter a valid email address', 'error');
        return;
      }
    }

    if (phone.trim()) {
      const phoneRegex = /^\+?[0-9\s-]{10,14}$/;
      if (!phoneRegex.test(phone.replace(/\s+/g, ''))) {
        onAddToast('Please enter a valid phone number', 'error');
        return;
      }
    }

    const agentData: Omit<MarketingAgent, 'id'> & { id?: string } = {
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      designation: designation.trim() || undefined,
      photoUrl: photoUrl.trim() || undefined,
      status
    };

    try {
      if (editingAgent) {
        agentData.id = editingAgent.id;
        await updateMarketingAgent(agentData as MarketingAgent);
        onAddToast(`Marketing agent "${name}" updated successfully.`, 'success');
      } else {
        await addMarketingAgent(agentData);
        onAddToast(`New marketing agent "${name}" added successfully.`, 'success');
      }
      setModalOpen(false);
      onRefresh();
    } catch (error: any) {
      onAddToast(`Failed to save marketing agent: ${error?.message || error}`, 'error');
    }
  };

  const agentColumns: ALVColumn[] = [
    {
      key: 'photoUrl',
      label: 'Photo',
      width: '80px',
      render: (val, row) => {
        const r = row as unknown as MarketingAgent;
        return (
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {val ? (
              <img src={String(val)} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <UserIcon size={20} className="text-muted" />
            )}
          </div>
        );
      }
    },
    { key: 'name', label: 'Full Name', sortable: true },
    { key: 'designation', label: 'Designation', sortable: true, render: (val) => String(val || '-') },
    { key: 'phone', label: 'Phone Number', render: (val) => String(val || '-') },
    { key: 'email', label: 'Email Address', render: (val) => String(val || '-') },
    {
      key: 'status',
      label: 'Status',
      width: '120px',
      render: (val) => {
        const statusStr = String(val || 'Active');
        return (
          <span 
            className={`badge badge-${statusStr === 'Active' ? 'completed' : 'new'}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              backgroundColor: statusStr === 'Active' ? '#d1fae5' : '#fee2e2',
              color: statusStr === 'Active' ? '#065f46' : '#991b1b',
              borderRadius: '9999px',
              padding: '0.25rem 0.6rem',
              fontSize: '0.75rem',
              fontWeight: 600
            }}
          >
            {statusStr === 'Active' ? <CheckCircle size={12} /> : <XCircle size={12} />} {statusStr}
          </span>
        );
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '100px',
      render: (_, row) => {
        const r = row as unknown as MarketingAgent;
        const showDelete = currentUser?.role !== 'MarketingAgent';
        return (
          <div className="flex gap-0.5 justify-center">
            <button 
              onClick={() => handleOpenEdit(r)} 
              className="btn-icon" 
              title="Edit Agent"
              style={{ padding: '4px', border: 'none', background: 'none', cursor: 'pointer' }}
            >
              <Edit2 size={16} className="text-secondary" />
            </button>
            {showDelete && (
              <button 
                onClick={() => handleDeleteClick(r.id, r.name)} 
                className="btn-icon" 
                title="Delete Agent"
                style={{ padding: '4px', border: 'none', background: 'none', cursor: 'pointer' }}
              >
                <Trash2 size={16} className="text-red" style={{ color: 'var(--red)' }} />
              </button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="admin-content-card">
      <div className="flex justify-between align-center mb-3">
        <div>
          <h2 className="section-title my-0">Marketing Agents Profiles</h2>
          <p className="section-subtitle my-0.25">Manage active marketing representatives and agent assignments.</p>
        </div>
        {currentUser?.role !== 'MarketingAgent' && (
          <button onClick={handleOpenAdd} className="btn btn-secondary flex align-center gap-0.5">
            <Plus size={16} /> Add New Agent
          </button>
        )}
      </div>

      <ALVGrid 
        title="Marketing Agents"
        subtitle="Manage active marketing representatives and agent assignments."
        data={agents as unknown as Record<string, unknown>[]}
        columns={agentColumns}
        searchPlaceholder="Search marketing representatives by name/designation/email..."
        pageSize={10}
      />

      {/* Modal Dialog */}
      {modalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content-premium" style={{ maxWidth: '500px', width: '90%', maxHeight: '90vh', background: '#fff', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'scaleUp 0.2s ease-out' }}>
            
            {/* Modal Header */}
            <div className="modal-header-premium flex justify-between align-center" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: 'var(--sap-fiori-blue)', color: '#fff', flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserIcon size={18} /> {editingAgent ? 'Edit Agent Profile' : 'Add New Marketing Agent'}
              </h3>
              <button 
                onClick={() => setModalOpen(false)} 
                className="close-btn" 
                style={{ background: 'rgba(255, 255, 255, 0.15)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1, margin: 0 }}>
              
              {/* Scrollable Form Content */}
              <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label className="form-label font-bold" style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Full Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <UserIcon size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                      type="text" 
                      className="form-control" 
                      style={{ paddingLeft: '2.5rem', width: '100%', padding: '0.6rem 0.85rem 0.6rem 2.5rem', border: '1.5px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', boxSizing: 'border-box', outline: 'none', fontSize: '0.88rem' }} 
                      placeholder="Enter agent full name" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label className="form-label font-bold" style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Designation</label>
                  <div style={{ position: 'relative' }}>
                    <Award size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                      type="text" 
                      className="form-control" 
                      style={{ paddingLeft: '2.5rem', width: '100%', padding: '0.6rem 0.85rem 0.6rem 2.5rem', border: '1.5px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', boxSizing: 'border-box', outline: 'none', fontSize: '0.88rem' }} 
                      placeholder="e.g. Senior Property Advisor" 
                      value={designation} 
                      onChange={e => setDesignation(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="grid grid-2 gap-1.5" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label className="form-label font-bold" style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone Number</label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      <input 
                        type="text" 
                        className="form-control" 
                        style={{ paddingLeft: '2.5rem', width: '100%', padding: '0.6rem 0.85rem 0.6rem 2.5rem', border: '1.5px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', boxSizing: 'border-box', outline: 'none', fontSize: '0.88rem' }} 
                        placeholder="e.g. +91 9876543210" 
                        value={phone} 
                        onChange={e => setPhone(e.target.value)} 
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label className="form-label font-bold" style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      <input 
                        type="email" 
                        className="form-control" 
                        style={{ paddingLeft: '2.5rem', width: '100%', padding: '0.6rem 0.85rem 0.6rem 2.5rem', border: '1.5px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', boxSizing: 'border-box', outline: 'none', fontSize: '0.88rem' }} 
                        placeholder="e.g. agent@company.com" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label className="form-label font-bold" style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Profile Picture</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#e2e8f0', border: '2px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {photoUrl ? (
                        <img src={photoUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <UserIcon size={24} style={{ color: '#94a3b8' }} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageChange} 
                        style={{ display: 'none' }} 
                        id="agent-photo-upload" 
                      />
                      <label 
                        htmlFor="agent-photo-upload" 
                        className="btn btn-outline btn-xs" 
                        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.35rem 0.75rem', border: '1.5px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, color: '#374151', background: '#fff' }}
                      >
                        <Upload size={13} />
                        {uploading ? 'Uploading...' : 'Choose Photo'}
                      </label>
                      <p style={{ fontSize: '0.62rem', color: '#94a3b8', margin: '4px 0 0 0' }}>JPG or PNG. Max size 2MB.</p>
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label className="form-label font-bold" style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</label>
                  <div style={{ position: 'relative' }}>
                    <select 
                      className="form-control" 
                      value={status} 
                      onChange={e => setStatus(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1.5px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', outline: 'none', fontSize: '0.88rem', cursor: 'pointer' }}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Fixed Footer Buttons */}
              <div className="modal-footer-premium" style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexShrink: 0 }}>
                <button 
                  type="button" 
                  onClick={() => setModalOpen(false)} 
                  className="btn btn-outline btn-sm"
                  style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 600, border: '1.5px solid #cbd5e1', borderRadius: '6px', background: '#fff', color: '#374151', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-secondary btn-sm" 
                  disabled={uploading}
                  style={{ padding: '0.5rem 1.5rem', fontSize: '0.85rem', fontWeight: 700, border: 'none', borderRadius: '6px', background: 'var(--secondary)', color: 'var(--primary)', cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 6px -1px rgba(242, 183, 5, 0.25)' }}
                >
                  <CheckCircle size={15} />
                  {editingAgent ? 'Update Profile' : 'Add Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
