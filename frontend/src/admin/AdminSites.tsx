import React, { useState } from 'react';
import type { Project, SiteCategory } from '../types';
import { Landmark, MapPin, Eye, X, Filter, CheckCircle2, Layers, Sparkles, ArrowRight } from 'lucide-react';
import { getProjectMainImage } from '../utils/image';

interface AdminSitesProps {
  marketing: Project[];
}

export const AdminSites: React.FC<AdminSitesProps> = ({ marketing }) => {
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [focusedProject, setFocusedProject] = useState<Project | null>(null);

  const getSiteCount = (sub: string) => {
    return marketing.filter(p => p.category === 'Sites' && (p.subCategory === sub || (sub.includes('VUDA') && p.subCategory?.includes('VUDA')))).length;
  };

  const siteCategories: { name: SiteCategory; authority: string; desc: string; badgeColor: string }[] = [
    { name: 'VUDA / VMRDA Approved Sites', authority: 'VMRDA / CRDA', desc: 'Urban plotting layouts verified by metropolitan development authorities. Fully compliant with zoning and public park reservations.', badgeColor: '#00a884' },
    { name: 'Panchayati Approved Sites', authority: 'Gram Panchayat', desc: 'Plotted layout coordinates approved by rural gram panchayat codes. Highly affordable buy-in targets.', badgeColor: '#3b82f6' },
    { name: 'Development Sites', authority: 'Land Use Board', desc: 'Large land plots set up for commercial complexes, industrial warehouses, or agricultural layouts.', badgeColor: '#f59e0b' },
    { name: 'Ventures', authority: 'Apex Developer Layouts', desc: 'Theme-designed gated plot layouts completed with black-top roads, drainage pipes, and gate arches.', badgeColor: '#8b5cf6' }
  ];

  const handleCardClick = (catName: string) => {
    if (selectedSubCategory === catName) {
      setSelectedSubCategory(null); // Toggle off if already selected
    } else {
      setSelectedSubCategory(catName);
    }
  };

  // Filter projects matching selected classification or all site projects
  const filteredProjects = marketing.filter(p => {
    if (p.category !== 'Sites') return false;
    if (!selectedSubCategory) return true;
    if (selectedSubCategory.includes('VUDA')) {
      return p.subCategory?.includes('VUDA') || p.subCategory === 'VUDA / VMRDA Approved Sites';
    }
    return p.subCategory === selectedSubCategory;
  });

  return (
    <div className="admin-sites-view" style={{ paddingBottom: '2rem' }}>
      {/* Header Banner */}
      <div className="flex justify-between align-center mb-3 flex-wrap gap-1">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem', fontWeight: 800, color: '#0b192c', margin: 0 }}>
            <Layers color="#00a884" size={24} /> Sites Classification
          </h2>
          <p className="text-sm text-muted" style={{ marginTop: '0.2rem' }}>
            Click on any classification card below to filter and view matching site plots.
          </p>
        </div>
        <span className="badge badge-ongoing" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}>
          <Sparkles size={14} /> RERA Regulated Codes
        </span>
      </div>

      {/* Interactive Classification Cards */}
      <div className="grid grid-2 gap-3 mb-4">
        {siteCategories.map((sub, i) => {
          const isSelected = selectedSubCategory === sub.name;
          const count = getSiteCount(sub.name);

          return (
            <div
              key={i}
              className={`admin-card flex flex-col justify-between interactive-site-card ${isSelected ? 'selected-card' : ''}`}
              onClick={() => handleCardClick(sub.name)}
              style={{
                cursor: 'pointer',
                borderRadius: '12px',
                border: isSelected ? `2px solid ${sub.badgeColor}` : '1px solid #e2e8f0',
                backgroundColor: isSelected ? 'rgba(0, 168, 132, 0.04)' : '#ffffff',
                boxShadow: isSelected ? `0 8px 24px ${sub.badgeColor}25` : '0 2px 8px rgba(0,0,0,0.04)',
                padding: '1.2rem',
                transition: 'all 0.25s ease',
                position: 'relative'
              }}
            >
              <div>
                <div className="flex justify-between align-center mb-1">
                  <span className="font-bold text-lg" style={{ color: isSelected ? sub.badgeColor : '#1e293b' }}>
                    {sub.name}
                  </span>
                  <span
                    className="badge"
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      backgroundColor: isSelected ? sub.badgeColor : '#e2e8f0',
                      color: isSelected ? '#ffffff' : '#475569'
                    }}
                  >
                    {count} {count === 1 ? 'PLOT' : 'PLOTS'} LISTING
                  </span>
                </div>
                <p className="text-sm text-muted mb-2">{sub.desc}</p>
              </div>

              <div className="flex justify-between align-center text-xs font-semibold" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                <div className="flex align-center gap-0.5" style={{ color: sub.badgeColor }}>
                  <Landmark size={14} /> Authority: {sub.authority}
                </div>
                <span className="flex align-center gap-0.3" style={{ color: isSelected ? sub.badgeColor : '#64748b', fontWeight: 700 }}>
                  {isSelected ? (
                    <>
                      <CheckCircle2 size={14} /> Selected
                    </>
                  ) : (
                    <>
                      Click to View <ArrowRight size={13} />
                    </>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filtered Results Header Bar */}
      <div
        className="flex justify-between align-center mb-3 p-3"
        style={{
          backgroundColor: '#f8fafc',
          borderRadius: '10px',
          border: '1px solid #e2e8f0'
        }}
      >
        <div className="flex align-center gap-1">
          <Filter size={18} color="#00a884" />
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>
            {selectedSubCategory ? (
              <>
                Filtered by: <span style={{ color: '#00a884' }}>{selectedSubCategory}</span> ({filteredProjects.length} found)
              </>
            ) : (
              <>Showing All Sites Listings ({filteredProjects.length} total plots)</>
            )}
          </span>
        </div>
        {selectedSubCategory && (
          <button
            onClick={() => setSelectedSubCategory(null)}
            style={{
              backgroundColor: '#e2e8f0',
              border: 'none',
              color: '#334155',
              padding: '0.35rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <X size={14} /> Clear Filter
          </button>
        )}
      </div>

      {/* Grid of Related Projects */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-3 gap-3">
          {filteredProjects.map(project => (
            <div
              key={project.id}
              className="admin-card flex flex-col justify-between"
              style={{
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                padding: '0'
              }}
            >
              {/* Image Thumbnail */}
              <div style={{ position: 'relative', height: '140px', width: '100%', backgroundColor: '#f1f5f9' }}>
                <img
                  src={getProjectMainImage(project)}
                  alt={project.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <span
                  className="badge badge-ongoing"
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    fontSize: '0.75rem',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                  }}
                >
                  {project.subCategory || 'Site Plot'}
                </span>
              </div>


              {/* Card Details */}
              <div style={{ padding: '0.9rem' }} className="flex-1 flex flex-col justify-between">
                <div>
                  <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{project.name}</h4>
                  <div className="flex align-center gap-0.5 text-xs text-muted mb-2">
                    <MapPin size={13} color="#64748b" />
                    <span>{[project.microLocation, project.city].filter(Boolean).join(', ') || project.location || 'Visakhapatnam'}</span>
                  </div>
                </div>

                <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '0.6rem', marginTop: '0.4rem' }}>
                  <div className="flex justify-between align-center mb-2">
                    <span className="text-xs text-muted">Price Range:</span>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#00a884' }}>
                      {project.priceRange || 'Contact Price'}
                    </span>
                  </div>

                  <button
                    onClick={() => setFocusedProject(project)}
                    className="btn btn-secondary-premium"
                    style={{
                      width: '100%',
                      padding: '0.45rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <Eye size={14} /> Quick View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div
          className="admin-card text-center p-5"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '2px dashed #cbd5e1',
            padding: '3rem 1.5rem'
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#f1f5f9',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}
          >
            <Landmark size={28} color="#94a3b8" />
          </div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', fontSize: '1.1rem' }}>No Sites Listed under this Category</h3>
          <p className="text-sm text-muted" style={{ maxWidth: '400px', margin: '0 auto 1.2rem auto' }}>
            There are currently 0 site listings under "{selectedSubCategory}". You can add new plots under this category from Marketing Management.
          </p>
          <button
            onClick={() => setSelectedSubCategory(null)}
            className="btn btn-secondary-premium"
            style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}
          >
            View All Sites
          </button>
        </div>
      )}

      {/* Quick View Details Modal */}
      {focusedProject && (
        <div className="modal-overlay" onClick={() => setFocusedProject(null)} style={{ zIndex: 9999 }}>
          <div
            className="modal-content premium-modal"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '560px', width: '90%' }}
          >
            <button className="modal-close-btn" onClick={() => setFocusedProject(null)}>
              <X size={20} />
            </button>

            <div className="premium-modal-header mb-3">
              <span className="badge badge-ongoing mb-1">{focusedProject.subCategory || 'Site Plot'}</span>
              <h3 className="modal-title">{focusedProject.name}</h3>
              <p className="modal-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                <MapPin size={14} /> {[focusedProject.location, focusedProject.microLocation, focusedProject.city].filter(Boolean).join(', ')}
              </p>
            </div>

            <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {/* Image Preview */}
              {getProjectMainImage(focusedProject) && (
                <div style={{ borderRadius: '10px', overflow: 'hidden', height: '200px', width: '100%', marginBottom: '1rem' }}>
                  <img
                    src={getProjectMainImage(focusedProject)}
                    alt={focusedProject.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}


              {/* Details Grid */}
              <div className="grid grid-2 gap-2 mb-3" style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '8px' }}>
                <div>
                  <span className="text-xs text-muted block">Price Range</span>
                  <span className="font-bold text-primary">{focusedProject.priceRange || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs text-muted block">Facing</span>
                  <span className="font-semibold">{focusedProject.facing || 'Any'}</span>
                </div>
                <div>
                  <span className="text-xs text-muted block">Category</span>
                  <span className="font-semibold">{focusedProject.category}</span>
                </div>
                <div>
                  <span className="text-xs text-muted block">Status</span>
                  <span className="font-semibold">{focusedProject.status || 'Active'}</span>
                </div>
              </div>

              {/* Description */}
              {focusedProject.description && (
                <div className="mb-3">
                  <h5 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem' }}>Description & Overview</h5>
                  <p className="text-sm text-muted" style={{ whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                    {focusedProject.description}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-1 mt-3" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
              <button onClick={() => setFocusedProject(null)} className="btn-close-premium">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

