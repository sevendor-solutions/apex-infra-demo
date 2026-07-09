import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { MapPin, Download, CheckSquare, Image as ImageIcon, X, ArrowLeft, ArrowRight, ShieldAlert } from 'lucide-react';
import type { Project, Enquiry } from '../types';
import { addEnquiry } from '../utils/db';
import logoImg from '../assets/logo.png';

interface ProjectDetailsProps {
  projectId: string;
  projects: Project[];
  onBack: () => void;
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  isMarketing?: boolean;
  showMap?: boolean;
}

export const ProjectDetails: React.FC<ProjectDetailsProps> = ({
  projectId,
  projects,
  onBack,
  onAddToast,
  isMarketing = false,
  showMap = false
}) => {
  const project = projects.find(p => p.id === projectId);
  
  if (!project) {
    return (
      <div className="container py-8 text-center">
        <ShieldAlert size={64} className="text-danger mb-2" />
        <h2>Property Not Found</h2>
        <p className="text-muted">The requested project ID does not exist or has been deleted.</p>
        <button onClick={onBack} className="btn btn-primary mt-2">Go Back to Projects</button>
      </div>
    );
  }

  // Gallery slider state
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [floorPlanIdx, setFloorPlanIdx] = useState(0);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState(`Hello, I am interested in ${project.name} in ${project.location}. Please share RERA registration documents and brochure details.`);
  
  // Captcha
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
      errors.phone = 'Please enter a valid 10-digit phone number';
    }
    const correctSum = captchaNum1 + captchaNum2;
    if (parseInt(captchaAnswer) !== correctSum) {
      errors.captcha = 'Incorrect mathematical answer';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      onAddToast('Please correct validation errors', 'error');
      return;
    }

    const newEnq: Enquiry = {
      id: 'e_' + Date.now(),
      name,
      email,
      phone,
      message,
      projectAssociation: project.id,
      projectName: project.name,
      date: new Date().toISOString(),
      status: 'New',
      notes: ''
    };

    try {
      await addEnquiry(newEnq);
      onAddToast(`Thank you! Your enquiry for ${project.name} has been submitted.`, 'success');
      
      // Reset form
      setName('');
      setEmail('');
      setPhone('');
      setCaptchaAnswer('');
    } catch (error) {
      onAddToast('Failed to submit enquiry.', 'error');
    }
  };

  const handleDownloadBrochure = async () => {
    if (!project) return;
    onAddToast('Generating Brochure PDF, please wait...', 'info');

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

      // Page 1: Cover Page
      doc.setFillColor(15, 43, 70); // Brand Navy
      doc.rect(0, 0, 210, 45, 'F');

      // Brand Title
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('JK FUTURE INFRA PROJECTS PVT LTD', 105, 20, { align: 'center' });
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.text('Premium Real Estate Showcase Brochure', 105, 32, { align: 'center' });

      // Separator line
      doc.setDrawColor(240, 90, 40); // Gold/Orange accent
      doc.setLineWidth(2);
      doc.line(15, 45, 195, 45);

      // Render logo if loaded with exact aspect ratio preserved
      let nextSectionY = 85;
      if (logoData) {
        const logoW = 95;
        const logoH = logoW / logoData.ratio;
        const logoX = (210 - logoW) / 2;
        doc.addImage(logoData.base64, 'PNG', logoX, 50, logoW, logoH);
        nextSectionY = 50 + logoH + 12;
      }

      // Project Title (pushed down based on logo dimensions)
      doc.setTextColor(15, 43, 70);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      doc.text(project.name, 20, nextSectionY);

      // Location Subtitle
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(14);
      doc.setTextColor(100, 110, 120);
      doc.text(`Location: ${project.location}`, 20, nextSectionY + 10);

      // Specs Table
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(20, nextSectionY + 20, 190, nextSectionY + 20);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 43, 70);
      doc.setFontSize(12);
      doc.text('PROPERTY SPECIFICATIONS', 20, nextSectionY + 30);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      
      let currentY = nextSectionY + 40;
      const drawSpecLine = (label: string, value: string) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 20, currentY);
        doc.setFont('helvetica', 'normal');
        doc.text(value, 65, currentY);
        currentY += 9;
      };

      drawSpecLine('Category:', project.category);
      if (project.subCategory) {
        drawSpecLine('Sub-Category:', project.subCategory);
      }
      drawSpecLine('Price Range:', project.priceRange);
      if (project.facing) {
        drawSpecLine('Facing Directions:', project.facing);
      }
      if (project.floors !== undefined && project.floors > 0) {
        drawSpecLine('Total Floors:', `G+${project.floors}`);
      }
      if (project.unitsCount) {
        drawSpecLine('Total Units:', `${project.unitsCount}`);
      }
      if (project.uds) {
        drawSpecLine('UDS Share:', `${project.uds} Sq. Yds`);
      }
      if (project.width && project.length) {
        drawSpecLine('Dimensions:', `${project.width} x ${project.length} ft`);
      }

      // Highlights Box
      currentY += 5;
      doc.line(20, currentY, 190, currentY);
      currentY += 10;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 43, 70);
      doc.text('KEY HIGHLIGHTS', 20, currentY);
      currentY += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      project.highlights.forEach(h => {
        if (currentY < 250) {
          doc.text(`•  ${h}`, 22, currentY);
          currentY += 7;
        }
      });

      // Footer bar
      doc.setFillColor(15, 43, 70);
      doc.rect(0, 267, 210, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('JK Future Infra - Building the Future', 105, 277, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text('Call: 9000553832, 7893963322  |  Email: jkfutureinfra@gmail.com', 105, 285, { align: 'center' });

      // Add Project Images
      if (project.images && project.images.length > 0) {
        for (let idx = 0; idx < project.images.length; idx++) {
          const imgUrl = project.images[idx];
          try {
            const base64Data = await new Promise<string>((resolve, reject) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.src = imgUrl;
              img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0);
                  try {
                    resolve(canvas.toDataURL('image/jpeg', 0.85));
                  } catch (e) {
                    reject(e);
                  }
                } else {
                  reject(new Error('Canvas context error'));
                }
              };
              img.onerror = (e) => reject(e);
            });

            doc.addPage();
            
            // Header bar
            doc.setFillColor(15, 43, 70);
            doc.rect(0, 0, 210, 15, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(10);
            doc.text(`${project.name} - Showcase Image ${idx + 1}`, 15, 10);
            
            // Draw image scaled
            const tempImg = new Image();
            tempImg.src = base64Data;
            await new Promise((r) => { tempImg.onload = r; });
            
            const w = tempImg.naturalWidth;
            const h = tempImg.naturalHeight;
            const ratio = w / h;
            
            let fitW = 190;
            let fitH = fitW / ratio;
            
            if (fitH > 240) {
              fitH = 240;
              fitW = fitH * ratio;
            }
            
            const x = (210 - fitW) / 2;
            const y = 20 + (240 - fitH) / 2;
            
            doc.addImage(base64Data, 'JPEG', x, y, fitW, fitH);
            
            // Footer numbering
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            doc.text(`Page ${idx + 2} of ${project.images.length + 1}`, 105, 287, { align: 'center' });
          } catch (e) {
            console.warn(`Could not load image ${idx}: ${imgUrl}`, e);
          }
        }
      }

      doc.save(`JK_Infra_${project.name.replace(/\s+/g, '_')}_Brochure.pdf`);
      onAddToast('Brochure PDF downloaded successfully!', 'success');
    } catch (err: any) {
      console.error('PDF Generation failed:', err);
      onAddToast('Failed to generate Brochure PDF. Downloading text version instead.', 'error');
      
      // Fallback
      const textContent = `
========================================
   JK FUTURE INFRA PROJECTS PVT LTD
   PROJECT BROCHURE: ${project.name}
========================================
Status: ${project.status}
Category: ${project.category}
Location: ${project.location}
Price Target: ${project.priceRange}
${project.uds ? `UDS: ${project.uds} Sq. Yds\n` : ''}${project.width && project.length ? `Dimensions: ${project.width} x ${project.length} ft\n` : ''}
--- Highlights ---
${project.highlights.join('\n')}

--- Amenities ---
${project.amenities.join(', ')}

Thank you for downloading our brochure. 
For bookings, call us at 9000553832, 7893963322
Email: jkfutureinfra@gmail.com
      `;
      const blob = new Blob([textContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `JK_Infra_${project.name.replace(/\s+/g, '_')}_Brochure.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const whatsappUrl = `https://wa.me/919000553832?text=Hello%20JK%20Future%20Infra,%20I%20am%20interested%20in%20your%20project%20"${encodeURIComponent(project.name)}"%20located%20at%20${encodeURIComponent(project.location)}.`;

  return (
    <div className="project-detail-page">
      {/* Header breadcrumb */}
      <div className="detail-breadcrumb py-1" style={{ backgroundColor: 'var(--light-soft)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="container flex justify-between align-center text-sm">
          <button onClick={onBack} className="flex align-center gap-1 font-semibold text-primary">
            <ArrowLeft size={16} /> Back to Listings
          </button>
          <span>Projects / {project.category} / {project.name}</span>
        </div>
      </div>

      <div className="container py-4 grid grid-3 gap-3">
        {/* Main Content (Columns 1 & 2) */}
        <div className="detail-main-content">
          {/* Title block */}
          <div className="detail-title-block mb-2">
            <div className="flex gap-1 align-center mb-1">
              <span className={`badge badge-${project.status.toLowerCase()}`}>{project.status}</span>
              <span className="badge badge-ongoing" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>{project.category}</span>
            </div>
            <h1 className="text-3xl">{project.name}</h1>
            <p className="text-muted flex align-center gap-1 my-1"><MapPin size={16} /> {project.location}</p>
          </div>

          {/* Slider gallery */}
          <div className="detail-gallery-slider mb-3">
            <div className="active-img-wrapper" onClick={() => setLightboxOpen(true)}>
              <img src={project.images[activeImgIdx]} alt={project.name} />
              <button className="slider-lightbox-btn"><ImageIcon size={18} /> View All Images</button>
            </div>
            <div className="thumbnails-wrapper flex gap-1 mt-1 overflow-x-auto">
              {project.images.map((img, idx) => (
                <div 
                  key={idx} 
                  className={`thumb-box ${idx === activeImgIdx ? 'active' : ''}`}
                  onClick={() => setActiveImgIdx(idx)}
                >
                  <img src={img} alt="Thumbnail" />
                </div>
              ))}
            </div>
          </div>

          {/* Description tab */}
          <div className="detail-card admin-card mb-3">
            <h3 className="border-bottom-title mb-2">Project Overview</h3>
            <p className="text-muted">{project.description}</p>
          </div>

          {/* Specifications Card */}
          <div className="detail-card admin-card mb-3">
            <h3 className="border-bottom-title mb-2">Specifications & Configurations</h3>
            <div className="grid grid-2 gap-2 mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              
              {project.city && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span className="text-muted text-sm" style={{ fontWeight: 500 }}>City:</span>
                  <strong className="text-sm text-primary">{project.city}</strong>
                </div>
              )}

              {project.classification && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span className="text-muted text-sm" style={{ fontWeight: 500 }}>Classification:</span>
                  <strong className="text-sm text-primary">{project.classification}</strong>
                </div>
              )}

              {project.microLocation && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span className="text-muted text-sm" style={{ fontWeight: 500 }}>Micro Location:</span>
                  <strong className="text-sm text-primary">{project.microLocation}</strong>
                </div>
              )}

              {project.facing && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span className="text-muted text-sm" style={{ fontWeight: 500 }}>Facing Directions:</span>
                  <strong className="text-sm text-primary">{project.facing}</strong>
                </div>
              )}

              {project.floors !== undefined && project.floors > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span className="text-muted text-sm" style={{ fontWeight: 500 }}>Total Floors:</span>
                  <strong className="text-sm text-primary">G + {project.floors}</strong>
                </div>
              )}

              {project.unitsCount !== undefined && project.unitsCount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span className="text-muted text-sm" style={{ fontWeight: 500 }}>Total Units:</span>
                  <strong className="text-sm text-primary">{project.unitsCount}</strong>
                </div>
              )}

              {project.uds && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span className="text-muted text-sm" style={{ fontWeight: 500 }}>UDS Share:</span>
                  <strong className="text-sm text-primary">{project.uds} Sq. Yds</strong>
                </div>
              )}

              {project.width && project.length && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span className="text-muted text-sm" style={{ fontWeight: 500 }}>Plot Dimensions:</span>
                  <strong className="text-sm text-primary">{project.width} x {project.length} ft</strong>
                </div>
              )}

              {project.priceRange && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span className="text-muted text-sm" style={{ fontWeight: 500 }}>Target Price Range:</span>
                  <strong className="text-sm text-secondary">{project.priceRange}</strong>
                </div>
              )}

              {project.availabilityDetails && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem', gridColumn: '1 / -1' }}>
                  <span className="text-muted text-sm" style={{ fontWeight: 500 }}>Availability & Quantities:</span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                    {project.availabilityDetails.split(',').map((part, idx) => {
                      const [type, qty] = part.split(':').map(s => s.trim());
                      return (
                        <span key={idx} style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.6rem', backgroundColor: '#e6f0fa', color: '#0b2c5c', borderRadius: '6px', border: '1px solid #d0e1f5', display: 'inline-flex', alignItems: 'center' }}>
                          {type} : <span style={{ color: 'var(--secondary)', marginLeft: '4px', fontWeight: 700 }}>{qty || '0'} Units</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>


          {/* Highlights */}
          <div className="detail-card admin-card mb-3">
            <h3 className="border-bottom-title mb-2">Key Highlights</h3>
            <ul className="highlights-list grid grid-2 gap-2">
              {project.highlights.map((hl, i) => (
                <li key={i} className="flex gap-2">
                  <CheckSquare size={20} className="text-secondary shrink-0" />
                  <span className="text-sm font-semibold">{hl}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Amenities */}
          <div className="detail-card admin-card mb-3">
            <h3 className="border-bottom-title mb-2">Modern Amenities</h3>
            <div className="amenities-grid grid grid-4 gap-2">
              {project.amenities.map((am, i) => (
                <div key={i} className="amenity-item text-center">
                  <div className="amenity-icon">✓</div>
                  <span className="text-sm font-semibold">{am}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Floor Plans */}
          {project.floorPlans && project.floorPlans.length > 0 && (
            <div className="detail-card admin-card mb-3">
              <h3 className="border-bottom-title mb-2">Floor Plans & Master Layouts</h3>
              <div className="floorplan-tabs flex gap-1 mb-2">
                {project.floorPlans.map((plan, idx) => (
                  <button 
                    key={plan.id}
                    className={`plan-tab-btn ${idx === floorPlanIdx ? 'active' : ''}`}
                    onClick={() => setFloorPlanIdx(idx)}
                  >
                    {plan.title}
                  </button>
                ))}
              </div>
              <div className="floorplan-image-box text-center py-2 bg-light-soft" style={{ borderRadius: '8px' }}>
                 <img 
                  src={project.floorPlans[floorPlanIdx].image || project.specImage} 
                  alt={project.floorPlans[floorPlanIdx].title} 
                  style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', margin: '0 auto' }}
                />
              </div>
            </div>
          )}

          {/* Timeline Milestones */}
          {project.timeline && project.timeline.length > 0 && (
            <div className="detail-card admin-card mb-3">
              <h3 className="border-bottom-title mb-2">Construction Progress Timeline</h3>
              <div className="timeline-trail flex flex-col gap-2">
                {project.timeline.map((event, i) => (
                  <div key={event.id} className="timeline-node flex gap-2">
                    <div className="timeline-marker-box">
                      <div className="timeline-dot" />
                      {i < project.timeline.length - 1 && <div className="timeline-line" />}
                    </div>
                    <div className="timeline-node-content">
                      <span className="timeline-node-date text-secondary font-bold text-sm">{event.date}</span>
                      <h4>{event.title}</h4>
                      <p className="text-muted text-sm">{event.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Map Location — hidden for marketing projects unless showMap is enabled */}
          {(!isMarketing || showMap) && (
            <div className="detail-card admin-card mb-3">
              <h3 className="border-bottom-title mb-2">Google Map Location</h3>
              <div className="detail-map-box" style={{ height: '300px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                {/* Embed Google Maps dynamically using coordinates or search address */}
                <iframe 
                  src={`https://maps.google.com/maps?q=${
                    project.mapCoordinates && project.mapCoordinates.lat && project.mapCoordinates.lng
                      ? `${project.mapCoordinates.lat},${project.mapCoordinates.lng}`
                      : encodeURIComponent(project.name + ', ' + project.location)
                  }&z=15&output=embed`} 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen={false} 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Google Map Locator"
                />
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Enquiry Panel (Column 3) */}
        <div className="detail-sidebar-content">
          {/* Price details */}
          <div className="sidebar-card admin-card mb-2" style={{ backgroundColor: 'var(--primary)', color: 'var(--white)', border: 'none' }}>
            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Valuation / Pricing</span>
            <h2 className="text-3xl text-white my-1" style={{ color: 'var(--secondary)' }}>{project.priceRange}</h2>
            <div className="flex gap-2 mt-2">
              <button onClick={handleDownloadBrochure} className="btn btn-secondary flex-1 btn-sm">
                <Download size={16} /> Brochure PDF
              </button>
            </div>
          </div>

          {/* Dynamic Payment plan structure */}
          {project.paymentPlans && project.paymentPlans.length > 0 && (
            <div className="sidebar-card admin-card mb-2">
              <h4 className="border-bottom-title mb-1">Standard Payment Plan</h4>
              <ul className="payment-plans-list" style={{ listStyle: 'none', paddingLeft: 0 }}>
                {project.paymentPlans.map((plan, i) => (
                  <li key={i} className="text-sm py-0.5" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem', paddingTop: '0.4rem' }}>
                    <span className="text-secondary font-bold">Step {i+1}:</span> {plan}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Enquiry Form card */}
          <div className="sidebar-card admin-card sticky-sidebar">
            <h3 className="mb-2">Request Consultation</h3>
            <form onSubmit={handleEnquirySubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Enter your name..." 
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
                {formErrors.name && <div className="form-error">{formErrors.name}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
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
                <label className="form-label">Phone Number</label>
                <input 
                  type="tel" 
                  className="form-control" 
                  placeholder="+91 99999 99999" 
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/[^0-9\s+\-()]/g, ''))}
                />
                {formErrors.phone && <div className="form-error">{formErrors.phone}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Message Details</label>
                <textarea 
                  className="form-control" 
                  rows={4} 
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />
              </div>

              {/* Anti-spam math Captcha */}
              <div className="form-group">
                <label className="form-label">Anti-Spam Verification</label>
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

              <button type="submit" className="btn btn-secondary w-full my-1" style={{ width: '100%' }}>
                Submit Enquiry
              </button>

              <a 
                href={whatsappUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="btn btn-accent w-full text-center" 
                style={{ width: '100%', background: '#25d366', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem' }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M12.031 2C6.446 2 1.922 6.524 1.922 12.109c0 1.782.463 3.522 1.34 5.06l-1.424 5.201 5.322-1.396a10.05 10.05 0 0 0 4.871 1.246h.004c5.581 0 10.105-4.524 10.105-10.109C22.14 6.524 17.616 2 12.031 2zm0 18.528h-.002c-1.579 0-3.125-.424-4.473-1.226l-.32-.19-3.32.87.886-3.235-.208-.33a8.178 8.178 0 0 1-1.252-4.321c0-4.516 3.673-8.19 8.192-8.19 2.186 0 4.243.852 5.79 2.401a8.134 8.134 0 0 1 2.398 5.791c0 4.516-3.673 8.19-8.191 8.19zm4.502-6.149c-.247-.123-1.46-.72-1.685-.802-.227-.082-.392-.123-.556.123-.164.247-.638.802-.782.967-.144.164-.288.185-.535.062-.247-.123-1.04-.383-1.98-1.222-.731-.652-1.225-1.459-1.369-1.706-.144-.247-.015-.38.109-.502.112-.11.247-.288.371-.432.124-.144.165-.247.247-.412.082-.164.041-.309-.02-.432-.062-.123-.556-1.338-.762-1.833-.2-.484-.422-.412-.576-.42-.149-.008-.32-.01-.493-.01-.173 0-.456.065-.694.325-.238.26-1.002.979-1.002 2.387 0 1.408 1.025 2.766 1.168 2.955.144.189 2.016 3.078 4.885 4.316.682.295 1.215.47 1.63.603.687.218 1.312.187 1.806.114.55-.082 1.685-.688 1.921-1.353.236-.665.236-1.235.165-1.353-.07-.119-.247-.185-.494-.308z"/>
                </svg>
                Chat on WhatsApp
              </a>
            </form>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div className="modal-overlay" onClick={() => setLightboxOpen(false)}>
          <div className="lightbox-modal-content" onClick={e => e.stopPropagation()}>
            <button className="lightbox-close-btn" onClick={() => setLightboxOpen(false)}><X size={32} /></button>
            <div className="lightbox-image-box">
              <img src={project.images[activeImgIdx]} alt={project.name} />
            </div>
            
            {/* Arrows */}
            <button 
              className="lightbox-nav-btn prev"
              onClick={() => setActiveImgIdx(prev => (prev - 1 + project.images.length) % project.images.length)}
            >
              <ArrowLeft size={24} />
            </button>
            <button 
              className="lightbox-nav-btn next"
              onClick={() => setActiveImgIdx(prev => (prev + 1) % project.images.length)}
            >
              <ArrowRight size={24} />
            </button>

            <div className="lightbox-counter">
              {activeImgIdx + 1} / {project.images.length}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .border-bottom-title {
          font-family: var(--font-title);
          font-size: 1.25rem;
          color: var(--primary);
          padding-bottom: 0.5rem;
          border-bottom: 2px solid var(--border-color);
        }
        .detail-main-content {
          grid-column: span 2;
          min-width: 0;
        }
        .detail-gallery-slider {
          width: 100%;
          max-width: 100%;
          min-width: 0;
        }
        .thumbnails-wrapper {
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          white-space: nowrap;
          -webkit-overflow-scrolling: touch;
        }
        .thumbnails-wrapper::-webkit-scrollbar {
          height: 4px;
        }
        .thumbnails-wrapper::-webkit-scrollbar-track {
          background: transparent;
        }
        .thumbnails-wrapper::-webkit-scrollbar-thumb {
          background-color: rgba(0, 0, 0, 0.15);
          border-radius: var(--radius-full);
        }
        .active-img-wrapper {
          position: relative;
          height: 420px;
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: var(--shadow-md);
          cursor: pointer;
        }
        .active-img-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .slider-lightbox-btn {
          position: absolute;
          bottom: 1.25rem;
          right: 1.25rem;
          background: rgba(11, 25, 44, 0.85);
          color: var(--white);
          padding: 0.4rem 0.8rem;
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          font-weight: 600;
          backdrop-filter: blur(8px);
        }
        .thumb-box {
          width: 90px;
          height: 65px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          cursor: pointer;
          border: 2px solid transparent;
          flex-shrink: 0;
        }
        .thumb-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .thumb-box.active {
          border-color: var(--secondary);
        }

        .highlights-list {
          list-style: none;
        }

        /* Amenity box */
        .amenity-item {
          background-color: var(--light-soft);
          padding: 1rem;
          border-radius: var(--radius-md);
        }
        .amenity-icon {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-full);
          background-color: var(--secondary);
          color: var(--white);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 0.5rem;
          font-weight: 800;
        }

        /* Floor plan tabs */
        .plan-tab-btn {
          padding: 0.5rem 1rem;
          font-family: var(--font-title);
          font-weight: 600;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          color: var(--text-primary);
        }
        .plan-tab-btn.active {
          background-color: var(--primary);
          color: var(--white);
          border-color: var(--primary);
        }

        /* Construction timeline node */
        .timeline-node {
          position: relative;
        }
        .timeline-marker-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 20px;
        }
        .timeline-dot {
          width: 12px;
          height: 12px;
          background-color: var(--secondary);
          border-radius: var(--radius-full);
          margin-top: 6px;
          z-index: 2;
        }
        .timeline-line {
          width: 2px;
          background-color: var(--border-color);
          flex: 1;
          margin: 6px 0;
        }
        .timeline-node-content {
          padding-bottom: 1.5rem;
        }

        /* Sticky Sidebar */
        .sticky-sidebar {
          position: sticky;
          top: calc(var(--header-height) + 1.5rem);
        }

        /* Lightbox modal styles */
        .lightbox-modal-content {
          max-width: 900px;
          width: 100%;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .lightbox-image-box {
          max-height: 80vh;
          overflow: hidden;
          border-radius: var(--radius-md);
        }
        .lightbox-image-box img {
          max-width: 100%;
          max-height: 80vh;
          object-fit: contain;
        }
        .lightbox-close-btn {
          position: absolute;
          top: -3.5rem;
          right: 0;
          color: var(--white);
        }
        .lightbox-nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(255, 255, 255, 0.15);
          color: var(--white);
          width: 48px;
          height: 48px;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .lightbox-nav-btn:hover {
          background: var(--secondary);
        }
        .lightbox-nav-btn.prev { left: -4rem; }
        .lightbox-nav-btn.next { right: -4rem; }
        .lightbox-counter {
          color: var(--white);
          margin-top: 1rem;
          font-family: var(--font-title);
          font-weight: 600;
        }

        @media (max-width: 1024px) {
          .lightbox-nav-btn.prev { left: 1rem; }
          .lightbox-nav-btn.next { right: 1rem; }
          .lightbox-close-btn { right: 1rem; top: 1rem; color: var(--primary); }
        }
        @media (max-width: 768px) {
          .project-detail-page .grid { grid-template-columns: 1fr; }
          .detail-main-content { grid-column: span 1; }
          .active-img-wrapper { height: 280px; }
        }
      `}</style>
    </div>
  );
};
