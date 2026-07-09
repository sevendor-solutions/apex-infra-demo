import React, { useMemo, useState, useEffect } from 'react';
import type { Project, Enquiry, Blog, Expense, Wallet, Invoice, Customer, Supplier, InventoryItem, Loan, Quotation, User, JobApplication, SiteVisit } from '../types';
import { 
  Building, 
  MessageSquare, 
  ArrowUpRight, 
  ArrowDownRight,
  Receipt,
  IndianRupee,
  BookOpen,
  Settings,
  Wallet as WalletIcon,
  Package,
  AlertTriangle,
  TrendingDown,
  Sparkles,
  Users as UsersIcon,
  Briefcase,
  Calendar,
  Layers,
  ClipboardList
} from 'lucide-react';
import { 
  addEnquiry, 
  addExpense, 
  stockIn, 
  stockOut, 
  transferWalletMoney, 
  addInvoice, 
  addQuotation, 
  addCustomer, 
  addSupplier,
  addSiteVisit,
  getSiteVisits
} from '../utils/db';

interface AdminDashboardProps {
  projects: Project[];
  marketing: Project[];
  enquiries: Enquiry[];
  blogs: Blog[];
  expenses?: Expense[];
  hasExpenseAccess?: boolean;
  onSetTab: (tab: string) => void;
  onSelectEnquiry: (enq: Enquiry) => void;
  role: string;
  hasScreenAccess: (screenId: string) => boolean;
  onRefresh: () => Promise<void>;
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  users?: User[];
  applications?: JobApplication[];
  
