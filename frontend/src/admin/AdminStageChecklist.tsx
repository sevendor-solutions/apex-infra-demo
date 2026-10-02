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
import { jsPDF } from 'jspdf';
import logoImg from '../assets/logo.png';
import { useCompany } from '../context/CompanyContext';
import { 
  Calendar, 
  Printer, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  ListChecks, 
  User as UserIcon, 
  Clock, 
  Sparkles, 
  History, 
  Lock,
  Share2,
  Copy,
  MessageCircle,
  Mail,
  CheckCheck,
  Download,
  FileText,
  Edit2,
  Settings
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

// Helper: Normalize task title for duplicate checking
const normalizeTaskTitle = (t: string): string => {
  return (t || '').trim().toLowerCase().replace(/\s+/g, ' ');
};

// Helper: Deduplicate checklist items within a cell so every title appears at most once
const deduplicateCellItems = (items: DailyAgendaChecklistItem[]): DailyAgendaChecklistItem[] => {
  const seenTitles = new Set<string>();
  const seenIds = new Set<string>();
  const result: DailyAgendaChecklistItem[] = [];

  for (const item of (items || [])) {
    const norm = normalizeTaskTitle(item.title);
    if (!norm) continue;

    const itemRoot = item.carriedFromId || item.id;
    const matchedIdx = result.findIndex(r => {
      if (item.id && r.id && item.id === r.id) return true;
      const rRoot = r.carriedFromId || r.id;
      if (itemRoot && rRoot && itemRoot === rRoot) return true;
      if (item.id && r.carriedFromId && item.id === r.carriedFromId) return true;
      if (r.id && item.carriedFromId && r.id === item.carriedFromId) return true;
      if (normalizeTaskTitle(r.title) === norm) return true;
      return false;
    });

    if (matchedIdx !== -1) {
      const prev = result[matchedIdx];
      const prevHist = Array.isArray(prev.updateHistory) ? prev.updateHistory : [];
      const itemHist = Array.isArray(item.updateHistory) ? item.updateHistory : [];
      const prevCount = prev.updateCount || prevHist.length || 0;
      const itemCount = item.updateCount || itemHist.length || 0;

      const bestCount = Math.max(prevCount, itemCount);
      const bestHistory = itemCount > prevCount 
        ? itemHist 
        : (prevCount > itemCount ? prevHist : (itemHist.length >= prevHist.length ? itemHist : prevHist));
      const bestTitle = itemCount > prevCount ? item.title : prev.title;
      const bestUpdatedBy = itemCount > prevCount ? (item.updatedBy || prev.updatedBy) : (prev.updatedBy || item.updatedBy);
      const bestUpdatedAt = itemCount > prevCount ? (item.updatedAt || prev.updatedAt) : (prev.updatedAt || item.updatedAt);

      result[matchedIdx] = {
        ...prev,
        title: bestTitle,
        completed: prev.completed || item.completed,
        completedDate: prev.completedDate || item.completedDate,
        completedBy: prev.completedBy || item.completedBy,
        updateCount: bestCount,
        updateHistory: bestHistory,
        updatedBy: bestUpdatedBy,
        updatedAt: bestUpdatedAt,
        carriedFromId: prev.carriedFromId || item.carriedFromId,
        carriedFromDate: prev.carriedFromDate || item.carriedFromDate
      };
      continue;
    }

    seenTitles.add(norm);
    if (item.carriedFromId) seenIds.add(item.carriedFromId);
    if (item.id) seenIds.add(item.id);
    result.push(item);
  }

  return result;
};

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
        const rawChecklists = m.cellChecklists || {};
        const checklists: Record<string, DailyAgendaChecklistItem[]> = {};
        Object.entries(rawChecklists).forEach(([k, items]) => {
          checklists[k] = deduplicateCellItems((items as DailyAgendaChecklistItem[]) || []);
        });
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
  const { profile } = useCompany();
  const cachedInitial = useMemo(() => getInitialStateFromCache(), []);

  const [matrixTitle, setMatrixTitle] = useState(cachedInitial.title);

  // Columns State
  const [columns, setColumns] = useState<DailyAgendaColumn[]>(cachedInitial.columns);
  const [newColumnTitle, setNewColumnTitle] = useState<string>('');
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editColTitle, setEditColTitle] = useState<string>('');
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState<boolean>(false);

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

  // Date-wise Share Modal State
  const [shareModalDate, setShareModalDate] = useState<string | null>(null);
  const [shareFilter, setShareFilter] = useState<'ALL' | 'INCOMPLETE' | 'COMPLETED'>('ALL');
  const [shareIncludeAudit, setShareIncludeAudit] = useState<boolean>(false);
  const [shareRecipientPhone, setShareRecipientPhone] = useState<string>('');
  const [shareCustomNote, setShareCustomNote] = useState<string>('');
  const [shareFormat, setShareFormat] = useState<'PDF' | 'TEXT'>('PDF');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  // Core Engine: Synchronizes Automatic Forwarding of Incomplete Tasks sequentially across dates with zero duplicates
  const syncAutoRollover = (
    baseCellChecklists: Record<string, DailyAgendaChecklistItem[]>,
    cols: DailyAgendaColumn[]
  ): { nextCellChecklists: Record<string, DailyAgendaChecklistItem[]>; nextDates: string[] } => {
    const today = getTodayStr();
    const tomorrow = getTomorrowStr(today);
    const user = getCurrentUserIdentifier();
    const timestamp = getFormattedDateTime();

    // 1. Initial cleanup: Deduplicate every single existing cell in the matrix
    const nextCellChecklists: Record<string, DailyAgendaChecklistItem[]> = {};
    Object.entries(baseCellChecklists).forEach(([k, items]) => {
      nextCellChecklists[k] = deduplicateCellItems(items || []);
    });

    // 2. Discover all unique dates present in the data
    const allDateKeys = new Set<string>();
    allDateKeys.add(today);
    Object.keys(nextCellChecklists).forEach(k => {
      const d = k.split('__')[0];
      if (d) allDateKeys.add(d);
    });

    const sortedAllDates = Array.from(allDateKeys).sort((a, b) => a.localeCompare(b));
    const pastDates = sortedAllDates.filter(d => d < today);

    // 3. Chronological Sequential Rollover across past dates (from D_0 -> D_1 -> D_2 -> ... -> D_n)
    for (let i = 0; i < pastDates.length; i++) {
      const curDate = pastDates[i];
      const nextDate = (i + 1 < pastDates.length) ? pastDates[i + 1] : today;

      cols.forEach(col => {
        const curKey = `${curDate}__${col.id}`;
        const nextKey = `${nextDate}__${col.id}`;

        const curItems = nextCellChecklists[curKey] || [];
        const nextExisting = nextCellChecklists[nextKey] ? [...nextCellChecklists[nextKey]] : [];

        // For each item on curDate:
        curItems.forEach(curItem => {
          const normTitle = normalizeTaskTitle(curItem.title);
          const curRoot = curItem.carriedFromId || curItem.id;
          const existingNextIdx = nextExisting.findIndex(nItem => {
            if (curItem.id && nItem.id && curItem.id === nItem.id) return true;
            if (curRoot && (nItem.carriedFromId === curRoot || nItem.id === curRoot)) return true;
            if (nItem.carriedFromId && curItem.id && nItem.carriedFromId === curItem.id) return true;
            if (nItem.id === `chk_fwd_${curItem.id}_${nextDate}`) return true;
            if (normalizeTaskTitle(nItem.title) === normTitle) return true;
            return false;
          });

          if (curItem.completed) {
            // Completed on curDate! If it was previously carried forward to nextDate, remove it from nextDate
            if (existingNextIdx !== -1 && nextExisting[existingNextIdx].carriedFromDate) {
              nextExisting.splice(existingNextIdx, 1);
            }
          } else {
            // Incomplete on curDate! Ensure it exists ONCE on nextDate
            if (existingNextIdx !== -1) {
              const existingItem = nextExisting[existingNextIdx];
              const curHist = Array.isArray(curItem.updateHistory) ? curItem.updateHistory : [];
              const nextHist = Array.isArray(existingItem.updateHistory) ? existingItem.updateHistory : [];
              const curCount = curItem.updateCount || curHist.length || 0;
              const nextCount = existingItem.updateCount || nextHist.length || 0;

              // Determine which item has the latest/higher update information
              let chosenTitle = curItem.title;
              let chosenHistory = curHist;
              let chosenCount = curCount;
              let chosenUpdatedBy = curItem.updatedBy || existingItem.updatedBy;
              let chosenUpdatedAt = curItem.updatedAt || existingItem.updatedAt;

              if (nextCount > curCount) {
                chosenTitle = existingItem.title;
                chosenHistory = nextHist;
                chosenCount = nextCount;
                chosenUpdatedBy = existingItem.updatedBy || curItem.updatedBy;
                chosenUpdatedAt = existingItem.updatedAt || curItem.updatedAt;
              } else if (curCount > nextCount) {
                chosenTitle = curItem.title;
                chosenHistory = curHist;
                chosenCount = curCount;
                chosenUpdatedBy = curItem.updatedBy || existingItem.updatedBy;
                chosenUpdatedAt = curItem.updatedAt || existingItem.updatedAt;
              } else {
                // Same count - prefer the one with longer history or whichever is non-empty
                if (nextHist.length > curHist.length) {
                  chosenTitle = existingItem.title;
                  chosenHistory = nextHist;
                  chosenCount = Math.max(nextCount, nextHist.length);
                  chosenUpdatedBy = existingItem.updatedBy || curItem.updatedBy;
                  chosenUpdatedAt = existingItem.updatedAt || curItem.updatedAt;
                } else if (curHist.length > nextHist.length) {
                  chosenTitle = curItem.title;
                  chosenHistory = curHist;
                  chosenCount = Math.max(curCount, curHist.length);
                  chosenUpdatedBy = curItem.updatedBy || existingItem.updatedBy;
                  chosenUpdatedAt = curItem.updatedAt || existingItem.updatedAt;
                }
              }

              // Synchronize title and metadata
              nextExisting[existingNextIdx] = {
                ...existingItem,
                title: chosenTitle,
                carriedFromId: curItem.carriedFromId || curItem.id || existingItem.carriedFromId,
                carriedFromDate: curItem.carriedFromDate || existingItem.carriedFromDate || curDate,
                updateCount: chosenCount,
                updateHistory: chosenHistory,
                updatedBy: chosenUpdatedBy,
                updatedAt: chosenUpdatedAt
              };
            } else {
              // Add to nextDate
              nextExisting.push({
                id: `chk_fwd_${curItem.id}_${nextDate}`,
                carriedFromId: curItem.carriedFromId || curItem.id,
                title: curItem.title,
                completed: false,
                carriedFromDate: curItem.carriedFromDate || curDate,
                createdBy: curItem.createdBy || user,
                createdAt: curItem.createdAt || timestamp,
                updatedBy: curItem.updatedBy || user,
                updatedAt: curItem.updatedAt || `${timestamp} (Carried from ${curItem.carriedFromDate || curDate})`,
                updateCount: curItem.updateCount || 0,
                updateHistory: Array.isArray(curItem.updateHistory) ? [...curItem.updateHistory] : []
              });
            }
          }
        });

        nextCellChecklists[nextKey] = deduplicateCellItems(nextExisting);
      });
    }

    // 4. Forward currently incomplete tasks from TODAY to TOMORROW
    let hasRolledOverToTomorrow = false;
    cols.forEach(col => {
      const todayKey = `${today}__${col.id}`;
      const tomorrowKey = `${tomorrow}__${col.id}`;

      const todayItems = nextCellChecklists[todayKey] || [];
      const tomorrowExisting = nextCellChecklists[tomorrowKey] ? [...nextCellChecklists[tomorrowKey]] : [];

      // 1. Keep manual items created directly on tomorrow (not carried from today)
      const tomorrowManualItems = tomorrowExisting.filter(tItem => !tItem.carriedFromDate);

      // 2. Only forward tasks that are currently INCOMPLETE on today
      const incompleteToday = todayItems.filter(i => !i.completed);

      const carriedForwardItems: DailyAgendaChecklistItem[] = incompleteToday.map(incItem => {
        const normTitle = normalizeTaskTitle(incItem.title);
        const incRoot = incItem.carriedFromId || incItem.id;
        const existingCarried = tomorrowExisting.find(tItem => 
          (tItem.id && incItem.id && tItem.id === incItem.id) ||
          (incRoot && (tItem.carriedFromId === incRoot || tItem.id === incRoot)) ||
          (tItem.carriedFromId && incItem.id && tItem.carriedFromId === incItem.id) ||
          tItem.id === `chk_fwd_${incItem.id}_${tomorrow}` ||
          normalizeTaskTitle(tItem.title) === normTitle
        );

        const incHist = Array.isArray(incItem.updateHistory) ? incItem.updateHistory : [];
        const existHist = Array.isArray(existingCarried?.updateHistory) ? existingCarried.updateHistory : [];
        const incCount = incItem.updateCount || incHist.length || 0;
        const existCount = existingCarried?.updateCount || existHist.length || 0;

        let bestTitle = incItem.title;
        let bestHist = incHist;
        let bestCount = Math.max(incCount, existCount);
        let bestUpdatedBy = incItem.updatedBy || existingCarried?.updatedBy || user;
        let bestUpdatedAt = incItem.updatedAt || existingCarried?.updatedAt;

        if (existCount > incCount) {
          bestTitle = existingCarried!.title;
          bestHist = existHist;
          bestUpdatedBy = existingCarried!.updatedBy || incItem.updatedBy || user;
          bestUpdatedAt = existingCarried!.updatedAt || incItem.updatedAt;
        } else if (incCount > existCount) {
          bestTitle = incItem.title;
          bestHist = incHist;
        } else if (existHist.length > incHist.length) {
          bestTitle = existingCarried!.title;
          bestHist = existHist;
          bestUpdatedBy = existingCarried!.updatedBy || incItem.updatedBy || user;
          bestUpdatedAt = existingCarried!.updatedAt || incItem.updatedAt;
        }

        return {
          id: existingCarried?.id || `chk_fwd_${incItem.id}_${tomorrow}`,
          carriedFromId: incItem.carriedFromId || incItem.id,
          title: bestTitle,
          completed: false,
          carriedFromDate: incItem.carriedFromDate || today,
          createdBy: incItem.createdBy || user,
          createdAt: incItem.createdAt || timestamp,
          updatedBy: bestUpdatedBy,
          updatedAt: bestUpdatedAt || `${timestamp} (Carried from ${incItem.carriedFromDate || today})`,
          updateCount: bestCount,
          updateHistory: bestHist
        };
      });

      if (carriedForwardItems.length > 0) {
        hasRolledOverToTomorrow = true;
      }

      nextCellChecklists[tomorrowKey] = deduplicateCellItems([...tomorrowManualItems, ...carriedForwardItems]);
    });

    // 5. Build all dates list
    allDateKeys.add(today);
    if (hasRolledOverToTomorrow || (nextCellChecklists[`${tomorrow}__${cols[0]?.id}`] && nextCellChecklists[`${tomorrow}__${cols[0]?.id}`].length > 0)) {
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
        let matrixToUse = (matrices && matrices.length > 0) ? matrices[0] : null;

        // Check if local cache has newer or more comprehensive data than backend
        try {
          const raw = localStorage.getItem('jk_daily_agenda_matrices');
          if (raw) {
            const localParsed = JSON.parse(raw);
            if (Array.isArray(localParsed) && localParsed.length > 0) {
              const local = localParsed[0];
              if (!matrixToUse) {
                matrixToUse = local;
              } else {
                const localTime = new Date(local.updatedAt || 0).getTime();
                const backendTime = new Date(matrixToUse.updatedAt || 0).getTime();
                const localColsCount = local.columns?.length || 0;
                const backendColsCount = matrixToUse.columns?.length || 0;
                // If local is newer or has more columns, prioritize local and push it to backend
                if (localTime > backendTime || localColsCount > backendColsCount) {
                  matrixToUse = local;
                  saveDailyAgendaMatrix(local).catch(err => console.warn('Background sync local to backend:', err));
                }
              }
            }
          }
        } catch (e) {
          console.warn('Cache check error:', e);
        }

        if (matrixToUse) {
          const loadedCols = (matrixToUse.columns && matrixToUse.columns.length > 0) ? matrixToUse.columns : STANDARD_DEFAULT_COLUMNS;
          setColumns(loadedCols);
          if (loadedCols[0]) {
            setNewLogColId(loadedCols[0].id);
          }
          if (matrixToUse.title) setMatrixTitle(matrixToUse.title);

          let initialCellChecklists: Record<string, DailyAgendaChecklistItem[]> = {};

          if (matrixToUse.cellChecklists && Object.keys(matrixToUse.cellChecklists).length > 0) {
            initialCellChecklists = matrixToUse.cellChecklists;
          } else if (matrixToUse.taskItems && matrixToUse.taskItems.length > 0) {
            setTaskItems(matrixToUse.taskItems);
            matrixToUse.taskItems.forEach(t => {
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

  // Explicit Save Matrix Helper (Backend DB + Synchronous Local Backup)
  const saveMatrixToDatabase = async (
    overrideCells?: Record<string, DailyAgendaChecklistItem[]>,
    overrideCols?: DailyAgendaColumn[],
    overrideDates?: string[],
    showToast = false
  ) => {
    const targetCells = overrideCells || cellChecklists;
    const targetCols = overrideCols || columns;
    const targetDates = overrideDates || (sortedDates.length > 0 ? sortedDates : dateList);

    if (targetCols.length === 0 && Object.keys(targetCells).length === 0 && targetDates.length === 0) return;

    const snapshotRows: DailyAgendaRow[] = targetDates.map(dateStr => ({
      id: 'r_' + dateStr,
      date: dateStr,
      tasks: {}
    }));

    const matrixData: DailyAgendaMatrix = {
      id: 'main_daily_matrix',
      title: matrixTitle,
      columns: targetCols,
      rows: snapshotRows,
      taskItems,
      cellChecklists: targetCells,
      updatedAt: new Date().toISOString()
    };

    // 1. Immediately write to local storage as synchronous local backup
    try {
      localStorage.setItem('jk_daily_agenda_matrices', JSON.stringify([matrixData]));
    } catch (e) {
      console.warn('LocalStorage backup error:', e);
    }

    // 2. Immediately write to backend DB
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
    }
  };

  // Debounced Auto-Save on ANY Change (Runs ONLY AFTER initial data load is complete)
  useEffect(() => {
    if (!isLoadedRef.current) return;
    if (columns.length === 0 && Object.keys(cellChecklists).length === 0) return;

    const timer = setTimeout(() => {
      saveMatrixToDatabase(undefined, undefined, undefined, false);
    }, 200);

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
    saveMatrixToDatabase(nextCellChecklists, newColsList, nextDates, false);
    onAddToast(`Added column "${newCol.title}" with default checklist items.`, 'success');
  };

  // Save Edited Column Title
  const handleSaveEditColumn = (colId: string) => {
    const trimmed = editColTitle.trim();
    if (!trimmed) {
      setEditingColId(null);
      return;
    }
    const updatedCols = columns.map(c => c.id === colId ? { ...c, title: trimmed } : c);
    setColumns(updatedCols);
    setEditingColId(null);
    setEditColTitle('');
    saveMatrixToDatabase(cellChecklists, updatedCols, dateList, false);
    onAddToast(`Column renamed to "${trimmed}".`, 'success');
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

    const { nextCellChecklists, nextDates } = syncAutoRollover(nextCells, remainingCols);
    setColumns(remainingCols);
    setCellChecklists(nextCellChecklists);
    setDateList(nextDates);
    saveMatrixToDatabase(nextCellChecklists, remainingCols, nextDates, false);
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
      saveMatrixToDatabase(nextCellChecklists, columns, nextDates, false);
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
      saveMatrixToDatabase(nextCellChecklists, columns, nextDates, false);
      onAddToast(`Added date row for ${targetDate}.`, 'success');
    }
  };

  // Toggle Checkbox Done Status
  const handleToggleItem = (dateStr: string, colId: string, itemId: string) => {
    const cellKey = `${dateStr}__${colId}`;
    const today = getTodayStr();
    const user = getCurrentUserIdentifier();

    const list = cellChecklists[cellKey] ? [...cellChecklists[cellKey]] : [];
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
    saveMatrixToDatabase(nextCellChecklists, columns, nextDates, false);
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

    const list = cellChecklists[cellKey] ? [...cellChecklists[cellKey]] : [];
    const updatedBase = {
      ...cellChecklists,
      [cellKey]: [...list, newItem]
    };

    const { nextCellChecklists, nextDates } = syncAutoRollover(updatedBase, columns);
    setCellChecklists(nextCellChecklists);
    setDateList(nextDates);
    setNewOptionInputs(prev => ({ ...prev, [cellKey]: '' }));
    saveMatrixToDatabase(nextCellChecklists, columns, nextDates, false);
    onAddToast(`Added option "${text}".`, 'success');
  };

  // Delete an Item from Cell (Protected: Completed items cannot be deleted)
  const handleDeleteItem = (dateStr: string, colId: string, itemId: string) => {
    const cellKey = `${dateStr}__${colId}`;
    const list = cellChecklists[cellKey] || [];
    const itemToDelete = list.find(i => i.id === itemId);
    if (itemToDelete?.completed) {
      onAddToast('Completed tasks cannot be deleted.', 'error');
      return;
    }

    const updatedBase = {
      ...cellChecklists,
      [cellKey]: list.filter(i => i.id !== itemId)
    };
    const { nextCellChecklists, nextDates } = syncAutoRollover(updatedBase, columns);
    setCellChecklists(nextCellChecklists);
    setDateList(nextDates);
    saveMatrixToDatabase(nextCellChecklists, columns, nextDates, false);
    onAddToast('Task removed.', 'info');
  };

  // Save Inline Edited Item Title (Completed Records CANNOT be modified)
  const handleSaveEditItem = (dateStr: string, colId: string, itemId: string) => {
    const trimmedTitle = editItemTitle.trim();
    if (!trimmedTitle) {
      setEditingItemKey(null);
      return;
    }
    const cellKey = `${dateStr}__${colId}`;
    const user = getCurrentUserIdentifier();
    const timestamp = getFormattedDateTime();

    const list = cellChecklists[cellKey] ? [...cellChecklists[cellKey]] : [];
    const targetItem = list.find((item, idx) => item.id === itemId || `chk_def_${idx}` === itemId);
    if (!targetItem) {
      setEditingItemKey(null);
      return;
    }

    // Guard: Completed records cannot be updated
    if (targetItem.completed) {
      onAddToast('Completed tasks cannot be modified.', 'error');
      setEditingItemKey(null);
      return;
    }

    const isTitleChanged = targetItem.title !== trimmedTitle;
    const currentCount = targetItem.updateCount || 0;
    const nextCount = isTitleChanged ? currentCount + 1 : currentCount;

    const newHistoryEntry: DailyAgendaChecklistItemHistory = {
      updatedBy: user,
      updatedAt: timestamp,
      oldTitle: targetItem.title,
      newTitle: trimmedTitle,
      note: `Title changed from "${targetItem.title}" to "${trimmedTitle}"`
    };

    const existingHistory = Array.isArray(targetItem.updateHistory) ? targetItem.updateHistory : [];
    const nextHistory = isTitleChanged ? [...existingHistory, newHistoryEntry] : existingHistory;

    const rootId = targetItem.carriedFromId || targetItem.id;
    const targetNormTitle = normalizeTaskTitle(targetItem.title);

    // Synchronize the updated task across all cell dates so earlier/carried dates stay in sync
    const updatedBase: Record<string, DailyAgendaChecklistItem[]> = {};
    Object.entries(cellChecklists).forEach(([k, cellItems]) => {
      updatedBase[k] = (cellItems || []).map((item, idx) => {
        const matchesId = item.id === itemId || `chk_def_${idx}` === itemId;
        const matchesRoot = rootId && (item.id === rootId || item.carriedFromId === rootId);
        const matchesTitle = targetNormTitle && normalizeTaskTitle(item.title) === targetNormTitle;

        if (matchesId || matchesRoot || matchesTitle) {
          if (item.completed) {
            return item; // Do not modify locked completed items
          }
          return {
            ...item,
            title: trimmedTitle,
            updatedBy: user,
            updatedAt: timestamp,
            updateCount: nextCount,
            updateHistory: nextHistory
          };
        }
        return item;
      });
    });

    const { nextCellChecklists, nextDates } = syncAutoRollover(updatedBase, columns);
    setCellChecklists(nextCellChecklists);
    setDateList(nextDates);
    setEditingItemKey(null);
    setEditItemTitle('');
    saveMatrixToDatabase(nextCellChecklists, columns, nextDates, false);
    onAddToast('Task updated successfully.', 'success');
  };

  // Toggle All Items in Cell
  const handleToggleAllCell = (dateStr: string, colId: string, completeAll: boolean) => {
    const cellKey = `${dateStr}__${colId}`;
    const today = getTodayStr();
    const user = getCurrentUserIdentifier();

    const list = cellChecklists[cellKey] ? [...cellChecklists[cellKey]] : [];
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
    saveMatrixToDatabase(nextCellChecklists, columns, nextDates, false);
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
    saveMatrixToDatabase(nextCellChecklists, columns, nextDates, false);
    onAddToast('Reset cell to default checklist items.', 'info');
  };

  // Print Handler - Generates clean, standalone printable report window with complete matrix data
  const handlePrint = (targetSpecificDate?: string | React.MouseEvent, specificFilter?: 'ALL' | 'INCOMPLETE' | 'COMPLETED') => {
    const specificDate = typeof targetSpecificDate === 'string' ? targetSpecificDate : undefined;
    const today = getTodayStr();
    const currentUser = getCurrentUserIdentifier();
    const printedAt = getFormattedDateTime();

    const escapeHtml = (str: string) => {
      return (str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    // Determine target dates to include
    let datesToPrint: string[] = [];
    if (specificDate) {
      datesToPrint = [specificDate];
    } else {
      const targetDates = sortedDates.filter(dateStr => {
        if (statusFilter === 'ALL') return true;
        if (statusFilter === 'COMPLETED') {
          return columns.some(col => {
            const items = cellChecklists[`${dateStr}__${col.id}`] || [];
            return items.some(i => i.completed);
          });
        }
        if (statusFilter === 'IN_PROGRESS') {
          return dateStr === today;
        }
        if (statusFilter === 'UPCOMING') {
          return dateStr > today;
        }
        return true;
      });
      datesToPrint = targetDates.length > 0 ? targetDates : sortedDates;
    }

    // Determine task filter
    const activeTaskFilter = specificFilter || (statusFilter === 'COMPLETED' ? 'COMPLETED' : statusFilter === 'IN_PROGRESS' ? 'INCOMPLETE' : 'ALL');

    // Calculate overall statistics across included dates
    let totalTasks = 0;
    let completedTasks = 0;
    let pendingTasks = 0;
    let carriedTasks = 0;

    datesToPrint.forEach(dateStr => {
      columns.forEach(col => {
        let items = cellChecklists[`${dateStr}__${col.id}`] || [];
        if (activeTaskFilter === 'COMPLETED') {
          items = items.filter(i => i.completed);
        } else if (activeTaskFilter === 'INCOMPLETE') {
          items = items.filter(i => !i.completed);
        }
        totalTasks += items.length;
        completedTasks += items.filter(i => i.completed).length;
        pendingTasks += items.filter(i => !i.completed).length;
        carriedTasks += items.filter(i => !!i.carriedFromDate).length;
      });
    });

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Build Date Sections HTML
    const dateSectionsHtml = datesToPrint.map(dateStr => {
      const isToday = dateStr === today;
      const isTomorrow = dateStr === getTomorrowStr(today);
      const tagLabel = isToday ? 'TODAY' : isTomorrow ? 'TOMORROW' : dateStr > today ? 'UPCOMING' : 'PAST';
      const tagBg = isToday ? '#16a34a' : isTomorrow ? '#f59e0b' : dateStr > today ? '#0284c7' : '#64748b';
      const readableDate = formatReadableDate(dateStr);

      // Date stats
      let dateTotal = 0;
      let dateDone = 0;
      columns.forEach(col => {
        let items = cellChecklists[`${dateStr}__${col.id}`] || [];
        if (activeTaskFilter === 'COMPLETED') items = items.filter(i => i.completed);
        else if (activeTaskFilter === 'INCOMPLETE') items = items.filter(i => !i.completed);
        dateTotal += items.length;
        dateDone += items.filter(i => i.completed).length;
      });

      const columnsHtml = columns.map(col => {
        let items = cellChecklists[`${dateStr}__${col.id}`] || [];
        if (activeTaskFilter === 'COMPLETED') items = items.filter(i => i.completed);
        else if (activeTaskFilter === 'INCOMPLETE') items = items.filter(i => !i.completed);

        const itemsRowsHtml = items.length > 0 ? items.map((item, idx) => {
          const isDone = !!item.completed;
          const statusBadge = isDone
            ? `<span style="background-color: #dcfce7; color: #166534; border: 1px solid #86efac; padding: 2px 7px; border-radius: 4px; font-weight: 700; font-size: 10px; white-space: nowrap;">&#10004; DONE</span>`
            : `<span style="background-color: #fef9c3; color: #854d0e; border: 1px solid #fde047; padding: 2px 7px; border-radius: 4px; font-weight: 700; font-size: 10px; white-space: nowrap;">&#9675; PENDING</span>`;

          const carriedHtml = item.carriedFromDate
            ? `<div style="font-size: 10.5px; color: #4338ca; margin-top: 2px; font-weight: 600;">&#8627; Carried forward from ${escapeHtml(item.carriedFromDate)}</div>`
            : '';

          const auditDetails: string[] = [];
          if (item.createdBy) {
            auditDetails.push(`Created by: <strong>${escapeHtml(item.createdBy)}</strong>${item.createdAt ? ` (${escapeHtml(item.createdAt)})` : ''}`);
          }
          if (isDone && item.completedBy) {
            auditDetails.push(`Completed by: <strong>${escapeHtml(item.completedBy)}</strong>${item.completedDate ? ` on ${escapeHtml(item.completedDate)}` : ''}`);
          }
          if ((item.updateCount || 0) > 0) {
            auditDetails.push(`Updated: ${item.updateCount}x`);
          }

          const auditHtml = auditDetails.length > 0
            ? `<div style="font-size: 10px; color: #64748b; margin-top: 3px; line-height: 1.3;">${auditDetails.join(' &bull; ')}</div>`
            : '';

          return `
            <tr style="background-color: ${isDone ? '#f8fafc' : '#ffffff'}; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 6px 8px; text-align: center; width: 32px; color: #64748b; font-size: 11px;">${idx + 1}</td>
              <td style="padding: 6px 8px; text-align: center; width: 90px;">${statusBadge}</td>
              <td style="padding: 6px 10px; vertical-align: middle;">
                <div style="font-size: 12px; color: ${isDone ? '#334155' : '#0f172a'}; font-weight: ${isDone ? '500' : '600'};">
                  ${escapeHtml(item.title)}
                </div>
                ${carriedHtml}
                ${auditHtml}
              </td>
            </tr>
          `;
        }).join('') : `
          <tr>
            <td colspan="3" style="padding: 10px; text-align: center; color: #94a3b8; font-size: 11px; font-style: italic;">
              No tasks recorded in this column.
            </td>
          </tr>
        `;

        return `
          <div style="margin-bottom: 12px; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: #ffffff;">
            <div style="background-color: #f1f5f9; padding: 6px 10px; font-weight: 700; font-size: 12px; color: #1e293b; border-bottom: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: center;">
              <span>&#9670; ${escapeHtml(col.title)}</span>
              <span style="font-size: 10.5px; font-weight: 600; color: #475569;">(${items.length} tasks)</span>
            </div>
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="background-color: #f8fafc; border-bottom: 1px solid #cbd5e1; font-size: 10px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">
                  <th style="padding: 5px 8px; text-align: center; width: 32px;">#</th>
                  <th style="padding: 5px 8px; text-align: center; width: 90px;">Status</th>
                  <th style="padding: 5px 10px;">Task Description &amp; Audit Trail</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRowsHtml}
              </tbody>
            </table>
          </div>
        `;
      }).join('');

      return `
        <div class="date-block" style="margin-bottom: 18px; border: 1.5px solid #94a3b8; border-radius: 8px; overflow: hidden; background-color: #ffffff; page-break-inside: avoid;">
          <div style="background: linear-gradient(90deg, #1e293b 0%, #334155 100%); color: #ffffff; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 14px; font-weight: 700;">&#128197; ${escapeHtml(readableDate)}</span>
              <span style="font-size: 11px; color: #cbd5e1; font-family: monospace;">(${escapeHtml(dateStr)})</span>
              <span style="background-color: ${tagBg}; color: #ffffff; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">${tagLabel}</span>
            </div>
            <div style="font-size: 11.5px; font-weight: 600; background: rgba(255,255,255,0.15); padding: 2px 8px; border-radius: 10px;">
              Progress: ${dateDone} / ${dateTotal} Tasks Done (${dateTotal > 0 ? Math.round((dateDone / dateTotal) * 100) : 0}%)
            </div>
          </div>
          <div style="padding: 10px;">
            ${columnsHtml}
          </div>
        </div>
      `;
    }).join('');

    const filterNameMap: Record<string, string> = {
      ALL: 'All Tasks & Dates',
      COMPLETED: 'Completed Tasks Only',
      IN_PROGRESS: 'In Progress / Today Only',
      INCOMPLETE: 'Pending Incomplete Tasks Only',
      UPCOMING: 'Upcoming Scheduled Dates'
    };
    const activeFilterLabel = specificDate 
      ? `Single Date (${specificDate})` 
      : (filterNameMap[activeTaskFilter] || activeTaskFilter);

    const reportHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Construction Follow-up Matrix Report - ${escapeHtml(today)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 10mm 12mm 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background-color: #f8fafc;
      padding: 14px;
      font-size: 12px;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-wrapper {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      padding: 20px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .no-print-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: #0284c7;
      color: #ffffff;
      padding: 10px 16px;
      border-radius: 6px;
      margin-bottom: 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .no-print-toolbar button {
      background: #ffffff;
      color: #0284c7;
      border: none;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .no-print-toolbar button:hover {
      background: #f0fdf4;
    }
    .report-header {
      border-bottom: 2.5px solid #0284c7;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }
    .kpi-card {
      background-color: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 10px;
      text-align: center;
    }
    .kpi-num {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 2px;
    }
    .kpi-label {
      font-size: 9.5px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .print-wrapper {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
      .no-print, .no-print-toolbar {
        display: none !important;
      }
      .date-block {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="print-wrapper">
    <!-- Screen-only Print Bar -->
    <div class="no-print-toolbar">
      <div>
        <strong>&#128438; Print Preview:</strong> Daily Construction Follow-up Matrix Report
      </div>
      <div style="display: flex; gap: 8px;">
        <button onclick="window.print()">&#128438; Print / Save as PDF</button>
        <button onclick="window.close()" style="background: rgba(255,255,255,0.2); color: #ffffff; border: 1px solid #ffffff;">Close Window</button>
      </div>
    </div>

    <!-- Official Report Header -->
    <div class="report-header">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h1 style="font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px;">${escapeHtml((profile.companyName || 'CONSTRUCTION MANAGEMENT').toUpperCase())} PROJECTS</h1>
          <h2 style="font-size: 12.5px; font-weight: 600; color: #0284c7; margin-top: 2px;">Daily Construction Follow-up Matrix &amp; Work Item Report</h2>
        </div>
        <div style="text-align: right; font-size: 11px; color: #475569;">
          <div><strong>Printed On:</strong> ${escapeHtml(printedAt)}</div>
          <div><strong>Generated By:</strong> ${escapeHtml(currentUser)}</div>
          <div><strong>Filter:</strong> <span style="background: #e0f2fe; color: #0369a1; padding: 1px 6px; border-radius: 3px; font-weight: 600;">${escapeHtml(activeFilterLabel)}</span></div>
        </div>
      </div>
    </div>

    <!-- Executive KPI Summary -->
    <div class="kpi-grid">
      <div class="kpi-card" style="border-left: 4px solid #3b82f6;">
        <div class="kpi-label">Dates Included</div>
        <div class="kpi-num">${datesToPrint.length}</div>
      </div>
      <div class="kpi-card" style="border-left: 4px solid #16a34a;">
        <div class="kpi-label">Completed Tasks</div>
        <div class="kpi-num" style="color: #16a34a;">${completedTasks} <span style="font-size: 12px; font-weight: 600;">(${completionRate}%)</span></div>
      </div>
      <div class="kpi-card" style="border-left: 4px solid #eab308;">
        <div class="kpi-label">Pending Tasks</div>
        <div class="kpi-num" style="color: #ca8a04;">${pendingTasks}</div>
      </div>
      <div class="kpi-card" style="border-left: 4px solid #6366f1;">
        <div class="kpi-label">Total Work Items</div>
        <div class="kpi-num" style="color: #4f46e5;">${totalTasks}</div>
      </div>
    </div>

    <!-- Date-by-Date Follow-up Matrix Content -->
    ${dateSectionsHtml}

    <!-- Footer -->
    <div style="border-top: 1px solid #e2e8f0; margin-top: 20px; padding-top: 8px; display: flex; justify-content: space-between; font-size: 9.5px; color: #94a3b8;">
      <div>${escapeHtml(profile.companyName || 'Management System')} &bull; Confidential Construction Progress Log</div>
      <div>End of Report</div>
    </div>
  </div>

  <script>
    // Automatically trigger print dialog once document is ready
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 350);
    });
  </script>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=980,height=850');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(reportHtml);
      printWindow.document.close();
    } else {
      onAddToast('Print popup was blocked by your browser. Please allow popups for this site.', 'error');
    }
  };

  // Formatted date helper for display: e.g. "Mon, 31 Aug 2026"
  const formatReadableDate = (dateStr: string): string => {
    try {
      const parts = dateStr.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
      }
    } catch (e) {
      // fallback
    }
    return dateStr;
  };

  // Generate WhatsApp / Clipboard formatted text for a given date
  const generateDateShareText = (
    targetDate: string,
    filter: 'ALL' | 'INCOMPLETE' | 'COMPLETED' = shareFilter,
    includeAudit: boolean = shareIncludeAudit,
    customNote: string = shareCustomNote
  ): string => {
    const today = getTodayStr();
    const isToday = targetDate === today;
    const isTomorrow = targetDate === getTomorrowStr(today);
    const dateTag = isToday ? 'TODAY' : (isTomorrow ? 'TOMORROW' : 'UPCOMING');
    const readableDate = formatReadableDate(targetDate);

    let totalTasks = 0;
    let completedTasks = 0;
    let pendingTasks = 0;

    // Count all tasks across all columns for this date
    columns.forEach(col => {
      const cellKey = `${targetDate}__${col.id}`;
      const items = cellChecklists[cellKey] || [];
      totalTasks += items.length;
      completedTasks += items.filter(i => i.completed).length;
      pendingTasks += items.filter(i => !i.completed).length;
    });

    const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const lines: string[] = [];
    lines.push(`🏗️ *${(profile.companyName || 'Management System').toUpperCase()} - DAILY WORK FOLLOW-UP*`);
    lines.push(`📅 *Date:* ${readableDate} (${targetDate} • ${dateTag})`);
    lines.push(`📊 *Progress Status:* ${completedTasks}/${totalTasks} Tasks Done (${completionPercent}%)`);

    if (customNote && customNote.trim()) {
      lines.push(`💬 *Note:* ${customNote.trim()}`);
    }

    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    let anyItemsIncluded = false;

    columns.forEach(col => {
      const cellKey = `${targetDate}__${col.id}`;
      let items = cellChecklists[cellKey] || [];

      if (filter === 'INCOMPLETE') {
        items = items.filter(i => !i.completed);
      } else if (filter === 'COMPLETED') {
        items = items.filter(i => i.completed);
      }

      if (items.length > 0) {
        anyItemsIncluded = true;
        const filterSuffix = filter === 'INCOMPLETE' ? ' - Pending Only' : (filter === 'COMPLETED' ? ' - Completed Only' : '');
        lines.push(`📋 *${col.title.toUpperCase()}${filterSuffix}* (${items.length}):`);

        items.forEach((item, idx) => {
          const statusIcon = item.completed ? '✅' : '🔲';
          let itemLine = `${statusIcon} ${idx + 1}. ${item.title}`;

          if (item.carriedFromDate) {
            itemLine += ` _(↪️ From ${item.carriedFromDate})_`;
          }

          if (item.completed && item.completedDate) {
            itemLine += ` _[Done ${item.completedDate}${item.completedBy ? ` by ${item.completedBy}` : ''}]_`;
          }

          lines.push(itemLine);

          if (includeAudit) {
            const auditParts: string[] = [];
            if (item.createdBy || item.createdAt) {
              auditParts.push(`Created: ${item.createdBy || 'admin'} (${item.createdAt || ''})`);
            }
            if (item.updatedBy && item.updatedAt) {
              auditParts.push(`Updated: ${item.updatedBy} (${item.updatedAt})`);
            }
            if (auditParts.length > 0) {
              lines.push(`   └ ℹ️ ${auditParts.join(' | ')}`);
            }
          }
        });
        lines.push(``);
      }
    });

    if (!anyItemsIncluded) {
      lines.push(`_No tasks matching filter: ${filter === 'INCOMPLETE' ? 'Pending Tasks' : (filter === 'COMPLETED' ? 'Completed Tasks' : 'All Tasks')}._`);
      lines.push(``);
    }

    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`📌 *Summary:* ✅ ${completedTasks} Completed | ⏳ ${pendingTasks} Pending | 🎯 ${totalTasks} Total`);
    lines.push(`🏢 *${profile.companyName || 'Real Estate Management'}* | 🌐 ${window.location.origin}`);
    lines.push(`🕒 _Generated: ${getFormattedDateTime()}_`);

    return lines.join('\n');
  };

  // Generate High-Resolution Official Follow-up PDF Document using jsPDF
  const generateDateFollowupPDF = async (
    targetDate: string,
    filter: 'ALL' | 'INCOMPLETE' | 'COMPLETED' = shareFilter,
    includeAudit: boolean = shareIncludeAudit,
    customNote: string = shareCustomNote
  ): Promise<jsPDF> => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // 1. Top Decorative Brand Navy Bar
    doc.setFillColor(15, 43, 70);
    doc.rect(0, 0, 210, 5, 'F');

    // Load Logo if available
    let logoData: { base64: string, ratio: number } | null = null;
    try {
      logoData = await new Promise<{ base64: string, ratio: number }>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = profile.logoUrl || logoImg;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve({ base64: canvas.toDataURL('image/png'), ratio: img.naturalWidth / img.naturalHeight });
          } else {
            reject(new Error('Canvas error'));
          }
        };
        img.onerror = (e) => reject(e);
      });
    } catch (e) {
      // fallback
    }

    if (logoData) {
      doc.addImage(logoData.base64, 'PNG', 15, 10, 14 * logoData.ratio, 14);
    } else {
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 43, 70);
      doc.text((profile.companyName || 'Management System').toUpperCase(), 15, 20);
    }

    // Right Header Company Info
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    if (profile.registeredOffice) {
      doc.text(profile.registeredOffice.substring(0, 48), 125, 12);
      if (profile.registeredOffice.length > 48) {
        doc.text(profile.registeredOffice.substring(48, 96), 125, 16);
      }
    }
    doc.text(`Call: ${profile.primaryPhone || ''} | Email: ${profile.email || ''}`, 125, 20);
    doc.text(`Web: ${window.location.origin}`, 125, 24);

    // Divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(15, 28, 195, 28);

    // Title Banner
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(15, 31, 180, 16, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(15, 31, 180, 16, 2, 2, 'D');

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('DAILY CONSTRUCTION FOLLOW-UP CHECKLIST', 20, 38);

    const readableDate = formatReadableDate(targetDate);
    const today = getTodayStr();
    const isToday = targetDate === today;
    const isTomorrow = targetDate === getTomorrowStr(today);
    const tagLabel = isToday ? 'TODAY' : isTomorrow ? 'TOMORROW' : targetDate > today ? 'UPCOMING' : 'PAST';

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(`Planned Date: ${readableDate} (${targetDate} • ${tagLabel})`, 20, 43.5);

    // Statistics calculation
    let totalTasks = 0;
    let completedTasks = 0;
    let pendingTasks = 0;

    columns.forEach(col => {
      const cellKey = `${targetDate}__${col.id}`;
      let items = cellChecklists[cellKey] || [];
      if (filter === 'INCOMPLETE') items = items.filter(i => !i.completed);
      else if (filter === 'COMPLETED') items = items.filter(i => i.completed);
      totalTasks += items.length;
      completedTasks += items.filter(i => i.completed).length;
      pendingTasks += items.filter(i => !i.completed).length;
    });

    const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // KPI Progress Row
    let currentY = 50;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, currentY, 180, 10, 1.5, 1.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, currentY, 180, 10, 1.5, 1.5, 'D');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(2, 132, 199);
    doc.text(`Progress: ${completedTasks} of ${totalTasks} Tasks Done (${completionPercent}%)`, 20, currentY + 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Done: ${completedTasks}  |  Pending: ${pendingTasks}  |  Filter: ${filter === 'INCOMPLETE' ? 'Pending Only' : filter === 'COMPLETED' ? 'Completed Only' : 'All Tasks'}`, 105, currentY + 6.5);

    currentY += 13;

    // Custom Note if present
    if (customNote && customNote.trim()) {
      doc.setFillColor(254, 252, 232);
      doc.setDrawColor(254, 240, 138);
      doc.roundedRect(15, currentY, 180, 9, 1.5, 1.5, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(133, 77, 14);
      doc.text(`Site Note: ${customNote.trim()}`, 20, currentY + 6);
      currentY += 12;
    }

    // Iterate over columns & checklist items
    columns.forEach((col, colIdx) => {
      const cellKey = `${targetDate}__${col.id}`;
      let items = cellChecklists[cellKey] || [];
      if (filter === 'INCOMPLETE') items = items.filter(i => !i.completed);
      else if (filter === 'COMPLETED') items = items.filter(i => i.completed);

      if (items.length === 0) return;

      // Check page break for column header
      if (currentY > 260) {
        doc.addPage();
        currentY = 20;
      }

      // Column Header Banner
      doc.setFillColor(30, 41, 59); // Slate 800
      doc.roundedRect(15, currentY, 180, 7, 1, 1, 'F');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`${colIdx + 1}. ${col.title.toUpperCase()} (${items.length} Tasks)`, 20, currentY + 5);
      currentY += 9;

      // Checklist Items
      items.forEach((item, itemIdx) => {
        // Check page break
        if (currentY > 265) {
          doc.addPage();
          currentY = 20;
        }

        const isDone = !!item.completed;

        // Item Row Box
        doc.setFillColor(isDone ? 240 : 255, isDone ? 253 : 255, isDone ? 244 : 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(15, currentY, 180, includeAudit ? 11 : 8, 1, 1, 'FD');

        // Checkbox Square
        doc.setDrawColor(isDone ? 22 : 100, isDone ? 101 : 116, isDone ? 52 : 139);
        doc.setFillColor(isDone ? 22 : 255, isDone ? 163 : 255, isDone ? 74 : 255);
        doc.roundedRect(19, currentY + 2, 4, 4, 0.5, 0.5, 'FD');

        if (isDone) {
          doc.setFontSize(7);
          doc.setTextColor(255, 255, 255);
          doc.text('v', 20.2, currentY + 5);
        }

        // Item Title
        doc.setFontSize(8.5);
        doc.setFont('helvetica', isDone ? 'normal' : 'bold');
        doc.setTextColor(isDone ? 71 : 15, isDone ? 85 : 23, isDone ? 105 : 42);

        let itemTitleText = `${itemIdx + 1}. ${item.title}`;
        if (item.carriedFromDate) {
          itemTitleText += ` [Carried from ${item.carriedFromDate}]`;
        }
        doc.text(itemTitleText, 26, currentY + 5);

        // Status pill on right
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        if (isDone) {
          doc.setTextColor(22, 101, 52);
          doc.text('COMPLETED', 168, currentY + 5);
        } else {
          doc.setTextColor(180, 83, 9);
          doc.text('PENDING', 170, currentY + 5);
        }

        // Audit info line
        if (includeAudit) {
          doc.setFontSize(6.8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(148, 163, 184);
          const auditParts: string[] = [];
          if (item.createdBy) auditParts.push(`Created by: ${item.createdBy}${item.createdAt ? ` (${item.createdAt})` : ''}`);
          if (isDone && item.completedBy) auditParts.push(`Completed: ${item.completedBy}${item.completedDate ? ` on ${item.completedDate}` : ''}`);
          if ((item.updateCount || 0) > 0) auditParts.push(`Updated ${item.updateCount}x`);
          if (auditParts.length > 0) {
            doc.text(auditParts.join('  •  '), 26, currentY + 9);
          }
        }

        currentY += includeAudit ? 13 : 9.5;
      });

      currentY += 3;
    });

    // Add Page Numbers & Footer to all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.line(15, 283, 195, 283);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`${profile.companyName || 'Management System'} • Daily Construction Follow-up Progress Log`, 15, 288);
      doc.text(`Page ${i} of ${totalPages}`, 175, 288);
    }

    return doc;
  };

  // Direct Download PDF Handler
  const handleDownloadDatePDF = async (
    targetDate: string,
    filter = shareFilter,
    includeAudit = shareIncludeAudit,
    customNote = shareCustomNote
  ) => {
    setIsGeneratingPDF(true);
    onAddToast('Generating PDF file...', 'info');
    try {
      const doc = await generateDateFollowupPDF(targetDate, filter, includeAudit, customNote);
      const filePrefix = (profile.companyName || 'Company').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${filePrefix}_Followup_${targetDate}.pdf`;
      doc.save(filename);
      onAddToast(`Downloaded ${filename} successfully!`, 'success');
    } catch (e) {
      console.error('PDF generation error:', e);
      onAddToast('Failed to generate PDF file.', 'error');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Share Attached PDF File (Uses Web Share API with attached File object when supported)
  const handleShareAttachedPDF = async (
    targetDate: string,
    filter = shareFilter,
    includeAudit = shareIncludeAudit,
    customNote = shareCustomNote
  ) => {
    setIsGeneratingPDF(true);
    onAddToast('Generating attached PDF document...', 'info');
    try {
      const doc = await generateDateFollowupPDF(targetDate, filter, includeAudit, customNote);
      const filePrefix = (profile.companyName || 'Company').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${filePrefix}_Followup_${targetDate}.pdf`;
      const pdfBlob = doc.output('blob');
      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
      const summaryText = generateDateShareText(targetDate, filter, includeAudit, customNote);

      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: `${profile.companyName || 'Company'} Follow-up - ${targetDate}`,
          text: summaryText,
          files: [pdfFile]
        });
        onAddToast('Attached PDF shared successfully!', 'success');
      } else {
        // Fallback for desktop browsers without file share support: Download file + copy text
        doc.save(filename);
        await handleCopyDateShareText(targetDate, filter, includeAudit, customNote);
        onAddToast(`PDF file downloaded (${filename})! Please attach it to your message.`, 'info');
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error('Share PDF error:', e);
        onAddToast('Share was cancelled or not supported.', 'info');
      }
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Direct WhatsApp Share Handler (Downloads attached PDF and opens WhatsApp)
  const handleShareToWhatsApp = async (
    targetDate: string, 
    filter = shareFilter, 
    includeAudit = shareIncludeAudit, 
    customNote = shareCustomNote, 
    phone = shareRecipientPhone
  ) => {
    setIsGeneratingPDF(true);
    try {
      const doc = await generateDateFollowupPDF(targetDate, filter, includeAudit, customNote);
      const filePrefix = (profile.companyName || 'Company').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${filePrefix}_Followup_${targetDate}.pdf`;
      const pdfBlob = doc.output('blob');
      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
      const text = generateDateShareText(targetDate, filter, includeAudit, customNote);

      // On mobile devices supporting Web Share with files, trigger native share with file attached
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: `${profile.companyName || 'Company'} Follow-up - ${targetDate}`,
          text: text,
          files: [pdfFile]
        });
        onAddToast('Shared attached PDF on WhatsApp / Device!', 'success');
        return;
      }

      // For desktop / web: Auto-download the PDF and open WhatsApp chat
      doc.save(filename);
      const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
      let url = '';
      if (cleanPhone) {
        const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
      } else {
        url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      }
      window.open(url, '_blank');
      onAddToast(`PDF downloaded (${filename})! Attach the PDF in WhatsApp.`, 'success');
    } catch (e) {
      console.error('WhatsApp share error:', e);
      onAddToast('Failed to share PDF.', 'error');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Copy formatted text to clipboard
  const handleCopyDateShareText = async (
    targetDate: string, 
    filter = shareFilter, 
    includeAudit = shareIncludeAudit, 
    customNote = shareCustomNote
  ) => {
    const text = generateDateShareText(targetDate, filter, includeAudit, customNote);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2500);
      onAddToast(`Date ${targetDate} follow-up checklist copied to clipboard!`, 'success');
    } catch (e) {
      onAddToast('Failed to copy text to clipboard.', 'error');
    }
  };

  // Email Share Handler (Downloads PDF and opens Email Client)
  const handleEmailShare = async (
    targetDate: string, 
    filter = shareFilter, 
    includeAudit = shareIncludeAudit, 
    customNote = shareCustomNote
  ) => {
    setIsGeneratingPDF(true);
    try {
      const doc = await generateDateFollowupPDF(targetDate, filter, includeAudit, customNote);
      const filePrefix = (profile.companyName || 'Company').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${filePrefix}_Followup_${targetDate}.pdf`;
      const pdfBlob = doc.output('blob');
      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
      const text = generateDateShareText(targetDate, filter, includeAudit, customNote);

      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: `${profile.companyName || 'Company'} - Daily Follow-up for ${targetDate}`,
          text: text,
          files: [pdfFile]
        });
        onAddToast('Attached PDF shared via Email / Device!', 'success');
        return;
      }

      doc.save(filename);
      const subject = `${profile.companyName || 'Company'} - Daily Construction Follow-up for ${targetDate}`;
      const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
      window.open(mailtoUrl, '_blank');
      onAddToast(`PDF file downloaded (${filename})! Attach the PDF to your email.`, 'info');
    } catch (e) {
      console.error('Email share error:', e);
    } finally {
      setIsGeneratingPDF(false);
    }
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
        let items = cellChecklists[cellKey] || [];

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
        width: '150px',
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
            <div className="flex flex-column align-center gap-1.5 p-1">
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

              {/* Clean Single Date Share Button */}
              <div className="mt-1" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => {
                    setShareModalDate(dateStr);
                    setShareFilter('ALL');
                    setShareIncludeAudit(false);
                    setShareCustomNote('');
                    setCopiedSuccess(false);
                  }}
                  className="btn btn-xs flex align-center gap-1"
                  style={{
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    padding: '3px 10px',
                    fontSize: '0.72rem',
                    borderRadius: '4px',
                    fontWeight: 700,
                    boxShadow: '0 1px 3px rgba(2, 132, 199, 0.3)',
                    border: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                  title={`Share options for ${dateStr}`}
                >
                  <Share2 size={12} /> Share
                </button>
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
        label: (
          <div 
            className="flex align-center justify-between gap-1 w-full"
            onClick={e => e.stopPropagation()}
            style={{ minWidth: '150px' }}
          >
            {editingColId === col.id ? (
              <div className="flex align-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                <input
                  type="text"
                  className="form-control"
                  style={{
                    fontSize: '0.78rem',
                    padding: '2px 6px',
                    height: '26px',
                    width: '120px',
                    fontWeight: 700,
                    borderColor: '#0284c7',
                    backgroundColor: '#ffffff'
                  }}
                  value={editColTitle}
                  onChange={e => setEditColTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveEditColumn(col.id);
                    }
                    if (e.key === 'Escape') setEditingColId(null);
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  className="btn btn-xs flex align-center justify-center"
                  style={{
                    padding: '2px 5px',
                    height: '24px',
                    backgroundColor: '#16a34a',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleSaveEditColumn(col.id)}
                  title="Save Column Title"
                >
                  <Check size={12} />
                </button>
                <button
                  type="button"
                  className="btn btn-xs flex align-center justify-center"
                  style={{
                    padding: '2px 5px',
                    height: '24px',
                    backgroundColor: '#e2e8f0',
                    color: '#475569',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                  onClick={() => setEditingColId(null)}
                  title="Cancel"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="flex align-center justify-between w-full gap-1.5">
                <span 
                  className="font-bold text-xs cursor-pointer" 
                  style={{ color: '#0f2b46', letterSpacing: '0.5px' }}
                  onClick={() => {
                    setEditingColId(col.id);
                    setEditColTitle(col.title);
                  }}
                  title="Click to rename column"
                >
                  {col.title}
                </span>
                <div className="flex align-center gap-0.5">
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs p-1 text-muted"
                    style={{
                      height: '22px',
                      width: '22px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: '#475569'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingColId(col.id);
                      setEditColTitle(col.title);
                    }}
                    title={`Rename column "${col.title}"`}
                  >
                    <Edit2 size={12} />
                  </button>
                  {columns.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs p-1 text-danger"
                      style={{
                        height: '22px',
                        width: '22px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: '#ef4444'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteColumn(col.id, col.title);
                      }}
                      title={`Delete column "${col.title}"`}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ),
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
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs p-0 text-muted"
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '1px 3px', color: '#64748b' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingColId(col.id);
                      setEditColTitle(col.title);
                    }}
                    title={`Rename column "${col.title}"`}
                  >
                    <Edit2 size={11} />
                  </button>
                  {columns.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs p-0 text-danger"
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '1px 3px', color: '#ef4444' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteColumn(col.id, col.title);
                      }}
                      title={`Delete column "${col.title}"`}
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
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
                      <th style={{ textAlign: 'center', width: '45px', padding: '4px 6px', fontWeight: 600 }}>Done</th>
                      <th style={{ textAlign: 'center', width: '65px', padding: '4px 6px', fontWeight: 600 }}>Action</th>
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
                                          let hist = Array.isArray(item.updateHistory) ? [...item.updateHistory] : [];
                                          const uCount = item.updateCount || 0;
                                          if (hist.length === 0 && uCount > 0) {
                                            hist = [{
                                              updatedBy: item.updatedBy || 'admin',
                                              updatedAt: item.updatedAt || 'Recorded Update',
                                              oldTitle: item.title,
                                              newTitle: item.title,
                                              note: `Task was updated (${uCount} time${uCount > 1 ? 's' : ''})`
                                            }];
                                          }
                                          setViewHistoryItem({
                                            title: item.title,
                                            createdBy: item.createdBy,
                                            createdAt: item.createdAt,
                                            updateCount: item.updateCount,
                                            history: hist
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

                          {/* Action Column: Completed = Clean Lock icon; Unchecked = Clean Delete Trash icon (No colored boxes) */}
                          <td 
                            style={{ textAlign: 'center', verticalAlign: 'middle', padding: '4px 4px', width: '50px' }}
                            onClick={e => e.stopPropagation()}
                          >
                            <div className="flex align-center justify-center">
                              {isCompleted ? (
                                <span 
                                  style={{ color: '#94a3b8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                  title="Completed task is locked (Cannot be deleted or edited)"
                                >
                                  <Lock size={15} />
                                </span>
                              ) : (
                                <>
                                  {!isEditing && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteItem(dateStr, col.id, item.id);
                                      }}
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#ef4444',
                                        outline: 'none'
                                      }}
                                      title="Delete task"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </>
                              )}
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
  }, [columns, sortedDates, cellChecklists, editingItemKey, editItemTitle, editingDateRow, editDateValue, newOptionInputs, statusFilter, editingColId, editColTitle]);

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
              onClick={() => setIsManageColumnsOpen(true)}
              className="btn btn-outline btn-xs flex align-center gap-1"
              style={{ fontSize: '0.78rem', padding: '5px 10px', height: '30px', whiteSpace: 'nowrap', backgroundColor: '#ffffff', color: '#0f2b46', fontWeight: 600 }}
              title="Manage, rename, or delete columns"
            >
              <Settings size={13} /> Manage Columns ({columns.length})
            </button>

            <button 
              type="button"
              onClick={() => {
                setShareModalDate(getTodayStr());
                setShareFilter('ALL');
                setShareIncludeAudit(false);
                setShareCustomNote('');
                setCopiedSuccess(false);
              }} 
              className="btn btn-primary btn-sm flex align-center gap-1"
              style={{ backgroundColor: '#0284c7', borderColor: '#0284c7', color: '#ffffff' }}
              title="Open Date-wise Share Dialog"
            >
              <Share2 size={14} /> Share Date Agenda
            </button>

            <button onClick={() => handlePrint()} className="btn btn-outline btn-sm flex align-center gap-0.5">
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

      {/* Manage Columns Modal */}
      {isManageColumnsOpen && (
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
          onClick={() => setIsManageColumnsOpen(false)}
        >
          <div 
            className="admin-card p-4"
            style={{
              maxWidth: '520px',
              width: '100%',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              border: '1px solid #cbd5e1'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between align-center mb-3 border-bottom pb-2">
              <div className="flex align-center gap-1.5">
                <Settings size={20} className="text-primary" />
                <h3 className="m-0 text-base font-bold" style={{ color: '#0f172a' }}>Manage Matrix Columns</h3>
              </div>
              <button 
                type="button" 
                className="btn btn-ghost btn-sm p-1 text-muted"
                onClick={() => setIsManageColumnsOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-3">
              <p className="text-xs text-muted mb-2">
                Edit column titles or delete columns. At least one column must remain in the matrix.
              </p>
              <div style={{ maxHeight: '280px', overflowY: 'auto' }} className="border rounded">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '8px', textAlign: 'left', width: '40px' }}>#</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Column Title</th>
                      <th style={{ padding: '8px', textAlign: 'center', width: '90px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {columns.map((c, idx) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px', fontWeight: 600, color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '8px' }}>
                          {editingColId === c.id ? (
                            <div className="flex align-center gap-1">
                              <input
                                type="text"
                                className="form-control"
                                style={{ fontSize: '0.78rem', padding: '2px 6px', height: '26px', width: '100%' }}
                                value={editColTitle}
                                onChange={e => setEditColTitle(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveEditColumn(c.id);
                                  if (e.key === 'Escape') setEditingColId(null);
                                }}
                                autoFocus
                              />
                              <button
                                type="button"
                                className="btn btn-xs btn-primary p-1 flex align-center justify-center"
                                style={{ height: '24px', width: '24px' }}
                                onClick={() => handleSaveEditColumn(c.id)}
                                title="Save"
                              >
                                <Check size={12} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-xs btn-outline p-1 flex align-center justify-center"
                                style={{ height: '24px', width: '24px' }}
                                onClick={() => setEditingColId(null)}
                                title="Cancel"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <span className="font-bold text-dark">{c.title}</span>
                          )}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <div className="flex align-center justify-center gap-1">
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs p-1 text-muted"
                              onClick={() => {
                                setEditingColId(c.id);
                                setEditColTitle(c.title);
                              }}
                              title={`Rename column "${c.title}"`}
                            >
                              <Edit2 size={13} />
                            </button>
                            {columns.length > 1 && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs p-1 text-danger"
                                onClick={() => handleDeleteColumn(c.id, c.title)}
                                title={`Delete column "${c.title}"`}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-top">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setIsManageColumnsOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Date-wise Follow-up Share Modal */}
      {shareModalDate && (() => {
        const targetDate = shareModalDate;
        const isToday = targetDate === getTodayStr();
        const isTomorrow = targetDate === getTomorrowStr(getTodayStr());
        const readableDate = formatReadableDate(targetDate);

        let totalTasks = 0;
        let completedTasks = 0;
        let pendingTasks = 0;

        columns.forEach(col => {
          const cellKey = `${targetDate}__${col.id}`;
          const items = cellChecklists[cellKey] || [];
          totalTasks += items.length;
          completedTasks += items.filter(i => i.completed).length;
          pendingTasks += items.filter(i => !i.completed).length;
        });

        const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const currentShareText = generateDateShareText(targetDate, shareFilter, shareIncludeAudit, shareCustomNote);

        return (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '16px'
            }}
            onClick={() => setShareModalDate(null)}
          >
            <div 
              style={{
                maxWidth: '540px',
                width: '100%',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
                border: '1px solid #cbd5e1',
                overflow: 'hidden'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div 
                style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div 
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: '#e0f2fe',
                      color: '#0284c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Share2 size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                      Share Follow-up Checklist
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                        📅 {readableDate}
                      </span>
                      {isToday && (
                        <span style={{ backgroundColor: '#16a34a', color: '#fff', fontSize: '0.62rem', padding: '1px 6px', fontWeight: 700, borderRadius: '4px' }}>
                          TODAY
                        </span>
                      )}
                      {!isToday && isTomorrow && (
                        <span style={{ backgroundColor: '#f59e0b', color: '#fff', fontSize: '0.62rem', padding: '1px 6px', fontWeight: 700, borderRadius: '4px' }}>
                          TOMORROW
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Calendar Date Picker Switcher (Up to Tomorrow only, future dates disabled) */}
                  <input
                    type="date"
                    className="form-control"
                    max={getTomorrowStr(getTodayStr())}
                    style={{
                      fontSize: '0.78rem',
                      padding: '3px 8px',
                      height: '30px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1.5px solid #cbd5e1',
                      color: '#0f2b46',
                      backgroundColor: '#ffffff',
                      cursor: 'pointer'
                    }}
                    value={targetDate}
                    onChange={e => {
                      const selectedVal = e.target.value;
                      if (selectedVal) {
                        const maxAllowed = getTomorrowStr(getTodayStr());
                        if (selectedVal > maxAllowed) {
                          setShareModalDate(maxAllowed);
                          onAddToast('Future dates beyond tomorrow are disabled.', 'info');
                        } else {
                          setShareModalDate(selectedVal);
                        }
                      }
                    }}
                    title="Select date (Past, Today, or Tomorrow)"
                  />

                  <button 
                    type="button" 
                    onClick={() => setShareModalDate(null)}
                    style={{
                      border: 'none',
                      background: '#f1f5f9',
                      borderRadius: '50%',
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#64748b'
                    }}
                    title="Close"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Modal Body (Strict Vertical Flow - No horizontal scroll!) */}
              <div 
                style={{
                  padding: '16px 18px',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  flexGrow: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}
              >
                {/* Format Mode Selector: PDF Document vs Text */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '4px', backgroundColor: '#f1f5f9', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <button
                    type="button"
                    onClick={() => setShareFormat('PDF')}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: shareFormat === 'PDF' ? '#0f2b46' : 'transparent',
                      color: shareFormat === 'PDF' ? '#ffffff' : '#334155',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: shareFormat === 'PDF' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none'
                    }}
                  >
                    <FileText size={15} /> Attached PDF File (.pdf)
                  </button>

                  <button
                    type="button"
                    onClick={() => setShareFormat('TEXT')}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: shareFormat === 'TEXT' ? '#0f2b46' : 'transparent',
                      color: shareFormat === 'TEXT' ? '#ffffff' : '#334155',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: shareFormat === 'TEXT' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none'
                    }}
                  >
                    <MessageCircle size={15} /> Text Message
                  </button>
                </div>

                {/* 1. Progress Summary Ribbon */}
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: completionPercent === 100 ? '#f0fdf4' : '#eff6ff',
                    border: completionPercent === 100 ? '1px solid #bbf7d0' : '1px solid #bfdbfe'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1rem' }}>{completionPercent === 100 ? '🎉' : '📊'}</span>
                    <div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                        Progress: {completedTasks} of {totalTasks} Tasks Done ({completionPercent}%)
                      </span>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {pendingTasks} pending follow-up{pendingTasks === 1 ? '' : 's'} remaining
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span 
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#0f2b46'
                      }}
                    >
                      {totalTasks} Total Items
                    </span>
                  </div>
                </div>

                {/* 2. Task Filter Selection (3 Clear Buttons) */}
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    What tasks do you want to include in the PDF / Message?
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setShareFilter('ALL')}
                      style={{
                        padding: '7px 6px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: shareFilter === 'ALL' ? 700 : 500,
                        backgroundColor: shareFilter === 'ALL' ? '#0f2b46' : '#ffffff',
                        color: shareFilter === 'ALL' ? '#ffffff' : '#334155',
                        border: shareFilter === 'ALL' ? '1.5px solid #0f2b46' : '1px solid #cbd5e1',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      📋 All Tasks ({totalTasks})
                    </button>

                    <button
                      type="button"
                      onClick={() => setShareFilter('INCOMPLETE')}
                      style={{
                        padding: '7px 6px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: shareFilter === 'INCOMPLETE' ? 700 : 500,
                        backgroundColor: shareFilter === 'INCOMPLETE' ? '#ea580c' : '#fff7ed',
                        color: shareFilter === 'INCOMPLETE' ? '#ffffff' : '#c2410c',
                        border: shareFilter === 'INCOMPLETE' ? '1.5px solid #c2410c' : '1px solid #fed7aa',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      ⏳ Pending ({pendingTasks})
                    </button>

                    <button
                      type="button"
                      onClick={() => setShareFilter('COMPLETED')}
                      style={{
                        padding: '7px 6px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: shareFilter === 'COMPLETED' ? 700 : 500,
                        backgroundColor: shareFilter === 'COMPLETED' ? '#16a34a' : '#f0fdf4',
                        color: shareFilter === 'COMPLETED' ? '#ffffff' : '#166534',
                        border: shareFilter === 'COMPLETED' ? '1.5px solid #16a34a' : '1px solid #bbf7d0',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      ✅ Done ({completedTasks})
                    </button>
                  </div>
                </div>

                {/* 3. Direct Phone Number & Note (Optional) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '3px', display: 'block' }}>
                      Direct WhatsApp Mobile Number (Optional):
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRight: 'none', padding: '5px 10px', fontSize: '0.78rem', borderRadius: '6px 0 0 6px', color: '#475569', fontWeight: 700 }}>
                        +91
                      </span>
                      <input 
                        type="tel"
                        className="form-control"
                        style={{ fontSize: '0.78rem', padding: '5px 10px', height: '32px', borderRadius: '0 6px 6px 0', width: '100%' }}
                        placeholder="Enter 10-digit phone number (e.g. 9876543210)"
                        value={shareRecipientPhone}
                        onChange={e => setShareRecipientPhone(e.target.value)}
                        maxLength={13}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '3px', display: 'block' }}>
                      Custom Site Note / Remark (Optional):
                    </label>
                    <input 
                      type="text"
                      className="form-control"
                      style={{ fontSize: '0.78rem', padding: '5px 10px', height: '32px', borderRadius: '6px', width: '100%' }}
                      placeholder="e.g. Morning Site Briefing / Phase 1 Inspection"
                      value={shareCustomNote}
                      onChange={e => setShareCustomNote(e.target.value)}
                    />
                  </div>

                  {/* Audit details toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="checkbox"
                      id="chk_modal_audit"
                      checked={shareIncludeAudit}
                      onChange={e => setShareIncludeAudit(e.target.checked)}
                      style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                    />
                    <label htmlFor="chk_modal_audit" style={{ fontSize: '0.74rem', color: '#64748b', cursor: 'pointer', userSelect: 'none' }}>
                      Include creator names & timestamps in the PDF / message
                    </label>
                  </div>
                </div>

                {/* 4. Live Preview Box (PDF Attachment Card or Text Previews) */}
                {shareFormat === 'PDF' ? (
                  <div 
                    style={{
                      border: '1.5px dashed #0284c7',
                      borderRadius: '8px',
                      backgroundColor: '#f0f9ff',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div 
                          style={{
                            width: '38px',
                            height: '42px',
                            backgroundColor: '#ef4444',
                            borderRadius: '5px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                          }}
                        >
                          <FileText size={20} />
                          <span style={{ fontSize: '7px', fontWeight: 900, letterSpacing: '0.5px' }}>PDF</span>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f2b46' }}>
                            JK_Future_Followup_{targetDate}.pdf
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#0369a1' }}>
                            Attached Document • Official Letterhead • A4 Ready • {totalTasks} Tasks
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDownloadDatePDF(targetDate, shareFilter, shareIncludeAudit, shareCustomNote)}
                        className="btn btn-xs flex align-center gap-1"
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #0284c7',
                          color: '#0284c7',
                          padding: '4px 10px',
                          borderRadius: '5px',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                        title="Download PDF File directly to your device"
                      >
                        <Download size={13} /> Download PDF
                      </button>
                    </div>

                    <div style={{ fontSize: '0.72rem', color: '#475569', borderTop: '1px solid #e0f2fe', paddingTop: '6px' }}>
                      ℹ️ When clicking <strong>Share on WhatsApp</strong> or <strong>Email</strong>, this PDF file is generated and attached to your message.
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
                        Message Preview:
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyDateShareText(targetDate, shareFilter, shareIncludeAudit, shareCustomNote)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#0284c7',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: 0
                        }}
                      >
                        {copiedSuccess ? <CheckCheck size={13} style={{ color: '#16a34a' }} /> : <Copy size={12} />}
                        <span>{copiedSuccess ? 'Copied!' : 'Copy Preview'}</span>
                      </button>
                    </div>
                    <pre
                      style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        fontSize: '0.72rem',
                        lineHeight: '1.45',
                        color: '#1e293b',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        maxHeight: '140px',
                        overflowY: 'auto',
                        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                        margin: 0
                      }}
                    >
                      {currentShareText}
                    </pre>
                  </div>
                )}
              </div>

              {/* Modal Footer Action Buttons */}
              <div 
                style={{
                  padding: '12px 18px',
                  borderTop: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}
              >
                <button 
                  type="button" 
                  onClick={() => setShareModalDate(null)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {/* Download PDF Button */}
                  <button 
                    type="button"
                    onClick={() => handleDownloadDatePDF(targetDate, shareFilter, shareIncludeAudit, shareCustomNote)}
                    disabled={isGeneratingPDF}
                    style={{
                      padding: '7px 11px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#0f2b46',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: isGeneratingPDF ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                    title="Download Official PDF File"
                  >
                    <Download size={13} /> Download PDF
                  </button>

                  {/* Secondary Quick Share Actions */}
                  <button 
                    type="button"
                    onClick={() => handleShareAttachedPDF(targetDate, shareFilter, shareIncludeAudit, shareCustomNote)}
                    disabled={isGeneratingPDF}
                    style={{
                      padding: '7px 11px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#334155',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: isGeneratingPDF ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Share Attached PDF file via device apps"
                  >
                    <Share2 size={13} /> Share PDF
                  </button>

                  <button 
                    type="button"
                    onClick={() => handleEmailShare(targetDate, shareFilter, shareIncludeAudit, shareCustomNote)}
                    disabled={isGeneratingPDF}
                    style={{
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#334155',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: isGeneratingPDF ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Email Attached PDF"
                  >
                    <Mail size={13} /> Email PDF
                  </button>

                  <button 
                    type="button"
                    onClick={() => handlePrint(targetDate, shareFilter)}
                    style={{
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#334155',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Print / Save PDF for this date"
                  >
                    <Printer size={13} /> Print
                  </button>

                  {/* Copy Text Button */}
                  <button 
                    type="button"
                    onClick={() => handleCopyDateShareText(targetDate, shareFilter, shareIncludeAudit, shareCustomNote)}
                    style={{
                      padding: '7px 11px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: copiedSuccess ? '#f0fdf4' : '#ffffff',
                      color: copiedSuccess ? '#166534' : '#1e293b',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    {copiedSuccess ? <CheckCheck size={13} style={{ color: '#16a34a' }} /> : <Copy size={13} />}
                    <span>{copiedSuccess ? 'Copied!' : 'Copy Text'}</span>
                  </button>

                  {/* Primary WhatsApp Share Button with Attached PDF */}
                  <button 
                    type="button"
                    onClick={() => handleShareToWhatsApp(targetDate, shareFilter, shareIncludeAudit, shareCustomNote, shareRecipientPhone)}
                    disabled={isGeneratingPDF}
                    style={{
                      padding: '7px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#25D366',
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: isGeneratingPDF ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 4px rgba(37, 211, 102, 0.35)'
                    }}
                  >
                    <MessageCircle size={16} />
                    <span>{isGeneratingPDF ? 'Generating PDF...' : 'Share on WhatsApp (Attach PDF)'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
