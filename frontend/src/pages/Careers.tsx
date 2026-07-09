import React, { useState } from 'react';
import { Briefcase, Send, ShieldCheck, Heart, Award, ArrowUpRight } from 'lucide-react';
import type { JobApplication } from '../types';
import { addApplication } from '../utils/db';

interface CareersProps {
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const Careers: React.FC<CareersProps> = ({ onAddToast }) => {
  // Application Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('Senior Property Advisor');
  const [experience, setExperience] = useState('1-3 Years');
  const [coverLetter, setCoverLetter] = useState('');
  
  // Job positions mock data
  const jobs = [
    { title: 'Senior Property Advisor', type: 'Full-Time', location: 'Visakhapatnam HQ', exp: '3+ Years', desc: 'Consult and guide high-net-worth clients through purchasing premium flats and gated villa ventures.' },
    { title: 'Digital Marketing Executive', type: 'Full-Time', location: 'Visakhapatnam HQ', exp: '2+ Years', desc: 'Design, manage, and optimize SEO, meta-campaigns, and real estate marketing automation grids.' },
    { title: 'Site Civil Engineer', type: 'Full-Time', location: 'Madhurawada Ventures', exp: '4+ Years', desc: 'Oversee structural safety, quality checks (ISO 9001 compliance), and site timeline milestones.' },
    { title: 'Sales Relationship Manager', type: 'Full-Time', location: 'Vijayawada Branch', exp: '1-3 Years', desc: 'Manage client relationship ledgers and handle incoming leads matching through CRM directories.' }
  ];

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !email.trim() || !phone.trim() || !coverLetter.trim()) {
      onAddToast('Please fill out all required fields.', 'error');
      return;
    }

    const newApplication: JobApplication = {
      id: 'app_' + Date.now(),
      name,
      email,
      phone,
      position,
      experience,
      coverLetter,
      status: 'Pending',
      date: new Date().toISOString()
    };

    try {
      await addApplication(newApplication);
      onAddToast('Your job application has been successfully submitted to HR.', 'success');
      
      // Reset form
      setName('');
      setEmail('');
      setPhone('');
      setCoverLetter('');
    } catch (error) {
      onAddToast('Failed to submit application.', 'error');
    }
  };

  return (
    <div className="careers-page-wrapper py-6">
      <div className="container">
        
        {/* Banner Section */}
        <div className="text-center mb-4">
          <span className="badge badge-ongoing mb-1">Career Opportunities</span>
          <h1 className="text-4xl text-primary font-bold mb-1">Build Your Future With Us</h1>
          <p className="text-muted text-lg" style={{ maxWidth: '600px', margin: '0 auto' }}>
            Join our ISO 9001:2015 certified real estate development firm in Andhra Pradesh and unlock outstanding career heights.
          </p>
        </div>

        {/* Benefits Cards Section */}
        <div className="grid grid-3 gap-3 mb-6">
          <div className="admin-card text-center p-3">
            <div className="benefit-icon-box mb-2" style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(242, 183, 5, 0.15)', color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <Heart size={24} />
            </div>
            <h3 className="mb-1">Comprehensive Perks</h3>
            <p className="text-sm text-muted">Premium health coverage, family incentives, travel allowances, and performance rewards.</p>
          </div>

          <div className="admin-card text-center p-3">
            <div className="benefit-icon-box mb-2" style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(11, 44, 92, 0.15)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <Award size={24} />
            </div>
            <h3 className="mb-1">ISO Quality Audits</h3>
            <p className="text-sm text-muted">Learn professional execution and client relations under strict ISO 9001 quality audits.</p>
          </div>

          <div className="admin-card text-center p-3">
            <div className="benefit-icon-box mb-2" style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <ShieldCheck size={24} />
            </div>
            <h3 className="mb-1">Work-Life Harmony</h3>
            <p className="text-sm text-muted">Work-life balance with structured leaves, fun activities, and employee mental wellness seminars.</p>
          </div>
        </div>

        {/* Split Grid - Job Listings (Left) & Application Form (Right) */}
        <div className="grid grid-2 gap-4">
          
          {/* Openings List */}
          <div>
            <h2 className="mb-2 text-2xl text-primary flex align-center gap-0.5">
              <Briefcase size={24} className="text-secondary" /> Open Positions
            </h2>
            <p className="text-sm text-muted mb-3">Select a role below and submit your application form on the right.</p>

            <div className="flex flex-col gap-2">
              {jobs.map((job, idx) => (
                <div key={idx} className="admin-card p-3 flex flex-col justify-between" style={{ borderLeft: '4px solid var(--primary)' }}>
                  <div className="flex justify-between align-center mb-1">
                    <span className="font-bold text-lg text-primary">{job.title}</span>
                    <span className="badge badge-ongoing" style={{ fontSize: '0.75rem' }}>{job.type}</span>
                  </div>
                  <p className="text-sm text-muted mb-1">{job.desc}</p>
                  <div className="flex justify-between align-center text-xs font-semibold text-secondary pt-1" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <span>📍 {job.location}</span>
                    <span>Experience: {job.exp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Job Application Form */}
          <div className="admin-card p-4" style={{ backgroundColor: 'var(--white)', alignSelf: 'start' }}>
            <h2 className="mb-2 text-2xl text-primary flex align-center gap-0.5">
              <ArrowUpRight size={24} className="text-secondary" /> Submit Application
            </h2>
            <form onSubmit={handleApplySubmit}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
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
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    placeholder="+91 99999 99999"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/[^0-9\s+\-()]/g, ''))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-2 gap-2">
                <div className="form-group">
                  <label className="form-label">Target Position *</label>
                  <select 
                    className="form-control"
                    value={position}
                    onChange={e => setPosition(e.target.value)}
                  >
                    <option value="Senior Property Advisor">Senior Property Advisor</option>
                    <option value="Digital Marketing Executive">Digital Marketing Executive</option>
                    <option value="Site Civil Engineer">Site Civil Engineer</option>
                    <option value="Sales Relationship Manager">Sales Relationship Manager</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Total Experience *</label>
                  <select 
                    className="form-control"
                    value={experience}
                    onChange={e => setExperience(e.target.value)}
                  >
                    <option value="Entry Level / Intern">Entry Level / Intern</option>
                    <option value="1-3 Years">1-3 Years</option>
                    <option value="3-5 Years">3-5 Years</option>
                    <option value="5+ Years">5+ Years</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Cover Letter & Experience Summary *</label>
                <textarea 
                  className="form-control" 
                  rows={4}
                  placeholder="Tell us about your background, achievements, and why you are a fit for JK Future Infra..."
                  value={coverLetter}
                  onChange={e => setCoverLetter(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-secondary w-full flex align-center justify-center gap-0.5 mt-2" style={{ width: '100%' }}>
                <Send size={16} /> Submit Application
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
};
