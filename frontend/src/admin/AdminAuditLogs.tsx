import React, { useState, useMemo } from 'react';
import { Search, Calendar, Trash2 } from 'lucide-react';
import { ALVGrid } from './ALVGrid';
import type { ALVColumn } from './ALVGrid';

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  details: string;
  ip: string;
  status: 'Success' | 'Warning' | 'Failed';
}

interface AdminAuditLogsProps {
  logs: AuditLog[];
  onClearLogs: () => void;
  onRefresh: () => void;
}

export const AdminAuditLogs: React.FC<AdminAuditLogsProps> = ({ logs, onClearLogs, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Categories list
  const categories = useMemo(() => {
    const acts = new Set<string>();
    logs.forEach(log => {
      if (log.action !== 'Garbage Collection' && log.action !== 'Theme Configuration' && log.action !== 'Backup System') {
        acts.add(log.action);
      }
    });
    return ['All', ...Array.from(acts)];
  }, [logs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs
      .filter(log => log.action !== 'Garbage Collection' && log.action !== 'Theme Configuration' && log.action !== 'Backup System')
      .filter(log => {
        const matchesSearch = 
          log.user.toLowerCase().includes(search.toLowerCase()) ||
          log.details.toLowerCase().includes(search.toLowerCase()) ||
          log.ip.includes(search) ||
          log.id.toLowerCase().includes(search.toLowerCase());
        
        const matchesAction = actionFilter === 'All' || log.action === actionFilter;
        const matchesStatus = statusFilter === 'All' || log.status === statusFilter;
        
        return matchesSearch && matchesAction && matchesStatus;
      });
  }, [logs, search, actionFilter, statusFilter]);

  const handleExportCSV = (selectedRows?: Record<string, unknown>[]) => {
    const dataToExport = selectedRows && selectedRows.length > 0 ? (selectedRows as unknown as AuditLog[]) : filteredLogs;
    const headers = ['Log ID', 'Timestamp', 'User', 'Role', 'Action', 'Details', 'IP Address', 'Status'];
    const rows = dataToExport.map(log => [
      log.id,
      log.timestamp,
      log.user,
      log.role,
      log.action,
      `"${log.details.replace(/"/g, '""')}"`,
      log.ip,
      log.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sap_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const auditColumns: ALVColumn[] = [
    {
      key: 'id',
      label: 'Log ID',
      width: '100px',
      render: (_v, row) => (
        <code className="text-xs" style={{ backgroundColor: '#f1f5f9', padding: '2px 4px', borderRadius: '4px', color: '#475569' }}>
          {String(row.id).substring(0, 8)}
        </code>
      ),
    },
    {
      key: 'timestamp',
      label: 'Timestamp',
      width: '160px',
      render: (_v, row) => (
        <span className="flex align-center gap-0.5 text-xs">
          <Calendar size={11} className="text-muted" />
          {new Date(String(row.timestamp)).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'user',
      label: 'User Context',
      width: '180px',
      render: (_v, row) => (
        <div>
          <div className="font-semibold text-xs">{String(row.user)}</div>
          <div className="text-xxs text-muted" style={{ fontSize: '0.7rem' }}>{String(row.role)}</div>
        </div>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      width: '150px',
      render: (_v, row) => (
        <span className="text-xs font-semibold text-secondary" style={{ color: '#0854a0' }}>{String(row.action)}</span>
      ),
    },
    {
      key: 'details',
      label: 'Description',
      render: (_v, row) => (
        <div className="text-xs text-dark" style={{ wordBreak: 'break-word' }}>{String(row.details)}</div>
      ),
    },
    {
      key: 'ip',
      label: 'IP Address',
      width: '130px',
      render: (_v, row) => (
        <code className="text-xxs" style={{ color: '#64748b' }}>{String(row.ip)}</code>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '100px',
      align: 'center',
      render: (_v, row) => {
        const status = String(row.status) as 'Success' | 'Warning' | 'Failed';
        return (
          <span
            className={`badge ${
              status === 'Success' ? 'badge-completed' :
              status === 'Warning' ? 'badge-inprogress' : 'badge-new'
            }`}
            style={{
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '0.7rem',
              fontWeight: 600,
              backgroundColor: status === 'Success' ? '#e1f4e9' : status === 'Warning' ? '#fff4e5' : '#fce8e6',
              color: status === 'Success' ? '#1e7e34' : status === 'Warning' ? '#a05300' : '#c93b3b',
              border: `1px solid ${status === 'Success' ? '#c3edd5' : status === 'Warning' ? '#ffe3c3' : '#f5c2c2'}`,
            }}
          >
            {status}
          </span>
        );
      },
    },
  ];

  return (
    <div className="admin-audit-logs-view">
      {/* Smart Filters Bar */}
      <div className="glass-card py-2 px-2 flex justify-between align-center flex-wrap gap-2 mb-3" style={{ backgroundColor: 'var(--white)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
        <div className="flex gap-2 align-center flex-wrap">
          <div className="flex flex-col gap-0.5">
            <span className="text-xxs text-muted uppercase font-bold" style={{ fontSize: '0.65rem' }}>Action Category</span>
            <select 
              value={actionFilter} 
              onChange={e => setActionFilter(e.target.value)}
              className="form-control"
              style={{ width: '180px', padding: '0.4rem', fontSize: '0.85rem', marginBottom: 0 }}
            >
              {categories.map((c, i) => <option key={i} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-xxs text-muted uppercase font-bold" style={{ fontSize: '0.65rem' }}>Status</span>
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              className="form-control"
              style={{ width: '130px', padding: '0.4rem', fontSize: '0.85rem', marginBottom: 0 }}
            >
              <option value="All">All Statuses</option>
              <option value="Success">Success</option>
              <option value="Warning">Warning</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-xxs text-muted uppercase font-bold" style={{ fontSize: '0.65rem' }}>Search Logs</span>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Search user, IP, action details..." 
              className="form-control"
              style={{ width: '280px', padding: '0.45rem 0.5rem 0.45rem 2rem', fontSize: '0.85rem', marginBottom: 0 }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
        </div>
      </div>

      {/* ALVGrid for Audit Logs */}
      <ALVGrid
        title="System Audit Trail"
        subtitle={`${filteredLogs.length} logged event${filteredLogs.length !== 1 ? 's' : ''}`}
        columns={auditColumns}
        data={filteredLogs as unknown as Record<string, unknown>[]}
        rowKey="id"
        onRefresh={onRefresh}
        onExport={handleExportCSV}
        selectable={false}
        searchable={false}
        emptyText="No audit logs matching filters found."
        pageSize={15}
        extraToolbarActions={
          logs.length > 0 ? (
            <button
              type="button"
              onClick={onClearLogs}
              className="alv-btn-danger"
              title="Clear Audit Trail"
            >
              <Trash2 size={13} />
              <span>Clear Trail</span>
            </button>
          ) : undefined
        }
      />
    </div>
  );
};
