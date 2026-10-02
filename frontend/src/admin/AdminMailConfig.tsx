import React, { useState, useEffect } from 'react';
import logoImg from '../assets/logo.png';
import { getMailConfig, updateMailConfig, sendTestEmail } from '../utils/db';
import { useCompany } from '../context/CompanyContext';
import { 
  Save, 
  Send, 
  Server, 
  Sliders, 
  FileText, 
  Eye, 
  EyeOff, 
  AlertTriangle,
  Mail,
  Loader2,
  CheckCircle,
  HelpCircle,
  Edit2,
  ExternalLink
} from 'lucide-react';

const FacebookIcon = ({ size = 18, ...props }: { size?: number; [key: string]: any }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const InstagramIcon = ({ size = 18, ...props }: { size?: number; [key: string]: any }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

interface AdminMailConfigProps {
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminMailConfig: React.FC<AdminMailConfigProps> = ({
  onAddToast
}) => {
  const { profile } = useCompany();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [deliveryMode, setDeliveryMode] = useState<'smtp' | 'simulation'>('simulation');
  const [triggerWindowDays, setTriggerWindowDays] = useState(5);
  const [sendBeforeDays, setSendBeforeDays] = useState(1);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(2525);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [summaryEmail, setSummaryEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailTemplate, setEmailTemplate] = useState('');

  // Test Email Modal
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);

  // Live social media credentials states
  const [fbPageIdDb, setFbPageIdDb] = useState('');
  const [fbAccessTokenDb, setFbAccessTokenDb] = useState('');
  const [igAccountIdDb, setIgAccountIdDb] = useState('');
  const [showFbToken, setShowFbToken] = useState(false);

  // Social Media Channels states
  const [facebookPageUrl, setFacebookPageUrl] = useState<string>(() => {
    return localStorage.getItem('social_fb_url') || profile.facebookUrl || 'https://www.facebook.com';
  });
  const [instagramPageUrl, setInstagramPageUrl] = useState<string>(() => {
    return localStorage.getItem('social_ig_url') || profile.instagramUrl || 'https://www.instagram.com';
  });

  const [isEditingFb, setIsEditingFb] = useState(false);
  const [fbInputVal, setFbInputVal] = useState(facebookPageUrl);

  const [isEditingIg, setIsEditingIg] = useState(false);
  const [igInputVal, setIgInputVal] = useState(instagramPageUrl);

  const saveFbUrl = () => {
    localStorage.setItem('social_fb_url', fbInputVal);
    setFacebookPageUrl(fbInputVal);
    setIsEditingFb(false);
    onAddToast('Facebook page URL updated successfully.', 'success');
  };

  const saveIgUrl = () => {
    localStorage.setItem('social_ig_url', igInputVal);
    setInstagramPageUrl(igInputVal);
    setIsEditingIg(false);
    onAddToast('Instagram profile URL updated successfully.', 'success');
  };

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await getMailConfig();
      setDeliveryMode(data.deliveryMode);
      setTriggerWindowDays(data.triggerWindowDays);
      setSendBeforeDays(data.sendBeforeDays);
      setSmtpHost(data.smtpHost || '');
      setSmtpPort(data.smtpPort || 2525);
      setSmtpUser(data.smtpUser || '');
      setSmtpPass(data.smtpPass || '');
      setSenderEmail(data.senderEmail || '');
      setSummaryEmail(data.summaryEmail || profile.email || 'info@company.com');
      setEmailSubject(data.emailSubject || '');
      setEmailTemplate(data.emailTemplate || '');
      setFbPageIdDb(data.facebookPageId || '6159154908963');
      setFbAccessTokenDb(data.facebookPageAccessToken || '');
      setIgAccountIdDb(data.instagramAccountId || '');
    } catch (err) {
      onAddToast("Failed to load mail configuration.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const updateData = {
      deliveryMode,
      triggerWindowDays: Number(triggerWindowDays),
      sendBeforeDays: Number(sendBeforeDays),
      smtpHost,
      smtpPort: Number(smtpPort),
      smtpUser,
      smtpPass,
      senderEmail,
      summaryEmail,
      emailSubject,
      emailTemplate,
      facebookPageId: fbPageIdDb,
      facebookPageAccessToken: fbAccessTokenDb,
      instagramAccountId: igAccountIdDb
    };

    try {
      await updateMailConfig(updateData);
      onAddToast("Configurations saved successfully.", "success");
      loadConfig();
    } catch (err: any) {
      onAddToast(err.message || "Failed to save configuration.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailAddress.trim()) {
      onAddToast("Please enter an email address.", "error");
      return;
    }

    setTestingConnection(true);
    try {
      await sendTestEmail(testEmailAddress);
      onAddToast(`Test email request sent to ${testEmailAddress}.`, "success");
      setShowTestModal(false);
      setTestEmailAddress('');
    } catch (err: any) {
      onAddToast(err.message || "SMTP connection test failed.", "error");
    } finally {
      setTestingConnection(false);
    }
  };

  const compileTemplatePreview = (templateStr: string) => {
    const fakeVars = {
      customerName: "Jane Doe",
      projectName: "JK Emerald Heights",
      visitDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
      visitTime: "14:30",
      assignedAgent: "G. Anand (Phone: 7654321098)",
      assignedAgentPhone: "7654321098",
      location: "Gunadala, Vijayawada, Andhra Pradesh"
    };

    let result = templateStr;
    for (const key in fakeVars) {
      result = result.replace(new RegExp(`{${key}}`, 'g'), (fakeVars as any)[key]);
    }
    return result;
  };

  const compiledSubjectPreview = compileTemplatePreview(emailSubject);
  const compiledBodyPreview = compileTemplatePreview(emailTemplate);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1rem' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--sap-fiori-blue)' }} />
        <span style={{ fontSize: '0.9rem', color: '#666' }}>Fetching server configurations...</span>
      </div>
    );
  }

  return (
    <div className="admin-mail-config-view">
      <form onSubmit={handleSave}>
        {/* Screen Header Toolbar */}
        <div className="mail-config-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--sap-fiori-blue)', margin: 0 }}>System Settings & Configurations</h2>
            <p style={{ fontSize: '0.8rem', color: '#666', margin: '2px 0 0' }}>Configure connected social media redirection channels, automated reminders, and SMTP mail servers.</p>
          </div>
          <div className="mail-config-actions" style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              type="button" 
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
              onClick={() => setShowTestModal(true)}
            >
              <Send size={14} /> Send Test Email
            </button>
            <button 
              type="submit" 
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', padding: '0.5rem 1rem', backgroundColor: 'var(--sap-fiori-blue)', borderColor: 'var(--sap-fiori-blue)', color: 'white' }}
              disabled={saving}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* Delivery Mode Banner Alert */}
        <div style={{
          backgroundColor: deliveryMode === 'simulation' ? '#fef3c7' : '#dcfce7',
          border: `1px solid ${deliveryMode === 'simulation' ? '#f59e0b' : '#10b981'}`,
          borderRadius: '6px',
          padding: '0.85rem 1rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.85rem',
          color: deliveryMode === 'simulation' ? '#92400e' : '#166534'
        }}>
          {deliveryMode === 'simulation' ? (
            <>
              <AlertTriangle size={18} style={{ color: '#d97706' }} />
              <div>
                <strong>Simulation Mode is active.</strong> Reminder emails will NOT be actually sent to customer inboxes. Instead, they will be beautifully rendered and logged in the database and server console. Toggle to **Real SMTP Delivery** once credentials are setup.
              </div>
            </>
          ) : (
            <>
              <CheckCircle size={18} style={{ color: '#059669' }} />
              <div>
                <strong>Real SMTP Delivery is active.</strong> Reminders will be sent to customers' real inbox addresses through your configured SMTP server. Ensure credentials are valid.
              </div>
            </>
          )}
        </div>


        <div className="mail-config-layout" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
          {/* Forms Column: 65% width */}
          <div style={{ flex: '1 1 65%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Box 0: Connected Social Channels */}
            <div className="admin-card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#1e293b' }}>
                Connected Social Channels
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Facebook Connection */}
                <div className="social-channel-row" style={{ display: 'flex', alignItems: 'center', padding: '0.6rem 0.85rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', gap: '10px' }}>
                  <FacebookIcon size={18} style={{ color: '#1877f2', flexShrink: 0 }} />
                  <div className="social-channel-inner" style={{ flex: 1, minWidth: 0 }}>
                    {isEditingFb ? (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                        <input 
                          type="text" 
                          value={fbInputVal} 
                          onChange={e => setFbInputVal(e.target.value)} 
                          style={{ fontSize: '0.75rem', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', flex: 1, minWidth: 0 }}
                          placeholder="Facebook page link..."
                        />
                        <button type="button" onClick={saveFbUrl} style={{ padding: '4px 8px', fontSize: '0.7rem', fontWeight: 600, backgroundColor: '#0f5132', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>Save</button>
                        <button type="button" onClick={() => { setIsEditingFb(false); setFbInputVal(facebookPageUrl); }} style={{ padding: '4px 8px', fontSize: '0.7rem', fontWeight: 600, backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>Cancel</button>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <a 
                            href={facebookPageUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            style={{ fontWeight: 700, fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#0854a0', textDecoration: 'none' }}
                            onMouseOver={e => e.currentTarget.style.textDecoration = 'underline'}
                            onMouseOut={e => e.currentTarget.style.textDecoration = 'none'}
                          >
                            {profile.companyName || 'Facebook'} Page <ExternalLink size={11} style={{ color: '#64748b' }} />
                          </a>
                          <button 
                            type="button"
                            onClick={() => setIsEditingFb(true)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#64748b', display: 'inline-flex', alignItems: 'center' }}
                            title="Edit Link"
                          >
                            <Edit2 size={11} />
                          </button>
                        </div>
                        <a href={facebookPageUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.7rem', color: '#64748b', textDecoration: 'none', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                          {facebookPageUrl}
                        </a>
                      </>
                    )}
                  </div>
                </div>

                {/* Instagram Connection */}
                <div className="social-channel-row" style={{ display: 'flex', alignItems: 'center', padding: '0.6rem 0.85rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', gap: '10px' }}>
                  <InstagramIcon size={18} style={{ color: '#e1306c', flexShrink: 0 }} />
                  <div className="social-channel-inner" style={{ flex: 1, minWidth: 0 }}>
                    {isEditingIg ? (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                        <input 
                          type="text" 
                          value={igInputVal} 
                          onChange={e => setIgInputVal(e.target.value)} 
                          style={{ fontSize: '0.75rem', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', flex: 1, minWidth: 0 }}
                          placeholder="Instagram profile link..."
                        />
                        <button type="button" onClick={saveIgUrl} style={{ padding: '4px 8px', fontSize: '0.7rem', fontWeight: 600, backgroundColor: '#0f5132', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>Save</button>
                        <button type="button" onClick={() => { setIsEditingIg(false); setIgInputVal(instagramPageUrl); }} style={{ padding: '4px 8px', fontSize: '0.7rem', fontWeight: 600, backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>Cancel</button>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <a 
                            href={instagramPageUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            style={{ fontWeight: 700, fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#0854a0', textDecoration: 'none' }}
                            onMouseOver={e => e.currentTarget.style.textDecoration = 'underline'}
                            onMouseOut={e => e.currentTarget.style.textDecoration = 'none'}
                          >
                            jk_future_infra Profile <ExternalLink size={11} style={{ color: '#64748b' }} />
                          </a>
                          <button 
                            type="button"
                            onClick={() => setIsEditingIg(true)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#64748b', display: 'inline-flex', alignItems: 'center' }}
                            title="Edit Link"
                          >
                            <Edit2 size={11} />
                          </button>
                        </div>
                        <a href={instagramPageUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.7rem', color: '#64748b', textDecoration: 'none', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                          {instagramPageUrl}
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Live Posting API Credentials Section */}
              <div style={{
                marginTop: '1.25rem',
                borderTop: '1px solid #f1f5f9',
                paddingTop: '1.25rem'
              }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Live API Credentials (Facebook Graph API)
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div className="grid grid-2 gap-2 mobile-stack" style={{ marginBottom: 0 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600 }}>Facebook Page ID</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={fbPageIdDb}
                        onChange={e => setFbPageIdDb(e.target.value)}
                        placeholder="e.g. 6159154908963"
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600 }}>Instagram Account ID (Optional)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={igAccountIdDb}
                        onChange={e => setIgAccountIdDb(e.target.value)}
                        placeholder="e.g. 17841400..."
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
                    <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600 }}>Facebook Page Access Token</label>
                    <input 
                      type={showFbToken ? "text" : "password"} 
                      className="form-control" 
                      value={fbAccessTokenDb}
                      onChange={e => setFbAccessTokenDb(e.target.value)}
                      placeholder="Enter Permanent Page Access Token (EAAZB...)"
                      style={{ paddingRight: '40px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowFbToken(!showFbToken)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '32px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748b',
                        padding: 0
                      }}
                    >
                      {showFbToken ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Box 1: Reminder Trigger Rules */}
            <div className="admin-card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#1e293b' }}>
                <Sliders size={16} /> Automated Reminder Schedule Rules
              </h3>

              <div className="grid grid-2 gap-2 mobile-stack">
                <div className="form-group">
                  <label className="form-label">
                    Tracking Range Window (Days)
                    <span className="tooltip-anchor" title="Reminder checks are limited to visits scheduled within this number of days in the future. Check logic ignores further bookings."> <HelpCircle size={12} style={{ color: '#94a3b8', verticalAlign: 'middle', cursor: 'help' }} /></span>
                  </label>
                  <input 
                    type="number" 
                    className="form-control"
                    value={triggerWindowDays}
                    onChange={e => setTriggerWindowDays(Number(e.target.value))}
                    min={1}
                    max={30}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Send Reminder Lead-Time (Days Before)
                    <span className="tooltip-anchor" title="System delivers email reminder exactly this many days before the visit date. e.g. 1 day before."> <HelpCircle size={12} style={{ color: '#94a3b8', verticalAlign: 'middle', cursor: 'help' }} /></span>
                  </label>
                  <input 
                    type="number" 
                    className="form-control"
                    value={sendBeforeDays}
                    onChange={e => setSendBeforeDays(Number(e.target.value))}
                    min={1}
                    max={10}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Box 2: Mail Delivery Method */}
            <div className="admin-card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#1e293b' }}>
                <Server size={16} /> Mail Delivery Server (SMTP)
              </h3>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Delivery Mode</label>
                <div className="mail-config-delivery-row" style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 'normal' }}>
                    <input 
                      type="radio" 
                      name="deliveryMode" 
                      value="simulation"
                      checked={deliveryMode === 'simulation'}
                      onChange={() => setDeliveryMode('simulation')}
                    />
                    Simulation (Logs & Mocks only)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 'normal' }}>
                    <input 
                      type="radio" 
                      name="deliveryMode" 
                      value="smtp"
                      checked={deliveryMode === 'smtp'}
                      onChange={() => setDeliveryMode('smtp')}
                    />
                    Real SMTP (Deliver real emails)
                  </label>
                </div>
              </div>

              {/* Row 1: SMTP Host – full width */}
              <div className="form-group">
                <label className="form-label">SMTP Host</label>
                <input 
                  type="text" 
                  className="form-control"
                  value={smtpHost}
                  onChange={e => setSmtpHost(e.target.value)}
                  placeholder="e.g. autodiscover.secureserver.net"
                  required={deliveryMode === 'smtp'}
                />
              </div>

              {/* Row 2: Port + Sender Email */}
              <div className="grid grid-2 gap-2 mobile-stack" style={{ marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">SMTP Port</label>
                  <input 
                    type="number" 
                    className="form-control"
                    value={smtpPort}
                    onChange={e => setSmtpPort(Number(e.target.value))}
                    placeholder="e.g. 443 or 587"
                    required={deliveryMode === 'smtp'}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Sender From Email</label>
                  <input 
                    type="email" 
                    className="form-control"
                    value={senderEmail}
                    onChange={e => setSenderEmail(e.target.value)}
                    placeholder="e.g. info@sevendorsolutions.com"
                    required={deliveryMode === 'smtp'}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Daily Summary Recipient Email</label>
                <input 
                  type="email" 
                  className="form-control"
                  value={summaryEmail}
                  onChange={e => setSummaryEmail(e.target.value)}
                  placeholder={profile.email ? `e.g. ${profile.email}` : "e.g. info@company.com"}
                  required
                />
              </div>

              <div className="grid grid-2 gap-2 mobile-stack">
                <div className="form-group">
                  <label className="form-label">SMTP Username</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={smtpUser}
                    onChange={e => setSmtpUser(e.target.value)}
                    placeholder="SMTP login username"
                  />
                </div>
                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label">SMTP Password</label>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    className="form-control"
                    value={smtpPass}
                    onChange={e => setSmtpPass(e.target.value)}
                    placeholder="SMTP login credentials"
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '32px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748b',
                      padding: 0
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Box 3: Email Template Editor */}
            <div className="admin-card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#1e293b' }}>
                <FileText size={16} /> Email Subject & Body Template
              </h3>

              <div className="form-group">
                <label className="form-label">Email Subject Line</label>
                <input 
                  type="text" 
                  className="form-control"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  placeholder="Subject line"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <label className="form-label">Email Body Template (Plain Text)</label>
                <textarea 
                  className="form-control"
                  style={{ minHeight: '160px', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: '1.5', width: '100%', padding: '0.5rem' }}
                  value={emailTemplate}
                  onChange={e => setEmailTemplate(e.target.value)}
                  required
                />
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#475569' }}>
                <strong>Supported Placeholders:</strong> Use these variables. They will be replaced dynamically:
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: '6px' }}>
                  <code>{`{customerName}`}</code>
                  <code>{`{projectName}`}</code>
                  <code>{`{visitDate}`}</code>
                  <code>{`{visitTime}`}</code>
                  <code>{`{location}`}</code>
                  <code>{`{assignedAgent}`}</code>
                  <code>{`{assignedAgentPhone}`}</code>
                </div>
              </div>
            </div>

          </div>

          {/* Preview Sidebar: 35% width */}
          <div className="mail-config-preview" style={{ flex: '0 0 320px', minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ position: 'sticky', top: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', marginBottom: '0.75rem' }}>
                <Eye size={16} /> Live Rendering Preview
              </h3>

              <div className="email-preview-envelope" style={{ border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
                {/* Envelope details bar */}
                <div style={{ backgroundColor: '#e2e8f0', padding: '0.75rem 1rem', borderBottom: '1px solid #cbd5e1', fontSize: '0.8rem', color: '#475569' }}>
                  <div style={{ marginBottom: '4px' }}>
                    <strong>From:</strong> {senderEmail || (profile.email ? `noreply@${profile.email.split('@')[1] || 'company.com'}` : 'noreply@company.com')}
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    <strong>To:</strong> Jane Doe (jane.doe@example.com)
                  </div>
                  <div style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    <strong>Subject:</strong> {compiledSubjectPreview || '—'}
                  </div>
                </div>

                {/* Email Body */}
                <div style={{ padding: '1.25rem', minHeight: '300px', backgroundColor: 'white', fontSize: '0.85rem', color: '#1e293b', lineHeight: '1.6', borderBottomLeftRadius: '6px', borderBottomRightRadius: '6px' }}>
                  <div style={{ textAlign: 'center', borderBottom: '2px solid #0f2b46', paddingBottom: '12px', marginBottom: '16px' }}>
                    <img src={profile.logoUrl || logoImg} alt={`${profile.companyName || 'Company'} Logo`} style={{ height: '35px' }} />
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    {compiledBodyPreview || 'Enter content in the template editor to preview.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Test Connection Modal */}
      {showTestModal && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div className="modal-content premium-modal" onClick={e => e.stopPropagation()} style={{ width: '400px', padding: '1.5rem' }}>
            <div className="premium-modal-header" style={{ marginBottom: '1rem' }}>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={18} style={{ color: 'var(--sap-fiori-blue)' }} /> 
                <span>Send SMTP Test Email</span>
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#666', margin: '4px 0 0' }}>
                Verify if your email host connection is configured correctly.
              </p>
            </div>

            <form onSubmit={handleSendTest} className="premium-modal-form">
              <div className="form-group">
                <label className="form-label">Recipient Email Address</label>
                <div className="input-with-icon">
                  <Mail size={16} className="input-icon" />
                  <input 
                    type="email" 
                    className="form-control" 
                    value={testEmailAddress}
                    onChange={e => setTestEmailAddress(e.target.value)}
                    placeholder="recipient@example.com"
                    required
                    disabled={testingConnection}
                  />
                </div>
              </div>

              <div className="premium-modal-footer" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowTestModal(false)} 
                  className="btn btn-outline"
                  style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
                  disabled={testingConnection}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: 'var(--sap-fiori-blue)', borderColor: 'var(--sap-fiori-blue)', color: 'white', padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
                  disabled={testingConnection}
                >
                  {testingConnection ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {testingConnection ? 'Testing Connection...' : 'Send Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
