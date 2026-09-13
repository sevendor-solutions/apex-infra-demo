import React, { useState, useEffect, useMemo } from 'react';
import type { Invoice, Supplier, Customer, Wallet, Expense, InventoryItem, Loan, AccountingActivity } from '../types';
import { 
  Calendar, Printer, Download, Search, Filter, Activity, RefreshCw 
} from 'lucide-react';
import { 
  getInvoices, getCustomers, getSuppliers, getWallets, 
  getExpenses, getInventoryItems, getLoans, getAccountingActivities 
} from '../utils/db';

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const AdminAuditorReports: React.FC = () => {
  const [activeReport, setActiveReport] = useState<'BS' | 'PL' | 'CF' | 'ACTIVITIES' | 'Sales' | 'Purchase'>('BS');
  
  // Data State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  
  // Activity Audit Trail State
  const [activities, setActivities] = useState<AccountingActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [activityModuleFilter, setActivityModuleFilter] = useState('all');
  const [activityTypeFilter, setActivityTypeFilter] = useState('all');
  const [activitySearch, setActivitySearch] = useState('');

  // Filter States
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const loadData = async () => {
    try {
      const [invs, custs, sups, wals, exps, items, lns] = await Promise.all([
        getInvoices(),
        getCustomers(),
        getSuppliers(),
        getWallets(),
        getExpenses(),
        getInventoryItems(),
        getLoans()
      ]);
      setInvoices(invs);
      setCustomers(custs);
      setSuppliers(sups);
      setWallets(wals);
      setExpenses(exps);
      setInventory(items);
      setLoans(lns);
    } catch (err) {
      console.error('Failed to load auditor reports data:', err);
    }
  };

  const loadActivities = async () => {
    setLoadingActivities(true);
    try {
      const data = await getAccountingActivities({ startDate, endDate });
      setActivities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load accounting activities:', err);
    } finally {
      setLoadingActivities(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadActivities();
  }, [startDate, endDate]);

  // ── FILTERED DATASETS ───────────────────────────────────────
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => inv.date >= startDate && inv.date <= endDate);
  }, [invoices, startDate, endDate]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => exp.billDate >= startDate && exp.billDate <= endDate);
  }, [expenses, startDate, endDate]);

  // ── FILTERED ACTIVITIES ─────────────────────────────────────
  const filteredActivities = useMemo(() => {
    return activities.filter(act => {
      // Module filter
      if (activityModuleFilter !== 'all' && act.module !== activityModuleFilter) {
        return false;
      }

      // Activity Type filter
      if (activityTypeFilter !== 'all' && act.activityType !== activityTypeFilter) {
        return false;
      }

      // Search keyword
      if (activitySearch.trim()) {
        const q = activitySearch.toLowerCase();
        const matchUser = act.userName?.toLowerCase().includes(q);
        const matchRole = act.userRole?.toLowerCase().includes(q);
        const matchDesc = act.description?.toLowerCase().includes(q);
        const matchModule = act.module?.toLowerCase().includes(q);
        const matchRecord = act.recordId?.toLowerCase().includes(q);
        const matchIp = act.ipAddress?.toLowerCase().includes(q);
        if (!matchUser && !matchRole && !matchDesc && !matchModule && !matchRecord && !matchIp) {
          return false;
        }
      }

      return true;
    });
  }, [activities, activityModuleFilter, activityTypeFilter, activitySearch]);

  // Available Modules for Dropdown
  const availableModules = useMemo(() => {
    const set = new Set<string>();
    activities.forEach(a => {
      if (a.module) set.add(a.module);
    });
    const defaultModules = [
      "Invoices", "Payment-In", "Payment-Out", "Expenses", "Quotations", 
      "Wallets", "Customers", "Suppliers", "Loans", "Inventory", 
      "Projects", "Marketing Properties", "Blogs", "Gallery", "Documents", 
      "Enquiries", "Careers", "Masters: Cities", "Site Visits", "Users", 
      "Cost Analysis", "Daily Agenda Matrix", "Project Inspections"
    ];
    defaultModules.forEach(m => set.add(m));
    return ['all', ...Array.from(set).sort()];
  }, [activities]);

  // Activity summary stats
  const activityStats = useMemo(() => {
    let insertCount = 0;
    let updateCount = 0;
    let deleteCount = 0;
    let totalFinancialAmount = 0;

    filteredActivities.forEach(a => {
      if (a.activityType === 'INSERT') insertCount++;
      else if (a.activityType === 'UPDATE') updateCount++;
      else if (a.activityType === 'DELETE') deleteCount++;

      if (a.amount && a.amount > 0) {
        totalFinancialAmount += Number(a.amount);
      }
    });

    return {
      total: filteredActivities.length,
      insertCount,
      updateCount,
      deleteCount,
      totalFinancialAmount
    };
  }, [filteredActivities]);

  // ── BALANCE SHEET COMPUTATIONS ────────────────────────────────
  const balanceSheet = useMemo(() => {
    // Current Assets
    const cashBank = wallets.reduce((sum, w) => sum + (w.currentBalance || 0), 0);
    const stockValuation = inventory.reduce((sum, item) => sum + (item.currentStock * item.purchasePrice), 0);
    const receivables = customers.reduce((sum, c) => sum + (c.outstandingAmount || 0), 0);
    const totalAssets = cashBank + stockValuation + receivables;

    // Liabilities
    const payables = suppliers.reduce((sum, s) => sum + (s.outstandingAmount || 0), 0);
    const bankLoans = loans.reduce((sum, l) => sum + (l.pendingAmount || 0), 0);
    const totalLiabilities = payables + bankLoans;

    const equity = totalAssets - totalLiabilities;

    return {
      cashBank,
      stockValuation,
      receivables,
      totalAssets,
      payables,
      bankLoans,
      totalLiabilities,
      equity
    };
  }, [wallets, inventory, customers, suppliers, loans]);

  // ── PROFIT & LOSS COMPUTATIONS ───────────────────────────────
  const profitLoss = useMemo(() => {
    // Revenue
    const salesRevenue = filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const salesGst = filteredInvoices.reduce((sum, inv) => sum + inv.gstAmount, 0);
    const salesNet = salesRevenue - salesGst;

    // COGS & Operating Expenses
    const purchaseOps = filteredExpenses.filter(e => e.expenseCategory === 'Cement' || e.expenseCategory === 'Steel' || e.expenseCategory === 'Sand & Bricks')
                                        .reduce((sum, e) => sum + e.totalAmount, 0);
    const otherExpenses = filteredExpenses.filter(e => e.expenseCategory !== 'Cement' && e.expenseCategory !== 'Steel' && e.expenseCategory !== 'Sand & Bricks')
                                          .reduce((sum, e) => sum + e.totalAmount, 0);

    const totalExpenses = purchaseOps + otherExpenses;
    const netProfit = salesNet - totalExpenses;

    return {
      salesRevenue,
      salesGst,
      salesNet,
      purchaseOps,
      otherExpenses,
      totalExpenses,
      netProfit
    };
  }, [filteredInvoices, filteredExpenses]);

  // ── CASH FLOW STATEMENT ──────────────────────────────────────
  const cashFlow = useMemo(() => {
    // Cash Inflows (invoice paidAmount + opening balances if any)
    const collections = filteredInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    
    // Cash Outflows (recorded expenses total + loan EMI repayments)
    const outgoings = filteredExpenses.reduce((sum, e) => sum + e.totalAmount, 0);

    const netChange = collections - outgoings;

    return {
      collections,
      outgoings,
      netChange
    };
  }, [filteredInvoices, filteredExpenses]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let rows: string[][] = [];
    let filename = 'Report.csv';

    if (activeReport === 'BS') {
      filename = `Balance_Sheet_${startDate}_to_${endDate}.csv`;
      rows = [
        ['JK Future Infra - Balance Sheet Report'],
        [`Period: ${startDate} to ${endDate}`],
        [],
        ['ASSETS', 'Amount (INR)'],
        ['Cash & Bank Balance', balanceSheet.cashBank.toString()],
        ['Stock / Inventory Valuation', balanceSheet.stockValuation.toString()],
        ['Accounts Receivables', balanceSheet.receivables.toString()],
        ['TOTAL ASSETS', balanceSheet.totalAssets.toString()],
        [],
        ['LIABILITIES', 'Amount (INR)'],
        ['Accounts Payables', balanceSheet.payables.toString()],
        ['Secured Bank Loans', balanceSheet.bankLoans.toString()],
        ['TOTAL LIABILITIES', balanceSheet.totalLiabilities.toString()],
        [],
        ['NET EQUITY', balanceSheet.equity.toString()]
      ];
    } else if (activeReport === 'PL') {
      filename = `Profit_And_Loss_${startDate}_to_${endDate}.csv`;
      rows = [
        ['JK Future Infra - Profit & Loss Statement'],
        [`Period: ${startDate} to ${endDate}`],
        [],
        ['PARTICULARS', 'Amount (INR)'],
        ['Gross Sales Revenue', profitLoss.salesRevenue.toString()],
        ['GST Tax Liability', profitLoss.salesGst.toString()],
        ['Net Sales Revenue', profitLoss.salesNet.toString()],
        [],
        ['OPERATING EXPENSES'],
        ['Material Purchases (Steel, Cement, Sand)', profitLoss.purchaseOps.toString()],
        ['Indirect Expenses (Salary, Rent, Utilities)', profitLoss.otherExpenses.toString()],
        ['TOTAL EXPENDITURES', profitLoss.totalExpenses.toString()],
        [],
        ['NET BUSINESS PROFIT / LOSS', profitLoss.netProfit.toString()]
      ];
    } else if (activeReport === 'CF') {
      filename = `Cash_Flow_${startDate}_to_${endDate}.csv`;
      rows = [
        ['JK Future Infra - Cash Flow Statement'],
        [`Period: ${startDate} to ${endDate}`],
        [],
        ['PARTICULARS', 'Amount (INR)'],
        ['Collections Received (Inflows)', cashFlow.collections.toString()],
        ['Expenditures & Postings (Outflows)', cashFlow.outgoings.toString()],
        ['NET CASH FLOW CHANGE', cashFlow.netChange.toString()]
      ];
    } else if (activeReport === 'ACTIVITIES') {
      filename = `Activity_Audit_Trail_${startDate}_to_${endDate}.csv`;
      rows = [
        ['JK Future Infra - Activity Audit Trail Report'],
        [`Period: ${startDate} to ${endDate}`],
        [`Total Records: ${filteredActivities.length}`],
        [],
        ['Date & Time', 'User Name', 'Role', 'Module', 'Action', 'Record / Ref ID', 'Description', 'Amount (INR)', 'IP Address'],
        ...filteredActivities.map(a => [
          new Date(a.dateTime || a.createdAt || '').toLocaleString('en-IN'),
          a.userName || '',
          a.userRole || '',
          a.module || '',
          a.activityType || '',
          a.recordId || '-',
          a.description || '',
          (a.amount !== undefined && a.amount !== null && a.amount > 0) ? a.amount.toString() : '0',
          a.ipAddress || '-'
        ])
      ];
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.map(x => `"${(x || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="admin-page-container admin-auditor-reports-view">
      {/* Date Filtering Bar */}
      <div className="admin-report-filter-bar" style={{ display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={18} className="text-muted" />
          <span className="font-semibold text-sm">Period:</span>
        </div>
        <input 
          type="date" 
          value={startDate} 
          onChange={e => setStartDate(e.target.value)} 
          className="form-control" 
          style={{ width: '150px', marginBottom: 0, padding: '4px 8px' }} 
        />
        <span className="text-muted">to</span>
        <input 
          type="date" 
          value={endDate} 
          onChange={e => setEndDate(e.target.value)} 
          className="form-control" 
          style={{ width: '150px', marginBottom: 0, padding: '4px 8px' }} 
        />

        {/* Activity Trail Specific Filters */}
        {activeReport === 'ACTIVITIES' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={15} className="text-muted" />
              <select
                value={activityModuleFilter}
                onChange={e => setActivityModuleFilter(e.target.value)}
                className="form-control"
                style={{ width: '170px', marginBottom: 0, padding: '4px 8px', fontSize: '0.85rem' }}
              >
                <option value="all">All Modules ({activities.length})</option>
                {availableModules.filter(m => m !== 'all').map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <select
              value={activityTypeFilter}
              onChange={e => setActivityTypeFilter(e.target.value)}
              className="form-control"
              style={{ width: '140px', marginBottom: 0, padding: '4px 8px', fontSize: '0.85rem' }}
            >
              <option value="all">All Actions</option>
              <option value="INSERT">INSERT (Create)</option>
              <option value="UPDATE">UPDATE (Edit)</option>
              <option value="DELETE">DELETE (Delete)</option>
            </select>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
              <Search size={14} className="text-muted" style={{ position: 'absolute', left: '8px' }} />
              <input
                type="text"
                placeholder="Search user, record, desc..."
                value={activitySearch}
                onChange={e => setActivitySearch(e.target.value)}
                className="form-control"
                style={{ width: '210px', marginBottom: 0, padding: '4px 8px 4px 28px', fontSize: '0.85rem' }}
              />
            </div>

            <button 
              onClick={loadActivities}
              className="btn btn-sm btn-outline flex align-center gap-0.5"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              title="Refresh Activity Trail"
            >
              <RefreshCw size={14} style={{ animation: loadingActivities ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </>
        )}
        
        <div className="admin-report-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
          <button 
            onClick={handlePrint}
            className="btn btn-sm btn-outline flex align-center gap-0.5"
            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
          >
            <Printer size={14} /> Print Report
          </button>
          <button 
            onClick={handleExportCSV}
            className="btn btn-sm btn-secondary flex align-center gap-0.5"
            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
          >
            <Download size={14} /> Export Excel
          </button>
        </div>
      </div>

      {/* Reports tab buttons */}
      <div className="admin-report-tab-buttons" style={{ display: 'flex', borderBottom: '2px solid var(--border-color)', marginBottom: '1.5rem', gap: '4px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setActiveReport('BS')}
          className={`btn btn-sm ${activeReport === 'BS' ? 'btn-secondary' : 'btn-outline'}`}
          style={{ borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '-2px' }}
        >
          Balance Sheet
        </button>
        <button 
          onClick={() => setActiveReport('PL')}
          className={`btn btn-sm ${activeReport === 'PL' ? 'btn-secondary' : 'btn-outline'}`}
          style={{ borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '-2px' }}
        >
          Profit & Loss Statement
        </button>
        <button 
          onClick={() => setActiveReport('CF')}
          className={`btn btn-sm ${activeReport === 'CF' ? 'btn-secondary' : 'btn-outline'}`}
          style={{ borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '-2px' }}
        >
          Cash Flow Statement
        </button>
        <button 
          onClick={() => setActiveReport('ACTIVITIES')}
          className={`btn btn-sm ${activeReport === 'ACTIVITIES' ? 'btn-secondary' : 'btn-outline'}`}
          style={{ borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '-2px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Activity size={14} /> Activity Audit Trail
        </button>
      </div>

      {/* Report Postings Layout */}
      <div className="admin-card p-4 shadow-sm" id="printable-report-area">
        {activeReport === 'BS' && (
          <div>
            <div className="text-center mb-3">
              <h2>JK FUTURE INFRA PROJECTS PVT LTD</h2>
              <h4>BALANCE SHEET STATEMENT</h4>
              <p className="text-muted">As on Date Period: {startDate} to {endDate}</p>
            </div>

            <div className="grid grid-2 gap-4 admin-report-grid">
              {/* Assets Column */}
              <div>
                <h3 className="border-bottom-title mb-2 text-primary" style={{ borderBottomColor: 'var(--primary)' }}>ASSETS (Receivables & Valuations)</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px 0' }}>Cash & Bank Balances</td>
                      <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 'bold' }}>{fmt(balanceSheet.cashBank)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px 0' }}>Warehouse Inventory Stock Valuation</td>
                      <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 'bold' }}>{fmt(balanceSheet.stockValuation)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px 0' }}>Trade Customer Receivables (Outstanding)</td>
                      <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 'bold' }}>{fmt(balanceSheet.receivables)}</td>
                    </tr>
                    <tr style={{ borderTop: '2px solid var(--primary)', fontWeight: 'bold' }}>
                      <td style={{ padding: '12px 0' }}>TOTAL ASSETS</td>
                      <td style={{ padding: '12px 0', textAlign: 'right' }}>{fmt(balanceSheet.totalAssets)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Liabilities Column */}
              <div>
                <h3 className="border-bottom-title mb-2 text-danger" style={{ borderBottomColor: '#ef4444' }}>LIABILITIES (Payables & Debt)</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px 0' }}>Trade Supplier Payables (Outstanding)</td>
                      <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 'bold' }}>{fmt(balanceSheet.payables)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px 0' }}>Secured Bank Loan Outstanding Debt</td>
                      <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 'bold' }}>{fmt(balanceSheet.bankLoans)}</td>
                    </tr>
                    <tr style={{ borderTop: '2px solid #ef4444', fontWeight: 'bold' }}>
                      <td style={{ padding: '12px 0' }}>TOTAL LIABILITIES</td>
                      <td style={{ padding: '12px 0', textAlign: 'right' }}>{fmt(balanceSheet.totalLiabilities)}</td>
                    </tr>
                    <tr style={{ borderTop: '1px solid #eee', fontWeight: 'bold', color: 'var(--success)' }}>
                      <td style={{ padding: '12px 0' }}>NET CAPITAL EQUITY</td>
                      <td style={{ padding: '12px 0', textAlign: 'right' }}>{fmt(balanceSheet.equity)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeReport === 'PL' && (
          <div>
            <div className="text-center mb-3">
              <h2>JK FUTURE INFRA PROJECTS PVT LTD</h2>
              <h4>PROFIT & LOSS STATEMENT</h4>
              <p className="text-muted">For the period: {startDate} to {endDate}</p>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }} className="text-sm">
              <tbody>
                {/* Income */}
                <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
                  <td style={{ padding: '10px' }} colSpan={2}>1. REVENUE FROM BUSINESS SALES</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px', paddingLeft: '20px' }}>Gross Revenue (Invoices Generated)</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>{fmt(profitLoss.salesRevenue)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px', paddingLeft: '20px' }}>Less: GST Tax Liability (Collected)</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#ef4444' }}>- {fmt(profitLoss.salesGst)}</td>
                </tr>
                <tr style={{ borderBottom: '2px solid #ddd', fontWeight: 'bold' }}>
                  <td style={{ padding: '10px', paddingLeft: '20px' }}>Net Sales Revenue</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>{fmt(profitLoss.salesNet)}</td>
                </tr>

                {/* Expenses */}
                <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold', marginTop: '15px' }}>
                  <td style={{ padding: '10px' }} colSpan={2}>2. COST OF SALES & DIRECT OPERATING EXPENSES</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px', paddingLeft: '20px' }}>Direct Purchases (Steel, Cement, Sand, Bricks)</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>{fmt(profitLoss.purchaseOps)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px', paddingLeft: '20px' }}>Indirect Operations (Salaries, Rent, Utilities, Transport)</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>{fmt(profitLoss.otherExpenses)}</td>
                </tr>
                <tr style={{ borderBottom: '2px solid #ddd', fontWeight: 'bold' }}>
                  <td style={{ padding: '10px', paddingLeft: '20px' }}>Total Operating Expenses</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>{fmt(profitLoss.totalExpenses)}</td>
                </tr>

                {/* Net Profit */}
                <tr style={{ backgroundColor: profitLoss.netProfit >= 0 ? '#ecfdf5' : '#fef2f2', fontWeight: 'bold', fontSize: '1.1rem' }}>
                  <td style={{ padding: '12px', color: profitLoss.netProfit >= 0 ? 'var(--success)' : '#ef4444' }}>NET PROFIT / LOSS FOR PERIOD</td>
                  <td style={{ padding: '12px', textAlign: 'right', color: profitLoss.netProfit >= 0 ? 'var(--success)' : '#ef4444' }}>
                    {fmt(profitLoss.netProfit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {activeReport === 'CF' && (
          <div>
            <div className="text-center mb-3">
              <h2>JK FUTURE INFRA PROJECTS PVT LTD</h2>
              <h4>CASH FLOW STATEMENT</h4>
              <p className="text-muted">Postings for period: {startDate} to {endDate}</p>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px 0' }}>Collections Received from Customers (Cash Inflows)</td>
                  <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', color: 'var(--success)' }}>+ {fmt(cashFlow.collections)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px 0' }}>Cash Payments Posted (Capital Outflows & Expenses)</td>
                  <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', color: '#ef4444' }}>- {fmt(cashFlow.outgoings)}</td>
                </tr>
                <tr style={{ borderTop: '2px solid var(--primary)', fontWeight: 'bold', fontSize: '1.1rem', backgroundColor: cashFlow.netChange >= 0 ? '#ecfdf5' : '#fef2f2' }}>
                  <td style={{ padding: '12px', color: cashFlow.netChange >= 0 ? 'var(--success)' : '#ef4444' }}>NET CASH FLOW CHANGE</td>
                  <td style={{ padding: '12px', textAlign: 'right', color: cashFlow.netChange >= 0 ? 'var(--success)' : '#ef4444' }}>
                    {fmt(cashFlow.netChange)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ── ACTIVITY AUDIT TRAIL VIEW ────────────────────────────── */}
        {activeReport === 'ACTIVITIES' && (
          <div>
            <div className="text-center mb-3">
              <h2>JK FUTURE INFRA PROJECTS PVT LTD</h2>
              <h4>ACTIVITY AUDIT TRAIL (ALL SCREENS AUDIT)</h4>
              <p className="text-muted">Audit Records for period: {startDate} to {endDate}</p>
            </div>

            {/* Quick Stat Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '1.5rem' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Activities</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>{activityStats.total}</div>
              </div>
              <div style={{ backgroundColor: '#f0fdf4', padding: '12px 16px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>Created / Inserted</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#15803d', marginTop: '4px' }}>{activityStats.insertCount}</div>
              </div>
              <div style={{ backgroundColor: '#eff6ff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 600, textTransform: 'uppercase' }}>Modified / Updated</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#2563eb', marginTop: '4px' }}>{activityStats.updateCount}</div>
              </div>
              <div style={{ backgroundColor: '#fef2f2', padding: '12px 16px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                <div style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 600, textTransform: 'uppercase' }}>Removed / Deleted</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#dc2626', marginTop: '4px' }}>{activityStats.deleteCount}</div>
              </div>
            </div>

            {/* Activities Table */}
            {loadingActivities ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                <RefreshCw size={24} style={{ margin: '0 auto 10px', animation: 'spin 1s linear infinite' }} />
                <p>Loading Activity Audit Trail records...</p>
              </div>
            ) : filteredActivities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <Activity size={32} style={{ color: '#94a3b8', margin: '0 auto 10px' }} />
                <h4 style={{ color: '#475569', marginBottom: '6px' }}>No Activity Records Found</h4>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  No activities recorded matching the selected date range ({startDate} to {endDate}) or filters.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                      <th style={{ padding: '10px 12px', fontWeight: 600, width: '160px' }}>Date & Time</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600, width: '140px' }}>User Context</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600, width: '140px' }}>Module / Screen</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600, width: '100px' }}>Action</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600, width: '130px' }}>Record / Ref</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Description</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right', width: '110px' }}>Amount</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600, width: '120px' }}>IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActivities.map((act, index) => {
                      const isInsert = act.activityType === 'INSERT';
                      const isUpdate = act.activityType === 'UPDATE';

                      const actionBg = isInsert ? '#dcfce7' : isUpdate ? '#dbeafe' : '#fee2e2';
                      const actionColor = isInsert ? '#15803d' : isUpdate ? '#1d4ed8' : '#b91c1c';

                      return (
                        <tr 
                          key={act.id || index}
                          style={{ 
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafafa'
                          }}
                        >
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: '#475569' }}>
                            <div style={{ fontWeight: 500 }}>
                              {new Date(act.dateTime || act.createdAt || '').toLocaleDateString('en-IN', {
                                day: '2-digit', month: 'short', year: 'numeric'
                              })}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                              {new Date(act.dateTime || act.createdAt || '').toLocaleTimeString('en-IN', {
                                hour: '2-digit', minute: '2-digit', second: '2-digit'
                              })}
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{act.userName || 'System'}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{act.userRole || 'User'}</div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ 
                              display: 'inline-block',
                              padding: '2px 8px', 
                              backgroundColor: '#f1f5f9', 
                              color: '#334155', 
                              borderRadius: '4px',
                              fontWeight: 500,
                              fontSize: '0.8rem',
                              border: '1px solid #e2e8f0'
                            }}>
                              {act.module}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: actionBg,
                              color: actionColor,
                              letterSpacing: '0.5px'
                            }}>
                              {act.activityType}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#334155' }}>
                            {act.recordId ? (
                              <code style={{ 
                                backgroundColor: '#f8fafc', 
                                padding: '2px 6px', 
                                borderRadius: '4px', 
                                border: '1px solid #e2e8f0', 
                                fontSize: '0.78rem',
                                color: '#0f172a'
                              }}>
                                {act.recordId}
                              </code>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>-</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#1e293b', wordBreak: 'break-word', maxWidth: '300px' }}>
                            {act.description}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: act.amount ? '#0f172a' : '#94a3b8' }}>
                            {act.amount && act.amount > 0 ? fmt(act.amount) : '-'}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                            {act.ipAddress || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
