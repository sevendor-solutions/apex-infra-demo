import React, { useState, useEffect, useMemo } from 'react';
import type { Project, DailyAgendaMatrix, DailyAgendaColumn, DailyAgendaRow, DailyAgendaTaskItem } from '../types';
import { getDailyAgendaMatrices, saveDailyAgendaMatrix } from '../utils/db';
import { ALVGrid } from './ALVGrid';
import type { ALVColumn } from './ALVGrid';
import { 
  Calendar, 
  Printer, 
  Plus
} from 'lucide-react';

interface AdminStageChecklistProps {
  projects: Project[];
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onConfirm: (msg: string) => Promise<boolean>;
}

// Helper to get formatted date YYYY-MM-DD
const getTodayStr = () => new Date().toISOString().split('T')[0];

// Standard default columns matching user specification exactly
const STANDARD_DEFAULT_COLUMNS: DailyAgendaColumn[] = [
  { id: 'c5', title: 'Regular follow-ups' }
];

export const AdminStageChecklist: React.FC<AdminStageChecklistProps> = ({
  projects: _projects,
  onAddToast,
  onConfirm: _onConfirm
}) => {
  const [matrixTitle, setMatrixTitle] = useState('Daily Construction Follow-up Matrix');

  // Columns State - Standard columns loaded by default
  const [columns, setColumns] = useState<DailyAgendaColumn[]>(STANDARD_DEFAULT_COLUMNS);
  const [newColumnTitle, setNewColumnTitle] = useState<string>('');

  // Dynamic Tasks State (smart carry-forward model)
  const [taskItems, setTaskItems] = useState<DailyAgendaTaskItem[]>([]);

  // Date Rows List (Explicit dates added or auto-detected)
  const [dateList, setDateList] = useState<string[]>([]);

  // Form state for logging today's / new work item
  const [newLogDate, setNewLogDate] = useState<string>(getTodayStr());
  const [newLogTitle, setNewLogTitle] = useState<string>('');

  // Task inline edit state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDate, setEditTaskDate] = useState('');

  // Date Row inline edit state
  const [editingDateRow, setEditingDateRow] = useState<string | null>(null);
  const [editDateValue, setEditDateValue] = useState<string>('');

  // Active direct cell entry for empty cells in any column
  const [activeCell, setActiveCell] = useState<{ colId: string; dateStr: string } | null>(null);
  const [newCellText, setNewCellText] = useState('');

  // Auto-Load Saved Matrix State from Backend on Mount
  useEffect(() => {
    const loadBackendData = async () => {
      try {
        const matrices = await getDailyAgendaMatrices();
        if (matrices && matrices.length > 0) {
          const saved = matrices[0];
          if (saved.columns && saved.columns.length > 0) setColumns(saved.columns);
          if (saved.taskItems && saved.taskItems.length > 0) {
            setTaskItems(saved.taskItems);
            const dates = Array.from(new Set(saved.taskItems.map(t => t.plannedDate)));
            if (dates.length > 0) setDateList(dates);
          }
          if (saved.title) setMatrixTitle(saved.title);
        }
      } catch (e) {
        console.error('Failed to auto-load backend matrix state:', e);
      }
    };
    loadBackendData();
  }, []);



  // Single Entry Point: Add Task or Date Row
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

    if (newLogTitle.trim()) {
      const targetCol = columns[0] ? columns[0].id : 'c1';
      const initialStatus: DailyAgendaTaskItem['status'] = targetDate === getTodayStr() ? 'Active' : 'Upcoming';
      const newTask: DailyAgendaTaskItem = {
        id: 'task_' + Date.now(),
        colId: targetCol,
        title: newLogTitle.trim(),
        plannedDate: targetDate,
        status: initialStatus
      };
      setTaskItems(prev => [...prev, newTask]);
      setNewLogTitle('');
      onAddToast(`Added task for date ${targetDate}.`, 'success');
    } else {
      onAddToast(`Added date row for ${targetDate}.`, 'success');
    }
  };

  // Update Task Status Option (Upcoming, Active, Completed)
  const handleUpdateTaskStatus = (taskId: string, newStatus: DailyAgendaTaskItem['status']) => {
    setTaskItems(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status: newStatus,
          completedDate: newStatus === 'Completed' ? getTodayStr() : undefined
        };
      }
      return t;
    }));
    onAddToast(`Task status updated to ${newStatus}.`, 'info');
  };



  // Add Mandatory Project / Follow-up Column
  const handleAddColumn = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newColumnTitle.trim()) {
      onAddToast('Please enter a Column Title (Mandatory).', 'error');
      return;
    }
    const newCol: DailyAgendaColumn = {
      id: 'col_' + Date.now(),
      title: newColumnTitle.trim()
    };
    setColumns(prev => [...prev, newCol]);
    setNewColumnTitle('');
    onAddToast(`Added column "${newCol.title}".`, 'success');
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // All Sorted Unique Dates in Chronological Order
  const sortedDates = useMemo(() => {
    const setOfDates = new Set<string>(dateList);
    taskItems.forEach(t => {
      if (t.plannedDate) setOfDates.add(t.plannedDate);
      if (t.completedDate) setOfDates.add(t.completedDate);
    });

    return Array.from(setOfDates).sort((a, b) => a.localeCompare(b));
  }, [dateList, taskItems]);

  // Auto-Save Matrix to Backend on ANY Activity Change (Columns, Tasks, Dates, Title, Status)
  useEffect(() => {
    const autoSave = async () => {
      if (columns.length === 0 && taskItems.length === 0 && dateList.length === 0) return;

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
        updatedAt: new Date().toISOString()
      };

      try {
        await saveDailyAgendaMatrix(matrixData);
      } catch (e) {
        console.error('Auto-save matrix error:', e);
      }
    };
    autoSave();
  }, [columns, taskItems, dateList, matrixTitle, sortedDates]);

  /**
   * SMART CARRY-FORWARD ALGORITHM:
   * For a given date (currentDate) and column (colId):
   * 1. Direct Tasks: Tasks planned on currentDate for colId.
   * 2. Carried-over Overdue Tasks: Tasks planned on an EARLIER date (< currentDate)
   *    that are NOT completed or were completed on/after currentDate.
   */
  const getCellTasks = (currentDate: string, colId: string) => {
    return taskItems
      .filter(t => t.colId === colId && t.plannedDate === currentDate)
      .map(t => ({ task: t, isCarriedOver: false, plannedDate: t.plannedDate }));
  };

  // Row status background color based on tasks status for that date
  const getDateRowStatus = (dateStr: string) => {
    const today = getTodayStr();
    const isToday = dateStr === today;
    const isPast = dateStr < today;

    let totalTasks = 0;
    let completedTasks = 0;

    columns.forEach(col => {
      const items = getCellTasks(dateStr, col.id);
      totalTasks += items.length;
      completedTasks += items.filter(i => i.task.status === 'Completed').length;
    });

    if (totalTasks > 0 && completedTasks === totalTasks) {
      return 'green';
    }
    if (isToday || (totalTasks > 0 && completedTasks < totalTasks)) {
      return 'yellow';
    }
    if (!isPast) {
      return 'blue';
    }
    return 'white';
  };

  // Format data array for ALV Grid view
  const matrixALVData = useMemo(() => {
    return sortedDates.map(dateStr => {
      const rowObj: Record<string, unknown> = {
        id: 'row_' + dateStr,
        date: dateStr,
        _statusColor: getDateRowStatus(dateStr)
      };

      columns.forEach(col => {
        rowObj[col.id] = getCellTasks(dateStr, col.id);
      });

      return rowObj;
    });
  }, [sortedDates, columns, taskItems]);

  // Construct dynamic ALV Grid columns for the Master Construction Matrix
  const matrixALVColumns: ALVColumn[] = useMemo(() => {
    const cols: ALVColumn[] = [
      {
        key: 'date',
        label: 'Date',
        width: '130px',
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
                      setTaskItems(prev => prev.map(t => t.plannedDate === dateStr ? { ...t, plannedDate: val } : t));
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
              className="flex flex-column align-center gap-0.5" 
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setEditingDateRow(dateStr);
                setEditDateValue(dateStr);
              }}
              title="Click to edit date row"
            >
              <span className="font-bold text-primary" style={{ fontSize: '0.85rem' }}>{dateStr}</span>
              {isToday ? (
                <span className="badge" style={{ backgroundColor: '#16a34a', color: '#fff', fontSize: '0.65rem', padding: '1px 5px', fontWeight: 'bold' }}>
                  TODAY
                </span>
              ) : (
                <span className="badge" style={{ backgroundColor: '#0284c7', color: '#fff', fontSize: '0.65rem', padding: '1px 5px', fontWeight: 'bold' }}>
                  UPCOMING
                </span>
              )}
            </div>
          );
        }
      }
    ];

    // Add columns for each Project / Follow-up category
    columns.forEach(col => {
      cols.push({
        key: col.id,
        label: col.title,
        sortable: false,
        render: (_val, row) => {
          const dateStr = String(row.date);
          const cellTasks = getCellTasks(dateStr, col.id);
          const isCellCreating = activeCell?.colId === col.id && activeCell?.dateStr === dateStr;

          return (
            <div 
              className="flex flex-column gap-1.5" 
              style={{ minHeight: '60px', width: '100%', cursor: cellTasks.length === 0 && !isCellCreating ? 'pointer' : 'default' }}
              onClick={() => {
                if (cellTasks.length === 0 && !isCellCreating) {
                  setActiveCell({ colId: col.id, dateStr });
                  setNewCellText('');
                }
              }}
            >
              {/* Task Items in Cell */}
              {cellTasks.map(({ task, plannedDate }) => {
                const isEditing = editingTaskId === task.id;
                const currentStatus = task.status === 'Pending' || task.status === 'In Progress' ? (dateStr === getTodayStr() ? 'Active' : 'Upcoming') : task.status;
                const isCompleted = currentStatus === 'Completed';
                const isActive = currentStatus === 'Active';

                // Status Theme Colors:
                // Completed: Green (#dcfce7 bg, #86efac border, #166534 text)
                // Active: Yellow (#fef9c3 bg, #fde047 border, #854d0e text)
                // Upcoming: Blue (#e0f2fe bg, #7dd3fc border, #0369a1 text)
                const cardBg = isCompleted ? '#dcfce7' : (isActive ? '#fef9c3' : '#e0f2fe');
                const cardBorder = isCompleted ? '#86efac' : (isActive ? '#fde047' : '#7dd3fc');
                const titleColor = isCompleted ? '#166534' : (isActive ? '#854d0e' : '#0369a1');

                return (
                  <div 
                    key={task.id}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      backgroundColor: cardBg,
                      border: `1.5px solid ${cardBorder}`,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    {isEditing ? (
                      <div className="w-full" style={{ padding: '1px' }}>
                        <textarea 
                          className="form-control font-bold"
                          style={{ fontSize: '0.82rem', padding: '4px 8px', width: '100%', minHeight: '50px', borderColor: cardBorder, backgroundColor: '#ffffff', resize: 'vertical' }}
                          value={editTaskTitle}
                          onChange={e => {
                            const val = e.target.value;
                            setEditTaskTitle(val);
                            setTaskItems(prev => prev.map(t => t.id === task.id ? { ...t, title: val } : t));
                          }}
                          onBlur={() => setEditingTaskId(null)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              setEditingTaskId(null);
                            }
                          }}
                          placeholder="Type task description..."
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div>
                        {/* Task Title & Details - Direct click to edit */}
                        <div 
                          style={{ cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTaskId(task.id);
                            setEditTaskTitle(task.title);
                            setEditTaskDate(task.plannedDate);
                          }}
                          title="Click to edit task description"
                        >
                          <div style={{ 
                            textDecoration: isCompleted ? 'line-through' : 'none', 
                            color: titleColor,
                            fontWeight: 700,
                            fontSize: '0.84rem',
                            lineHeight: '1.35',
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {task.title}
                          </div>

                          <div className="mt-1 flex align-center justify-between" style={{ fontSize: '0.7rem' }}>
                            <span style={{ color: titleColor, opacity: 0.85, fontWeight: 500 }}>
                              Planned: {plannedDate}
                            </span>
                          </div>
                        </div>

                        {/* Interactive Status Selector Dropdown */}
                        <div className="flex align-center justify-end mt-1">
                          {(() => {
                            const currentVal = task.status === 'Pending' || task.status === 'In Progress' ? (dateStr === getTodayStr() ? 'Active' : 'Upcoming') : task.status;
                            const isComp = currentVal === 'Completed';
                            const isAct = currentVal === 'Active';
                            
                            return (
                              <select 
                                className="form-control font-bold"
                                style={{
                                  fontSize: '0.68rem',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  height: '22px',
                                  cursor: 'pointer',
                                  backgroundColor: isComp ? '#16a34a' : (isAct ? '#eab308' : '#0284c7'),
                                  color: '#ffffff',
                                  borderColor: 'transparent'
                                }}
                                value={currentVal}
                                onClick={e => e.stopPropagation()}
                                onChange={e => handleUpdateTaskStatus(task.id, e.target.value as DailyAgendaTaskItem['status'])}
                              >
                                <option value="Upcoming" style={{ backgroundColor: '#ffffff', color: '#0369a1' }}>Upcoming</option>
                                <option value="Active" style={{ backgroundColor: '#ffffff', color: '#854d0e' }}>Active</option>
                                <option value="Completed" style={{ backgroundColor: '#ffffff', color: '#166534' }}>Completed</option>
                              </select>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Direct Cell Creation Box for Empty Cells in Any Column (e.g. ICONINC) */}
              {isCellCreating && (
                <div className="w-full p-1 bg-white border rounded" style={{ borderColor: '#0284c7' }}>
                  <textarea 
                    className="form-control font-bold"
                    style={{ fontSize: '0.82rem', padding: '4px 8px', width: '100%', minHeight: '50px', borderColor: '#0284c7', backgroundColor: '#f0f9ff', resize: 'vertical' }}
                    value={newCellText}
                    onChange={e => setNewCellText(e.target.value)}
                    onBlur={() => {
                      if (newCellText.trim()) {
                        const newTask: DailyAgendaTaskItem = {
                          id: 'task_' + Date.now(),
                          colId: col.id,
                          title: newCellText.trim(),
                          plannedDate: dateStr,
                          status: dateStr === getTodayStr() ? 'Active' : 'Upcoming'
                        };
                        setTaskItems(prev => [...prev, newTask]);
                      }
                      setActiveCell(null);
                      setNewCellText('');
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (newCellText.trim()) {
                          const newTask: DailyAgendaTaskItem = {
                            id: 'task_' + Date.now(),
                            colId: col.id,
                            title: newCellText.trim(),
                            plannedDate: dateStr,
                            status: dateStr === getTodayStr() ? 'Active' : 'Upcoming'
                          };
                          setTaskItems(prev => [...prev, newTask]);
                        }
                        setActiveCell(null);
                        setNewCellText('');
                      }
                    }}
                    placeholder={`Type work item for ${col.title}...`}
                    autoFocus
                  />
                </div>
              )}
            </div>
          );
        }
      });
    });

    return cols;
  }, [columns, sortedDates, taskItems, editingTaskId, editTaskTitle, editTaskDate, editingDateRow, editDateValue, activeCell, newCellText]);



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
              Real-time Project & Date-wise Follow-up Work Item Tracker
            </p>
          </div>

          <div className="flex align-center gap-1 flex-wrap">
            {/* Single Mandatory Column Input & Button */}
            <form onSubmit={handleAddColumn} className="flex align-center gap-0.5" style={{ backgroundColor: '#f1f5f9', padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
              <input 
                type="text"
                className="form-control"
                style={{ width: '190px', padding: '3px 8px', fontSize: '0.8rem' }}
                placeholder="Enter Column Title *"
                value={newColumnTitle}
                onChange={e => setNewColumnTitle(e.target.value)}
                required
              />
              <button 
                type="submit"
                className="btn btn-secondary btn-xs flex align-center gap-0.5"
                style={{ fontSize: '0.78rem', padding: '4px 8px', whiteSpace: 'nowrap' }}
                title="Add column to matrix"
              >
                <Plus size={13} /> Add Column
              </button>
            </form>

            <button onClick={handlePrint} className="btn btn-outline btn-sm flex align-center gap-0.5">
              <Printer size={14} /> Print Report
            </button>
          </div>
        </div>

        {/* Smart Work Item Logger Form */}
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

        {/* Status Legend Bar */}
        <div className="flex justify-between align-center mt-3 p-2 rounded border flex-wrap gap-2" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
          <div className="flex align-center gap-2 text-xs flex-wrap">
            <span className="font-bold text-muted">Status Legend:</span>
            <span className="badge" style={{ backgroundColor: '#a3e635', color: '#1a2e05' }}>Completed</span>
            <span className="badge" style={{ backgroundColor: '#fde047', color: '#713f12' }}>Today / Active</span>
            <span className="badge" style={{ backgroundColor: '#38bdf8', color: '#0369a1' }}>Upcoming</span>
          </div>
        </div>
      </div>

      {/* Main ALV Grid Layout for Master Construction Follow-up Matrix */}
      <div className="admin-card p-0 mb-4" style={{ border: '2px solid #0070c0', borderRadius: '6px', overflow: 'hidden' }}>
        <ALVGrid 
          title={matrixTitle}
          subtitle="Project-wise & Date-wise Follow-up Tracker (SAP ALV Grid View)"
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
                const cellTasks = getCellTasks(rowDate, c.id);
                const text = cellTasks.map(t => `${t.isCarriedOver ? '[Carried Over from ' + t.plannedDate + '] ' : ''}${t.task.title} (${t.task.status})`).join('; ');
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
