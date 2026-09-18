import React, { useState, useEffect, useMemo } from 'react';
import type { Wallet, WalletTransaction } from '../types';
import { 
  ArrowUpRight, ArrowDownLeft, RefreshCw, 
  Wallet as WalletIcon, X, Landmark
} from 'lucide-react';
import { 
  getWallets, addWallet, deleteWallet, 
  getWalletTransactions, addWalletMoney, withdrawWalletMoney, transferWalletMoney 
} from '../utils/db';
import { ALVGrid } from './ALVGrid';
import type { ALVColumn } from './ALVGrid';

interface AdminWalletsProps {
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onConfirm: (msg: string) => Promise<boolean>;
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const AdminWallets: React.FC<AdminWalletsProps> = ({
  onAddToast,
  onConfirm
}) => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [txType, setTxType] = useState<'Add' | 'Withdraw' | 'Transfer'>('Add');

  // Form Fields
  const [walletName, setWalletName] = useState('');
  const [walletType, setWalletType] = useState('Bank');
  const [openingBalance, setOpeningBalance] = useState(0);

  const [txWalletId, setTxWalletId] = useState('');
  const [txToWalletId, setTxToWalletId] = useState('');
  const [txAmount, setTxAmount] = useState(0);
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txPaymentMode, setTxPaymentMode] = useState('UPI');
  const [txRef, setTxRef] = useState('');
  const [txDesc, setTxDesc] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const walletList = await getWallets();
      setWallets(walletList);
    } catch (err) {
      onAddToast('Failed to load wallets data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadTransactions = async () => {
    try {
      const txList = await getWalletTransactions(selectedWalletId || undefined);
      setTransactions(txList);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [selectedWalletId]);

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletName.trim()) {
      onAddToast('Wallet name is required.', 'error');
      return;
    }
    try {
      await addWallet({
        name: walletName,
        type: walletType,
        openingBalance
      });
      onAddToast('Wallet created successfully.', 'success');
      setShowWalletModal(false);
      setWalletName('');
      setOpeningBalance(0);
      loadData();
    } catch (err) {
      onAddToast('Failed to create wallet.', 'error');
    }
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (txAmount <= 0) {
      onAddToast('Amount must be greater than zero.', 'error');
      return;
    }
    try {
      if (txType === 'Add') {
        await addWalletMoney({
          walletId: txWalletId,
          amount: txAmount,
          date: txDate,
          paymentMode: txPaymentMode,
          referenceNumber: txRef,
          description: txDesc
        });
        onAddToast('Money added successfully.', 'success');
      } else if (txType === 'Withdraw') {
        await withdrawWalletMoney({
          walletId: txWalletId,
          amount: txAmount,
          date: txDate,
          paymentMode: txPaymentMode,
          referenceNumber: txRef,
          description: txDesc
        });
        onAddToast('Money withdrawn successfully.', 'success');
      } else {
        if (txWalletId === txToWalletId) {
          onAddToast('Source and destination wallets must be different.', 'error');
          return;
        }
        await transferWalletMoney({
          fromWalletId: txWalletId,
          toWalletId: txToWalletId,
          amount: txAmount,
          date: txDate,
          description: txDesc
        });
        onAddToast('Transfer completed successfully.', 'success');
      }
      setShowTxModal(false);
      setTxAmount(0);
      setTxRef('');
      setTxDesc('');
      loadData();
      loadTransactions();
    } catch (err) {
      onAddToast('Transaction failed.', 'error');
    }
  };

  const handleDeleteWallet = async (id: string, name: string) => {
    const ok = await onConfirm(`Delete wallet "${name}"? This will clear its balance register.`);
    if (!ok) return;
    try {
      await deleteWallet(id);
      onAddToast('Wallet deleted.', 'success');
      loadData();
    } catch (err) {
      onAddToast('Failed to delete wallet.', 'error');
    }
  };

  const walletCols: ALVColumn[] = [
    { 
      key: 'name', 
      label: 'WALLET / ACCOUNT NAME', 
      sortable: true,
      render: (v) => (
        <span style={{ fontWeight: 700, color: 'var(--sap-fiori-blue, #0854a0)' }}>
          {String(v)}
        </span>
      )
    },
    { 
      key: 'type', 
      label: 'ACCOUNT TYPE', 
      sortable: true,
      render: (v) => {
        const type = String(v);
        const bg = type === 'Bank' ? '#eff6ff' : type === 'Cash' ? '#ecfdf5' : '#f5f3ff';
        const color = type === 'Bank' ? '#1d4ed8' : type === 'Cash' ? '#047857' : '#7c3aed';
        return (
          <span style={{ background: bg, color, padding: '2px 9px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 600 }}>
            {type}
          </span>
        );
      }
    },
    { 
      key: 'openingBalance', 
      label: 'OPENING BALANCE', 
      sortable: true,
      align: 'right', 
      render: (v) => <span style={{ color: '#64748b', fontSize: '0.8rem', fontFamily: 'monospace' }}>{fmt(Number(v))}</span> 
    },
    { 
      key: 'currentBalance', 
      label: 'CURRENT BALANCE', 
      sortable: true,
      align: 'right', 
      render: (v) => {
        const amt = Number(v || 0);
        return (
          <strong style={{ color: amt < 0 ? '#ef4444' : '#047857', fontSize: '0.85rem', fontFamily: 'monospace' }}>
            {fmt(amt)}
          </strong>
        );
      }
    },
    {
      key: 'actions',
      label: 'ACTIONS',
      align: 'center',
      render: (_, row) => {
        const isSelected = selectedWalletId === String(row.id);
        return (
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
            <button
              onClick={() => setSelectedWalletId(isSelected ? '' : String(row.id))}
              style={{
                padding: '2px 9px',
                fontSize: '0.72rem',
                fontWeight: 600,
                borderRadius: '4px',
                border: isSelected ? '1px solid #16a34a' : '1px solid #3b82f6',
                background: isSelected ? '#dcfce7' : '#eff6ff',
                color: isSelected ? '#15803d' : '#2563eb',
                cursor: 'pointer'
              }}
              title={isSelected ? 'Reset to All Accounts' : 'Filter ledger to this account'}
            >
              {isSelected ? '✓ Viewing' : 'View Ledger'}
            </button>
            <button 
              onClick={() => handleDeleteWallet(String(row.id), String(row.name))} 
              style={{ padding: '2px 9px', color: '#ef4444', borderColor: '#ef4444', border: '1px solid #ef4444', background: 'transparent', fontSize: '0.72rem', borderRadius: '4px', cursor: 'pointer' }}
            >
              Delete
            </button>
          </div>
        );
      }
    }
  ];

  const txCols: ALVColumn[] = [
    { 
      key: 'date', 
      label: 'DATE', 
      sortable: true,
      render: (v) => (
        <span style={{ whiteSpace: 'nowrap', fontSize: '0.78rem', color: '#334155' }}>
          {v ? new Date(String(v)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
        </span>
      )
    },
    {
      key: 'walletId',
      label: 'ACCOUNT / WALLET',
      sortable: true,
      render: (v) => {
        const w = wallets.find(item => item.id === String(v));
        return (
          <span style={{ fontWeight: 700, color: 'var(--sap-fiori-blue, #0854a0)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
            {w ? w.name : String(v || '—')}
          </span>
        );
      }
    },
    { 
      key: 'type', 
      label: 'TYPE', 
      sortable: true, 
      render: (v) => {
        const type = String(v || '');
        const isCredit = type === 'Credit';
        const isDebit = type === 'Debit';
        return (
          <span style={{
            padding: '2px 9px',
            borderRadius: '12px',
            fontSize: '0.72rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            background: isCredit ? '#e8f5e9' : isDebit ? '#ffebee' : '#eff6ff',
            color: isCredit ? '#2e7d32' : isDebit ? '#c62828' : '#1d4ed8'
          }}>
            {type}
          </span>
        );
      }
    },
    { 
      key: 'amount', 
      label: 'AMOUNT (₹)', 
      align: 'right', 
      sortable: true,
      render: (v, row: any) => {
        const isCredit = row.type === 'Credit';
        return (
          <span style={{
            fontWeight: 700,
            color: isCredit ? '#16a34a' : '#ef4444',
            fontFamily: 'monospace',
            fontSize: '0.84rem',
            whiteSpace: 'nowrap'
          }}>
            {isCredit ? '+' : '-'} {fmt(Number(v || 0))}
          </span>
        );
      }
    },
    { 
      key: 'paymentMode', 
      label: 'PAYMENT MODE', 
      sortable: true,
      render: (v) => (
        <span style={{ background: '#f1f5f9', color: '#475569', borderRadius: '12px', padding: '2px 8px', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
          {String(v || 'Cash')}
        </span>
      )
    },
    { 
      key: 'referenceNumber', 
      label: 'REF NUM', 
      sortable: true,
      render: (v) => (
        <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#64748b' }}>
          {String(v || '—')}
        </span>
      )
    },
    { 
      key: 'description', 
      label: 'DESCRIPTION / REMARKS',
      render: (v) => (
        <span style={{ color: '#1e293b', fontSize: '0.8rem', lineHeight: 1.4 }}>
          {String(v || '—')}
        </span>
      )
    }
  ];

  const totalBalance = useMemo(() => {
    return wallets.reduce((sum, w) => sum + (w.currentBalance || 0), 0);
  }, [wallets]);

  const selectedWalletName = useMemo(() => {
    if (!selectedWalletId) return 'All Accounts (Consolidated)';
    const found = wallets.find(w => w.id === selectedWalletId);
    return found ? `${found.name} (${fmt(found.currentBalance)})` : 'Selected Account';
  }, [wallets, selectedWalletId]);

  const ledgerExtraToolbar = (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
          Account Ledger:
        </span>
        <select 
          value={selectedWalletId} 
          onChange={e => setSelectedWalletId(e.target.value)} 
          style={{
            padding: '0.35rem 0.65rem',
            fontSize: '0.78rem',
            border: '1px solid var(--sap-border-color, #c8c8c8)',
            borderRadius: '6px',
            background: 'var(--sap-card-bg, #fff)',
            color: '#1e293b',
            fontWeight: 600,
            outline: 'none',
            cursor: 'pointer',
            minWidth: '220px'
          }}
        >
          <option value="">All Accounts (Consolidated)</option>
          {wallets.map(w => (
            <option key={w.id} value={w.id}>{w.name} ({fmt(w.currentBalance)})</option>
          ))}
        </select>
      </div>

      <button 
        onClick={() => { setTxType('Transfer'); setTxWalletId(selectedWalletId || (wallets[0]?.id || '')); setShowTxModal(true); }}
        className="btn btn-primary btn-sm flex align-center gap-0.5"
        style={{ padding: '0.35rem 0.85rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
      >
        <RefreshCw size={13} /> Fund Transfer
      </button>

      {selectedWalletId && (
        <button
          onClick={() => setSelectedWalletId('')}
          style={{
            background: '#fee2e2',
            border: 'none',
            color: '#dc2626',
            borderRadius: '4px',
            padding: '3px 8px',
            fontSize: '0.72rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
          title="Reset to All Accounts"
        >
          Show All Accounts
        </button>
      )}
    </div>
  );

  return (
    <div className="admin-page-container admin-wallets-view" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* 💳 Page Header 💳 */}
      <div className="admin-header-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <WalletIcon size={20} className="text-secondary" /> Cash & Bank Registry
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Manage cash boxes, bank checking accounts, and record transactions</p>
        </div>
        <div className="admin-header-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => { setTxType('Add'); setTxWalletId(selectedWalletId || (wallets[0]?.id || '')); setShowTxModal(true); }}
            className="btn btn-secondary flex align-center justify-center gap-1 font-bold"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <ArrowUpRight size={16} /> Add Deposit
          </button>
          <button 
            onClick={() => { setTxType('Withdraw'); setTxWalletId(selectedWalletId || (wallets[0]?.id || '')); setShowTxModal(true); }}
            className="btn btn-outline flex align-center justify-center gap-1 font-bold"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', borderColor: 'var(--primary)', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <ArrowDownLeft size={16} /> Record Withdrawal
          </button>
          <button 
            onClick={() => { setTxType('Transfer'); setTxWalletId(selectedWalletId || (wallets[0]?.id || '')); setShowTxModal(true); }}
            className="btn btn-primary flex align-center justify-center gap-1 font-bold"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCw size={15} /> Fund Transfer
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-3 gap-2 mb-3 admin-kpi-grid">
        <div className="stat-card shadow-sm" style={{ borderLeft: '4px solid var(--secondary)' }}>
          <div className="stat-icon-wrapper secondary-soft">
            <WalletIcon size={22} className="text-secondary" />
          </div>
          <div>
            <span className="stat-title">Total Cash/Bank Balance</span>
            <h3>{fmt(totalBalance)}</h3>
          </div>
        </div>

        <div className="stat-card shadow-sm" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Landmark size={22} />
          </div>
          <div>
            <span className="stat-title">Total Accounts</span>
            <h3>{wallets.length}</h3>
          </div>
        </div>

        <div className="stat-card shadow-sm" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <ArrowUpRight size={22} />
          </div>
          <div>
            <span className="stat-title">Ledger Transactions</span>
            <h3>{transactions.length} Records</h3>
          </div>
        </div>
      </div>

      {/* Full-width Stacked Layout (No Half-Cut Split!) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '100%' }}>
        {/* ── 1. Cash & Bank Accounts Registry ── */}
        <div style={{ width: '100%', maxWidth: '100%' }}>
          <ALVGrid 
            title="Cash & Bank Accounts"
            subtitle="Manage cash boxes, bank checking accounts, and corporate digital wallets"
            columns={walletCols}
            data={wallets as any}
            rowKey="id"
            onAdd={() => setShowWalletModal(true)}
            addLabel="Create New Account"
            onRefresh={loadData}
            searchable={false}
            pageSize={10}
            selectable={false}
            loading={loading}
          />
        </div>

        {/* ── 2. Full-Width Account Ledger (Transaction History) ── */}
        <div style={{ width: '100%', maxWidth: '100%' }}>
          <ALVGrid 
            title="Account Ledger (Transaction History)"
            subtitle={selectedWalletId ? `Ledger postings for: ${selectedWalletName}` : 'Consolidated ledger postings across all cash & bank accounts'}
            columns={txCols}
            data={transactions as any}
            rowKey="id"
            onRefresh={loadTransactions}
            extraToolbarActions={ledgerExtraToolbar}
            searchable={true}
            searchPlaceholder="Search by reference, description, amount, payment mode..."
            pageSize={15}
            selectable={false}
            loading={loading}
          />
        </div>
      </div>

      {/* Wallet Modal */}
      {showWalletModal && (
        <div className="modal-overlay" onClick={() => setShowWalletModal(false)}>
          <form className="modal-content" onSubmit={handleCreateWallet} onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', width: '95vw' }}>
            <div className="modal-header">
              <h3>Create New Account</h3>
              <button type="button" onClick={() => setShowWalletModal(false)} className="close-btn"><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Account / Wallet Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={walletName} 
                  onChange={e => setWalletName(e.target.value)} 
                  placeholder="e.g. SBI Current A/c"
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Account Type</label>
                <select 
                  value={walletType} 
                  onChange={e => setWalletType(e.target.value)} 
                  className="form-control"
                >
                  <option value="Cash">Cash (Cash Register/Drawer)</option>
                  <option value="Bank">Bank (Savings/Current/Checking Account)</option>
                  <option value="Digital Wallet">Digital Wallet (GPay, PhonePe, Paytm)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Opening Balance (INR)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={openingBalance} 
                  onChange={e => setOpeningBalance(parseFloat(e.target.value) || 0)} 
                  min={0}
                  required 
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setShowWalletModal(false)} className="btn btn-outline">Cancel</button>
              <button type="submit" className="btn btn-secondary">Create Account</button>
            </div>
          </form>
        </div>
      )}

      {/* Transaction Modal */}
      {showTxModal && (
        <div className="modal-overlay" onClick={() => setShowTxModal(false)}>
          <form className="modal-content" onSubmit={handleTransaction} onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '95vw' }}>
            <div className="modal-header">
              <h3>{txType === 'Add' ? 'Add Deposit Money' : txType === 'Withdraw' ? 'Record Withdrawal / Expense Payment' : 'Internal Account Transfer'}</h3>
              <button type="button" onClick={() => setShowTxModal(false)} className="close-btn"><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">{txType === 'Transfer' ? 'Source Account' : 'Account'}</label>
                <select 
                  value={txWalletId} 
                  onChange={e => setTxWalletId(e.target.value)} 
                  className="form-control"
                  required
                >
                  <option value="">Select Account...</option>
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({fmt(w.currentBalance)})</option>
                  ))}
                </select>
              </div>

              {txType === 'Transfer' && (
                <div className="form-group">
                  <label className="form-label">Destination Account</label>
                  <select 
                    value={txToWalletId} 
                    onChange={e => setTxToWalletId(e.target.value)} 
                    className="form-control"
                    required
                  >
                    <option value="">Select Target Account...</option>
                    {wallets.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({fmt(w.currentBalance)})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Amount (INR)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={txAmount} 
                  onChange={e => setTxAmount(parseFloat(e.target.value) || 0)} 
                  min={0.01}
                  step="any"
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Post Date</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={txDate} 
                  onChange={e => setTxDate(e.target.value)} 
                  required 
                />
              </div>

              {txType !== 'Transfer' && (
                <div className="form-group">
                  <label className="form-label">Payment Mode</label>
                  <select 
                    value={txPaymentMode} 
                    onChange={e => setTxPaymentMode(e.target.value)} 
                    className="form-control"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI Payment</option>
                    <option value="Bank Transfer">Net Banking / NEFT</option>
                    <option value="Cheque">Bank Cheque</option>
                  </select>
                </div>
              )}

              {txType !== 'Transfer' && (
                <div className="form-group">
                  <label className="form-label">Reference Number (Optional)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={txRef} 
                    onChange={e => setTxRef(e.target.value)} 
                    placeholder="e.g. UTR / Tx ID"
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Post Description / Memo</label>
                <textarea 
                  className="form-control" 
                  value={txDesc} 
                  onChange={e => setTxDesc(e.target.value)} 
                  placeholder="Brief notes about the transaction..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setShowTxModal(false)} className="btn btn-outline">Cancel</button>
              <button type="submit" className="btn btn-secondary">Submit Transaction</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
