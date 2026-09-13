import React, { useState, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import type { Quotation, QuotationItem, Customer, Supplier, InventoryItem, Project, Amenity } from '../types';
import { 
  X, Trash, Download, Share2
} from 'lucide-react';
import { 
  getQuotations, addQuotation, updateQuotation, deleteQuotation,
  getInventoryItems, getCustomers, getSuppliers, addInvoice, getProjects,
  addCustomer, getAmenities
} from '../utils/db';
import { ALVGrid } from './ALVGrid';
import type { ALVColumn } from './ALVGrid';
import logoImg from '../assets/logo.png';
import signatureImg from '../assets/authorised_signature.png';

interface AdminQuotationsProps {
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onConfirm: (msg: string) => Promise<boolean>;
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPDF = (n: number) => `Rs. ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const AdminQuotations: React.FC<AdminQuotationsProps> = ({
  onAddToast,
  onConfirm
}) => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [itemsList, setItemsList] = useState<InventoryItem[]>([]);
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [suppliersList, setSuppliersList] = useState<Supplier[]>([]);
  const [_projectsList, setProjectsList] = useState<Project[]>([]);
  const [_amenitiesMasterList, setAmenitiesMasterList] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [customerSearchText, setCustomerSearchText] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
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
  const DEFAULT_QUOTATION_TERMS = '1. Quotation valid for 30 days from date of issue.\n2. All payments to be made strictly in favor of JK FUTURE INFRA.\n3. Registration, Stamp Duty, GST and Legal charges extra as per Govt rules.\n4. Flat/Unit possession will be handed over after clearance of total property dues.\n5. All disputes subject to local jurisdiction.';
  const [terms, setTerms] = useState(DEFAULT_QUOTATION_TERMS);
  const [status, setStatus] = useState('Draft');

  // Quotation Line Items
  const [lineItems, setLineItems] = useState<QuotationItem[]>([
    { productName: '', productCode: '', quantity: 1, unitPrice: 0, discount: 0, gstPercentage: 18, total: 0 }
  ]);

  // Quotation Amenity Items
  const [amenityItems, setAmenityItems] = useState<QuotationItem[]>([
    { productName: '', productCode: 'AMENITY', quantity: 1, unitPrice: 0, discount: 0, gstPercentage: 18, total: 0 }
  ]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [quotes, items, customers, suppliers, projs, fetchedAmenities] = await Promise.all([
        getQuotations(),
        getInventoryItems(),
        getCustomers(),
        getSuppliers().catch(() => []),
        getProjects(),
        getAmenities().catch(() => [])
      ]);
      setQuotations(quotes);
      setItemsList(items);
      setCustomersList(customers);
      setSuppliersList(suppliers || []);
      setProjectsList(projs);
      setAmenitiesMasterList(fetchedAmenities || []);
    } catch (err) {
      onAddToast('Failed to load quotations data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);


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

  const updateAmenityItem = (idx: number, field: keyof QuotationItem, value: any) => {
    setAmenityItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      
      const qty = field === 'quantity' ? parseFloat(value) || 0 : item.quantity;
      const price = field === 'unitPrice' ? parseFloat(value) || 0 : item.unitPrice;
      const discount = field === 'discount' ? parseFloat(value) || 0 : item.discount;
      const gst = field === 'gstPercentage' ? parseFloat(value) || 0 : item.gstPercentage;
      
      const base = qty * price;
      const afterDisc = base - discount;
      updated.total = afterDisc + (afterDisc * (gst / 100));

      return updated;
    }));
  };

  const addAmenityItem = () => {
    setAmenityItems(prev => [
      ...prev,
      { productName: '', productCode: 'AMENITY', quantity: 1, unitPrice: 0, discount: 0, gstPercentage: 18, total: 0 }
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

  const resetForm = () => {
    setCustomerName('');
    setCustomerSearchText('');
    setShowCustomerDropdown(false);
    setShowProjectDropdown(false);
    setCustomerMobile('');
    setCustomerAddress('');
    setProjectName('');
    setDate(new Date().toISOString().split('T')[0]);
    setValidTillDate(() => {
      const d = new Date();
      d.setDate(d.getDate() + 30); // 30 days validity default
      return d.toISOString().split('T')[0];
    });
    setNotes('');
    setTerms(DEFAULT_QUOTATION_TERMS);
    setStatus('Draft');
    setLineItems([{ productName: '', productCode: '', quantity: 1, unitPrice: 0, discount: 0, gstPercentage: 18, total: 0 }]);
    setAmenityItems([{ productName: '', productCode: 'AMENITY', quantity: 1, unitPrice: 0, discount: 0, gstPercentage: 18, total: 0 }]);
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
        amenityItems: amenityItems.filter(a => a.productName.trim() !== ''),
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
    setCustomerSearchText(q.customerName);
    setCustomerMobile(q.customerMobile);
    setCustomerAddress(q.customerAddress || '');
    setProjectName(q.projectName || '');
    setDate(q.date);
    setValidTillDate(q.validTillDate);
    setNotes(q.notes || '');
    setTerms(q.termsAndConditions || '');
    setStatus(q.status);
    setLineItems(q.items && q.items.length ? q.items : []);
    setAmenityItems(q.amenityItems && q.amenityItems.length ? q.amenityItems : [{ productName: '', productCode: 'AMENITY', quantity: 1, unitPrice: 0, discount: 0, gstPercentage: 18, total: 0 }]);
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

      // Load Signature
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
        console.warn('Signature loading failed:', e);
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
      doc.text('AGANAMPUDI, Visakhapatnam', 120, 23);
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

      // Metadata Block - Customer or Supplier details looked up from database
      const customerDetail = customersList.find(c => c.name.toLowerCase() === q.customerName.toLowerCase() || c.mobile === q.customerMobile);
      const supplierDetail = !customerDetail ? suppliersList.find(s => s.name.toLowerCase() === q.customerName.toLowerCase() || s.contactNumber === q.customerMobile) : null;
      const effectiveGst = customerDetail?.gstNumber || supplierDetail?.gstNumber;
      const effectiveEmail = customerDetail?.email;

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
      
      let currentInfoY = 74;
      doc.text(`Contact No.: ${q.customerMobile}`, 15, currentInfoY);
      currentInfoY += 4.5;

      if (effectiveEmail) {
        doc.text(`Email: ${effectiveEmail}`, 15, currentInfoY);
        currentInfoY += 4.5;
      }
      
      if (effectiveGst) {
        doc.text(`GSTIN: ${effectiveGst}`, 15, currentInfoY);
        currentInfoY += 4.5;
      }

      if (q.customerAddress) {
        const addressLines = doc.splitTextToSize(q.customerAddress, 90);
        addressLines.forEach((line: string) => {
          doc.text(line, 15, currentInfoY);
          currentInfoY += 4.5;
        });
      }

      // Right Info (Metadata)
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

      // Line items table (vertical position dynamically shifts if customer details are long)
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
        ...q.items,
        ...(q.amenityItems || [])
      ];

      allPrintItems.forEach((item, idx) => {
        if (!item.productName) return;
        // Striped background rows
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252); // Slate 50
          doc.rect(15, y, 180, 8, 'F');
        }
        
        const base = (item.unitPrice || 0) * (item.quantity || 1);
        const afterDisc = base - (item.discount || 0);
        const itemGstAmt = afterDisc * ((item.gstPercentage || 0) / 100);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(String(idx + 1), 17, y + 5.5);
        doc.text(item.productName, 24, y + 5.5);
        doc.text(String(item.quantity), 98, y + 5.5, { align: 'right' });
        doc.text(fmtPDF(item.unitPrice), 124, y + 5.5, { align: 'right' });
        doc.text(fmtPDF(item.discount), 146, y + 5.5, { align: 'right' });
        doc.text(fmtPDF(itemGstAmt), 168, y + 5.5, { align: 'right' });
        doc.text(fmtPDF(item.total), 193, y + 5.5, { align: 'right' });
        
        doc.setDrawColor(241, 245, 249); // Slate 100 border
        doc.setLineWidth(0.5);
        doc.line(15, y + 8, 195, y + 8);
        y += 8;
      });

      // Calculate totals breakdown for summary box (matching 3rd image style)
      const totalSub = allPrintItems.reduce((sum, item) => sum + ((item.unitPrice || 0) * (item.quantity || 1)), 0);
      const totalDisc = allPrintItems.reduce((sum, item) => sum + (item.discount || 0), 0);
      const totalGst = allPrintItems.reduce((sum, item) => {
        const afterDisc = ((item.unitPrice || 0) * (item.quantity || 1)) - (item.discount || 0);
        return sum + (afterDisc * ((item.gstPercentage || 0) / 100));
      }, 0);

      y += 6;
      doc.setFillColor(248, 250, 252); // slate 50 background
      doc.setDrawColor(226, 232, 240); // slate 200 border
      doc.setLineWidth(0.5);
      doc.rect(110, y - 4, 85, 24, 'FD');
      
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
      doc.setTextColor(15, 43, 70); // Deep Navy
      doc.text('Grand Total (INR):', 115, y + 17);
      doc.text(fmtPDF(q.totalAmount), 190, y + 17, { align: 'right' });

      y += 24;

      // Terms & Banking section
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
      y += Math.max(16, lines.length * 3.5);
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setTextColor(15, 43, 70); // Deep Navy
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('For: JK FUTURE INFRA', 140, y);
      
      let sigOffset = 18;
      if (sigData) {
        const sigHeight = 14;
        const sigWidth = Math.min(45, sigHeight * sigData.ratio);
        doc.addImage(sigData.base64, 'PNG', 140, y + 2, sigWidth, sigHeight);
        sigOffset = sigHeight + 6;
      }

      doc.setTextColor(71, 85, 105); // Slate 600
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('Authorized Signatory', 140, y + sigOffset);

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
      // Structure regular items for Invoice
      const regularItems = (q.items || []).filter(i => i.productName && i.productName.trim() !== '').map(item => {
        const qty = item.quantity || 1;
        const price = item.unitPrice || 0;
        const discount = item.discount || 0;
        const gstPct = item.gstPercentage || 0;
        const gst = ((price * qty) - discount) * (gstPct / 100);
        return {
          productName: item.productName,
          productCode: item.productCode || '',
          quantity: qty,
          price: price,
          discount: discount,
          gst: gst,
          gstPercentage: gstPct,
          total: item.total
        };
      });

      // Structure amenity items for Invoice
      const amenityInvoiceItems = (q.amenityItems || []).filter(i => i.productName && i.productName.trim() !== '').map(item => {
        const qty = item.quantity || 1;
        const price = item.unitPrice || 0;
        const discount = item.discount || 0;
        const gstPct = item.gstPercentage || 0;
        const gst = ((price * qty) - discount) * (gstPct / 100);
        return {
          productName: item.productName,
          productCode: item.productCode || 'AMENITY',
          quantity: qty,
          price: price,
          discount: discount,
          gst: gst,
          gstPercentage: gstPct,
          total: item.total
        };
      });

      const allItems = [...regularItems, ...amenityInvoiceItems];
      const gstTotal = allItems.reduce((s, i) => s + (i.gst || 0), 0);
      const discountTotal = allItems.reduce((s, i) => s + (i.discount || 0), 0);

      await addInvoice({
        quotationId: q.id,
        quotationNumber: q.quotationNumber,
        customerName: q.customerName,
        customerMobile: q.customerMobile || '',
        customerAddress: q.customerAddress || '',
        projectName: q.projectName || '',
        date: new Date().toISOString().split('T')[0],
        items: regularItems.length > 0 ? regularItems : allItems,
        amenityItems: amenityInvoiceItems,
        totalAmount: q.totalAmount,
        gstAmount: gstTotal,
        discountAmount: discountTotal,
        paidAmount: 0,
        termsAndConditions: q.termsAndConditions || '',
        notes: q.notes || ''
      });

      // Update Quotation Status to Converted
      await updateQuotation({ ...q, status: 'Converted' });

      onAddToast(`Quotation ${q.quotationNumber} successfully converted to Invoice!`, 'success');
      loadData();
    } catch (err: any) {
      console.error(err);
      onAddToast(err?.message || 'Failed to convert quotation to invoice.', 'error');
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
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label className="form-label">Customer / Supplier *</label>
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
                            const matchedCustomer = customersList.find(c => c.name.toLowerCase() === customerSearchText.trim().toLowerCase());
                            if (matchedCustomer) {
                              setCustomerName(matchedCustomer.name);
                              setCustomerSearchText(matchedCustomer.name);
                              setCustomerMobile(matchedCustomer.mobile);
                              setCustomerAddress(matchedCustomer.address || '');
                            } else {
                              const matchedSupplier = suppliersList.find(s => s.name.toLowerCase() === customerSearchText.trim().toLowerCase());
                              if (matchedSupplier) {
                                setCustomerName(matchedSupplier.name);
                                setCustomerSearchText(matchedSupplier.name);
                                setCustomerMobile(matchedSupplier.contactNumber);
                                setCustomerAddress(matchedSupplier.address || '');
                              }
                            }
                          }
                        }, 250);
                      }} 
                      placeholder="Search customer or supplier..."
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
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 9999,
                        maxHeight: '220px',
                        overflowY: 'auto',
                        marginTop: '2px'
                      }}>
                        {customerSearchText.trim() === '' ? (
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
                        ) : (
                          !customersList.some(c => c.name.toLowerCase() === customerSearchText.trim().toLowerCase()) &&
                          !suppliersList.some(s => s.name.toLowerCase() === customerSearchText.trim().toLowerCase()) && (
                            <div 
                              onMouseDown={() => handleCreateCustomer(customerSearchText)}
                              style={{ 
                                padding: '8px 12px', 
                                cursor: 'pointer', 
                                borderBottom: '1px solid #f1f5f9', 
                                fontSize: '0.78rem',
                                fontWeight: 'bold',
                                color: '#2563eb',
                                backgroundColor: '#fff',
                                textAlign: 'left'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; }}
                            >
                              + Create Customer: "{customerSearchText}"
                            </div>
                          )
                        )}
                        {/* Customer List */}
                        {customersList
                          .filter(c => c.name.toLowerCase().includes(customerSearchText.toLowerCase()) || (c.mobile && c.mobile.includes(customerSearchText)))
                          .map(c => (
                            <div 
                              key={`c-${c.id}`}
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
                                textAlign: 'left',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; }}
                            >
                              <span><strong>{c.name}</strong> <span style={{ color: '#64748b', fontSize: '0.72rem' }}>({c.mobile})</span></span>
                              <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}>Customer</span>
                            </div>
                          ))
                        }
                        {/* Supplier List */}
                        {suppliersList
                          .filter(s => s.name.toLowerCase().includes(customerSearchText.toLowerCase()) || (s.contactNumber && s.contactNumber.includes(customerSearchText)))
                          .map(s => (
                            <div 
                              key={`s-${s.id}`}
                              onMouseDown={() => {
                                setCustomerName(s.name);
                                setCustomerSearchText(s.name);
                                setCustomerMobile(s.contactNumber);
                                setCustomerAddress(s.address || '');
                                setShowCustomerDropdown(false);
                              }}
                              style={{ 
                                padding: '8px 12px', 
                                cursor: 'pointer', 
                                borderBottom: '1px solid #f1f5f9', 
                                fontSize: '0.78rem',
                                color: '#1e293b',
                                backgroundColor: '#fff',
                                textAlign: 'left',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fef3c7'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; }}
                            >
                              <span><strong>{s.name}</strong> <span style={{ color: '#64748b', fontSize: '0.72rem' }}>({s.contactNumber})</span></span>
                              <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#b45309', fontWeight: 600 }}>Supplier</span>
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
                        // Reset line items to prevent mismatch when switching products
                        setLineItems([{ productName: '', productCode: '', quantity: 1, unitPrice: 0, discount: 0, gstPercentage: 18, total: 0 }]);
                      }} 
                      onFocus={() => setShowProjectDropdown(true)}
                      onBlur={() => {
                        setTimeout(() => {
                          setShowProjectDropdown(false);
                          // Auto-clear if typed value doesn't match any existing product
                          if (projectName.trim() !== '' && !itemsList.some(p => p.name.toLowerCase() === projectName.trim().toLowerCase())) {
                            setProjectName('');
                            setLineItems([{ productName: '', productCode: '', quantity: 1, unitPrice: 0, discount: 0, gstPercentage: 18, total: 0 }]);
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
                                setLineItems([{ productName: '', productCode: '', quantity: 1, unitPrice: 0, discount: 0, gstPercentage: 18, total: 0 }]);
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
                                                unitPrice: price,
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
                              <input
                                type="text"
                                value={item.productName}
                                onChange={e => updateAmenityItem(idx, 'productName', e.target.value)}
                                className="form-control"
                                style={{ marginBottom: 0, padding: '4px' }}
                                placeholder="Enter Amenity / Charge Description"
                              />
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
                                    value={item.unitPrice} 
                                    onChange={e => updateAmenityItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)} 
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
                        <option value="Converted">Converted</option>
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
