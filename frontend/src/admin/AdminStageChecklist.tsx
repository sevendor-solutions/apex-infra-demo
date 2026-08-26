import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { 
  Project, 
  DailyAgendaMatrix, 
  DailyAgendaColumn, 
  DailyAgendaRow, 
  DailyAgendaChecklistItem, 
  DailyAgendaChecklistItemHistory, 
  DailyAgendaTaskItem 
} from '../types';
import { getDailyAgendaMatrices, saveDailyAgendaMatrix, getSessionUser } from '../utils/db';
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
  ListChecks, 
  User as UserIcon, 
  Clock, 
  Sparkles,
  History,
  Lock,
  Save
} from 'lucide-react';

interface AdminStageChecklistProps {
  projects: Project[];
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onConfirm: (msg: string) => Promise<boolean>;
}

// Timezone-Safe helper to get formatted date YYYY-MM-DD
const getTodayStr = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Timezone-Safe helper to get tomorrow date string YYYY-MM-DD
const getTomorrowStr = (baseDateStr?: string): string => {
  let target = new Date();
  if (baseDateStr) {
    const parts = baseDateStr.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      target = new Date(parts[0], parts[1] - 1, parts[2]);
    }
  }
  target.setDate(target.getDate() + 1);
  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, '0');
  const d = String(target.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Helper to get current logged in username
const getCurrentUserIdentifier = (): string => {
  try {
    const user = getSessionUser();
    return user?.name || user?.username || 'admin';
  } catch (e) {
    return 'admin';
  }
};

// Helper to format date & time nicely (e.g. 26-08-2026 03:55 PM)
const getFormattedDateTime = (): string => {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const d = pad(now.getDate());
  const m = pad(now.getMonth() + 1);
  const y = now.getFullYear();
  let hours = now.getHours();
  const minutes = pad(now.getMinutes());
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${d}-${m}-${y} ${pad(hours)}:${minutes} ${ampm}`;
};

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

// Helper to create fresh default checklist items - ALL UNCHECKED by default with creation audit
const createDefaultChecklistItems = (author?: string): DailyAgendaChecklistItem[] => {
  const user = author || getCurrentUserIdentifier();
  const timestamp = getFormattedDateTime();
  return DEFAULT_CHECKLIST_TEMPLATE.map((title, idx) => ({
    id: `chk_def_${idx}`,
    title,
    completed: false, // All unchecked by default as requested
    createdBy: user,
    createdAt: timestamp,
    updateCount: 0,
    updateHistory: []
  }));
};

// Standard default columns
const STANDARD_DEFAULT_COLUMNS: DailyAgendaColumn[] = [
  { id: 'c_regular', title: 'Regular follow-ups' }
];

// Fast 0ms initial state from localStorage cache for instant page refresh
const getInitialStateFromCache = () => {
  const today = getTodayStr();
  try {
    const raw = localStorage.getItem('jk_daily_agenda_matrices');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const m = parsed[0];
        const loadedCols = (m.columns && m.columns.length > 0) ? m.columns : STANDARD_DEFAULT_COLUMNS;
        const checklists = m.cellChecklists || {};
        const dates = Object.keys(checklists).map(k => k.split('__')[0]).filter(Boolean);
        const uniqueDates = Array.from(new Set([today, ...dates])).sort();
        return {
          title: m.title || 'Daily Construction Follow-up Matrix',
          columns: loadedCols,
          dateList: uniqueDates,
          cellChecklists: checklists,
          taskItems: m.taskItems || []
        };
      }
    }
  } catch (e) {
    console.warn('Cache read error:', e);
  }
  return {
    title: 'Daily Construction Follow-up Matrix',
    columns: STANDARD_DEFAULT_COLUMNS,
    dateList: [today],
    cellChecklists: {
      [`${today}__c_regular`]: createDefaultChecklistItems()
    },
    taskItems: []
  };
};

export const AdminStageChecklist: React.FC<AdminStageChecklistProps> = ({
  projects: _projects,
  onAddToast,
  onConfirm
}) => {
  const cachedInitial = useMemo(() => getInitialStateFromCache(), []);

  const [matrixTitle, setMatrixTitle] = useState(cachedInitial.title);

  // Columns State
  const [columns, setColumns] = useState<DailyAgendaColumn[]>(cachedInitial.columns);
  const [newColumnTitle, setNewColumnTitle] = useState<string>('');

  // Date Rows List
  const [dateList, setDateList] = useState<string[]>(cachedInitial.dateList);

  // Cell Checklists State: key is `${dateStr}__${colId}`
  const [cellChecklists, setCellChecklists] = useState<Record<string, DailyAgendaChecklistItem[]>>(cachedInitial.cellChecklists);

  // Legacy taskItems fallback support
  const [taskItems, setTaskItems] = useState<DailyAgendaTaskItem[]>(cachedInitial.taskItems);

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

  // Saving state indicator
  const [isSaving, setIsSaving] = useState(false);

  // Critical: Tracks if initial load from database has finished before allowing auto-saves
  const isLoadedRef = useRef(false);

  // Audit Update History Modal State
  const [viewHistoryItem, setViewHistoryItem] = useState<{
    title: string;
    createdBy?: string;
    createdAt?: string;
    updateCount?: number;
    history: DailyAgendaChecklistItemHistory[];
  } | null>(null);

  // Core Engine: Synchronizes Automatic Forwarding of Incomplete Tasks across past dates, today, and tomorrow
  const syncAutoRollover = (
    baseCellChecklists: Record<string, DailyAgendaChecklistItem[]>,
    cols: DailyAgendaColumn[]
  ): { nextCellChecklists: Record<string, DailyAgendaChecklistItem[]>; nextDates: string[] } => {
    const today = getTodayStr();
    const tomorrow = getTomorrowStr(today);
    const user = getCurrentUserIdentifier();
    const timestamp = getFormattedDateTime();

    const nextCellChecklists: Record<string, DailyAgendaChecklistItem[]> = { ...baseCellChecklists };
    let hasRolledOverAny = false;

    // Step 1: Forward incomplete tasks from past dates (< today) to TODAY
    const allKnownDates = new Set<string>();
    Object.keys(nextCellChecklists).forEach(k => {
      const d = k.split('__')[0];
      if (d) allKnownDates.add(d);
    });

    const pastDates = Array.from(allKnownDates).filter(d => d < today).sort();

    cols.forEach(col => {
      const todayKey = `${today}__${col.id}`;
      const todayExisting = nextCellChecklists[todayKey] ? [...nextCellChecklists[todayKey]] : [];

      // Collect all incomplete tasks from past dates
      pastDates.forEach(pDate => {
        const pKey = `${pDate}__${col.id}`;
        const pItems = nextCellChecklists[pKey] || [];
        const incompletePast = pItems.filter(i => !i.completed);

        incompletePast.forEach(pItem => {
          // Check if today already has this carried task
          const alreadyInToday = todayExisting.some(tItem => 
            tItem.carriedFromId === pItem.id ||
            tItem.id === `chk_fwd_${pItem.id}_${today}` ||
            (tItem.carriedFromDate === pDate && tItem.title.trim().toLowerCase() === pItem.title.trim().toLowerCase())
          );

          if (!alreadyInToday) {
            hasRolledOverAny = true;
            todayExisting.push({
              id: `chk_fwd_${pItem.id}_${today}`,
              carriedFromId: pItem.id,
              title: pItem.title,
              completed: false,
              carriedFromDate: pDate,
              createdBy: pItem.createdBy || user,
              createdAt: pItem.createdAt || timestamp,
              updatedBy: user,
              updatedAt: `${timestamp} (Carried from ${pDate})`,
              updateCount: pItem.updateCount || 0,
              updateHistory: pItem.updateHistory || []
            });
          }
        });
      });

      if (todayExisting.length > 0) {
        nextCellChecklists[todayKey] = todayExisting;
      }
    });

    // Step 2: Forward currently incomplete tasks from TODAY to TOMORROW
    cols.forEach(col => {
      const todayKey = `${today}__${col.id}`;
      const tomorrowKey = `${tomorrow}__${col.id}`;

      const todayItems = nextCellChecklists[todayKey] || [];
      const tomorrowExisting = nextCellChecklists[tomorrowKey] ? [...nextCellChecklists[tomorrowKey]] : [];

      // 1. Keep manual items created directly for tomorrow (without carriedFromDate)
      const tomorrowManualItems = tomorrowExisting.filter(tItem => !tItem.carriedFromDate);

      // 2. Only forward tasks that are currently INCOMPLETE on today (completed === false)
      // Any task that is completed (completed === true) on today is NEVER forwarded to tomorrow!
      const incompleteToday = todayItems.filter(i => !i.completed);

      const carriedForwardItems: DailyAgendaChecklistItem[] = incompleteToday.map(incItem => {
        // Match existing carried forward item in tomorrow by carriedFromId or ID
        const existingCarried = tomorrowExisting.find(tItem => 
          (tItem.carriedFromId && tItem.carriedFromId === incItem.id) ||
          tItem.id === `chk_fwd_${incItem.id}_${tomorrow}`
        );

        return {
          id: existingCarried?.id || `chk_fwd_${incItem.id}_${tomorrow}`,
          carriedFromId: incItem.id,
          title: incItem.title, // Always synchronize the latest title from today
          completed: false, // Incomplete on tomorrow until worked on
          carriedFromDate: today,
          createdBy: incItem.createdBy || user,
          createdAt: incItem.createdAt || timestamp,
          updatedBy: existingCarried?.updatedBy || incItem.updatedBy,
          updatedAt: existingCarried?.updatedAt || incItem.updatedAt,
          updateCount: incItem.updateCount || 0,
          updateHistory: incItem.updateHistory || []
        };
      });

      if (carriedForwardItems.length > 0) {
        hasRolledOverAny = true;
      }

      nextCellChecklists[tomorrowKey] = [...tomorrowManualItems, ...carriedForwardItems];
    });

    // Build all unique dates
    const allDateKeys = new Set<string>();
    allDateKeys.add(today);
    if (hasRolledOverAny || (nextCellChecklists[`${tomorrow}__${cols[0]?.id}`] && nextCellChecklists[`${tomorrow}__${cols[0]?.id}`].length > 0)) {
      allDateKeys.add(tomorrow);
    }
    Object.keys(nextCellChecklists).forEach(k => {
      const d = k.split('__')[0];
      if (d) allDateKeys.add(d);
    });

    return {
      nextCellChecklists,
      nextDates: Array.from(allDateKeys).sort((a, b) => a.localeCompare(b))
    };
  };

  // Auto-Load Saved Matrix State from Backend on Mount
  useEffect(() => {
    const loadBackendData = async () => {
      try {
        const matrices = await getDailyAgendaMatrices();
        if (matrices && matrices.length > 0) {
          const saved = matrices[0];
          const loadedCols = (saved.columns && saved.columns.length > 0) ? saved.columns : STANDARD_DEFAULT_COLUMNS;
          setColumns(loadedCols);
          if (loadedCols[0]) {
            setNewLogColId(loadedCols[0].id);
          }
          if (saved.title) setMatrixTitle(saved.title);

          let initialCellChecklists: Record<string, DailyAgendaChecklistItem[]> = {};

          if (saved.cellChecklists && Object.keys(saved.cellChecklists).length > 0) {
            initialCellChecklists = saved.cellChecklists;
          } else if (saved.taskItems && saved.taskItems.length > 0) {
            setTaskItems(saved.taskItems);
            saved.taskItems.forEach(t => {
              const cellKey = `${t.plannedDate}__${t.colId}`;
              if (!initialCellChecklists[cellKey]) {
                initialCellChecklists[cellKey] = [];
              }
              initialCellChecklists[cellKey].push({
                id: t.id,
                title: t.title,
                completed: t.status === 'Completed',
                createdBy: 'admin',
                createdAt: getFormattedDateTime(),
                updateCount: 0,
                updateHistory: []
              });
            });
          } else {
            const today = getTodayStr();
            initialCellChecklists = {
              [`${today}__c_regular`]: createDefaultChecklistItems()
            };
          }

          // Execute Auto-Rollover on load
          const { nextCellChecklists, nextDates } = syncAutoRollover(initialCellChecklists, loadedCols);
          setCellChecklists(nextCellChecklists);
          setDateList(nextDates);
        } else {
          // Initialize fresh default matrix with Image 1 checklist items
          const today = getTodayStr();
          const initMap: Record<string, DailyAgendaChecklistItem[]> = {
            [`${today}__c_regular`]: createDefaultChecklistItems()
          };
          const { nextCellChecklists, nextDates } = syncAutoRollover(initMap, STANDARD_DEFAULT_COLUMNS);
          setCellChecklists(nextCellChecklists);
          setDateList(nextDates);
        }
      } catch (e) {
        console.error('Failed to auto-load backend matrix state:', e);
      } finally {
        // Mark loading as complete so subsequent user changes trigger auto-save
        isLoadedRef.current = true;
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

  // Explicit Save Matrix Helper (Backend DB + Local Backup)
  const saveMatrixToDatabase = async (showToast = false) => {
    if (columns.length === 0 && Object.keys(cellChecklists).length === 0 && dateList.length === 0) return;

    setIsSaving(true);
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

    // Save to local storage as immediate backup
    try {
      localStorage.setItem('jk_daily_agenda_matrices', JSON.stringify([matrixData]));
    } catch (e) {
      console.warn('LocalStorage backup error:', e);
    }

    try {
      await saveDailyAgendaMatrix(matrixData);
      if (showToast) {
        onAddToast('Matrix saved to database successfully.', 'success');
      }
    } catch (e) {
      console.error('Error saving matrix to backend DB:', e);
      if (showToast) {
        onAddToast('Saved to local backup (backend sync pending).', 'info');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Debounced Auto-Save on ANY Change (Runs ONLY AFTER initial data load is complete)
  useEffect(() => {
    if (!isLoadedRef.current) return;
    if (columns.length === 0 && Object.keys(cellChecklists).length === 0) return;

    const timer = setTimeout(() => {
      saveMatrixToDatabase(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [columns, cellChecklists, dateList, matrixTitle, sortedDates, taskItems]);

  // Get items for a given cell (Date + Column)
  const getCellItems = (dateStr: string, colId: string): DailyAgendaChecklistItem[] => {
    const cellKey = `${dateStr}__${colId}`;
    if (cellChecklists[cellKey]) {
      return cellChecklists[cellKey];
    }
    return [];
  };

  // Add Column Handler
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

    const user = getCurrentUserIdentifier();
    const newColsList = [...columns, newCol];

    const nextCells = { ...cellChecklists };
    sortedDates.forEach(d => {
      const cellKey = `${d}__${newColId}`;
      if (!nextCells[cellKey]) {
        nextCells[cellKey] = createDefaultChecklistItems(user);
      }
    });

    const { nextCellChecklists, nextDates } = syncAutoRollover(nextCells, newColsList);
    setColumns(newColsList);
    setCellChecklists(nextCellChecklists);
    setDateList(nextDates);
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

    const remainingCols = columns.filter(c => c.id !== colId);
    const nextCells = { ...cellChecklists };
    Object.keys(nextCells).forEach(k => {
      if (k.endsWith(`__${colId}`)) {
        delete nextCells[k];
      }
    });

    setColumns(remainingCols);
    setCellChecklists(nextCells);
    onAddToast(`Deleted column "${colTitle}".`, 'info');
  };

  // Add Task/Checklist Item from top Logger Form
  const handleAddWorkItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetDate = newLogDate || getTodayStr();
    if (targetDate < getTodayStr()) {
      onAddToast('Please select today or a future date.', 'error');
      return;
    }

    const targetCol = newLogColId || (columns[0] ? columns[0].id : 'c_regular');
    const user = getCurrentUserIdentifier();
    const timestamp = getFormattedDateTime();

    const nextCells = { ...cellChecklists };

    if (newLogTitle.trim()) {
      const newItem: DailyAgendaChecklistItem = {
        id: 'chk_' + Date.now(),
        title: newLogTitle.trim(),
        completed: false,
        createdBy: user,
        createdAt: timestamp,
        updateCount: 0,
        updateHistory: []
      };

      const cellKey = `${targetDate}__${targetCol}`;
      const existing = nextCells[cellKey] ? [...nextCells[cellKey]] : createDefaultChecklistItems(user);
      nextCells[cellKey] = [...existing, newItem];

      const { nextCellChecklists, nextDates } = syncAutoRollover(nextCells, columns);
      setCellChecklists(nextCellChecklists);
      setDateList(nextDates);
      setNewLogTitle('');
      onAddToast(`Added "${newItem.title}" to ${targetDate}.`, 'success');
    } else {
      columns.forEach(col => {
        const cellKey = `${targetDate}__${col.id}`;
        if (!nextCells[cellKey]) {
          nextCells[cellKey] = createDefaultChecklistItems(user);
        }
      });
      const { nextCellChecklists, nextDates } = syncAutoRollover(nextCells, columns);
      setCellChecklists(nextCellChecklists);
      setDateList(nextDates);
      onAddToast(`Added date row for ${targetDate}.`, 'success');
    }
  };

  // Toggle Checkbox Done Status
  const handleToggleItem = (dateStr: string, colId: string, itemId: string) => {
    const cellKey = `${dateStr}__${colId}`;
    const today = getTodayStr();
    const user = getCurrentUserIdentifier();

    const list = cellChecklists[cellKey] ? [...cellChecklists[cellKey]] : createDefaultChecklistItems();
    const updated = list.map((item, idx) => {
      if (item.id === itemId || `chk_def_${idx}` === itemId) {
        const nextCompleted = !item.completed;
        return { 
          ...item, 
          completed: nextCompleted,
          completedDate: nextCompleted ? (item.completedDate || today) : undefined,
          completedBy: nextCompleted ? user : undefined
        };
      }
      return item;
    });

    const updatedBase = { ...cellChecklists, [cellKey]: updated };
    const { nextCellChecklists, nextDates } = syncAutoRollover(updatedBase, columns);
    setCellChecklists(nextCellChecklists);
    setDateList(nextDates);
  };

  // Add Dynamic Checklist Option / Item inside a specific Cell
  const handleAddOptionToCell = (dateStr: string, colId: string) => {
    const cellKey = `${dateStr}__${colId}`;
    const text = (newOptionInputs[cellKey] || '').trim();
    if (!text) return;

    const user = getCurrentUserIdentifier();
    const timestamp = getFormattedDateTime();

    const newItem: DailyAgendaChecklistItem = {
      id: 'chk_' + Date.now(),
      title: text,
      completed: false,
      createdBy: user,
      createdAt: timestamp,
      updateCount: 0,
      updateHistory: []
    };

    const list = cellChecklists[cellKey] ? [...cellChecklists[cellKey]] : createDefaultChecklistItems();
    const updatedBase = {
      ...cellChecklists,
      [cellKey]: [...list, newItem]
    };

    const { nextCellChecklists, nextDates } = syncAutoRollover(updatedBase, columns);
    setCellChecklists(nextCellChecklists);
    setDateList(nextDates);
    setNewOptionInputs(prev => ({ ...prev, [cellKey]: '' }));
    onAddToast(`Added option "${text}".`, 'success');
  };

  // Delete an Item from Cell
  const handleDeleteItem = (dateStr: string, colId: string, itemId: string) => {
    const cellKey = `${dateStr}__${colId}`;
    const list = cellChecklists[cellKey] || [];
    const updatedBase = {
      ...cellChecklists,
      [cellKey]: list.filter(i => i.id !== itemId)
    };
    const { nextCellChecklists, nextDates } = syncAutoRollover(updatedBase, columns);
    setCellChecklists(nextCellChecklists);
    setDateList(nextDates);
  };

  // Save Inline Edited Item Title (Completed Records CANNOT be modified)
  const handleSaveEditItem = (dateStr: string, colId: string, itemId: string) => {
    if (!editItemTitle.trim()) {
      setEditingItemKey(null);
      return;
    }
    const cellKey = `${dateStr}__${colId}`;
    const user = getCurrentUserIdentifier();
    const timestamp = getFormattedDateTime();

    const list = cellChecklists[cellKey] ? [...cellChecklists[cellKey]] : createDefaultChecklistItems();
    const updated = list.map((item, idx) => {
      if (item.id === itemId || `chk_def_${idx}` === itemId) {
        // Guard: Completed records cannot be updated
        if (item.completed) {
          onAddToast('Completed tasks cannot be modified.', 'error');
          return item;
        }

        const isTitleChanged = item.title !== editItemTitle.trim();
        const currentCount = item.updateCount || 0;
        const nextCount = isTitleChanged ? currentCount + 1 : currentCount;

        const newHistoryEntry: DailyAgendaChecklistItemHistory = {
          updatedBy: user,
          updatedAt: timestamp,
          oldTitle: item.title,
          newTitle: editItemTitle.trim(),
          note: `Title changed from "${item.title}" to "${editItemTitle.trim()}"`
        };

        const existingHistory = item.updateHistory || [];
        const nextHistory = isTitleChanged ? [...existingHistory, newHistoryEntry] : existingHistory;

        return { 
          ...item, 
          title: editItemTitle.trim(),
          updatedBy: user,
          updatedAt: timestamp,
          updateCount: nextCount,
          updateHistory: nextHistory
        };
      }
      return item;
    });

    const updatedBase = { ...cellChecklists, [cellKey]: updated };
    const { nextCellChecklists, nextDates } = syncAutoRollover(updatedBase, columns);
    setCellChecklists(nextCellChecklists);
    setDateList(nextDates);
    setEditingItemKey(null);
    setEditItemTitle('');
    onAddToast('Task updated successfully.', 'success');
  };

  // Toggle All Items in Cell
  const handleToggleAllCell = (dateStr: string, colId: string, completeAll: boolean) => {
    const cellKey = `${dateStr}__${colId}`;
    const today = getTodayStr();
    const user = getCurrentUserIdentifier();

    const list = cellChecklists[cellKey] ? [...cellChecklists[cellKey]] : createDefaultChecklistItems();
    const updated = list.map(item => ({ 
      ...item, 
      completed: completeAll,
      completedDate: completeAll ? (item.completedDate || today) : undefined,
      completedBy: completeAll ? user : undefined
    }));

    const updatedBase = { ...cellChecklists, [cellKey]: updated };
    const { nextCellChecklists, nextDates } = syncAutoRollover(updatedBase, columns);
    setCellChecklists(nextCellChecklists);
    setDateList(nextDates);
  };

  // Reset Cell to Default 10 Checklist Items
  const handleResetCellToDefaults = (dateStr: string, colId: string) => {
    const cellKey = `${dateStr}__${colId}`;
    const user = getCurrentUserIdentifier();
    const updatedBase = {
      ...cellChecklists,
      [cellKey]: createDefaultChecklistItems(user)
    };
    const { nextCellChecklists, nextDates } = syncAutoRollover(updatedBase, columns);
    setCellChecklists(nextCellChecklists);
    setDateList(nextDates);
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

  // Live Task Counts for Status Legend & Filtering
  const statusCounts = useMemo(() => {
    let totalCompletedTasks = 0;
    let todayPendingTasks = 0;
    let totalUpcomingRows = 0;
    const today = getTodayStr();

    sortedDates.forEach(dateStr => {
      if (dateStr > today) totalUpcomingRows++;
      columns.forEach(col => {
        const cellKey = `${dateStr}__${col.id}`;
        const items = cellChecklists[cellKey] || [];
        totalCompletedTasks += items.filter(i => i.completed).length;
        if (dateStr === today) {
          todayPendingTasks += items.filter(i => !i.completed).length;
        }
      });
    });

    return {
      all: sortedDates.length,
      completed: totalCompletedTasks,
      inProgress: todayPendingTasks,
      upcoming: totalUpcomingRows
    };
  }, [sortedDates, columns, cellChecklists]);

  // Format data array for ALV Grid view with Status Filtering
  const matrixALVData = useMemo(() => {
    const today = getTodayStr();

    const filteredDates = sortedDates.filter(dateStr => {
      if (statusFilter === 'ALL') return true;

      if (statusFilter === 'COMPLETED') {
        // Include any date row that contains completed tasks
        let hasCompleted = false;
        columns.forEach(col => {
          const cellKey = `${dateStr}__${col.id}`;
          const items = cellChecklists[cellKey] || [];
          if (items.some(i => i.completed)) hasCompleted = true;
        });
        return hasCompleted;
      }

      if (statusFilter === 'IN_PROGRESS') {
        // Only show TODAY's row for In Progress / Today filter (tomorrow is not shown)
        return dateStr === today;
      }

      if (statusFilter === 'UPCOMING') {
        return dateStr > today;
      }

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
        let items = cellChecklists[cellKey] || createDefaultChecklistItems();

        // If filtering by COMPLETED, show only the completed tasks in the cell!
        if (statusFilter === 'COMPLETED') {
          items = items.filter(i => i.completed);
        } else if (statusFilter === 'IN_PROGRESS') {
          items = items.filter(i => !i.completed);
        }

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
          const isTomorrow = dateStr === getTomorrowStr(getTodayStr());
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
            <div className="flex flex-column align-center gap-1 p-1">
              <div 
                className="flex flex-column align-center gap-0.5" 
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setEditingDateRow(dateStr);
                  setEditDateValue(dateStr);
                }}
                title="Click to edit date row"
              >
                <span className="font-bold text-primary" style={{ fontSize: '0.88rem' }}>{dateStr}</span>
                {isToday && (
                  <span className="badge" style={{ backgroundColor: '#16a34a', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', fontWeight: 'bold', borderRadius: '4px' }}>
                    TODAY
                  </span>
                )}
                {!isToday && isTomorrow && (
                  <span className="badge" style={{ backgroundColor: '#f59e0b', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', fontWeight: 'bold', borderRadius: '4px' }}>
                    TOMORROW
                  </span>
                )}
                {!isToday && !isTomorrow && (
                  <span className="badge" style={{ backgroundColor: '#0284c7', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', fontWeight: 'bold', borderRadius: '4px' }}>
                    UPCOMING
                  </span>
                )}
              </div>
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
          const allCellItems = cellChecklists[cellKey] || createDefaultChecklistItems();
          const completedCount = allCellItems.filter(i => i.completed).length;
          const totalCount = allCellItems.length;
          const isAllDone = totalCount > 0 && completedCount === totalCount;
          const currentOptionInput = newOptionInputs[cellKey] || '';

          // Items to display (filtered when statusFilter is active)
          const displayItems: DailyAgendaChecklistItem[] = Array.isArray(row[col.id]) 
            ? (row[col.id] as DailyAgendaChecklistItem[]) 
            : allCellItems;

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
                minWidth: '320px'
              }}
            >
              {/* Checklist Header */}
              <div 
                className="flex justify-between align-center px-2 py-1.5 flex-wrap gap-1"
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
                    {col.title} {statusFilter === 'COMPLETED' ? 'Completed Tasks' : (statusFilter === 'IN_PROGRESS' ? 'Pending Tasks' : 'Checklist')}
                  </span>
                </div>

                <div className="flex align-center gap-1 flex-wrap">
                  {statusFilter === 'ALL' && (
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
                  )}

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

                  {columns.length > 1 && statusFilter === 'ALL' && (
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

              {/* Checklist Items List with Complete Audit Trail & Update History */}
              <div className="checklist-items-table" style={{ maxHeight: '360px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.7rem', color: '#64748b' }}>
                      <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 600 }}>Task / Checklist Item & Audit Details</th>
                      <th style={{ textAlign: 'center', width: '45px', padding: '4px 8px', fontWeight: 600 }}>Done</th>
                      <th style={{ width: '45px', padding: '4px 2px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayItems.map((item) => {
                      const itemKey = `${dateStr}__${col.id}__${item.id}`;
                      const isEditing = editingItemKey === itemKey;
                      const isCompleted = !!item.completed;

                      return (
                        <tr 
                          key={item.id}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: isEditing ? '#eff6ff' : (isCompleted ? '#f0fdf4' : '#ffffff'),
                            transition: 'background-color 0.15s ease'
                          }}
                        >
                          {/* Item Title & Audit Info or Inline Editor */}
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
                              {/* Title + Audit Trail Metadata (Completed Records are locked from editing) */}
                              <td 
                                style={{ 
                                  padding: '6px 8px', 
                                  fontSize: '0.8rem', 
                                  verticalAlign: 'middle', 
                                  cursor: isCompleted ? 'default' : 'text' 
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isCompleted) {
                                    onAddToast('Completed tasks cannot be updated. Uncheck to edit.', 'info');
                                    return;
                                  }
                                  setEditingItemKey(itemKey);
                                  setEditItemTitle(item.title);
                                }}
                                title={isCompleted ? 'Completed record (Locked from editing)' : 'Click text to edit description'}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  {/* Task Title & Status Badges */}
                                  <div 
                                    style={{
                                      color: isCompleted ? '#166534' : '#1e293b',
                                      fontWeight: isCompleted ? 600 : 500,
                                      userSelect: 'none',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      flexWrap: 'wrap'
                                    }}
                                  >
                                    <span>{item.title}</span>

                                    {/* Carried Forward Tag */}
                                    {item.carriedFromDate && (
                                      <span 
                                        className="badge"
                                        style={{
                                          fontSize: '0.62rem',
                                          padding: '1px 5px',
                                          backgroundColor: '#e0e7ff',
                                          color: '#3730a3',
                                          border: '1px solid #c7d2fe',
                                          borderRadius: '3px',
                                          fontWeight: 600
                                        }}
                                        title={`Task automatically carried forward from ${item.carriedFromDate}`}
                                      >
                                        ↪️ From {item.carriedFromDate}
                                      </span>
                                    )}

                                    {/* Completed Badge & Lock indicator */}
                                    {isCompleted && item.completedDate && (
                                      <span 
                                        className="badge flex align-center gap-0.5" 
                                        style={{
                                          fontSize: '0.62rem',
                                          padding: '1px 5px',
                                          backgroundColor: '#dcfce7',
                                          color: '#166534',
                                          border: '1px solid #86efac',
                                          borderRadius: '3px',
                                          fontWeight: 600
                                        }}
                                        title={`Completed on ${item.completedDate} by ${item.completedBy || 'admin'}. Record is locked.`}
                                      >
                                        <Lock size={9} /> Done on {item.completedDate} {item.completedBy ? `by ${item.completedBy}` : ''}
                                      </span>
                                    )}

                                    {/* Update History Badge (Interactive count button) */}
                                    {item.updateCount && item.updateCount > 0 ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setViewHistoryItem({
                                            title: item.title,
                                            createdBy: item.createdBy,
                                            createdAt: item.createdAt,
                                            updateCount: item.updateCount,
                                            history: item.updateHistory || []
                                          });
                                        }}
                                        className="badge flex align-center gap-0.5"
                                        style={{
                                          fontSize: '0.62rem',
                                          padding: '1px 6px',
                                          backgroundColor: '#fef3c7',
                                          color: '#92400e',
                                          border: '1px solid #fde68a',
                                          borderRadius: '4px',
                                          fontWeight: 700,
                                          cursor: 'pointer'
                                        }}
                                        title={`Updated ${item.updateCount} time${item.updateCount > 1 ? 's' : ''}. Click to view update history.`}
                                      >
                                        <History size={10} /> Updated ({item.updateCount}x)
                                      </button>
                                    ) : null}
                                  </div>

                                  {/* Audit Metadata Line (Who Created, When Created, Who Updated, When Updated) */}
                                  <div 
                                    style={{ 
                                      fontSize: '0.66rem', 
                                      color: '#64748b', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: '8px', 
                                      flexWrap: 'wrap',
                                      lineHeight: 1.2
                                    }}
                                  >
                                    <span title="Created details" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                      <UserIcon size={10} className="text-muted" />
                                      <span>Created: <strong>{item.createdBy || 'admin'}</strong> ({item.createdAt || 'Default'})</span>
                                    </span>

                                    {item.updatedBy && item.updatedAt && (
                                      <span title="Last updated details" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#b45309' }}>
                                        <Clock size={10} />
                                        <span>Last Updated: <strong>{item.updatedBy}</strong> ({item.updatedAt})</span>
                                      </span>
                                    )}
                                  </div>
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
                                  title={item.completed ? 'Mark as Undone (Unlocks for editing)' : 'Mark as Done'}
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

                          {/* Action Buttons (Edit & Delete - Edit disabled for completed records) */}
                          <td 
                            style={{ textAlign: 'center', verticalAlign: 'middle', padding: '4px 2px' }}
                            onClick={e => e.stopPropagation()}
                          >
                            <div className="flex align-center gap-0.5 justify-center">
                              {!isEditing && !isCompleted && (
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
                              {!isEditing && isCompleted && (
                                <span 
                                  style={{ height: '20px', width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}
                                  title="Completed record is locked from editing"
                                >
                                  <Lock size={11} />
                                </span>
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

                    {displayItems.length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', padding: '14px', color: '#94a3b8', fontSize: '0.78rem' }}>
                          {statusFilter === 'COMPLETED' ? (
                            <span>No completed tasks on this date yet. Check tasks to complete them.</span>
                          ) : statusFilter === 'IN_PROGRESS' ? (
                            <span className="text-success font-bold">🎉 All tasks completed for this date!</span>
                          ) : (
                            <div>
                              <span>No checklist items yet.</span>
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
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Dynamic Add Option / Item Form with Checkbox (Hidden in COMPLETED filter mode) */}
              {statusFilter !== 'COMPLETED' && (
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
              )}
            </div>
          );
        }
      });
    });

    return cols;
  }, [columns, sortedDates, cellChecklists, editingItemKey, editItemTitle, editingDateRow, editDateValue, newOptionInputs, statusFilter]);

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
              Real-time Project & Date-wise Follow-up Work Item Tracker with Automatic Carry-Forward, Update History & Locked Completed Records
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

            <button 
              type="button" 
              onClick={() => saveMatrixToDatabase(true)} 
              className="btn btn-primary btn-sm flex align-center gap-0.5"
              disabled={isSaving}
              style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}
              title="Manually save matrix state to Database"
            >
              <Save size={14} /> {isSaving ? 'Saving...' : 'Save to DB'}
            </button>

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

        {/* Interactive Status Filter Buttons */}
        <div className="flex justify-between align-center mt-3 p-2.5 rounded border flex-wrap gap-2" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
          <div className="flex align-center gap-2 text-xs flex-wrap">
            <span className="font-bold text-muted mr-1">Status Filters:</span>
            
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
              title="Show all date rows and all tasks"
            >
              ALL ({statusCounts.all})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('COMPLETED')}
              className="btn btn-xs"
              style={{
                backgroundColor: statusFilter === 'COMPLETED' ? '#16a34a' : '#dcfce7',
                color: statusFilter === 'COMPLETED' ? '#ffffff' : '#166534',
                border: statusFilter === 'COMPLETED' ? '1px solid #15803d' : '1px solid #86efac',
                padding: '4px 10px',
                borderRadius: '5px',
                fontWeight: statusFilter === 'COMPLETED' ? 700 : 600,
                cursor: 'pointer',
                boxShadow: statusFilter === 'COMPLETED' ? '0 1px 4px rgba(22, 163, 74, 0.4)' : 'none',
                transition: 'all 0.15s ease'
              }}
              title="Show only completed tasks"
            >
              COMPLETED ({statusCounts.completed})
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
              title="Show today's pending incomplete tasks"
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

          <div className="text-xs text-muted flex align-center gap-1">
            <Sparkles size={13} style={{ color: '#0284c7' }} />
            <span><strong>Real-time Auto-Save Active:</strong> Every update is auto-synced directly to the backend database.</span>
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
                const text = items.map(i => {
                  const status = i.completed ? `DONE (${i.completedDate || ''} by ${i.completedBy || ''})` : 'PENDING';
                  const audit = `Created by: ${i.createdBy || ''} (${i.createdAt || ''}), Updates: ${i.updateCount || 0}`;
                  const fwd = i.carriedFromDate ? ` [Forwarded from ${i.carriedFromDate}]` : '';
                  return `[${status}] ${i.title}${fwd} - ${audit}`;
                }).join('; ');
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

      {/* Update Audit History Modal */}
      {viewHistoryItem && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
          onClick={() => setViewHistoryItem(null)}
        >
          <div 
            className="admin-card p-4"
            style={{
              maxWidth: '560px',
              width: '100%',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              border: '1px solid #cbd5e1'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between align-center mb-3 border-bottom pb-2">
              <div className="flex align-center gap-1.5">
                <History size={20} className="text-primary" />
                <h3 className="m-0 text-base font-bold" style={{ color: '#0f172a' }}>Task Update Audit History</h3>
              </div>
              <button 
                type="button" 
                className="btn btn-ghost btn-sm p-1 text-muted"
                onClick={() => setViewHistoryItem(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-3 p-2.5 rounded bg-light border">
              <div className="font-bold text-sm text-dark mb-1">{viewHistoryItem.title}</div>
              <div className="text-xs text-muted flex align-center gap-1">
                <UserIcon size={12} />
                <span>Originally Created by: <strong>{viewHistoryItem.createdBy || 'admin'}</strong> on {viewHistoryItem.createdAt || 'Initial setup'}</span>
              </div>
            </div>

            <div className="mb-3">
              <div className="text-xs font-bold text-muted mb-1.5 uppercase" style={{ letterSpacing: '0.5px' }}>
                Revision History ({viewHistoryItem.history.length} update{viewHistoryItem.history.length === 1 ? '' : 's'})
              </div>

              {viewHistoryItem.history.length === 0 ? (
                <div className="p-3 text-center text-xs text-muted border rounded" style={{ backgroundColor: '#f8fafc' }}>
                  No historical updates recorded yet. Task has its original title.
                </div>
              ) : (
                <div style={{ maxHeight: '240px', overflowY: 'auto' }} className="border rounded">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>#</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>Updated By</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>Date & Time</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>Change Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewHistoryItem.history.map((h, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 8px', fontWeight: 600, color: '#64748b' }}>{idx + 1}</td>
                          <td style={{ padding: '6px 8px', fontWeight: 600, color: '#0f172a' }}>{h.updatedBy}</td>
                          <td style={{ padding: '6px 8px', color: '#475569' }}>{h.updatedAt}</td>
                          <td style={{ padding: '6px 8px', color: '#1e293b' }}>
                            {h.note || (h.oldTitle ? `"${h.oldTitle}" ➔ "${h.newTitle}"` : 'Updated task')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button 
                type="button" 
                className="btn btn-secondary btn-sm px-3"
                onClick={() => setViewHistoryItem(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
