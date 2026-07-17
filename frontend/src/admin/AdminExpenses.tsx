import React, { useState, useMemo } from 'react';
import type { Expense, ExpenseCategory, ExpenseLineItem, Project, LocationMaster, Wallet, Supplier } from '../types';
import {
  Trash2, Edit2, PlusCircle, Trash, Check,
  Receipt, Search, X, IndianRupee, Calendar,
  FileDown, Filter, BarChart3
} from 'lucide-react';
import { addExpense, updateExpense, deleteExpense, addExpenseCategory, addLocation, getCities, addSupplier } from '../utils/db';

interface AdminExpensesProps {
  expenses: Expense[];
  expenseCategories: ExpenseCategory[];
  projects: Project[];
  locations: LocationMaster[];
  wallets?: Wallet[];
  suppliers?: Supplier[];
  onRefresh: () => void;
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onConfirm: (msg: string) => Promise<boolean>;
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Telangana", "Karnataka", "Tamil Nadu", "Kerala",
  "Maharashtra", "Delhi", "Gujarat", "Rajasthan", "Uttar Pradesh", "West Bengal"
];
const TAX_SLABS = [
  { label: 'NONE', value: 0 },
  { label: 'GST @ 5%', value: 5 },
  { label: 'GST @ 12%', value: 12 },
  { label: 'GST @ 18%', value: 18 },
  { label: 'GST @ 28%', value: 28 },
];
const PAYMENT_TYPES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque'];

const emptyLine = (): ExpenseLineItem => ({ item: '', qty: 1, priceUnit: 0, taxLabel: 'NONE', taxPct: 0, amount: 0 });
const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtK = (n: number) => `₹${n >= 100000 ? (n / 100000).toFixed(1) + 'L' : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : n.toFixed(0)}`;

