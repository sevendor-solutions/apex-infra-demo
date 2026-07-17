import React, { useState } from 'react';
import type { User, MarketingAgent } from '../types';
import { Trash2, Edit2, Shield, UserCheck, Key, X } from 'lucide-react';
import { addUser, deleteUser, updateUser } from '../utils/db';
import { ALVGrid } from './ALVGrid';
import type { ALVColumn } from './ALVGrid';

interface AdminUsersProps {
  users: User[];
  currentUser: User | null;
  agents?: MarketingAgent[];
  onRefresh: () => void;
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onConfirm: (msg: string) => Promise<boolean>;
}

export const AdminUsers: React.FC<AdminUsersProps> = ({
  users,
  currentUser,
  agents = [],
  onRefresh,
  onAddToast,
  onConfirm
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'Admin' | 'Moderator' | 'ProjectOwner' | 'MarketingOwner' | 'Architecture' | 'MarketingAgent' | 'Accountant' | 'SalesUser' | 'InventoryManager'>('Moderator');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [allowedScreens, setAllowedScreens] = useState<string[]>([]);
  const [agentId, setAgentId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formErrors, setFormErrors] = useState<{ email?: string }>({});

  // Filter users based on logged-in user role
  const isSuperAdmin = currentUser?.role === 'Admin';
  const visibleUsers = isSuperAdmin 
    ? users 
    : users.filter(u => u.id === currentUser?.id);

  const getRoleDefaultScreens = (userRole: string): string[] => {
    if (userRole === 'Admin') {
      return ['dashboard', 'projects', 'marketing', 'sites', 'project_gallery', 'marketing_gallery', 'blogs', 'project_enquiries', 'marketing_enquiries', 'careers', 'users', 'masters', 'documents', 'marketing_agents'];
    } else if (userRole === 'ProjectOwner') {
      return ['dashboard', 'projects', 'project_gallery', 'blogs', 'project_enquiries', 'careers'];
    } else if (userRole === 'MarketingOwner') {
      return ['dashboard', 'marketing', 'sites', 'marketing_gallery', 'blogs', 'marketing_enquiries', 'careers'];
    } else if (userRole === 'Architecture') {
      return ['dashboard', 'documents', 'project_gallery'];
    } else if (userRole === 'MarketingAgent') {
      return ['marketing_enquiries', 'marketing_agents'];
    } else if (userRole === 'Accountant') {
      return ['dashboard', 'expenses', 'wallets', 'payments_in', 'payments_out', 'payments_pending', 'loans', 'auditor_reports'];
    } else if (userRole === 'SalesUser') {
      return ['dashboard', 'quotations', 'invoices', 'customers'];
    } else if (userRole === 'InventoryManager') {
      return ['dashboard', 'inventory', 'suppliers'];
    } else {
      // Moderator
      return ['dashboard', 'project_gallery', 'blogs', 'project_enquiries', 'marketing_enquiries', 'careers'];
    }
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setName('');
    setUsername('');
    setRole('Moderator');
    setEmail('');
    setPassword('');
    setAllowedScreens(getRoleDefaultScreens('Moderator'));
    setAgentId('');
    setIsActive(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setUsername(user.username);
    setRole(user.role as any);
    setEmail(user.email);
    setPassword('');
    setAllowedScreens(user.allowedScreens || getRoleDefaultScreens(user.role));
    setAgentId(user.agentId || '');
    setIsActive(user.isActive !== false);
    setModalOpen(true);
  };

  const handleRoleChange = (newRole: 'Admin' | 'Moderator' | 'ProjectOwner' | 'MarketingOwner' | 'Architecture' | 'MarketingAgent' | 'Accountant' | 'SalesUser' | 'InventoryManager') => {
    setRole(newRole);
    setAllowedScreens(getRoleDefaultScreens(newRole));
  };

  const handleDelete = async (id: string, name: string) => {
    if (id === currentUser?.id) {
      onAddToast('You cannot delete your own logged-in account.', 'error');
      return;
    }
    if (users.length <= 1) {
      onAddToast('Cannot delete the last remaining admin user.', 'error');
      return;
    }
    if (await onConfirm(`Are you sure you want to remove user "${name}"?`)) {
      try {
        await deleteUser(id);
        onAddToast(`User "${name}" has been removed.`, 'success');
        onRefresh();
      } catch (error) {
        onAddToast('Failed to delete user.', 'error');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !email.trim()) {
      onAddToast('Please fill out all mandatory fields', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setFormErrors({ email: 'Enter a valid email address (e.g. user@domain.com)' });
      return;
    }
    setFormErrors({});

    const cleanUsername = username.trim().toLowerCase();

    // Check duplicate username (except when editing self)
    const duplicate = users.find(
      u => u.username.toLowerCase() === cleanUsername && (!editingUser || u.id !== editingUser.id)
    );
    if (duplicate) {
      onAddToast(`Username "${cleanUsername}" already exists.`, 'error');
      return;
    }

    const userData: User = {
      id: editingUser ? editingUser.id : 'u_' + Date.now(),
      name: name.trim(),
      username: cleanUsername,
      role: editingUser ? editingUser.role : role, // preserve role on edit if not changed (handled in select)
      email: email.trim(),
      allowedScreens: isSuperAdmin ? allowedScreens : (editingUser?.allowedScreens || getRoleDefaultScreens(editingUser?.role || 'Moderator')),
      agentId: role === 'MarketingAgent' ? agentId : undefined,
      isActive: isActive
    };

    if (!editingUser) {
      userData.password = password.trim() || cleanUsername + '123';
    } else {
      if (password.trim()) {
        userData.password = password.trim();
      }
    }

    // If super admin editing someone else's role
    if (isSuperAdmin && editingUser) {
      userData.role = role;
      userData.agentId = role === 'MarketingAgent' ? agentId : undefined;
    }

    try {
      if (editingUser) {
        await updateUser(userData);
        onAddToast(`Account settings for "${name}" updated successfully.`, 'success');
      } else {
        await addUser(userData);
        onAddToast(`Staff account for "${name}" registered successfully.`, 'success');
      }
      setModalOpen(false);
      onRefresh();
    } catch (error) {
      onAddToast('Failed to save user.', 'error');
    }
  };

  const labelMap: Record<string, string> = {
    dashboard: 'Dashboard',
    projects: 'Projects',
    marketing: 'Marketing',
    sites: 'Plots',
    project_gallery: 'Proj Gallery',
    marketing_gallery: 'Mktg Gallery',
    gallery: 'Assets',
    blogs: 'Blogs',
    project_enquiries: 'Proj Leads',
    marketing_enquiries: 'Mktg Leads',
    careers: 'Careers',
    users: 'Staff',
    masters: 'Masters',
    marketing_agents: 'Mktg Agents'
  };

  const columns: ALVColumn[] = [
    { key: 'name', label: 'Name' },
    { key: 'username', label: 'Username' },
    { key: 'email', label: 'Email' },
    {
      key: 'isActive',
      label: 'Status',
      render: (_v, row) => {
        const u = row as unknown as User;
        const active = u.isActive !== false;
        return (
          <span 
            className={`badge badge-${active ? 'completed' : 'failed'}`}
            style={{ 
              backgroundColor: active ? undefined : '#ef4444', 
              color: active ? undefined : '#ffffff' 
            }}
          >
            {active ? 'Active' : 'Inactive'}
          </span>
        );
      }
    },
    {
      key: 'role',
      label: 'System Role',
      render: (_v, row) => {
        const r = row as unknown as User;
        return (
          <span
            className={`badge badge-${r.role === 'Admin' ? 'completed' : r.role === 'Moderator' ? 'ongoing' : 'upcoming'}`}
            style={{ display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}
          >
            {r.role === 'Admin' ? <Shield size={12} /> : <UserCheck size={12} />} {r.role}
          </span>
        );
      }
    },
    {
      key: 'allowedScreens',
      label: 'Screen Access',
      sortable: false,
      render: (_v, row) => {
        const r = row as unknown as User;
        const screens = r.allowedScreens || getRoleDefaultScreens(r.role);
        return (
          <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '4px', maxWidth: '280px', overflowX: 'auto', paddingBottom: '4px', whiteSpace: 'nowrap' }}>
            {screens.map(s => (
              <span
                key={s}
                className="badge"
                style={{
                  fontSize: '0.65rem',
                  padding: '2px 6px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  display: 'inline-block',
                  flexShrink: 0
                }}
              >
                {labelMap[s] || s}
              </span>
            ))}
          </div>
        );
      }
    },
    {
      key: '__actions',
      label: 'Actions',
      sortable: false,
      width: '90px',
      align: 'center',
      render: (_v, row) => {
        const u = row as unknown as User;
        return (
          <div className="admin-table-actions" style={{ justifyContent: 'center' }}>
            <button
              onClick={() => handleOpenEdit(u)}
              className="alv-toolbar-btn"
              title="Edit Login Details"
            >
              <Edit2 size={13} />
            </button>
            {isSuperAdmin && u.id !== currentUser?.id && (
              <button
                onClick={() => handleDelete(u.id, u.name)}
                className="alv-toolbar-btn"
                title="Delete Staff"
                style={{ color: '#dc2626', borderColor: '#dc2626' }}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="admin-users-view">
      <ALVGrid
        title={isSuperAdmin ? 'Manage Staff Logins' : 'My Account Settings'}
        subtitle={`${visibleUsers.length} user${visibleUsers.length !== 1 ? 's' : ''}`}
        columns={columns}
        data={visibleUsers as unknown as Record<string, unknown>[]}
        rowKey="id"
        onAdd={isSuperAdmin ? handleOpenAdd : undefined}
        addLabel="Register Staff"
        onRefresh={onRefresh}
        searchPlaceholder="Search users..."
        emptyText="No users found."
      />



      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit} className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h3>{editingUser ? `Edit Account: ${editingUser.name}` : 'Register New Staff Login'}</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="close-btn"><X size={20} /></button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-2 gap-2">
                <div className="form-group">
                  <label className="form-label">Username * (lowercase)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">System Role *</label>
                  <select 
                    className="form-control" 
                    value={role}
                    onChange={e => handleRoleChange(e.target.value as any)}
                    disabled={!isSuperAdmin || (editingUser?.id === currentUser?.id)}
                  >
                    <option value="Admin">Admin (Full System Permissions)</option>
                    <option value="ProjectOwner">Project Owner (Manage Projects)</option>
                    <option value="MarketingOwner">Marketing Owner (Manage Showcase)</option>
                    <option value="Architecture">Architecture (Manage Documents & Plans)</option>
                    <option value="Moderator">Moderator (General Editor)</option>
                    <option value="MarketingAgent">Marketing Agent (Assigned Properties & Leads)</option>
                    <option value="Accountant">Accountant (Expenses, Wallets, Audit Reports)</option>
                    <option value="SalesUser">Sales User (Quotes, Invoices, Customers)</option>
                    <option value="InventoryManager">Inventory Manager (Stock Levels, Suppliers)</option>
                  </select>
                </div>
              </div>

              {role === 'MarketingAgent' && (
                <div className="form-group">
                  <label className="form-label">Associated Marketing Agent *</label>
                  <select
                    className="form-control"
                    value={agentId}
                    onChange={e => {
                      const selectedId = e.target.value;
                      setAgentId(selectedId);
                      if (selectedId) {
                        const agent = agents.find(a => a.id === selectedId);
                        if (agent) {
                          setName(agent.name);
                          if (agent.email) {
                            setEmail(agent.email);
                          }
                        }
                      }
                    }}
                    required
                  >
                    <option value="">-- Select Marketing Agent --</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-2 gap-2">
                <div className="form-group">
                  <label className="form-label">Official Email *</label>
                  <input 
                    type="email" 
                    className={`form-control${formErrors.email ? ' input-error' : ''}`}
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      if (formErrors.email) setFormErrors({});
                    }}
                    required
                  />
                  {formErrors.email && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px', display: 'block' }}>{formErrors.email}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label flex align-center gap-0.5">
                    <Key size={12} /> Password {editingUser ? '' : '*'}
                  </label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder={editingUser ? "Leave blank to keep existing" : "Set custom password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required={!editingUser}
                  />
                </div>
              </div>

              {isSuperAdmin && (
                <div className="form-group pt-2 border-top mt-3">
                  <label className="form-label font-bold" style={{ color: 'var(--primary)', marginBottom: '0.5rem', display: 'block' }}>
                    Screen Access Permissions
                  </label>
                  <div 
                    style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(2, 1fr)', 
                      gap: '0.75rem', 
                      maxHeight: '180px', 
                      overflowY: 'auto', 
                      padding: '0.5rem', 
                      backgroundColor: '#f8fafc', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '6px' 
                    }}
                  >
                    {[
                      { id: 'dashboard', label: 'Dashboard' },
                      { id: 'projects', label: 'Manage Projects' },
                      { id: 'marketing', label: 'Manage Marketing' },
                      { id: 'sites', label: 'Plot Layouts' },
                      { id: 'project_gallery', label: 'Project Gallery' },
                      { id: 'marketing_gallery', label: 'Marketing Gallery' },
                      { id: 'blogs', label: 'Blogs & News' },
                      { id: 'project_enquiries', label: 'Project Leads' },
                      { id: 'marketing_enquiries', label: 'Marketing Leads' },
                      { id: 'careers', label: 'Job Applications' },
                      { id: 'users', label: 'Staff Logins' },
                      { id: 'masters', label: 'Masters Config' },
                      { id: 'marketing_agents', label: 'Marketing Agents' },
                      
                      // Accounting & Finance screens
                      { id: 'expenses', label: 'Expenses Ledger' },
                      { id: 'wallets', label: 'Digital Wallets' },
                      { id: 'quotations', label: 'Quotations Ledger' },
                      { id: 'inventory', label: 'Warehouse Stock' },
                      { id: 'loans', label: 'Commercial Loans' },
                      { id: 'invoices', label: 'Sales Invoices' },
                      { id: 'payments_in', label: 'Customer Receipts (In)' },
                      { id: 'payments_out', label: 'Supplier Payments (Out)' },
                      { id: 'payments_pending', label: 'Pending Dues & Aging' },
                      { id: 'customers', label: 'Customers Accounts' },
                      { id: 'suppliers', label: 'Suppliers Accounts' },
                      { id: 'auditor_reports', label: 'Auditor Reports' }
                    ].map(screen => (
                      <label 
                        key={screen.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem', 
                          cursor: 'pointer', 
                          fontSize: '0.85rem',
                          fontWeight: '500',
                          color: '#334155'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={allowedScreens.includes(screen.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setAllowedScreens([...allowedScreens, screen.id]);
                            } else {
                              setAllowedScreens(allowedScreens.filter(s => s !== screen.id));
                            }
                          }}
                          style={{
                            cursor: 'pointer',
                            accentColor: 'var(--secondary)'
                          }}
                        />
                        {screen.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {isSuperAdmin && (
                <div className="form-group pt-2 border-top mt-3">
                  <label className="form-label font-bold" style={{ display: 'block', marginBottom: '0.5rem' }}>
                     Account Status
                  </label>
                  <label className="flex align-center gap-0.5" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={e => setIsActive(e.target.checked)}
                      disabled={editingUser?.id === currentUser?.id}
                      style={{ accentColor: 'var(--secondary)', cursor: 'pointer', marginRight: '6px' }}
                    />
                    <span>Account is Active</span>
                  </label>
                  {editingUser?.id === currentUser?.id && (
                    <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', marginTop: '4px' }}>
                      You cannot deactivate your own logged-in account.
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" onClick={() => setModalOpen(false)} className="btn btn-outline btn-sm">Cancel</button>
              <button type="submit" className="btn btn-secondary btn-sm">
                {editingUser ? 'Save Changes' : 'Create Login'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
