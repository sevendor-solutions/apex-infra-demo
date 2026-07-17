import React, { useState, useEffect, useMemo } from 'react';
import type { Loan, LoanPayment, Wallet } from '../types';
import { 
  X, Calendar, 
  PiggyBank, Coins 
} from 'lucide-react';
import { 
  getLoans, addLoan, updateLoan, deleteLoan, 
  payLoanEMI, getLoanPayments 
} from '../utils/db';
import { ALVGrid } from './ALVGrid';
import type { ALVColumn } from './ALVGrid';

interface AdminLoansProps {
  isBorrowingOnly?: boolean;
  wallets?: Wallet[];
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onConfirm: (msg: string) => Promise<boolean>;
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const AdminLoans: React.FC<AdminLoansProps> = ({
  isBorrowingOnly = false,
  wallets = [],
  onAddToast,
  onConfirm
}) => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);

  // Local sub-tab selection to prevent side-by-side grid cut-off on standard screen sizes
  const [activeSubTab, setActiveSubTab] = useState<'loans' | 'borrowings' | 'payments'>(
    isBorrowingOnly ? 'borrowings' : 'loans'
  );

  useEffect(() => {
    setActiveSubTab(isBorrowingOnly ? 'borrowings' : 'loans');
  }, [isBorrowingOnly]);

  // Form Fields - Loan
  const [providerName, setProviderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [loanType, setLoanType] = useState('Business Term Loan');
  const [amount, setAmount] = useState(0);
  const [interestRate, setInterestRate] = useState(8.5);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [emiAmount, setEmiAmount] = useState(0);
  const [frequency, setFrequency] = useState('Monthly');
  const [nextDueDate, setNextDueDate] = useState('');
  const [docUrl, setDocUrl] = useState('');
  
  const [showLoanTypeSuggest, setShowLoanTypeSuggest] = useState(false);

  const suggestedLoanTypes = useMemo(() => {
    const defaults = [
      "Business Term Loan", 
      "Working Capital Loan", 
      "Overdraft Facility", 
      "Vehicle/Equipment Loan",
      "Personal Borrowing",
      "Director Borrowing",
      "Unsecured Borrowing"
    ];
    const existing = loans.map(l => l.type).filter(Boolean);
    return Array.from(new Set([...defaults, ...existing]));
  }, [loans]);

  // Form Fields - EMI Payment
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payAmount, setPayAmount] = useState(0);
  const [payRef, setPayRef] = useState('');
  const [payWalletId, setPayWalletId] = useState('');
  const [payIsInterestOnly, setPayIsInterestOnly] = useState(false);

  const [filterLoanId, setFilterLoanId] = useState('');

  const filteredPayments = useMemo(() => {
    if (!filterLoanId) return payments;
    return payments.filter(p => p.loanId === filterLoanId);
  }, [payments, filterLoanId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [loanList, paymentList] = await Promise.all([
        getLoans(),
        getLoanPayments()
      ]);
      setLoans(loanList);
      setPayments(paymentList);
    } catch (err) {
      onAddToast('Failed to load loans data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    const isBorrowing = loanType.toLowerCase().includes('borrowing');

    if (!providerName.trim() || amount <= 0) {
      onAddToast('Required Lender Name and Amount are missing.', 'error');
      return;
    }

    if (!isBorrowing) {
      if (!accountNumber.trim()) {
        onAddToast('Loan Account Number is required for Bank Loans.', 'error');
        return;
      }
      if (emiAmount <= 0) {
        onAddToast('EMI Amount must be greater than 0 for Bank Loans.', 'error');
        return;
      }
    }
    try {
      const finalAccountNumber = isBorrowing && !accountNumber.trim()
        ? `BORR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`
        : accountNumber;

      const finalEndDate = isBorrowing && !endDate
        ? startDate
        : endDate;

      const finalEmiAmount = isBorrowing && emiAmount <= 0
        ? 1
        : emiAmount;

      const payload = {
        providerName, 
        accountNumber: finalAccountNumber, 
        type: loanType,
        amount, 
        interestRate, 
        startDate, 
        endDate: finalEndDate, 
        emiAmount: finalEmiAmount, 
        frequency,
        nextDueDate: nextDueDate || startDate, 
        documentUrl: docUrl
      };

      if (editingLoan) {
        await updateLoan({ ...payload, id: editingLoan.id });
        onAddToast('Loan record updated successfully.', 'success');
      } else {
        await addLoan(payload);
        onAddToast('Loan account recorded successfully.', 'success');
      }
      setShowLoanModal(false);
      resetForm();
      loadData();
    } catch (err: any) {
      onAddToast(err.message || 'Failed to save loan.', 'error');
    }
  };

  const handlePayEMI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan || payAmount <= 0) {
      onAddToast('Please select a loan/borrowing and enter amount.', 'error');
      return;
    }
    if (!payWalletId) {
      onAddToast('Please select a payment wallet account.', 'error');
      return;
    }
    try {
      await payLoanEMI(selectedLoan.id, {
        paymentDate: payDate,
        amount: payAmount,
        reference: payRef,
        walletId: payWalletId,
        isInterestOnly: payIsInterestOnly
      });
      const isB = selectedLoan.type.toLowerCase().includes('borrowing');
      onAddToast(isB ? 'Repayment logged successfully.' : 'EMI payment logged successfully.', 'success');
      setShowPayModal(false);
      setPayAmount(0);
      setPayRef('');
      setPayWalletId('');
      setPayIsInterestOnly(false);
      loadData();
    } catch (err) {
      onAddToast('Failed to record payment.', 'error');
    }
  };

  const handleDeleteLoan = async (id: string, accNum: string) => {
    const ok = await onConfirm(`Delete loan account record "${accNum}"? This cannot be undone.`);
    if (!ok) return;
    try {
      await deleteLoan(id);
      onAddToast('Loan record deleted.', 'success');
      loadData();
    } catch (err) {
      onAddToast('Failed to delete loan.', 'error');
    }
  };

  const resetForm = () => {
    setProviderName(''); setAccountNumber(''); setLoanType('Business Term Loan');
    setAmount(0); setInterestRate(8.5); setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(''); setEmiAmount(0); setFrequency('Monthly'); setNextDueDate(''); setDocUrl('');
    setEditingLoan(null);
  };

  const openEdit = (l: Loan) => {
    setEditingLoan(l);
    setProviderName(l.providerName);
    setAccountNumber(l.accountNumber);
    setLoanType(l.type);
    setAmount(l.amount);
    setInterestRate(l.interestRate);
    setStartDate(l.startDate);
    setEndDate(l.endDate);
    setEmiAmount(l.emiAmount);
    setFrequency(l.frequency);
    setNextDueDate(l.nextDueDate || '');
    setDocUrl(l.documentUrl || '');
    setShowLoanModal(true);
  };

  // KPIs
  const stats = useMemo(() => {
    const totalOutstanding = loans.reduce((sum, l) => sum + (l.pendingAmount || 0), 0);
    const totalPaid = loans.reduce((sum, l) => sum + (l.paidAmount || 0), 0);
    return {
      totalOutstanding,
      totalPaid,
      loanCount: loans.length
    };
  }, [loans]);

  const loanCols: ALVColumn[] = [
    { key: 'providerName', label: 'Lender Name', sortable: true },
    { key: 'accountNumber', label: 'Account Number', sortable: true },
    { key: 'type', label: 'Loan Type' },
    { key: 'amount', label: 'Total Loan', align: 'right', render: (v) => fmt(Number(v)) },
    { key: 'interestRate', label: 'ROI%', align: 'center', render: (v) => `${v}%` },
    { 
      key: 'monthlyInterest', 
      label: 'Monthly Int.', 
      align: 'right', 
      render: (_, row) => {
        const l = row as unknown as Loan;
        const interest = (l.amount * l.interestRate) / 1200;
        return fmt(interest);
      }
    },
    { 
      key: 'quarterlyInterest', 
      label: 'Quarterly Int.', 
      align: 'right', 
      render: (_, row) => {
        const l = row as unknown as Loan;
        const interest = (l.amount * l.interestRate) / 400;
        return fmt(interest);
      }
    },
    { key: 'emiAmount', label: 'EMI Amount', align: 'right', render: (v) => fmt(Number(v)) },
    { key: 'paidAmount', label: 'Total Paid', align: 'right', render: (v) => fmt(Number(v)) },
    { 
      key: 'pendingAmount', 
      label: 'Outstanding', 
      align: 'right', 
      render: (v) => <strong className="text-danger" style={{ color: '#ef4444' }}>{fmt(Number(v))}</strong> 
    },
    { key: 'nextDueDate', label: 'Due Date' },
    {
      key: 'actions',
      label: 'Actions',
      align: 'center',
      render: (_, row) => {
        const l = row as unknown as Loan;
        return (
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
            {l.pendingAmount > 0 && (
              <button 
                onClick={() => { setSelectedLoan(l); setPayAmount(l.emiAmount); setPayIsInterestOnly(false); setShowPayModal(true); }}
                className="btn btn-sm btn-outline text-success"
                style={{ padding: '2px 8px', color: 'var(--success)', borderColor: 'var(--success)' }}
              >
                Pay EMI
              </button>
            )}
            <button 
              onClick={() => openEdit(l)} 
              className="btn btn-sm btn-outline text-primary"
              style={{ padding: '2px 8px' }}
            >
              Edit
            </button>
            <button 
              onClick={() => handleDeleteLoan(l.id, l.accountNumber)} 
              className="btn btn-sm btn-outline text-danger"
              style={{ padding: '2px 8px', color: '#ef4444', borderColor: '#ef4444' }}
            >
              Delete
            </button>
          </div>
        );
      }
    }
  ];

  const borrowingCols: ALVColumn[] = [
    { key: 'providerName', label: 'Lender Name', sortable: true },
    { key: 'accountNumber', label: 'Reference No', sortable: true, render: (v) => v && String(v).startsWith('BORR-') ? <span className="text-muted">N/A</span> : <span>{String(v)}</span> },
    { key: 'type', label: 'Borrowing Type' },
    { key: 'amount', label: 'Borrowing Amount', align: 'right', render: (v) => fmt(Number(v)) },
    { key: 'interestRate', label: 'ROI%', align: 'center', render: (v) => `${v}%` },
    { 
      key: 'monthlyInterest', 
      label: 'Monthly Int.', 
      align: 'right', 
      render: (_, row) => {
        const l = row as unknown as Loan;
        const interest = (l.amount * l.interestRate) / 1200;
        return fmt(interest);
      }
    },
    { 
      key: 'quarterlyInterest', 
      label: 'Quarterly Int.', 
      align: 'right', 
      render: (_, row) => {
        const l = row as unknown as Loan;
        const interest = (l.amount * l.interestRate) / 400;
        return fmt(interest);
      }
    },
    { key: 'paidAmount', label: 'Total Repaid', align: 'right', render: (v) => fmt(Number(v)) },
    { 
      key: 'pendingAmount', 
      label: 'Outstanding Balance', 
      align: 'right', 
      render: (v) => <strong className="text-danger" style={{ color: '#ef4444' }}>{fmt(Number(v))}</strong> 
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'center',
      render: (_, row) => {
        const l = row as unknown as Loan;
        return (
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
            {l.pendingAmount > 0 && (
              <button 
                onClick={() => { setSelectedLoan(l); setPayAmount(l.emiAmount || 0); setPayIsInterestOnly(false); setShowPayModal(true); }}
                className="btn btn-sm btn-outline text-success"
                style={{ padding: '2px 8px', color: 'var(--success)', borderColor: 'var(--success)' }}
              >
                Repay
              </button>
            )}
            <button 
              onClick={() => openEdit(l)} 
              className="btn btn-sm btn-outline text-primary"
              style={{ padding: '2px 8px' }}
            >
              Edit
            </button>
            <button 
              onClick={() => handleDeleteLoan(l.id, l.accountNumber)} 
              className="btn btn-sm btn-outline text-danger"
              style={{ padding: '2px 8px', color: '#ef4444', borderColor: '#ef4444' }}
            >
              Delete
            </button>
          </div>
        );
      }
    }
  ];

  const payCols: ALVColumn[] = [
    { key: 'paymentDate', label: 'Paid Date', sortable: true },
    { 
      key: 'loanId', 
      label: 'Source / Account', 
      render: (v) => {
        const loan = loans.find(l => l.id === v);
        if (!loan) return <span className="text-muted">Unknown</span>;
        const isB = loan.type.toLowerCase().includes('borrowing');
        return (
          <span>
            {loan.providerName} {loan.accountNumber && !loan.accountNumber.startsWith('BORR-') ? `(${loan.accountNumber})` : ''} 
            <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px', fontWeight: 'bold', background: isB ? '#e0f2fe' : '#f1f5f9', color: isB ? '#0369a1' : '#475569' }}>
              {isB ? 'Borrowing' : 'Bank Loan'}
            </span>
          </span>
        );
      }
    },
    {
      key: 'isInterestOnly',
      label: 'Payment Type',
      render: (_, row) => {
        const p = row as unknown as LoanPayment;
        return (
          <strong>
            {p.isInterestOnly ? (
              <span style={{ color: '#0284c7' }}>Interest Payment</span>
            ) : (
              <span style={{ color: '#16a34a' }}>Principal Repay</span>
            )}
          </strong>
        );
      }
    },
    { key: 'amount', label: 'Paid Amount', align: 'right', render: (v) => fmt(Number(v)) },
    { key: 'accountName', label: 'Paid From', render: (v) => <span>{v ? String(v) : <span className="text-muted">—</span>}</span> },
    { key: 'reference', label: 'Ref No / UTR' }
  ];


  return (
    <div className="admin-page-container">
      {/* KPI Stats cards */}
      <div className="grid grid-3 gap-2 mb-3">
        <div className="stat-card shadow-sm" style={{ borderLeft: '4px solid var(--danger)' }}>
          <div className="stat-icon-wrapper danger-soft">
            <Coins size={24} className="text-danger" />
          </div>
          <div>
            <span className="stat-title">Outstanding Loan Debt</span>
            <h3 className="text-danger">{fmt(stats.totalOutstanding)}</h3>
          </div>
        </div>

        <div className="stat-card shadow-sm" style={{ borderLeft: '4px solid var(--success)' }}>
          <div className="stat-icon-wrapper success-soft">
            <PiggyBank size={24} className="text-success" />
          </div>
          <div>
            <span className="stat-title">Total Loans Repaid</span>
            <h3>{fmt(stats.totalPaid)}</h3>
          </div>
        </div>

        <div className="stat-card shadow-sm" style={{ borderLeft: '4px solid var(--secondary)' }}>
          <div className="stat-icon-wrapper secondary-soft">
            <Calendar size={24} className="text-secondary" />
          </div>
          <div>
            <span className="stat-title">Active Loan Accounts</span>
            <h3>{stats.loanCount}</h3>
          </div>
        </div>
      </div>

      {/* Tab Switcher: Solves the "screen grid half cut not showing in screen" layout issue */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '1rem', gap: '1.5rem' }}>
        <button
          type="button"
          onClick={() => setActiveSubTab('loans')}
          style={{
            padding: '8px 4px',
            fontSize: '0.875rem',
            fontWeight: 700,
            color: activeSubTab === 'loans' ? 'var(--primary)' : '#64748b',
            border: 'none',
            background: 'none',
            borderBottom: activeSubTab === 'loans' ? '3px solid var(--primary)' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          Commercial Loans
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('borrowings')}
          style={{
            padding: '8px 4px',
            fontSize: '0.875rem',
            fontWeight: 700,
            color: activeSubTab === 'borrowings' ? 'var(--primary)' : '#64748b',
            border: 'none',
            background: 'none',
            borderBottom: activeSubTab === 'borrowings' ? '3px solid var(--primary)' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          Other Borrowings
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('payments')}
          style={{
            padding: '8px 4px',
            fontSize: '0.875rem',
            fontWeight: 700,
            color: activeSubTab === 'payments' ? 'var(--primary)' : '#64748b',
            border: 'none',
            background: 'none',
            borderBottom: activeSubTab === 'payments' ? '3px solid var(--primary)' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          Repayment & EMI Logs
        </button>
      </div>

      {/* Main Grid Tables */}
      <div style={{ width: '100%' }}>
        {activeSubTab === 'loans' ? (
          <ALVGrid 
            title="Commercial Bank Loans"
            subtitle="Outstanding commercial bank loans and EMI amortization trackers"
            columns={loanCols}
            data={loans.filter(l => !l.type.toLowerCase().includes('borrowing')) as any}
            rowKey="id"
            onAdd={() => { resetForm(); setLoanType('Business Term Loan'); setShowLoanModal(true); }}
            addLabel="Record Bank Loan"
            onRefresh={loadData}
            pageSize={10}
            selectable={false}
            loading={loading}
          />
        ) : activeSubTab === 'borrowings' ? (
          <ALVGrid 
            title="Other Borrowings Register"
            subtitle="Personal, director, and unsecured business borrowings details"
            columns={borrowingCols}
            data={loans.filter(l => l.type.toLowerCase().includes('borrowing')) as any}
            rowKey="id"
            onAdd={() => { resetForm(); setLoanType('Personal Borrowing'); setShowLoanModal(true); }}
            addLabel="Record Borrowing"
            onRefresh={loadData}
            pageSize={10}
            selectable={false}
            loading={loading}
          />
        ) : (
          <>
            <div style={{ 
              marginBottom: '1rem', 
              display: 'flex', 
              gap: '10px', 
              alignItems: 'center', 
              background: '#f8fafc', 
              border: '1px solid #cbd5e1', 
              borderRadius: '8px', 
              padding: '0.6rem 1rem',
              maxWidth: '450px'
            }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Filter Account:</label>
              <select
                value={filterLoanId}
                onChange={e => setFilterLoanId(e.target.value)}
                className="form-control"
                style={{ flex: 1, margin: 0, height: '32px', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
              >
                <option value="">All Loans/Borrowings</option>
                {loans.map(l => (
                  <option key={l.id} value={l.id}>{l.providerName} ({l.accountNumber})</option>
                ))}
              </select>
            </div>
            <ALVGrid 
              title="Repayment & EMI Logs"
              subtitle="History of borrowing repayments and EMI bank payments recorded"
              columns={payCols}
              data={filteredPayments as any}
              rowKey="id"
              onRefresh={loadData}
              pageSize={10}
              selectable={false}
              loading={loading}
            />
          </>
        )}
      </div>

      {/* Loan Form Modal */}
      {showLoanModal && (
        <div className="modal-overlay" onClick={() => setShowLoanModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '600px' }}>
            <div className="modal-header">
              <h3>{editingLoan ? (editingLoan.type.toLowerCase().includes('borrowing') ? 'Edit Borrowing Details' : 'Edit Loan Details') : (loanType.toLowerCase().includes('borrowing') ? 'Record New Borrowing' : 'Record New Loan Account')}</h3>
              <button onClick={() => setShowLoanModal(false)} className="close-btn"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveLoan}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {(() => {
                  const isBorr = loanType.toLowerCase().includes('borrowing');
                  return (
                    <>
                      <div className="grid grid-2 gap-2">
                        <div className="form-group">
                          <label className="form-label">{isBorr ? 'Lender / Source Name *' : 'Lender / Bank Name *'}</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            value={providerName} 
                            onChange={e => setProviderName(e.target.value)} 
                            placeholder={isBorr ? 'e.g. Director John Doe' : 'e.g. HDFC Commercial Bank'}
                            required 
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">{isBorr ? 'Reference No (Optional)' : 'Loan Account Number *'}</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            value={accountNumber} 
                            onChange={e => setAccountNumber(e.target.value)} 
                            placeholder={isBorr ? 'e.g. Agreement Ref #123' : 'e.g. 501009876543'}
                            required={!isBorr} 
                          />
                        </div>
                      </div>

                      <div className="grid grid-2 gap-2">
                        <div className="form-group" style={{ position: 'relative' }}>
                          <label className="form-label">Loan / Borrowing Type *</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            value={loanType} 
                            onChange={e => {
                              setLoanType(e.target.value);
                              setShowLoanTypeSuggest(true);
                            }} 
                            onFocus={() => setShowLoanTypeSuggest(true)}
                            onBlur={() => setTimeout(() => setShowLoanTypeSuggest(false), 250)}
                            placeholder="Search or type loan type..."
                            required
                          />
                          {showLoanTypeSuggest && (
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
                              {loanType.trim() !== '' && !suggestedLoanTypes.some(t => t.toLowerCase() === loanType.toLowerCase()) && (
                                <div 
                                  onMouseDown={() => {
                                    setLoanType(loanType.trim());
                                    setShowLoanTypeSuggest(false);
                                  }}
                                  style={{ 
                                    padding: '8px 12px', 
                                    cursor: 'pointer', 
                                    borderBottom: '1px solid #f1f5f9', 
                                    fontSize: '0.78rem',
                                    fontWeight: 'bold',
                                    color: '#0891b2',
                                    backgroundColor: '#f0fdfa'
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#ccfbf1'; }}
                                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#f0fdfa'; }}
                                >
                                  + Use/Create: "{loanType.trim()}"
                                </div>
                              )}
                              {suggestedLoanTypes
                                .filter(t => t.toLowerCase().includes(loanType.toLowerCase()))
                                .map((t, idx) => (
                                  <div 
                                    key={idx}
                                    onMouseDown={() => {
                                      setLoanType(t);
                                      setShowLoanTypeSuggest(false);
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
                                    {t}
                                  </div>
                                ))
                              }
                            </div>
                          )}
                        </div>
                        <div className="form-group">
                          <label className="form-label">Principal / Borrowing Amount *</label>
                          <input 
                            type="number" 
                            className="form-control" 
                            value={amount} 
                            onChange={e => setAmount(parseFloat(e.target.value) || 0)} 
                            min={0}
                            required 
                          />
                        </div>
                      </div>

                      {!isBorr ? (
                        <div className="grid grid-3 gap-2">
                          <div className="form-group">
                            <label className="form-label">ROI Percentage % *</label>
                            <input 
                              type="number" 
                              step="0.01"
                              className="form-control" 
                              value={interestRate} 
                              onChange={e => setInterestRate(parseFloat(e.target.value) || 0)} 
                              min={0}
                              required 
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">EMI Amount (INR) *</label>
                            <input 
                              type="number" 
                              className="form-control" 
                              value={emiAmount} 
                              onChange={e => setEmiAmount(parseFloat(e.target.value) || 0)} 
                              min={0}
                              required 
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">EMI Frequency</label>
                            <select 
                              value={frequency} 
                              onChange={e => setFrequency(e.target.value)} 
                              className="form-control"
                            >
                              <option value="Monthly">Monthly</option>
                              <option value="Quarterly">Quarterly</option>
                              <option value="Yearly">Yearly</option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div className="form-group" style={{ maxWidth: '300px' }}>
                          <label className="form-label">ROI Percentage % *</label>
                          <input 
                            type="number" 
                            step="0.01"
                            className="form-control" 
                            value={interestRate} 
                            onChange={e => setInterestRate(parseFloat(e.target.value) || 0)} 
                            min={0}
                            required 
                          />
                        </div>
                      )}

                      <div style={{ 
                        background: '#f8fafc', 
                        border: '1.5px dashed #cbd5e1', 
                        borderRadius: '8px', 
                        padding: '0.75rem 1rem', 
                        marginBottom: '1.25rem',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '1rem'
                      }}>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Monthly Interest Amount</span>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f766e', marginTop: '2px' }}>
                            {fmt((amount * interestRate) / 1200)}
                          </div>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quarterly Interest Amount</span>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#b45309', marginTop: '2px' }}>
                            {fmt((amount * interestRate) / 400)}
                          </div>
                        </div>
                      </div>

                      <div className={isBorr ? "grid grid-2 gap-2" : "grid grid-3 gap-2"}>
                        <div className="form-group">
                          <label className="form-label">{isBorr ? 'Borrowing Date *' : 'Disbursement Date *'}</label>
                          <input 
                            type="date" 
                            className="form-control" 
                            value={startDate} 
                            onChange={e => setStartDate(e.target.value)} 
                            required 
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">{isBorr ? 'Repayment / Maturity Date' : 'Maturity Date'}</label>
                          <input 
                            type="date" 
                            className="form-control" 
                            value={endDate} 
                            onChange={e => setEndDate(e.target.value)} 
                          />
                        </div>
                        {!isBorr && (
                          <div className="form-group">
                            <label className="form-label">Next EMI Due Date</label>
                            <input 
                              type="date" 
                              className="form-control" 
                              value={nextDueDate} 
                              onChange={e => setNextDueDate(e.target.value)} 
                            />
                          </div>
                        )}
                      </div>

                      <div className="form-group">
                        <label className="form-label">{isBorr ? 'Borrowing Doc / Scanned Link' : 'Loan Agreement Doc Link'}</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={docUrl} 
                          onChange={e => setDocUrl(e.target.value)} 
                          placeholder={isBorr ? 'URL to scanned borrowing document or agreement' : 'URL to scanned loan terms'} 
                        />
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowLoanModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-secondary">{loanType.toLowerCase().includes('borrowing') ? 'Save Borrowing Record' : 'Save Loan Record'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay EMI Modal */}
      {showPayModal && selectedLoan && (() => {
        const isBorr = selectedLoan.type.toLowerCase().includes('borrowing');
        return (
          <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '450px' }}>
              <div className="modal-header">
                <h3>{isBorr ? 'Record Repayment' : 'Record EMI Payment'}</h3>
                <button onClick={() => setShowPayModal(false)} className="close-btn"><X size={20} /></button>
              </div>
              <form onSubmit={handlePayEMI}>
                <div className="modal-body">
                  <div style={{ marginBottom: '1rem' }}>
                    <span className="text-muted">{isBorr ? 'Borrowing Source:' : 'Loan Account:'}</span>{' '}
                    <strong className="text-dark">
                      {selectedLoan.providerName}{' '}
                      {selectedLoan.accountNumber && !selectedLoan.accountNumber.startsWith('BORR-') ? `(${selectedLoan.accountNumber})` : ''}
                    </strong>
                  </div>

                  {isBorr && (
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label className="form-label">Repayment Type *</label>
                      <div style={{ display: 'flex', gap: '20px', marginTop: '6px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                          <input 
                            type="radio" 
                            name="repayType" 
                            checked={!payIsInterestOnly} 
                            onChange={() => setPayIsInterestOnly(false)} 
                          />
                          Principal Repayment
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                          <input 
                            type="radio" 
                            name="repayType" 
                            checked={payIsInterestOnly} 
                            onChange={() => setPayIsInterestOnly(true)} 
                          />
                          Interest Only Payment
                        </label>
                      </div>
                      {payIsInterestOnly && (
                        <div style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: '4px', fontStyle: 'italic' }}>
                          ℹ️ Interest payment will deduct from wallet balance but will NOT decrease the borrowing principal outstanding.
                        </div>
                      )}
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">{isBorr ? 'Repayment Date *' : 'EMI Payment Date *'}</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={payDate} 
                      onChange={e => setPayDate(e.target.value)} 
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">{isBorr ? 'Repayment Amount paid (INR) *' : 'EMI Amount paid (INR) *'}</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={payAmount} 
                      onChange={e => setPayAmount(parseFloat(e.target.value) || 0)} 
                      min={0}
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Paid From Account *</label>
                    <select 
                      value={payWalletId} 
                      onChange={e => setPayWalletId(e.target.value)} 
                      className="form-control"
                      required
                    >
                      <option value="">-- Select Cash/Bank Wallet --</option>
                      {wallets.map(w => (
                        <option key={w.id} value={w.id}>{w.name} (₹{w.currentBalance.toLocaleString('en-IN')})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Transaction Reference No / UTR</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={payRef} 
                      onChange={e => setPayRef(e.target.value)} 
                      placeholder="Bank reference number" 
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" onClick={() => setShowPayModal(false)} className="btn btn-outline">Cancel</button>
                  <button type="submit" className="btn btn-secondary">Record Payment</button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
