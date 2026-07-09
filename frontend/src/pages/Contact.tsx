import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send, ShieldCheck } from 'lucide-react';
import type { Enquiry } from '../types';
import { addEnquiry } from '../utils/db';

interface ContactProps {
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const Contact: React.FC<ContactProps> = ({ onAddToast }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('General Enquiry');
  const [message, setMessage] = useState('');

  // Captcha state
  const [captchaNum1] = useState(Math.floor(Math.random() * 9) + 1);
  const [captchaNum2] = useState(Math.floor(Math.random() * 9) + 1);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [formErrors, setFormErrors] = useState<any>({});

  const validateForm = () => {
    const errors: any = {};
    if (!name.trim()) errors.name = 'Full name is required';
    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email';
    }
    if (!phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^\+?[0-9\s-]{10,14}$/.test(phone.replace(/\s+/g, ''))) {
      errors.phone = 'Please enter a valid phone number';
    }
    if (!message.trim()) errors.message = 'Please enter your message';

    const correctSum = captchaNum1 + captchaNum2;
    if (parseInt(captchaAnswer) !== correctSum) {
      errors.captcha = 'Incorrect captcha solution';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      onAddToast('Please correct the validation errors.', 'error');
      return;
    }

    const newEnquiry: Enquiry = {
      id: 'e_' + Date.now(),
      name,
      email,
      phone,
      message: `[Subject: ${subject}] ${message}`,
      projectAssociation: 'General',
      projectName: 'General Enquiry',
      date: new Date().toISOString(),
      status: 'New',
      notes: ''
    };

    try {
      await addEnquiry(newEnquiry);
      onAddToast('Thank you! Your enquiry has been received and sent to our team.', 'success');

      // Reset Form
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
      setCaptchaAnswer('');
      setSubject('General Enquiry');
    } catch (error) {
      onAddToast('Failed to submit enquiry.', 'error');
    }
  };

