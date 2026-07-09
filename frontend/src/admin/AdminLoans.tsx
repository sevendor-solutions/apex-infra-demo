import React, { useState, useEffect, useMemo } from 'react';
import type { Loan, LoanPayment } from '../types';
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
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onConfirm: (msg: string) => Promise<boolean>;
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const AdminLoans: React.FC<AdminLoansProps> = ({
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
  const [activeSubTab, setActiveSubTab] = useState<'loans' | 'payments'>('loans');

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

  // Form Fields - EMI Payment
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payAmount, setPayAmount] = useState(0);
  const [payRef, setPayRef] = useState('');

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
    if (!providerName.trim() || !accountNumber.trim() || amount <= 0 || emiAmount <= 0) {
      onAddToast('Required loan details are missing.', 'error');
      return;
    }
    try {
      const payload = {
        providerName, accountNumber, type: loanType,
        amount, interestRate, startDate, endDate, emiAmount, frequency,
        nextDueDate, documentUrl: docUrl
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
      onAddToast('Please select a loan and enter pay amount.', 'error');
      return;
    }
    try {
      await payLoanEMI(selectedLoan.id, {
        paymentDate: payDate,
        amount: payAmount,
        reference: payRef
      });
      onAddToast('EMI payment logged successfully.', 'success');
      setShowPayModal(false);
      setPayAmount(0);
      setPayRef('');
      loadData();
    } catch (err) {
      onAddToast('Failed to record EMI payment.', 'error');
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
                onClick={() => { setSelectedLoan(l); setPayAmount(l.emiAmount); setShowPayModal(true); }}
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

  const payCols: ALVColumn[] = [
    { key: 'paymentDate', label: 'Paid Date', sortable: true },
    { key: 'amount', label: 'EMI Amount', align: 'right', render: (v) => fmt(Number(v)) },
    { key: 'reference', label: 'Ref No' }
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
          Active Loans Register
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
          EMI Payment Logs
        </button>
      </div>

      {/* Main Grid Tables */}
      <div style={{ width: '100%' }}>
        {activeSubTab === 'loans' ? (
          <ALVGrid 
            title="Business Loan Register"
            subtitle="Outstanding commercial bank loans and EMI amortization trackers"
            columns={loanCols}
            data={loans as any}
            rowKey="id"
            onAdd={() => { resetForm(); setShowLoanModal(true); }}
            addLabel="Record Loan A/c"
            onRefresh={loadData}
            pageSize={10}
            selectable={false}
            loading={loading}
          />
        ) : (
          <ALVGrid 
            title="EMI Amortization Logs"
            subtitle="History of EMI bank payments recorded"
            columns={payCols}
            data={payments as any}
            rowKey="id"
            onRefresh={loadData}
            pageSize={10}
            selectable={false}
            loading={loading}
          />
        )}
      </div>

      {/* Loan Form Modal */}
      {showLoanModal && (
        <div className="modal-overlay" onClick={() => setShowLoanModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '600px' }}>
            <div className="modal-header">
              <h3>{editingLoan ? `Edit Loan: ${editingLoan.accountNumber}` : 'Record New Loan Account'}</h3>
              <button onClick={() => setShowLoanModal(false)} className="close-btn"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveLoan}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="grid grid-2 gap-2">
                  <div className="form-group">
                    <label className="form-label">Lender/Bank Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={providerName} 
                      onChange={e => setProviderName(e.target.value)} 
                      placeholder="e.g. HDFC Commercial Bank"
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Loan Account Number</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={accountNumber} 
                      onChange={e => setAccountNumber(e.target.value)} 
                      placeholder="e.g. 501009876543"
                      required 
                    />
                  </div>
                </div>

                <div className="grid grid-2 gap-2">
                  <div className="form-group">
                    <label className="form-label">Loan Type</label>
                    <select 
                      value={loanType} 
                      onChange={e => setLoanType(e.target.value)} 
                      className="form-control"
                    >
                      <option value="Business Term Loan">Business Term Loan</option>
                      <option value="Working Capital Loan">Working Capital Loan</option>
                      <option value="Overdraft Facility">Overdraft Facility</option>
                      <option value="Vehicle/Equipment Loan">Vehicle/Equipment Loan</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Principal Borrowed (INR)</label>
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

                <div className="grid grid-3 gap-2">
                  <div className="form-group">
                    <label className="form-label">ROI Percentage %</label>
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
                    <label className="form-label">EMI Amount (INR)</label>
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

                <div className="grid grid-3 gap-2">
                  <div className="form-group">
                    <label className="form-label">Disbursement Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={startDate} 
                      onChange={e => setStartDate(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Maturity Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={endDate} 
                      onChange={e => setEndDate(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Next EMI Due Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={nextDueDate} 
                      onChange={e => setNextDueDate(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Loan Agreement Doc Link</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={docUrl} 
                    onChange={e => setDocUrl(e.target.value)} 
                    placeholder="URL to scanned loan terms" 
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowLoanModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-secondary">Save Loan Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay EMI Modal */}
      {showPayModal && selectedLoan && (
        <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '450px' }}>
            <div className="modal-header">
              <h3>Record EMI Payment</h3>
              <button onClick={() => setShowPayModal(false)} className="close-btn"><X size={20} /></button>
            </div>
            <form onSubmit={handlePayEMI}>
              <div className="modal-body">
                <div style={{ marginBottom: '1rem' }}>
                  <span className="text-muted">Loan Account:</span> <strong className="text-dark">{selectedLoan.providerName} ({selectedLoan.accountNumber})</strong>
                </div>

                <div className="form-group">
                  <label className="form-label">EMI Payment Date</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={payDate} 
                    onChange={e => setPayDate(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">EMI Amount paid (INR)</label>
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
      )}
    </div>
  );
};
