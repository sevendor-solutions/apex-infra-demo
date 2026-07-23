import React, { useState, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import type { Invoice, InvoiceItem, Customer, InventoryItem, Wallet, Amenity, Project } from '../types';
import { 
  X, Trash, Download, Share2,
  DollarSign, FileText, Landmark 
} from 'lucide-react';
import { 
  getInvoices, addInvoice, deleteInvoice,
  getInventoryItems, getCustomers, getWallets,
  addCustomer, getProjects, getAmenities
} from '../utils/db';
import { ALVGrid } from './ALVGrid';
import type { ALVColumn } from './ALVGrid';
import logoImg from '../assets/logo.png';

interface AdminInvoicesProps {
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onConfirm: (msg: string) => Promise<boolean>;
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPDF = (n: number) => `Rs. ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const AdminInvoices: React.FC<AdminInvoicesProps> = ({
  onAddToast,
  onConfirm
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [itemsList, setItemsList] = useState<InventoryItem[]>([]);
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [walletsList, setWalletsList] = useState<Wallet[]>([]);
  const [_projectsList, setProjectsList] = useState<Project[]>([]);
  const [amenitiesMasterList, setAmenitiesMasterList] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [customerSearchText, setCustomerSearchText] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [projectName, setProjectName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [walletId, setWalletId] = useState('');

  // Line Items
  const [lineItems, setLineItems] = useState<InvoiceItem[]>([
    { productName: '', productCode: '', quantity: 1, price: 0, discount: 0, gst: 0, gstPercentage: 18, total: 0 }
  ]);

  // Amenity Items
  const [amenityItems, setAmenityItems] = useState<InvoiceItem[]>([
    { productName: '', productCode: 'AMENITY', quantity: 1, price: 0, discount: 0, gst: 0, gstPercentage: 18, total: 0 }
  ]);

  const availableAmenityOptions = useMemo(() => {
    return amenitiesMasterList.map(a => a.name).filter(Boolean);
  }, [amenitiesMasterList]);

  const handleCreateCustomer = async (typedName: string) => {
    if (!typedName.trim()) return;
    try {
      const uniqueMobile = '9' + Math.floor(100000000 + Math.random() * 900000000);
      const newCust = await addCustomer({
        name: typedName.trim(),
        mobile: uniqueMobile,
        openingBalance: 0
      });
      onAddToast(`Created customer account for "${newCust.name}"`, 'success');
      const customers = await getCustomers();
      setCustomersList(customers);
      setCustomerName(newCust.name);
      setCustomerSearchText(newCust.name);
      setCustomerMobile(newCust.mobile);
      setCustomerAddress(newCust.address || '');
      setShowCustomerDropdown(false);
    } catch (err: any) {
      onAddToast(err.message || 'Failed to create customer.', 'error');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [invs, items, customers, wallets, projs, fetchedAmenities] = await Promise.all([
        getInvoices(),
        getInventoryItems(),
        getCustomers(),
        getWallets(),
        getProjects(),
        getAmenities().catch(() => [])
      ]);
      setInvoices(invs);
      setItemsList(items);
      setCustomersList(customers);
      setWalletsList(wallets);
      setProjectsList(projs);
      setAmenitiesMasterList(fetchedAmenities || []);
      if (wallets.length > 0) {
        setWalletId(wallets[0].id);
      }
    } catch (err) {
      onAddToast('Failed to load invoices data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateLineItem = (idx: number, field: keyof InvoiceItem, value: any) => {
    setLineItems(prev => prev.map((li, i) => {
      if (i !== idx) return li;
      const updated = { ...li, [field]: value };
      
      const qty = field === 'quantity' ? parseFloat(value) || 0 : li.quantity;
      const price = field === 'price' ? parseFloat(value) || 0 : li.price;
      const discount = field === 'discount' ? parseFloat(value) || 0 : li.discount;
      const gstPct = field === 'gstPercentage' ? parseFloat(value) || 0 : (li.gstPercentage !== undefined ? li.gstPercentage : 18);
      
      const base = qty * price;
      const afterDisc = base - discount;
      updated.gst = afterDisc * (gstPct / 100);
      updated.total = afterDisc + updated.gst;
      updated.gstPercentage = gstPct;

      return updated;
    }));
  };

  const addLineItem = () => {
    setLineItems(prev => [
      ...prev,
      { productName: '', productCode: '', quantity: 1, price: 0, discount: 0, gst: 0, gstPercentage: 18, total: 0 }
    ]);
  };

  const removeLineItem = (idx: number) => {
    if (lineItems.length === 1) return;
    setLineItems(prev => prev.filter((_, i) => i !== idx));
  };

  const updateAmenityItem = (idx: number, field: keyof InvoiceItem, value: any) => {
    setAmenityItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      
      const qty = field === 'quantity' ? parseFloat(value) || 0 : item.quantity;
      const price = field === 'price' ? parseFloat(value) || 0 : item.price;
      const discount = field === 'discount' ? parseFloat(value) || 0 : item.discount;
      const gstPct = field === 'gstPercentage' ? parseFloat(value) || 0 : (item.gstPercentage !== undefined ? item.gstPercentage : 18);
      
      const base = qty * price;
      const afterDisc = base - discount;
      updated.gst = afterDisc * (gstPct / 100);
      updated.total = afterDisc + updated.gst;
      updated.gstPercentage = gstPct;

      return updated;
    }));
  };

  const addAmenityItem = () => {
    setAmenityItems(prev => [
      ...prev,
      { productName: '', productCode: 'AMENITY', quantity: 1, price: 0, discount: 0, gst: 0, gstPercentage: 18, total: 0 }
    ]);
  };

  const removeAmenityItem = (idx: number) => {
    if (amenityItems.length === 1) return;
    setAmenityItems(prev => prev.filter((_, i) => i !== idx));
  };

  const totalAmount = useMemo(() => {
    const lineTotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const amenityTotal = amenityItems.reduce((sum, item) => sum + item.total, 0);
    return lineTotal + amenityTotal;
  }, [lineItems, amenityItems]);

  const totalGst = useMemo(() => {
    const lineGst = lineItems.reduce((sum, item) => sum + item.gst, 0);
    const amenityGst = amenityItems.reduce((sum, item) => sum + item.gst, 0);
    return lineGst + amenityGst;
  }, [lineItems, amenityItems]);

  const totalDiscount = useMemo(() => {
    const lineDisc = lineItems.reduce((sum, item) => sum + item.discount, 0);
    const amenityDisc = amenityItems.reduce((sum, item) => sum + item.discount, 0);
    return lineDisc + amenityDisc;
  }, [lineItems, amenityItems]);

  const resetForm = () => {
    setCustomerName('');
    setCustomerSearchText('');
    setShowCustomerDropdown(false);
    setShowProjectDropdown(false);
    setCustomerMobile('');
    setCustomerAddress('');
    setProjectName('');
    setDate(new Date().toISOString().split('T')[0]);
    setPaidAmount(0);
    setLineItems([{ productName: '', productCode: '', quantity: 1, price: 0, discount: 0, gst: 0, gstPercentage: 18, total: 0 }]);
    setAmenityItems([{ productName: '', productCode: 'AMENITY', quantity: 1, price: 0, discount: 0, gst: 0, gstPercentage: 18, total: 0 }]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      onAddToast('Please select a customer.', 'error');
      return;
    }
    if (lineItems.length === 0 || lineItems.some(li => !li.productCode)) {
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
        items: lineItems,
        amenityItems: amenityItems.filter(a => a.productName.trim() !== ''),
        totalAmount,
        gstAmount: totalGst,
        discountAmount: totalDiscount,
        paidAmount,
        walletId: paidAmount > 0 ? walletId : undefined
      };

      await addInvoice(payload as any);
      onAddToast('Sales invoice generated successfully.', 'success');
      setShowModal(false);
      resetForm();
      loadData();
    } catch (err) {
      onAddToast('Failed to generate sales invoice.', 'error');
    }
  };

  const handleDelete = async (id: string, num: string) => {
    const ok = await onConfirm(`Delete tax invoice "${num}"? This will reverse the customer outstanding debt balance and return the items back into warehouse inventory stock.`);
    if (!ok) return;
    try {
      await deleteInvoice(id);
      onAddToast('Invoice deleted and stock reversed.', 'success');
      loadData();
    } catch (err) {
      onAddToast('Failed to delete invoice.', 'error');
    }
  };

  const handleDownloadPDF = async (inv: Invoice) => {
    onAddToast('Generating Tax Invoice PDF, please wait...', 'info');
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
        const upiString = `upi://pay?pa=jkfutureinfra@sbi&pn=JK FUTURE INFRA&tn=Invoice ${inv.invoiceNumber}&am=${inv.pendingAmount > 0 ? inv.pendingAmount : inv.totalAmount}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiString)}`;
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
      doc.text('TAX INVOICE', 195, 45, { align: 'right' });

      // Horizontal separator line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(15, 56, 195, 56);

      // Customer details lookup
      const customerDetail = customersList.find(c => c.name.toLowerCase() === inv.customerName.toLowerCase());

      doc.setTextColor(15, 43, 70); // Deep Navy
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Billed To:', 15, 64);
      
      doc.setTextColor(15, 23, 42); // Slate 900
      doc.setFontSize(9.5);
      doc.text(inv.customerName, 15, 69);
      
      doc.setTextColor(71, 85, 105); // Slate 600
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      
      let currentInfoY = 74;
      const mob = inv.customerMobile || customerDetail?.mobile;
      if (mob) {
        doc.text(`Contact No.: ${mob}`, 15, currentInfoY);
        currentInfoY += 4.5;
      }

      if (customerDetail?.email) {
        doc.text(`Email: ${customerDetail.email}`, 15, currentInfoY);
        currentInfoY += 4.5;
      }
      
      if (customerDetail?.gstNumber) {
        doc.text(`GSTIN: ${customerDetail.gstNumber}`, 15, currentInfoY);
        currentInfoY += 4.5;
      }

      const addr = inv.customerAddress || customerDetail?.address;
      if (addr) {
        const addressLines = doc.splitTextToSize(addr, 90);
        addressLines.forEach((line: string) => {
          doc.text(line, 15, currentInfoY);
          currentInfoY += 4.5;
        });
      }

      // Right Info (Metadata)
      doc.setTextColor(15, 43, 70); // Deep Navy
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('Invoice No.:', 120, 64);
      doc.text('Date:', 120, 69);
      doc.text('Payment Status:', 120, 74);
      doc.text('Project Name:', 120, 79);

      doc.setTextColor(15, 23, 42); // Slate 900
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(inv.invoiceNumber, 155, 64);
      doc.text(inv.date, 155, 69);
      doc.text(inv.paymentStatus || 'Unpaid', 155, 74);
      doc.text(inv.projectName || '— General / None —', 155, 79);

      // Line items table
      let y = Math.max(92, currentInfoY + 6);
      doc.setFillColor(15, 43, 70); // Deep Navy Header background
      doc.rect(15, y, 180, 8, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text('#', 17, y + 5.5);
      doc.text('PRODUCT / DESCRIPTION', 24, y + 5.5);
      doc.text('SFT', 98, y + 5.5, { align: 'right' });
      doc.text('UNIT PRICE', 124, y + 5.5, { align: 'right' });
      doc.text('DISCOUNT', 146, y + 5.5, { align: 'right' });
      doc.text('GST (Rs.)', 168, y + 5.5, { align: 'right' });
      doc.text('TOTAL', 193, y + 5.5, { align: 'right' });

      y += 8;
      doc.setTextColor(15, 23, 42); // Slate 900
      
      const allPrintItems = [
        ...(inv.items || []),
        ...(inv.amenityItems || [])
      ];

      allPrintItems.forEach((item, idx) => {
        if (!item.productName) return;
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, y, 180, 8, 'F');
        }
        
        const price = item.price || (item as any).unitPrice || 0;
        const qty = item.quantity || 1;
        const disc = item.discount || 0;
        const gstAmt = item.gst || 0;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(String(idx + 1), 17, y + 5.5);
        doc.text(item.productName, 24, y + 5.5);
        doc.text(String(qty), 98, y + 5.5, { align: 'right' });
        doc.text(fmtPDF(price), 124, y + 5.5, { align: 'right' });
        doc.text(fmtPDF(disc), 146, y + 5.5, { align: 'right' });
        doc.text(fmtPDF(gstAmt), 168, y + 5.5, { align: 'right' });
        doc.text(fmtPDF(item.total), 193, y + 5.5, { align: 'right' });
        
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.5);
        doc.line(15, y + 8, 195, y + 8);
        y += 8;
      });

      // Calculate totals breakdown for summary box
      const totalSub = allPrintItems.reduce((sum, item) => sum + ((item.price || (item as any).unitPrice || 0) * (item.quantity || 1)), 0);
      const totalDisc = inv.discountAmount !== undefined ? inv.discountAmount : allPrintItems.reduce((sum, item) => sum + (item.discount || 0), 0);
      const totalGst = inv.gstAmount !== undefined ? inv.gstAmount : allPrintItems.reduce((sum, item) => sum + (item.gst || 0), 0);

      y += 6;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.rect(110, y - 4, 85, 34, 'FD');
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('Subtotal:', 115, y + 1);
      doc.text(fmtPDF(totalSub), 190, y + 1, { align: 'right' });
      
      doc.text('Discounts Deducted:', 115, y + 6);
      doc.text(fmtPDF(totalDisc), 190, y + 6, { align: 'right' });

      doc.text('GST Tax Amount:', 115, y + 11);
      doc.text(fmtPDF(totalGst), 190, y + 11, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 43, 70);
      doc.text('Grand Total (INR):', 115, y + 17);
      doc.text(fmtPDF(inv.totalAmount), 190, y + 17, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(22, 101, 52); // green
      doc.text('Amount Received:', 115, y + 22);
      doc.text(fmtPDF(inv.paidAmount || 0), 190, y + 22, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(185, 28, 28); // red
      doc.text('Balance Pending:', 115, y + 27);
      doc.text(fmtPDF(inv.pendingAmount || 0), 190, y + 27, { align: 'right' });

      y += 36;

      // Terms & Banking section
      if (y > 210) {
        doc.addPage();
        y = 20;
      }

      // Bank details box
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.setLineWidth(0.5);
      doc.rect(15, y, 110, 42, 'FD');
      
      doc.setTextColor(15, 43, 70);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('Pay To (Bank Details):', 18, y + 6);
      
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Bank Name: STATE BANK OF INDIA, AGANAMPUDI', 18, y + 13);
      doc.text('Bank Account No.: 45116449587', 18, y + 19);
      doc.text('Bank IFSC code: SBIN0006832', 18, y + 25);
      doc.text("Account Holder's Name: JK FUTURE INFRA", 18, y + 31);

      if (qrData) {
        doc.addImage(qrData, 'PNG', 135, y, 32, 32);
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text('Scan with any UPI app to pay', 135, y + 36);
      }

      y += 48;

      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      doc.setTextColor(15, 43, 70);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Terms and Conditions:', 15, y);
      
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      const termsText = inv.termsAndConditions || '1. Goods once sold will not be taken back.\n2. All payments to be made in favor of JK FUTURE INFRA.\n3. Subject to local jurisdiction.';
      const lines = doc.splitTextToSize(termsText, 180);
      doc.text(lines, 15, y + 5);

      y += Math.max(20, lines.length * 3.5);
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setTextColor(15, 43, 70);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('For: JK FUTURE INFRA', 140, y);
      
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('Authorized Signatory', 140, y + 18);

      doc.save(`Invoice_${inv.invoiceNumber}.pdf`);
      onAddToast('Tax Invoice PDF downloaded.', 'success');
    } catch (err) {
      console.error(err);
      onAddToast('Failed to generate PDF.', 'error');
    }
  };

  const handleShareInvoice = async (inv: Invoice) => {
    const text = `Hi, here is Tax Invoice ${inv.invoiceNumber} from JK Future Infra.\n\nCustomer: ${inv.customerName}\nTotal Amount: ${fmt(inv.totalAmount)}\nPaid: ${fmt(inv.paidAmount)}\nBalance Pending: ${fmt(inv.pendingAmount)}\nStatus: ${inv.paymentStatus}\nProject: ${inv.projectName || 'General'}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${inv.invoiceNumber}`,
          text: text
        });
        onAddToast('Shared successfully', 'success');
      } catch (err) {
        // Cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        onAddToast('Invoice details copied to clipboard!', 'success');
        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(waUrl, '_blank');
      } catch (err) {
        onAddToast('Could not copy details.', 'error');
      }
    }
  };

  // KPIs
  const stats = useMemo(() => {
    const totalSales = invoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
    const totalReceived = invoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
    const totalPending = invoices.reduce((sum, i) => sum + (i.pendingAmount || 0), 0);
    return {
      totalSales,
      totalReceived,
      totalPending
    };
  }, [invoices]);

  const cols: ALVColumn[] = [
    { key: 'invoiceNumber', label: 'Invoice Number', sortable: true },
    { key: 'customerName', label: 'Customer Name', sortable: true },
    { key: 'date', label: 'Date', sortable: true },
    { 
      key: 'totalAmount', 
      label: 'Grand Total', 
      align: 'right', 
      render: (v) => fmt(Number(v)) 
    },
    { key: 'paidAmount', label: 'Paid Amount', align: 'right', render: (v) => fmt(Number(v)) },
    { 
      key: 'pendingAmount', 
      label: 'Balance Pending', 
      align: 'right', 
      render: (v) => <strong style={{ color: Number(v) > 0 ? '#ef4444' : 'var(--success)' }}>{fmt(Number(v))}</strong> 
    },
    { key: 'paymentStatus', label: 'Payment Status', sortable: true, render: (v) => {
      const s = String(v);
      let color = 'var(--text-muted)';
      if (s === 'Paid') color = 'var(--success)';
      if (s === 'Partial') color = 'var(--warning)';
      if (s === 'Unpaid') color = 'var(--danger)';
      return <span style={{ color, fontWeight: 'bold' }}>{s}</span>;
    }},
    {
      key: 'actions',
      label: 'Actions',
      align: 'center',
      render: (_, row: any) => (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
          <button 
            type="button" 
            onClick={() => handleDownloadPDF(row)} 
            className="btn btn-sm btn-outline text-primary" 
            title="Download PDF" 
            style={{ padding: '4px 8px' }}
          >
            <Download size={14} />
          </button>
          <button 
            type="button" 
            onClick={() => handleShareInvoice(row)} 
            className="btn btn-sm btn-outline text-info" 
            title="Share Invoice" 
            style={{ padding: '4px 8px' }}
          >
            <Share2 size={14} />
          </button>
          <button 
            onClick={() => handleDelete(String(row.id), String(row.invoiceNumber))} 
            className="btn btn-sm btn-outline text-danger"
            style={{ padding: '4px 8px', color: '#ef4444', borderColor: '#ef4444' }}
            title="Delete Invoice"
          >
            <Trash size={14} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="admin-page-container">
      {/* KPIs */}
      <div className="grid grid-3 gap-2 mb-3">
        <div className="stat-card shadow-sm" style={{ borderLeft: '4px solid var(--secondary)' }}>
          <div className="stat-icon-wrapper secondary-soft">
            <FileText size={24} className="text-secondary" />
          </div>
          <div>
            <span className="stat-title">Total Sales Invoices</span>
            <h3>{fmt(stats.totalSales)}</h3>
          </div>
        </div>

        <div className="stat-card shadow-sm" style={{ borderLeft: '4px solid var(--success)' }}>
          <div className="stat-icon-wrapper success-soft">
            <DollarSign size={24} className="text-success" />
          </div>
          <div>
            <span className="stat-title">Cash Collections Received</span>
            <h3>{fmt(stats.totalReceived)}</h3>
          </div>
        </div>

        <div className="stat-card shadow-sm" style={{ borderLeft: '4px solid var(--danger)' }}>
          <div className="stat-icon-wrapper danger-soft">
            <Landmark size={24} className="text-danger" />
          </div>
          <div>
            <span className="stat-title">Receivables Outstanding</span>
            <h3 className="text-danger">{fmt(stats.totalPending)}</h3>
          </div>
        </div>
      </div>

      <ALVGrid 
        title="Sales Invoices Ledger"
        subtitle="Manage tax invoices, sales postings, and collections"
        columns={cols}
        data={invoices as any}
        rowKey="id"
        onAdd={() => { resetForm(); setShowModal(true); }}
        addLabel="Generate Sales Invoice"
        onRefresh={loadData}
        pageSize={15}
        selectable={false}
        loading={loading}
      />

      {/* Invoice Editor Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '850px', maxWidth: '95%' }}>
            <div className="modal-header">
              <h3>Generate Sales Invoice</h3>
              <button onClick={() => setShowModal(false)} className="close-btn"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                <div className="grid grid-3 gap-2 mb-2">
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label className="form-label">Customer Name *</label>
                    <input 
                      type="text"
                      className="form-control"
                      value={customerSearchText}
                      onChange={e => {
                        const val = e.target.value;
                        setCustomerSearchText(val);
                        setCustomerName(val);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      onBlur={() => {
                        setTimeout(() => {
                          setShowCustomerDropdown(false);
                          if (customerSearchText.trim()) {
                            const matched = customersList.find(c => c.name.toLowerCase() === customerSearchText.trim().toLowerCase());
                            if (matched) {
                              setCustomerName(matched.name);
                              setCustomerSearchText(matched.name);
                              setCustomerMobile(matched.mobile);
                              setCustomerAddress(matched.address || '');
                            }
                          }
                        }, 250);
                      }}
                      placeholder="Search or type customer name..."
                      required
                    />
                    {showCustomerDropdown && (
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        backgroundColor: '#fff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        zIndex: 9999,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        marginTop: '2px'
                      }}>
                        <div 
                          onMouseDown={async () => {
                            const cName = prompt("Enter new customer name:");
                            if (!cName || !cName.trim()) return;
                            if (customersList.some(c => c.name.toLowerCase() === cName.trim().toLowerCase())) {
                              onAddToast('Customer already exists.', 'error');
                              return;
                            }
                            await handleCreateCustomer(cName);
                          }}
                          style={{ 
                            padding: '8px 12px', 
                            cursor: 'pointer', 
                            borderBottom: '1px solid #e2e8f0', 
                            fontSize: '0.78rem',
                            fontWeight: 'bold',
                            color: '#2563eb',
                            backgroundColor: '#fff',
                            textAlign: 'left'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; }}
                        >
                          + Create New Customer
                        </div>
                        {customersList
                          .filter(c => c.name.toLowerCase().includes(customerSearchText.toLowerCase()))
                          .map(c => (
                            <div 
                              key={c.id}
                              onMouseDown={() => {
                                setCustomerName(c.name);
                                setCustomerSearchText(c.name);
                                setCustomerMobile(c.mobile);
                                setCustomerAddress(c.address || '');
                                setShowCustomerDropdown(false);
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
                              {c.name} ({c.mobile})
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Customer Mobile</label>
                    <input 
                      type="tel" 
                      className="form-control" 
                      value={customerMobile} 
                      onChange={e => setCustomerMobile(e.target.value)} 
                      placeholder="e.g. 9876543210"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Billing Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={date} 
                      onChange={e => setDate(e.target.value)} 
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-2 gap-2 mb-2">
                  <div className="form-group">
                    <label className="form-label">Customer Address</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={customerAddress} 
                      onChange={e => setCustomerAddress(e.target.value)} 
                      placeholder="Billing/Shipping Address"
                    />
                  </div>
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label className="form-label">Project Association</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={projectName} 
                      onChange={e => {
                        const val = e.target.value;
                        setProjectName(val);
                        setShowProjectDropdown(true);
                        setLineItems([{ productName: '', productCode: '', quantity: 1, price: 0, discount: 0, gst: 0, gstPercentage: 18, total: 0 }]);
                      }} 
                      onFocus={() => setShowProjectDropdown(true)}
                      onBlur={() => {
                        setTimeout(() => {
                          setShowProjectDropdown(false);
                          if (projectName.trim() !== '' && !itemsList.some(p => p.name.toLowerCase() === projectName.trim().toLowerCase())) {
                            setProjectName('');
                            setLineItems([{ productName: '', productCode: '', quantity: 1, price: 0, discount: 0, gst: 0, gstPercentage: 18, total: 0 }]);
                          }
                        }, 250);
                      }}
                      placeholder="Search or type project name..." 
                    />
                    {showProjectDropdown && (
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        backgroundColor: '#fff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        zIndex: 9999,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        marginTop: '2px'
                      }}>
                        {itemsList
                          .filter(p => p.name.toLowerCase().includes(projectName.toLowerCase()))
                          .map(p => (
                            <div 
                              key={p.id}
                              onMouseDown={() => {
                                setProjectName(p.name);
                                setShowProjectDropdown(false);
                                setLineItems([{ productName: '', productCode: '', quantity: 1, price: 0, discount: 0, gst: 0, gstPercentage: 18, total: 0 }]);
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
                              {p.name} {p.code ? `(${p.code})` : ''}
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>
                </div>

                {/* Line Items / Products */}
                <div className="form-group">
                  <label className="form-label font-bold" style={{ borderBottom: '1px solid #eee', paddingBottom: '4px', marginBottom: '8px' }}>Line Items / Products</label>
                  <div className="modal-table-wrapper">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }} className="text-sm">
                      <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                          <th style={{ padding: '6px' }}>Product</th>
                          <th style={{ padding: '6px', width: '90px' }}>SFT</th>
                          <th style={{ padding: '6px', width: '120px' }}>Selling Price</th>
                          <th style={{ padding: '6px', width: '100px' }}>Discount</th>
                          <th style={{ padding: '6px', width: '100px', textAlign: 'center' }}>GST %</th>
                          <th style={{ padding: '6px', width: '120px', textAlign: 'right' }}>Total</th>
                          <th style={{ padding: '6px', width: '40px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '4px' }}>
                              {(() => {
                                const selectedProduct = itemsList.find(p => p.name.toLowerCase() === projectName.trim().toLowerCase());
                                if (selectedProduct) {
                                  if (selectedProduct.batches && selectedProduct.batches.length > 0) {
                                    const getSelectedFlatNo = (pName: string) => {
                                      const match = pName.match(/Flat\s+(\w+)/i);
                                      return match ? match[1] : '';
                                    };
                                    return (
                                      <select
                                        value={getSelectedFlatNo(item.productName)}
                                        onChange={e => {
                                          const flatNo = e.target.value;
                                          const batch = selectedProduct.batches?.find(b => b.flatNo === flatNo);
                                          if (batch) {
                                            const qty = batch.openingQty || 0;
                                            const price = selectedProduct.sellingPrice || 0;
                                            const gstPct = selectedProduct.gstPercentage || 18;
                                            const discount = item.discount || 0;
                                            const base = qty * price;
                                            const afterDisc = base - discount;
                                            const gst = afterDisc * (gstPct / 100);
                                            const total = afterDisc + gst;

                                            setLineItems(prev => prev.map((li, i) => {
                                              if (i !== idx) return li;
                                              return {
                                                ...li,
                                                productName: `${selectedProduct.name} - Flat ${batch.flatNo} (${batch.facingFloor})`,
                                                productCode: selectedProduct.code,
                                                quantity: qty,
                                                price,
                                                gstPercentage: gstPct,
                                                gst,
                                                total
                                              };
                                            }));
                                          }
                                        }}
                                        className="form-control"
                                        style={{ marginBottom: 0, padding: '4px' }}
                                        required
                                      >
                                        <option value="">-- Select Flat/Unit --</option>
                                        {selectedProduct.batches.map(b => (
                                          <option key={b.flatNo} value={b.flatNo}>
                                            Flat {b.flatNo} ({b.facingFloor} - {b.openingQty} SFT)
                                          </option>
                                        ))}
                                      </select>
                                    );
                                  } else {
                                    return (
                                      <select className="form-control" style={{ marginBottom: 0, padding: '4px' }} disabled>
                                        <option value="">-- No Floor Units Configured --</option>
                                      </select>
                                    );
                                  }
                                } else {
                                  return (
                                    <select className="form-control" style={{ marginBottom: 0, padding: '4px' }} disabled>
                                      <option value="">-- Select Product under Project Association first --</option>
                                    </select>
                                  );
                                }
                              })()}
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
                                value={item.price} 
                                onChange={e => updateLineItem(idx, 'price', parseFloat(e.target.value) || 0)} 
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
                            <td style={{ padding: '4px', textAlign: 'center' }}>
                              <select
                                value={item.gstPercentage !== undefined ? item.gstPercentage : (() => {
                                  const prod = itemsList.find(p => p.code === item.productCode);
                                  return prod ? prod.gstPercentage : 18;
                                })()}
                                onChange={e => {
                                  const pct = parseFloat(e.target.value) || 0;
                                  updateLineItem(idx, 'gstPercentage', pct);
                                }}
                                className="form-control"
                                style={{ marginBottom: 0, padding: '4px', fontSize: '0.78rem', textAlign: 'center' }}
                              >
                                <option value={0}>0%</option>
                                <option value={5}>5%</option>
                                <option value={12}>12%</option>
                                <option value={18}>18%</option>
                                <option value={28}>28%</option>
                              </select>
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

                {/* Amenities & Additional Charges Grid */}
                <div className="form-group" style={{ marginTop: '1.25rem' }}>
                  <label className="form-label font-bold" style={{ borderBottom: '1px solid #eee', paddingBottom: '4px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Amenities &amp; Additional Charges</span>
                  </label>
                  <div className="modal-table-wrapper">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }} className="text-sm">
                      <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd', backgroundColor: '#fafafa' }}>
                          <th style={{ padding: '6px' }}>Amenity / Charge Description</th>
                          <th style={{ padding: '6px', width: '90px' }}>SFT</th>
                          <th style={{ padding: '6px', width: '120px' }}>Rate / Price</th>
                          <th style={{ padding: '6px', width: '100px' }}>Discount</th>
                          <th style={{ padding: '6px', width: '100px', textAlign: 'center' }}>GST %</th>
                          <th style={{ padding: '6px', width: '120px', textAlign: 'right' }}>Total</th>
                          <th style={{ padding: '6px', width: '40px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {amenityItems.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '4px' }}>
                              <select
                                value={item.productName}
                                onChange={e => updateAmenityItem(idx, 'productName', e.target.value)}
                                className="form-control"
                                style={{ marginBottom: 0, padding: '4px' }}
                              >
                                <option value="">-- Select Amenity --</option>
                                {availableAmenityOptions.map(p => (
                                  <option key={p} value={p}>{p}</option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: '4px' }}>
                              <input 
                                type="number" 
                                value={item.quantity} 
                                onChange={e => updateAmenityItem(idx, 'quantity', parseFloat(e.target.value) || 0)} 
                                className="form-control"
                                style={{ marginBottom: 0, padding: '4px' }}
                                min={1}
                                required 
                              />
                            </td>
                            <td style={{ padding: '4px' }}>
                              <input 
                                type="number" 
                                value={item.price} 
                                onChange={e => updateAmenityItem(idx, 'price', parseFloat(e.target.value) || 0)} 
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
                                onChange={e => updateAmenityItem(idx, 'discount', parseFloat(e.target.value) || 0)} 
                                className="form-control"
                                style={{ marginBottom: 0, padding: '4px' }}
                                min={0}
                              />
                            </td>
                            <td style={{ padding: '4px', textAlign: 'center' }}>
                              <select
                                value={item.gstPercentage !== undefined ? item.gstPercentage : 18}
                                onChange={e => {
                                  const pct = parseFloat(e.target.value) || 0;
                                  updateAmenityItem(idx, 'gstPercentage', pct);
                                }}
                                className="form-control"
                                style={{ marginBottom: 0, padding: '4px', fontSize: '0.78rem', textAlign: 'center' }}
                              >
                                <option value={0}>0%</option>
                                <option value={5}>5%</option>
                                <option value={12}>12%</option>
                                <option value={18}>18%</option>
                                <option value={28}>28%</option>
                              </select>
                            </td>
                            <td style={{ padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>
                              {fmt(item.total)}
                            </td>
                            <td style={{ padding: '4px', textAlign: 'center' }}>
                              <button 
                                type="button" 
                                onClick={() => removeAmenityItem(idx)} 
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
                    onClick={addAmenityItem} 
                    className="btn btn-outline btn-sm mt-1"
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                  >
                    + Add Amenity Line
                  </button>
                </div>

                <div className="grid grid-2 gap-3" style={{ borderTop: '1px solid #eee', paddingTop: '10px' }}>
                  <div>
                    <div className="form-group">
                      <label className="form-label">Payment Received Amount (INR)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={paidAmount} 
                        onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)} 
                        min={0}
                        max={totalAmount}
                      />
                    </div>
                    {paidAmount > 0 && walletsList.length > 0 && (
                      <div className="form-group">
                        <label className="form-label">Deposit Cash to Bank / Wallet</label>
                        <select 
                          className="form-control"
                          value={walletId}
                          onChange={e => setWalletId(e.target.value)}
                        >
                          {walletsList.map(w => (
                            <option key={w.id} value={w.id}>{w.name} ({fmt(w.currentBalance)})</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                      <div className="flex justify-between text-sm">
                        <span>GST Tax Amount:</span>
                        <span>{fmt(totalGst)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Discounts Deducted:</span>
                        <span>{fmt(totalDiscount)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-base" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
                        <span>Grand Total (INR):</span>
                        <span style={{ color: 'var(--primary)' }}>{fmt(totalAmount)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-success">
                        <span>Amount Received:</span>
                        <span>{fmt(paidAmount)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-sm text-danger">
                        <span>Balance Pending:</span>
                        <span>{fmt(totalAmount - paidAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">Generate &amp; Save Invoice</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