  return (
    <div className="contact-page">
      {/* Header Banner */}
      <section className="page-header py-4 text-center text-white" style={{ background: 'linear-gradient(rgba(11,25,44,0.85), rgba(11,25,44,0.85)), url(https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&auto=format&fit=crop&q=80)', backgroundSize: 'cover' }}>
        <div className="container">
          <h1 className="text-white text-4xl">Contact Our Office</h1>
          <p className="text-muted" style={{ color: 'rgba(255,255,255,0.75)' }}>Get in touch with our expert property advisors, arrange site visits, or seek project clarifications</p>
        </div>
      </section>

      {/* Main Grid: Info Cards and Contact Form */}
      <section className="container py-6 grid grid-3 gap-3">
        {/* Info Column (1 Column width) */}
        <div className="contact-info-column">
          <div className="admin-card mb-2">
            <h3 className="border-bottom-title mb-2">Office Address</h3>
            <ul className="footer-contact-info" style={{ color: 'var(--text-primary)' }}>
              <li className="flex gap-2">
                <MapPin size={22} className="text-secondary shrink-0" />
                <div>
                  <h4 className="font-bold">Registered Office:</h4>
                  <p className="text-sm text-muted">DOOR No: 4-92/1/6, FLAT No: 202, LEE INFRA, TALRIVANIPALEM</p>
                </div>
              </li>
              <li className="flex gap-2">
                <Phone size={20} className="text-secondary shrink-0" />
                <div>
                  <h4 className="font-bold">Direct Phone Lines:</h4>
                  <p className="text-sm text-muted">9000553832, 7893963322</p>
                </div>
              </li>
              <li className="flex gap-2">
                <Mail size={20} className="text-secondary shrink-0" />
                <div>
                  <h4 className="font-bold">Email Communication:</h4>
                  <p className="text-sm text-muted">jkfutureinfra@gmail.com</p>
                </div>
              </li>
              <li className="flex gap-2">
                <Clock size={20} className="text-secondary shrink-0" />
                <div>
                  <h4 className="font-bold">Office Hours:</h4>
                  <p className="text-sm text-muted">Monday - Saturday: 9:00 AM - 6:00 PM<br />Sunday: Closed (Site Visits Available)</p>
                </div>
              </li>
            </ul>
          </div>

          {/* RERA and credentials */}
          <div className="admin-card mb-2" style={{ backgroundColor: 'var(--light-soft)' }}>
            <h4 className="flex align-center gap-0.5"><ShieldCheck size={20} className="text-success" /> Quality Credentials</h4>
            <p className="text-xs text-muted mt-0.5">
              JK Future Infra operates with absolute transparency. AP RERA Regd: P03290021045. ISO 9001:2015 certified operations ensure premium grade construction structures.
            </p>
            <a 
              href="https://wa.me/919000553832?text=Hi,%20I%20have%20questions%20regarding%20JK%20properties." 
              target="_blank" 
              rel="noreferrer" 
              className="btn btn-accent w-full text-center mt-1.5" 
              style={{ width: '100%', background: '#25d366', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem' }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12.031 2C6.446 2 1.922 6.524 1.922 12.109c0 1.782.463 3.522 1.34 5.06l-1.424 5.201 5.322-1.396a10.05 10.05 0 0 0 4.871 1.246h.004c5.581 0 10.105-4.524 10.105-10.109C22.14 6.524 17.616 2 12.031 2zm0 18.528h-.002c-1.579 0-3.125-.424-4.473-1.226l-.32-.19-3.32.87.886-3.235-.208-.33a8.178 8.178 0 0 1-1.252-4.321c0-4.516 3.673-8.19 8.192-8.19 2.186 0 4.243.852 5.79 2.401a8.134 8.134 0 0 1 2.398 5.791c0 4.516-3.673 8.19-8.191 8.19zm4.502-6.149c-.247-.123-1.46-.72-1.685-.802-.227-.082-.392-.123-.556.123-.164.247-.638.802-.782.967-.144.164-.288.185-.535.062-.247-.123-1.04-.383-1.98-1.222-.731-.652-1.225-1.459-1.369-1.706-.144-.247-.015-.38.109-.502.112-.11.247-.288.371-.432.124-.144.165-.247.247-.412.082-.164.041-.309-.02-.432-.062-.123-.556-1.338-.762-1.833-.2-.484-.422-.412-.576-.42-.149-.008-.32-.01-.493-.01-.173 0-.456.065-.694.325-.238.26-1.002.979-1.002 2.387 0 1.408 1.025 2.766 1.168 2.955.144.189 2.016 3.078 4.885 4.316.682.295 1.215.47 1.63.603.687.218 1.312.187 1.806.114.55-.082 1.685-.688 1.921-1.353.236-.665.236-1.235.165-1.353-.07-.119-.247-.185-.494-.308z"/>
              </svg>
              WhatsApp Chat Support
            </a>
          </div>
        </div>

        {/* Contact Form Column (2 Columns width) */}
        <div className="contact-form-column">
          <div className="admin-card">
            <h3 className="border-bottom-title mb-2">Send Online Enquiry</h3>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-2 gap-2">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Enter name..." 
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                  {formErrors.name && <div className="form-error">{formErrors.name}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    placeholder="+91 99999 99999" 
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/[^0-9\s+\-()]/g, ''))}
                  />
                  {formErrors.phone && <div className="form-error">{formErrors.phone}</div>}
                </div>
              </div>

              <div className="grid grid-2 gap-2">
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    placeholder="email@domain.com" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                  {formErrors.email && <div className="form-error">{formErrors.email}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label">Subject Topic</label>
                  <select 
                    className="form-control" 
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                  >
                    <option value="General Enquiry">General Enquiry</option>
                    <option value="Arranging Site Visit">Arranging Site Visit</option>
                    <option value="Booking Property">Booking Property</option>
                    <option value="Career Opportunities">Careers / Joint Venture</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Message Details *</label>
                <textarea 
                  className="form-control" 
                  rows={5} 
                  placeholder="Describe your queries, location preferences, or property budget details..." 
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />
                {formErrors.message && <div className="form-error">{formErrors.message}</div>}
              </div>

              {/* Captcha challenge */}
              <div className="form-group">
                <label className="form-label">Anti-Spam Verification *</label>
                <div className="captcha-container">
                  <span className="captcha-question">{captchaNum1} + {captchaNum2} =</span>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="?" 
                    style={{ width: '80px', marginBottom: 0 }}
                    value={captchaAnswer}
                    onChange={e => setCaptchaAnswer(e.target.value)}
                  />
                </div>
                {formErrors.captcha && <div className="form-error">{formErrors.captcha}</div>}
              </div>

              <button type="submit" className="btn btn-secondary flex align-center gap-0.5">
                <Send size={16} /> Submit Message Details
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Office Maps Embed */}
      <section className="container py-4 mb-4">
        <div className="admin-card p-1" style={{ borderRadius: '12px', overflow: 'hidden', height: '400px', border: '1px solid var(--border-color)' }}>
          <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3800.12356789123!2d83.3031021234567!3d17.72895678912345!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a39431389e6973f%3A0x92d9d203954986f1!2sDwaraka%20Nagar%2C%20Visakhapatnam%2C%20Andhra%20Pradesh!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin" 
            width="100%" 
            height="100%" 
            style={{ border: 0 }} 
            allowFullScreen={false} 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
            title="Office Location Map"
          />
        </div>
      </section>
    </div>
  );
};
