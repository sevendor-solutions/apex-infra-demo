import React, { useState, useMemo } from 'react';
import {
  Download, Filter, RefreshCw, Settings2, Search,
  SortAsc, SortDesc, ChevronLeft, ChevronRight, X
} from 'lucide-react';

export interface ALVColumn {
  key: string;
  label: string;
  width?: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, row: Record<string, unknown>, idx: number) => React.ReactNode;
}

interface ALVGridProps {
  title: string;
  subtitle?: string;
  columns: ALVColumn[];
  data: Record<string, unknown>[];
  rowKey?: string; // field to use as unique row key
  onAdd?: () => void;
  addLabel?: string;
  extraToolbarActions?: React.ReactNode;
  onExport?: (selectedRows?: Record<string, unknown>[]) => void;
  onRefresh?: () => void;
  pageSize?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
  loading?: boolean;
  selectable?: boolean;
  onSelectionChange?: (selectedRows: Record<string, unknown>[]) => void;
}

type SortDir = 'asc' | 'desc' | null;

export const ALVGrid: React.FC<ALVGridProps> = ({
  title,
  subtitle,
  columns,
  data,
  rowKey = 'id',
  onAdd,
  addLabel = 'Add New',
  extraToolbarActions,
  onExport,
  onRefresh,
  pageSize = 15,
  searchable = true,
  searchPlaceholder = 'Search...',
  emptyText = 'No records found.',
  loading = false,
  selectable = true,
  onSelectionChange,
}) => {
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(1);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [columnFilter, setColumnFilter] = useState<Record<string, string>>({});

  // Search filter
  const searched = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(row =>
      columns.some(col => {
        const val = row[col.key];
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, columns]);

  // Column-specific filter
  const columnFiltered = useMemo(() => {
    return searched.filter(row =>
      Object.entries(columnFilter).every(([key, val]) => {
        if (!val) return true;
        const cell = row[key];
        return cell != null && String(cell).toLowerCase().includes(val.toLowerCase());
      })
    );
  }, [searched, columnFilter]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortCol || !sortDir) return columnFiltered;
    return [...columnFiltered].sort((a, b) => {
      const av = a[sortCol] ?? '';
      const bv = b[sortCol] ?? '';
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [columnFiltered, sortCol, sortDir]);

  // Pagination
  const totalRows = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, totalRows);
  const pageRows = sorted.slice(pageStart, pageEnd);

  const handleSort = (key: string) => {
    if (sortCol === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc'));
      if (sortDir === 'desc') setSortCol(null);
    } else {
      setSortCol(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const handleSelectAll = (checked: boolean) => {
    const keys = checked ? new Set(pageRows.map(r => String(r[rowKey]))) : new Set<string>();
    setSelectedKeys(keys);
    if (onSelectionChange) {
      onSelectionChange(checked ? pageRows : []);
    }
  };

  const handleSelectRow = (key: string, _row: Record<string, unknown>) => {
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedKeys(next);
    if (onSelectionChange) {
      onSelectionChange(sorted.filter(r => next.has(String(r[rowKey]))));
    }
  };

  const allPageSelected = pageRows.length > 0 && pageRows.every(r => selectedKeys.has(String(r[rowKey])));
  const somePageSelected = pageRows.some(r => selectedKeys.has(String(r[rowKey])));

  const handleExport = () => {
    const selectedRows = selectedKeys.size > 0 
      ? sorted.filter(row => selectedKeys.has(String(row[rowKey])))
      : undefined;

    if (onExport) { 
      onExport(selectedRows); 
      return; 
    }

    const dataToExport = selectedRows ?? sorted;
    const headers = columns.map(c => c.label).join(',');
    const rows = dataToExport.map(row =>
      columns.map(col => {
        const val = row[col.key];
        return `"${String(val ?? '').replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${title.replace(/\s+/g, '_')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="alv-grid-container">
      {/* ── ALV Toolbar ── */}
      <div className="alv-toolbar">
        <div className="alv-toolbar-left">
          <div className="alv-title-block">
            <span className="alv-title">{title}</span>
            {subtitle && <span className="alv-subtitle">{subtitle}</span>}
          </div>
        </div>

        <div className="alv-toolbar-right">
          {/* Search */}
          {searchable && (
            <div className="alv-search-box">
              <Search size={13} className="alv-search-icon" />
              <input
                className="alv-search-input"
                placeholder={searchPlaceholder}
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
              {search && (
                <button className="alv-search-clear" onClick={() => { setSearch(''); setPage(1); }}>
                  <X size={11} />
                </button>
              )}
            </div>
          )}

          {/* Standard ALV toolbar buttons */}
          {onRefresh && (
            <button className="alv-toolbar-btn" title="Refresh" onClick={onRefresh}>
              <RefreshCw size={14} />
            </button>
          )}
          <button
            className={`alv-toolbar-btn ${filterOpen ? 'active' : ''}`}
            title="Column Filter"
            onClick={() => setFilterOpen(v => !v)}
          >
            <Filter size={14} />
          </button>
          <button className="alv-toolbar-btn" title="Export to Spreadsheet" onClick={handleExport}>
            <Download size={14} />
          </button>
          <button className="alv-toolbar-btn" title="Table Settings">
            <Settings2 size={14} />
          </button>

          {/* Separator */}
          {onAdd && <div className="alv-toolbar-sep" />}

          {/* Primary action */}
          {onAdd && (
            <button className="alv-add-btn" onClick={onAdd}>
              + {addLabel}
            </button>
          )}

          {/* Extra actions */}
          {extraToolbarActions}
        </div>
      </div>

      {/* ── Column Filter Row ── */}
      {filterOpen && (
        <div className="alv-filter-row">
          {selectable && <div className="alv-filter-cell" style={{ width: '36px' }} />}
          {columns.map(col => (
            <div key={col.key} className="alv-filter-cell" style={{ width: col.width }}>
              <input
                className="alv-filter-input"
                placeholder={`Filter ${col.label}`}
                value={columnFilter[col.key] || ''}
                onChange={e => {
                  setColumnFilter(prev => ({ ...prev, [col.key]: e.target.value }));
                  setPage(1);
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Grid Table ── */}
      <div className="alv-table-scroll">
        <table className="alv-table">
          <thead>
            <tr className="alv-header-row">
              {selectable && (
                <th className="alv-th alv-sel-col">
                  <input
                    type="checkbox"
                    className="alv-checkbox"
                    checked={allPageSelected}
                    ref={el => { if (el) el.indeterminate = !allPageSelected && somePageSelected; }}
                    onChange={e => handleSelectAll(e.target.checked)}
                  />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`alv-th ${col.sortable !== false ? 'alv-sortable' : ''}`}
                  style={{ width: col.width, textAlign: col.align || 'left' }}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <span className="alv-th-label">{col.label}</span>
                  {col.sortable !== false && (
                    <span className="alv-sort-icon">
                      {sortCol === col.key && sortDir === 'asc' ? (
                        <SortAsc size={12} />
                      ) : sortCol === col.key && sortDir === 'desc' ? (
                        <SortDesc size={12} />
                      ) : (
                        <span className="alv-sort-neutral">↕</span>
                      )}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="alv-loading-cell">
                  <span className="alv-loading-spinner" /> Loading...
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="alv-empty-cell">
                  {emptyText}
                </td>
              </tr>
            ) : (
              pageRows.map((row, idx) => {
                const key = String(row[rowKey] ?? idx);
                const isSelected = selectedKeys.has(key);
                return (
                  <tr
                    key={key}
                    className={`alv-row ${isSelected ? 'alv-row-selected' : ''} ${idx % 2 === 1 ? 'alv-row-alt' : ''}`}
                    onClick={() => selectable && handleSelectRow(key, row)}
                  >
                    {selectable && (
                      <td className="alv-td alv-sel-col" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="alv-checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(key, row)}
                        />
                      </td>
                    )}
                    {columns.map(col => (
                      <td
                        key={col.key}
                        className="alv-td"
                        style={{ textAlign: col.align || 'left' }}
                        onClick={e => e.stopPropagation()}
                      >
                        {col.render
                          ? col.render(row[col.key], row, pageStart + idx)
                          : (row[col.key] != null ? String(row[col.key]) : '—')}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Status Bar ── */}
      <div className="alv-statusbar">
        <div className="alv-statusbar-left">
          {selectedKeys.size > 0
            ? <span className="alv-selected-count">{selectedKeys.size} row{selectedKeys.size !== 1 ? 's' : ''} selected</span>
            : <span>
                {totalRows === 0
                  ? 'No records'
                  : `Rows ${pageStart + 1} – ${pageEnd} of ${totalRows}`}
              </span>
          }
        </div>
        <div className="alv-statusbar-right">
          <button
            className="alv-page-btn"
            disabled={safePage === 1}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft size={13} />
          </button>
          <span className="alv-page-info">Page {safePage} / {totalPages}</span>
          <button
            className="alv-page-btn"
            disabled={safePage === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