export const AdminExpenses: React.FC<AdminExpensesProps> = ({
  expenses = [],
  expenseCategories = [],
  projects = [],
  locations = [],
  wallets = [],
  suppliers = [],
  onRefresh,
  onAddToast,
  onConfirm
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSuggestRow, setActiveSuggestRow] = useState<number | null>(null);
  const [activeFieldSuggest, setActiveFieldSuggest] = useState<'category' | 'state' | 'location' | 'project' | 'vendor' | null>(null);

  const suggestedItems = useMemo(() => {
    const list: { name: string; price: number }[] = [];
    const seen = new Set<string>();
    expenses.forEach(e => {
      if (e.lineItems) {
        e.lineItems.forEach(li => {
          if (li.item && !seen.has(li.item.toLowerCase())) {
            seen.add(li.item.toLowerCase());
            list.push({ name: li.item, price: li.priceUnit });
          }
        });
      }
    });
    return list;
  }, [expenses]);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [party, setParty] = useState('');
  const [location, setLocation] = useState('');
  const [apartment, setApartment] = useState('');
  const [projectName, setProjectName] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseNo, setExpenseNo] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [stateOfSupply, setStateOfSupply] = useState('Andhra Pradesh');
  const [paymentType, setPaymentType] = useState('Cash');
  const [walletId, setWalletId] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [roundOff, setRoundOff] = useState(true);
  const [notes, setNotes] = useState('');
  const [gstEnabled, setGstEnabled] = useState(true);
  const [lineItems, setLineItems] = useState<ExpenseLineItem[]>([emptyLine()]);
  const [payStatusOption, setPayStatusOption] = useState<'Full' | 'Partial' | 'Credit'>('Full');
  const [paidAmountInput, setPaidAmountInput] = useState<number>(0);

  // ── Computed Totals ──────────────────────────────────────────
  const computedLineItems = useMemo(() => {
    return lineItems.map(li => {
      const base = li.qty * li.priceUnit;
      const taxAmt = gstEnabled ? base * (li.taxPct / 100) : 0;
      return { ...li, amount: base + taxAmt };
    });
  }, [lineItems, gstEnabled]);

  const subTotal = useMemo(() => computedLineItems.reduce((s, li) => s + (li.qty * li.priceUnit), 0), [computedLineItems]);
  const totalTax = useMemo(() => computedLineItems.reduce((s, li) => s + (li.amount - li.qty * li.priceUnit), 0), [computedLineItems]);
  const grandTotal = useMemo(() => {
    const raw = subTotal + totalTax;
    return roundOff ? Math.round(raw) : raw;
  }, [subTotal, totalTax, roundOff]);
  const roundOffAmt = useMemo(() => grandTotal - (subTotal + totalTax), [grandTotal, subTotal, totalTax]);

  // ── KPI Stats ────────────────────────────────────────────────
  const kpiStats = useMemo(() => {
    const total = expenses.reduce((s, e) => s + (e.totalAmount || 0), 0);
    const thisMonth = expenses.filter(e => {
      if (!e.billDate) return false;
      const d = new Date(e.billDate);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((s, e) => s + (e.totalAmount || 0), 0);
    const catMap: Record<string, number> = {};
    expenses.forEach(e => { catMap[e.expenseCategory] = (catMap[e.expenseCategory] || 0) + (e.totalAmount || 0); });
    const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
    return { total, thisMonth, bills: expenses.length, topCat: topCat ? topCat[0] : '—' };
  }, [expenses]);

  // ── Filtered Expenses ────────────────────────────────────────
  const filtered = useMemo(() => {
    return expenses.filter(e => {
      const q = searchTerm.toLowerCase();
      const matchQ = !q || e.party?.toLowerCase().includes(q) || e.expenseCategory?.toLowerCase().includes(q) || e.expenseNo?.toLowerCase().includes(q);
      const matchCat = !filterCategory || e.expenseCategory === filterCategory;
      const matchPay = !filterPayment || e.paymentType === filterPayment;
      const matchStatus = !filterStatus || (e.paymentStatus || 'Paid') === filterStatus;
      return matchQ && matchCat && matchPay && matchStatus;
    }).sort((a, b) => new Date(b.billDate || '').getTime() - new Date(a.billDate || '').getTime());
  }, [expenses, searchTerm, filterCategory, filterPayment, filterStatus]);

  // ── Line item helpers ────────────────────────────────────────
  const updateLineItem = (idx: number, field: keyof ExpenseLineItem, value: string | number) => {
    setLineItems(prev => prev.map((li, i) => {
      if (i !== idx) return li;
      const updated = { ...li, [field]: value };
      if (field === 'taxLabel') {
        const slab = TAX_SLABS.find(s => s.label === value);
        updated.taxPct = slab ? slab.value : 0;
      }
      return updated;
    }));
  };

  const resetForm = () => {
    setParty(''); setLocation(''); setApartment(''); setProjectName('');
    setExpenseCategory(''); setExpenseNo(''); setBillDate(new Date().toISOString().split('T')[0]);
    setStateOfSupply('Andhra Pradesh'); setPaymentType('Cash'); setReferenceNo('');
    setRoundOff(true); setNotes(''); setGstEnabled(true);
    setWalletId('');
    setLineItems([emptyLine()]);
    setPayStatusOption('Full');
    setPaidAmountInput(0);
    setEditingExpense(null);
  };

  const openAdd = () => { resetForm(); setIsFormOpen(true); };

  const openEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setParty(exp.party || '');
    setLocation(exp.location || '');
    setApartment(exp.apartment || '');
    setProjectName(exp.projectName || '');
    setExpenseCategory(exp.expenseCategory || '');
    setExpenseNo(exp.expenseNo || '');
    setBillDate(exp.billDate || new Date().toISOString().split('T')[0]);
    setStateOfSupply(exp.stateOfSupply || 'Andhra Pradesh');
    setPaymentType(exp.paymentType || 'Cash');
    setWalletId(exp.walletId || '');
    setReferenceNo(exp.referenceNo || '');
    setRoundOff(exp.roundOff !== false);
    setNotes(exp.notes || '');
    setGstEnabled(exp.gstEnabled !== false);
    setLineItems(exp.lineItems?.length ? exp.lineItems : [emptyLine()]);
    
    if (exp.paymentStatus === 'Unpaid') {
      setPayStatusOption('Credit');
      setPaidAmountInput(0);
    } else if (exp.paymentStatus === 'Partially Paid') {
      setPayStatusOption('Partial');
      setPaidAmountInput(exp.paidAmount || 0);
    } else {
      setPayStatusOption('Full');
      setPaidAmountInput(exp.paidAmount || exp.totalAmount || 0);
    }
    
    setIsFormOpen(true);
  };

  const handleCreateCategory = async (catName: string) => {
    try {
      await addExpenseCategory({ name: catName });
      onAddToast(`Category "${catName}" added successfully.`, 'success');
      onRefresh();
    } catch (err: any) {
      onAddToast(err.message || 'Failed to add category.', 'error');
    }
  };

  const handleCreateSupplier = async (supplierName: string) => {
    try {
      const dummyContact = '9' + Math.floor(100000000 + Math.random() * 900000000).toString();
      const newSupplier = await addSupplier({
        name: supplierName,
        contactNumber: dummyContact,
        openingBalance: 0,
        outstandingAmount: 0
      });
      setParty(newSupplier.name);
      onAddToast(`Supplier "${supplierName}" created and selected.`, 'success');
      onRefresh();
    } catch (err: any) {
      onAddToast(err.message || 'Failed to create supplier.', 'error');
    }
  };

  const handleCreateLocation = async (locName: string) => {
    try {
      const cities = await getCities();
      if (cities.length === 0) {
        onAddToast('Please register at least one City under masters first.', 'error');
        return;
      }
      await addLocation({ id: '', name: locName, cityId: cities[0].id });
      onAddToast(`Location "${locName}" added successfully under "${cities[0].name}".`, 'success');
      onRefresh();
    } catch (err: any) {
      onAddToast(err.message || 'Failed to add location.', 'error');
    }
  };



  const handleSave = async () => {
    if (!party.trim()) { onAddToast('Party / Vendor name is required.', 'error'); return; }
    if (!expenseCategory) { onAddToast('Please select an Expense Category.', 'error'); return; }
    if (lineItems.some(li => !li.item.trim())) { onAddToast('All line item descriptions must be filled.', 'error'); return; }
    if (payStatusOption !== 'Credit' && !walletId) { onAddToast('Please select a payment wallet account.', 'error'); return; }

    setSaving(true);
    try {
      const paidAmt = payStatusOption === 'Full' 
        ? grandTotal 
        : (payStatusOption === 'Credit' ? 0 : paidAmountInput);

      const payload = {
        party, location, apartment, projectName, expenseCategory,
        expenseNo, billDate, stateOfSupply, paymentType, referenceNo,
        roundOff, notes, gstEnabled,
        lineItems: computedLineItems,
        totalAmount: grandTotal,
        paidAmount: paidAmt,
        pendingAmount: grandTotal - paidAmt,
        paymentStatus: paidAmt === 0 ? 'Unpaid' : (paidAmt < grandTotal ? 'Partially Paid' : 'Paid'),
        walletId: payStatusOption === 'Credit' ? '' : walletId
      };
      if (editingExpense) {
        await updateExpense({ ...payload, id: editingExpense.id });
        onAddToast('Expense updated successfully.', 'success');
      } else {
        await addExpense(payload);
        onAddToast('Expense recorded successfully.', 'success');
      }
      onRefresh();
      setIsFormOpen(false);
      resetForm();
    } catch {
      onAddToast('Failed to save expense. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (exp: Expense) => {
    const ok = await onConfirm(`Delete expense bill "${exp.expenseNo || exp.party}"? This cannot be undone.`);
    if (!ok) return;
    try {
      await deleteExpense(exp.id);
      onAddToast('Expense deleted.', 'success');
      onRefresh();
    } catch {
      onAddToast('Failed to delete expense.', 'error');
    }
  };

  const exportCSV = () => {
    const rows = [
      ['Expense No', 'Party', 'Category', 'Project', 'Bill Date', 'Payment', 'Total Amount', 'Notes'],
      ...filtered.map(e => [e.expenseNo, e.party, e.expenseCategory, e.projectName, e.billDate, e.paymentType, e.totalAmount, e.notes])
    ];
    const csv = rows.map(r => r.map(c => `"${c ?? ''}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `expenses_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const payBadgeColor: Record<string, string> = {
    Cash: '#10b981', UPI: '#3b82f6', 'Bank Transfer': '#8b5cf6', Cheque: '#f59e0b'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
      {/* ── Page Header ──────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--sap-border-color)', paddingBottom: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--sap-fiori-blue)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Receipt size={20} /> Expenses Ledger
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>Track, manage and analyze all business expenditures</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={exportCSV}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.45rem 0.85rem', fontSize: '0.8rem', fontWeight: 600, border: '1.5px solid var(--sap-border-color)', borderRadius: '6px', background: 'transparent', color: '#374151', cursor: 'pointer' }}
          >
            <FileDown size={14} /> Export
          </button>
          <button
            onClick={openAdd}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.45rem 0.85rem', fontSize: '0.8rem', fontWeight: 600, borderRadius: '6px', border: 'none', background: 'var(--sap-fiori-blue)', color: '#fff', cursor: 'pointer' }}
          >
            <PlusCircle size={14} /> Add Expense
          </button>
        </div>
      </div>

      {/* ── KPI Summary Tiles ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {[
          { label: 'Total Expenditure', value: fmtK(kpiStats.total), sub: `${kpiStats.bills} bills`, icon: <IndianRupee size={18} />, color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'This Month', value: fmtK(kpiStats.thisMonth), sub: 'Current month spend', icon: <Calendar size={18} />, color: '#0891b2', bg: '#ecfeff' },
          { label: 'Total Bills', value: kpiStats.bills.toString(), sub: 'All expense entries', icon: <Receipt size={18} />, color: '#0854a0', bg: '#eff6ff' },
          { label: 'Top Category', value: kpiStats.topCat, sub: 'Highest spend head', icon: <BarChart3 size={18} />, color: '#d97706', bg: '#fffbeb' },
        ].map((tile, i) => (
          <div key={i} style={{ background: tile.bg, border: `1.5px solid ${tile.color}20`, borderRadius: '10px', padding: '1rem 1.1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: tile.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: tile.color, flexShrink: 0 }}>
              {tile.icon}
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{tile.label}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: tile.color, lineHeight: 1.2 }}>{tile.value}</div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>{tile.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search & Filters Bar ──────────────────────────────── */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'var(--sap-card-bg)', border: '1px solid var(--sap-border-color)', borderRadius: '8px', padding: '0.6rem 1rem' }}>
        <Search size={15} style={{ color: '#94a3b8', flexShrink: 0 }} />
        <input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search by vendor, category, bill number..."
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.85rem', background: 'transparent', color: '#1e293b' }}
        />
        {searchTerm && <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}><X size={14} /></button>}
        <div style={{ width: '1px', height: '20px', background: '#e2e8f0' }} />
        <Filter size={14} style={{ color: '#94a3b8' }} />
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ border: 'none', outline: 'none', fontSize: '0.8rem', background: 'transparent', color: '#374151', cursor: 'pointer' }}>
          <option value="">All Categories</option>
          {expenseCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <div style={{ width: '1px', height: '20px', background: '#e2e8f0' }} />
        <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)} style={{ border: 'none', outline: 'none', fontSize: '0.8rem', background: 'transparent', color: '#374151', cursor: 'pointer' }}>
          <option value="">All Payment Modes</option>
          {PAYMENT_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <div style={{ width: '1px', height: '20px', background: '#e2e8f0' }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ border: 'none', outline: 'none', fontSize: '0.8rem', background: 'transparent', color: '#374151', cursor: 'pointer' }}>
          <option value="">All Payment Statuses</option>
          <option value="Paid">Paid</option>
          <option value="Partially Paid">Partially Paid</option>
          <option value="Unpaid">Unpaid</option>
        </select>
        {(filterCategory || filterPayment || filterStatus) && (
          <button onClick={() => { setFilterCategory(''); setFilterPayment(''); setFilterStatus(''); }} style={{ background: '#fee2e2', border: 'none', color: '#dc2626', borderRadius: '4px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}>Clear</button>
        )}
      </div>

      {/* ── Expenses List Table ───────────────────────────────── */}
      <div style={{ background: 'var(--sap-card-bg)', border: '1px solid var(--sap-border-color)', borderRadius: '10px', overflow: 'hidden', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1.2rem', borderBottom: '1px solid var(--sap-border-color)', background: '#f8fafc' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
            {filtered.length} expense record{filtered.length !== 1 ? 's' : ''} {(searchTerm || filterCategory || filterPayment || filterStatus) ? '(filtered)' : ''}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Receipt size={40} style={{ color: '#cbd5e1', margin: '0 auto 1rem' }} />
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
              {expenses.length === 0 ? 'No expenses recorded yet. Click "Add Expense" to get started.' : 'No results match your current filters.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  {['Bill No', 'Date', 'Vendor / Party', 'Category', 'Project', 'Payment Mode', 'Status', 'Paid From', 'Total (₹)', 'Paid (₹)', 'Remaining (₹)', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', borderBottom: '1px solid var(--sap-border-color)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((exp, idx) => {
                  const status = exp.paymentStatus || 'Paid';
                  const statusColors: Record<string, { bg: string; text: string }> = {
                    'Paid': { bg: '#e8f5e9', text: '#2e7d32' },
                    'Partially Paid': { bg: '#fff3e0', text: '#ef6c00' },
                    'Unpaid': { bg: '#ffebee', text: '#c62828' }
                  };
                  const statusStyle = statusColors[status] || { bg: '#f1f5f9', text: '#475569' };
                  
                  return (
                    <tr key={exp.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f0f6ff')}
                      onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa')}
                    >
                      <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ fontWeight: 700, color: 'var(--sap-fiori-blue)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{exp.expenseNo || '—'}</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', color: '#374151', whiteSpace: 'nowrap' }}>
                        {exp.billDate ? new Date(exp.billDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{exp.party}</div>
                        {exp.location && <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>{exp.location}</div>}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: '12px', padding: '2px 10px', fontSize: '0.72rem', fontWeight: 600 }}>{exp.expenseCategory}</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', color: '#374151' }}>{exp.projectName || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                      <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ background: (payBadgeColor[exp.paymentType || 'Cash'] + '18'), color: payBadgeColor[exp.paymentType || 'Cash'], borderRadius: '12px', padding: '2px 10px', fontSize: '0.72rem', fontWeight: 600 }}>
                          {exp.paymentType || 'Cash'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ backgroundColor: statusStyle.bg, color: statusStyle.text, borderRadius: '12px', padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', color: '#374151', fontWeight: 500 }}>
                        {exp.accountName || <span style={{ color: '#cbd5e1' }}>— None —</span>}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ fontWeight: 700, color: '#374151', fontSize: '0.85rem' }}>{fmt(exp.totalAmount || 0)}</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ fontWeight: 600, color: '#16a34a', fontSize: '0.85rem' }}>{fmt(exp.paidAmount !== undefined ? exp.paidAmount : exp.totalAmount)}</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ fontWeight: 700, color: (exp.pendingAmount || 0) > 0 ? '#ef4444' : '#16a34a', fontSize: '0.85rem' }}>{fmt(exp.pendingAmount || 0)}</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => openEdit(exp)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.3rem 0.65rem', fontSize: '0.72rem', fontWeight: 600, border: '1.5px solid var(--sap-fiori-blue)', borderRadius: '5px', background: 'transparent', color: 'var(--sap-fiori-blue)', cursor: 'pointer' }}>
                            <Edit2 size={12} /> Edit
                          </button>
                          <button onClick={() => handleDelete(exp)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.3rem 0.65rem', fontSize: '0.72rem', fontWeight: 600, border: '1.5px solid #ef4444', borderRadius: '5px', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}>
                            <Trash2 size={12} /> Del
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f1f5f9', borderTop: '2px solid var(--sap-border-color)' }}>
                  <td colSpan={8} style={{ padding: '0.6rem 1rem', fontWeight: 700, color: '#374151', fontSize: '0.78rem' }}>
                    TOTAL ({filtered.length} records)
                  </td>
                  <td style={{ padding: '0.6rem 1rem', fontWeight: 800, color: '#374151', fontSize: '0.85rem' }}>
                    {fmt(filtered.reduce((s, e) => s + (e.totalAmount || 0), 0))}
                  </td>
                  <td style={{ padding: '0.6rem 1rem', fontWeight: 800, color: '#16a34a', fontSize: '0.85rem' }}>
                    {fmt(filtered.reduce((s, e) => s + (e.paidAmount !== undefined ? e.paidAmount : e.totalAmount), 0))}
                  </td>
                  <td style={{ padding: '0.6rem 1rem', fontWeight: 800, color: '#ef4444', fontSize: '0.85rem' }}>
                    {fmt(filtered.reduce((s, e) => s + (e.pendingAmount || 0), 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Expense Form (Slide-in Panel) ──────────── */}
      {isFormOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }} onClick={e => { if (e.target === e.currentTarget) { setIsFormOpen(false); resetForm(); } }}>
          <div style={{ width: 'min(700px, 95vw)', height: '100%', background: '#fff', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(0,0,0,0.15)', animation: 'slideInRight 0.25s ease' }}>

            {/* Panel Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: 'var(--sap-fiori-blue)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Receipt size={18} /> {editingExpense ? 'Edit Expense' : 'Record New Expense'}
                </h3>
                <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>
                  {editingExpense ? `Editing: ${editingExpense.expenseNo || editingExpense.party}` : 'Fill in the details below to create a new expense entry'}
                </p>
              </div>
              <button onClick={() => { setIsFormOpen(false); resetForm(); }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                <X size={16} />
              </button>
            </div>

            {/* Form Body */}
            <div style={{ padding: '1.25rem 1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Section: Bill Information */}
              <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', margin: 0 }}>
                <legend style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--sap-fiori-blue)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '0 6px' }}>Bill Information</legend>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ position: 'relative' }}>
                    <label style={labelStyle}>Vendor / Party <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      value={party}
                      onChange={e => {
                        setParty(e.target.value);
                        setActiveFieldSuggest('vendor');
                      }}
                      onFocus={() => setActiveFieldSuggest('vendor')}
                      onBlur={() => setTimeout(() => setActiveFieldSuggest(null), 250)}
                      placeholder="Search or type vendor name..."
                      style={inputStyle}
                    />
                    {activeFieldSuggest === 'vendor' && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: '#fff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        zIndex: 9999,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        marginTop: '2px'
                      }}>
                        {/* Create new supplier option */}
                        {!suppliers.some(s => s.name.toLowerCase() === party.toLowerCase()) && party.trim() !== '' && (
                          <div
                            onMouseDown={() => {
                              handleCreateSupplier(party.trim());
                              setActiveFieldSuggest(null);
                            }}
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f1f5f9',
                              fontSize: '0.78rem',
                              fontWeight: 'bold',
                              color: '#0891b2',
                              backgroundColor: '#f0fdfa',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#ccfbf1'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#f0fdfa'; }}
                          >
                            <span style={{ fontSize: '1rem', lineHeight: 1 }}>＋</span>
                            Create Supplier: "{party.trim()}"
                          </div>
                        )}
                        {/* Existing suppliers filtered by search */}
                        {suppliers.filter(s => s.name.toLowerCase().includes(party.toLowerCase())).map((s, idx) => (
                          <div
                            key={s.id || idx}
                            onMouseDown={() => {
                              setParty(s.name);
                              setActiveFieldSuggest(null);
                            }}
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f1f5f9',
                              fontSize: '0.78rem',
                              color: '#1e293b',
                              backgroundColor: '#fff'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; }}
                          >
                            <div style={{ fontWeight: 600 }}>{s.name}</div>
                            {s.contactNumber && <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '1px' }}>{s.contactNumber}</div>}
                          </div>
                        ))}
                        {/* Empty state */}
                        {suppliers.length === 0 && party.trim() === '' && (
                          <div style={{ padding: '10px 12px', fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center' }}>
                            No suppliers yet. Type a name to create one.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <label style={labelStyle}>Expense Category <span style={{ color: '#ef4444' }}>*</span></label>
                    <input 
                      type="text" 
                      value={expenseCategory} 
                      onChange={e => {
                        setExpenseCategory(e.target.value);
                        setActiveFieldSuggest('category');
                      }} 
                      onFocus={() => setActiveFieldSuggest('category')}
                      onBlur={() => setTimeout(() => setActiveFieldSuggest(null), 250)}
                      placeholder="Search category..." 
                      style={inputStyle}
                    />
                    {activeFieldSuggest === 'category' && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: '#fff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        zIndex: 9999,
                        maxHeight: '180px',
                        overflowY: 'auto',
                        marginTop: '2px'
                      }}>
                        {!expenseCategories.some(c => c.name.toLowerCase() === expenseCategory.toLowerCase()) && expenseCategory.trim() !== '' && (
                          <div 
                            onMouseDown={() => {
                              handleCreateCategory(expenseCategory);
                              setActiveFieldSuggest(null);
                            }}
                            style={{ 
                              padding: '8px 12px', 
                              cursor: 'pointer', 
                              borderBottom: '1px solid #f1f5f9', 
                              fontSize: '0.78rem',
                              fontWeight: 'bold',
                              color: 'var(--sap-fiori-blue)',
                              backgroundColor: '#fff'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; }}
                          >
                            + Add Category: "{expenseCategory}"
                          </div>
                        )}
                        {expenseCategories.filter(c => c.name.toLowerCase().includes(expenseCategory.toLowerCase())).map((c, idx) => (
                          <div 
                            key={c.id || idx}
                            onMouseDown={() => {
                              setExpenseCategory(c.name);
                              setActiveFieldSuggest(null);
                            }}
                            style={{ 
                              padding: '8px 12px', 
                              cursor: 'pointer', 
                              borderBottom: '1px solid #f1f5f9', 
                              fontSize: '0.78rem',
                              color: '#1e293b',
                              backgroundColor: '#fff'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; }}
                          >
                            {c.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={labelStyle}>Bill Date</label>
                    <input type="date" value={billDate} onChange={e => setBillDate(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Bill / Ref. No</label>
                    <input value={expenseNo} onChange={e => setExpenseNo(e.target.value)} placeholder="Auto-generated if blank" style={inputStyle} />
                  </div>
                  <div style={{ position: 'relative' }}>
                    <label style={labelStyle}>State of Supply</label>
                    <input 
                      type="text" 
                      value={stateOfSupply} 
                      onChange={e => {
                        setStateOfSupply(e.target.value);
                        setActiveFieldSuggest('state');
                      }} 
                      onFocus={() => setActiveFieldSuggest('state')}
                      onBlur={() => setTimeout(() => setActiveFieldSuggest(null), 250)}
                      placeholder="Search state..." 
                      style={inputStyle}
                    />
                    {activeFieldSuggest === 'state' && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: '#fff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        zIndex: 9999,
                        maxHeight: '180px',
                        overflowY: 'auto',
                        marginTop: '2px'
                      }}>
                        {INDIAN_STATES.filter(s => s.toLowerCase().includes(stateOfSupply.toLowerCase())).map((s, idx) => (
                          <div 
                            key={idx}
                            onMouseDown={() => {
                              setStateOfSupply(s);
                              setActiveFieldSuggest(null);
                            }}
                            style={{ 
                              padding: '8px 12px', 
                              cursor: 'pointer', 
                              borderBottom: '1px solid #f1f5f9', 
                              fontSize: '0.78rem',
                              color: '#1e293b',
                              backgroundColor: '#fff'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; }}
                          >
                            {s}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={labelStyle}>Payment Mode</label>
                    <select value={paymentType} onChange={e => setPaymentType(e.target.value)} style={inputStyle}>
                      {PAYMENT_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Payment Status / Option *</label>
                    <select 
                      value={payStatusOption} 
                      onChange={e => {
                        const opt = e.target.value as 'Full' | 'Partial' | 'Credit';
                        setPayStatusOption(opt);
                        if (opt === 'Full') {
                          setPaidAmountInput(grandTotal);
                        } else if (opt === 'Credit') {
                          setPaidAmountInput(0);
                        }
                      }} 
                      style={inputStyle}
                    >
                      <option value="Full">Full Payment (Paid)</option>
                      <option value="Partial">Partial Payment</option>
                      <option value="Credit">No Payment (Unpaid / Credit)</option>
                    </select>
                  </div>
                  {payStatusOption === 'Partial' && (
                    <div>
                      <label style={labelStyle}>Amount Paid (INR) *</label>
                      <input 
                        type="number" 
                        value={paidAmountInput} 
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          setPaidAmountInput(val > grandTotal ? grandTotal : val);
                        }} 
                        max={grandTotal}
                        min={0}
                        style={inputStyle} 
                        required 
                      />
                    </div>
                  )}
                  {payStatusOption !== 'Credit' && (
                    <div>
                      <label style={labelStyle}>Paid From Account *</label>
                      <select value={walletId} onChange={e => setWalletId(e.target.value)} style={inputStyle} required>
                        <option value="">-- Select Cash/Bank Wallet --</option>
                        {wallets.map(w => (
                          <option key={w.id} value={w.id}>{w.name} ({fmt(w.currentBalance)})</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {payStatusOption !== 'Credit' && (
                    <div>
                      <label style={labelStyle}>Reference No.</label>
                      <input value={referenceNo} onChange={e => setReferenceNo(e.target.value)} placeholder="Cheque / UTR / Txn ID" style={inputStyle} />
                    </div>
                  )}
                  <div style={{ position: 'relative' }}>
                    <label style={labelStyle}>Project Association</label>
                    <input 
                      type="text" 
                      value={projectName} 
                      onChange={e => {
                        setProjectName(e.target.value);
                        setActiveFieldSuggest('project');
                      }} 
                      onFocus={() => setActiveFieldSuggest('project')}
                      onBlur={() => setTimeout(() => {
                        setActiveFieldSuggest(null);
                        // Auto-clear if typed value doesn't match any existing project
                        if (projectName.trim() !== '' && !projects.some(p => p.name.toLowerCase() === projectName.trim().toLowerCase())) {
                          setProjectName('');
                        }
                      }, 250)}
                      placeholder="Search existing project..." 
                      style={inputStyle}
                    />
                    {activeFieldSuggest === 'project' && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: '#fff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        zIndex: 9999,
                        maxHeight: '180px',
                        overflowY: 'auto',
                        marginTop: '2px'
                      }}>
                        {projects.filter(p => p.name.toLowerCase().includes(projectName.toLowerCase())).map((p, idx) => (
                          <div 
                            key={p.id || idx}
                            onMouseDown={() => {
                              setProjectName(p.name);
                              setActiveFieldSuggest(null);
                            }}
                            style={{ 
                              padding: '8px 12px', 
                              cursor: 'pointer', 
                              borderBottom: '1px solid #f1f5f9', 
                              fontSize: '0.78rem',
                              color: '#1e293b',
                              backgroundColor: '#fff'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; }}
                          >
                            {p.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <label style={labelStyle}>Location</label>
                    <input 
                      type="text" 
                      value={location} 
                      onChange={e => {
                        setLocation(e.target.value);
                        setActiveFieldSuggest('location');
                      }} 
                      onFocus={() => setActiveFieldSuggest('location')}
                      onBlur={() => setTimeout(() => setActiveFieldSuggest(null), 250)}
                      placeholder="Search location..." 
                      style={inputStyle}
                    />
                    {activeFieldSuggest === 'location' && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: '#fff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        zIndex: 9999,
                        maxHeight: '180px',
                        overflowY: 'auto',
                        marginTop: '2px'
                      }}>
                        {!locations.some(l => l.name.toLowerCase() === location.toLowerCase()) && location.trim() !== '' && (
                          <div 
                            onMouseDown={() => {
                              handleCreateLocation(location);
                              setActiveFieldSuggest(null);
                            }}
                            style={{ 
                              padding: '8px 12px', 
                              cursor: 'pointer', 
                              borderBottom: '1px solid #f1f5f9', 
                              fontSize: '0.78rem',
                              fontWeight: 'bold',
                              color: 'var(--sap-fiori-blue)',
                              backgroundColor: '#fff'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; }}
                          >
                            + Add Location: "{location}"
                          </div>
                        )}
                        {locations.filter(l => l.name.toLowerCase().includes(location.toLowerCase())).map((l, idx) => (
                          <div 
                            key={l.id || idx}
                            onMouseDown={() => {
                              setLocation(l.name);
                              setActiveFieldSuggest(null);
                            }}
                            style={{ 
                              padding: '8px 12px', 
                              cursor: 'pointer', 
                              borderBottom: '1px solid #f1f5f9', 
                              fontSize: '0.78rem',
                              color: '#1e293b',
                              backgroundColor: '#fff'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; }}
                          >
                            {l.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={labelStyle}>Apartment / Block</label>
                    <input value={apartment} onChange={e => setApartment(e.target.value)} placeholder="Block A / Unit 101..." style={inputStyle} />
                  </div>
                </div>
                <div style={{ marginTop: '0.75rem' }}>
                  <label style={labelStyle}>Internal Notes</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any additional notes..." style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
              </fieldset>

              {/* Section: GST Toggle */}
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', background: '#f8fafc', borderRadius: '8px', padding: '0.75rem 1rem', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>
                  <div onClick={() => setGstEnabled(p => !p)} style={{ width: '36px', height: '20px', borderRadius: '10px', background: gstEnabled ? 'var(--sap-fiori-blue)' : '#cbd5e1', position: 'relative', transition: 'background 0.2s', cursor: 'pointer' }}>
                    <div style={{ position: 'absolute', top: '2px', left: gstEnabled ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                  </div>
                  GST Enabled
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>
                  <div onClick={() => setRoundOff(p => !p)} style={{ width: '36px', height: '20px', borderRadius: '10px', background: roundOff ? '#10b981' : '#cbd5e1', position: 'relative', transition: 'background 0.2s', cursor: 'pointer' }}>
                    <div style={{ position: 'absolute', top: '2px', left: roundOff ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                  </div>
                  Round-Off Total
                </label>
              </div>

              {/* Section: Line Items */}
              <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', margin: 0 }}>
                <legend style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--sap-fiori-blue)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '0 6px' }}>Line Items</legend>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        {['Description', 'Qty', 'Rate (₹)', 'Tax Slab', 'Amount (₹)', ''].map(h => (
                          <th key={h} style={{ padding: '0.5rem 0.6rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {computedLineItems.map((li, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.4rem 0.4rem', position: 'relative' }}>
                            <input 
                              value={li.item} 
                              onChange={e => {
                                updateLineItem(idx, 'item', e.target.value);
                                setActiveSuggestRow(idx);
                              }} 
                              onFocus={() => setActiveSuggestRow(idx)}
                              onBlur={() => setTimeout(() => setActiveSuggestRow(null), 250)}
                              placeholder="Item description" 
                              style={{ ...inputStyle, margin: 0, padding: '0.3rem 0.5rem', fontSize: '0.78rem' }} 
                            />
                            {activeSuggestRow === idx && li.item.trim() !== '' && (
                              <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: '4px',
                                right: '4px',
                                backgroundColor: '#fff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                zIndex: 999,
                                maxHeight: '180px',
                                overflowY: 'auto',
                                marginTop: '2px'
                              }}>
                                <div 
                                  onMouseDown={() => {
                                    setActiveSuggestRow(null);
                                  }}
                                  style={{ 
                                    padding: '8px 12px', 
                                    cursor: 'pointer', 
                                    borderBottom: '1px solid #f1f5f9', 
                                    fontSize: '0.78rem',
                                    fontWeight: 'bold',
                                    color: 'var(--sap-fiori-blue)',
                                    backgroundColor: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; }}
                                >
                                  + Add Expense Item
                                </div>
                                {suggestedItems.filter(item => item.name.toLowerCase().includes(li.item.toLowerCase())).map((item, itemIdx) => (
                                  <div 
                                    key={itemIdx}
                                    onMouseDown={() => {
                                      updateLineItem(idx, 'item', item.name);
                                      updateLineItem(idx, 'priceUnit', item.price);
                                      setActiveSuggestRow(null);
                                    }}
                                    style={{ 
                                      padding: '8px 12px', 
                                      cursor: 'pointer', 
                                      borderBottom: '1px solid #f1f5f9', 
                                      fontSize: '0.78rem',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      backgroundColor: '#fff'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; }}
                                  >
                                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{item.name}</span>
                                    <span style={{ color: 'var(--sap-fiori-blue)', fontWeight: 600 }}>₹{item.price}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '0.4rem 0.4rem', width: '70px' }}>
                            <input type="number" min={1} value={li.qty} onChange={e => updateLineItem(idx, 'qty', parseFloat(e.target.value) || 1)} style={{ ...inputStyle, margin: 0, padding: '0.3rem 0.5rem', fontSize: '0.78rem', textAlign: 'right' }} />
                          </td>
                          <td style={{ padding: '0.4rem 0.4rem', width: '110px' }}>
                            <input type="number" min={0} value={li.priceUnit} onChange={e => updateLineItem(idx, 'priceUnit', parseFloat(e.target.value) || 0)} style={{ ...inputStyle, margin: 0, padding: '0.3rem 0.5rem', fontSize: '0.78rem', textAlign: 'right' }} />
                          </td>
                          <td style={{ padding: '0.4rem 0.4rem', width: '130px' }}>
                            <select value={li.taxLabel} onChange={e => updateLineItem(idx, 'taxLabel', e.target.value)} style={{ ...inputStyle, margin: 0, padding: '0.3rem 0.5rem', fontSize: '0.78rem' }} disabled={!gstEnabled}>
                              {TAX_SLABS.map(s => <option key={s.label} value={s.label}>{s.label}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '0.4rem 0.6rem', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', textAlign: 'right' }}>
                            ₹{li.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '0.4rem 0.4rem' }}>
                            {lineItems.length > 1 && (
                              <button onClick={() => setLineItems(prev => prev.filter((_, i) => i !== idx))} style={{ background: '#fee2e2', border: 'none', borderRadius: '4px', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }}>
                                <Trash size={12} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={() => setLineItems(prev => [...prev, emptyLine()])} style={{ marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--sap-fiori-blue)', background: '#eff6ff', border: '1.5px dashed var(--sap-fiori-blue)', borderRadius: '6px', padding: '0.4rem 0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                  <PlusCircle size={13} /> Add Line Item
                </button>
              </fieldset>

              {/* Section: Bill Totals Summary */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.9rem 1.1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.3rem 2rem', fontSize: '0.82rem' }}>
                  <span style={{ color: '#64748b' }}>Sub Total:</span>
                  <span style={{ textAlign: 'right', fontWeight: 600 }}>₹{subTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  <span style={{ color: '#64748b' }}>Tax Total:</span>
                  <span style={{ textAlign: 'right', fontWeight: 600, color: gstEnabled ? '#f59e0b' : '#cbd5e1' }}>₹{totalTax.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  {roundOff && (
                    <>
                      <span style={{ color: '#64748b' }}>Round Off:</span>
                      <span style={{ textAlign: 'right', fontWeight: 600, color: roundOffAmt >= 0 ? '#10b981' : '#ef4444' }}>
                        {roundOffAmt >= 0 ? '+' : ''}{roundOffAmt.toFixed(2)}
                      </span>
                    </>
                  )}
                  <div style={{ gridColumn: '1 / -1', borderTop: '2px solid #e2e8f0', margin: '0.3rem 0' }} />
                  <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '1.05rem' }}>Grand Total:</span>
                  <span style={{ textAlign: 'right', fontWeight: 800, color: '#7c3aed', fontSize: '1.1rem' }}>{fmt(grandTotal)}</span>
                  
                  <span style={{ color: '#64748b', fontSize: '0.82rem' }}>Amount Paid:</span>
                  <span style={{ textAlign: 'right', fontWeight: 600, color: '#16a34a', fontSize: '0.82rem' }}>
                    {fmt(payStatusOption === 'Full' ? grandTotal : (payStatusOption === 'Credit' ? 0 : paidAmountInput))}
                  </span>
                  <span style={{ color: '#64748b', fontSize: '0.82rem' }}>Remaining Balance:</span>
                  <span style={{ textAlign: 'right', fontWeight: 700, color: (grandTotal - (payStatusOption === 'Full' ? grandTotal : (payStatusOption === 'Credit' ? 0 : paidAmountInput))) > 0 ? '#ef4444' : '#16a34a', fontSize: '0.85rem' }}>
                    {fmt(grandTotal - (payStatusOption === 'Full' ? grandTotal : (payStatusOption === 'Credit' ? 0 : paidAmountInput)))}
                  </span>
                </div>
              </div>
            </div>

            {/* Panel Footer Actions */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#f8fafc' }}>
              <button onClick={() => { setIsFormOpen(false); resetForm(); }} style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 600, border: '1.5px solid #e2e8f0', borderRadius: '6px', background: '#fff', color: '#374151', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '0.5rem 1.5rem', fontSize: '0.85rem', fontWeight: 700, border: 'none', borderRadius: '6px', background: saving ? '#93c5fd' : 'var(--sap-fiori-blue)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Check size={15} /> {saving ? 'Saving...' : editingExpense ? 'Update Expense' : 'Save Expense'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
};

// ── Shared input styles ───────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.45rem 0.65rem',
  border: '1.5px solid #e2e8f0',
  borderRadius: '6px',
  fontSize: '0.82rem',
  color: '#1e293b',
  background: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.7rem',
  fontWeight: 700,
  color: '#64748b',
  marginBottom: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
};