  // JkFutureinfra accounting tables props
  wallets?: Wallet[];
  invoices?: Invoice[];
  customers?: Customer[];
  suppliers?: Supplier[];
  inventoryItems?: InventoryItem[];
  loans?: Loan[];
  quotations?: Quotation[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  projects,
  marketing,
  enquiries,
  blogs,
  expenses = [],
  onSetTab,
  onSelectEnquiry,
  role,
  hasScreenAccess,
  onRefresh,
  onAddToast,
  users = [],
  applications = [],
  
  wallets = [],
  invoices = [],
  customers = [],
  suppliers = [],
  inventoryItems = [],
  loans = [],
  quotations = []
}) => {
  const [localSiteVisits, setLocalSiteVisits] = useState<SiteVisit[]>([]);

  // Load site visits locally for dashboard counts
  useEffect(() => {
    if (hasScreenAccess('site_visits')) {
      getSiteVisits().then(setLocalSiteVisits).catch(() => {});
    }
  }, [enquiries]);

  useEffect(() => {
    // Inject elegant fonts dynamically
    const linkId = 'elegant-font-link';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Montserrat:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  // Command Center expanded tab
  const [creatorTab, setCreatorTab] = useState<'lead' | 'expense' | 'stock' | 'transfer' | 'invoice' | 'quotation' | 'customer' | 'supplier' | 'site_visit' | null>(null);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Form States - Lead
  const [lName, setLName] = useState('');
  const [lPhone, setLPhone] = useState('');
  const [lEmail, setLEmail] = useState('');
  const [lProjAssoc, setLProjAssoc] = useState('');
  const [lNotes, setLNotes] = useState('');

  // Form States - Expense
  const [eName, setEName] = useState('');
  const [eCategory, setECategory] = useState('Miscellaneous');
  const [eAmount, setEAmount] = useState(0);
  const [eWalletId, setEWalletId] = useState('');
  const [eNotes, setENotes] = useState('');

  // Form States - Stock Movement
  const [sItemCode, setSItemCode] = useState('');
  const [sQty, setSQty] = useState(0);
  const [sDirection, setSDirection] = useState<'In' | 'Out'>('In');
  const [sShelf, setSShelf] = useState('Main Warehouse');
  const [sNotes, setSNotes] = useState('');

  // Form States - Wallet Transfer
  const [tSrcWallet, setTSrcWallet] = useState('');
  const [tDestWallet, setTDestWallet] = useState('');
  const [tAmount, setTAmount] = useState(0);
  const [tRef, setTRef] = useState('');

  // Form States - Invoice (Single Item Quick Entry)
  const [iCustName, setICustName] = useState('');
  const [iProjName, setIProjName] = useState('');
  const [iPrice, setIPrice] = useState(0);
  const [iGst, setIGst] = useState(18);

  // Form States - Quotation (Single Item Quick Entry)
  const [qCustName, setQCustName] = useState('');
  const [qCustMobile, setQCustMobile] = useState('');
  const [qProjName, setQProjName] = useState('');
  const [qPrice, setQPrice] = useState(0);

  // Form States - Customer
  const [cName, setCName] = useState('');
  const [cMobile, setCMobile] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cLimit, setCLimit] = useState(500000);

  // Form States - Supplier
  const [supName, setSupName] = useState('');
  const [supMobile, setSupMobile] = useState('');
  const [supAddress, setSupAddress] = useState('');

  // Form States - Site Visit
  const [svCustName, setSvCustName] = useState('');
  const [svCustPhone, setSvCustPhone] = useState('');
  const [svProjId, setSvProjId] = useState('');
  const [svDate, setSvDate] = useState(new Date().toISOString().split('T')[0]);
  const [svTime, setSvTime] = useState('11:00');
  const [svAgent, setSvAgent] = useState('');

  // Clear Form helper
  const clearFormStates = () => {
    setLName(''); setLPhone(''); setLEmail(''); setLProjAssoc(''); setLNotes('');
    setEName(''); setECategory('Miscellaneous'); setEAmount(0); setEWalletId(''); setENotes('');
    setSItemCode(''); setSQty(0); setSDirection('In'); setSShelf('Main Warehouse'); setSNotes('');
    setTSrcWallet(''); setTDestWallet(''); setTAmount(0); setTRef('');
    setICustName(''); setIProjName(''); setIPrice(0); setIGst(18);
    setQCustName(''); setQCustMobile(''); setQProjName(''); setQPrice(0);
    setCName(''); setCMobile(''); setCEmail(''); setCLimit(500000);
    setSupName(''); setSupMobile(''); setSupAddress('');
    setSvCustName(''); setSvCustPhone(''); setSvProjId(''); setSvDate(new Date().toISOString().split('T')[0]); setSvTime('11:00'); setSvAgent('');
  };

  // Submit Operations Handler
  const handleQuickLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lName || !lPhone) {
      onAddToast('Please fill out customer name and phone.', 'error');
      return;
    }
    setSubmittingAction(true);
    try {
      const selectedProj = projects.find(p => p.id === lProjAssoc) || marketing.find(m => m.id === lProjAssoc);
      await addEnquiry({
        id: `enq_${Date.now()}`,
        name: lName,
        phone: lPhone,
        email: lEmail,
        message: lNotes || 'Dashboard Quick Lead registration',
        projectAssociation: lProjAssoc,
        projectName: selectedProj ? selectedProj.name : 'General Inquiry',
        status: 'New',
        notes: lNotes,
        date: new Date().toISOString().split('T')[0]
      });
      onAddToast('Client Lead registered successfully!', 'success');
      clearFormStates(); setCreatorTab(null); await onRefresh();
    } catch (err: any) {
      onAddToast(err.message || 'Failed to register lead.', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleQuickExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eName || eAmount <= 0 || !eWalletId) {
      onAddToast('Fill out expense party name, amount, and payment wallet.', 'error');
      return;
    }
    setSubmittingAction(true);
    try {
      await addExpense({
        party: eName,
        expenseCategory: eCategory,
        totalAmount: eAmount,
        billDate: new Date().toISOString().split('T')[0],
        paymentType: wallets.find(w => w.id === eWalletId)?.type || 'Cash',
        walletId: eWalletId,
        notes: eNotes,
        lineItems: [],
        roundOff: false
      });
      onAddToast('Overhead expense log recorded!', 'success');
      clearFormStates(); setCreatorTab(null); await onRefresh();
    } catch (err: any) {
      onAddToast(err.message || 'Failed to save expense.', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleQuickStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sItemCode || sQty <= 0) {
      onAddToast('Select product item and specify quantity.', 'error');
      return;
    }
    setSubmittingAction(true);
    try {
      const payload = { productCode: sItemCode, quantity: sQty, date: new Date().toISOString().split('T')[0], warehouse: sShelf, notes: sNotes };
      if (sDirection === 'In') {
        await stockIn(payload);
      } else {
        await stockOut(payload);
      }
      onAddToast('Inventory stock levels posted successfully!', 'success');
      clearFormStates(); setCreatorTab(null); await onRefresh();
    } catch (err: any) {
      onAddToast(err.message || 'Failed to adjust stock level.', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleQuickTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tSrcWallet || !tDestWallet || tAmount <= 0) {
      onAddToast('Provide source, destination, and amount.', 'error');
      return;
    }
    if (tSrcWallet === tDestWallet) {
      onAddToast('Select different wallets.', 'error');
      return;
    }
    setSubmittingAction(true);
    try {
      await transferWalletMoney({ fromWalletId: tSrcWallet, toWalletId: tDestWallet, amount: tAmount, referenceNumber: tRef, date: new Date().toISOString().split('T')[0] });
      onAddToast('Processed wallet balance transfer!', 'success');
      clearFormStates(); setCreatorTab(null); await onRefresh();
    } catch (err: any) {
      onAddToast(err.message || 'Transfer failed.', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleQuickInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!iCustName || iPrice <= 0 || !iProjName) {
      onAddToast('Complete customer name, item name, and price.', 'error');
      return;
    }
    setSubmittingAction(true);
    try {
      const calculatedGst = (iPrice * iGst) / 100;
      const totalAmount = iPrice + calculatedGst;
      await addInvoice({
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        customerName: iCustName,
        date: new Date().toISOString().split('T')[0],
        totalAmount,
        gstAmount: calculatedGst,
        discountAmount: 0,
        paidAmount: 0,
        pendingAmount: totalAmount,
        paymentStatus: 'Unpaid',
        items: [{
          productName: iProjName,
          productCode: 'QUICK-SRV',
          quantity: 1,
          price: iPrice,
          discount: 0,
          gst: iGst,
          total: totalAmount
        }]
      });
      onAddToast('Sales invoice generated successfully!', 'success');
      clearFormStates(); setCreatorTab(null); await onRefresh();
    } catch (err: any) {
      onAddToast(err.message || 'Invoice generation failed.', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleQuickQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qCustName || qPrice <= 0 || !qProjName) {
      onAddToast('Please fill out customer name, property name, and quoted price.', 'error');
      return;
    }
    setSubmittingAction(true);
    try {
      await addQuotation({
        quotationNumber: `QT-${Date.now().toString().slice(-6)}`,
        customerName: qCustName,
        customerMobile: qCustMobile || '9999999999',
        date: new Date().toISOString().split('T')[0],
        validTillDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 days validity
        totalAmount: qPrice,
        status: 'Sent',
        notes: 'Quick quotation created from main dashboard.',
        items: [{
          productName: qProjName,
          productCode: 'PROP-QUICK',
          quantity: 1,
          unitPrice: qPrice,
          discount: 0,
          gstPercentage: 0,
          total: qPrice
        }]
      });
      onAddToast('Quotation voucher generated successfully!', 'success');
      clearFormStates(); setCreatorTab(null); await onRefresh();
    } catch (err: any) {
      onAddToast(err.message || 'Failed to save quotation.', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleQuickCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName || !cMobile) {
      onAddToast('Customer name and mobile are required.', 'error');
      return;
    }
    setSubmittingAction(true);
    try {
      await addCustomer({
        name: cName,
        mobile: cMobile,
        email: cEmail,
        creditLimit: cLimit,
        openingBalance: 0,
        outstandingAmount: 0
      });
      onAddToast('New client profile added!', 'success');
      clearFormStates(); setCreatorTab(null); await onRefresh();
    } catch (err: any) {
      onAddToast(err.message || 'Failed to save customer.', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleQuickSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName || !supMobile) {
      onAddToast('Supplier name and mobile are required.', 'error');
      return;
    }
    setSubmittingAction(true);
    try {
      await addSupplier({
        name: supName,
        contactNumber: supMobile,
        address: supAddress,
        openingBalance: 0,
        outstandingAmount: 0
      });
      onAddToast('Vendor record registered successfully!', 'success');
      clearFormStates(); setCreatorTab(null); await onRefresh();
    } catch (err: any) {
      onAddToast(err.message || 'Failed to register supplier.', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleQuickSiteVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!svCustName || !svCustPhone || !svProjId) {
      onAddToast('Customer name, phone, and project listing selection are required.', 'error');
      return;
    }
    setSubmittingAction(true);
    try {
      const matchedProj = projects.find(p => p.id === svProjId) || marketing.find(m => m.id === svProjId);
      await addSiteVisit({
        customerName: svCustName,
        customerPhone: svCustPhone,
        customerEmail: 'visit@lead.com',
        projectAssociation: svProjId,
        projectName: matchedProj ? matchedProj.name : 'Unknown Layout',
        visitDate: svDate,
        visitTime: svTime,
        assignedAgent: svAgent,
        emailStatus: 'Pending'
      });
      onAddToast('Site visit scheduled successfully!', 'success');
      // Sync local site visits state
      const updatedVisits = await getSiteVisits();
      setLocalSiteVisits(updatedVisits);
      clearFormStates(); setCreatorTab(null); await onRefresh();
    } catch (err: any) {
      onAddToast(err.message || 'Failed to schedule site visit.', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Compute accounting metrics
  const accountingStats = useMemo(() => {
    const totalSales = invoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
    const totalSpend = expenses.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
    const totalProfitLoss = totalSales - totalSpend;
    const cashBalance = wallets.filter(w => w.type === 'Cash').reduce((sum, w) => sum + (w.currentBalance || 0), 0);
    const bankBalance = wallets.filter(w => w.type === 'Bank' || w.type === 'Digital Wallet').reduce((sum, w) => sum + (w.currentBalance || 0), 0);
    const pendingReceivables = customers.reduce((sum, c) => sum + (c.outstandingAmount || 0), 0);
    const pendingPayables = suppliers.reduce((sum, s) => sum + (s.outstandingAmount || 0), 0);
    const totalProducts = inventoryItems.length;
    const stockValuation = inventoryItems.reduce((sum, item) => sum + (item.currentStock * item.purchasePrice), 0);
    const lowStockCount = inventoryItems.filter(item => item.currentStock <= item.minimumStockLevel).length;
    const totalDebt = loans.reduce((sum, l) => sum + (l.pendingAmount || 0), 0);
    const totalQuotes = quotations.length;

    return {
      totalSales, totalSpend, totalProfitLoss, cashBalance, bankBalance,
      pendingReceivables, pendingPayables, totalProducts, stockValuation,
      lowStockCount, totalDebt, totalQuotes
    };
  }, [wallets, invoices, customers, suppliers, inventoryItems, loans, expenses, quotations]);



  // Metrics
  const stats = useMemo(() => {
    const totalProjects = projects.length;
    const totalMarketing = marketing.length;
    const totalEnquiries = enquiries.length;
    const pendingEnquiries = enquiries.filter(e => e.status !== 'Completed').length;
    const totalBlogs = blogs.length;
    const totalStaff = users.length;
    const totalCareers = applications.length;
    const totalVisits = localSiteVisits.length;

    return {
      totalProjects, totalMarketing, totalEnquiries, pendingEnquiries, totalBlogs, totalStaff, totalCareers, totalVisits
    };
  }, [projects, marketing, enquiries, blogs, users, applications, localSiteVisits]);

  const expenseStats = useMemo(() => {
    const totalSpend = expenses.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
    const categoryMap: Record<string, number> = {};
    expenses.forEach(e => {
      const cat = e.expenseCategory || 'Miscellaneous';
      categoryMap[cat] = (categoryMap[cat] || 0) + (e.totalAmount || 0);
    });
    const topCategory = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0];
    return { totalSpend, totalBills: expenses.length, topCategory: topCategory ? topCategory[0] : '—' };
  }, [expenses]);

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  // SVG Chart points
  const monthlyFinanceSeries = useMemo(() => {
    const now = new Date();
    const series = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = d.toLocaleString('default', { month: 'short' });
      const yearKey = d.toLocaleString('default', { year: '2-digit' });
      const label = `${monthKey} ${yearKey}`;
      let rev = 0;
      invoices.forEach(inv => {
        if (!inv.date) return;
        const invDate = new Date(inv.date);
        if (invDate.getMonth() === d.getMonth() && invDate.getFullYear() === d.getFullYear()) {
          rev += inv.totalAmount || 0;
        }
      });
      let exp = 0;
      expenses.forEach(e => {
        if (!e.billDate) return;
        const expDate = new Date(e.billDate);
        if (expDate.getMonth() === d.getMonth() && expDate.getFullYear() === d.getFullYear()) {
          exp += e.totalAmount || 0;
        }
      });
      series.push({ label, revenue: rev, expenses: exp });
    }
    return series;
  }, [invoices, expenses]);

  const maxVal = Math.max(...monthlyFinanceSeries.map(s => Math.max(s.revenue, s.expenses, 1)), 1000);
  
  const revenuePoints = monthlyFinanceSeries.map((s, idx) => {
    const x = 40 + (idx / 5) * 400;
    const y = 140 - (s.revenue / maxVal) * 100;
    return `${x},${y}`;
  }).join(' ');

  const expensePoints = monthlyFinanceSeries.map((s, idx) => {
    const x = 40 + (idx / 5) * 400;
    const y = 140 - (s.expenses / maxVal) * 100;
    return `${x},${y}`;
  }).join(' ');

  const isLuxury = false;
  
  const colors = {
    bg: isLuxury ? '#fbfaf7' : '#f3f5f8', // SAP Fiori Light Grey
    cardBg: isLuxury ? '#ffffff' : '#ffffff', // SAP clean white card background
    border: isLuxury ? '1px solid #dfd0bf' : '1px solid #cbd5e1', // Light slate border
    textMain: isLuxury ? '#1c1c1a' : '#32363a', // SAP dark charcoal text
    textMuted: isLuxury ? '#7c766c' : '#74777a', // SAP slate muted text
    accent: isLuxury ? '#c5a880' : '#0854a0', // SAP corporate blue
    accentLight: isLuxury ? '#fbf8f3' : '#e2ebf5', // Light blue tint
    accentText: isLuxury ? '#a5865e' : '#0854a0', // SAP corporate blue
    fontTitle: isLuxury ? "'Playfair Display', Georgia, serif" : "'72', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontBody: isLuxury ? "'Montserrat', sans-serif" : "'72', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  };

  return (
    <div 
      className="admin-dashboard-view"
      style={{ 
        backgroundColor: colors.bg, 
        color: colors.textMain, 
        fontFamily: colors.fontBody,
        padding: '1.5rem',
        borderRadius: '12px',
        minHeight: '85vh',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Header Panel */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '15px', 
          marginBottom: '1.5rem',
          borderBottom: isLuxury ? '2px double #dfd0bf' : colors.border,
          paddingBottom: '1rem'
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, fontFamily: colors.fontTitle, color: isLuxury ? '#1c1c1a' : colors.accent }}>
            Unified Management Dashboard
          </h2>
        </div>
      </div>

      {/* Quick Access Navigation Shortcuts Launchpad (Dynamically shows mapped screens) */}
      <div style={{ backgroundColor: colors.cardBg, border: colors.border, borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: colors.accent, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: colors.fontTitle }}>
          <Settings size={14} />
          Quick Navigation Shortcuts
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '0.75rem' }}>
          {hasScreenAccess('projects') && <button onClick={() => onSetTab('projects')} style={actionBtnStyle(colors.accentLight, colors.accent, colors.border)}><Building size={14} /> View Construction</button>}
          {hasScreenAccess('marketing') && <button onClick={() => onSetTab('marketing')} style={actionBtnStyle(colors.accentLight, colors.accent, colors.border)}><Layers size={14} /> Marketing Listings</button>}
          {hasScreenAccess('project_enquiries') && <button onClick={() => onSetTab('project_enquiries')} style={actionBtnStyle(colors.accentLight, colors.accent, colors.border)}><MessageSquare size={14} /> Project Leads</button>}
          {hasScreenAccess('marketing_enquiries') && <button onClick={() => onSetTab('marketing_enquiries')} style={actionBtnStyle(colors.accentLight, colors.accent, colors.border)}><MessageSquare size={14} /> Marketing Leads</button>}
          {hasScreenAccess('site_visits') && <button onClick={() => onSetTab('site_visits')} style={actionBtnStyle(colors.accentLight, colors.accent, colors.border)}><Calendar size={14} /> Site Visits</button>}
          {hasScreenAccess('invoices') && <button onClick={() => onSetTab('invoices')} style={actionBtnStyle(colors.accentLight, colors.accent, colors.border)}><Receipt size={14} /> Sales Invoices</button>}
          {hasScreenAccess('expenses') && <button onClick={() => onSetTab('expenses')} style={actionBtnStyle(colors.accentLight, colors.accent, colors.border)}><TrendingDown size={14} /> Cash Expenses</button>}
          {hasScreenAccess('inventory') && <button onClick={() => onSetTab('inventory')} style={actionBtnStyle(colors.accentLight, colors.accent, colors.border)}><Package size={14} /> Stock Registry</button>}
          {hasScreenAccess('wallets') && <button onClick={() => onSetTab('wallets')} style={actionBtnStyle(colors.accentLight, colors.accent, colors.border)}><WalletIcon size={14} /> Cash/Bank Wallets</button>}
          {hasScreenAccess('loans') && <button onClick={() => onSetTab('loans')} style={actionBtnStyle(colors.accentLight, colors.accent, colors.border)}><IndianRupee size={14} /> Bank Loans</button>}
          {hasScreenAccess('quotations') && <button onClick={() => onSetTab('quotations')} style={actionBtnStyle(colors.accentLight, colors.accent, colors.border)}><ClipboardList size={14} /> Quotations</button>}
          {hasScreenAccess('users') && <button onClick={() => onSetTab('users')} style={actionBtnStyle(colors.accentLight, colors.accent, colors.border)}><UsersIcon size={14} /> Team Members</button>}
          {hasScreenAccess('careers') && <button onClick={() => onSetTab('careers')} style={actionBtnStyle(colors.accentLight, colors.accent, colors.border)}><Briefcase size={14} /> Job Applications</button>}
          {hasScreenAccess('blogs') && <button onClick={() => onSetTab('blogs')} style={actionBtnStyle(colors.accentLight, colors.accent, colors.border)}><BookOpen size={14} /> Blog Articles</button>}
        </div>
      </div>

      {/* ⚡ Command Center Actions Hub (Forms for direct inline creation & management) ⚡ */}
      <div style={{ backgroundColor: colors.cardBg, border: colors.border, borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid ' + (isLuxury ? '#f4eedf' : '#cbd5e1'), paddingBottom: '0.5rem', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: colors.accent, margin: 0, fontFamily: colors.fontTitle, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={16} /> Instant Record Operations Hub
          </h3>
          <span style={{ fontSize: '0.72rem', color: colors.textMuted }}>Directly manage applications without leaving the dashboard</span>
        </div>

        {/* Tab triggers depending on permissions */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: creatorTab ? '1rem' : '0' }}>
          {(hasScreenAccess('project_enquiries') || hasScreenAccess('marketing_enquiries')) && (
            <button onClick={() => { setCreatorTab(creatorTab === 'lead' ? null : 'lead'); clearFormStates(); }} style={creatorTabBtnStyle(creatorTab === 'lead', colors.accent, isLuxury)}><MessageSquare size={13} /> Quick Lead</button>
          )}
          {hasScreenAccess('invoices') && (
            <button onClick={() => { setCreatorTab(creatorTab === 'invoice' ? null : 'invoice'); clearFormStates(); }} style={creatorTabBtnStyle(creatorTab === 'invoice', colors.accent, isLuxury)}><Receipt size={13} /> Quick Invoice</button>
          )}
          {hasScreenAccess('expenses') && (
            <button onClick={() => { setCreatorTab(creatorTab === 'expense' ? null : 'expense'); clearFormStates(); }} style={creatorTabBtnStyle(creatorTab === 'expense', colors.accent, isLuxury)}><ArrowDownRight size={13} /> Quick Expense</button>
          )}
          {hasScreenAccess('quotations') && (
            <button onClick={() => { setCreatorTab(creatorTab === 'quotation' ? null : 'quotation'); clearFormStates(); }} style={creatorTabBtnStyle(creatorTab === 'quotation', colors.accent, isLuxury)}><ClipboardList size={13} /> Quick Quotation</button>
          )}
          {hasScreenAccess('inventory') && (
            <button onClick={() => { setCreatorTab(creatorTab === 'stock' ? null : 'stock'); clearFormStates(); }} style={creatorTabBtnStyle(creatorTab === 'stock', colors.accent, isLuxury)}><Package size={13} /> Stock Movement</button>
          )}
          {hasScreenAccess('wallets') && (
            <button onClick={() => { setCreatorTab(creatorTab === 'transfer' ? null : 'transfer'); clearFormStates(); }} style={creatorTabBtnStyle(creatorTab === 'transfer', colors.accent, isLuxury)}><ArrowUpRight size={13} /> Wallet Transfer</button>
          )}
          {hasScreenAccess('customers') && (
            <button onClick={() => { setCreatorTab(creatorTab === 'customer' ? null : 'customer'); clearFormStates(); }} style={creatorTabBtnStyle(creatorTab === 'customer', colors.accent, isLuxury)}><UsersIcon size={13} /> Add Client</button>
          )}
          {hasScreenAccess('suppliers') && (
            <button onClick={() => { setCreatorTab(creatorTab === 'supplier' ? null : 'supplier'); clearFormStates(); }} style={creatorTabBtnStyle(creatorTab === 'supplier', colors.accent, isLuxury)}><UsersIcon size={13} /> Add Supplier</button>
          )}
          {hasScreenAccess('site_visits') && (
            <button onClick={() => { setCreatorTab(creatorTab === 'site_visit' ? null : 'site_visit'); clearFormStates(); }} style={creatorTabBtnStyle(creatorTab === 'site_visit', colors.accent, isLuxury)}><Calendar size={13} /> Schedule Site Visit</button>
          )}
        </div>

        {/* Dynamic creation forms */}
        {creatorTab === 'lead' && (
          <form onSubmit={handleQuickLead} style={creatorFormStyle}>
            <div style={formGrid3Style}>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Customer Name *</label>
                <input type="text" style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={lName} onChange={e => setLName(e.target.value)} placeholder="Full Name" required />
              </div>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Phone Number *</label>
                <input type="text" style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={lPhone} onChange={e => setLPhone(e.target.value)} placeholder="Mobile Number" required />
              </div>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Email Address</label>
                <input type="email" style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={lEmail} onChange={e => setLEmail(e.target.value)} placeholder="name@domain.com" />
              </div>
            </div>
            <div style={formGrid2Style}>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Select Associated Property</label>
                <select style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={lProjAssoc} onChange={e => setLProjAssoc(e.target.value)}>
                  <option value="">Select property layout...</option>
                  {[...projects, ...marketing].map(p => <option key={p.id} value={p.id} style={{ color: colors.textMain, backgroundColor: colors.cardBg }}>{p.name} ({p.location})</option>)}
                </select>
              </div>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Requirement Notes</label>
                <input type="text" style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={lNotes} onChange={e => setLNotes(e.target.value)} placeholder="Budget, timing..." />
              </div>
            </div>
            <div style={formActionGroup}>
              <button type="button" onClick={() => setCreatorTab(null)} style={cancelBtnStyle(colors.textMain, colors.border)}>Cancel</button>
              <button type="submit" disabled={submittingAction} style={submitBtnStyle(colors.accent)}>{submittingAction ? 'Saving...' : 'Create Lead'}</button>
            </div>
          </form>
        )}

        {creatorTab === 'invoice' && (
          <form onSubmit={handleQuickInvoice} style={creatorFormStyle}>
            <div style={formGrid2Style}>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Customer Name *</label>
                <input type="text" style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={iCustName} onChange={e => setICustName(e.target.value)} placeholder="e.g. Rahul Sharma" required />
              </div>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Property / Item Sold *</label>
                <input type="text" style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={iProjName} onChange={e => setIProjName(e.target.value)} placeholder="e.g. Villa Plot No. 24" required />
              </div>
            </div>
            <div style={formGrid2Style}>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Sale Price (INR, pre-tax) *</label>
                <input type="number" style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={iPrice} onChange={e => setIPrice(parseFloat(e.target.value) || 0)} min={1} required />
              </div>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>GST Percentage %</label>
                <select style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={iGst} onChange={e => setIGst(parseInt(e.target.value) || 0)}>
                  <option value="0">0% GST</option>
                  <option value="5">5% GST</option>
                  <option value="12">12% GST</option>
                  <option value="18">18% GST (Standard)</option>
                </select>
              </div>
            </div>
            <div style={formActionGroup}>
              <button type="button" onClick={() => setCreatorTab(null)} style={cancelBtnStyle(colors.textMain, colors.border)}>Cancel</button>
              <button type="submit" disabled={submittingAction} style={submitBtnStyle(colors.accent)}>{submittingAction ? 'Generating INV...' : 'Generate Invoice'}</button>
            </div>
          </form>
        )}

        {creatorTab === 'expense' && (
          <form onSubmit={handleQuickExpense} style={creatorFormStyle}>
            <div style={formGrid3Style}>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Paid to Party *</label>
                <input type="text" style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={eName} onChange={e => setEName(e.target.value)} placeholder="e.g. Steel Trader Corp" required />
              </div>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Category</label>
                <select style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={eCategory} onChange={e => setECategory(e.target.value)}>
                  <option value="Cement">Cement</option>
                  <option value="Steel">Steel</option>
                  <option value="Sand & Bricks">Sand & Bricks</option>
                  <option value="Salary">Salary</option>
                  <option value="Rent">Rent</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
              </div>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Voucher Amount (INR) *</label>
                <input type="number" style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={eAmount} onChange={e => setEAmount(parseFloat(e.target.value) || 0)} min={1} required />
              </div>
            </div>
            <div style={formGrid2Style}>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Paid from Wallet *</label>
                <select style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={eWalletId} onChange={e => setEWalletId(e.target.value)} required>
                  <option value="">Select cash box/bank wallet...</option>
                  {wallets.map(w => <option key={w.id} value={w.id} style={{ color: colors.textMain, backgroundColor: colors.cardBg }}>{w.name} ({fmt(w.currentBalance)})</option>)}
                </select>
              </div>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Remarks / Reference</label>
                <input type="text" style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={eNotes} onChange={e => setENotes(e.target.value)} placeholder="UTR or receipt details" />
              </div>
            </div>
            <div style={formActionGroup}>
              <button type="button" onClick={() => setCreatorTab(null)} style={cancelBtnStyle(colors.textMain, colors.border)}>Cancel</button>
              <button type="submit" disabled={submittingAction} style={submitBtnStyle(colors.accent)}>{submittingAction ? 'Posting...' : 'Record Expense'}</button>
            </div>
          </form>
        )}

        {creatorTab === 'quotation' && (
          <form onSubmit={handleQuickQuotation} style={creatorFormStyle}>
            <div style={formGrid3Style}>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Customer Name *</label>
                <input type="text" style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={qCustName} onChange={e => setQCustName(e.target.value)} placeholder="e.g. Ramesh Kumar" required />
              </div>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Customer Mobile</label>
                <input type="text" style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={qCustMobile} onChange={e => setQCustMobile(e.target.value)} placeholder="10 Digit Phone" />
              </div>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Quoted Price (INR) *</label>
                <input type="number" style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={qPrice} onChange={e => setQPrice(parseFloat(e.target.value) || 0)} min={1} required />
              </div>
            </div>
            <div style={formControlGroup}>
              <label style={formLabelStyle(colors.textMuted)}>Property Listing / Project Details *</label>
              <input type="text" style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={qProjName} onChange={e => setQProjName(e.target.value)} placeholder="e.g. JK Residency Block B Flats" required />
            </div>
            <div style={formActionGroup}>
              <button type="button" onClick={() => setCreatorTab(null)} style={cancelBtnStyle(colors.textMain, colors.border)}>Cancel</button>
              <button type="submit" disabled={submittingAction} style={submitBtnStyle(colors.accent)}>{submittingAction ? 'Creating QT...' : 'Create Quotation'}</button>
            </div>
          </form>
        )}

        {creatorTab === 'stock' && (
          <form onSubmit={handleQuickStock} style={creatorFormStyle}>
            <div style={formGrid3Style}>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Product Item *</label>
                <select style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={sItemCode} onChange={e => setSItemCode(e.target.value)} required>
                  <option value="">Select product...</option>
                  {inventoryItems.map(item => <option key={item.id} value={item.code} style={{ color: colors.textMain, backgroundColor: colors.cardBg }}>{item.name} ({item.code}) [Stock: {item.currentStock}]</option>)}
                </select>
              </div>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Type *</label>
                <select style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={sDirection} onChange={e => setSDirection(e.target.value as 'In' | 'Out')}>
                  <option value="In">Stock In (Receipt)</option>
                  <option value="Out">Stock Out (Issue)</option>
                </select>
              </div>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Quantity *</label>
                <input type="number" style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={sQty} onChange={e => setSQty(parseFloat(e.target.value) || 0)} min={1} required />
              </div>
            </div>
            <div style={formGrid2Style}>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Warehouse Shelf Location</label>
                <input type="text" style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={sShelf} onChange={e => setSShelf(e.target.value)} placeholder="Block A Shelf 2" />
              </div>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Stock Notes</label>
                <input type="text" style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={sNotes} onChange={e => setSNotes(e.target.value)} placeholder="Audit reason or supplier link" />
              </div>
            </div>
            <div style={formActionGroup}>
              <button type="button" onClick={() => setCreatorTab(null)} style={cancelBtnStyle(colors.textMain, colors.border)}>Cancel</button>
              <button type="submit" disabled={submittingAction} style={submitBtnStyle(colors.accent)}>{submittingAction ? 'Updating...' : 'Post Stock Entry'}</button>
            </div>
          </form>
        )}

        {creatorTab === 'transfer' && (
          <form onSubmit={handleQuickTransfer} style={creatorFormStyle}>
            <div style={formGrid3Style}>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>From Wallet *</label>
                <select style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={tSrcWallet} onChange={e => setTSrcWallet(e.target.value)} required>
                  <option value="">Select source account...</option>
                  {wallets.map(w => <option key={w.id} value={w.id} style={{ color: colors.textMain, backgroundColor: colors.cardBg }}>{w.name} ({fmt(w.currentBalance)})</option>)}
                </select>
              </div>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>To Wallet *</label>
                <select style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={tDestWallet} onChange={e => setTDestWallet(e.target.value)} required>
                  <option value="">Select target account...</option>
                  {wallets.map(w => <option key={w.id} value={w.id} style={{ color: colors.textMain, backgroundColor: colors.cardBg }}>{w.name} ({fmt(w.currentBalance)})</option>)}
                </select>
              </div>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Amount to Transfer *</label>
                <input type="number" style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={tAmount} onChange={e => setTAmount(parseFloat(e.target.value) || 0)} min={1} required />
              </div>
            </div>
            <div style={formControlGroup}>
              <label style={formLabelStyle(colors.textMuted)}>Transaction Reference No / UTR</label>
              <input type="text" style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={tRef} onChange={e => setTRef(e.target.value)} placeholder="Bank reference number" />
            </div>
            <div style={formActionGroup}>
              <button type="button" onClick={() => setCreatorTab(null)} style={cancelBtnStyle(colors.textMain, colors.border)}>Cancel</button>
              <button type="submit" disabled={submittingAction} style={submitBtnStyle(colors.accent)}>{submittingAction ? 'Processing...' : 'Complete Transfer'}</button>
            </div>
          </form>
        )}

        {creatorTab === 'customer' && (
          <form onSubmit={handleQuickCustomer} style={creatorFormStyle}>
            <div style={formGrid3Style}>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Client Name *</label>
                <input type="text" style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={cName} onChange={e => setCName(e.target.value)} placeholder="Customer Name" required />
              </div>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Mobile Number *</label>
                <input type="text" style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={cMobile} onChange={e => setCMobile(e.target.value)} placeholder="10 digits" required />
              </div>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Email Address</label>
                <input type="email" style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={cEmail} onChange={e => setCEmail(e.target.value)} placeholder="name@domain.com" />
              </div>
            </div>
            <div style={formControlGroup}>
              <label style={formLabelStyle(colors.textMuted)}>Approved Credit Limit (INR)</label>
              <input type="number" style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={cLimit} onChange={e => setCLimit(parseFloat(e.target.value) || 0)} min={0} />
            </div>
            <div style={formActionGroup}>
              <button type="button" onClick={() => setCreatorTab(null)} style={cancelBtnStyle(colors.textMain, colors.border)}>Cancel</button>
              <button type="submit" disabled={submittingAction} style={submitBtnStyle(colors.accent)}>{submittingAction ? 'Creating...' : 'Register Client'}</button>
            </div>
          </form>
        )}

        {creatorTab === 'supplier' && (
          <form onSubmit={handleQuickSupplier} style={creatorFormStyle}>
            <div style={formGrid2Style}>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Supplier Name *</label>
                <input type="text" style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={supName} onChange={e => setSupName(e.target.value)} placeholder="Vendor Co. Name" required />
              </div>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Contact Phone *</label>
                <input type="text" style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={supMobile} onChange={e => setSupMobile(e.target.value)} placeholder="Mobile/GST code" required />
              </div>
            </div>
            <div style={formControlGroup}>
              <label style={formLabelStyle(colors.textMuted)}>Office Address</label>
              <input type="text" style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={supAddress} onChange={e => setSupAddress(e.target.value)} placeholder="Supplier physical address" />
            </div>
            <div style={formActionGroup}>
              <button type="button" onClick={() => setCreatorTab(null)} style={cancelBtnStyle(colors.textMain, colors.border)}>Cancel</button>
              <button type="submit" disabled={submittingAction} style={submitBtnStyle(colors.accent)}>{submittingAction ? 'Adding...' : 'Add Vendor Record'}</button>
            </div>
          </form>
        )}

        {creatorTab === 'site_visit' && (
          <form onSubmit={handleQuickSiteVisit} style={creatorFormStyle}>
            <div style={formGrid3Style}>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Customer Name *</label>
                <input type="text" style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={svCustName} onChange={e => setSvCustName(e.target.value)} placeholder="Visitor Name" required />
              </div>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Customer Phone *</label>
                <input type="text" style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={svCustPhone} onChange={e => setSvCustPhone(e.target.value)} placeholder="Phone" required />
              </div>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Select Project *</label>
                <select style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={svProjId} onChange={e => setSvProjId(e.target.value)} required>
                  <option value="">Select property listing...</option>
                  {[...projects, ...marketing].map(p => <option key={p.id} value={p.id} style={{ color: colors.textMain, backgroundColor: colors.cardBg }}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div style={formGrid3Style}>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Visit Date *</label>
                <input type="date" style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={svDate} onChange={e => setSvDate(e.target.value)} required />
              </div>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Visit Time *</label>
                <input type="time" style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={svTime} onChange={e => setSvTime(e.target.value)} required />
              </div>
              <div style={formControlGroup}>
                <label style={formLabelStyle(colors.textMuted)}>Assigned Marketing Agent</label>
                <input type="text" style={formInputStyle(isLuxury, colors.border, colors.textMain)} value={svAgent} onChange={e => setSvAgent(e.target.value)} placeholder="Agent Name" />
              </div>
            </div>
            <div style={formActionGroup}>
              <button type="button" onClick={() => setCreatorTab(null)} style={cancelBtnStyle(colors.textMain, colors.border)}>Cancel</button>
              <button type="submit" disabled={submittingAction} style={submitBtnStyle(colors.accent)}>{submittingAction ? 'Scheduling...' : 'Schedule Site Visit'}</button>
            </div>
          </form>
        )}
      </div>

      {/* Dynamic Metrics Cards Section (Renders based on user mapped screens) */}
      <h3 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: colors.accent, letterSpacing: '1px', marginBottom: '0.75rem', fontFamily: colors.fontTitle }}>
        📈 Real-Time Business Insights & KPI Summary
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        
        {hasScreenAccess('projects') && (
          <div style={kpiCardStyle(colors.cardBg, colors.accent, colors.border)} onClick={() => onSetTab('projects')}>
            <div style={kpiHeaderStyle}><span style={{ ...kpiTitleStyle, color: colors.textMuted }}>Construction Projects</span><Building size={16} style={{ color: colors.accent }} /></div>
            <div style={{ ...kpiValueStyle, color: colors.textMain }}>{stats.totalProjects}</div>
            <div style={{ ...kpiFooterStyle, color: colors.textMuted }}>Registered construction complexes</div>
          </div>
        )}

        {hasScreenAccess('marketing') && (
          <div style={kpiCardStyle(colors.cardBg, colors.accent, colors.border)} onClick={() => onSetTab('marketing')}>
            <div style={kpiHeaderStyle}><span style={{ ...kpiTitleStyle, color: colors.textMuted }}>Marketing Listings</span><Layers size={16} style={{ color: colors.accent }} /></div>
            <div style={{ ...kpiValueStyle, color: colors.textMain }}>{stats.totalMarketing}</div>
            <div style={{ ...kpiFooterStyle, color: colors.textMuted }}>Active plots, homes, and units</div>
          </div>
        )}

        {(hasScreenAccess('project_enquiries') || hasScreenAccess('marketing_enquiries')) && (
          <div style={kpiCardStyle(colors.cardBg, colors.accent, colors.border)} onClick={() => onSetTab('project_enquiries')}>
            <div style={kpiHeaderStyle}><span style={{ ...kpiTitleStyle, color: colors.textMuted }}>Total Client Leads</span><MessageSquare size={16} style={{ color: colors.accent }} /></div>
            <div style={{ ...kpiValueStyle, color: colors.textMain }}>{stats.totalEnquiries}</div>
            <div style={{ ...kpiFooterStyle, color: colors.textMuted }}>{stats.pendingEnquiries} active follow-ups</div>
          </div>
        )}

        {hasScreenAccess('invoices') && (
          <div style={kpiCardStyle(colors.cardBg, colors.accent, colors.border)} onClick={() => onSetTab('invoices')}>
            <div style={kpiHeaderStyle}><span style={{ ...kpiTitleStyle, color: colors.textMuted }}>Invoiced Sales</span><IndianRupee size={16} style={{ color: colors.accent }} /></div>
            <div style={{ ...kpiValueStyle, color: colors.textMain }}>{fmt(accountingStats.totalSales)}</div>
            <div style={{ ...kpiFooterStyle, color: colors.textMuted }}>Sales tax invoices ledger</div>
          </div>
        )}

        {hasScreenAccess('expenses') && (
          <div style={kpiCardStyle(colors.cardBg, colors.accent, colors.border)} onClick={() => onSetTab('expenses')}>
            <div style={kpiHeaderStyle}><span style={{ ...kpiTitleStyle, color: colors.textMuted }}>Expenses Paid</span><TrendingDown size={16} style={{ color: colors.accent }} /></div>
            <div style={{ ...kpiValueStyle, color: colors.textMain }}>{fmt(expenseStats.totalSpend)}</div>
            <div style={{ ...kpiFooterStyle, color: colors.textMuted }}>{expenseStats.totalBills} cost vouchers posted</div>
          </div>
        )}

        {hasScreenAccess('wallets') && (
          <div style={kpiCardStyle(colors.cardBg, colors.accent, colors.border)} onClick={() => onSetTab('wallets')}>
            <div style={kpiHeaderStyle}><span style={{ ...kpiTitleStyle, color: colors.textMuted }}>Liquid Cash Box</span><WalletIcon size={16} style={{ color: colors.accent }} /></div>
            <div style={{ ...kpiValueStyle, color: colors.textMain }}>{fmt(accountingStats.cashBalance)}</div>
            <div style={{ ...kpiFooterStyle, color: colors.textMuted }}>Physical cash register boxes</div>
          </div>
        )}

        {hasScreenAccess('wallets') && (
          <div style={kpiCardStyle(colors.cardBg, colors.accent, colors.border)} onClick={() => onSetTab('wallets')}>
            <div style={kpiHeaderStyle}><span style={{ ...kpiTitleStyle, color: colors.textMuted }}>Bank A/c Balances</span><WalletIcon size={16} style={{ color: colors.accent }} /></div>
            <div style={{ ...kpiValueStyle, color: colors.textMain }}>{fmt(accountingStats.bankBalance)}</div>
            <div style={{ ...kpiFooterStyle, color: colors.textMuted }}>Bank balances & digital wallets</div>
          </div>
        )}

        {hasScreenAccess('customers') && (
          <div style={kpiCardStyle(colors.cardBg, colors.accent, colors.border)} onClick={() => onSetTab('customers')}>
            <div style={kpiHeaderStyle}><span style={{ ...kpiTitleStyle, color: colors.textMuted }}>Outstanding Receivables</span><AlertTriangle size={16} style={{ color: colors.accent }} /></div>
            <div style={{ ...kpiValueStyle, color: '#ef4444' }}>{fmt(accountingStats.pendingReceivables)}</div>
            <div style={{ ...kpiFooterStyle, color: colors.textMuted }}>Clients due credit balance</div>
          </div>
        )}

        {hasScreenAccess('suppliers') && (
          <div style={kpiCardStyle(colors.cardBg, colors.accent, colors.border)} onClick={() => onSetTab('suppliers')}>
            <div style={kpiHeaderStyle}><span style={{ ...kpiTitleStyle, color: colors.textMuted }}>Outstanding Payables</span><AlertTriangle size={16} style={{ color: colors.accent }} /></div>
            <div style={{ ...kpiValueStyle, color: colors.textMain }}>{fmt(accountingStats.pendingPayables)}</div>
            <div style={{ ...kpiFooterStyle, color: colors.textMuted }}>Vendors outstanding invoices</div>
          </div>
        )}

        {hasScreenAccess('inventory') && (
          <div style={kpiCardStyle(colors.cardBg, colors.accent, colors.border)} onClick={() => onSetTab('inventory')}>
            <div style={kpiHeaderStyle}><span style={{ ...kpiTitleStyle, color: colors.textMuted }}>Warehouse Stock Valuation</span><Package size={16} style={{ color: colors.accent }} /></div>
            <div style={{ ...kpiValueStyle, color: colors.textMain }}>{fmt(accountingStats.stockValuation)}</div>
            <div style={{ ...kpiFooterStyle, color: colors.textMuted }}>{accountingStats.lowStockCount} items run below min-stock</div>
          </div>
        )}

        {hasScreenAccess('loans') && (
          <div style={kpiCardStyle(colors.cardBg, colors.accent, colors.border)} onClick={() => onSetTab('loans')}>
            <div style={kpiHeaderStyle}><span style={{ ...kpiTitleStyle, color: colors.textMuted }}>Active Loans Debt</span><IndianRupee size={16} style={{ color: colors.accent }} /></div>
            <div style={{ ...kpiValueStyle, color: '#ef4444' }}>{fmt(accountingStats.totalDebt)}</div>
            <div style={{ ...kpiFooterStyle, color: colors.textMuted }}>Total bank borrowed capital</div>
          </div>
        )}

        {hasScreenAccess('quotations') && (
          <div style={kpiCardStyle(colors.cardBg, colors.accent, colors.border)} onClick={() => onSetTab('quotations')}>
            <div style={kpiHeaderStyle}><span style={{ ...kpiTitleStyle, color: colors.textMuted }}>Quotations Count</span><ClipboardList size={16} style={{ color: colors.accent }} /></div>
            <div style={{ ...kpiValueStyle, color: colors.textMain }}>{accountingStats.totalQuotes}</div>
            <div style={{ ...kpiFooterStyle, color: colors.textMuted }}>Estimated quotations issued</div>
          </div>
        )}

        {hasScreenAccess('site_visits') && (
          <div style={kpiCardStyle(colors.cardBg, colors.accent, colors.border)} onClick={() => onSetTab('site_visits')}>
            <div style={kpiHeaderStyle}><span style={{ ...kpiTitleStyle, color: colors.textMuted }}>Site Visits Scheduled</span><Calendar size={16} style={{ color: colors.accent }} /></div>
            <div style={{ ...kpiValueStyle, color: colors.textMain }}>{stats.totalVisits}</div>
            <div style={{ ...kpiFooterStyle, color: colors.textMuted }}>Total layout tour reservations</div>
          </div>
        )}

        {hasScreenAccess('users') && (
          <div style={kpiCardStyle(colors.cardBg, colors.accent, colors.border)} onClick={() => onSetTab('users')}>
            <div style={kpiHeaderStyle}><span style={{ ...kpiTitleStyle, color: colors.textMuted }}>Registered Staff</span><UsersIcon size={16} style={{ color: colors.accent }} /></div>
            <div style={{ ...kpiValueStyle, color: colors.textMain }}>{stats.totalStaff}</div>
            <div style={{ ...kpiFooterStyle, color: colors.textMuted }}>Active user profiles in system</div>
          </div>
        )}

        {hasScreenAccess('careers') && (
          <div style={kpiCardStyle(colors.cardBg, colors.accent, colors.border)} onClick={() => onSetTab('careers')}>
            <div style={kpiHeaderStyle}><span style={{ ...kpiTitleStyle, color: colors.textMuted }}>Job Applications</span><Briefcase size={16} style={{ color: colors.accent }} /></div>
            <div style={{ ...kpiValueStyle, color: colors.textMain }}>{stats.totalCareers}</div>
            <div style={{ ...kpiFooterStyle, color: colors.textMuted }}>Hiring pipeline records</div>
          </div>
        )}

        {hasScreenAccess('blogs') && (
          <div style={kpiCardStyle(colors.cardBg, colors.accent, colors.border)} onClick={() => onSetTab('blogs')}>
            <div style={kpiHeaderStyle}><span style={{ ...kpiTitleStyle, color: colors.textMuted }}>Blogs & Articles</span><BookOpen size={16} style={{ color: colors.accent }} /></div>
            <div style={{ ...kpiValueStyle, color: colors.textMain }}>{stats.totalBlogs}</div>
            <div style={{ ...kpiFooterStyle, color: colors.textMuted }}>Published website articles</div>
          </div>
        )}

      </div>

      {/* SVG Trend Graphs Section (Rendered for all if invoices or expenses is mapped) */}
      {(hasScreenAccess('invoices') || hasScreenAccess('expenses')) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          
          <div style={{ ...panelCardStyle, backgroundColor: colors.cardBg, border: colors.border }}>
            <h3 style={{ ...panelTitleStyle, color: colors.textMain, borderBottom: colors.border, fontFamily: colors.fontTitle }}>
              📊 Monthly Sales vs. Expense Outflow
            </h3>
            <div style={{ padding: '10px 0' }}>
              <svg width="100%" height="180" viewBox="0 0 500 180" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="gradRevU" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors.accent} stopOpacity="0.25"/>
                    <stop offset="100%" stopColor={colors.accent} stopOpacity="0"/>
                  </linearGradient>
                  <linearGradient id="gradExpU" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25"/>
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <line x1="40" y1="20" x2="440" y2="20" stroke={isLuxury ? '#dfd0bf' : '#e2e8f0'} strokeDasharray="3 3" />
                <line x1="40" y1="80" x2="440" y2="80" stroke={isLuxury ? '#dfd0bf' : '#e2e8f0'} strokeDasharray="3 3" />
                <line x1="40" y1="140" x2="440" y2="140" stroke={isLuxury ? '#dfd0bf' : '#cbd5e1'} />
                
                <polygon points={`40,140 ${revenuePoints} 440,140`} fill="url(#gradRevU)" />
                <polygon points={`40,140 ${expensePoints} 440,140`} fill="url(#gradExpU)" />
                
                <polyline points={revenuePoints} fill="none" stroke={colors.accent} strokeWidth="2" />
                <polyline points={expensePoints} fill="none" stroke="#f43f5e" strokeWidth="2" />
                
                {monthlyFinanceSeries.map((s, idx) => {
                  const x = 40 + (idx / 5) * 400;
                  const yRev = 140 - (s.revenue / maxVal) * 100;
                  const yExp = 140 - (s.expenses / maxVal) * 100;
                  return (
                    <g key={idx}>
                      <circle cx={x} cy={yRev} r="3" fill={colors.accent} />
                      <circle cx={x} cy={yExp} r="3" fill="#f43f5e" />
                      <text x={x} y="156" fill={colors.textMuted} fontSize="8" textAnchor="middle" fontWeight="600">{s.label}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', fontSize: '0.7rem', marginTop: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', backgroundColor: colors.accent, borderRadius: '50%' }} />
                <span style={{ color: colors.textMuted, fontWeight: 600 }}>Total Invoiced Sales</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', backgroundColor: '#f43f5e', borderRadius: '50%' }} />
                <span style={{ color: colors.textMuted, fontWeight: 600 }}>Cash/Bank Expenses</span>
              </div>
            </div>
          </div>

          <div style={{ ...panelCardStyle, backgroundColor: colors.cardBg, border: colors.border }}>
            <h3 style={{ ...panelTitleStyle, color: colors.textMain, borderBottom: colors.border, fontFamily: colors.fontTitle }}>
              📈 Margin Performance Ratio
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '1rem 0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                  <svg width="80" height="80" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke={isLuxury ? '#dfd0bf' : '#e2e8f0'} strokeWidth="8" />
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="8"
                            strokeDasharray={`${Math.min(100, Math.max(0, expenseStats.totalSpend > 0 ? Math.round((accountingStats.totalProfitLoss / expenseStats.totalSpend) * 100) : 0)) * 2.51} 251`}
                            transform="rotate(-90 50 50)" />
                  </svg>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: colors.textMain }}>
                      {expenseStats.totalSpend > 0 ? Math.round((accountingStats.totalProfitLoss / expenseStats.totalSpend) * 100) : 0}%
                    </div>
                    <div style={{ fontSize: '0.45rem', color: colors.textMuted }}>ROI</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: colors.textMuted }}>Return on Outflow</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                  <svg width="80" height="80" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke={colors.border} strokeWidth="8" />
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke={colors.accent} strokeWidth="8"
                            strokeDasharray={`${Math.min(100, Math.max(0, accountingStats.totalSales > 0 ? Math.round((accountingStats.totalProfitLoss / accountingStats.totalSales) * 100) : 0)) * 2.51} 251`}
                            transform="rotate(-90 50 50)" />
                  </svg>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: colors.textMain }}>
                      {accountingStats.totalSales > 0 ? Math.round((accountingStats.totalProfitLoss / accountingStats.totalSales) * 100) : 0}%
                    </div>
                    <div style={{ fontSize: '0.45rem', color: colors.textMuted }}>Margin</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: colors.textMuted }}>Net Sales Margin</span>
              </div>
            </div>
          </div>

        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {hasScreenAccess('project_enquiries') && (
          <div style={{ ...panelCardStyle, backgroundColor: colors.cardBg, border: colors.border }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: colors.border, paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '0.82rem', fontWeight: 800, margin: 0, fontFamily: colors.fontTitle, color: colors.textMain }}>
                📞 Project Construction Leads
              </h3>
              <button 
                onClick={() => onSetTab('project_enquiries')} 
                style={{ background: 'none', border: 'none', color: colors.accent, fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
              >
                Manage <ArrowUpRight size={10} />
              </button>
            </div>
            {enquiries.length === 0 ? (
              <p style={{ textAlign: 'center', color: colors.textMuted, fontSize: '0.75rem', padding: '1rem 0' }}>No leads recorded.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ background: colors.accentLight, borderBottom: colors.border }}>
                      <th style={{ padding: '6px 8px', textAlign: 'left', color: colors.textMain }}>Client</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', color: colors.textMain }}>Property Interest</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', color: colors.textMain }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enquiries.slice(0, 4).map(e => (
                      <tr key={e.id} style={{ borderBottom: colors.border }}>
                        <td style={{ padding: '6px 8px' }}>
                          <strong style={{ color: colors.textMain }}>{e.name}</strong>
                          <div style={{ fontSize: '0.65rem', color: colors.textMuted }}>{e.phone}</div>
                        </td>
                        <td style={{ padding: '6px 8px', color: colors.textMain }}>{e.propertyName || 'General Inquiry'}</td>
                        <td style={{ padding: '6px 8px' }}>
                          <button 
                            onClick={() => onSelectEnquiry(e)}
                            style={{ padding: '2px 6px', fontSize: '0.65rem', fontWeight: 700, backgroundColor: colors.accentLight, color: colors.accent, border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {hasScreenAccess('inventory') && (
          <div style={{ ...panelCardStyle, backgroundColor: colors.cardBg, border: colors.border }}>
            <h3 style={{ ...panelTitleStyle, color: '#ef4444', borderBottom: colors.border, fontFamily: colors.fontTitle }}>
              ⚠️ Low Material Stock Alert ({accountingStats.lowStockCount})
            </h3>
            <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
              {inventoryItems.filter(item => item.currentStock <= item.minimumStockLevel).map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: colors.border, fontSize: '0.78rem' }}>
                  <div><strong style={{ color: colors.textMain }}>{item.name}</strong> ({item.code})</div>
                  <div style={{ fontWeight: 700, color: '#ef4444' }}>{item.currentStock} / {item.minimumStockLevel} {item.unit}</div>
                </div>
              ))}
              {inventoryItems.filter(item => item.currentStock <= item.minimumStockLevel).length === 0 && (
                <p style={{ textAlign: 'center', color: colors.textMuted, fontSize: '0.75rem', padding: '1rem 0' }}>All warehouse inventory levels are healthy.</p>
              )}
            </div>
          </div>
        )}

        {hasScreenAccess('site_visits') && (
          <div style={{ ...panelCardStyle, backgroundColor: colors.cardBg, border: colors.border }}>
            <h3 style={{ ...panelTitleStyle, color: colors.textMain, borderBottom: colors.border, fontFamily: colors.fontTitle }}>
              📅 Upcoming Layout Site Tours
            </h3>
            <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
              {localSiteVisits.slice(0, 4).map(sv => (
                <div key={sv.id} style={{ padding: '6px 0', borderBottom: colors.border, fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ color: colors.textMain }}>{sv.customerName}</strong>
                    <span style={{ fontSize: '0.68rem', color: colors.accent, fontWeight: 700 }}>{sv.visitDate} @ {sv.visitTime}</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: colors.textMuted }}>Layout: {sv.projectName} | Agent: {sv.assignedAgent || 'Unassigned'}</div>
                </div>
              ))}
              {localSiteVisits.length === 0 && (
                <p style={{ textAlign: 'center', color: colors.textMuted, fontSize: '0.75rem', padding: '1rem 0' }}>No site visits scheduled.</p>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// Styling structures
const actionBtnStyle = (bg: string, color: string, border: string) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  padding: '8px 12px',
  fontSize: '0.75rem',
  fontWeight: 700,
  border: border,
  borderRadius: '8px',
  backgroundColor: bg,
  color: color,
  cursor: 'pointer',
  transition: 'transform 0.15s, box-shadow 0.15s',
  outline: 'none'
});

const kpiCardStyle = (bg: string, borderColor: string, border: string) => ({
  backgroundColor: bg,
  border: border,
  borderLeft: `4px solid ${borderColor}`,
  borderRadius: '10px',
  padding: '1rem',
  cursor: 'pointer',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
});

const kpiHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '0.4rem'
};

const kpiTitleStyle = {
  fontSize: '0.68rem',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px'
};

const kpiValueStyle = {
  fontSize: '1.45rem',
  fontWeight: 800,
  lineHeight: 1.2
};

const kpiFooterStyle = {
  fontSize: '0.65rem',
  marginTop: '0.4rem'
};

const panelCardStyle = {
  borderRadius: '12px',
  padding: '1.25rem',
  boxShadow: '0 2px 10px rgba(0,0,0,0.01)'
};

const panelTitleStyle = {
  fontSize: '0.82rem',
  fontWeight: 800,
  marginTop: 0,
  marginBottom: '0.75rem',
  paddingBottom: '0.5rem'
};

const creatorTabBtnStyle = (isActive: boolean, accentColor: string, isLuxury: boolean) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '5px 12px',
  fontSize: '0.72rem',
  fontWeight: 700,
  border: isActive ? 'none' : '1px solid ' + (isLuxury ? '#dfd0bf' : '#cbd5e1'),
  borderRadius: '6px',
  backgroundColor: isActive ? accentColor : 'transparent',
  color: isActive ? '#fff' : (isLuxury ? '#1c1c1a' : '#556575'),
  cursor: 'pointer',
  transition: 'all 0.15s ease'
});

const creatorFormStyle = {
  marginTop: '1rem',
  padding: '1rem',
  backgroundColor: 'rgba(0,0,0,0.02)',
  borderRadius: '8px',
  border: '1px dashed #cbd5e1'
};

const formGrid3Style = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '10px',
  marginBottom: '8px'
};

const formGrid2Style = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: '10px',
  marginBottom: '8px'
};

