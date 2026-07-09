import React, { useState, useMemo } from 'react';
import type { Enquiry, EnquiryStatus } from '../types';
import { Edit, Trash2, Phone, Mail, Search } from 'lucide-react';
import { updateEnquiryStatus, deleteEnquiry } from '../utils/db';
import { ALVGrid } from './ALVGrid';
import type { ALVColumn } from './ALVGrid';

interface AdminEnquiriesProps {
  enquiries: Enquiry[];
  type?: 'projects' | 'marketing';
  selectedEnquiry: Enquiry | null;
  onClearSelected: () => void;
  onRefresh: () => void;
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onConfirm: (msg: string) => Promise<boolean>;
}

export const AdminEnquiries: React.FC<AdminEnquiriesProps> = ({
  enquiries,
  type,
  selectedEnquiry,
  onClearSelected,
  onRefresh,
  onAddToast,
  onConfirm
}) => {
  const [filter, setFilter] = useState<string>('All');
  const [search, setSearch] = useState<string>('');
  const [propertyFilter, setPropertyFilter] = useState<string>('All');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('All');
  
  // Review modal states
  const [reviewingEnq, setReviewingEnq] = useState<Enquiry | null>(selectedEnquiry);
  const [status, setStatus] = useState<EnquiryStatus>('New');
  const [notes, setNotes] = useState('');

  // Handle prop changes for direct dashboard click reviews
  React.useEffect(() => {
    if (selectedEnquiry) {
      handleOpenReview(selectedEnquiry);
      onClearSelected();
    }
  }, [selectedEnquiry]);

  const handleOpenReview = (enq: Enquiry) => {
    setReviewingEnq(enq);
    setStatus(enq.status);
    setNotes(enq.notes || '');
  };

  const handleDelete = async (id: string, name: string) => {
    if (await onConfirm(`Are you sure you want to delete lead from "${name}"?`)) {
      try {
        await deleteEnquiry(id);
        onAddToast(`Lead from "${name}" deleted.`, 'success');
        if (reviewingEnq?.id === id) setReviewingEnq(null);
        onRefresh();
      } catch (error) {
        onAddToast('Failed to delete enquiry.', 'error');
      }
    }
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingEnq) return;

    try {
      await updateEnquiryStatus(reviewingEnq.id, status, notes);
      onAddToast(`Lead status updated to: ${status}`, 'success');
      setReviewingEnq(null);
      onRefresh();
    } catch (error) {
      onAddToast('Failed to update status.', 'error');
    }
  };

  // Filter leads based on the tab type prop (marketing starts with 'm', otherwise projects/general)
  const filteredByTypeEnquiries = useMemo(() => {
    return enquiries.filter(e => {
      const isMarketing = e.projectAssociation?.startsWith('m');
      if (type === 'marketing') return isMarketing;
      if (type === 'projects') return !isMarketing;
      return true;
    });
  }, [enquiries, type]);

  // Unique properties list for dropdown filter
  const uniqueProperties = useMemo(() => {
    const props = new Set<string>();
    filteredByTypeEnquiries.forEach(e => {
      if (e.projectName) props.add(e.projectName);
    });
    return ['All', ...Array.from(props)];
  }, [filteredByTypeEnquiries]);

  const filteredEnquiries = useMemo(() => {
    return filteredByTypeEnquiries.filter(e => {
      // Basic search
      const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase()) || 
                            e.email.toLowerCase().includes(search.toLowerCase()) ||
                            e.phone.includes(search) || 
                            (e.projectName && e.projectName.toLowerCase().includes(search.toLowerCase()));
      
      // Status filter
      const matchesStatus = filter === 'All' || e.status === filter;

      // Property name filter
      const matchesProperty = propertyFilter === 'All' || e.projectName === propertyFilter;

      // Date range filter
      let matchesDate = true;
      if (dateRangeFilter !== 'All') {
        const leadTime = new Date(e.date).getTime();
        const now = Date.now();
        const diffDays = (now - leadTime) / (1000 * 60 * 60 * 24);
        if (dateRangeFilter === '7days') {
          matchesDate = diffDays <= 7;
        } else if (dateRangeFilter === '30days') {
          matchesDate = diffDays <= 30;
        }
      }

      return matchesSearch && matchesStatus && matchesProperty && matchesDate;
    });
  }, [filteredByTypeEnquiries, search, filter, propertyFilter, dateRangeFilter]);

  const handleExportCSV = (selectedRows?: Record<string, unknown>[]) => {
    const dataToExport = selectedRows && selectedRows.length > 0 ? (selectedRows as unknown as Enquiry[]) : filteredEnquiries;
    const headers = ['Lead ID', 'Customer Name', 'Phone', 'Email', 'Assigned Property', 'Status', 'Date Submitted', 'Staff Notes'];
    const rows = dataToExport.map(enq => [
      enq.id,
      `"${enq.name.replace(/"/g, '""')}"`,
      enq.phone,
      enq.email,
      `"${enq.projectName?.replace(/"/g, '""') || enq.projectAssociation}"`,
      enq.status,
      new Date(enq.date).toLocaleString(),
      `"${(enq.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sap_leads_${type || 'all'}_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onAddToast(`Exported ${dataToExport.length} leads to CSV.`, 'success');
  };

  const leadColumns: ALVColumn[] = [
    { key: 'name', label: 'Customer', render: (_v, row) => (
      <div>
        <div style={{fontWeight:600,color:'#0f2b46'}}>{String(row.name)}</div>
        <div style={{fontSize:'0.72rem',color:'#666',display:'flex',alignItems:'center',gap:'3px',marginTop:'2px'}}><Phone size={10} style={{color:'#0854a0'}}/> {String(row.phone)}</div>
        <div style={{fontSize:'0.72rem',color:'#666',display:'flex',alignItems:'center',gap:'3px'}}><Mail size={10} style={{color:'#0854a0'}}/> {String(row.email)}</div>
      </div>
    )},
    { key: 'projectName', label: 'Property', render: (_v, row) => {
      const r = row as any;
      return (
        <span>
          <span style={{fontWeight:600,color:'#0854a0'}}>{String(r.projectName || '—')}</span>
          {r.projectAssociation && <div style={{fontSize:'0.7rem',color:'#888'}}>({String(r.projectAssociation)})</div>}
        </span>
      );
    }},
    { key: 'message', label: 'Message Preview', render: (_v, row) => {
      const r = row as any;
      return (
        <div style={{maxWidth:'260px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:'0.78rem'}}>
          {String(r.message || '—')}
          {r.notes && <div style={{fontSize:'0.7rem',color:'#1e7e34',marginTop:'1px'}}><strong>Note:</strong> {String(r.notes)}</div>}
        </div>
      );
    }},
    { key: 'status', label: 'Status', render: (_v, row) => {
      const s = String(row.status);
      return <span className={`badge ${s==='Completed'?'badge-completed':s==='In Progress'?'badge-inprogress':'badge-new'}`}>{s}</span>;
    }},
    { key: 'date', label: 'Submitted', render: (_v, row) => (
      <span style={{fontSize:'0.75rem',color:'#666'}}>{new Date(String(row.date)).toLocaleString()}</span>
    )},
    { key: '__actions', label: 'Actions', sortable: false, width: '80px', align: 'center', render: (_v, row) => (
      <div className="admin-table-actions" style={{justifyContent:'center'}}>
        <button onClick={() => handleOpenReview(row as unknown as Enquiry)} className="alv-toolbar-btn" title="Review Lead"><Edit size={13}/></button>
        <button onClick={() => handleDelete(String(row.id), String(row.name))} className="alv-toolbar-btn" title="Delete" style={{color:'#dc2626',borderColor:'#dc2626'}}><Trash2 size={13}/></button>
      </div>
    )},
  ];

  const title = type === 'marketing' ? 'Marketing Leads Portfolio' : 'Project Leads Portfolio';

  return (
    <div className="admin-enquiries-view">
      {/* SAP Fiori Smart Filter Bar */}
      <div className="sap-smart-filterbar" style={{marginBottom:'0.75rem'}}>
        <div className="sap-filterbar-fields">
          <div className="sap-filterbar-field">
            <span className="sap-filterbar-label">Search Criteria</span>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                placeholder="Search name, email, phone..." 
                className="form-control"
                style={{ padding: '0.45rem 0.5rem 0.45rem 2rem', fontSize: '0.85rem', marginBottom: 0, width: '100%' }}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div className="sap-filterbar-field">
            <span className="sap-filterbar-label">Property Association</span>
            <select 
              value={propertyFilter}
              onChange={e => setPropertyFilter(e.target.value)}
              className="form-control"
              style={{ padding: '0.4rem', fontSize: '0.85rem', marginBottom: 0 }}
            >
              <option value="All">All Properties</option>
              {uniqueProperties.filter(p => p !== 'All').map((prop, idx) => (
                <option key={idx} value={prop}>{prop}</option>
              ))}
            </select>
          </div>

          <div className="sap-filterbar-field">
            <span className="sap-filterbar-label">Lead Status</span>
            <select 
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="form-control"
              style={{ padding: '0.4rem', fontSize: '0.85rem', marginBottom: 0 }}
            >
              <option value="All">All Statuses</option>
              <option value="New">New Leads</option>
              <option value="In Progress">Active Followups</option>
              <option value="Completed">Deals Closed</option>
            </select>
          </div>

          <div className="sap-filterbar-field">
            <span className="sap-filterbar-label">Date Submitted</span>
            <select 
              value={dateRangeFilter}
              onChange={e => setDateRangeFilter(e.target.value)}
              className="form-control"
              style={{ padding: '0.4rem', fontSize: '0.85rem', marginBottom: 0 }}
            >
              <option value="All">All Time</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      <ALVGrid
        title={title}
        subtitle={`${filteredEnquiries.length} leads`}
        columns={leadColumns}
        data={filteredEnquiries as unknown as Record<string, unknown>[]}
        rowKey="id"
        onExport={handleExportCSV}
        onRefresh={onRefresh}
        searchable={false}
        emptyText="No leads matching selected filters."
        pageSize={12}
      />

      {/* Review Modal Form */}
      {reviewingEnq && (
        <div className="modal-overlay" onClick={() => setReviewingEnq(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
            <h3 className="p-3 bg-light-soft border-bottom-title" style={{ margin: 0, backgroundColor: '#f3f5f8', borderBottom: '1px solid var(--sap-border-color)' }}>Review Customer Enquiry</h3>
            
            <form onSubmit={handleSaveReview} className="p-3">
              <div className="bg-light-soft p-3 mb-3" style={{ borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: '#f8fafc' }}>
                <div className="grid grid-2 gap-2 text-sm" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <span className="font-bold">Customer:</span> {reviewingEnq.name}
                  </div>
                  <div>
                    <span className="font-bold">Phone:</span> {reviewingEnq.phone}
                  </div>
                  <div>
                    <span className="font-bold">Email:</span> {reviewingEnq.email}
                  </div>
                  <div>
                    <span className="font-bold">Property:</span> {reviewingEnq.projectName}
                  </div>
                </div>
                <div className="mt-2 text-sm pt-2" style={{ borderTop: '1px dashed var(--border-color)' }}>
                  <span className="font-bold">Message Details:</span>
                  <p className="text-muted text-sm mt-1" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{reviewingEnq.message}</p>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Update Status *</label>
                <select 
                  className="form-control" 
                  value={status}
                  onChange={e => setStatus(e.target.value as EnquiryStatus)}
                  style={{ width: '100%', padding: '0.5rem' }}
                >
                  <option value="New">New Lead</option>
                  <option value="In Progress">In Progress (Following up)</option>
                  <option value="Completed">Completed (Deal closed/Disposed)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Internal Follow-up Staff Notes</label>
                <textarea 
                  className="form-control" 
                  rows={4} 
                  placeholder="Type updates (e.g. Called client, scheduled site visit on Sunday...)" 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem' }}
                />
              </div>

              <div className="flex gap-2 justify-end mt-2" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setReviewingEnq(null)} className="btn btn-outline btn-sm" style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" className="btn btn-secondary btn-sm" style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>Save Enquiry</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
