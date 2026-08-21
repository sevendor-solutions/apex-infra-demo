import React, { useState, useEffect, useMemo } from 'react';
import type { Project, DailyAgendaMatrix, DailyAgendaColumn, DailyAgendaRow, DailyAgendaChecklistItem, DailyAgendaTaskItem } from '../types';
import { getDailyAgendaMatrices, saveDailyAgendaMatrix } from '../utils/db';
import { ALVGrid } from './ALVGrid';
import type { ALVColumn } from './ALVGrid';
import { 
  Calendar, 
  Printer, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X,
  ListChecks
} from 'lucide-react';

interface AdminStageChecklistProps {
  projects: Project[];
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onConfirm: (msg: string) => Promise<boolean>;
}

// Helper to get formatted date YYYY-MM-DD
const getTodayStr = () => new Date().toISOString().split('T')[0];

// Default 10 Checklist Items matching Image 1
export const DEFAULT_CHECKLIST_TEMPLATE: string[] = [
  'Determine date and time',
  'Determine theme',
  'Create a guest list',
  'Send invitations',
  'Plan activities',
  'Plan menu',
  'Make shopping list',
  'Clean the house',
  'Set out decorations',
  'Prepare food & drinks'
];

// Helper to create fresh default checklist items - ALL UNCHECKED by default
const createDefaultChecklistItems = (): DailyAgendaChecklistItem[] => {
  return DEFAULT_CHECKLIST_TEMPLATE.map((title, idx) => ({
    id: `chk_def_${idx}`,
    title,
    completed: false // All unchecked by default as requested
  }));
};

// Standard default columns
const STANDARD_DEFAULT_COLUMNS: DailyAgendaColumn[] = [
  { id: 'c_regular', title: 'Regular follow-ups' }
];

