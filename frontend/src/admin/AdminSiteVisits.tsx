import React, { useState, useEffect, useMemo } from 'react';
import type { SiteVisit, Project, MailConfig, MarketingAgent } from '../types';
import { 
  getSiteVisits, 
  addSiteVisit, 
  updateSiteVisit, 
  deleteSiteVisit, 
  processSiteVisitReminders, 
  sendSiteVisitEmailNow,
  getMailConfig,
  getMarketingAgents
} from '../utils/db';
import { ALVGrid } from './ALVGrid';
import type { ALVColumn } from './ALVGrid';
import { 
  Mail, 
  Phone, 
  Calendar, 
  Clock, 
  User, 
  Eye, 
  Trash2, 
  Edit, 
  Search, 
  RefreshCw,
  Building,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface AdminSiteVisitsProps {
  projects: Project[];
  marketing: Project[];
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onConfirm: (msg: string) => Promise<boolean>;
}

export const AdminSiteVisits: React.FC<AdminSiteVisitsProps> = ({
  projects,
  marketing,
  onAddToast,
  onConfirm
}) => {
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [agents, setAgents] = useState<MarketingAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [mailConfig, setMailConfig] = useState<MailConfig | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [projectFilter, setProjectFilter] = useState('All');

  // Add/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingVisit, setEditingVisit] = useState<SiteVisit | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formProject, setFormProject] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formAgent, setFormAgent] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Email Preview Modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewVisit, setPreviewVisit] = useState<SiteVisit | null>(null);
  const [previewContent, setPreviewContent] = useState({ subject: '', body: '' });

  // List of all active projects/marketing for select dropdown
  const allProperties = useMemo(() => {
    return [...projects, ...marketing];
  }, [projects, marketing]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [visitList, config, agentList] = await Promise.all([
        getSiteVisits(),
        getMailConfig(),
        getMarketingAgents()
      ]);
      setVisits(visitList);
      setMailConfig(config);
      setAgents(agentList);
    } catch (err: any) {
      console.error("Failed to load site visits:", err);
      onAddToast("Failed to load site visits and mail configuration.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Form Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = "Customer name is required";
    if (!formEmail.trim()) {
      errors.email = "Email address is required";
    } else if (!/\S+@\S+\.\S+/.test(formEmail)) {
      errors.email = "Please enter a valid email";
    }
    if (!formPhone.trim()) {
      errors.phone = "Phone number is required";
    } else if (!/^\+?[0-9\s-]{10,14}$/.test(formPhone.replace(/\s+/g, ''))) {
      errors.phone = "Please enter a valid phone number";
    }
    if (!formProject) errors.project = "Please select a property/site";
    if (!formDate) errors.date = "Visit date is required";
    if (!formTime) errors.time = "Visit time is required";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenAddModal = () => {
    setEditingVisit(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormProject(allProperties[0]?.id || '');
    setFormDate('');
    setFormTime('');
    setFormAgent('');
    setFormErrors({});
    setShowModal(true);
  };

  const handleOpenEditModal = (visit: SiteVisit) => {
    setEditingVisit(visit);
    setFormName(visit.customerName);
    setFormEmail(visit.customerEmail);
    setFormPhone(visit.customerPhone);
    setFormProject(visit.projectAssociation);
    setFormDate(visit.visitDate);
    setFormTime(visit.visitTime);
    setFormAgent(visit.assignedAgent || '');
    setFormErrors({});
    setShowModal(true);
  };

  const handleSaveVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Find project name for caching
    const selectedProj = allProperties.find(p => p.id === formProject);
    const projectName = selectedProj ? selectedProj.name : 'Unknown Property';

    const visitData = {
      customerName: formName,
      customerEmail: formEmail,
      customerPhone: formPhone,
      projectAssociation: formProject,
      projectName,
      visitDate: formDate,
      visitTime: formTime,
      assignedAgent: formAgent || undefined,
      emailStatus: editingVisit ? editingVisit.emailStatus : 'Pending' as const
    };

    try {
      if (editingVisit) {
        await updateSiteVisit(editingVisit.id, visitData);
        onAddToast("Site visit rescheduled successfully.", "success");
      } else {
        await addSiteVisit(visitData);
        onAddToast("New site visit scheduled successfully.", "success");
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      onAddToast(err.message || "Failed to save site visit.", "error");
    }
  };

  const handleDeleteVisit = async (id: string, name: string) => {
    const confirmed = await onConfirm(`Are you sure you want to cancel the scheduled site visit for "${name}"?`);
    if (confirmed) {
      try {
        await deleteSiteVisit(id);
        onAddToast("Site visit cancelled and removed.", "success");
        loadData();
      } catch (err) {
        onAddToast("Failed to delete site visit.", "error");
      }
    }
  };

  // Run the reminder rules processor
  const handleCheckReminders = async () => {
    setLoading(true);
    try {
      const result = await processSiteVisitReminders();
      const summaryMsg = `Processed reminders: Sent: ${result.sent}, Skipped (passed): ${result.skipped}, Failed: ${result.failed}`;
      if (result.sent > 0) {
        onAddToast(summaryMsg, "success");
      } else {
        onAddToast(summaryMsg, "info");
      }
      loadData();
    } catch (err: any) {
      onAddToast(err.message || "Failed to process reminders.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Trigger manual immediate email send
  const handleSendNow = async (id: string, name: string) => {
    const confirmed = await onConfirm(`Do you want to send the reminder email to "${name}" immediately? This bypasses the date rule.`);
    if (confirmed) {
      try {
        await sendSiteVisitEmailNow(id);
        onAddToast(`Reminder email triggered for ${name}!`, "success");
        loadData();
      } catch (err: any) {
        onAddToast(err.message || "Failed to send email.", "error");
      }
    }
  };

  // Compile and preview templates
  const compileTemplate = (template: string, vars: Record<string, string>) => {
    let result = template;
    for (const key in vars) {
      result = result.replace(new RegExp(`{${key}}`, 'g'), vars[key]);
    }
    return result;
  };

  const handleOpenPreview = (visit: SiteVisit) => {
    if (!mailConfig) {
      onAddToast("Mail configuration is loading. Please try again.", "info");
      return;
    }

    const matchedProj = allProperties.find(p => p.id === visit.projectAssociation);
    const location = matchedProj ? matchedProj.location : "At the project site";

    let assignedAgentStr = visit.assignedAgent || "Our Property Relations Executive";
    let assignedAgentPhoneStr = "-";
    if (visit.assignedAgent) {
      const matchedAgent = agents.find(a => a.name === visit.assignedAgent);
      if (matchedAgent) {
        assignedAgentStr = matchedAgent.name;
        if (matchedAgent.phone) {
          assignedAgentPhoneStr = matchedAgent.phone;
        }
      }
    }

    const vars = {
      customerName: visit.customerName,
      projectName: visit.projectName,
      visitDate: visit.visitDate,
      visitTime: visit.visitTime,
      assignedAgent: assignedAgentStr,
      assignedAgentPhone: assignedAgentPhoneStr,
      location: location
    };

    const subject = compileTemplate(mailConfig.emailSubject, vars);
    const body = compileTemplate(mailConfig.emailTemplate, vars);

    setPreviewVisit(visit);
    setPreviewContent({ subject, body });
    setShowPreviewModal(true);
  };

  // Filtered Site Visits list
  const filteredVisits = useMemo(() => {
    return visits.filter(visit => {
      const matchesSearch = 
        visit.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        visit.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        visit.customerPhone.includes(searchQuery) ||
        visit.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (visit.assignedAgent && visit.assignedAgent.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'All' || visit.emailStatus === statusFilter;
      const matchesProject = projectFilter === 'All' || visit.projectAssociation === projectFilter;

      return matchesSearch && matchesStatus && matchesProject;
    });
  }, [visits, searchQuery, statusFilter, projectFilter]);

  // Unique properties for smart filter dropdown
  const uniqueProperties = useMemo(() => {
    const props = new Map<string, string>(); // id -> name
    visits.forEach(v => {
      props.set(v.projectAssociation, v.projectName);
    });
    return Array.from(props.entries());
  }, [visits]);

  // Grid column setup
  const columns: ALVColumn[] = [
    { 
      key: 'customerName', 
      label: 'Customer Details', 
      render: (_v, row) => {
        const r = row as unknown as SiteVisit;
        return (
          <div>
            <div style={{ fontWeight: 600, color: '#0f2b46' }}>{r.customerName}</div>
            <div style={{ fontSize: '0.72rem', color: '#666', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
              <Phone size={10} style={{ color: '#0854a0' }} /> {r.customerPhone}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#666', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Mail size={10} style={{ color: '#0854a0' }} /> {r.customerEmail}
            </div>
          </div>
        );
      }
    },
    {
      key: 'projectName',
      label: 'Property Site',
      render: (_v, row) => {
        const r = row as unknown as SiteVisit;
        return (
          <div>
            <div style={{ fontWeight: 600, color: '#0854a0' }}>{r.projectName}</div>
            <div style={{ fontSize: '0.7rem', color: '#888', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <Building size={10} /> ID: {r.projectAssociation}
            </div>
          </div>
        );
      }
    },
    {
      key: 'visitDate',
      label: 'Scheduled Date & Time',
      render: (_v, row) => {
        const r = row as unknown as SiteVisit;
        return (
          <div>
            <div style={{ fontWeight: 500, color: '#333', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={12} style={{ color: '#444' }} /> {r.visitDate}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#666', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <Clock size={12} style={{ color: '#444' }} /> {r.visitTime}
            </div>
          </div>
        );
      }
    },
    {
      key: 'assignedAgent',
      label: 'Assigned Agent',
      render: (v) => <span style={{ fontSize: '0.85rem', color: '#333' }}>{String(v || '—')}</span>
    },
    {
      key: 'emailStatus',
      label: 'Reminder Email Status',
      align: 'center',
      render: (_v, row) => {
        const r = row as unknown as SiteVisit;
        const s = r.emailStatus;
        let badgeClass = 'badge-new';
        if (s === 'Sent') badgeClass = 'badge-completed';
        if (s === 'Failed') badgeClass = 'badge-rejected'; // red
        if (s === 'Skipped') badgeClass = 'badge-inprogress'; // grey / active

        return (
          <div>
            <span className={`badge ${badgeClass}`}>{s}</span>
            {r.emailSentDate && (
              <div style={{ fontSize: '0.65rem', color: '#888', marginTop: '3px' }}>
                Sent: {new Date(r.emailSentDate).toLocaleDateString()}
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: '__actions',
      label: 'Actions',
      sortable: false,
      align: 'center',
      width: '120px',
      render: (_v, row) => {
        const r = row as unknown as SiteVisit;
        return (
          <div className="admin-table-actions" style={{ justifyContent: 'center' }}>
            <button 
              onClick={() => handleOpenPreview(r)} 
              className="alv-toolbar-btn" 
              title="Preview email to be sent"
              style={{ color: '#0854a0', borderColor: '#0854a0' }}
            >
              <Eye size={13} />
            </button>
            <button 
              onClick={() => handleOpenEditModal(r)} 
              className="alv-toolbar-btn" 
              title="Reschedule Visit"
            >
              <Edit size={13} />
            </button>
            <button 
              onClick={() => handleDeleteVisit(r.id, r.customerName)} 
              className="alv-toolbar-btn" 
              title="Cancel Visit" 
              style={{ color: '#dc2626', borderColor: '#dc2626' }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="admin-site-visits-view">
      {/* Smart Filterbar */}
      <div className="sap-smart-filterbar" style={{ marginBottom: '0.75rem' }}>
        <div className="sap-filterbar-fields">
          <div className="sap-filterbar-field">
            <span className="sap-filterbar-label">Search Criteria</span>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                placeholder="Search name, phone, email, agent..." 
                className="form-control"
                style={{ padding: '0.45rem 0.5rem 0.45rem 2rem', fontSize: '0.85rem', marginBottom: 0, width: '100%' }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div className="sap-filterbar-field">
            <span className="sap-filterbar-label">Property Site</span>
            <select 
              value={projectFilter}
              onChange={e => setProjectFilter(e.target.value)}
              className="form-control"
              style={{ padding: '0.4rem', fontSize: '0.85rem', marginBottom: 0 }}
            >
              <option value="All">All Properties</option>
              {uniqueProperties.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>

          <div className="sap-filterbar-field">
            <span className="sap-filterbar-label">Email Status</span>
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="form-control"
              style={{ padding: '0.4rem', fontSize: '0.85rem', marginBottom: 0 }}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Sent">Sent</option>
              <option value="Failed">Failed</option>
              <option value="Skipped">Skipped (Date Passed)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main ALV Grid */}
      <ALVGrid 
        title="Site Visit Schedules & Reminders"
        subtitle={`System matches visit date relative to current settings (Delivery Mode: ${mailConfig?.deliveryMode?.toUpperCase() || 'SIMULATION'})`}
        columns={columns}
        data={filteredVisits as any}
        rowKey="id"
        onAdd={handleOpenAddModal}
        addLabel="Schedule Site Visit"
        onRefresh={loadData}
        pageSize={10}
        loading={loading}
        selectable={false}
        extraToolbarActions={
          <button 
            className="alv-add-btn" 
            style={{ backgroundColor: '#0854a0', borderColor: '#0854a0', display: 'flex', alignItems: 'center', gap: '5px' }}
            onClick={handleCheckReminders}
            title="Scan pending visits and trigger due reminder emails"
          >
            <RefreshCw size={14} /> Process Reminders
          </button>
        }
      />

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div className="modal-content premium-modal" onClick={e => e.stopPropagation()} style={{ width: '500px', padding: '1.5rem' }}>
            <div className="premium-modal-header" style={{ marginBottom: '1.25rem' }}>
              <h3 className="modal-title">{editingVisit ? 'Reschedule Site Visit' : 'Schedule Site Visit'}</h3>
              <p className="modal-subtitle" style={{ fontSize: '0.8rem', color: '#666' }}>
                {editingVisit ? `Update details for scheduled visit SV${editingVisit.id.replace('sv','')}` : 'Fill in the customer appointment details below.'}
              </p>
            </div>

            <form onSubmit={handleSaveVisit} className="premium-modal-form">
              <div className="form-group-premium">
                <label className="form-label-premium">Customer Name *</label>
                <div className="input-with-icon">
                  <User size={16} className="input-icon" />
                  <input 
                    type="text" 
                    className="form-control-premium"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="Enter full name"
                    required
                  />
                </div>
                {formErrors.name && <div className="form-error">{formErrors.name}</div>}
              </div>

              <div className="grid grid-2 gap-1.5 mobile-stack" style={{ marginBottom: '1rem' }}>
                <div className="form-group-premium" style={{ marginBottom: 0 }}>
                  <label className="form-label-premium">Email Address *</label>
                  <div className="input-with-icon">
                    <Mail size={16} className="input-icon" />
                    <input 
                      type="email" 
                      className="form-control-premium"
                      value={formEmail}
                      onChange={e => setFormEmail(e.target.value)}
                      placeholder="email@example.com"
                      required
                    />
                  </div>
                  {formErrors.email && <div className="form-error">{formErrors.email}</div>}
                </div>

                <div className="form-group-premium" style={{ marginBottom: 0 }}>
                  <label className="form-label-premium">Phone Number *</label>
                  <div className="input-with-icon">
                    <Phone size={16} className="input-icon" />
                    <input 
                      type="text" 
                      className="form-control-premium"
                      value={formPhone}
                      onChange={e => setFormPhone(e.target.value)}
                      placeholder="e.g. 9000553832"
                      required
                    />
                  </div>
                  {formErrors.phone && <div className="form-error">{formErrors.phone}</div>}
                </div>
              </div>

              <div className="form-group-premium">
                <label className="form-label-premium">Select Property/Site Listing *</label>
                <select 
                  className="form-control"
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '4px', borderColor: '#cbd5e1', fontSize: '0.9rem' }}
                  value={formProject}
                  onChange={e => setFormProject(e.target.value)}
                  required
                >
                  {allProperties.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.location})</option>
                  ))}
                </select>
                {formErrors.project && <div className="form-error">{formErrors.project}</div>}
              </div>

              <div className="grid grid-2 gap-1.5 mobile-stack" style={{ marginBottom: '1rem' }}>
                <div className="form-group-premium" style={{ marginBottom: 0 }}>
                  <label className="form-label-premium">Visit Date *</label>
                  <div className="input-with-icon">
                    <Calendar size={16} className="input-icon" />
                    <input 
                      type="date" 
                      className="form-control-premium"
                      value={formDate}
                      onChange={e => setFormDate(e.target.value)}
                      required
                    />
                  </div>
                  {formErrors.date && <div className="form-error">{formErrors.date}</div>}
                </div>

                <div className="form-group-premium" style={{ marginBottom: 0 }}>
                  <label className="form-label-premium">Visit Time *</label>
                  <div className="input-with-icon">
                    <Clock size={16} className="input-icon" />
                    <input 
                      type="time" 
                      className="form-control-premium"
                      value={formTime}
                      onChange={e => setFormTime(e.target.value)}
                      required
                    />
                  </div>
                  {formErrors.time && <div className="form-error">{formErrors.time}</div>}
                </div>
              </div>

              <div className="form-group-premium">
                <label className="form-label-premium">Assigned Agent (Optional)</label>
                <div className="input-with-icon">
                  <User size={16} className="input-icon" />
                  <input 
                    type="text" 
                    className="form-control-premium"
                    value={formAgent}
                    onChange={e => setFormAgent(e.target.value)}
                    placeholder="Enter or select agent name"
                    list="agent-suggestions"
                  />
                  <datalist id="agent-suggestions">
                    {agents.map(a => (
                      <option key={a.id} value={a.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="premium-modal-footer" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="btn btn-outline"
                  style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-secondary"
                  style={{ backgroundColor: 'var(--sap-fiori-blue)', borderColor: 'var(--sap-fiori-blue)', color: 'white', padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
                >
                  {editingVisit ? 'Reschedule' : 'Save Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Email Preview Modal */}
      {showPreviewModal && previewVisit && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div className="modal-content premium-modal" onClick={e => e.stopPropagation()} style={{ width: '600px', padding: '1.5rem' }}>
            <div className="premium-modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={20} style={{ color: 'var(--sap-fiori-blue)' }} /> 
                <span>Email Reminder Preview</span>
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#666', margin: '4px 0 0' }}>
                Rendered template for: <strong>{previewVisit.customerName}</strong> ({previewVisit.customerEmail})
              </p>
            </div>

            <div className="email-preview-envelope" style={{ border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
              {/* Header block */}
              <div style={{ backgroundColor: '#f1f5f9', padding: '0.75rem 1rem', borderBottom: '1px solid #cbd5e1', fontSize: '0.82rem', color: '#334155' }}>
                <div style={{ marginBottom: '4px' }}>
                  <strong>From:</strong> {mailConfig?.senderEmail || 'noreply@jkfutureinfra.com'}
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <strong>To:</strong> {previewVisit.customerEmail}
                </div>
                <div>
                  <strong>Subject:</strong> {previewContent.subject}
                </div>
              </div>

              {/* Body block */}
              <div style={{ padding: '1.5rem', minHeight: '180px', backgroundColor: 'white', fontSize: '0.9rem', color: '#1e293b', lineHeight: '1.6' }}>
                <div style={{ textAlign: 'center', borderBottom: '2px solid #0f2b46', paddingBottom: '12px', marginBottom: '16px' }}>
                  <img src="/src/assets/logo.png" alt="JK Future Infra Logo" style={{ height: '40px' }} />
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {previewContent.body}
                </div>
              </div>
            </div>

            <div className="premium-modal-footer" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: 'auto', fontSize: '0.78rem', color: '#64748b' }}>
                {mailConfig?.deliveryMode === 'simulation' ? (
                  <>
                    <AlertCircle size={14} style={{ color: '#f59e0b' }} />
                    <span>Active Mode: Simulation (Mock logs only)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={14} style={{ color: '#10b981' }} />
                    <span>Active Mode: SMTP Server Delivery</span>
                  </>
                )}
              </div>
              <button 
                type="button" 
                onClick={() => setShowPreviewModal(false)} 
                className="btn btn-outline"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
              >
                Close Preview
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                style={{ backgroundColor: '#10b981', borderColor: '#10b981', color: 'white', padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
                onClick={() => {
                  setShowPreviewModal(false);
                  handleSendNow(previewVisit.id, previewVisit.customerName);
                }}
              >
                Send Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
