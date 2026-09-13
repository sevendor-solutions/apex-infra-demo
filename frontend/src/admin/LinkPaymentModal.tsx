import React, { useState, useEffect, useMemo } from 'react';
import { X, RefreshCw, HelpCircle, Edit2, Search } from 'lucide-react';
import type { PaymentAllocation } from '../types';

interface LinkPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDone: (allocations: PaymentAllocation[]) => void;
  partyName: string;
  totalAmount: number;
  onTotalAmountChange: (amt: number) => void;
  type: 'In' | 'Out';
  pendingTransactions: Array<{
    id: string;
    date: string;
    type: 'Sale' | 'Expense' | 'Purchase Bill';
    refNo: string;
    total: number;
    balance: number;
  }>;
  initialAllocations: PaymentAllocation[];
}

export const LinkPaymentModal: React.FC<LinkPaymentModalProps> = ({
  isOpen,
  onClose,
  onDone,
  partyName,
  totalAmount,
  onTotalAmountChange,
  type,
  pendingTransactions,
  initialAllocations
}) => {
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [tempAmount, setTempAmount] = useState(totalAmount);

  useEffect(() => {
    const map: Record<string, number> = {};
    initialAllocations.forEach(a => {
      map[a.txnId] = a.linkedAmount;
    });
    setAllocations(map);
    setTempAmount(totalAmount);
  }, [isOpen, initialAllocations, totalAmount]);

  const totalLinked = useMemo(() => {
    return Object.values(allocations).reduce((sum, val) => sum + (val || 0), 0);
  }, [allocations]);

  const unusedAmount = useMemo(() => {
    return Math.max(0, totalAmount - totalLinked);
  }, [totalAmount, totalLinked]);

  if (!isOpen) return null;

  const handleAutoLink = () => {
    let budget = totalAmount;
    const newMap: Record<string, number> = {};

    // Sort by date ascending (oldest first - FIFO)
    const sorted = [...pendingTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (const item of sorted) {
      if (budget <= 0) break;
      const canAlloc = Math.min(budget, item.balance);
      if (canAlloc > 0) {
        newMap[item.id] = canAlloc;
        budget -= canAlloc;
      }
    }
    setAllocations(newMap);
  };

  const handleReset = () => {
    setAllocations({});
  };

  const handleToggleRow = (item: typeof pendingTransactions[0]) => {
    const current = allocations[item.id] || 0;
    if (current > 0) {
      setAllocations(prev => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    } else {
      if (unusedAmount <= 0) return;
      const alloc = Math.min(unusedAmount, item.balance);
      setAllocations(prev => ({
        ...prev,
        [item.id]: alloc
      }));
    }
  };

  const handleLinkedAmountChange = (item: typeof pendingTransactions[0], value: number) => {
    const safeVal = Math.max(0, Math.min(item.balance, value));
    setAllocations(prev => {
      const next = { ...prev };
      if (safeVal === 0) {
        delete next[item.id];
      } else {
        next[item.id] = safeVal;
      }
      return next;
    });
  };

  const handleSaveDone = () => {
    const result: PaymentAllocation[] = [];
    pendingTransactions.forEach(item => {
      const linked = allocations[item.id] || 0;
      if (linked > 0) {
        result.push({
          txnId: item.id,
          date: item.date,
          type: item.type,
          refNo: item.refNo,
          total: item.total,
          balance: Math.max(0, item.balance - linked),
          linkedAmount: linked
        });
      }
    });
    onDone(result);
  };

  const filteredTxns = pendingTransactions.filter(t => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return t.refNo.toLowerCase().includes(q) || t.type.toLowerCase().includes(q) || t.date.includes(q);
  });

  return (
    <div 
      className="modal-overlay" 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        backgroundColor: 'rgba(15, 23, 42, 0.65)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        zIndex: 9999,
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div 
        className="modal-content" 
        style={{ 
          backgroundColor: '#ffffff', 
          borderRadius: '12px', 
          width: '100%', 
          maxWidth: '960px', 
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#0f2b46' }}>Link Payment to Txns</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        {/* Subheader summary & actions */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', backgroundColor: '#f8fafc' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Party</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>{partyName || '— No party selected —'}</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 600 }}>
                {type === 'In' ? 'Received' : 'Paid Amount'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isEditingAmount ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <input 
                      type="number" 
                      value={tempAmount} 
                      onChange={e => setTempAmount(parseFloat(e.target.value) || 0)}
                      style={{ width: '110px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                      autoFocus
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        onTotalAmountChange(tempAmount);
                        setIsEditingAmount(false);
                      }}
                      style={{ padding: '4px 8px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => setIsEditingAmount(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '6px', background: '#fff' }}
                    title="Click to edit total payment amount"
                  >
                    <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a' }}>{totalAmount.toLocaleString('en-IN')}</span>
                    <Edit2 size={13} style={{ color: '#64748b' }} />
                  </div>
                )}
              </div>
            </div>

            <button 
              type="button"
              onClick={handleAutoLink}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                padding: '0.55rem 1rem',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <span>AUTO LINK</span>
              <HelpCircle size={14} style={{ opacity: 0.85 }} />
            </button>

            <button 
              type="button"
              onClick={handleReset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: '#ffffff',
                color: '#475569',
                border: '1px solid #cbd5e1',
                padding: '0.55rem 0.85rem',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
              title="Reset allocations"
            >
              <RefreshCw size={14} />
              <span>RESET</span>
            </button>
          </div>
        </div>

        {/* Filter / Search Bar */}
        <div style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid #e2e8f0' }}>
          <select style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', color: '#334155', background: '#fff' }}>
            <option>All transactions</option>
          </select>

          <div style={{ position: 'relative', width: '240px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '6px 10px 6px 30px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Transactions Table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '0.75rem 0.5rem', width: '36px' }}></th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Date</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Type</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Ref/Inv No.</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Total</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Balance</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right', width: '140px' }}>Linked Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredTxns.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                    No pending {type === 'In' ? 'sale invoices' : 'expense bills'} found for {partyName || 'this party'}.
                  </td>
                </tr>
              ) : (
                filteredTxns.map(item => {
                  const linked = allocations[item.id] || 0;
                  const isChecked = linked > 0;
                  const liveRemaining = Math.max(0, item.balance - linked);

                  return (
                    <tr 
                      key={item.id}
                      style={{ 
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isChecked ? '#eff6ff' : 'transparent',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRow(item)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#0284c7' }}
                        />
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', color: '#334155' }}>{item.date}</td>
                      <td style={{ padding: '0.75rem 0.5rem', color: '#475569', fontWeight: 500 }}>{item.type}</td>
                      <td style={{ padding: '0.75rem 0.5rem', color: '#1e293b', fontWeight: 600 }}>{item.refNo}</td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: '#64748b' }}>
                        {item.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 600, color: liveRemaining > 0 ? '#b91c1c' : '#16a34a' }}>
                        {liveRemaining.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                        <input 
                          type="number"
                          value={linked > 0 ? linked : ''}
                          placeholder="0.00"
                          onChange={e => handleLinkedAmountChange(item, parseFloat(e.target.value) || 0)}
                          style={{
                            width: '110px',
                            textAlign: 'right',
                            padding: '4px 8px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            fontWeight: 600,
                            color: '#0f172a',
                            backgroundColor: isChecked ? '#ffffff' : '#f8fafc'
                          }}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>
            Unused Amount : <span style={{ color: unusedAmount > 0 ? '#d97706' : '#16a34a', fontWeight: 700 }}>
              {unusedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button 
              type="button"
              onClick={onClose}
              style={{
                padding: '0.5rem 1.25rem',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              CANCEL
            </button>
            <button 
              type="button"
              onClick={() => {
                handleSaveDone();
                onClose();
              }}
              style={{
                padding: '0.5rem 1.5rem',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}
            >
              DONE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