export const AdminStageChecklist: React.FC<AdminStageChecklistProps> = ({
  projects: _projects,
  onAddToast,
  onConfirm
}) => {
  const [matrixTitle, setMatrixTitle] = useState('Daily Construction Follow-up Matrix');

  // Columns State
  const [columns, setColumns] = useState<DailyAgendaColumn[]>(STANDARD_DEFAULT_COLUMNS);
  const [newColumnTitle, setNewColumnTitle] = useState<string>('');

  // Date Rows List
  const [dateList, setDateList] = useState<string[]>([getTodayStr()]);

  // Cell Checklists State: key is `${dateStr}__${colId}`
  const [cellChecklists, setCellChecklists] = useState<Record<string, DailyAgendaChecklistItem[]>>({});

  // Legacy taskItems fallback support
  const [taskItems, setTaskItems] = useState<DailyAgendaTaskItem[]>([]);

  // Top Logger Form state
  const [newLogDate, setNewLogDate] = useState<string>(getTodayStr());
  const [newLogTitle, setNewLogTitle] = useState<string>('');
  const [newLogColId, setNewLogColId] = useState<string>('c_regular');

  // Date Row inline edit state
  const [editingDateRow, setEditingDateRow] = useState<string | null>(null);
  const [editDateValue, setEditDateValue] = useState<string>('');

  // Cell-level inline adding new option state
  const [newOptionInputs, setNewOptionInputs] = useState<Record<string, string>>({});

  // Editing checklist item state: key is `${dateStr}__${colId}__${itemId}`
  const [editingItemKey, setEditingItemKey] = useState<string | null>(null);
  const [editItemTitle, setEditItemTitle] = useState<string>('');

  // Status Filter State ('ALL' | 'COMPLETED' | 'IN_PROGRESS' | 'UPCOMING')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'IN_PROGRESS' | 'UPCOMING'>('ALL');

  // Auto-Load Saved Matrix State from Backend / LocalStorage on Mount
  useEffect(() => {
    const loadBackendData = async () => {
      try {
        const matrices = await getDailyAgendaMatrices();
        if (matrices && matrices.length > 0) {
          const saved = matrices[0];
          if (saved.columns && saved.columns.length > 0) {
            setColumns(saved.columns);
            if (saved.columns[0]) {
              setNewLogColId(saved.columns[0].id);
            }
          }
          if (saved.title) setMatrixTitle(saved.title);

          // Restore cellChecklists if available
          if (saved.cellChecklists && Object.keys(saved.cellChecklists).length > 0) {
            setCellChecklists(saved.cellChecklists);
            // Extract dates from cellChecklist keys
            const keys = Object.keys(saved.cellChecklists);
            const savedDates = Array.from(new Set(keys.map(k => k.split('__')[0]))).filter(Boolean);
            if (savedDates.length > 0) {
              setDateList(savedDates);
            }
          } else if (saved.taskItems && saved.taskItems.length > 0) {
            // Legacy conversion: convert legacy taskItems into cellChecklists
            setTaskItems(saved.taskItems);
            const converted: Record<string, DailyAgendaChecklistItem[]> = {};
            const dates = Array.from(new Set(saved.taskItems.map(t => t.plannedDate)));
            if (dates.length > 0) setDateList(dates);

            saved.taskItems.forEach(t => {
              const cellKey = `${t.plannedDate}__${t.colId}`;
              if (!converted[cellKey]) {
                converted[cellKey] = [];
              }
              converted[cellKey].push({
                id: t.id,
                title: t.title,
                completed: t.status === 'Completed'
              });
            });
            setCellChecklists(converted);
          } else {
            // Initialize default items for today
            const today = getTodayStr();
            const initMap: Record<string, DailyAgendaChecklistItem[]> = {
              [`${today}__c_regular`]: createDefaultChecklistItems()
            };
            setCellChecklists(initMap);
            setDateList([today]);
          }
        } else {
          // Initialize fresh default matrix with Image 1 checklist items
          const today = getTodayStr();
          const initMap: Record<string, DailyAgendaChecklistItem[]> = {
            [`${today}__c_regular`]: createDefaultChecklistItems()
          };
          setCellChecklists(initMap);
          setDateList([today]);
        }
      } catch (e) {
        console.error('Failed to auto-load backend matrix state:', e);
      }
    };
    loadBackendData();
  }, []);

  // Update default selected column for logger form if columns change
  useEffect(() => {
    if (columns.length > 0 && !columns.some(c => c.id === newLogColId)) {
      setNewLogColId(columns[0].id);
    }
  }, [columns, newLogColId]);

  // All Sorted Unique Dates in Chronological Order
  const sortedDates = useMemo(() => {
    const setOfDates = new Set<string>(dateList);
    Object.keys(cellChecklists).forEach(k => {
      const d = k.split('__')[0];
      if (d) setOfDates.add(d);
    });
    if (setOfDates.size === 0) {
      setOfDates.add(getTodayStr());
    }
    return Array.from(setOfDates).sort((a, b) => a.localeCompare(b));
  }, [dateList, cellChecklists]);

  // Auto-Save Matrix on ANY Change
  useEffect(() => {
    const autoSave = async () => {
      if (columns.length === 0 && Object.keys(cellChecklists).length === 0 && dateList.length === 0) return;

      const snapshotRows: DailyAgendaRow[] = sortedDates.map(dateStr => ({
        id: 'r_' + dateStr,
        date: dateStr,
        tasks: {}
      }));

      const matrixData: DailyAgendaMatrix = {
        id: 'main_daily_matrix',
        title: matrixTitle,
        columns,
        rows: snapshotRows,
        taskItems,
        cellChecklists,
        updatedAt: new Date().toISOString()
      };

      try {
        await saveDailyAgendaMatrix(matrixData);
      } catch (e) {
        console.error('Auto-save matrix error:', e);
      }
    };
    autoSave();
  }, [columns, cellChecklists, dateList, matrixTitle, sortedDates, taskItems]);

  // Get items for a given cell (Date + Column)
  const getCellItems = (dateStr: string, colId: string): DailyAgendaChecklistItem[] => {
    const cellKey = `${dateStr}__${colId}`;
    if (cellChecklists[cellKey]) {
      return cellChecklists[cellKey];
    }
    // If not initialized yet, return empty
    return [];
  };

  // Add Column Handler: automatically populates new column with default Image 1 checklist items
  const handleAddColumn = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newColumnTitle.trim()) {
      onAddToast('Please enter a Column Title (Mandatory).', 'error');
      return;
    }

    const newColId = 'col_' + Date.now();
    const newCol: DailyAgendaColumn = {
      id: newColId,
      title: newColumnTitle.trim()
    };

    // Pre-populate this new column with the default 10 checklist items for all active dates
    setCellChecklists(prev => {
      const next = { ...prev };
      sortedDates.forEach(d => {
        const cellKey = `${d}__${newColId}`;
        if (!next[cellKey]) {
          next[cellKey] = createDefaultChecklistItems();
        }
      });
      return next;
    });

    setColumns(prev => [...prev, newCol]);
    setNewColumnTitle('');
    onAddToast(`Added column "${newCol.title}" with default checklist items.`, 'success');
  };

  // Delete Column Handler
  const handleDeleteColumn = async (colId: string, colTitle: string) => {
    if (columns.length <= 1) {
      onAddToast('At least one column must remain in the matrix.', 'error');
      return;
    }
    const confirmed = await onConfirm(`Are you sure you want to delete column "${colTitle}"? All associated checklist entries will be removed.`);
    if (!confirmed) return;

    setColumns(prev => prev.filter(c => c.id !== colId));
    setCellChecklists(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (k.endsWith(`__${colId}`)) {
          delete next[k];
        }
      });
      return next;
    });
    onAddToast(`Deleted column "${colTitle}".`, 'info');
  };

  // Single Entry Point: Add Task/Checklist Item from top Logger Form
  const handleAddWorkItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetDate = newLogDate || getTodayStr();
    if (targetDate < getTodayStr()) {
      onAddToast('Please select today or a future date.', 'error');
      return;
    }

    if (!dateList.includes(targetDate)) {
      setDateList(prev => [...prev, targetDate]);
    }

    const targetCol = newLogColId || (columns[0] ? columns[0].id : 'c_regular');

    if (newLogTitle.trim()) {
      const newItem: DailyAgendaChecklistItem = {
        id: 'chk_' + Date.now(),
        title: newLogTitle.trim(),
        completed: false
      };

      setCellChecklists(prev => {
        const cellKey = `${targetDate}__${targetCol}`;
        const existing = prev[cellKey] ? [...prev[cellKey]] : createDefaultChecklistItems();
        return {
          ...prev,
          [cellKey]: [...existing, newItem]
        };
      });

      setNewLogTitle('');
      onAddToast(`Added "${newItem.title}" to ${targetDate}.`, 'success');
    } else {
      // Just ensure the date row exists with default items
      setCellChecklists(prev => {
        const next = { ...prev };
        columns.forEach(col => {
          const cellKey = `${targetDate}__${col.id}`;
          if (!next[cellKey]) {
            next[cellKey] = createDefaultChecklistItems();
          }
        });
        return next;
      });
      onAddToast(`Added date row for ${targetDate}.`, 'success');
    }
  };

  // Toggle Checkbox Done Status (Maintains completed date)
  const handleToggleItem = (dateStr: string, colId: string, itemId: string) => {
    const cellKey = `${dateStr}__${colId}`;
    const today = getTodayStr();
    setCellChecklists(prev => {
      const list = prev[cellKey] ? [...prev[cellKey]] : createDefaultChecklistItems();
      const updated = list.map((item, idx) => {
        if (item.id === itemId || `chk_def_${idx}` === itemId) {
          const nextCompleted = !item.completed;
          return { 
            ...item, 
            completed: nextCompleted,
            completedDate: nextCompleted ? (item.completedDate || today) : undefined
          };
        }
        return item;
      });
      return { ...prev, [cellKey]: updated };
    });
  };

  // Add Dynamic Checklist Option / Item inside a specific Cell or Column
  const handleAddOptionToCell = (dateStr: string, colId: string) => {
    const cellKey = `${dateStr}__${colId}`;
    const text = (newOptionInputs[cellKey] || '').trim();
    if (!text) return;

    const newItem: DailyAgendaChecklistItem = {
      id: 'chk_' + Date.now(),
      title: text,
      completed: false
    };

    setCellChecklists(prev => {
      const list = prev[cellKey] ? [...prev[cellKey]] : createDefaultChecklistItems();
      return {
        ...prev,
        [cellKey]: [...list, newItem]
      };
    });

    setNewOptionInputs(prev => ({ ...prev, [cellKey]: '' }));
    onAddToast(`Added option "${text}" with checkbox.`, 'success');
  };

  // Delete an Item from Cell
  const handleDeleteItem = (dateStr: string, colId: string, itemId: string) => {
    const cellKey = `${dateStr}__${colId}`;
    setCellChecklists(prev => {
      const list = prev[cellKey] || [];
      return {
        ...prev,
        [cellKey]: list.filter(i => i.id !== itemId)
      };
    });
  };

  // Save Inline Edited Item Title
  const handleSaveEditItem = (dateStr: string, colId: string, itemId: string) => {
    if (!editItemTitle.trim()) {
      setEditingItemKey(null);
      return;
    }
    const cellKey = `${dateStr}__${colId}`;
    setCellChecklists(prev => {
      const list = prev[cellKey] ? [...prev[cellKey]] : createDefaultChecklistItems();
      const updated = list.map((item, idx) => {
        if (item.id === itemId || `chk_def_${idx}` === itemId) {
          return { ...item, title: editItemTitle.trim() };
        }
        return item;
      });
      return {
        ...prev,
        [cellKey]: updated
      };
    });
    setEditingItemKey(null);
    setEditItemTitle('');
  };

  // Toggle All Items in Cell (Check All or Uncheck All with completedDate)
  const handleToggleAllCell = (dateStr: string, colId: string, completeAll: boolean) => {
    const cellKey = `${dateStr}__${colId}`;
    const today = getTodayStr();
    setCellChecklists(prev => {
      const list = prev[cellKey] ? [...prev[cellKey]] : createDefaultChecklistItems();
      const updated = list.map(item => ({ 
        ...item, 
        completed: completeAll,
        completedDate: completeAll ? (item.completedDate || today) : undefined
      }));
      return { ...prev, [cellKey]: updated };
    });
  };

  // Reset Cell to Default 10 Checklist Items
  const handleResetCellToDefaults = (dateStr: string, colId: string) => {
    const cellKey = `${dateStr}__${colId}`;
    setCellChecklists(prev => ({
      ...prev,
      [cellKey]: createDefaultChecklistItems()
    }));
    onAddToast('Reset cell to default checklist items.', 'info');
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Row status background color based on checklist completion
  const getDateRowStatus = (dateStr: string) => {
    const today = getTodayStr();
    const isToday = dateStr === today;
    const isPast = dateStr < today;

    let totalItems = 0;
    let completedItems = 0;

    columns.forEach(col => {
      const items = getCellItems(dateStr, col.id);
      totalItems += items.length;
      completedItems += items.filter(i => i.completed).length;
    });

    if (totalItems > 0 && completedItems === totalItems) {
      return 'green';
    }
    if (isToday || (totalItems > 0 && completedItems > 0)) {
      return 'yellow';
    }
    if (!isPast) {
      return 'blue';
    }
    return 'white';
  };

  // Status Counts for Filter Badges/Buttons
  const statusCounts = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let upcoming = 0;

    sortedDates.forEach(dateStr => {
      const status = getDateRowStatus(dateStr);
      if (status === 'green') completed++;
      else if (status === 'yellow') inProgress++;
      else upcoming++;
    });

    return {
      all: sortedDates.length,
      completed,
      inProgress,
      upcoming
    };
  }, [sortedDates, columns, cellChecklists]);

  // Format data array for ALV Grid view with Status Filtering
  const matrixALVData = useMemo(() => {
    const filteredDates = sortedDates.filter(dateStr => {
      if (statusFilter === 'ALL') return true;
      const status = getDateRowStatus(dateStr);
      if (statusFilter === 'COMPLETED') return status === 'green';
      if (statusFilter === 'IN_PROGRESS') return status === 'yellow';
      if (statusFilter === 'UPCOMING') return status === 'blue' || status === 'white';
      return true;
    });

    return filteredDates.map(dateStr => {
      const rowObj: Record<string, unknown> = {
        id: 'row_' + dateStr,
        date: dateStr,
        _statusColor: getDateRowStatus(dateStr)
      };

      columns.forEach(col => {
        const cellKey = `${dateStr}__${col.id}`;
        // Ensure cell has items or initialize defaults
        const items = cellChecklists[cellKey] || createDefaultChecklistItems();
        rowObj[col.id] = items;
      });

      return rowObj;
    });
  }, [sortedDates, columns, cellChecklists, statusFilter]);

  // Construct dynamic ALV Grid columns
  const matrixALVColumns: ALVColumn[] = useMemo(() => {
    const cols: ALVColumn[] = [
      {
        key: 'date',
        label: 'Date',
        width: '140px',
        sortable: true,
        align: 'center',
        render: (_val, row) => {
          const dateStr = String(row.date);
          const isToday = dateStr === getTodayStr();
          const isEditingDate = editingDateRow === dateStr;

          if (isEditingDate) {
            return (
              <div className="w-full p-1 bg-white border rounded">
                <input 
                  type="date"
                  className="form-control"
                  style={{ fontSize: '0.75rem', padding: '2px 4px', width: '100%' }}
                  value={editDateValue}
                  min={getTodayStr()}
                  onChange={e => {
                    const val = e.target.value;
                    setEditDateValue(val);
                    if (val && val >= getTodayStr()) {
                      setDateList(prev => prev.map(d => d === dateStr ? val : d));
                      // Rename all keys for this date in cellChecklists
                      setCellChecklists(prev => {
                        const next: Record<string, DailyAgendaChecklistItem[]> = {};
                        Object.entries(prev).forEach(([k, v]) => {
                          if (k.startsWith(`${dateStr}__`)) {
                            const rest = k.replace(`${dateStr}__`, '');
                            next[`${val}__${rest}`] = v;
                          } else {
                            next[k] = v;
                          }
                        });
                        return next;
                      });
                    }
                  }}
                  onBlur={() => setEditingDateRow(null)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === 'Escape') setEditingDateRow(null);
                  }}
                  autoFocus
                />
              </div>
            );
          }

          return (
            <div 
              className="flex flex-column align-center gap-0.5 p-1" 
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setEditingDateRow(dateStr);
                setEditDateValue(dateStr);
              }}
              title="Click to edit date row"
            >
              <span className="font-bold text-primary" style={{ fontSize: '0.88rem' }}>{dateStr}</span>
              {isToday ? (
                <span className="badge" style={{ backgroundColor: '#16a34a', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', fontWeight: 'bold', borderRadius: '4px' }}>
                  TODAY
                </span>
              ) : (
                <span className="badge" style={{ backgroundColor: '#0284c7', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', fontWeight: 'bold', borderRadius: '4px' }}>
                  UPCOMING
                </span>
              )}
            </div>
          );
        }
      }
    ];

    // Add dynamic columns with Image 1 style checklist card
    columns.forEach(col => {
      cols.push({
        key: col.id,
        label: col.title,
        sortable: false,
        render: (_val, row) => {
          const dateStr = String(row.date);
          const cellKey = `${dateStr}__${col.id}`;
          const items = cellChecklists[cellKey] || createDefaultChecklistItems();
          const completedCount = items.filter(i => i.completed).length;
          const totalCount = items.length;
          const isAllDone = totalCount > 0 && completedCount === totalCount;
          const currentOptionInput = newOptionInputs[cellKey] || '';

          return (
            <div 
              className="daily-agenda-cell-card"
              style={{
                backgroundColor: '#ffffff',
                border: isAllDone ? '1.5px solid #86efac' : '1.5px solid #cbd5e1',
                borderRadius: '6px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                margin: '4px 0',
                minWidth: '280px'
              }}
            >
              {/* Checklist Header matching Image 1 styling */}
              <div 
                className="flex justify-between align-center px-2 py-1.5"
                style={{
                  backgroundColor: isAllDone ? '#dcfce7' : '#e0ecf8',
                  borderBottom: '1px solid #cbd5e1'
                }}
              >
                <div className="flex align-center gap-1">
                  <ListChecks size={15} style={{ color: isAllDone ? '#166534' : '#1e40af' }} />
                  <span 
                    className="font-bold text-xs" 
                    style={{ color: isAllDone ? '#166534' : '#1e3a8a', letterSpacing: '0.2px' }}
                  >
                    {col.title} Checklist
                  </span>
                </div>

                <div className="flex align-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleAllCell(dateStr, col.id, false);
                    }}
                    className="btn btn-ghost btn-xs p-0 text-muted"
                    style={{ fontSize: '0.65rem', padding: '1px 5px', color: '#475569', textDecoration: 'none', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.6)' }}
                    title="Uncheck all items in this cell"
                  >
                    Uncheck All
                  </button>

                  <span 
                    className="badge font-bold"
                    style={{
                      fontSize: '0.68rem',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      backgroundColor: isAllDone ? '#16a34a' : (completedCount > 0 ? '#eab308' : '#64748b'),
                      color: '#ffffff'
                    }}
                  >
                    {completedCount} / {totalCount} Done
                  </span>

                  {columns.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteColumn(col.id, col.title);
                      }}
                      className="btn btn-ghost btn-xs text-danger p-0"
                      title={`Delete column "${col.title}"`}
                      style={{ height: '18px', width: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>

              {/* Checklist Items List (Exact visual format of Image 1) */}
              <div className="checklist-items-table" style={{ maxHeight: '340px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.7rem', color: '#64748b' }}>
                      <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 600 }}>Task / Checklist Item</th>
                      <th style={{ textAlign: 'center', width: '45px', padding: '4px 8px', fontWeight: 600 }}>Done</th>
                      <th style={{ width: '45px', padding: '4px 2px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const itemKey = `${dateStr}__${col.id}__${item.id}`;
                      const isEditing = editingItemKey === itemKey;

                      return (
                        <tr 
                          key={item.id}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: isEditing ? '#eff6ff' : (item.completed ? '#f0fdf4' : '#ffffff'),
                            transition: 'background-color 0.15s ease'
                          }}
                        >
                          {/* Item Title or Inline Editor */}
                          {isEditing ? (
                            <td colSpan={2} style={{ padding: '4px 6px' }} onClick={e => e.stopPropagation()}>
                              <div className="flex align-center gap-1">
                                <input 
                                  type="text"
                                  className="form-control font-bold"
                                  style={{ fontSize: '0.8rem', padding: '3px 7px', height: '28px', width: '100%', borderColor: '#0284c7', backgroundColor: '#ffffff' }}
                                  value={editItemTitle}
                                  onChange={e => setEditItemTitle(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSaveEditItem(dateStr, col.id, item.id);
                                    }
                                    if (e.key === 'Escape') setEditingItemKey(null);
                                  }}
                                  autoFocus
                                  onFocus={e => e.target.select()}
                                />
                                <button 
                                  type="button"
                                  className="btn btn-primary btn-xs flex align-center justify-center"
                                  style={{ padding: '3px 8px', height: '28px', backgroundColor: '#16a34a', borderColor: '#16a34a' }}
                                  onClick={() => handleSaveEditItem(dateStr, col.id, item.id)}
                                  title="Save Changes"
                                >
                                  <Check size={13} />
                                </button>
                                <button 
                                  type="button"
                                  className="btn btn-outline btn-xs flex align-center justify-center"
                                  style={{ padding: '3px 8px', height: '28px' }}
                                  onClick={() => setEditingItemKey(null)}
                                  title="Cancel"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            </td>
                          ) : (
                            <>
                              {/* Title - Direct Click on Text to Edit */}
                              <td 
                                style={{ padding: '6px 8px', fontSize: '0.8rem', verticalAlign: 'middle', cursor: 'text' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingItemKey(itemKey);
                                  setEditItemTitle(item.title);
                                }}
                                title="Click text to edit description"
                              >
                                <div 
                                  style={{
                                    color: item.completed ? '#166534' : '#1e293b',
                                    fontWeight: item.completed ? 600 : 500,
                                    userSelect: 'none',
                                    cursor: 'text',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    flexWrap: 'wrap'
                                  }}
                                >
                                  <span>{item.title}</span>
                                  {item.completed && item.completedDate && (
                                    <span 
                                      className="badge" 
                                      style={{
                                        fontSize: '0.62rem',
                                        padding: '1px 5px',
                                        backgroundColor: '#dcfce7',
                                        color: '#166534',
                                        border: '1px solid #86efac',
                                        borderRadius: '3px',
                                        fontWeight: 600
                                      }}
                                      title={`Task completed on ${item.completedDate}`}
                                    >
                                      Done on {item.completedDate}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Checkbox Column matching Image 1 */}
                              <td 
                                style={{ textAlign: 'center', verticalAlign: 'middle', padding: '4px 6px', cursor: 'pointer' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleItem(dateStr, col.id, item.id);
                                }}
                              >
                                <div
                                  style={{
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '2px',
                                    userSelect: 'none'
                                  }}
                                  title={item.completed ? 'Mark as Undone' : 'Mark as Done'}
                                >
                                  {item.completed ? (
                                    <div 
                                      style={{
                                        width: '18px',
                                        height: '18px',
                                        backgroundColor: '#000000',
                                        borderRadius: '2px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#ffffff'
                                      }}
                                    >
                                      <Check size={13} strokeWidth={3.5} />
                                    </div>
                                  ) : (
                                    <div 
                                      style={{
                                        width: '18px',
                                        height: '18px',
                                        border: '2px solid #334155',
                                        borderRadius: '2px',
                                        backgroundColor: '#ffffff'
                                      }}
                                    />
                                  )}
                                </div>
                              </td>
                            </>
                          )}

                          {/* Action Buttons (Edit & Delete) */}
                          <td 
                            style={{ textAlign: 'center', verticalAlign: 'middle', padding: '4px 2px' }}
                            onClick={e => e.stopPropagation()}
                          >
                            <div className="flex align-center gap-0.5 justify-center">
                              {!isEditing && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingItemKey(itemKey);
                                    setEditItemTitle(item.title);
                                  }}
                                  className="btn btn-ghost btn-xs p-0 text-muted"
                                  style={{ height: '20px', width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  title="Edit item title"
                                >
                                  <Edit2 size={12} />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteItem(dateStr, col.id, item.id);
                                }}
                                className="btn btn-ghost btn-xs p-0 text-danger"
                                style={{ height: '20px', width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Remove item"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {items.length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', padding: '12px', color: '#94a3b8', fontSize: '0.75rem' }}>
                          No checklist items yet.
                          <div className="mt-1">
                            <button
                              type="button"
                              onClick={() => handleResetCellToDefaults(dateStr, col.id)}
                              className="btn btn-outline btn-xs"
                              style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                            >
                              Load Default 10 Checklist Items
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Dynamic Add Option / Item Form with Checkbox (Prompt Requirement) */}
              <div 
                className="p-1.5" 
                style={{ 
                  backgroundColor: '#f8fafc', 
                  borderTop: '1px solid #e2e8f0' 
                }}
              >
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddOptionToCell(dateStr, col.id);
                  }}
                  className="flex align-center gap-1"
                >
                  <input 
                    type="text"
                    className="form-control"
                    style={{ fontSize: '0.74rem', padding: '3px 7px', height: '26px' }}
                    placeholder="+ Add checklist option / task..."
                    value={currentOptionInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewOptionInputs(prev => ({ ...prev, [cellKey]: val }));
                    }}
                  />
                  <button 
                    type="submit"
                    className="btn btn-primary btn-xs flex align-center gap-0.5"
                    style={{ fontSize: '0.72rem', padding: '3px 8px', height: '26px', whiteSpace: 'nowrap', backgroundColor: '#0284c7', borderColor: '#0284c7' }}
                    title="Add new option with checkbox to this column"
                  >
                    <Plus size={12} /> Add
                  </button>
                </form>
              </div>
            </div>
          );
        }
      });
    });

    return cols;
  }, [columns, sortedDates, cellChecklists, editingItemKey, editItemTitle, editingDateRow, editDateValue, newOptionInputs]);

  return (
    <div className="daily-agenda-matrix-container">
      {/* Top Header Bar */}
      <div className="admin-card mb-3">
        <div className="flex justify-between align-center flex-wrap gap-2">
          <div>
            <h2 className="border-bottom-title mb-0.5 flex align-center gap-1">
              <Calendar size={22} className="text-secondary" />
              Daily Construction Follow-up Matrix
            </h2>
            <p className="text-xs text-muted">
              Real-time Project & Date-wise Follow-up Work Item Tracker with Interactive Checklists
            </p>
          </div>

          <div className="flex align-center gap-1 flex-wrap">
            {/* Single Column Input & Button - Adds column with default checklist items */}
            <form onSubmit={handleAddColumn} className="flex align-center gap-0.5" style={{ backgroundColor: '#f1f5f9', padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
              <input 
                type="text"
                className="form-control"
                style={{ width: '200px', padding: '3px 8px', fontSize: '0.8rem' }}
                placeholder="Enter Column Title *"
                value={newColumnTitle}
                onChange={e => setNewColumnTitle(e.target.value)}
                required
              />
              <button 
                type="submit"
                className="btn btn-secondary btn-xs flex align-center gap-0.5"
                style={{ fontSize: '0.78rem', padding: '4px 9px', whiteSpace: 'nowrap' }}
                title="Add column to matrix (includes default checklist items)"
              >
                <Plus size={13} /> Add Column
              </button>
            </form>

            <button onClick={handlePrint} className="btn btn-outline btn-sm flex align-center gap-0.5">
              <Printer size={14} /> Print Report
            </button>
          </div>
        </div>

        {/* Smart Work Item / Task Logger Form */}
        <form onSubmit={handleAddWorkItem} className="mt-3 p-3 rounded border" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
          <div className="font-bold text-xs mb-2 flex align-center gap-1" style={{ color: '#166534' }}>
            <Plus size={16} /> Log Follow-up Work Item
          </div>

          <div className="grid grid-3 gap-2 mobile-stack align-center">
            <div>
              <label className="form-label font-bold text-xs">Target Planned Date (Today & Future Only) *</label>
              <input 
                type="date" 
                className="form-control" 
                value={newLogDate}
                min={getTodayStr()}
                onChange={e => setNewLogDate(e.target.value)}
                required
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label className="form-label font-bold text-xs">Work Item / Task Description *</label>
              <div className="flex gap-1">
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Electrical power Connection, JCB Earthwork, Steel Rod Bending..."
                  value={newLogTitle}
                  onChange={e => setNewLogTitle(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-primary btn-sm flex align-center gap-0.5" style={{ backgroundColor: '#15803d', borderColor: '#15803d', whiteSpace: 'nowrap' }}>
                  <Plus size={14} /> Add Task
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Interactive Status Filter Buttons matching image */}
        <div className="flex justify-between align-center mt-3 p-2.5 rounded border flex-wrap gap-2" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
          <div className="flex align-center gap-2 text-xs flex-wrap">
            <span className="font-bold text-muted mr-1">Status Legend:</span>
            
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className="btn btn-xs"
              style={{
                backgroundColor: statusFilter === 'ALL' ? '#334155' : '#ffffff',
                color: statusFilter === 'ALL' ? '#ffffff' : '#334155',
                border: '1px solid #cbd5e1',
                padding: '4px 10px',
                borderRadius: '5px',
                fontWeight: statusFilter === 'ALL' ? 700 : 600,
                cursor: 'pointer',
                boxShadow: statusFilter === 'ALL' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
              title="Show all date rows"
            >
              ALL ({statusCounts.all})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('COMPLETED')}
              className="btn btn-xs"
              style={{
                backgroundColor: statusFilter === 'COMPLETED' ? '#84cc16' : '#ecfccb',
                color: statusFilter === 'COMPLETED' ? '#ffffff' : '#3f6212',
                border: statusFilter === 'COMPLETED' ? '1px solid #65a30d' : '1px solid #bef264',
                padding: '4px 10px',
                borderRadius: '5px',
                fontWeight: statusFilter === 'COMPLETED' ? 700 : 600,
                cursor: 'pointer',
                boxShadow: statusFilter === 'COMPLETED' ? '0 1px 4px rgba(132, 204, 22, 0.4)' : 'none',
                transition: 'all 0.15s ease'
              }}
              title="Show only rows where all checklist items are completed"
            >
              ALL COMPLETED ({statusCounts.completed})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('IN_PROGRESS')}
              className="btn btn-xs"
              style={{
                backgroundColor: statusFilter === 'IN_PROGRESS' ? '#eab308' : '#fef9c3',
                color: statusFilter === 'IN_PROGRESS' ? '#ffffff' : '#854d0e',
                border: statusFilter === 'IN_PROGRESS' ? '1px solid #ca8a04' : '1px solid #fde047',
                padding: '4px 10px',
                borderRadius: '5px',
                fontWeight: statusFilter === 'IN_PROGRESS' ? 700 : 600,
                cursor: 'pointer',
                boxShadow: statusFilter === 'IN_PROGRESS' ? '0 1px 4px rgba(234, 179, 8, 0.4)' : 'none',
                transition: 'all 0.15s ease'
              }}
              title="Show rows in progress or scheduled for today"
            >
              IN PROGRESS / TODAY ({statusCounts.inProgress})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('UPCOMING')}
              className="btn btn-xs"
              style={{
                backgroundColor: statusFilter === 'UPCOMING' ? '#0ea5e9' : '#e0f2fe',
                color: statusFilter === 'UPCOMING' ? '#ffffff' : '#0369a1',
                border: statusFilter === 'UPCOMING' ? '1px solid #0284c7' : '1px solid #7dd3fc',
                padding: '4px 10px',
                borderRadius: '5px',
                fontWeight: statusFilter === 'UPCOMING' ? 700 : 600,
                cursor: 'pointer',
                boxShadow: statusFilter === 'UPCOMING' ? '0 1px 4px rgba(14, 165, 233, 0.4)' : 'none',
                transition: 'all 0.15s ease'
              }}
              title="Show upcoming scheduled dates"
            >
              UPCOMING ({statusCounts.upcoming})
            </button>
          </div>

          <div className="text-xs text-muted">
            Tip: Click a status button above to filter rows. When items are checked, their completion date is recorded.
          </div>
        </div>
      </div>

      {/* Main ALV Grid Layout for Master Construction Follow-up Matrix */}
      <div className="admin-card p-0 mb-4" style={{ border: '2px solid #0070c0', borderRadius: '6px', overflow: 'hidden' }}>
        <ALVGrid 
          title={matrixTitle}
          subtitle="Project-wise & Date-wise Follow-up Tracker with Interactive Checklists (SAP ALV Grid View)"
          columns={matrixALVColumns}
          data={matrixALVData}
          pageSize={10}
          searchPlaceholder="Search follow-up tasks or dates across all projects..."
          selectable={false}
          onExport={(rowsToExport) => {
            const dataToExport = rowsToExport || matrixALVData;
            const headers = ['Date', ...columns.map(c => c.title)];
            const csvRows = [headers.join(',')];

            dataToExport.forEach(r => {
              const rowDate = String(r.date);
              const colValues = columns.map(c => {
                const cellKey = `${rowDate}__${c.id}`;
                const items = cellChecklists[cellKey] || [];
                const text = items.map(i => `[${i.completed ? 'DONE' : 'PENDING'}] ${i.title}`).join('; ');
                return `"${text.replace(/"/g, '""')}"`;
              });
              csvRows.push([`"${rowDate}"`, ...colValues].join(','));
            });

            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `${matrixTitle.replace(/\s+/g, '_')}_${getTodayStr()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            onAddToast('Exported matrix to CSV file.', 'success');
          }}
        />
      </div>
    </div>
  );
};

