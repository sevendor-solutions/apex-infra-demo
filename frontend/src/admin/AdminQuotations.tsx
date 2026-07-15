import React, { useState, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import type { Quotation, QuotationItem, Customer, InventoryItem, Project } from '../types';
import { 
  X, Trash, Download, Share2
} from 'lucide-react';
import { 
  getQuotations, addQuotation, updateQuotation, deleteQuotation,
  getInventoryItems, getCustomers, addInvoice, getProjects,
  addInventoryItem
} from '../utils/db';
import { ALVGrid } from './ALVGrid';
import type { ALVColumn } from './ALVGrid';
import logoImg from '../assets/logo.png';

interface AdminQuotationsProps {
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onConfirm: (msg: string) => Promise<boolean>;
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const AdminQuotations: React.FC<AdminQuotationsProps> = ({
  onAddToast,
  onConfirm
}) => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [itemsList, setItemsList] = useState<InventoryItem[]>([]);
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [projectName, setProjectName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [validTillDate, setValidTillDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30); // 30 days validity default
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('1. Quotation valid for 30 days from date of issue.\n2. Goods once sold will not be taken back.\n3. All disputes subject to local jurisdiction.');
  const [status, setStatus] = useState('Draft');

  // Quotation Line Items
  const [lineItems, setLineItems] = useState<QuotationItem[]>([
    { productName: '', productCode: '', quantity: 1, unitPrice: 0, discount: 0, gstPercentage: 18, total: 0 }
  ]);
  const [activeProductSearchIdx, setActiveProductSearchIdx] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [quotes, items, customers, projs] = await Promise.all([
        getQuotations(),
        getInventoryItems(),
        getCustomers(),
        getProjects()
      ]);
      setQuotations(quotes);
      setItemsList(items);
      setCustomersList(customers);
      setProjectsList(projs);
    } catch (err) {
      onAddToast('Failed to load quotations data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCustomerSelect = (name: string) => {
    setCustomerName(name);
    const cust = customersList.find(c => c.name === name);
    if (cust) {
      setCustomerMobile(cust.mobile);
      setCustomerAddress(cust.address || '');
    }
  };

  const handleProductSelect = (idx: number, code: string) => {
    const prod = itemsList.find(p => p.code === code);
    if (prod) {
      setLineItems(prev => prev.map((li, i) => {
        if (i !== idx) return li;
        const qty = li.quantity || 1;
        const discount = li.discount || 0;
        const price = prod.sellingPrice;
        const gst = prod.gstPercentage;
        const base = qty * price;
        const afterDisc = base - discount;
        const total = afterDisc + (afterDisc * (gst / 100));

        return {
          ...li,
          productName: prod.name,
          productCode: code,
          unitPrice: price,
          gstPercentage: gst,
          total
        };
      }));
    }
  };

  const updateLineItem = (idx: number, field: keyof QuotationItem, value: any) => {
    setLineItems(prev => prev.map((li, i) => {
      if (i !== idx) return li;
      const updated = { ...li, [field]: value };
      
      const qty = field === 'quantity' ? parseFloat(value) || 0 : li.quantity;
      const price = field === 'unitPrice' ? parseFloat(value) || 0 : li.unitPrice;
      const discount = field === 'discount' ? parseFloat(value) || 0 : li.discount;
      const gst = field === 'gstPercentage' ? parseFloat(value) || 0 : li.gstPercentage;
      
      const base = qty * price;
      const afterDisc = base - discount;
      updated.total = afterDisc + (afterDisc * (gst / 100));

      return updated;
    }));
  };

  const addLineItem = () => {
    setLineItems(prev => [
      ...prev,
      { productName: '', productCode: '', quantity: 1, unitPrice: 0, discount: 0, gstPercentage: 18, total: 0 }
    ]);
  };

  const removeLineItem = (idx: number) => {
    if (lineItems.length === 1) return;
    setLineItems(prev => prev.filter((_, i) => i !== idx));
  };

  const totalAmount = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + item.total, 0);
  }, [lineItems]);

  const resetForm = () => {
    setCustomerName('');
    setCustomerMobile('');
    setCustomerAddress('');
    setProjectName('');
    setDate(new Date().toISOString().split('T')[0]);
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setValidTillDate(d.toISOString().split('T')[0]);
    setNotes('');
    setTerms('1. Quotation valid for 30 days from date of issue.\n2. Goods once sold will not be taken back.\n3. All disputes subject to local jurisdiction.');
    setStatus('Draft');
    setLineItems([{ productName: '', productCode: '', quantity: 1, unitPrice: 0, discount: 0, gstPercentage: 18, total: 0 }]);
    setEditingQuotation(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerMobile.trim()) {
      onAddToast('Customer name and mobile are required.', 'error');
      return;
    }
    if (lineItems.some(li => !li.productCode)) {
      onAddToast('Please select products for all line items.', 'error');
      return;
    }

    try {
      const payload = {
        customerName,
        customerMobile,
        customerAddress,
        projectName,
        date,
        validTillDate,
        items: lineItems,
        totalAmount,
        notes,
        termsAndConditions: terms,
        status
      };

      if (editingQuotation) {
        await updateQuotation({ ...payload, id: editingQuotation.id });
        onAddToast('Quotation updated successfully.', 'success');
      } else {
        await addQuotation(payload);
        onAddToast('Quotation created successfully.', 'success');
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (err) {
      onAddToast('Failed to save quotation.', 'error');
    }
  };

  const openEdit = (q: Quotation) => {
    setEditingQuotation(q);
    setCustomerName(q.customerName);
    setCustomerMobile(q.customerMobile);
    setCustomerAddress(q.customerAddress || '');
    setProjectName(q.projectName || '');
    setDate(q.date);
    setValidTillDate(q.validTillDate);
    setNotes(q.notes || '');
    setTerms(q.termsAndConditions || '');
    setStatus(q.status);
    setLineItems(q.items && q.items.length ? q.items : []);
    setShowModal(true);
  };

  const handleDownloadPDF = async (q: Quotation) => {
    onAddToast('Generating PDF, please wait...', 'info');
    try {
      const doc = new jsPDF();
      
      // Load logo
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
              const base64 = canvas.toDataURL('image/png');
              const ratio = img.naturalWidth / img.naturalHeight;
              resolve({ base64, ratio });
            } else {
              reject(new Error('Canvas context error'));
            }
          };
          img.onerror = (e) => reject(e);
        });
      } catch (e) {
        console.warn('Logo loading failed:', e);
      }

      // Load UPI QR Code
      let qrData: string | null = null;
      try {
        const upiString = `upi://pay?pa=jkfutureinfra@sbi&pn=JK FUTURE INFRA&tn=Quotation ${q.quotationNumber}&am=${q.totalAmount}`;
        const qrUrl = `https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=${encodeURIComponent(upiString)}`;
        qrData = await new Promise<string>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = qrUrl;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/png'));
            } else {
              reject(new Error('Canvas context error'));
            }
          };
          img.onerror = (e) => reject(e);
        });
      } catch (e) {
        console.warn('QR Code loading failed:', e);
      }

      // Top decorative navy bar
      doc.setFillColor(15, 43, 70); // Deep Navy brand color
      doc.rect(0, 0, 210, 6, 'F');

      // Header block
      if (logoData) {
        doc.addImage(logoData.base64, 'PNG', 15, 12, 18 * logoData.ratio, 18);
      } else {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 43, 70);
        doc.text('JK FUTURE INFRA', 15, 22);
      }

      // Company Contact Info on the Right
      doc.setTextColor(71, 85, 105); // Slate 600
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Door No: 4-92/1/6, FLAT No: 202', 120, 15);
      doc.text('LEE INFRA, TALRI VANIPALEM', 120, 19);
      doc.text('AGANAMPUDI, VSP-530053', 120, 23);
      doc.text('Call: 9000553832  |  Email: jkfutureinfra@gmail.com', 120, 27);

      // Horizontal separator line below header
      doc.setDrawColor(226, 232, 240); // Slate 200
      doc.setLineWidth(0.5);
      doc.line(15, 34, 195, 34);

      // Origin / GST Details & Title
      doc.setTextColor(15, 43, 70); // Deep Navy
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('JK FUTURE INFRA', 15, 43);
      
      doc.setTextColor(71, 85, 105); // Slate 600
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('GSTIN: 37AAWFJ6705B1Z6', 15, 48);
      doc.text('State: 37-Andhra Pradesh', 15, 52);

      // Title Right
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 43, 70); // Deep Navy
      doc.text('QUOTATION', 195, 45, { align: 'right' });

      // Horizontal separator line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(15, 56, 195, 56);

      // Metadata Block
      doc.setTextColor(15, 43, 70); // Deep Navy
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Bill To:', 15, 64);
      
      doc.setTextColor(15, 23, 42); // Slate 900
      doc.setFontSize(9.5);
      doc.text(q.customerName, 15, 69);
      
      doc.setTextColor(71, 85, 105); // Slate 600
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Contact No.: ${q.customerMobile}`, 15, 74);
      if (q.customerAddress) {
        doc.text(q.customerAddress, 15, 79);
      }

      // Right Info
      doc.setTextColor(15, 43, 70); // Deep Navy
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('Quotation No.:', 120, 64);
      doc.text('Date:', 120, 69);
      doc.text('Valid Until:', 120, 74);
      doc.text('Project Name:', 120, 79);

      doc.setTextColor(15, 23, 42); // Slate 900
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(q.quotationNumber, 155, 64);
      doc.text(q.date, 155, 69);
      doc.text(q.validTillDate, 155, 74);
      doc.text(q.projectName || '— General / None —', 155, 79);

      // Line items table
      let y = 88;
      doc.setFillColor(15, 43, 70); // Deep Navy Header background
      doc.rect(15, y, 180, 8, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('#', 18, y + 5.5);
      doc.text('PRODUCT / DESCRIPTION', 26, y + 5.5);
      doc.text('QTY', 110, y + 5.5, { align: 'right' });
      doc.text('UNIT PRICE', 135, y + 5.5, { align: 'right' });
      doc.text('DISCOUNT', 155, y + 5.5, { align: 'right' });
      doc.text('GST %', 170, y + 5.5, { align: 'right' });
      doc.text('TOTAL', 190, y + 5.5, { align: 'right' });

      y += 8;
      doc.setTextColor(15, 23, 42); // Slate 900
      
      q.items.forEach((item, idx) => {
        // Striped background rows
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252); // Slate 50
          doc.rect(15, y, 180, 8, 'F');
        }
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(String(idx + 1), 18, y + 5.5);
        doc.text(item.productName, 26, y + 5.5);
        doc.text(String(item.quantity), 110, y + 5.5, { align: 'right' });
        doc.text(fmt(item.unitPrice), 135, y + 5.5, { align: 'right' });
        doc.text(fmt(item.discount), 155, y + 5.5, { align: 'right' });
        doc.text(`${item.gstPercentage}%`, 170, y + 5.5, { align: 'right' });
        doc.text(fmt(item.total), 190, y + 5.5, { align: 'right' });
        
        doc.setDrawColor(241, 245, 249); // Slate 100 border
        doc.setLineWidth(0.5);
        doc.line(15, y + 8, 195, y + 8);
        y += 8;
      });

      // Totals
      y += 6;
      doc.setFillColor(241, 245, 249); // slate 100 background highlight
      doc.rect(120, y - 4, 75, 8, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 43, 70); // Deep Navy
      doc.text('Grand Total:', 125, y + 1.5);
      doc.setTextColor(15, 23, 42); // Slate 900
      doc.text(fmt(q.totalAmount), 190, y + 1.5, { align: 'right' });

      // Terms & Banking section
      y += 12;
      if (y > 210) {
        doc.addPage();
        y = 20;
      }

      // Draw box for Banking details
      doc.setDrawColor(226, 232, 240); // Slate 200
      doc.setFillColor(248, 250, 252); // Slate 50
      doc.setLineWidth(0.5);
      doc.rect(15, y, 110, 42, 'FD');
      
      doc.setTextColor(15, 43, 70); // Deep Navy title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('Pay To (Bank Details):', 18, y + 6);
      
      doc.setTextColor(71, 85, 105); // Slate 600
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Bank Name: STATE BANK OF INDIA, AGANAMPUDI', 18, y + 13);
      doc.text('Bank Account No.: 45116449587', 18, y + 19);
      doc.text('Bank IFSC code: SBIN0006832', 18, y + 25);
      doc.text("Account Holder's Name: JK FUTURE INFRA", 18, y + 31);

      // UPI QR Code on the right of the bank box
      if (qrData) {
        doc.addImage(qrData, 'PNG', 135, y, 32, 32);
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text('Scan with any UPI app to pay', 135, y + 36);
      }

      y += 48;

      // Terms
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      doc.setTextColor(15, 43, 70); // Deep Navy
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Terms and Conditions:', 15, y);
      
      doc.setTextColor(71, 85, 105); // Slate 600
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      const lines = doc.splitTextToSize(q.termsAndConditions || '', 180);
      doc.text(lines, 15, y + 5);

      // Signatory
      y += Math.max(20, lines.length * 3.5);
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setTextColor(15, 43, 70); // Deep Navy
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('For: JK FUTURE INFRA', 140, y);
      
      doc.setTextColor(71, 85, 105); // Slate 600
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('Authorized Signatory', 140, y + 18);

      doc.save(`Quotation_${q.quotationNumber}.pdf`);
      onAddToast('Quotation PDF downloaded.', 'success');
    } catch (err) {
      console.error(err);
      onAddToast('Failed to generate PDF.', 'error');
    }
  };

  const handleShareQuotation = async (q: Quotation) => {
    const text = `Hi, here is the Quotation ${q.quotationNumber} from JK Future Infra.\n\nCustomer: ${q.customerName}\nTotal Amount: ${fmt(q.totalAmount)}\nValid Until: ${q.validTillDate}\nProject: ${q.projectName || 'General'}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Quotation ${q.quotationNumber}`,
          text: text
        });
        onAddToast('Shared successfully', 'success');
      } catch (err) {
        // Cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        onAddToast('Quotation details copied to clipboard!', 'success');
        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(waUrl, '_blank');
      } catch (err) {
        onAddToast('Could not copy details.', 'error');
      }
    }
  };

  const handleDelete = async (id: string, num: string) => {
    const ok = await onConfirm(`Delete quotation "${num}"?`);
    if (!ok) return;
    try {
      await deleteQuotation(id);
      onAddToast('Quotation deleted.', 'success');
      loadData();
    } catch (err) {
      onAddToast('Failed to delete quotation.', 'error');
    }
  };

  const handleConvertToInvoice = async (q: Quotation) => {
    const ok = await onConfirm(`Convert quotation "${q.quotationNumber}" to a Sales Invoice? This will automatically subtract items from warehouse stock.`);
    if (!ok) return;
    try {
      // Structure items for Invoice
      const invoiceItems = q.items.map(item => ({
        productName: item.productName,
        productCode: item.productCode,
        quantity: item.quantity,
        price: item.unitPrice,
        discount: item.discount,
        gst: (item.unitPrice * item.quantity - item.discount) * (item.gstPercentage / 100),
        total: item.total
      }));

      const gstTotal = invoiceItems.reduce((s, i) => s + i.gst, 0);
      const discountTotal = invoiceItems.reduce((s, i) => s + i.discount, 0);

      await addInvoice({
        customerName: q.customerName,
        date: new Date().toISOString().split('T')[0],
        items: invoiceItems as any,
        totalAmount: q.totalAmount,
        gstAmount: gstTotal,
        discountAmount: discountTotal,
        paidAmount: 0
      });

      // Update Quotation Status to Converted
      await updateQuotation({ id: q.id, status: 'Converted' });

      onAddToast(`Quotation ${q.quotationNumber} successfully converted to Invoice!`, 'success');
      loadData();
    } catch (err) {
      onAddToast('Failed to convert quotation to invoice.', 'error');
    }
  };

  const cols: ALVColumn[] = [
    { key: 'quotationNumber', label: 'Quotation Number', sortable: true },
    { key: 'customerName', label: 'Customer Name', sortable: true },
    { key: 'date', label: 'Date', sortable: true },
    { key: 'validTillDate', label: 'Valid Until', sortable: true },
    { 
      key: 'totalAmount', 
      label: 'Total Amount', 
      align: 'right', 
      render: (v) => <strong style={{ color: 'var(--secondary)' }}>{fmt(Number(v))}</strong> 
    },
    { key: 'status', label: 'Status', sortable: true, render: (v) => {
      const s = String(v);
      let color = 'var(--text-muted)';
      if (s === 'Approved' || s === 'Converted') color = 'var(--success)';
      if (s === 'Rejected') color = 'var(--danger)';
      if (s === 'Sent') color = 'var(--info)';
      return <span style={{ color, fontWeight: 'bold' }}>{s}</span>;
    }},
    {
      key: 'actions',
      label: 'Actions',
      align: 'center',
      render: (_, row) => {
        const q = row as unknown as Quotation;
        return (
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
            {q.status !== 'Converted' && (
              <button 
                onClick={() => handleConvertToInvoice(q)} 
                className="btn btn-sm btn-outline text-success"
                style={{ padding: '2px 8px', color: 'var(--success)', borderColor: 'var(--success)' }}
                title="Convert to Sales Invoice"
              >
                Convert to Inv
              </button>
            )}
            <button 
              onClick={() => openEdit(q)} 
              className="btn btn-sm btn-outline text-primary"
              style={{ padding: '2px 8px' }}
            >
              Edit
            </button>
            <button 
              onClick={() => handleDownloadPDF(q)} 
              className="btn btn-sm btn-outline text-secondary flex align-center gap-1"
              style={{ padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
              title="Download PDF"
            >
              <Download size={12} /> PDF
            </button>
            <button 
              onClick={() => handleShareQuotation(q)} 
              className="btn btn-sm btn-outline text-info flex align-center gap-1"
              style={{ padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
              title="Share Quotation"
            >
              <Share2 size={12} /> Share
            </button>
            <button 
              onClick={() => handleDelete(q.id, q.quotationNumber)} 
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

  return (
    <div className="admin-page-container">
      <ALVGrid 
        title="Quotation Management"
        subtitle="Manage, print, and convert buyer quotes to tax invoices"
        columns={cols}
        data={quotations as any}
        rowKey="id"
        onAdd={() => { resetForm(); setShowModal(true); }}
        addLabel="Create Quotation"
        onRefresh={loadData}
        pageSize={15}
        selectable={false}
        loading={loading}
      />

      {/* Quotation Editor Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '800px', maxWidth: '95%' }}>
            <div className="modal-header">
              <h3>{editingQuotation ? `Edit Quotation ${editingQuotation.quotationNumber}` : 'Create New Quotation'}</h3>
              <button onClick={() => setShowModal(false)} className="close-btn"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                <div className="grid grid-3 gap-2">
                  <div className="form-group">
                    <label className="form-label">Customer Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={customerName} 
                      onChange={e => handleCustomerSelect(e.target.value)} 
                      placeholder="Type name or select below..."
                      list="customers-datalist"
                      required
                    />
                    <datalist id="customers-datalist">
                      {customersList.map(c => <option key={c.id} value={c.name} />)}
                    </datalist>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Customer Mobile</label>
                    <input 
                      type="tel" 
                      className="form-control" 
                      value={customerMobile} 
                      onChange={e => setCustomerMobile(e.target.value)} 
                      placeholder="e.g. 9876543210"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quote Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={date} 
                      onChange={e => setDate(e.target.value)} 
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-3 gap-2">
                  <div className="form-group">
                    <label className="form-label">Customer Address</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={customerAddress} 
                      onChange={e => setCustomerAddress(e.target.value)} 
                      placeholder="Shipping/Billing Address"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Validity Till Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={validTillDate} 
                      onChange={e => setValidTillDate(e.target.value)} 
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Project Association</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={projectName} 
                      onChange={e => setProjectName(e.target.value)} 
                      onBlur={() => {
                        // Auto-clear if typed value doesn't match any existing project
                        if (projectName.trim() !== '' && !projectsList.some(p => p.name.toLowerCase() === projectName.trim().toLowerCase())) {
                          setProjectName('');
                        }
                      }}
                      placeholder="Search existing project..." 
                      list="quotations-projects-datalist"
                    />
                    <datalist id="quotations-projects-datalist">
                      {projectsList.map(p => <option key={p.id} value={p.name} />)}
                    </datalist>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label font-bold" style={{ borderBottom: '1px solid #eee', paddingBottom: '4px', marginBottom: '8px' }}>Line Items / Products</label>
                  <div className="modal-table-wrapper">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }} className="text-sm">
                      <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                          <th style={{ padding: '6px' }}>Product Select</th>
                          <th style={{ padding: '6px', width: '90px' }}>Qty</th>
                          <th style={{ padding: '6px', width: '120px' }}>Unit Price</th>
                          <th style={{ padding: '6px', width: '100px' }}>Discount</th>
                          <th style={{ padding: '6px', width: '100px' }}>GST%</th>
                          <th style={{ padding: '6px', width: '120px', textAlign: 'right' }}>Total</th>
                          <th style={{ padding: '6px', width: '40px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '4px', position: 'relative' }}>
                              <input 
                                type="text"
                                value={item.productName}
                                onChange={e => {
                                  const val = e.target.value;
                                  setLineItems(prev => prev.map((li, i) => i === idx ? { ...li, productName: val, productCode: '' } : li));
                                  setActiveProductSearchIdx(idx);
                                }}
                                onFocus={() => setActiveProductSearchIdx(idx)}
                                onBlur={() => setTimeout(() => setActiveProductSearchIdx(null), 250)}
                                placeholder="Search or type product/service..."
                                className="form-control"
                                style={{ marginBottom: 0, padding: '4px' }}
                                required
                              />
                              {activeProductSearchIdx === idx && (
                                <div style={{
                                  position: 'absolute',
                                  left: 4,
                                  right: 4,
                                  backgroundColor: '#fff',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '6px',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                  zIndex: 9999,
                                  maxHeight: '180px',
                                  overflowY: 'auto',
                                  marginTop: '2px'
                                }}>
                                  {item.productName.trim() !== '' && !itemsList.some(prod => prod.name.toLowerCase() === item.productName.toLowerCase()) && (
                                    <div 
                                      onMouseDown={async () => {
                                        try {
                                          const code = 'SRV-' + Math.floor(1000 + Math.random() * 9000);
                                          const newItem = await addInventoryItem({
                                            name: item.productName,
                                            code,
                                            unit: 'Pcs',
                                            openingStock: 0,
                                            purchasePrice: 0,
                                            sellingPrice: item.unitPrice || 0,
                                            gstPercentage: item.gstPercentage || 18
                                          });
                                          onAddToast(`Added "${newItem.name}" to database.`, 'success');
                                          await loadData();
                                          handleProductSelect(idx, newItem.code);
                                        } catch (err: any) {
                                          onAddToast(err.message || 'Failed to add item.', 'error');
                                        }
                                        setActiveProductSearchIdx(null);
                                      }}
                                      style={{ 
                                        padding: '8px 12px', 
                                        cursor: 'pointer', 
                                        borderBottom: '1px solid #f1f5f9', 
                                        fontSize: '0.78rem',
                                        fontWeight: 'bold',
                                        color: '#0854a0',
                                        backgroundColor: '#fff'
                                      }}
                                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; }}
                                    >
                                      + Add New Product/Service: "{item.productName}"
                                    </div>
                                  )}
                                  {itemsList
                                    .filter(prod => 
                                      prod.name.toLowerCase().includes(item.productName.toLowerCase()) || 
                                      prod.code.toLowerCase().includes(item.productName.toLowerCase())
                                    )
                                    .map((prod, pIdx) => (
                                      <div 
                                        key={prod.id || pIdx}
                                        onMouseDown={() => {
                                          handleProductSelect(idx, prod.code);
                                          setActiveProductSearchIdx(null);
                                        }}
                                        style={{ 
                                          padding: '8px 12px', 
                                          cursor: 'pointer', 
                                          borderBottom: '1px solid #f1f5f9', 
                                          fontSize: '0.78rem',
                                          color: '#1e293b',
                                          backgroundColor: '#fff',
                                          textAlign: 'left'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; }}
                                      >
                                        {prod.name} ({prod.code})
                                      </div>
                                    ))
                                  }
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '4px' }}>
                              <input 
                                type="number" 
                                value={item.quantity} 
                                onChange={e => updateLineItem(idx, 'quantity', parseFloat(e.target.value) || 0)} 
                                className="form-control"
                                style={{ marginBottom: 0, padding: '4px' }}
                                min={1}
                                required 
                              />
                            </td>
                            <td style={{ padding: '4px' }}>
                              <input 
                                type="number" 
                                value={item.unitPrice} 
                                onChange={e => updateLineItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)} 
                                className="form-control"
                                style={{ marginBottom: 0, padding: '4px' }}
                                min={0}
                                required 
                              />
                            </td>
                            <td style={{ padding: '4px' }}>
                              <input 
                                type="number" 
                                value={item.discount} 
                                onChange={e => updateLineItem(idx, 'discount', parseFloat(e.target.value) || 0)} 
                                className="form-control"
                                style={{ marginBottom: 0, padding: '4px' }}
                                min={0}
                              />
                            </td>
                            <td style={{ padding: '4px' }}>
                              <input 
                                type="number" 
                                value={item.gstPercentage} 
                                onChange={e => updateLineItem(idx, 'gstPercentage', parseFloat(e.target.value) || 0)} 
                                className="form-control"
                                style={{ marginBottom: 0, padding: '4px' }}
                                min={0}
                                required
                              />
                            </td>
                            <td style={{ padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>
                              {fmt(item.total)}
                            </td>
                            <td style={{ padding: '4px', textAlign: 'center' }}>
                              <button 
                                type="button" 
                                onClick={() => removeLineItem(idx)} 
                                className="text-danger" 
                                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                              >
                                <Trash size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button 
                    type="button" 
                    onClick={addLineItem} 
                    className="btn btn-outline btn-sm mt-1"
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                  >
                    + Add Product Line
                  </button>
                </div>

                <div className="grid grid-2 gap-3" style={{ borderTop: '1px solid #eee', paddingTop: '10px' }}>
                  <div>
                    <div className="form-group">
                      <label className="form-label">Terms & Conditions</label>
                      <textarea 
                        value={terms} 
                        onChange={e => setTerms(e.target.value)} 
                        className="form-control"
                        rows={3} 
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Internal Notes / Memo</label>
                      <textarea 
                        value={notes} 
                        onChange={e => setNotes(e.target.value)} 
                        className="form-control"
                        rows={2} 
                      />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                      <div className="flex justify-between font-semibold">
                        <span>Total Items Value:</span>
                        <span>{fmt(totalAmount)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg" style={{ borderTop: '1px solid #ddd', paddingTop: '8px', color: 'var(--primary)' }}>
                        <span>Grand Total (INR):</span>
                        <span>{fmt(totalAmount)}</span>
                      </div>
                    </div>
                    <div className="form-group mt-1">
                      <label className="form-label">Quotation Status</label>
                      <select 
                        value={status} 
                        onChange={e => setStatus(e.target.value)} 
                        className="form-control"
                      >
                        <option value="Draft">Draft</option>
                        <option value="Sent">Sent</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-secondary">Save Quotation</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