const formControlGroup = {
  display: 'flex',
  flexDirection: 'column' as const
};

const formLabelStyle = (color: string) => ({
  fontSize: '0.7rem',
  fontWeight: 700,
  marginBottom: '3px',
  color: color
});

const formInputStyle = (isLuxury: boolean, border: string, color: string) => ({
  height: '30px',
  padding: '0 8px',
  borderRadius: '5px',
  border: border,
  backgroundColor: isLuxury ? '#ffffff' : '#0f172a',
  color: color,
  fontSize: '0.75rem',
  outline: 'none',
  width: '100%',
  fontFamily: 'inherit'
});

const formActionGroup = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '8px',
  marginTop: '0.75rem'
};

const cancelBtnStyle = (color: string, border: string) => ({
  height: '30px',
  padding: '0 12px',
  borderRadius: '5px',
  border: border,
  backgroundColor: 'transparent',
  color: color,
  fontWeight: 700,
  fontSize: '0.72rem',
  cursor: 'pointer'
});

const submitBtnStyle = (bg: string) => ({
  height: '30px',
  padding: '0 12px',
  borderRadius: '5px',
  border: 'none',
  backgroundColor: bg,
  color: '#ffffff',
  fontWeight: 700,
  fontSize: '0.72rem',
  cursor: 'pointer'
});
