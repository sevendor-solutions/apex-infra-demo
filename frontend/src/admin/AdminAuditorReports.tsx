import React, { useState, useEffect, useMemo } from 'react';
import type { Invoice, Supplier, Customer, Wallet, Expense, InventoryItem, Loan } from '../types';
import { 
  Calendar, Printer, Download 
} from 'lucide-react';
import { 
  getInvoices, getCustomers, getSuppliers, getWallets, 
  getExpenses, getInventoryItems, getLoans 
} from '../utils/db';

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const AdminAuditorReports: React.FC = () => {
  const [activeReport, setActiveReport] = useState<'BS' | 'PL' | 'CF' | 'Sales' | 'Purchase'>('BS');
  
  // Data State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);

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
      </div>
    </div>
  );
};
