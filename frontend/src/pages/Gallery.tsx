import React, { useState, useMemo } from 'react';
import type { GalleryItem } from '../types';
import { Play, Eye, Calendar, X, ArrowLeft, ArrowRight } from 'lucide-react';

interface GalleryProps {
  galleryItems: GalleryItem[];
}

export const Gallery: React.FC<GalleryProps> = ({ galleryItems }) => {
  const [activeTab, setActiveTab] = useState<string>('All');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const tabs = [
    { title: 'All Media', value: 'All' },
    { title: 'Project Photos', value: 'Project Photos' },
    { title: 'Project Videos', value: 'Project Videos' },
    { title: 'Event Photos', value: 'Event Photos' },
    { title: 'Construction Progress', value: 'Construction Progress Updates' }
  ];

  // Filter items
  const filteredItems = useMemo(() => {
    if (activeTab === 'All') return galleryItems;
    return galleryItems.filter(item => item.category === activeTab);
  }, [galleryItems, activeTab]);

  const handleOpenLightbox = (item: GalleryItem) => {
    const idx = filteredItems.findIndex(i => i.id === item.id);
    if (idx !== -1) {
      setLightboxIndex(idx);
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex === null) return;
    setLightboxIndex(prev => (prev !== null && prev > 0 ? prev - 1 : filteredItems.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex === null) return;
    setLightboxIndex(prev => (prev !== null && prev < filteredItems.length - 1 ? prev + 1 : 0));
  };

  const activeMedia = lightboxIndex !== null ? filteredItems[lightboxIndex] : null;

  return (
    <div className="gallery-page">
      {/* Header Banner */}
      <section className="page-header py-4 text-center text-white" style={{ background: 'linear-gradient(rgba(11,25,44,0.85), rgba(11,25,44,0.85)), url(https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&auto=format&fit=crop&q=80)', backgroundSize: 'cover' }}>
        <div className="container">
          <h1 className="text-white text-4xl">Media Gallery</h1>
          <p className="text-muted" style={{ color: 'rgba(255,255,255,0.75)' }}>Browse visual highlights of our completed structures, events, and active site works</p>
        </div>
      </section>

      {/* Tabs */}
      <section className="gallery-tabs-section container py-3 text-center">
        <div className="gallery-tabs flex justify-center gap-1 flex-wrap">
          {tabs.map((tab, idx) => (
            <button
              key={idx}
              className={`gallery-tab-btn ${activeTab === tab.value ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.value); setLightboxIndex(null); }}
            >
              {tab.title}
            </button>
          ))}
        </div>
      </section>

      {/* Grid */}
      <section className="container py-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-6 glass-card" style={{ background: '#fff' }}>
            <p className="text-lg font-bold text-muted mb-1">No media items available</p>
            <p className="text-sm text-muted">New project photographs and drone tour walkthroughs will be uploaded soon.</p>
          </div>
        ) : (
          <div className="grid grid-3 gap-3">
            {filteredItems.map(item => (
              <div 
                key={item.id} 
                className="gallery-grid-card property-card"
                onClick={() => handleOpenLightbox(item)}
                style={{ cursor: 'pointer' }}
              >
                <div className="gallery-card-img-box" style={{ height: '240px', position: 'relative', overflow: 'hidden' }}>
                  {item.type === 'video' && !item.thumbnail ? (
                    <video src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} preload="metadata" muted playsInline />
                  ) : (
                    <img src={item.type === 'video' ? item.thumbnail : item.url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                  
                  {/* Action Icons */}
                  <div className="gallery-card-overlay flex align-center justify-center">
                    {item.type === 'video' ? (
                      <div className="media-play-btn"><Play size={28} fill="#fff" /></div>
                    ) : (
                      <div className="media-play-btn"><Eye size={28} /></div>
                    )}
                  </div>
                  
                  {/* Badge */}
                  <span className="gallery-card-badge">{item.category.split(' ')[0]}</span>
                </div>
                
                <div className="gallery-card-body py-1 px-1 text-center" style={{ padding: '1.25rem' }}>
                  <h4 className="text-md" style={{ lineClamp: 1 }}>{item.title}</h4>
                  <div className="flex justify-between align-center text-xs text-muted mt-0.5">
                    <span className="flex align-center gap-0.5"><Calendar size={12} /> {item.date}</span>
                    <span className="text-secondary font-bold uppercase">{item.type}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Lightbox / Video Player Modal */}
      {lightboxIndex !== null && activeMedia && (
        <div className="modal-overlay" onClick={() => setLightboxIndex(null)}>
          <div className="lightbox-modal-content" onClick={e => e.stopPropagation()}>
            <button className="lightbox-close-btn" onClick={() => setLightboxIndex(null)}><X size={32} /></button>
            
            <div className="lightbox-image-box" style={{ minWidth: '320px' }}>
              {activeMedia.type === 'video' ? (
                <video 
                  src={activeMedia.url} 
                  controls 
                  autoPlay 
                  style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: '8px' }}
                />
              ) : (
                <img src={activeMedia.url} alt={activeMedia.title} style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain' }} />
              )}
            </div>

            {/* Media descriptions */}
            <div className="text-white text-center mt-1 px-4">
              <h3 className="text-white text-xl">{activeMedia.title}</h3>
              <p className="text-sm text-light-soft" style={{ color: 'rgba(255,255,255,0.7)' }}>{activeMedia.category} | {activeMedia.date}</p>
            </div>
            
            {/* Nav Arrows */}
            <button className="lightbox-nav-btn prev" onClick={handlePrev}>
              <ArrowLeft size={24} />
            </button>
            <button className="lightbox-nav-btn next" onClick={handleNext}>
              <ArrowRight size={24} />
            </button>

            <div className="lightbox-counter">
              {lightboxIndex + 1} / {filteredItems.length}
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* Tab buttons */
        .gallery-tab-btn {
          padding: 0.6rem 1.2rem;
          font-family: var(--font-title);
          font-weight: 600;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-full);
          color: var(--text-primary);
          background-color: var(--white);
          transition: var(--transition-fast);
        }
        .gallery-tab-btn.active, .gallery-tab-btn:hover {
          background-color: var(--secondary);
          color: var(--white);
          border-color: var(--secondary);
          transform: translateY(-1px);
        }

        /* Card styles */
        .gallery-grid-card {
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        .gallery-card-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(11, 25, 44, 0.4);
          opacity: 0;
          transition: var(--transition-fast);
        }
        .gallery-grid-card:hover .gallery-card-overlay {
          opacity: 1;
        }
        .media-play-btn {
          width: 50px;
          height: 50px;
          border-radius: var(--radius-full);
          background-color: var(--secondary);
          color: var(--white);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-md);
          transform: scale(0.9);
          transition: var(--transition-fast);
        }
        .gallery-grid-card:hover .media-play-btn {
          transform: scale(1);
        }
        .gallery-card-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          background-color: var(--primary);
          color: var(--white);
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.25rem 0.6rem;
          border-radius: var(--radius-sm);
        }
      `}</style>
    </div>
  );
};
