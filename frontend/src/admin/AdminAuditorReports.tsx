import React, { useState, useEffect, useMemo } from 'react';
import type { Invoice, Supplier, Customer, Wallet, Expense, InventoryItem, Loan } from '../types';
import { 
  Calendar, Printer, Download, ShieldCheck, RefreshCw
} from 'lucide-react';
import { 
  getInvoices, getCustomers, getSuppliers, getWallets, 
  getExpenses, getInventoryItems, getLoans,
  getAccountingActivities, type AccountingActivityItem
} from '../utils/db';
import { ALVGrid, type ALVColumn } from './ALVGrid';

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const AdminAuditorReports: React.FC = () => {
  const [activeReport, setActiveReport] = useState<'BS' | 'PL' | 'CF' | 'Sales' | 'Purchase' | 'Audit'>('BS');
  
  // Data State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [activities, setActivities] = useState<AccountingActivityItem[]>([]);

  // Audit filter state
  const [auditModuleFilter, setAuditModuleFilter] = useState('All');
  const [auditTypeFilter, setAuditTypeFilter] = useState('All');

  // Filter States
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const loadData = async () => {
    try {
      const [invs, custs, sups, wals, exps, items, lns, acts] = await Promise.all([
        getInvoices(),
        getCustomers(),
        getSuppliers(),
        getWallets(),
        getExpenses(),
        getInventoryItems(),
        getLoans(),
        getAccountingActivities({ startDate, endDate })
      ]);
      setInvoices(invs);
      setCustomers(custs);
      setSuppliers(sups);
      setWallets(wals);
      setExpenses(exps);
      setInventory(items);
      setLoans(lns);
      setActivities(acts);
    } catch (err) {
      console.error('Failed to load auditor reports data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ── FILTERED DATASETS ───────────────────────────────────────
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => inv.date >= startDate && inv.date <= endDate);
  }, [invoices, startDate, endDate]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => exp.billDate >= startDate && exp.billDate <= endDate);
  }, [expenses, startDate, endDate]);

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

  // ── FILTERED ACTIVITIES AUDIT TRAIL ──────────────────────────
  const filteredActivities = useMemo(() => {
    return activities.filter(a => {
      const matchesModule = auditModuleFilter === 'All' || a.module === auditModuleFilter;
      const matchesType = auditTypeFilter === 'All' || a.activityType === auditTypeFilter;
      return matchesModule && matchesType;
    });
  }, [activities, auditModuleFilter, auditTypeFilter]);

  const activityColumns: ALVColumn[] = useMemo(() => [
    {
      key: 'dateTime',
      label: 'DATE & TIME',
      width: '160px',
      sortable: true,
      render: (v) => {
        const d = v ? new Date(String(v)) : new Date();
        return (
          <span style={{ fontSize: '0.8rem', color: '#475569' }}>
            {d.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        );
      }
    },
    {
      key: 'userName',
      label: 'USER',
      width: '140px',
      sortable: true,
      render: (v, row) => (
        <div>
          <span style={{ fontWeight: 600, color: '#0f172a', display: 'block' }}>{String(v || 'Admin')}</span>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{String(row.userRole || 'Admin')}</span>
        </div>
      )
    },
    {
      key: 'module',
      label: 'MODULE',
      width: '130px',
      sortable: true,
      render: (v) => (
        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}>
          {String(v)}
        </span>
      )
    },
    {
      key: 'activityType',
      label: 'ACTIVITY',
      width: '110px',
      sortable: true,
      render: (v) => {
        const type = String(v).toUpperCase();
        let bg = '#ecfdf5', color = '#059669', border = '#a7f3d0';
        if (type === 'UPDATE') { bg = '#eff6ff'; color = '#2563eb'; border = '#bfdbfe'; }
        else if (type === 'DELETE') { bg = '#fef2f2'; color = '#dc2626'; border = '#fecaca'; }
        return (
          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, background: bg, color: color, border: `1px solid ${border}` }}>
            {type}
          </span>
        );
      }
    },
    {
      key: 'recordId',
      label: 'REF. / RECORD NO.',
      width: '140px',
      sortable: true,
      render: (v) => (
        <code style={{ background: '#f8fafc', padding: '2px 6px', borderRadius: '4px', color: '#0f172a', fontWeight: 600, fontSize: '0.8rem', border: '1px solid #e2e8f0' }}>
          {String(v || 'N/A')}
        </code>
      )
    },
    {
      key: 'amount',
      label: 'AMOUNT',
      width: '130px',
      align: 'right',
      sortable: true,
      render: (v) => {
        const amt = Number(v) || 0;
        return (
          <span style={{ fontWeight: 700, color: amt > 0 ? '#0f172a' : '#64748b' }}>
            {amt > 0 ? fmt(amt) : '—'}
          </span>
        );
      }
    },
    {
      key: 'description',
      label: 'DESCRIPTION / AUDIT DETAILS',
      render: (v) => (
        <span style={{ color: '#1e293b', fontSize: '0.85rem' }}>{String(v)}</span>
      )
    },
    {
      key: 'ipAddress',
      label: 'IP ADDRESS',
      width: '110px',
      render: (v) => (
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{String(v || '127.0.0.1')}</span>
      )
    }
  ], []);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let rows: string[][] = [];
    let filename = 'Report.csv';

    if (activeReport === 'BS') {
      filename = 'Balance_Sheet.csv';
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
      filename = 'Profit_And_Loss.csv';
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
    } else if (activeReport === 'Audit') {
      filename = 'Activity_Audit_Trail.csv';
      rows = [
        ['JK Future Infra - Accounting Activity Audit Trail'],
        [`Period: ${startDate} to ${endDate}`],
        [],
        ['Timestamp', 'User', 'Role', 'Module', 'Activity', 'Record ID', 'Amount', 'Description', 'IP Address'],
        ...filteredActivities.map(a => [
          a.dateTime,
          a.userName,
          a.userRole,
          a.module,
          a.activityType,
          a.recordId || '',
          a.amount ? a.amount.toString() : '0',
          a.description || '',
          a.ipAddress || ''
        ])
      ];
    } else {
      filename = 'Cash_Flow.csv';
      rows = [
        ['JK Future Infra - Cash Flow Statement'],
        [`Period: ${startDate} to ${endDate}`],
        [],
        ['PARTICULARS', 'Amount (INR)'],
        ['Collections Received (Inflows)', cashFlow.collections.toString()],
        ['Expenditures & Postings (Outflows)', cashFlow.outgoings.toString()],
        ['NET CASH FLOW CHANGE', cashFlow.netChange.toString()]
      ];
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.map(x => `"${x.replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="admin-page-container">
      {/* Top Filter & Toolbar Header */}
      <div className="admin-report-header flex justify-between align-center mb-3">
        <div>
          <h2>Auditor Financial Statements & Compliance Reports</h2>
          <p className="text-muted">Statutory Statements, P&L Schedules & Accounting Activity Audit Trail</p>
        </div>

        <div className="admin-report-controls flex gap-2 align-center">
          <div className="flex gap-1 align-center">
            <Calendar size={14} className="text-muted" />
            <span className="text-xs">From:</span>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              className="form-control" 
              style={{ width: '130px', padding: '4px 6px', fontSize: '0.85rem' }} 
            />
          </div>

          <div className="flex gap-1 align-center">
            <span className="text-xs">To:</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              className="form-control" 
              style={{ width: '130px', padding: '4px 6px', fontSize: '0.85rem' }} 
            />
          </div>

          <button onClick={loadData} className="btn btn-outline btn-sm" title="Re-sync Ledger">
            <RefreshCw size={14} /> Refresh
          </button>

          <button onClick={handlePrint} className="btn btn-outline btn-sm">
            <Printer size={14} /> Print
          </button>

          <button onClick={handleExportCSV} className="btn btn-secondary btn-sm">
            <Download size={14} /> Export Excel
          </button>
        </div>
      </div>

      {/* Reports tab buttons */}
      <div className="admin-report-tab-buttons" style={{ display: 'flex', borderBottom: '2px solid var(--border-color)', marginBottom: '1.5rem', gap: '4px' }}>
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
          onClick={() => setActiveReport('Audit')}
          className={`btn btn-sm ${activeReport === 'Audit' ? 'btn-secondary' : 'btn-outline'}`}
          style={{ borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '-2px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <ShieldCheck size={14} /> Activity Audit Trail ({activities.length})
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

        {activeReport === 'Audit' && (
          <div>
            <div className="flex justify-between align-center mb-3" style={{ flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a' }}>Statutory Accounting Activity Audit Trail</h3>
                <p className="text-muted text-xs" style={{ margin: '4px 0 0 0' }}>
                  Immutable log of all financial activities (INSERT, UPDATE, DELETE) across accounting ledgers
                </p>
              </div>

              {/* Activity Sub-filters */}
              <div className="flex gap-2 align-center" style={{ flexWrap: 'wrap' }}>
                <div className="flex align-center gap-1">
                  <span className="text-xs text-muted">Module:</span>
                  <select
                    value={auditModuleFilter}
                    onChange={e => setAuditModuleFilter(e.target.value)}
                    className="form-control text-xs"
                    style={{ padding: '3px 8px', height: '28px', width: 'auto' }}
                  >
                    <option value="All">All Modules</option>
                    <option value="Payment-In">Payment-In</option>
                    <option value="Payment-Out">Payment-Out</option>
                    <option value="Invoices">Invoices</option>
                    <option value="Expenses">Expenses</option>
                  </select>
                </div>

                <div className="flex align-center gap-1">
                  <span className="text-xs text-muted">Action:</span>
                  <select
                    value={auditTypeFilter}
                    onChange={e => setAuditTypeFilter(e.target.value)}
                    className="form-control text-xs"
                    style={{ padding: '3px 8px', height: '28px', width: 'auto' }}
                  >
                    <option value="All">All Actions</option>
                    <option value="INSERT">INSERT</option>
                    <option value="UPDATE">UPDATE</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
              </div>
            </div>

            <ALVGrid
              title="Accounting Activities Register"
              subtitle={`Audited Entries from ${startDate} to ${endDate}`}
              columns={activityColumns}
              data={filteredActivities as unknown as Record<string, unknown>[]}
              pageSize={15}
              searchPlaceholder="Search user, voucher no, description, module..."
              selectable={false}
              onExport={() => handleExportCSV()}
            />
          </div>
        )}
      </div>
    </div>
  );
};
