import React, { useState } from 'react';
import type { JobApplication } from '../types';
import { Eye, Trash2, Phone, Mail } from 'lucide-react';
import { updateApplicationStatus, deleteApplication } from '../utils/db';
import { ALVGrid } from './ALVGrid';
import type { ALVColumn } from './ALVGrid';

interface AdminCareersProps {
  applications: JobApplication[];
  onRefresh: () => void;
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onConfirm: (msg: string) => Promise<boolean>;
}

export const AdminCareers: React.FC<AdminCareersProps> = ({
  applications,
  onRefresh,
  onAddToast,
  onConfirm
}) => {
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (await onConfirm(`Are you sure you want to delete the application from ${name}?`)) {
      try {
        await deleteApplication(id);
        onAddToast(`Application from ${name} deleted successfully.`, 'info');
        onRefresh();
      } catch (error) {
        onAddToast('Failed to delete application.', 'error');
      }
    }
  };

  const handleStatusChange = async (id: string, newStatus: JobApplication['status']) => {
    try {
      await updateApplicationStatus(id, newStatus);
      onAddToast(`Status updated to ${newStatus}.`, 'success');
      onRefresh();
      if (selectedApp && selectedApp.id === id) {
        setSelectedApp(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error) {
      onAddToast('Failed to update status.', 'error');
    }
  };

  const columns: ALVColumn[] = [
    {
      key: 'name',
      label: 'Candidate',
      render: (_v, row) => {
        const app = row as unknown as JobApplication;
        return (
          <div>
            <div className="font-semibold">{app.name}</div>
            <div className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
              <Phone size={11} className="text-secondary" /> {app.phone}
            </div>
            <div className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
              <Mail size={11} className="text-secondary" /> {app.email}
            </div>
          </div>
        );
      },
    },
    {
      key: 'position',
      label: 'Target Position',
      render: (_v, row) => (
        <span className="font-semibold text-primary">{String(row.position)}</span>
      ),
    },
    {
      key: 'experience',
      label: 'Experience',
    },
    {
      key: 'status',
      label: 'Status',
      render: (_v, row) => {
        const status = String(row.status);
        return (
          <span className={`badge badge-${status.toLowerCase().replace(' ', '')}`}>{status}</span>
        );
      },
    },
    {
      key: 'date',
      label: 'Applied Date',
      render: (_v, row) => <span>{new Date(String(row.date)).toLocaleDateString()}</span>,
    },
    {
      key: '__actions',
      label: 'Actions',
      sortable: false,
      width: '90px',
      align: 'center',
      render: (_v, row) => {
        const app = row as unknown as JobApplication;
        return (
          <div className="admin-table-actions" style={{ justifyContent: 'center' }}>
            <button
              onClick={() => setSelectedApp(app)}
              className="alv-toolbar-btn"
              title="Review Cover Letter"
            >
              <Eye size={13} />
            </button>
            <button
              onClick={() => handleDelete(app.id, app.name)}
              className="alv-toolbar-btn"
              title="Delete Application"
              style={{ color: '#dc2626', borderColor: '#dc2626' }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="admin-careers-view">
      <ALVGrid
        title="Job Applications"
        subtitle={`${applications.length} Submission${applications.length !== 1 ? 's' : ''}`}
        columns={columns}
        data={applications as unknown as Record<string, unknown>[]}
        rowKey="id"
        onRefresh={onRefresh}
        searchPlaceholder="Search candidates, positions..."
        emptyText="No applications found matching your criteria."
      />

      {/* Application Detail Review Modal */}
      {selectedApp && (
        <div className="modal-overlay" onClick={() => setSelectedApp(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h3 className="p-3 bg-light-soft border-bottom-title" style={{ margin: 0 }}>Review Application</h3>
            
            <div className="p-3">
              <div className="bg-light-soft p-2 mb-2" style={{ borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div className="grid grid-2 gap-2 text-sm">
                  <div><span className="font-bold">Candidate:</span> {selectedApp.name}</div>
                  <div><span className="font-bold">Phone:</span> {selectedApp.phone}</div>
                  <div><span className="font-bold">Email:</span> {selectedApp.email}</div>
                  <div><span className="font-bold">Experience:</span> {selectedApp.experience}</div>
                  <div><span className="font-bold">Target Position:</span> <b className="text-primary">{selectedApp.position}</b></div>
                  <div><span className="font-bold">Applied:</span> {new Date(selectedApp.date).toLocaleString()}</div>
                </div>
              </div>

              <div className="mb-3">
                <h4 className="mb-0.5">Experience &amp; Cover Letter:</h4>
                <div className="p-2 bg-light-soft text-sm" style={{ border: '1px solid var(--border-color)', borderRadius: '6px', maxHeight: '200px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                  {selectedApp.coverLetter}
                </div>
              </div>

              <div className="form-group mb-2">
                <label className="form-label font-bold">Update Recruitment Status</label>
                <div className="flex gap-1">
                  {(['Pending', 'Interview Scheduled', 'Shortlisted', 'Rejected'] as JobApplication['status'][]).map(st => (
                    <button 
                      key={st}
                      type="button"
                      className={`btn btn-sm ${selectedApp.status === st ? 'btn-primary' : 'btn-outline'}`}
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                      onClick={() => handleStatusChange(selectedApp.id, st)}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2 border-top-title">
                <button onClick={() => setSelectedApp(null)} className="btn btn-secondary btn-sm">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
