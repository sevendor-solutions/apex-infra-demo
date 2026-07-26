import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserCheck, Award, MapPin, ArrowRight, Building2, Home as HomeIcon, KeyRound, Compass, Send, Search } from 'lucide-react';
import type { Project, Blog, ProjectCategory, SiteCategory } from '../types';
import { getProjectMainImage } from '../utils/image';

interface HomeProps {
  projects: Project[];
  blogs: Blog[];
  onNavigate: (page: string, category?: ProjectCategory | null, siteCategory?: SiteCategory | null, params?: any) => void;
  onOpenEnquiry: (projectName?: string) => void;
}

export const Home: React.FC<HomeProps> = ({ projects, blogs, onNavigate, onOpenEnquiry }) => {
  const [heroIndex, setHeroIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('All');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const featuredProjects = projects.filter(p => p.featured && p.isActive !== false);
  const displayProjects = featuredProjects.length > 0 ? featuredProjects : projects.slice(0, 1);
  const latestBlogs = blogs.slice(0, 3);
  const currentProject = displayProjects[heroIndex] || displayProjects[0];

  // Auto-play hero slider (pauses when user is typing in search input)
  useEffect(() => {
    if (displayProjects.length === 0 || isSearchFocused) return;
    const interval = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % displayProjects.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [displayProjects.length, isSearchFocused]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();

    const marketingCategories = [
      'Flats', 'Villas', 'Individual Houses', 'Sites', 
      'VUDA / VMRDA Approved Sites', 'Panchayati Approved Sites', 'Ventures'
    ];

    if (marketingCategories.includes(searchCategory)) {
      let mainCat: ProjectCategory = 'Flats';
      let subCat: string | null = null;

      if (searchCategory === 'Flats') mainCat = 'Flats';
      else if (searchCategory === 'Villas') mainCat = 'Villas';
      else if (searchCategory === 'Individual Houses') mainCat = 'Individual Houses';
      else if (searchCategory === 'Sites') mainCat = 'Sites';
      else if (['VUDA / VMRDA Approved Sites', 'Panchayati Approved Sites', 'Ventures'].includes(searchCategory)) {
        mainCat = 'Sites';
        subCat = searchCategory;
      }

      onNavigate('marketing', mainCat, subCat as SiteCategory | null, { initialFilters: { search: query } });
    } else if (['Ongoing', 'Upcoming', 'Completed'].includes(searchCategory)) {
      const status = searchCategory;
      onNavigate('projects', null, null, { search: query, status });
    } else {
      // General All search
      onNavigate('projects', null, null, { search: query });
    }
  };

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-slider-section">
        {displayProjects.map((project, idx) => (
          <div 
            key={project.id} 
            className={`hero-slide ${idx === heroIndex ? 'active' : ''}`}
            style={{ backgroundImage: `linear-gradient(to bottom, rgba(11, 25, 44, 0.72) 0%, rgba(11, 25, 44, 0.4) 60%, rgba(11, 25, 44, 0.15) 100%), url(${getProjectMainImage(project)})` }}
          >
            <div 
              className="container hero-slide-content"
              style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
            >
              <div className="flex gap-1 align-center">
                <span className={`badge badge-${project.status.toLowerCase()}`}>{project.status}</span>
                <span className="badge badge-ongoing" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>{project.category}</span>
              </div>
              <h1 className="hero-title">{project.name}</h1>
              <p className="hero-location flex align-center gap-1"><MapPin size={18} /> {project.location}</p>
              <div className="hero-price-tag">
                Starting from <span className="price">{project.priceRange.split('-')[0]}</span>
              </div>
            </div>
          </div>
        ))}

        {/* Persistent Unified Hero Action Bar (Mounted ONCE outside slide loop to prevent soft keyboard dismissal) */}
        <div className="container hero-action-bar-container">
          <div className="hero-action-bar-wrapper">
            <form onSubmit={handleSearchSubmit} className="hero-unified-card">
              <div className="search-field keyword-field">
                <label><MapPin size={12} color="var(--primary)" /> SEARCH PROPERTY</label>
                <input 
                  type="text" 
                  placeholder="Enter location or project..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                />
              </div>

              <div className="search-field category-field">
                <label><Building2 size={12} color="var(--primary)" /> CATEGORY</label>
                <select 
                  value={searchCategory} 
                  onChange={e => setSearchCategory(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                >
                  <option value="All">All Property Types</option>
                  <option value="Flats">Premium Flats</option>
                  <option value="Villas">Luxury Villas</option>
                  <option value="Individual Houses">Individual Houses</option>
                  <option value="Sites">Residential Plots / Sites</option>
                  <option value="VUDA / VMRDA Approved Sites">VUDA / VMRDA Approved Plots</option>
                  <option value="Panchayati Approved Sites">Panchayati Approved Plots</option>
                  <option value="Ventures">Venture Layouts</option>
                  <option value="Ongoing">Ongoing Projects</option>
                  <option value="Upcoming">Upcoming Projects</option>
                  <option value="Completed">Completed Projects</option>
                </select>
              </div>

              <div className="search-actions-group">
                <button type="submit" className="btn btn-secondary search-submit-btn">
                  <Search size={15} />
                  <span>Search</span>
                </button>

                {currentProject && (
                  <button 
                    type="button"
                    onClick={() => onNavigate('project-details', null, null, { id: currentProject.id })} 
                    className="btn btn-explore-slide"
                  >
                    <span>Explore Project</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Quick Categories */}
      <section className="quick-categories py-5">
        <div className="container">
          <div className="section-title-wrapper section-title-center" style={{ marginBottom: '1.75rem' }}>
            <h2 className="section-title">Property Verticals</h2>
            <p className="text-muted">Explore our wide range of carefully curated housing and investment options</p>
          </div>
          <div className="grid grid-4 gap-3">
            {[
              { 
                title: 'Premium Flats', 
                cat: 'Flats' as ProjectCategory, 
                desc: 'Sleek luxury apartments with full city connections.', 
                icon: <Building2 size={25} color="#ffffff" />,
                bgGradient: 'linear-gradient(135deg, #00baf2 0%, #002970 100%)',
                shadowColor: 'rgba(0, 186, 242, 0.35)'
              },
              { 
                title: 'Luxury Villas', 
                cat: 'Villas' as ProjectCategory, 
                desc: 'Indulge in spacious, grand layouts with private gardens.', 
                icon: <HomeIcon size={25} color="#ffffff" />,
                bgGradient: 'linear-gradient(135deg, #00baf2 0%, #002970 100%)',
                shadowColor: 'rgba(0, 186, 242, 0.35)'
              },
              { 
                title: 'Individual Houses', 
                cat: 'Individual Houses' as ProjectCategory, 
                desc: 'Independent duplex homes for customized family layouts.', 
                icon: <KeyRound size={25} color="#ffffff" />,
                bgGradient: 'linear-gradient(135deg, #00baf2 0%, #002970 100%)',
                shadowColor: 'rgba(0, 186, 242, 0.35)'
              },
              { 
                title: 'VUDA / VMRDA Sites', 
                cat: 'Sites' as ProjectCategory, 
                siteCat: 'VUDA / VMRDA Approved Sites',
                desc: 'Premium plotting layouts inside high appreciation zones.', 
                icon: <Compass size={25} color="#ffffff" />,
                bgGradient: 'linear-gradient(135deg, #00baf2 0%, #002970 100%)',
                shadowColor: 'rgba(0, 186, 242, 0.35)'
              }
            ].map((item, idx) => (
              <div key={idx} className="category-card text-center" onClick={() => onNavigate('marketing', item.cat, (item as any).siteCat || null)}>
                <div 
                  className="cat-icon-box"
                  style={{ 
                    background: item.bgGradient, 
                    boxShadow: `0 8px 18px ${item.shadowColor}` 
                  }}
                >
                  {item.icon}
                </div>
                <h3>{item.title}</h3>
                <p className="text-sm text-muted">{item.desc}</p>
                <button className="cat-link">View Projects <ArrowRight size={13} /></button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* End to End Assistance Stepper Process */}
      <section className="services-section py-6" style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', backgroundColor: '#ffffff', position: 'relative' }}>
        <div className="container">
          <div className="section-title-wrapper section-title-center">
            <span className="badge badge-ongoing mb-1">Our Operations</span>
            <h2 className="section-title">End-to-End Assistance</h2>
            <p className="text-muted" style={{ maxWidth: '500px', margin: '0 auto' }}>Complete professional guidance throughout your entire home search, booking, and title registration process</p>
          </div>
          
          <div className="stepper-row-container flex justify-between relative mt-4 mb-2" style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginTop: '3.5rem', marginBottom: '2.5rem' }}>
            {/* SVG Curved Track Connector for Desktop */}
            <svg className="stepper-connector-svg hide-mobile" style={{ position: 'absolute', top: '40px', left: '8%', width: '84%', height: '80px', zIndex: 1, pointerEvents: 'none' }}>
              <path 
                d="M 10,20 C 150,90 220,-40 380,20 C 520,90 620,-40 760,20 C 900,90 950,-30 1100,20" 
                fill="none" 
                stroke="var(--secondary)" 
                strokeWidth="4" 
                strokeDasharray="6 6"
                opacity="0.9" 
              />
            </svg>
            
            {/* Timeline Stepper Nodes */}
            {[
              { title: 'Property Search', desc: 'Find your dream space using our advanced multi-select checkbox sidebar filters.', icon: '🔍' },
              { title: 'Site Visit', desc: 'Schedule a physical site inspection at any venture with our corporate advisors.', icon: '🖥️' },
              { title: 'Token Booking', desc: 'Complete secure unit allotment and lock pricing with immediate receipt confirmation.', icon: '🏠' },
              { title: 'Loan Support', desc: 'Hassle-free document preparation with instant approvals from 15+ partner banks.', icon: '💰' },
              { title: 'Clear Registration', desc: 'Verify legal titles and execute property registration in our ISO quality checked ventures.', icon: '📜' }
            ].map((step, idx) => (
              <div key={idx} className="stepper-node flex flex-col align-center text-center" style={{ flex: 1, zIndex: 2, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="step-circle-wrapper" style={{ position: 'relative' }}>
                  <div className="step-circle flex align-center justify-center mb-1" style={{ width: '80px', height: '80px', borderRadius: '50%', border: '4px solid var(--primary)', backgroundColor: 'var(--white)', color: 'var(--primary)', fontSize: '2.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease', cursor: 'default', margin: '0 auto 0.75rem auto', boxShadow: 'var(--shadow-md)' }}>
                    {step.icon}
                  </div>
                  <div className="step-number-badge" style={{ position: 'absolute', top: '-5px', right: '-5px', backgroundColor: 'var(--secondary)', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 800, borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--white)', boxShadow: 'var(--shadow-sm)' }}>
                    {idx + 1}
                  </div>
                </div>
                <h4 className="my-0.5 text-primary" style={{ fontSize: '1.05rem', fontWeight: 'bold', color: 'var(--primary)', marginTop: '0.5rem', marginBottom: '0.25rem' }}>{step.title}</h4>
                <p className="text-xs text-muted" style={{ maxWidth: '170px', margin: '0 auto', fontSize: '0.8rem', lineHeight: '1.3' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <style>{`
          .step-circle-wrapper:hover .step-circle {
            transform: scale(1.1);
            border-color: var(--secondary) !important;
            box-shadow: 0 0 15px rgba(242, 183, 5, 0.45);
          }
          
          @media (max-width: 1024px) {
            .stepper-connector-svg {
              display: none !important;
            }
            .stepper-row-container {
              flex-direction: column !important;
              gap: 3rem !important;
              align-items: center !important;
            }
            .stepper-row-container::before {
              content: '';
              position: absolute;
              top: 40px;
              bottom: 40px;
              left: 50%;
              width: 3px;
              transform: translateX(-50%);
              border-left: 3px dashed var(--secondary);
              z-index: 1;
            }
            .stepper-node {
              width: 100% !important;
            }
          }
        `}</style>
      </section>


      {/* Why Choose Us */}
      <section className="why-choose-us py-6" style={{ backgroundColor: 'var(--light-soft)' }}>
        <div className="container grid grid-2 gap-4 align-center">
          <div className="why-left">
            <div className="section-title-wrapper">
              <h2 className="section-title">JK Future Infra Difference</h2>
              <p className="text-muted mb-2">We construct happy spaces that secure your future. Since inception, our core tenets have remained trust, transparent transactions, and excellent craftsmanship.</p>
            </div>
            <div className="why-list flex flex-col gap-3">
              <div className="why-item flex gap-2">
                <div className="why-icon"><Award size={24} /></div>
                <div>
                  <h4>ISO 9001:2015 Certified Quality</h4>
                  <p className="text-sm text-muted">We adhere strictly to international management standards, ensuring check-gates at every phase of construction materials and structural engineering.</p>
                </div>
              </div>
              <div className="why-item flex gap-2">
                <div className="why-icon"><ShieldCheck size={24} /></div>
                <div>
                  <h4>100% Clear Titles & AP-RERA Compliance</h4>
                  <p className="text-sm text-muted">No hidden clauses, no litigations. Every project is fully verified by legal entities and registered with RERA before open marketing starts.</p>
                </div>
              </div>
              <div className="why-item flex gap-2">
                <div className="why-icon"><UserCheck size={24} /></div>
                <div>
                  <h4>Customer-Centric Handover</h4>
                  <p className="text-sm text-muted">From customized floor planning modifications to arranging home loans with major banks, we walk with you at every step.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="why-right">
            <img 
              src="/jk_difference_hd.png"
              alt="Luxury Estate" 
              className="why-img" 
            />
          </div>
        </div>
      </section>

      {/* Latest Blogs */}
      <section className="latest-blogs py-6" style={{ backgroundColor: 'var(--light-soft)' }}>
        <div className="container">
          <div className="section-title-wrapper section-title-center">
            <h2 className="section-title">Guides & Insights</h2>
            <p className="text-muted">Stay updated with real estate trends, regulations, and investment strategies in Andhra Pradesh</p>
          </div>
          <div className="grid grid-3 gap-3">
            {latestBlogs.map(blog => (
              <div key={blog.id} className="blog-home-card glass-card" onClick={() => onNavigate('blog-details', null, null, { slug: blog.slug })}>
                <div className="blog-home-img-box">
                  <img src={blog.image} alt={blog.title} />
                  <span className="blog-home-cat-badge">{blog.category}</span>
                </div>
                <div className="blog-home-body">
                  <span className="blog-date">{blog.date}</span>
                  <h3>{blog.title}</h3>
                  <p className="text-sm text-muted">{blog.summary}</p>
                  <button className="read-more-link flex align-center gap-1 font-semibold text-secondary text-sm my-1">
                    Read Full Article <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Box */}
      <section className="cta-banner py-8 text-center text-white" style={{ background: 'linear-gradient(rgba(11, 25, 44, 0.65), rgba(11, 25, 44, 0.65)), url(/cta_banner_hd.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
        <div className="container">
          <h2 className="text-4xl mb-2 text-white">Find Your Perfect Living Environment Today</h2>
          <p className="text-lg text-muted mb-4" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>Get in touch with our expert property advisors for site visits, brochures, or booking details.</p>
          <div className="flex justify-center gap-3 flex-wrap">
            <button onClick={() => onOpenEnquiry()} className="btn btn-secondary">
              <Send size={16} /> Submit Online Enquiry
            </button>
            <a href="https://wa.me/919000553832?text=Hi!%20I%20would%20like%20to%20know%20more%20about%20your%20properties." target="_blank" rel="noreferrer" className="btn btn-accent" style={{ background: '#25d366', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12.031 2C6.446 2 1.922 6.524 1.922 12.109c0 1.782.463 3.522 1.34 5.06l-1.424 5.201 5.322-1.396a10.05 10.05 0 0 0 4.871 1.246h.004c5.581 0 10.105-4.524 10.105-10.109C22.14 6.524 17.616 2 12.031 2zm0 18.528h-.002c-1.579 0-3.125-.424-4.473-1.226l-.32-.19-3.32.87.886-3.235-.208-.33a8.178 8.178 0 0 1-1.252-4.321c0-4.516 3.673-8.19 8.192-8.19 2.186 0 4.243.852 5.79 2.401a8.134 8.134 0 0 1 2.398 5.791c0 4.516-3.673 8.19-8.191 8.19zm4.502-6.149c-.247-.123-1.46-.72-1.685-.802-.227-.082-.392-.123-.556.123-.164.247-.638.802-.782.967-.144.164-.288.185-.535.062-.247-.123-1.04-.383-1.98-1.222-.731-.652-1.225-1.459-1.369-1.706-.144-.247-.015-.38.109-.502.112-.11.247-.288.371-.432.124-.144.165-.247.247-.412.082-.164.041-.309-.02-.432-.062-.123-.556-1.338-.762-1.833-.2-.484-.422-.412-.576-.42-.149-.008-.32-.01-.493-.01-.173 0-.456.065-.694.325-.238.26-1.002.979-1.002 2.387 0 1.408 1.025 2.766 1.168 2.955.144.189 2.016 3.078 4.885 4.316.682.295 1.215.47 1.63.603.687.218 1.312.187 1.806.114.55-.082 1.685-.688 1.921-1.353.236-.665.236-1.235.165-1.353-.07-.119-.247-.185-.494-.308z"/>
              </svg>
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>

      <style>{`
        /* Hero Slider */
        .hero-slider-section {
          position: relative;
          height: clamp(560px, 70vh, 660px);
          min-height: 560px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .hero-slide {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: center 25%;
          display: flex;
          align-items: flex-start;
          opacity: 0;
          visibility: hidden;
          z-index: 1;
          /* Keep outgoing slide visible behind the fading-in active slide to prevent double-exposure blur/ghosting */
          transition: opacity 0s 0.8s, visibility 0s 0.8s;
        }
        .hero-slide.active {
          opacity: 1;
          visibility: visible;
          z-index: 2;
          transition: opacity 0.8s ease-in-out;
        }
        .hero-slide:not(.active) .hero-slide-content {
          opacity: 0;
          transition: opacity 0.25s ease-in-out;
        }
        .hero-slide-content {
          padding-top: 3.5rem;
          padding-bottom: 1rem;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          user-select: none;
          -webkit-user-select: none;
        }
        .hero-badge {
          background-color: rgba(240, 90, 40, 0.2);
          color: var(--secondary);
          display: inline-flex;
          padding: 0.4rem 1rem;
          border-radius: var(--radius-full);
          font-family: var(--font-title);
          font-weight: 700;
          font-size: 0.85rem;
          margin-bottom: 1rem;
          border: 1px solid rgba(240, 90, 40, 0.3);
          user-select: none;
          -webkit-user-select: none;
        }
        .hero-title {
          font-size: 3.2rem;
          font-weight: 800;
          color: var(--white);
          margin-bottom: 0.5rem;
          line-height: 1.15;
          text-shadow: 0 4px 12px rgba(0,0,0,0.4);
          user-select: none;
          -webkit-user-select: none;
        }
        .hero-location {
          color: rgba(255, 255, 255, 0.9);
          font-size: 1.15rem;
          font-weight: 500;
          margin-bottom: 1rem;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
          user-select: none;
          -webkit-user-select: none;
        }
        .hero-price-tag {
          font-size: 1.1rem;
          color: var(--white);
          margin-bottom: 1.25rem;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
          user-select: none;
          -webkit-user-select: none;
        }
        .hero-price-tag .price {
          color: var(--secondary);
          font-size: 2rem;
          font-weight: 800;
          font-family: var(--font-title);
          vertical-align: middle;
        }

        /* Unified Single Hero Action Card */
        .hero-action-bar-container {
          position: relative;
          z-index: 10;
          margin-top: auto;
          margin-bottom: 2rem;
          width: 100%;
        }
        .hero-action-bar-wrapper {
          width: 100%;
        }
        .hero-unified-card {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(12px);
          padding: 0.75rem 1rem;
          border-radius: 16px;
          box-shadow: 0 14px 36px rgba(0, 0, 0, 0.28);
          border: 1px solid rgba(255, 255, 255, 0.95);
          max-width: 760px;
          width: 100%;
        }
        .search-field {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .keyword-field {
          flex: 1.3;
        }
        .category-field {
          flex: 1;
        }
        .search-field label {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
          color: #0b2c5c;
          letter-spacing: 0.4px;
        }
        .search-field input, .search-field select {
          padding: 0.4rem 0.65rem;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.85rem;
          background: #ffffff;
          color: #0f172a;
          height: 38px;
          outline: none;
          transition: all 0.2s ease;
          width: 100%;
        }
        .search-field input:focus, .search-field select:focus {
          border-color: var(--secondary);
          box-shadow: 0 0 0 2px rgba(240, 90, 40, 0.18);
        }
        .search-actions-group {
          display: flex;
          align-items: flex-end;
          gap: 0.5rem;
          flex-shrink: 0;
          align-self: flex-end;
        }
        .search-submit-btn {
          height: 38px;
          padding: 0 1.1rem;
          font-size: 0.85rem;
          font-weight: 700;
          border-radius: 8px;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          box-shadow: 0 4px 14px rgba(240, 90, 40, 0.35);
          transition: all 0.2s ease;
        }
        .search-submit-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(240, 90, 40, 0.45);
        }
        .btn-explore-slide {
          height: 38px;
          padding: 0 1.1rem;
          font-size: 0.85rem;
          font-weight: 700;
          border-radius: 8px;
          background: #0b2c5c;
          color: #ffffff;
          border: none;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(11, 44, 92, 0.35);
        }
        .btn-explore-slide:hover {
          background: #103b7a;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(11, 44, 92, 0.45);
        }

        .quick-categories {
          padding-top: 3.5rem !important;
          clear: both;
        }

        @media (max-width: 868px) {
          .hero-slider-section { 
            position: relative !important;
            min-height: calc(100vh - 59px) !important;
            height: auto !important; 
            padding-top: 1rem !important;
            padding-bottom: 1.5rem !important;
            background-color: #0f2b46 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            overflow: hidden !important;
          }
          .hero-slide {
            position: absolute !important;
            top: 0;
            left: 0;
            width: 100% !important;
            height: 100% !important;
            background-size: cover !important;
            background-position: center top !important;
            z-index: 1 !important;
          }
          .hero-slide-content {
            position: relative !important;
            z-index: 5 !important;
            padding-top: 1.25rem !important;
            padding-bottom: 0.5rem !important;
            text-align: left !important;
            width: 100% !important;
          }
          .hero-title { 
            font-size: 1.6rem !important; 
            margin-bottom: 0.25rem !important;
            line-height: 1.25 !important;
            color: #ffffff !important;
            text-shadow: 0 2px 10px rgba(0,0,0,0.85) !important;
          }
          .hero-location {
            margin-bottom: 0.25rem !important;
            font-size: 0.9rem !important;
            color: rgba(255, 255, 255, 0.95) !important;
            text-shadow: 0 1px 6px rgba(0,0,0,0.85) !important;
          }
          .hero-price-tag {
            margin-bottom: 0.5rem !important;
            font-size: 0.9rem !important;
            color: #ffffff !important;
            text-shadow: 0 1px 6px rgba(0,0,0,0.85) !important;
          }
          .hero-price-tag .price {
            font-size: 1.4rem !important;
            color: var(--secondary) !important;
          }
          .hero-action-bar-container {
            position: relative !important;
            z-index: 10 !important;
            margin-top: auto !important;
            margin-bottom: 0.5rem !important;
            padding: 0 3.25rem 0 1rem !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .hero-unified-card { 
            flex-direction: column !important; 
            align-items: stretch !important;
            gap: 0.5rem !important; 
            background: #ffffff !important;
            padding: 0.85rem 0.9rem !important;
            border-radius: 12px !important;
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22) !important;
            border: 1px solid #e2e8f0 !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          .keyword-field, .category-field {
            width: 100% !important;
          }
          .search-field label {
            font-size: 0.62rem !important;
            margin-bottom: 0.15rem !important;
          }
          .search-actions-group {
            flex-direction: column !important;
            width: 100% !important;
            gap: 0.4rem !important;
            align-self: stretch !important;
          }
          .search-field input, .search-field select {
            width: 100% !important;
            height: 36px !important;
            font-size: 0.82rem !important;
            padding: 0.35rem 0.6rem !important;
          }
          .search-submit-btn, .btn-explore-slide { 
            width: 100% !important; 
            height: 36px !important;
            font-size: 0.82rem !important;
            justify-content: center !important;
          }
          .quick-categories {
            display: block !important;
            position: relative !important;
            z-index: 1 !important;
            padding-top: 2.5rem !important;
            padding-bottom: 2.5rem !important;
            margin-top: 0 !important;
            clear: both !important;
            background-color: var(--light) !important;
          }
        }

        /* Quick Categories (Paytm App Style Compact Cards) */
        .category-card {
          padding: 1.25rem 1rem;
          background-color: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 14px rgba(0,0,0,0.04);
          transition: all 0.25s ease;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .category-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 28px rgba(0,0,0,0.09);
          border-color: rgba(37, 99, 235, 0.3);
        }
        .cat-icon-box {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 0.75rem;
          transition: transform 0.25s ease;
        }
        .category-card:hover .cat-icon-box {
          transform: scale(1.1) rotate(4deg);
        }
        .category-card h3 {
          font-size: 1.05rem;
          font-weight: 700;
          margin-bottom: 0.3rem;
          color: #0f2b46;
        }
        .category-card p {
          font-size: 0.78rem;
          line-height: 1.35;
          color: #64748b;
          margin-bottom: 0.75rem;
        }
        .cat-link {
          font-size: 0.8rem;
          font-weight: 700;
          color: #2563eb;
          background: transparent;
          border: none;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          cursor: pointer;
          margin-top: auto;
        }

        /* Why choose us */
        .why-img {
          width: 100%;
          height: 450px;
          object-fit: cover;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          border: 5px solid var(--white);
        }
        .why-icon {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          background: linear-gradient(135deg, #00baf2 0%, #002970 100%) !important;
          color: #ffffff !important;
          box-shadow: 0 6px 16px rgba(0, 186, 242, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .why-item h4 {
          font-size: 1.1rem;
          margin-bottom: 0.25rem;
        }

      `}</style>
    </div>
  );
};
