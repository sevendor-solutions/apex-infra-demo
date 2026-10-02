import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Upload,
  Phone,
  ShieldCheck,
  Save,
  RefreshCw,
  Share2,
  CheckCircle2,
  AlertCircle,
  Eye,
  MapPin,
  Landmark,
  Clock,
  ChevronRight,
  ChevronLeft,
  Sun,
  Moon,
  FileSignature,
  Info
} from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { getMediaUrl } from '../utils/db';
import type { CompanyProfile } from '../types';
import './AdminCompanyProfile.css';

type TabKey = 'branding' | 'contact' | 'address' | 'legal' | 'banking' | 'social' | 'preview';

export const AdminCompanyProfile: React.FC = () => {
  const { profile, loading, updateProfile, refreshProfile } = useCompany();

  const [formData, setFormData] = useState<CompanyProfile>(profile);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>(profile?.logoUrl || '/uploads/branding/apex_infra_logo.jpg');
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string>(profile?.signatureUrl || '');
  const [logoBgDark, setLogoBgDark] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('branding');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFormData(profile);
      if (profile.logoUrl) {
        setLogoPreview(getMediaUrl(profile.logoUrl));
      }
      if (profile.signatureUrl) {
        setSignaturePreview(getMediaUrl(profile.signatureUrl));
      }
    }
  }, [profile]);

  const handleInputChange = (field: keyof CompanyProfile, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      const objectUrl = URL.createObjectURL(file);
      setLogoPreview(objectUrl);
    }
  };

  const handleSignatureSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSignatureFile(file);
      const objectUrl = URL.createObjectURL(file);
      setSignaturePreview(objectUrl);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setErrorMessage('');

    try {
      await updateProfile(
        formData,
        logoFile || undefined,
        undefined,
        signatureFile || undefined
      );
      setSaveSuccess(true);
      setLogoFile(null);
      setSignatureFile(null);
      setTimeout(() => setSaveSuccess(false), 6000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save company profile';
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    await refreshProfile();
    if (profile) {
      setFormData(profile);
      setLogoFile(null);
      setSignatureFile(null);
      setLogoPreview(profile.logoUrl ? getMediaUrl(profile.logoUrl) : '/uploads/branding/apex_infra_logo.jpg');
      setSignaturePreview(profile.signatureUrl ? getMediaUrl(profile.signatureUrl) : '');
    }
  };

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; step: number }[] = [
    { key: 'branding', label: '1. Brand & Logo', icon: <Building2 size={16} />, step: 1 },
    { key: 'contact', label: '2. Contacts & Hours', icon: <Phone size={16} />, step: 2 },
    { key: 'address', label: '3. Office & Location', icon: <MapPin size={16} />, step: 3 },
    { key: 'legal', label: '4. RERA & Legal', icon: <ShieldCheck size={16} />, step: 4 },
    { key: 'banking', label: '5. Banking & Invoicing', icon: <Landmark size={16} />, step: 5 },
    { key: 'social', label: '6. Social Profiles', icon: <Share2 size={16} />, step: 6 },
    { key: 'preview', label: '7. Live Full Preview', icon: <Eye size={16} />, step: 7 },
  ];

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 1rem auto', color: '#0284c7' }} />
        <p style={{ fontWeight: 600 }}>Loading company branding & settings...</p>
      </div>
    );
  }

  return (
    <div className="company-profile-wrapper">
      {/* Top Header Banner */}
      <div className="profile-header-banner">
        <div className="profile-header-left">
          <div className="profile-header-icon-box">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="profile-header-title">Company Profile & White-Label Branding</h1>
            <p className="profile-header-subtitle">
              Manage company identity, logo, contacts, RERA numbers, bank details, and authorized signature. Changes reflect instantly across the entire system.
            </p>
          </div>
        </div>

        <div className="profile-header-actions">
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="profile-btn profile-btn-secondary"
            title="Revert unsaved changes"
          >
            <RefreshCw size={15} />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="profile-btn profile-btn-primary"
          >
            {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
            <span>{saving ? 'Saving...' : 'Save & Apply Everywhere'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="profile-alert profile-alert-success">
          <CheckCircle2 size={20} style={{ flexShrink: 0, marginTop: '2px', color: '#059669' }} />
          <div>
            <strong style={{ display: 'block', marginBottom: '2px' }}>Branding & Bank Profile Updated Successfully!</strong>
            <span>Your new logo, company details, banking coordinates, and authorized signature are now active across all website pages, headers, footers, invoices, and login screens.</span>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="profile-alert profile-alert-error">
          <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px', color: '#dc2626' }} />
          <div>
            <strong style={{ display: 'block', marginBottom: '2px' }}>Save Error</strong>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Order-wise Navigation Tabs */}
      <div className="profile-nav-tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`profile-tab-item ${activeTab === tab.key ? 'active' : ''}`}
          >
            <span className="tab-step-badge">{tab.step}</span>
            {tab.icon}
            <span>{tab.label.replace(/^\d+\.\s*/, '')}</span>
          </button>
        ))}
      </div>

      {/* Main Grid: Form on Left, Live Preview on Right */}
      <div className="profile-main-grid">
        {/* Left Column: Form Section Cards */}
        <div className="profile-form-column">
          <form onSubmit={handleSave}>
            {/* STEP 1: BRAND IDENTITY & LOGO */}
            {activeTab === 'branding' && (
              <div className="profile-card">
                <div className="profile-card-header">
                  <div>
                    <h2 className="profile-card-title">
                      <Building2 size={18} style={{ color: '#0284c7' }} />
                      Step 1: Brand Identity & Logo
                    </h2>
                    <p className="profile-card-subtitle">
                      Upload your official company logo and configure brand naming.
                    </p>
                  </div>
                </div>

                {/* Logo Upload Box */}
                <div className="profile-logo-uploader" style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '320px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                      Active Logo Preview
                    </span>
                    <button
                      type="button"
                      onClick={() => setLogoBgDark(!logoBgDark)}
                      className="profile-btn profile-btn-secondary"
                      style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                      title="Toggle background color to test contrast"
                    >
                      {logoBgDark ? <Sun size={12} /> : <Moon size={12} />}
                      {logoBgDark ? 'Light BG' : 'Dark BG'}
                    </button>
                  </div>

                  <div className={`profile-logo-preview-card ${logoBgDark ? 'dark-mode' : ''}`}>
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Company Logo Preview"
                        className="profile-logo-img"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/uploads/branding/apex_infra_logo.jpg';
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No Logo Uploaded</span>
                    )}
                  </div>

                  <div className="profile-logo-controls">
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="logoFileInput"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      style={{ display: 'none' }}
                      onChange={handleLogoSelect}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="profile-upload-trigger-btn"
                    >
                      <Upload size={16} style={{ color: '#0284c7' }} />
                      <span>{logoFile ? 'Choose Different File' : 'Upload New Logo'}</span>
                    </button>
                    {logoFile && (
                      <div className="profile-logo-file-info">
                        <CheckCircle2 size={14} />
                        <span>Ready: {logoFile.name} ({(logoFile.size / 1024).toFixed(0)} KB)</span>
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Recommended: Transparent PNG, SVG, or high-res JPG (Max 5MB). Optimal resolution: 400×120px.
                  </span>
                </div>

                <div className="profile-form-grid">
                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      <span>Company Legal / Trade Name <span className="req-star">*</span></span>
                      <span className="label-tag">Header & Invoices</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.companyName || ''}
                      onChange={e => handleInputChange('companyName', e.target.value)}
                      placeholder="e.g. Apex Infra"
                      className="profile-form-input"
                    />
                    <span className="profile-form-hint">Used in headers, PDF quotations, login cards, and copyright.</span>
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      <span>Tagline / Slogan</span>
                      <span className="label-tag">Hero Banner</span>
                    </label>
                    <input
                      type="text"
                      value={formData.tagline || ''}
                      onChange={e => handleInputChange('tagline', e.target.value)}
                      placeholder="e.g. Real Estate & Infrastructure"
                      className="profile-form-input"
                    />
                    <span className="profile-form-hint">Subtitle displayed below the brand name and in meta descriptions.</span>
                  </div>

                  <div className="profile-form-group col-span-full">
                    <label className="profile-form-label">
                      <span>Website Copyright Notice</span>
                      <span className="label-tag">Footer</span>
                    </label>
                    <input
                      type="text"
                      value={formData.copyrightText || ''}
                      onChange={e => handleInputChange('copyrightText', e.target.value)}
                      placeholder="e.g. © 2026 Apex Infra. All rights reserved."
                      className="profile-form-input"
                    />
                  </div>

                  <div className="profile-form-group col-span-full">
                    <label className="profile-form-label">
                      <span>Company About / Mission Summary</span>
                      <span className="label-tag">About Us Page</span>
                    </label>
                    <textarea
                      rows={3}
                      value={formData.aboutSummary || ''}
                      onChange={e => handleInputChange('aboutSummary', e.target.value)}
                      placeholder="Brief 2-3 sentence overview of company operations, landmark projects, and customer commitment..."
                      className="profile-form-textarea"
                    />
                  </div>
                </div>

                <div className="profile-step-nav">
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Step 1 of 6</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('contact')}
                    className="profile-btn profile-btn-secondary"
                  >
                    <span>Next: Contacts & Hours</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: CONTACTS & OPERATING HOURS */}
            {activeTab === 'contact' && (
              <div className="profile-card">
                <div className="profile-card-header">
                  <div>
                    <h2 className="profile-card-title">
                      <Phone size={18} style={{ color: '#0284c7' }} />
                      Step 2: Contact Channels & Operating Hours
                    </h2>
                    <p className="profile-card-subtitle">
                      These numbers power the top header hotline, floating WhatsApp button, and enquiry reply emails.
                    </p>
                  </div>
                </div>

                <div className="profile-form-grid">
                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      <span>Primary Hotline / Mobile <span className="req-star">*</span></span>
                      <span className="label-tag">Header Hotline</span>
                    </label>
                    <input
                      type="text"
                      value={formData.phonePrimary || ''}
                      onChange={e => handleInputChange('phonePrimary', e.target.value)}
                      placeholder="e.g. +91 9000553832"
                      className="profile-form-input"
                    />
                    <span className="profile-form-hint">Displayed at the very top of the website and on contact buttons.</span>
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      <span>Secondary Phone / Office Landline</span>
                      <span className="label-tag">Support</span>
                    </label>
                    <input
                      type="text"
                      value={formData.phoneSecondary || ''}
                      onChange={e => handleInputChange('phoneSecondary', e.target.value)}
                      placeholder="e.g. +91 7893963322"
                      className="profile-form-input"
                    />
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      <span>WhatsApp Number (with Country Code)</span>
                      <span className="label-tag">Floating Chat</span>
                    </label>
                    <input
                      type="text"
                      value={formData.whatsapp || ''}
                      onChange={e => handleInputChange('whatsapp', e.target.value)}
                      placeholder="e.g. 919000553832"
                      className="profile-form-input"
                    />
                    <span className="profile-form-hint">Powers the sticky green floating WhatsApp button for direct leads.</span>
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      <span>Official Support Email</span>
                      <span className="label-tag">Enquiries</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={e => handleInputChange('email', e.target.value)}
                      placeholder="e.g. info@apexinfra.com"
                      className="profile-form-input"
                    />
                  </div>

                  <div className="profile-form-group col-span-full">
                    <label className="profile-form-label">
                      <span>Office Working Hours</span>
                      <span className="label-tag">Contact Page</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        value={formData.officeHours || ''}
                        onChange={e => handleInputChange('officeHours', e.target.value)}
                        placeholder="e.g. Mon - Sat: 9:00 AM - 7:00 PM (Sunday Closed)"
                        className="profile-form-input"
                        style={{ paddingLeft: '2.5rem' }}
                      />
                      <Clock size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
                    </div>
                  </div>
                </div>

                <div className="profile-step-nav">
                  <button
                    type="button"
                    onClick={() => setActiveTab('branding')}
                    className="profile-btn profile-btn-secondary"
                  >
                    <ChevronLeft size={16} />
                    <span>Previous: Brand & Logo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('address')}
                    className="profile-btn profile-btn-secondary"
                  >
                    <span>Next: Office & Location</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: OFFICE & LOCATION */}
            {activeTab === 'address' && (
              <div className="profile-card">
                <div className="profile-card-header">
                  <div>
                    <h2 className="profile-card-title">
                      <MapPin size={18} style={{ color: '#0284c7' }} />
                      Step 3: Registered Office & Location
                    </h2>
                    <p className="profile-card-subtitle">
                      Your physical corporate address printed on customer agreements, invoices, and the Contact Us page.
                    </p>
                  </div>
                </div>

                <div className="profile-form-grid">
                  <div className="profile-form-group col-span-full">
                    <label className="profile-form-label">
                      <span>Full Registered Office Street Address <span className="req-star">*</span></span>
                      <span className="label-tag">Invoices & Agreements</span>
                    </label>
                    <textarea
                      rows={2}
                      value={formData.address || ''}
                      onChange={e => handleInputChange('address', e.target.value)}
                      placeholder="e.g. Business Towers, 4th Floor, Tech Park Road, Visakhapatnam, Andhra Pradesh"
                      className="profile-form-textarea"
                    />
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      <span>City <span className="req-star">*</span></span>
                    </label>
                    <input
                      type="text"
                      value={formData.city || ''}
                      onChange={e => handleInputChange('city', e.target.value)}
                      placeholder="e.g. Visakhapatnam"
                      className="profile-form-input"
                    />
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      <span>State</span>
                    </label>
                    <input
                      type="text"
                      value={formData.state || ''}
                      onChange={e => handleInputChange('state', e.target.value)}
                      placeholder="e.g. Andhra Pradesh"
                      className="profile-form-input"
                    />
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      <span>Postal Pincode</span>
                    </label>
                    <input
                      type="text"
                      value={formData.pincode || ''}
                      onChange={e => handleInputChange('pincode', e.target.value)}
                      placeholder="e.g. 530001"
                      className="profile-form-input"
                    />
                  </div>

                  <div className="profile-form-group col-span-full">
                    <label className="profile-form-label">
                      <span>Google Maps Embed URL</span>
                      <span className="label-tag">Contact Page Map</span>
                    </label>
                    <input
                      type="text"
                      value={formData.googleMapEmbedUrl || ''}
                      onChange={e => handleInputChange('googleMapEmbedUrl', e.target.value)}
                      placeholder="https://www.google.com/maps/embed?pb=..."
                      className="profile-form-input"
                    />
                    <span className="profile-form-hint">
                      Paste the iframe embed `src` from Google Maps Share &gt; Embed Map to show an interactive map on the contact page.
                    </span>
                  </div>
                </div>

                <div className="profile-step-nav">
                  <button
                    type="button"
                    onClick={() => setActiveTab('contact')}
                    className="profile-btn profile-btn-secondary"
                  >
                    <ChevronLeft size={16} />
                    <span>Previous: Contacts</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('legal')}
                    className="profile-btn profile-btn-secondary"
                  >
                    <span>Next: RERA & Legal</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: RERA & LEGAL COMPLIANCE */}
            {activeTab === 'legal' && (
              <div className="profile-card">
                <div className="profile-card-header">
                  <div>
                    <h2 className="profile-card-title">
                      <ShieldCheck size={18} style={{ color: '#0284c7' }} />
                      Step 4: Government RERA, ISO & Tax Compliance
                    </h2>
                    <p className="profile-card-subtitle">
                      Trust badges and statutory registration numbers displayed on the top header, project brochures, and booking forms.
                    </p>
                  </div>
                </div>

                <div className="profile-form-grid">
                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      <span>ISO Quality Certification Badge</span>
                      <span className="label-tag">Header Topbar</span>
                    </label>
                    <input
                      type="text"
                      value={formData.isoCertification || ''}
                      onChange={e => handleInputChange('isoCertification', e.target.value)}
                      placeholder="e.g. ISO 9001:2015 Certified Company"
                      className="profile-form-input"
                    />
                    <span className="profile-form-hint">Shown in the top black utility bar to reinforce trust with buyers.</span>
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      <span>GSTIN / Tax Identification Number</span>
                      <span className="label-tag">Tax Invoices</span>
                    </label>
                    <input
                      type="text"
                      value={formData.gstNumber || ''}
                      onChange={e => handleInputChange('gstNumber', e.target.value)}
                      placeholder="e.g. 37ABCDE1234F1Z5"
                      className="profile-form-input"
                    />
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      <span>Primary State RERA Number</span>
                      <span className="label-tag">Government ID</span>
                    </label>
                    <input
                      type="text"
                      value={formData.rera1 || ''}
                      onChange={e => handleInputChange('rera1', e.target.value)}
                      placeholder="e.g. AP RERA: P0123456789"
                      className="profile-form-input"
                    />
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      <span>Secondary State RERA Number</span>
                      <span className="label-tag">Optional</span>
                    </label>
                    <input
                      type="text"
                      value={formData.rera2 || ''}
                      onChange={e => handleInputChange('rera2', e.target.value)}
                      placeholder="e.g. TS RERA: P0987654321"
                      className="profile-form-input"
                    />
                  </div>
                </div>

                <div className="profile-step-nav">
                  <button
                    type="button"
                    onClick={() => setActiveTab('address')}
                    className="profile-btn profile-btn-secondary"
                  >
                    <ChevronLeft size={16} />
                    <span>Previous: Office Address</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('banking')}
                    className="profile-btn profile-btn-secondary"
                  >
                    <span>Next: Banking Details</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: BANKING, INVOICING & ACCOUNT HOLDER SIGNATURE */}
            {activeTab === 'banking' && (
              <div className="profile-card">
                <div className="profile-card-header">
                  <div>
                    <h2 className="profile-card-title">
                      <Landmark size={18} style={{ color: '#0284c7' }} />
                      Step 5: Corporate Banking, Invoicing &amp; Account Holder Signature
                    </h2>
                    <p className="profile-card-subtitle">
                      Bank account coordinates and authorized signatory stamp/signature automatically printed on generated PDF quotations, booking receipts, and payment links.
                    </p>
                  </div>
                </div>

                <div className="profile-form-grid">
                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      <span>Bank Name</span>
                      <span className="label-tag">Quotations</span>
                    </label>
                    <input
                      type="text"
                      value={formData.bankName || ''}
                      onChange={e => handleInputChange('bankName', e.target.value)}
                      placeholder="e.g. State Bank of India"
                      className="profile-form-input"
                    />
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      <span>Account Holder / Beneficiary Name</span>
                    </label>
                    <input
                      type="text"
                      value={formData.bankAccountName || ''}
                      onChange={e => handleInputChange('bankAccountName', e.target.value)}
                      placeholder="e.g. Apex Infra Private Limited"
                      className="profile-form-input"
                    />
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      <span>Bank Account Number</span>
                    </label>
                    <input
                      type="text"
                      value={formData.bankAccountNumber || ''}
                      onChange={e => handleInputChange('bankAccountNumber', e.target.value)}
                      placeholder="e.g. 45116449587"
                      className="profile-form-input"
                    />
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      <span>Bank IFSC Code</span>
                    </label>
                    <input
                      type="text"
                      value={formData.bankIfsc || ''}
                      onChange={e => handleInputChange('bankIfsc', e.target.value)}
                      placeholder="e.g. SBIN0006832"
                      className="profile-form-input"
                    />
                  </div>

                  <div className="profile-form-group col-span-full">
                    <label className="profile-form-label">
                      <span>UPI ID / Virtual Payment Address (VPA)</span>
                      <span className="label-tag">Instant QR Pay</span>
                    </label>
                    <input
                      type="text"
                      value={formData.upiId || ''}
                      onChange={e => handleInputChange('upiId', e.target.value)}
                      placeholder="e.g. apexinfra@sbi or payments@upi"
                      className="profile-form-input"
                    />
                    <span className="profile-form-hint">Used for generating direct payment collection QR codes.</span>
                  </div>

                  {/* AUTHORIZED SIGNATORY DETAILS */}
                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      <span>Authorized Signatory Name</span>
                      <span className="label-tag">Under Signature</span>
                    </label>
                    <input
                      type="text"
                      value={formData.authorizedSignatoryName || ''}
                      onChange={e => handleInputChange('authorizedSignatoryName', e.target.value)}
                      placeholder="e.g. Dhora / Managing Director"
                      className="profile-form-input"
                    />
                    <span className="profile-form-hint">Name of account holder or authorized company officer.</span>
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      <span>Signatory Designation / Title</span>
                      <span className="label-tag">Designation</span>
                    </label>
                    <input
                      type="text"
                      value={formData.authorizedSignatoryDesignation || ''}
                      onChange={e => handleInputChange('authorizedSignatoryDesignation', e.target.value)}
                      placeholder="e.g. Managing Director / Authorized Signatory"
                      className="profile-form-input"
                    />
                    <span className="profile-form-hint">Designation printed beneath the signature on customer invoices.</span>
                  </div>

                  {/* ACCOUNT HOLDER SIGNATURE UPLOAD BOX */}
                  <div className="profile-form-group col-span-full">
                    <label className="profile-form-label">
                      <span>Account Holder Signature &amp; Official Seal</span>
                      <span className="label-tag">Invoices &amp; Quotations</span>
                    </label>

                    <div className="profile-signature-box">
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                        Active Signature / Stamp Preview
                      </span>

                      <div className="profile-signature-preview">
                        {signaturePreview ? (
                          <img
                            src={signaturePreview}
                            alt="Account Holder Signature"
                            className="profile-signature-img"
                          />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.8rem' }}>
                            <FileSignature size={18} />
                            <span>No signature uploaded yet</span>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <input
                          ref={signatureInputRef}
                          type="file"
                          id="signatureFileInput"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          style={{ display: 'none' }}
                          onChange={handleSignatureSelect}
                        />
                        <button
                          type="button"
                          onClick={() => signatureInputRef.current?.click()}
                          className="profile-upload-trigger-btn"
                        >
                          <Upload size={16} style={{ color: '#0284c7' }} />
                          <span>{signaturePreview ? 'Replace Signature / Stamp' : 'Upload Signature Image'}</span>
                        </button>

                        {signatureFile && (
                          <div className="profile-logo-file-info">
                            <CheckCircle2 size={14} />
                            <span>Selected: {signatureFile.name}</span>
                          </div>
                        )}
                      </div>

                      <span style={{ fontSize: '0.725rem', color: '#64748b' }}>
                        Recommended: Transparent PNG or crisp high-contrast scan of signature/stamp. Dimensions: 300×100px.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="profile-step-nav">
                  <button
                    type="button"
                    onClick={() => setActiveTab('legal')}
                    className="profile-btn profile-btn-secondary"
                  >
                    <ChevronLeft size={16} />
                    <span>Previous: RERA & Legal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('social')}
                    className="profile-btn profile-btn-secondary"
                  >
                    <span>Next: Social Media</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 6: SOCIAL MEDIA PROFILES */}
            {activeTab === 'social' && (
              <div className="profile-card">
                <div className="profile-card-header">
                  <div>
                    <h2 className="profile-card-title">
                      <Share2 size={18} style={{ color: '#0284c7' }} />
                      Step 6: Official Social Media Profiles
                    </h2>
                    <p className="profile-card-subtitle">
                      Direct channel links rendered in the website footer, top utilities, and digital property brochures.
                    </p>
                  </div>
                </div>

                <div className="profile-form-grid">
                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      <span>Facebook Page URL</span>
                    </label>
                    <input
                      type="url"
                      value={formData.facebookUrl || ''}
                      onChange={e => handleInputChange('facebookUrl', e.target.value)}
                      placeholder="https://facebook.com/apexinfra"
                      className="profile-form-input"
                    />
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      <span>Instagram Profile URL</span>
                    </label>
                    <input
                      type="url"
                      value={formData.instagramUrl || ''}
                      onChange={e => handleInputChange('instagramUrl', e.target.value)}
                      placeholder="https://instagram.com/apexinfra"
                      className="profile-form-input"
                    />
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      <span>LinkedIn Company Page</span>
                    </label>
                    <input
                      type="url"
                      value={formData.linkedinUrl || ''}
                      onChange={e => handleInputChange('linkedinUrl', e.target.value)}
                      placeholder="https://linkedin.com/company/apexinfra"
                      className="profile-form-input"
                    />
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      <span>YouTube Channel URL</span>
                    </label>
                    <input
                      type="url"
                      value={formData.youtubeUrl || ''}
                      onChange={e => handleInputChange('youtubeUrl', e.target.value)}
                      placeholder="https://youtube.com/@apexinfra"
                      className="profile-form-input"
                    />
                  </div>

                  <div className="profile-form-group col-span-full">
                    <label className="profile-form-label">
                      <span>Twitter / X Profile URL</span>
                    </label>
                    <input
                      type="url"
                      value={formData.twitterUrl || ''}
                      onChange={e => handleInputChange('twitterUrl', e.target.value)}
                      placeholder="https://x.com/apexinfra"
                      className="profile-form-input"
                    />
                  </div>
                </div>

                <div className="profile-step-nav">
                  <button
                    type="button"
                    onClick={() => setActiveTab('banking')}
                    className="profile-btn profile-btn-secondary"
                  >
                    <ChevronLeft size={16} />
                    <span>Previous: Banking &amp; Signature</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className="profile-btn profile-btn-secondary"
                  >
                    <span>View Live Full Preview</span>
                    <Eye size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 7: FULL EXPANDED LIVE PREVIEW (Also visible on Mobile/Tablet) */}
            {activeTab === 'preview' && (
              <div className="profile-card">
                <div className="profile-card-header">
                  <div>
                    <h2 className="profile-card-title">
                      <Eye size={18} style={{ color: '#0284c7' }} />
                      Step 7: Full Real-Time Brand Simulation
                    </h2>
                    <p className="profile-card-subtitle">
                      Verify how your new branding appears across headers, invoices, and login screens before client delivery.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Website Header Simulation */}
                  <div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
                      1. Website Header &amp; Top Utility Bar
                    </h4>
                    <div className="sim-header-mockup">
                      <div className="sim-topbar">
                        <div className="sim-topbar-left">
                          <span>📞 {formData.phonePrimary || '+91 9000553832'}</span>
                          <span>✉️ {formData.email || 'info@apexinfra.com'}</span>
                        </div>
                        <div className="sim-topbar-right">
                          {formData.isoCertification && <span>{formData.isoCertification}</span>}
                          {formData.rera1 && <span className="sim-rera-badge">{formData.rera1}</span>}
                        </div>
                      </div>
                      <div className="sim-navbar">
                        <img
                          src={logoPreview || '/uploads/branding/apex_infra_logo.jpg'}
                          alt="Brand"
                          className="sim-nav-logo"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '/uploads/branding/apex_infra_logo.jpg';
                          }}
                        />
                        <div className="sim-nav-actions">
                          <span className="sim-pill sim-pill-whatsapp">WhatsApp</span>
                          <span className="sim-pill sim-pill-cta">Schedule Visit</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PDF Letterhead Simulation with Signature */}
                  <div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
                      2. Customer Quotation &amp; Invoice Letterhead (with Account Details &amp; Signature)
                    </h4>
                    <div className="sim-invoice-box">
                      <div className="sim-invoice-header">
                        <div>
                          <img
                            src={logoPreview || '/uploads/branding/apex_infra_logo.jpg'}
                            alt="Invoice Logo"
                            style={{ maxHeight: '35px', maxWidth: '140px', objectFit: 'contain' }}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/uploads/branding/apex_infra_logo.jpg';
                            }}
                          />
                          <p style={{ fontSize: '10px', color: '#64748b', margin: '2px 0 0 0' }}>{formData.tagline}</p>
                        </div>
                        <div className="sim-invoice-info" style={{ textAlign: 'right' }}>
                          <strong style={{ fontSize: '11px', color: '#0f172a' }}>{formData.companyName}</strong>
                          <p style={{ margin: 0 }}>{formData.address || 'Business Towers, Tech Park Road'}</p>
                          <p style={{ margin: 0 }}>{formData.city}, {formData.state} - {formData.pincode}</p>
                          {formData.gstNumber && <p style={{ margin: 0, fontWeight: 600 }}>GSTIN: {formData.gstNumber}</p>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#475569', background: '#f8fafc', padding: '6px 10px', borderRadius: '4px', flexWrap: 'wrap', gap: '4px' }}>
                        <span>Bank: <strong>{formData.bankName || 'State Bank of India'}</strong></span>
                        <span>A/C: <strong>{formData.bankAccountNumber || '45116449587'}</strong></span>
                        <span>IFSC: <strong>{formData.bankIfsc || 'SBIN0006832'}</strong></span>
                        <span>UPI: <strong>{formData.upiId || 'payments@upi'}</strong></span>
                      </div>

                      {/* Authorized Signatory Line in Invoice */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                        <div style={{ textAlign: 'center', minWidth: '130px' }}>
                          {signaturePreview ? (
                            <img
                              src={signaturePreview}
                              alt="Authorized Signature"
                              style={{ maxHeight: '42px', maxWidth: '120px', objectFit: 'contain', margin: '0 auto 2px auto', display: 'block' }}
                            />
                          ) : (
                            <div style={{ height: '35px', borderBottom: '1px dashed #cbd5e1', marginBottom: '4px' }} />
                          )}
                          <div style={{ fontSize: '10px', fontWeight: 700, color: '#0f172a', borderTop: signaturePreview ? 'none' : '1px solid #cbd5e1', paddingTop: '2px' }}>
                            {formData.authorizedSignatoryName || formData.bankAccountName || 'Authorized Signatory'}
                          </div>
                          <div style={{ fontSize: '8.5px', color: '#64748b' }}>
                            {formData.authorizedSignatoryDesignation || 'Managing Director'}
                          </div>
                          <div style={{ fontSize: '8px', color: '#94a3b8' }}>
                            For {formData.companyName || 'Apex Infra'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Admin Login Screen Simulation */}
                  <div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
                      3. Administrative Login Portal
                    </h4>
                    <div className="sim-login-box">
                      <img
                        src={logoPreview || '/uploads/branding/apex_infra_logo.jpg'}
                        alt="Login Brand"
                        className="sim-login-logo"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/uploads/branding/apex_infra_logo.jpg';
                        }}
                      />
                      <div className="sim-login-title">Sign in to {formData.companyName} Portal</div>
                      <div className="sim-login-field">admin@company.com</div>
                      <div className="sim-login-field">••••••••••••</div>
                      <div className="sim-login-btn">Secure Login</div>
                      <div className="sim-login-footer">
                        {formData.copyrightText || `© 2026 ${formData.companyName}. All rights reserved.`}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="profile-step-nav">
                  <button
                    type="button"
                    onClick={() => setActiveTab('social')}
                    className="profile-btn profile-btn-secondary"
                  >
                    <ChevronLeft size={16} />
                    <span>Previous: Social Profiles</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave()}
                    disabled={saving}
                    className="profile-btn profile-btn-primary"
                  >
                    {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                    <span>Apply &amp; Save All Changes</span>
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Sticky Live Preview Box (Visible on Laptops & Desktops) */}
        <div className="profile-preview-column">
          {/* Real-time Website Header Card */}
          <div className="preview-card">
            <div className="preview-card-title">
              <Eye size={14} style={{ color: '#0284c7' }} />
              <span>Real-Time Website Header</span>
            </div>

            <div className="sim-header-mockup">
              <div className="sim-topbar">
                <div className="sim-topbar-left">
                  <span>📞 {formData.phonePrimary || '9000553832'}</span>
                  <span>✉️ {formData.email || 'info@apexinfra.com'}</span>
                </div>
                <div className="sim-topbar-right">
                  {formData.rera1 && <span className="sim-rera-badge">{formData.rera1.split(':')[0] || 'RERA'}</span>}
                </div>
              </div>

              <div className="sim-navbar">
                <img
                  src={logoPreview || '/uploads/branding/apex_infra_logo.jpg'}
                  alt="Live Header Logo"
                  className="sim-nav-logo"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/uploads/branding/apex_infra_logo.jpg';
                  }}
                />
                <div className="sim-nav-actions">
                  <span className="sim-pill sim-pill-whatsapp">WhatsApp</span>
                  <span className="sim-pill sim-pill-cta">Enquire</span>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Invoice & Signature Stamp Card */}
          <div className="preview-card">
            <div className="preview-card-title">
              <Landmark size={14} style={{ color: '#0284c7' }} />
              <span>Invoice Bank &amp; Signature</span>
            </div>

            <div className="sim-invoice-box">
              <div style={{ fontSize: '9px', color: '#475569', marginBottom: '6px' }}>
                Bank: <strong>{formData.bankName || 'State Bank of India'}</strong><br />
                A/C: <strong>{formData.bankAccountNumber || '45116449587'}</strong> | IFSC: <strong>{formData.bankIfsc || 'SBIN0006832'}</strong>
              </div>
              <div style={{ textAlign: 'right', borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
                {signaturePreview ? (
                  <img
                    src={signaturePreview}
                    alt="Stamp Preview"
                    style={{ maxHeight: '35px', maxWidth: '100px', objectFit: 'contain', display: 'inline-block' }}
                  />
                ) : (
                  <span style={{ fontSize: '8px', color: '#94a3b8', fontStyle: 'italic' }}>Signature stamp placeholder</span>
                )}
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#0f172a' }}>
                  {formData.authorizedSignatoryName || 'Authorized Signatory'}
                </div>
                <div style={{ fontSize: '7.5px', color: '#64748b' }}>
                  {formData.authorizedSignatoryDesignation || 'Managing Director'}
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Admin Login Card */}
          <div className="preview-card">
            <div className="preview-card-title">
              <Eye size={14} style={{ color: '#0284c7' }} />
              <span>Real-Time Login Screen</span>
            </div>

            <div className="sim-login-box">
              <img
                src={logoPreview || '/uploads/branding/apex_infra_logo.jpg'}
                alt="Live Login Logo"
                className="sim-login-logo"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/uploads/branding/apex_infra_logo.jpg';
                }}
              />
              <div className="sim-login-title">
                Portal: {formData.companyName || 'Apex Infra'}
              </div>
              <div className="sim-login-field">admin@domain.com</div>
              <div className="sim-login-field">••••••••••</div>
              <div className="sim-login-btn">Log In</div>
              <div className="sim-login-footer">
                {formData.copyrightText || `© 2026 ${formData.companyName || 'Company'}`}
              </div>
            </div>
          </div>

          {/* Turnkey Reseller Selling Checklist */}
          <div className="reseller-tip-card">
            <div className="reseller-tip-title">
              <Info size={16} />
              <span>Turnkey Client Handover Checklist</span>
            </div>
            <ul className="reseller-tip-list">
              <li><strong>Upload Logo</strong>: Replaces logo on public site, admin panel, and PDFs.</li>
              <li><strong>Phone &amp; WhatsApp</strong>: Sets up click-to-call and quick lead generation.</li>
              <li><strong>RERA &amp; ISO</strong>: Injects state compliance badges automatically.</li>
              <li><strong>Bank &amp; Signature</strong>: Auto-populates payment coordinates &amp; stamp on invoices.</li>
              <li><strong>100% White-Label</strong>: Ready to sell and hand over to any developer or buyer.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Floating Save Action Bar for Mobile Phones */}
      <div className="mobile-sticky-save-bar">
        <button
          type="button"
          onClick={handleReset}
          disabled={saving}
          className="profile-btn profile-btn-secondary"
          style={{ flex: '0 0 auto', padding: '0.65rem 0.9rem' }}
          title="Reset"
        >
          <RefreshCw size={15} />
        </button>
        <button
          type="button"
          onClick={() => handleSave()}
          disabled={saving}
          className="profile-btn profile-btn-primary"
        >
          {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
          <span>{saving ? 'Saving...' : 'Save & Apply Everywhere'}</span>
        </button>
      </div>
    </div>
  );
};
