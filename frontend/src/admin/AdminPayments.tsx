import React, { useState, useEffect, useMemo, useRef } from 'react';
import { jsPDF } from 'jspdf';
import type { PaymentIn, PaymentOut, PaymentAllocation, Invoice, Supplier, Customer, Wallet, Expense } from '../types';
import { 
  X, Trash2, Download, Share2, FileText, 
  ChevronDown, Calculator, Camera, 
  HelpCircle, ArrowDownLeft, ArrowUpRight, Clock, Bell, Edit2
} from 'lucide-react';
import { 
  getPaymentsIn, addPaymentIn, updatePaymentIn, deletePaymentIn,
  getPaymentsOut, addPaymentOut, updatePaymentOut, deletePaymentOut, 
  getPendingPayments, getCustomers, getSuppliers, getInvoices, getExpenses, getWallets
} from '../utils/db';
import { LinkPaymentModal } from './LinkPaymentModal';
import { ALVGrid, type ALVColumn } from './ALVGrid';
import logoImg from '../assets/logo.png';
import signatureImg from '../assets/authorised_signature.png';

interface AdminPaymentsProps {
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onConfirm?: (msg: string) => Promise<boolean>;
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPDF = (n: number) => `Rs. ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Number to Words in Indian numbering system
const numToWordsIndian = (num: number): string => {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    let str = '';
    if (n > 9999999) {
      str += inWords(Math.floor(n / 10000000)) + 'Crore ';
      n %= 10000000;
    }
    if (n > 99999) {
      str += inWords(Math.floor(n / 100000)) + 'Lakh ';
      n %= 100000;
    }
    if (n > 999) {
      str += inWords(Math.floor(n / 1000)) + 'Thousand ';
      n %= 1000;
    }
    if (n > 99) {
      str += inWords(Math.floor(n / 100)) + 'Hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (n < 20) {
        str += a[n];
      } else {
        str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : ' ');
      }
    }
    return str;
  };

  const integerPart = Math.floor(Math.abs(num));
  const words = inWords(integerPart);
  return words ? words.trim() + ' Rupees Only' : 'Zero Rupees Only';
};

export const AdminPayments: React.FC<AdminPaymentsProps> = ({
  onAddToast,
  onConfirm
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'In' | 'Out' | 'Pending'>('In');
  const [paymentsIn, setPaymentsIn] = useState<PaymentIn[]>([]);
  const [paymentsOut, setPaymentsOut] = useState<PaymentOut[]>([]);
  const [customerPending, setCustomerPending] = useState<Invoice[]>([]);
  const [supplierPending, setSupplierPending] = useState<Supplier[]>([]);
  
  // Lists for dropdown selection
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);

  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('');

  // Filters
  const [datePreset, setDatePreset] = useState<'This Month' | 'Last Month' | 'This Quarter' | 'This Year' | 'Today' | 'Yesterday' | 'This Week' | 'All' | 'Custom'>('This Month');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  const [selectedFirm, setSelectedFirm] = useState('All Firms');
  const [selectedPartyFilter, setSelectedPartyFilter] = useState('All');
  const [selectedModeFilter, setSelectedModeFilter] = useState('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');

  // Form Fields - Payment In / Out
  const [partyName, setPartyName] = useState('');
  const [receiptNo, setReceiptNo] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [walletId, setWalletId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [showDescription, setShowDescription] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | undefined>(undefined);
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([]);
  const [editingPayment, setEditingPayment] = useState<PaymentIn | PaymentOut | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load all initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const [pIn, pOut, pending, custs, sups, invs, exps, wals] = await Promise.all([
        getPaymentsIn(),
        getPaymentsOut(),
        getPendingPayments(),
        getCustomers(),
        getSuppliers(),
        getInvoices(),
        getExpenses(),
        getWallets()
      ]);
      setPaymentsIn(pIn);
      setPaymentsOut(pOut);
      setCustomerPending(pending.customerPending || []);
      setSupplierPending(pending.supplierPending || []);
      setCustomers(custs);
      setSuppliers(sups);
      setInvoices(invs);
      setExpenses(exps);
      setWallets(wals);
      if (wals.length > 0 && !walletId) {
        setWalletId(wals[0].id);
      }
    } catch (err) {
      console.error('Failed to load payments data:', err);
      onAddToast('Failed to load payments data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Preset Date selection
  const handleDatePresetChange = (preset: typeof datePreset) => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'Today') {
      const today = now.toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'Yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === 'This Week') {
      const first = now.getDate() - now.getDay();
      const firstDay = new Date(now.setDate(first)).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(new Date().toISOString().split('T')[0]);
    } else if (preset === 'This Month') {
      setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
      setEndDate(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);
    } else if (preset === 'Last Month') {
      setStartDate(new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]);
      setEndDate(new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]);
    } else if (preset === 'This Quarter') {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      setStartDate(new Date(now.getFullYear(), qMonth, 1).toISOString().split('T')[0]);
      setEndDate(new Date(now.getFullYear(), qMonth + 3, 0).toISOString().split('T')[0]);
    } else if (preset === 'This Year') {
      setStartDate(new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]);
      setEndDate(new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]);
    } else if (preset === 'All') {
      setStartDate('');
      setEndDate('');
    }
  };

  useEffect(() => {
    setSelectedPartyFilter('All');
  }, [activeSubTab]);

  // Compute next Receipt No automatically
  const computeNextReceiptNo = (type: 'In' | 'Out') => {
    const list = type === 'In' ? paymentsIn : paymentsOut;
    let max = type === 'In' ? 18 : 73; // Matching screenshots base offset
    list.forEach(p => {
      const parsed = parseInt(p.receiptNo || p.id.replace(/\D/g, ''), 10);
      if (!isNaN(parsed) && parsed > max) {
        max = parsed;
      }
    });
    return String(max + 1);
  };

  // Open Add Modal
  const handleOpenAddModal = (tab: 'In' | 'Out') => {
    setEditingPayment(null);
    setActiveSubTab(tab);
    setPartyName('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setReceiptNo(computeNextReceiptNo(tab));
    setAmount(0);
    setPaymentMethod(wallets.length > 0 ? wallets[0].name : 'Cash');
    setWalletId(wallets.length > 0 ? wallets[0].id : '');
    setReferenceNumber('');
    setNotes('');
    setShowDescription(false);
    setAttachmentUrl(undefined);
    setAllocations([]);
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (p: PaymentIn | PaymentOut, type: 'In' | 'Out') => {
    setEditingPayment(p);
    setActiveSubTab(type);
    const party = type === 'In' ? (p as PaymentIn).customerName : (p as PaymentOut).supplierName;
    setPartyName(party || '');
    setPaymentDate(p.paymentDate || new Date().toISOString().split('T')[0]);
    setReceiptNo(p.receiptNo || String(p.id).replace(/\D/g, '') || '');
    setAmount(p.amount || 0);
    setPaymentMethod(p.paymentMethod || 'Cash');

    const matchedWallet = wallets.find(w => w.name === p.accountName || w.name === p.paymentMethod || w.id === (p as any).walletId);
    setWalletId(matchedWallet ? matchedWallet.id : (wallets[0]?.id || ''));

    setReferenceNumber(p.referenceNumber || '');
    setNotes(p.notes || '');
    setShowDescription(!!p.notes);
    setAttachmentUrl(p.attachmentUrl);

    if (p.linkedTxns) {
      try {
        setAllocations(JSON.parse(p.linkedTxns));
      } catch (e) {
        setAllocations([]);
      }
    } else {
      setAllocations([]);
    }
    setShowModal(true);
  };

  // Active party live balance lookup
  const selectedPartyBalance = useMemo(() => {
    if (!partyName) return null;
    if (activeSubTab === 'In') {
      const cust = customers.find(c => c.name.toLowerCase() === partyName.toLowerCase());
      return cust ? cust.outstandingAmount : 0;
    } else {
      const sup = suppliers.find(s => s.name.toLowerCase() === partyName.toLowerCase());
      return sup ? sup.outstandingAmount : 0;
    }
  }, [partyName, activeSubTab, customers, suppliers]);

  // Pending transactions for selected party (for Link Payment modal)
  const pendingTxnsForSelectedParty = useMemo(() => {
    if (!partyName) return [];
    if (activeSubTab === 'In') {
      return invoices
        .filter(inv => inv.customerName.toLowerCase() === partyName.toLowerCase() && inv.paymentStatus !== 'Paid')
        .map(inv => ({
          id: inv.id,
          date: inv.date,
          type: 'Sale' as const,
          refNo: inv.invoiceNumber,
          total: inv.totalAmount,
          balance: inv.pendingAmount > 0 ? inv.pendingAmount : inv.totalAmount
        }));
    } else {
      return expenses
        .filter(exp => (exp.party || '').toLowerCase() === partyName.toLowerCase() && exp.paymentStatus !== 'Paid')
        .map(exp => ({
          id: exp.id,
          date: exp.billDate || exp.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
          type: 'Expense' as const,
          refNo: exp.expenseNo || exp.id,
          total: exp.totalAmount,
          balance: (exp.pendingAmount !== undefined && exp.pendingAmount > 0) ? exp.pendingAmount : exp.totalAmount
        }));
    }
  }, [partyName, activeSubTab, invoices, expenses]);

  // Image Upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachmentUrl(reader.result as string);
        onAddToast('Payment attachment photo added.', 'info');
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Payment (Add or Update)
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName) {
      onAddToast(`Please select a ${activeSubTab === 'In' ? 'customer' : 'supplier'}.`, 'error');
      return;
    }
    if (amount <= 0) {
      onAddToast('Please enter a valid amount greater than zero.', 'error');
      return;
    }

    const totalAllocated = allocations.reduce((sum, a) => sum + (a.linkedAmount || 0), 0);
    const unusedAmt = Math.max(0, amount - totalAllocated);
    const status = unusedAmt > 0 ? (totalAllocated > 0 ? 'Partial' : 'Advance') : 'Used';

    try {
      if (editingPayment) {
        if (activeSubTab === 'In') {
          await updatePaymentIn(editingPayment.id, {
            customerName: partyName,
            receiptNo,
            paymentDate,
            amount,
            paymentMethod,
            walletId: walletId || undefined,
            referenceNumber,
            notes,
            status,
            unusedAmount: unusedAmt,
            linkedTxns: allocations.length > 0 ? JSON.stringify(allocations) : undefined,
            attachmentUrl
          });
          onAddToast(`Receipt #${receiptNo || editingPayment.id} for ${partyName} updated successfully.`, 'success');
        } else {
          await updatePaymentOut(editingPayment.id, {
            supplierName: partyName,
            receiptNo,
            paymentDate,
            amount,
            paymentMethod,
            walletId: walletId || undefined,
            referenceNumber,
            notes,
            status,
            unusedAmount: unusedAmt,
            linkedTxns: allocations.length > 0 ? JSON.stringify(allocations) : undefined,
            attachmentUrl
          });
          onAddToast(`Payment Out #${receiptNo || editingPayment.id} to ${partyName} updated successfully.`, 'success');
        }
      } else {
        if (activeSubTab === 'In') {
          await addPaymentIn({
            customerName: partyName,
            receiptNo,
            paymentDate,
            amount,
            paymentMethod,
            walletId: walletId || undefined,
            referenceNumber,
            notes,
            status,
            unusedAmount: unusedAmt,
            linkedTxns: allocations.length > 0 ? JSON.stringify(allocations) : undefined,
            attachmentUrl
          });
          onAddToast(`Receipt #${receiptNo} for ${partyName} saved successfully.`, 'success');
        } else {
          await addPaymentOut({
            supplierName: partyName,
            receiptNo,
            paymentDate,
            amount,
            paymentMethod,
            walletId: walletId || undefined,
            referenceNumber,
            notes,
            status,
            unusedAmount: unusedAmt,
            linkedTxns: allocations.length > 0 ? JSON.stringify(allocations) : undefined,
            attachmentUrl
          });
          onAddToast(`Payment Out #${receiptNo} to ${partyName} recorded successfully.`, 'success');
        }
      }

      setShowModal(false);
      setEditingPayment(null);
      await loadData();
    } catch (err: any) {
      console.error(err);
      onAddToast(err.message || 'Failed to save payment.', 'error');
    }
  };

  // Delete Payment
  const handleDeletePayment = async (p: PaymentIn | PaymentOut, type: 'In' | 'Out') => {
    const party = type === 'In' ? (p as PaymentIn).customerName : (p as PaymentOut).supplierName;
    const num = p.receiptNo || p.id;
    const msg = `Are you sure you want to delete ${type === 'In' ? 'Payment-In Receipt' : 'Payment-Out Voucher'} #${num} (${fmt(p.amount)}) for ${party}? All linked invoice/bill balances and wallet funds will be restored.`;
    
    if (onConfirm) {
      const ok = await onConfirm(msg);
      if (!ok) return;
    } else {
      if (!window.confirm(msg)) return;
    }

    try {
      if (type === 'In') {
        await deletePaymentIn(p.id);
        onAddToast(`Receipt #${num} deleted and customer/invoice balances restored.`, 'success');
      } else {
        await deletePaymentOut(p.id);
        onAddToast(`Voucher #${num} deleted and supplier/expense balances restored.`, 'success');
      }
      await loadData();
    } catch (err: any) {
      console.error(err);
      onAddToast(err.message || 'Failed to delete payment.', 'error');
    }
  };

  // Filtered lists
  const filteredPaymentsIn = useMemo(() => {
    return paymentsIn.filter(p => {
      const matchDate = (!startDate || p.paymentDate >= startDate) && (!endDate || p.paymentDate <= endDate);
      if (!matchDate) return false;
      if (selectedPartyFilter !== 'All' && p.customerName.toLowerCase() !== selectedPartyFilter.toLowerCase()) {
        return false;
      }
      if (selectedModeFilter !== 'All') {
        const mode = (p.accountName || p.paymentMethod || 'Cash').toLowerCase();
        if (!mode.includes(selectedModeFilter.toLowerCase())) return false;
      }
      if (selectedStatusFilter !== 'All') {
        const st = (p.status || 'Used').toLowerCase();
        if (st !== selectedStatusFilter.toLowerCase()) return false;
      }
      return true;
    });
  }, [paymentsIn, startDate, endDate, selectedPartyFilter, selectedModeFilter, selectedStatusFilter]);

  const filteredPaymentsOut = useMemo(() => {
    return paymentsOut.filter(p => {
      const matchDate = (!startDate || p.paymentDate >= startDate) && (!endDate || p.paymentDate <= endDate);
      if (!matchDate) return false;
      if (selectedPartyFilter !== 'All' && p.supplierName.toLowerCase() !== selectedPartyFilter.toLowerCase()) {
        return false;
      }
      if (selectedModeFilter !== 'All') {
        const mode = (p.accountName || p.paymentMethod || 'Cash').toLowerCase();
        if (!mode.includes(selectedModeFilter.toLowerCase())) return false;
      }
      if (selectedStatusFilter !== 'All') {
        const st = (p.status || 'Used').toLowerCase();
        if (st !== selectedStatusFilter.toLowerCase()) return false;
      }
      return true;
    });
  }, [paymentsOut, startDate, endDate, selectedPartyFilter, selectedModeFilter, selectedStatusFilter]);

  // KPI Metrics
  const totalAmountIn = useMemo(() => {
    return filteredPaymentsIn.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [filteredPaymentsIn]);

  const totalAmountOut = useMemo(() => {
    return filteredPaymentsOut.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [filteredPaymentsOut]);

  // WhatsApp Share
  const handleSharePayment = (p: PaymentIn | PaymentOut, type: 'In' | 'Out') => {
    const isRec = type === 'In';
    const party = isRec ? (p as PaymentIn).customerName : (p as PaymentOut).supplierName;
    const num = p.receiptNo || p.id;
    const text = `*JK FUTURE INFRA*\n${isRec ? '🧾 Payment Receipt' : '💸 Payment Voucher'} #${num}\n\nParty: ${party}\nDate: ${p.paymentDate}\nAmount: ${fmt(p.amount)}\nPayment Mode: ${p.paymentMethod} (${p.accountName || 'Cash'})\nReference: ${p.referenceNumber || 'N/A'}\nStatus: ${p.status || 'Settled'}\n\nThank you for doing business with JK FUTURE INFRA!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    onAddToast(`WhatsApp dispatch opened for #${num}.`, 'info');
  };

  // WhatsApp Share Ledger summary
  const handleShareLedger = () => {
    const isRec = activeSubTab === 'In';
    const list = isRec ? filteredPaymentsIn : filteredPaymentsOut;
    const total = list.reduce((sum, p) => sum + (p.amount || 0), 0);
    const text = `*JK FUTURE INFRA*\n*${isRec ? 'Payment-In (Collections)' : 'Payment-Out (Disbursements)'} Summary*\n\nPeriod: ${startDate || 'Start'} to ${endDate || 'Current'}\nTotal Transactions: ${list.length}\nTotal Amount: ${fmt(total)}\n\nGenerated from Accounting Module`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    onAddToast('Opening WhatsApp to share ledger summary.', 'info');
  };

  // Export to Excel / CSV
  const handleExportCSV = (type: 'In' | 'Out', selectedRows?: (PaymentIn | PaymentOut)[]) => {
    const isRec = type === 'In';
    const list = selectedRows && selectedRows.length > 0 
      ? selectedRows 
      : (isRec ? filteredPaymentsIn : filteredPaymentsOut);
    let csv = `JK FUTURE INFRA - ${isRec ? 'PAYMENT-IN (COLLECTIONS)' : 'PAYMENT-OUT (DISBURSEMENTS)'} LEDGER\n`;
    csv += `Date,Ref. no.,Party Name,Total Amount,${isRec ? 'Received' : 'Paid'},Payment Type,Reference,Status\n`;
    list.forEach(p => {
      const party = isRec ? (p as PaymentIn).customerName : (p as PaymentOut).supplierName;
      csv += `"${p.paymentDate}","${p.receiptNo || p.id}","${party}",${p.amount},${p.amount},"${p.accountName || p.paymentMethod}","${p.referenceNumber || ''}","${p.status || 'Used'}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${isRec ? 'Payment_In' : 'Payment_Out'}_Ledger_${startDate || 'all'}_to_${endDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onAddToast('Ledger exported successfully as CSV.', 'success');
  };

  // Download PDF Receipt / Voucher with Authorised Signature
  const handleDownloadPDF = async (p: PaymentIn | PaymentOut, type: 'In' | 'Out') => {
    onAddToast('Generating official PDF, please wait...', 'info');
    try {
      const doc = new jsPDF();
      const isRec = type === 'In';
      const party = isRec ? (p as PaymentIn).customerName : (p as PaymentOut).supplierName;
      const num = p.receiptNo || p.id;

      // 1. Load Logo
      let logoData: { base64: string, ratio: number } | null = null;
      try {
        logoData = await new Promise<{ base64: string, ratio: number }>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = logoImg;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              resolve({ base64: canvas.toDataURL('image/png'), ratio: img.naturalWidth / img.naturalHeight });
            } else reject();
          };
          img.onerror = reject;
        });
      } catch (e) {
        logoData = null;
      }

      // 2. Load Signature
      let sigData: { base64: string, ratio: number } | null = null;
      try {
        sigData = await new Promise<{ base64: string, ratio: number }>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = signatureImg;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              resolve({ base64: canvas.toDataURL('image/png'), ratio: img.naturalWidth / img.naturalHeight });
            } else reject();
          };
          img.onerror = reject;
        });
      } catch (e) {
        sigData = null;
      }

      // Top navy bar
      doc.setFillColor(15, 43, 70);
      doc.rect(0, 0, 210, 6, 'F');

      // Header logo / company info
      if (logoData) {
        doc.addImage(logoData.base64, 'PNG', 15, 12, 18 * logoData.ratio, 18);
      } else {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 43, 70);
        doc.text('JK FUTURE INFRA', 15, 22);
      }

      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Door No: 4-92/1/6, FLAT No: 202', 120, 15);
      doc.text('LEE INFRA, TALRI VANIPALEM, AGANAMPUDI', 120, 19);
      doc.text('Visakhapatnam, Andhra Pradesh', 120, 23);
      doc.text('Call: 9000553832  |  Email: jkfutureinfra@gmail.com', 120, 27);

      // Separator
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(15, 34, 195, 34);

      // Title
      doc.setTextColor(15, 43, 70);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('JK FUTURE INFRA', 15, 43);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('GSTIN: 37AAWFJ6705B1Z6  |  State: 37-AP', 15, 48);

      doc.setFontSize(18);
      if (isRec) { doc.setTextColor(5, 150, 105); } else { doc.setTextColor(225, 29, 72); }
      doc.text(isRec ? 'PAYMENT RECEIPT' : 'PAYMENT VOUCHER', 195, 45, { align: 'right' });

      // Separator
      doc.setDrawColor(226, 232, 240);
      doc.line(15, 54, 195, 54);

      // Party & Voucher Details Box
      doc.setFillColor(248, 250, 252);
      doc.rect(15, 58, 180, 32, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(15, 58, 180, 32, 'S');

      doc.setTextColor(15, 43, 70);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(isRec ? 'Received From:' : 'Paid To:', 20, 66);
      doc.text('Receipt / Voucher No:', 115, 66);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10);
      doc.text(party, 20, 72);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(`# ${num}`, 160, 66);

      doc.setTextColor(71, 85, 105);
      doc.text(`Payment Date: ${p.paymentDate}`, 115, 72);
      doc.text(`Payment Mode: ${p.paymentMethod} (${p.accountName || 'Cash'})`, 115, 78);
      if (p.referenceNumber) {
        doc.text(`Reference / UTR: ${p.referenceNumber}`, 115, 84);
      }

      // Amount banner
      doc.setFillColor(isRec ? 240 : 255, isRec ? 253 : 241, isRec ? 244 : 242);
      doc.rect(15, 96, 180, 22, 'F');
      doc.setDrawColor(isRec ? 187 : 254, isRec ? 247 : 205, isRec ? 208 : 211);
      doc.rect(15, 96, 180, 22, 'S');

      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8.5);
      doc.text(isRec ? 'Amount Received:' : 'Amount Paid:', 20, 104);

      if (isRec) { doc.setTextColor(5, 150, 105); } else { doc.setTextColor(225, 29, 72); }
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(fmtPDF(p.amount), 20, 112);

      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'italic');
      doc.text(`In Words: ${numToWordsIndian(p.amount)}`, 85, 108);

      let currentY = 126;

      // Linked Transactions Table (if any)
      let parsedTxns: PaymentAllocation[] = [];
      if (p.linkedTxns) {
        try {
          parsedTxns = JSON.parse(p.linkedTxns);
        } catch (e) {}
      }

      if (parsedTxns.length > 0) {
        doc.setTextColor(15, 43, 70);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Settled Invoices / Bills:', 15, currentY);
        currentY += 4;

        doc.setFillColor(15, 43, 70);
        doc.rect(15, currentY, 180, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7.5);
        doc.text('#', 18, currentY + 5);
        doc.text('DATE', 28, currentY + 5);
        doc.text('TYPE', 58, currentY + 5);
        doc.text('REF / INV NO.', 88, currentY + 5);
        doc.text('TOTAL AMOUNT', 145, currentY + 5, { align: 'right' });
        doc.text('LINKED AMOUNT', 190, currentY + 5, { align: 'right' });

        currentY += 7;

        parsedTxns.forEach((item, idx) => {
          if (idx % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(15, currentY, 180, 7, 'F');
          }
          doc.setTextColor(15, 23, 42);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.text(String(idx + 1), 18, currentY + 5);
          doc.text(item.date, 28, currentY + 5);
          doc.text(item.type, 58, currentY + 5);
          doc.text(item.refNo, 88, currentY + 5);
          doc.text(fmtPDF(item.total), 145, currentY + 5, { align: 'right' });
          doc.setFont('helvetica', 'bold');
          if (isRec) { doc.setTextColor(5, 150, 105); } else { doc.setTextColor(225, 29, 72); }
          doc.text(fmtPDF(item.linkedAmount), 190, currentY + 5, { align: 'right' });
          currentY += 7;
        });

        currentY += 6;
      }

      // Notes / Remarks
      if (p.notes) {
        doc.setTextColor(71, 85, 105);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('Remarks / Notes:', 15, currentY);
        doc.setFont('helvetica', 'normal');
        doc.text(doc.splitTextToSize(p.notes, 100), 15, currentY + 5);
      }

      // Signatory section
      const sigY = Math.max(currentY + 15, 215);
      doc.setTextColor(15, 43, 70);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('For: JK FUTURE INFRA', 140, sigY);

      let sigOffset = 18;
      if (sigData) {
        const sigHeight = 14;
        const sigWidth = Math.min(45, sigHeight * sigData.ratio);
        doc.addImage(sigData.base64, 'PNG', 140, sigY + 2, sigWidth, sigHeight);
        sigOffset = sigHeight + 6;
      }

      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('Authorized Signatory', 140, sigY + sigOffset);

      doc.save(`${isRec ? 'Receipt' : 'Voucher'}_${num}_${party.replace(/\s+/g, '_')}.pdf`);
      onAddToast('PDF downloaded successfully.', 'success');
    } catch (err) {
      console.error(err);
      onAddToast('Failed to generate PDF document.', 'error');
    }
  };

  // ALVGrid Columns Definition (Matching Screenshot 2)
  const paymentColumns: ALVColumn[] = useMemo(() => [
    {
      key: 'paymentDate',
      label: 'DATE',
      sortable: true,
      width: '105px',
      render: (_v, row) => (
        <span style={{ color: '#334155' }}>{String(row.paymentDate || '')}</span>
      ),
    },
    {
      key: 'receiptNo',
      label: 'REF. NO.',
      sortable: true,
      width: '120px',
      render: (_v, row) => (
        <span style={{ fontWeight: 600, color: '#0f172a' }}>
          {String(row.receiptNo || row.id || '')}
        </span>
      ),
    },
    {
      key: 'partyName',
      label: 'PARTY NAME',
      sortable: true,
      render: (_v, row) => (
        <span style={{ fontWeight: 600, color: '#1e293b' }}>
          {String(row.partyName || 'N/A')}
        </span>
      ),
    },
    {
      key: 'totalAmount',
      label: 'TOTAL AMOUNT',
      sortable: true,
      align: 'right',
      width: '130px',
      render: (_v, row) => (
        <span style={{ color: '#64748b' }}>
          {fmt(Number(row.totalAmount) || 0)}
        </span>
      ),
    },
    {
      key: 'settledAmount',
      label: activeSubTab === 'In' ? 'RECEIVED' : 'PAID',
      sortable: true,
      align: 'right',
      width: '130px',
      render: (_v, row) => {
        const isRec = activeSubTab === 'In';
        return (
          <span style={{ fontWeight: 700, color: isRec ? '#059669' : '#0f172a' }}>
            {fmt(Number(row.settledAmount) || 0)}
          </span>
        );
      },
    },
    {
      key: 'paymentType',
      label: 'PAYMENT TYPE',
      sortable: true,
      width: '130px',
      render: (_v, row) => (
        <span style={{ color: '#475569' }}>
          {String(row.paymentType || 'Cash')}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      sortable: true,
      width: '100px',
      render: (_v, row) => {
        const status = String(row.status || 'Used');
        const isUsed = status.toLowerCase() === 'used';
        return (
          <span 
            style={{ 
              padding: '2px 8px', 
              borderRadius: '4px', 
              fontSize: '0.75rem', 
              fontWeight: 600,
              background: isUsed ? '#ecfdf5' : '#fef3c7',
              color: isUsed ? '#059669' : '#d97706',
              border: `1px solid ${isUsed ? '#a7f3d0' : '#fde68a'}`
            }}
          >
            {status}
          </span>
        );
      },
    },
    {
      key: '__actions',
      label: 'ACTIONS',
      sortable: false,
      align: 'center',
      width: '140px',
      render: (_v, row) => {
        const p = row as unknown as (PaymentIn | PaymentOut);
        return (
          <div className="admin-table-actions" style={{ justifyContent: 'center', display: 'flex', gap: '0.35rem' }}>
            <button 
              type="button"
              onClick={() => handleDownloadPDF(p, activeSubTab as 'In' | 'Out')}
              className="alv-toolbar-btn"
              title="Download PDF Receipt / Voucher"
              style={{ color: '#2563eb', borderColor: '#2563eb' }}
            >
              <Download size={13} />
            </button>
            <button 
              type="button"
              onClick={() => handleOpenEditModal(p, activeSubTab as 'In' | 'Out')}
              className="alv-toolbar-btn"
              title="Edit Payment"
              style={{ color: '#0284c7', borderColor: '#0284c7' }}
            >
              <Edit2 size={13} />
            </button>
            <button 
              type="button"
              onClick={() => handleSharePayment(p, activeSubTab as 'In' | 'Out')}
              className="alv-toolbar-btn"
              title="Share via WhatsApp"
              style={{ color: '#16a34a', borderColor: '#16a34a' }}
            >
              <Share2 size={13} />
            </button>
            <button 
              type="button"
              onClick={() => handleDeletePayment(p, activeSubTab as 'In' | 'Out')}
              className="alv-toolbar-btn"
              title="Delete & Revert Balances"
              style={{ color: '#dc2626', borderColor: '#dc2626' }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        );
      },
    },
  ], [activeSubTab]);

  // Normalized Grid Rows
  const gridData = useMemo(() => {
    const list = activeSubTab === 'In' ? filteredPaymentsIn : filteredPaymentsOut;
    return list.map(p => {
      const party = activeSubTab === 'In' ? (p as PaymentIn).customerName : (p as PaymentOut).supplierName;
      return {
        ...p,
        partyName: party || '',
        totalAmount: p.amount || 0,
        settledAmount: p.amount || 0,
        paymentType: p.accountName || p.paymentMethod || 'Cash',
      };
    });
  }, [activeSubTab, filteredPaymentsIn, filteredPaymentsOut]);

  // Toolbar Dropdown Filters (Matching Screenshot 2)
  const toolbarFilters = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginRight: '0.5rem' }}>
      {/* Party Filter */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
          {activeSubTab === 'In' ? 'Customer:' : 'Supplier:'}
        </label>
        <select
          value={selectedPartyFilter}
          onChange={e => setSelectedPartyFilter(e.target.value)}
          style={{
            height: '28px',
            padding: '0 0.4rem',
            fontSize: '0.78rem',
            borderRadius: '4px',
            border: '1px solid #cbd5e1',
            background: '#fff',
            color: '#334155',
            outline: 'none',
            maxWidth: '130px'
          }}
        >
          <option value="All">All</option>
          {(activeSubTab === 'In' ? customers : suppliers).map(p => (
            <option key={p.id} value={p.name}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Date Filter */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Date:</label>
        <select
          value={datePreset}
          onChange={e => handleDatePresetChange(e.target.value as any)}
          style={{
            height: '28px',
            padding: '0 0.4rem',
            fontSize: '0.78rem',
            borderRadius: '4px',
            border: '1px solid #cbd5e1',
            background: '#fff',
            color: '#334155',
            outline: 'none'
          }}
        >
          <option value="This Month">This Month</option>
          <option value="Last Month">Last Month</option>
          <option value="Today">Today</option>
          <option value="Yesterday">Yesterday</option>
          <option value="This Week">This Week</option>
          <option value="This Quarter">This Quarter</option>
          <option value="This Year">This Year</option>
          <option value="All">All</option>
          <option value="Custom">Custom</option>
        </select>
      </div>

      {/* Custom Date Inputs */}
      {datePreset === 'Custom' && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            style={{ height: '28px', padding: '0 4px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          />
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>-</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            style={{ height: '28px', padding: '0 4px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          />
        </div>
      )}

      {/* Firm Filter */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Firm:</label>
        <select
          value={selectedFirm}
          onChange={e => setSelectedFirm(e.target.value)}
          style={{
            height: '28px',
            padding: '0 0.4rem',
            fontSize: '0.78rem',
            borderRadius: '4px',
            border: '1px solid #cbd5e1',
            background: '#fff',
            color: '#334155',
            outline: 'none'
          }}
        >
          <option value="All Firms">All</option>
          <option value="JK FUTURE INFRA">JK FUTURE INFRA</option>
        </select>
      </div>

      {/* Mode Filter */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Mode:</label>
        <select
          value={selectedModeFilter}
          onChange={e => setSelectedModeFilter(e.target.value)}
          style={{
            height: '28px',
            padding: '0 0.4rem',
            fontSize: '0.78rem',
            borderRadius: '4px',
            border: '1px solid #cbd5e1',
            background: '#fff',
            color: '#334155',
            outline: 'none'
          }}
        >
          <option value="All">All</option>
          <option value="Cash">Cash</option>
          <option value="Bank">Bank</option>
          <option value="Cheque">Cheque</option>
          <option value="UPI">UPI</option>
        </select>
      </div>

      {/* Status Filter */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Status:</label>
        <select
          value={selectedStatusFilter}
          onChange={e => setSelectedStatusFilter(e.target.value)}
          style={{
            height: '28px',
            padding: '0 0.4rem',
            fontSize: '0.78rem',
            borderRadius: '4px',
            border: '1px solid #cbd5e1',
            background: '#fff',
            color: '#334155',
            outline: 'none'
          }}
        >
          <option value="All">All</option>
          <option value="Used">Used</option>
          <option value="Partial">Partial</option>
          <option value="Unused">Unused</option>
          <option value="Advance">Advance</option>
        </select>
      </div>

      {/* Share Button Matching Screenshot 2 */}
      <button
        type="button"
        onClick={handleShareLedger}
        className="alv-toolbar-btn"
        style={{
          padding: '0.2rem 0.75rem',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: '#16a34a',
          backgroundColor: '#f0fdf4',
          borderColor: '#16a34a',
          height: '28px',
          width: 'auto',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.35rem',
          borderRadius: '4px',
          whiteSpace: 'nowrap',
          flexShrink: 0
        }}
        title="Share Filtered Ledger Summary"
      >
        <Share2 size={13} /> Share
      </button>
    </div>
  );

  return (
    <div className="admin-page-container" style={{ padding: '1rem', background: '#f8fafc', minHeight: 'calc(100vh - 80px)' }}>
      
      {/* ── Sub-tabs Navigation ────────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '1.25rem', gap: '8px' }}>
        <button 
          onClick={() => setActiveSubTab('In')}
          style={{
            padding: '0.65rem 1.25rem',
            border: 'none',
            borderBottom: activeSubTab === 'In' ? '3px solid #059669' : '3px solid transparent',
            background: activeSubTab === 'In' ? '#ecfdf5' : 'transparent',
            color: activeSubTab === 'In' ? '#065f46' : '#64748b',
            fontWeight: 600,
            fontSize: '0.9rem',
            borderRadius: '6px 6px 0 0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <ArrowDownLeft size={16} />
          <span>Payment-In (Collections)</span>
          <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '10px', background: activeSubTab === 'In' ? '#059669' : '#e2e8f0', color: activeSubTab === 'In' ? '#fff' : '#475569' }}>
            {paymentsIn.length}
          </span>
        </button>

        <button 
          onClick={() => setActiveSubTab('Out')}
          style={{
            padding: '0.65rem 1.25rem',
            border: 'none',
            borderBottom: activeSubTab === 'Out' ? '3px solid #e11d48' : '3px solid transparent',
            background: activeSubTab === 'Out' ? '#fff1f2' : 'transparent',
            color: activeSubTab === 'Out' ? '#9f1239' : '#64748b',
            fontWeight: 600,
            fontSize: '0.9rem',
            borderRadius: '6px 6px 0 0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <ArrowUpRight size={16} />
          <span>Payment-Out (Disbursements)</span>
          <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '10px', background: activeSubTab === 'Out' ? '#e11d48' : '#e2e8f0', color: activeSubTab === 'Out' ? '#fff' : '#475569' }}>
            {paymentsOut.length}
          </span>
        </button>

        <button 
          onClick={() => setActiveSubTab('Pending')}
          style={{
            padding: '0.65rem 1.25rem',
            border: 'none',
            borderBottom: activeSubTab === 'Pending' ? '3px solid #0284c7' : '3px solid transparent',
            background: activeSubTab === 'Pending' ? '#f0f9ff' : 'transparent',
            color: activeSubTab === 'Pending' ? '#075985' : '#64748b',
            fontWeight: 600,
            fontSize: '0.9rem',
            borderRadius: '6px 6px 0 0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Clock size={16} />
          <span>Pending Aging & Outstandings</span>
        </button>
      </div>

      {/* ── Main Ledger View for Payment-In & Payment-Out ───────── */}
      {/* ── Main Ledger View for Payment-In & Payment-Out (ALVGrid matching Screenshot 2) ───────── */}
      {(activeSubTab === 'In' || activeSubTab === 'Out') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* KPI Summary Card */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 300px))', gap: '1rem' }}>
            <div style={{ background: '#fff', borderRadius: '8px', padding: '1rem 1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
                Total Amount ({activeSubTab === 'In' ? 'Collections' : 'Disbursements'})
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
                {fmt(activeSubTab === 'In' ? totalAmountIn : totalAmountOut)}
              </div>
              <div style={{ fontSize: '0.8rem', color: activeSubTab === 'In' ? '#059669' : '#e11d48', fontWeight: 600 }}>
                {activeSubTab === 'In' ? `Received: ${fmt(totalAmountIn)}` : `Paid: ${fmt(totalAmountOut)}`}
              </div>
            </div>
          </div>

          {/* ALVGrid (Matching Screenshot 2) */}
          <ALVGrid
            title={activeSubTab === 'In' ? 'Payment-In (Collections)' : 'Payment-Out (Disbursements)'}
            subtitle={`${gridData.length} ${gridData.length === 1 ? 'transaction' : 'transactions'}`}
            columns={paymentColumns}
            data={gridData as unknown as Record<string, unknown>[]}
            extraToolbarActions={toolbarFilters}
            rowKey="id"
            onAdd={() => handleOpenAddModal(activeSubTab)}
            addLabel={activeSubTab === 'In' ? 'Add Payment-In' : 'Add Payment-Out'}
            onRefresh={loadData}
            onExport={(selectedRows) => handleExportCSV(activeSubTab, selectedRows as unknown as (PaymentIn[] | PaymentOut[]))}
            searchPlaceholder={activeSubTab === 'In' ? 'Search payment-in...' : 'Search payment-out...'}
            emptyText={activeSubTab === 'In' ? 'No payment-in transactions found.' : 'No payment-out disbursements found.'}
            pageSize={15}
            selectable={true}
            loading={loading}
          />
        </div>
      )}

      {/* ── Pending Aging & Balances Sub-tab ───────────────────── */}
      {activeSubTab === 'Pending' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.25rem' }}>
          {/* Customer Pending Receivables */}
          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 600 }}>Customer Pending Receivables</h3>
              <span style={{ fontWeight: 700, color: '#059669', fontSize: '1rem' }}>
                {fmt(customerPending.reduce((sum, inv) => sum + (inv.pendingAmount || 0), 0))}
              </span>
            </div>

            <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
              {customerPending.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No pending customer invoices!</div>
              ) : (
                customerPending.map(inv => (
                  <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #f8fafc' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{inv.customerName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Invoice: {inv.invoiceNumber} | Date: {inv.date}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontWeight: 700, color: '#059669', fontSize: '0.9rem' }}>{fmt(inv.pendingAmount)}</span>
                      <button 
                        type="button"
                        onClick={() => {
                          const text = `Dear ${inv.customerName}, this is a friendly reminder that an outstanding balance of ${fmt(inv.pendingAmount)} is pending for Invoice ${inv.invoiceNumber}. Kindly arrange for settlement. Thank you, JK Future Infra.`;
                          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                        }}
                        style={{ padding: '3px 8px', border: '1px solid #a7f3d0', borderRadius: '4px', background: '#ecfdf5', color: '#065f46', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                      >
                        <Bell size={12} /> Remind
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Supplier Outstanding Payables */}
          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 600 }}>Supplier Outstanding Payables</h3>
              <span style={{ fontWeight: 700, color: '#e11d48', fontSize: '1rem' }}>
                {fmt(supplierPending.reduce((sum, sup) => sum + (sup.outstandingAmount || 0), 0))}
              </span>
            </div>

            <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
              {supplierPending.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No outstanding supplier payables!</div>
              ) : (
                supplierPending.map(sup => (
                  <div key={sup.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #f8fafc' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{sup.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Contact: {sup.contactNumber || '—'}
                      </div>
                    </div>
                    <span style={{ fontWeight: 700, color: '#e11d48', fontSize: '0.9rem' }}>{fmt(sup.outstandingAmount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add Payment Modal (Matching Screenshots 2, 3, 7) ───── */}
      {showModal && (
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
            zIndex: 9998,
            padding: '1rem'
          }}
          onClick={() => setShowModal(false)}
        >
          <div 
            className="modal-content"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '840px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '92vh',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>
                {editingPayment ? (activeSubTab === 'In' ? 'Edit Payment-In (Collection)' : 'Edit Payment-Out (Disbursement)') : (activeSubTab === 'In' ? 'Payment-In' : 'Payment-Out')}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowCalculator(!showCalculator)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                  title="Calculator"
                >
                  <Calculator size={18} />
                </button>
                <button 
                  type="button" 
                  onClick={() => { setShowModal(false); setEditingPayment(null); }} 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Quick Calculator Drawer */}
            {showCalculator && (
              <div style={{ background: '#f8fafc', padding: '0.75rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Quick Calc:</span>
                <input 
                  type="text" 
                  placeholder="e.g. 5000 * 1.18"
                  value={calcDisplay}
                  onChange={e => setCalcDisplay(e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem', width: '180px' }}
                />
                <button 
                  type="button"
                  onClick={() => {
                    try {
                      // Safe arithmetic evaluation
                      const sanitized = calcDisplay.replace(/[^0-9+\-*/(). ]/g, '');
                      const res = Function(`'use strict'; return (${sanitized})`)();
                      if (typeof res === 'number' && !isNaN(res)) {
                        setAmount(res);
                        setCalcDisplay(String(res));
                        onAddToast(`Calculated: ${fmt(res)} applied to amount.`, 'info');
                      }
                    } catch (e) {}
                  }}
                  style={{ padding: '4px 10px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                >
                  Apply to Amount
                </button>
              </div>
            )}

            {/* Form Body */}
            <form onSubmit={handleSavePayment} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
              <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                
                {/* Left Column */}
                <div>
                  {/* Party Dropdown */}
                  <div style={{ marginBottom: '1.2rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                      Party *
                    </label>
                    <select 
                      value={partyName} 
                      onChange={e => {
                        setPartyName(e.target.value);
                        setAllocations([]); // Reset allocations when party changes
                      }}
                      required
                      style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#0f172a', background: '#fff' }}
                    >
                      <option value="">-- Search by Name/Phone * --</option>
                      {activeSubTab === 'In' ? (
                        customers.map(c => (
                          <option key={c.id} value={c.name}>
                            {c.name} {c.mobile ? `(${c.mobile})` : ''}
                          </option>
                        ))
                      ) : (
                        suppliers.map(s => (
                          <option key={s.id} value={s.name}>
                            {s.name} {s.contactNumber ? `(${s.contactNumber})` : ''}
                          </option>
                        ))
                      )}
                    </select>

                    {/* Live Party Balance Display (Matching Screenshot 3 & 7) */}
                    {partyName && selectedPartyBalance !== null && (
                      <div style={{ marginTop: '0.35rem', fontSize: '0.85rem', fontWeight: 700, color: activeSubTab === 'In' ? '#059669' : '#e11d48' }}>
                        BAL: {selectedPartyBalance.toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>

                  {/* Payment Type Dropdown */}
                  <div style={{ marginBottom: '1.2rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                      Payment Type
                    </label>
                    <select 
                      value={walletId} 
                      onChange={e => {
                        const wid = e.target.value;
                        setWalletId(wid);
                        const sel = wallets.find(w => w.id === wid);
                        if (sel) {
                          setPaymentMethod(sel.name);
                        }
                      }}
                      style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#0f172a', background: '#fff' }}
                    >
                      <option value="">Cash</option>
                      {wallets.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({fmt(w.currentBalance)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Reference No. */}
                  <div style={{ marginBottom: '1.2rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                      Reference No.
                    </label>
                    <input 
                      type="text" 
                      placeholder="Reference No. (Cheque # / UTR / UPI ID)"
                      value={referenceNumber}
                      onChange={e => setReferenceNumber(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                  </div>

                  {/* Notes / Description Toggle */}
                  <div style={{ marginBottom: '1rem' }}>
                    {!showDescription ? (
                      <button 
                        type="button" 
                        onClick={() => setShowDescription(true)}
                        style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <FileText size={15} />
                        <span>+ ADD DESCRIPTION</span>
                      </button>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Description / Memo:</span>
                          <button type="button" onClick={() => setShowDescription(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer' }}>Close</button>
                        </div>
                        <textarea 
                          rows={2}
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          placeholder="Add transaction notes or remarks..."
                          style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Attachment Icon */}
                  <div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      onChange={handleImageUpload} 
                    />
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        padding: '6px 12px',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '6px',
                        background: '#f8fafc',
                        cursor: 'pointer',
                        color: '#64748b',
                        fontSize: '0.8rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <Camera size={16} />
                      <span>{attachmentUrl ? 'Change Receipt Photo' : 'Attach Receipt / Slip'}</span>
                    </button>
                    {attachmentUrl && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>Attached</span>
                    )}
                  </div>
                </div>

                {/* Right Column */}
                <div>
                  {/* Receipt No */}
                  <div style={{ marginBottom: '1.2rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                      Receipt No
                    </label>
                    <input 
                      type="text" 
                      value={receiptNo}
                      onChange={e => setReceiptNo(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}
                    />
                  </div>

                  {/* Date Picker */}
                  <div style={{ marginBottom: '1.2rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                      Date
                    </label>
                    <input 
                      type="date"
                      value={paymentDate}
                      onChange={e => setPaymentDate(e.target.value)}
                      required
                      style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#0f172a' }}
                    />
                  </div>

                  {/* Amount Field (Received / Paid) */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                      {activeSubTab === 'In' ? 'Received' : 'Paid'} (INR) *
                    </label>
                    <input 
                      type="number"
                      step="any"
                      min={0}
                      placeholder="0.00"
                      value={amount || ''}
                      onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                      required
                      style={{ 
                        width: '100%', 
                        padding: '0.75rem', 
                        borderRadius: '6px', 
                        border: '2px solid #0284c7', 
                        fontSize: '1.2rem', 
                        fontWeight: 700, 
                        color: '#0f172a',
                        backgroundColor: '#f0f9ff'
                      }}
                    />
                  </div>

                  {/* Allocation Status Indicator */}
                  {allocations.length > 0 && (
                    <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', color: '#065f46', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Linked to {allocations.length} transaction(s):</span>
                      <span style={{ fontWeight: 700 }}>
                        {fmt(allocations.reduce((sum, a) => sum + (a.linkedAmount || 0), 0))}
                      </span>
                    </div>
                  )}
                </div>

              </div>

              {/* Modal Footer (Matching Screenshot 2, 3, 7) */}
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc' }}>
                {/* Left Action: LINK PAYMENT */}
                <button 
                  type="button"
                  onClick={() => {
                    if (!partyName) {
                      onAddToast(`Please select a ${activeSubTab === 'In' ? 'customer' : 'supplier'} first.`, 'error');
                      return;
                    }
                    if (amount <= 0) {
                      onAddToast('Please enter payment amount first.', 'error');
                      return;
                    }
                    setShowLinkModal(true);
                  }}
                  style={{
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.55rem 1.15rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                >
                  <span>LINK PAYMENT</span>
                  <HelpCircle size={15} style={{ opacity: 0.85 }} />
                </button>

                {/* Right Actions: Share & Save */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button 
                    type="button"
                    onClick={() => {
                      if (!partyName || amount <= 0) {
                        onAddToast('Please fill party and amount to share preview.', 'error');
                        return;
                      }
                      const text = `*JK FUTURE INFRA*\n${activeSubTab === 'In' ? 'Receipt' : 'Payment'} Draft\nParty: ${partyName}\nAmount: ${fmt(amount)}\nDate: ${paymentDate}`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                    }}
                    style={{
                      padding: '0.55rem 1.25rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      backgroundColor: '#ffffff',
                      color: '#475569',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <span>Share</span>
                    <ChevronDown size={14} />
                  </button>

                  <button 
                    type="submit"
                    style={{
                      padding: '0.55rem 1.75rem',
                      border: 'none',
                      borderRadius: '6px',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(37, 99, 235, 0.3)'
                    }}
                  >
                    {editingPayment ? 'Update Payment' : 'Save'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Link Payment to Txns Modal (Matching Screenshots 4, 5, 8, 9) ── */}
      <LinkPaymentModal 
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onDone={(newAllocations) => {
          setAllocations(newAllocations);
          onAddToast(`Linked payment across ${newAllocations.length} transaction(s).`, 'success');
        }}
        partyName={partyName}
        totalAmount={amount}
        onTotalAmountChange={(newAmt) => setAmount(newAmt)}
        type={activeSubTab as 'In' | 'Out'}
        pendingTransactions={pendingTxnsForSelectedParty}
        initialAllocations={allocations}
      />

    </div>
  );
};
