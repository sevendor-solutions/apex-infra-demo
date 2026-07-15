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
      if (walletList.length > 0 && !selectedWalletId) {
        setSelectedWalletId(walletList[0].id);
      }
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
    { key: 'name', label: 'Wallet Name', sortable: true },
    { key: 'type', label: 'Type', sortable: true },
    { 
      key: 'openingBalance', 
      label: 'Opening Balance', 
      align: 'right', 
      render: (v) => fmt(Number(v)) 
    },
    { 
      key: 'currentBalance', 
      label: 'Current Balance', 
      align: 'right', 
      render: (v) => <strong style={{ color: 'var(--primary)' }}>{fmt(Number(v))}</strong> 
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'center',
      render: (_, row) => (
        <button 
          onClick={() => handleDeleteWallet(String(row.id), String(row.name))} 
          className="btn btn-sm btn-outline text-danger"
          style={{ padding: '2px 8px', color: '#ef4444', borderColor: '#ef4444' }}
        >
          Delete
        </button>
      )
    }
  ];

  const txCols: ALVColumn[] = [
    { key: 'date', label: 'Date', sortable: true },
    { key: 'type', label: 'Type', sortable: true, render: (v) => {
      const type = String(v);
      const color = type === 'Credit' ? 'var(--success)' : type === 'Debit' ? 'var(--danger)' : 'var(--info)';
      return <span style={{ color, fontWeight: 'bold' }}>{type}</span>;
    }},
    { key: 'amount', label: 'Amount', align: 'right', render: (v) => fmt(Number(v)) },
    { key: 'paymentMode', label: 'Payment Mode' },
    { key: 'referenceNumber', label: 'Ref Num' },
    { key: 'description', label: 'Description' }
  ];

  const totalBalance = useMemo(() => {
    return wallets.reduce((sum, w) => sum + (w.currentBalance || 0), 0);
  }, [wallets]);

  return (
    <div className="admin-page-container">
      {/* 💳 Page Header 💳 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <WalletIcon size={20} className="text-secondary" /> Cash & Bank Registry
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Manage cash boxes, bank checking accounts, and record transactions</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => { setTxType('Add'); setTxWalletId(selectedWalletId); setShowTxModal(true); }}
            className="btn btn-secondary flex align-center justify-center gap-1 font-bold"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <ArrowUpRight size={16} /> Add Deposit
          </button>
          <button 
            onClick={() => { setTxType('Withdraw'); setTxWalletId(selectedWalletId); setShowTxModal(true); }}
            className="btn btn-outline flex align-center justify-center gap-1 font-bold"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', borderColor: 'var(--primary)', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <ArrowDownLeft size={16} /> Record Withdrawal
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-3 gap-2 mb-3">
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

      <div className="grid grid-2 gap-3 mobile-stack">
        {/* Wallets Registry */}
        <div>
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

        {/* Ledger Transaction History */}
        <div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Account Ledger:</span>
            <select 
              value={selectedWalletId} 
              onChange={e => setSelectedWalletId(e.target.value)} 
              className="form-control"
              style={{ width: '220px', marginBottom: 0 }}
            >
              <option value="">-- All Accounts --</option>
              {wallets.map(w => (
                <option key={w.id} value={w.id}>{w.name} ({fmt(w.currentBalance)})</option>
              ))}
            </select>

            <button 
              onClick={() => { setTxType('Transfer'); setTxWalletId(selectedWalletId); setShowTxModal(true); }}
              className="btn btn-primary btn-sm flex align-center gap-0.5"
              style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
            >
              <RefreshCw size={14} /> Fund Transfer
            </button>
          </div>

          <ALVGrid 
            title="Transaction History"
            subtitle="Ledger postings for selected account"
            columns={txCols}
            data={transactions as any}
            rowKey="id"
            onRefresh={loadTransactions}
            searchable={true}
            pageSize={10}
            selectable={false}
            loading={loading}
          />
        </div>
      </div>

      {/* Wallet Modal */}
      {showWalletModal && (
        <div className="modal-overlay" onClick={() => setShowWalletModal(false)}>
          <form className="modal-content" onSubmit={handleCreateWallet} onClick={e => e.stopPropagation()} style={{ width: '450px' }}>
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
                  <option value="Bank">Bank (Savings/Checking Account)</option>
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
          <form className="modal-content" onSubmit={handleTransaction} onClick={e => e.stopPropagation()} style={{ width: '480px' }}>
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
